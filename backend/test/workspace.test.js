// Workspace API tests (forms, inbox, leads, webhooks, sending, agent, members) against a throwaway schema.
import { teardown, makeClient } from './setup.js'
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { randomBytes } from 'node:crypto'

const INBOUND_KEY = 'k' + randomBytes(12).toString('hex')
process.env.INBOUND_KEY = INBOUND_KEY
process.env.ANTHROPIC_API_KEY = 'test-key-not-real'

const { createApp } = await import('../src/app.js')
const { pool } = await import('../src/db.js')

let server, fake, base, fakeCalls = []
const client = makeClient(() => base)
const OWNER = { email: 'owner@example.test', password: 'Owner-' + randomBytes(8).toString('hex') }
const owner = client()

before(async () => {
  fake = createServer((req, res) => { // fake Anthropic API
    let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
      const j = JSON.parse(b || '{}'); fakeCalls.push({ url: req.url, key: req.headers['x-api-key'], body: j })
      const last = j.messages?.[j.messages.length - 1]?.content || ''
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ content: [{ type: 'text', text: /refund/i.test(last) ? 'Refunds take 5-7 days.' : 'HANDOFF' }] }))
    })
  })
  await new Promise((ok) => fake.listen(0, '127.0.0.1', ok))
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${fake.address().port}`
  server = createApp().listen(0, '127.0.0.1')
  await new Promise((ok) => server.once('listening', ok))
  base = `http://127.0.0.1:${server.address().port}`
  assert.equal((await owner.call('/api/register', { method: 'POST', body: OWNER })).status, 201)
})
after(async () => {
  await new Promise((ok) => server.close(ok)); await new Promise((ok) => fake.close(ok))
  await pool.end(); await teardown()
})

test('security headers: pages cannot be framed, the public form can', async () => {
  const c = client()
  const api = await c.call('/api/health'); assert.match(api.headers.get('content-security-policy'), /frame-ancestors 'none'/); assert.equal(api.headers.get('x-content-type-options'), 'nosniff')
  const page = await c.call('/form/anything'); assert.match(page.headers.get('content-security-policy') || '', /frame-ancestors \*/, 'the public form page can be embedded')
  const pub = await c.call('/api/public/forms/none'); assert.match(pub.headers.get('content-security-policy'), /frame-ancestors \*/); assert.equal(pub.headers.get('x-frame-options'), null)
})

test('API is closed to anonymous users', async () => {
  const c = client()
  for (const p of ['/api/forms', '/api/inbox', '/api/leads', '/api/users']) assert.equal((await c.call(p)).status, 401, p)
  assert.equal((await c.call('/api/agent', { method: 'POST', body: {} })).status, 401)
  const st = await c.call('/api/status'); assert.equal(st.status, 200); assert.equal(st.json.live, false); assert.equal(st.json.agentLive, true)
})

test('cross-origin writes are blocked', async () => {
  const r = await owner.call('/api/forms', { method: 'POST', body: { title: 'x' }, headers: { Origin: 'http://evil.example' } })
  assert.equal(r.status, 403)
})

test('smart forms: create, public view, validation, submit, rate limit, delete', async () => {
  const f = await owner.call('/api/forms', { method: 'POST', body: { title: 'Enquiry', intro: 'hi', fields: [{ name: 'name', label: 'Name', type: 'text', required: true }, { name: 'email', label: 'Email', type: 'email' }] } })
  assert.equal(f.status, 200); const id = f.json.id; const anon = client()
  assert.equal((await anon.call(`/api/public/forms/${id}`)).json.title, 'Enquiry')
  assert.equal((await anon.call(`/api/public/forms/${id}/submit`, { method: 'POST', body: { email: 'a@b.co' } })).status, 400, 'required field missing')
  assert.equal((await anon.call(`/api/public/forms/${id}/submit`, { method: 'POST', body: { name: 'Ravi', email: 'r@x.co' } })).status, 200)
  const list = await owner.call('/api/forms'); assert.equal(list.json.submissions.filter((s) => s.form === id).length, 1)
  let limited = 0; for (let i = 0; i < 12; i++) if ((await anon.call(`/api/public/forms/${id}/submit`, { method: 'POST', body: { name: 'x' } })).status === 429) limited++
  assert.ok(limited >= 1, 'per-visitor submit limit applies')
  assert.equal((await owner.call(`/api/forms/${id}`, { method: 'DELETE' })).status, 200); assert.equal((await anon.call(`/api/public/forms/${id}`)).status, 404)
  assert.equal((await anon.call('/api/public/forms/doesnotexist')).status, 404)
})

test('inbound contact webhook needs the key; leads can be fetched and acknowledged', async () => {
  const a = client()
  assert.equal((await a.call('/webhook/contact?key=wrong', { method: 'POST', body: { phone: '+911' } })).status, 403)
  assert.equal((await a.call(`/webhook/contact?key=${INBOUND_KEY}`, { method: 'POST', body: {} })).status, 400)
  assert.equal((await a.call(`/webhook/contact?key=${INBOUND_KEY}`, { method: 'POST', body: { name: 'Lead A', phone: '+919800000009' } })).status, 200)
  const leads = (await owner.call('/api/leads')).json.leads; assert.equal(leads.length, 1); assert.equal(leads[0].name, 'Lead A')
  await owner.call('/api/leads/ack', { method: 'POST', body: { ids: leads.map((l) => l.id) } }); assert.equal((await owner.call('/api/leads')).json.leads.length, 0)
})

test('workspace state: empty at first, saved and read back, signed-in only', async () => {
  assert.equal((await client().call('/api/workspace/state')).status, 401)
  assert.equal((await owner.call('/api/workspace/state')).json.state, null)
  assert.equal((await owner.call('/api/workspace/state', { method: 'PUT', body: { state: 'nope' } })).status, 400)
  const doc = { contacts: [{ id: 'a', name: 'Ravi' }], blob: 'x'.repeat(400000) } // larger than the normal 250kb body limit
  assert.equal((await owner.call('/api/workspace/state', { method: 'PUT', body: { state: doc } })).status, 200)
  const back = (await owner.call('/api/workspace/state')).json.state
  assert.equal(back.contacts[0].name, 'Ravi'); assert.equal(back.blob.length, 400000)
})

test('public demo request is stored as a lead and validated', async () => {
  const a = client()
  assert.equal((await a.call('/api/public/contact', { method: 'POST', body: { name: 'Ada' } })).status, 400)
  assert.equal((await a.call('/api/public/contact', { method: 'POST', body: { name: 'Ada', email: 'ada@corp.test', company: 'Corp', phone: '+911' } })).status, 200)
  const leads = (await owner.call('/api/leads')).json.leads
  assert.equal(leads.at(-1).name, 'Ada (Corp)'); await owner.call('/api/leads/ack', { method: 'POST', body: { ids: leads.map((l) => l.id) } })
})

test('Twilio inbound webhook fills the inbox; replies are logged', async () => {
  const a = client()
  const r = await fetch(base + '/webhook/twilio', { method: 'POST', body: 'From=whatsapp%3A%2B919811111111&Body=hello+there', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }); assert.equal(r.status, 200)
  let inbox = (await owner.call('/api/inbox')).json.messages; assert.equal(inbox.at(-1).channel, 'whatsapp'); assert.equal(inbox.at(-1).from, '+919811111111'); assert.equal(inbox.at(-1).dir, 'in'); assert.equal(inbox.at(-1).text, 'hello there')
  await owner.call('/api/inbox/log', { method: 'POST', body: { channel: 'whatsapp', to: '+919811111111', text: 'hi!', bot: true } })
  inbox = (await owner.call('/api/inbox')).json.messages; assert.equal(inbox.at(-1).dir, 'out'); assert.equal(inbox.at(-1).bot, true)
  assert.equal((await a.call('/api/inbox')).status, 401)
})

test('sending: validation, and simulated mode when no provider keys are set', async () => {
  const send = (b) => owner.call('/api/send', { method: 'POST', body: b })
  assert.equal((await send({ channel: 'sms', to: '9876', text: 'hi' })).status, 400)
  assert.equal((await send({ channel: 'sms', to: '+919876543210', text: 'hi' })).json.status, 'simulated')
  assert.equal((await send({ channel: 'email', to: 'bad', text: 'hi' })).status, 400)
  assert.equal((await send({ channel: 'email', to: 'a@b.co', text: 'hi', html: '<b>x</b>' })).json.status, 'simulated')
  assert.equal((await send({ channel: 'whatsapp', to: '+919876543210', text: 'x'.repeat(2000) })).status, 400)
})

test('payment links and calls validate input and simulate without keys', async () => {
  assert.equal((await owner.call('/api/payment-link', { method: 'POST', body: { amount: 0 } })).status, 400)
  assert.equal((await owner.call('/api/payment-link', { method: 'POST', body: { amount: 10, description: 'x' } })).json.status, 'simulated')
  assert.equal((await owner.call('/api/call', { method: 'POST', body: { to: '123', text: 'hi' } })).status, 400)
  assert.equal((await owner.call('/api/call', { method: 'POST', body: { to: '+919876543210', text: 'x'.repeat(600) } })).status, 400)
  assert.equal((await owner.call('/api/call', { method: 'POST', body: { to: '+919876543210', text: 'hi' } })).json.status, 'simulated')
})

test('email verifier: syntax and disposable domains (no network needed)', async () => {
  const r = await owner.call('/api/verify-email', { method: 'POST', body: { emails: ['bad-address', 'x@mailinator.com', 'BAD-address'] } })
  assert.deepEqual(r.json.results.map((x) => x.result), ['invalid_syntax', 'disposable'])
})

test('AI agent forwards a cleaned conversation and returns replies and hand-offs', async () => {
  const ask = (messages) => owner.call('/api/agent', { method: 'POST', body: { system: 'You are Acme support.', knowledge: 'Refunds take 5-7 days.', messages } })
  fakeCalls = []
  const ok = await ask([{ role: 'assistant', content: 'stray' }, { role: 'user', content: 'hi' }, { role: 'user', content: 'refunds?' }]); assert.equal(ok.json.reply, 'Refunds take 5-7 days.')
  const sent = fakeCalls.at(-1); assert.equal(sent.url, '/v1/messages'); assert.equal(sent.key, 'test-key-not-real'); assert.equal(sent.body.max_tokens, 400)
  assert.deepEqual(sent.body.messages.map((m) => m.role), ['user'], 'leading assistant dropped, user turns merged')
  assert.match(sent.body.system, /<reference_notes>/); assert.match(sent.body.system, /HANDOFF/)
  assert.equal((await ask([{ role: 'user', content: 'tell me a joke' }])).json.reply, 'HANDOFF')
  assert.equal((await ask([{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }])).status, 400)
})

test('users: only the owner can add or remove members', async () => {
  const member = { email: 'member@example.test', password: 'Member-' + randomBytes(8).toString('hex') }
  assert.equal((await owner.call('/api/users', { method: 'POST', body: { email: member.email, password: 'short' } })).status, 400)
  assert.equal((await owner.call('/api/users', { method: 'POST', body: member })).status, 200)
  assert.equal((await owner.call('/api/users', { method: 'POST', body: member })).status, 409)
  const m = client(); assert.equal((await m.call('/api/login', { method: 'POST', body: member })).status, 200)
  assert.equal((await m.call('/api/users', { method: 'POST', body: { email: 'z@example.test', password: 'Another-pass-123' } })).status, 403)
  const id = (await owner.call('/api/users')).json.users.find((u) => u.email === member.email).id
  assert.equal((await owner.call(`/api/users/${id}`, { method: 'DELETE' })).status, 200)
  assert.equal((await m.call('/api/forms')).status, 401, "a removed user's session stops working")
  const ownerId = (await owner.call('/api/users')).json.users.find((u) => u.role === 'owner').id
  assert.equal((await owner.call(`/api/users/${ownerId}`, { method: 'DELETE' })).status, 403, 'owner cannot remove themselves')
})
