// Integration tests: start the real server as a child process with a temp data file and a fake Anthropic API.
// Run: npm test   (Node 22+, no dependencies)
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer, createServer as createNet } from 'node:http'
import { createServer as createTcp } from 'node:net'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const freePort = () => new Promise((ok) => { const s = createTcp().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)) }) })
const INBOUND_KEY = 'k' + randomBytes(12).toString('hex')

let tmp, proc, fake, base, fakeCalls = []
const OWNER = { email: 'owner@example.test', password: 'Owner-' + randomBytes(8).toString('hex') }

// Minimal HTTP client that keeps one session cookie.
function client() {
  let sid = ''
  const call = async (path, { method = 'GET', body, headers = {}, raw = false } = {}) => {
    const res = await fetch(base + path, { method, redirect: 'manual', headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(sid ? { Cookie: `sid=${sid}` } : {}), ...headers }, body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)) })
    const set = res.headers.get('set-cookie'); if (set) { const m = set.match(/sid=([^;]*)/); if (m) sid = m[1] }
    const text = await res.text(); let json = null; try { json = JSON.parse(text) } catch { /* not json */ }
    return { status: res.status, json, text, headers: res.headers }
  }
  return { call, hasSession: () => !!sid }
}
const owner = client()

before(async () => {
  tmp = mkdtempSync(join(tmpdir(), 'rokesh-test-'))
  fake = createServer((req, res) => { // fake Anthropic API
    let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
      const j = JSON.parse(b || '{}'); fakeCalls.push({ url: req.url, key: req.headers['x-api-key'], body: j })
      const last = j.messages?.[j.messages.length - 1]?.content || ''
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ content: [{ type: 'text', text: /refund/i.test(last) ? 'Refunds take 5-7 days.' : 'HANDOFF' }] }))
    })
  })
  const fakePort = await freePort(); await new Promise((ok) => fake.listen(fakePort, '127.0.0.1', ok))
  const port = await freePort(); base = `http://127.0.0.1:${port}`
  const env = { ...process.env, PORT: String(port), DATA_FILE: join(tmp, 'data.json'), INBOUND_KEY, ANTHROPIC_API_KEY: 'test-key-not-real', ANTHROPIC_BASE_URL: `http://127.0.0.1:${fakePort}`,
    TWILIO_ACCOUNT_SID: '', TWILIO_AUTH_TOKEN: '', RESEND_API_KEY: '', EMAIL_FROM: '', RAZORPAY_KEY_ID: '', RAZORPAY_KEY_SECRET: '', GEMINI_API_KEY: '', AGENT_PROVIDER: '', PUBLIC_URL: '' }
  proc = spawn(process.execPath, [join(root, 'server', 'server.mjs')], { env, stdio: ['ignore', 'pipe', 'pipe'] })
  await new Promise((ok, no) => { const t = setTimeout(() => no(new Error('server did not start')), 10000); proc.stdout.on('data', (d) => { if (String(d).includes('127.0.0.1')) { clearTimeout(t); ok() } }); proc.on('exit', (c) => no(new Error('server exited ' + c))) })
})
after(async () => { proc?.kill(); await new Promise((ok) => fake?.close(ok)); rmSync(tmp, { recursive: true, force: true }) })

test('static pages: security headers, private files hidden, app page needs sign-in', async () => {
  const c = client()
  const home = await c.call('/'); assert.equal(home.status, 200)
  assert.equal(home.headers.get('x-frame-options'), 'DENY'); assert.equal(home.headers.get('x-content-type-options'), 'nosniff')
  assert.equal((await c.call('/form.html')).headers.get('x-frame-options'), null, 'the public form must be embeddable')
  assert.equal((await c.call('/.env')).status, 404); assert.equal((await c.call('/../server/server.mjs')).status, 404)
  const app = await c.call('/app.html'); assert.equal(app.status, 302); assert.match(app.headers.get('location'), /login\.html/)
})

test('API is closed to anonymous users', async () => {
  const c = client()
  for (const p of ['/api/forms', '/api/inbox', '/api/leads', '/api/users']) assert.equal((await c.call(p)).status, 401, p)
  assert.equal((await c.call('/api/agent', { method: 'POST', body: {} })).status, 401)
  const st = await c.call('/api/status'); assert.equal(st.status, 200); assert.equal(st.json.live, false); assert.equal(st.json.agentLive, true)
})

test('first account becomes owner; registration then closes; password rules enforced', async () => {
  assert.equal((await owner.call('/api/me')).json.needsSetup, true)
  assert.equal((await owner.call('/api/register', { method: 'POST', body: { email: OWNER.email, password: 'short' } })).status, 400)
  assert.equal((await owner.call('/api/register', { method: 'POST', body: { email: 'not-an-email', password: OWNER.password } })).status, 400)
  const reg = await owner.call('/api/register', { method: 'POST', body: OWNER }); assert.equal(reg.status, 200); assert.ok(owner.hasSession())
  const me = await owner.call('/api/me'); assert.equal(me.json.user.email, OWNER.email); assert.equal(me.json.user.role, 'owner')
  assert.equal((await client().call('/api/register', { method: 'POST', body: { email: 'x@example.test', password: OWNER.password + '2' } })).status, 403)
  assert.equal((await owner.call('/app.html')).status, 200)
})

test('login: wrong credentials rejected without revealing which part; logout ends the session', async () => {
  const c = client()
  const wrong = await c.call('/api/login', { method: 'POST', body: { email: OWNER.email, password: 'wrong-wrong-wrong' } }); assert.equal(wrong.status, 401)
  const nobody = await c.call('/api/login', { method: 'POST', body: { email: 'nobody@example.test', password: 'wrong-wrong-wrong' } }); assert.equal(nobody.status, 401)
  assert.equal(wrong.json.error, nobody.json.error)
  assert.equal((await c.call('/api/login', { method: 'POST', body: OWNER })).status, 200)
  assert.equal((await c.call('/api/forms')).status, 200)
  await c.call('/api/logout', { method: 'POST', body: {} }); assert.equal((await c.call('/api/forms')).status, 401)
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

test('Twilio inbound webhook fills the inbox; replies are logged', async () => {
  const a = client()
  const r = await fetch(base + '/webhook/twilio', { method: 'POST', body: 'From=whatsapp%3A%2B919811111111&Body=hello+there', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }); assert.equal(r.status, 200)
  let inbox = (await owner.call('/api/inbox')).json.messages; assert.equal(inbox.at(-1).channel, 'whatsapp'); assert.equal(inbox.at(-1).from, '+919811111111'); assert.equal(inbox.at(-1).dir, 'in')
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

test('login attempts are rate limited per address', async () => {
  const c = client(); let blocked = false
  for (let i = 0; i < 12; i++) { const r = await c.call('/api/login', { method: 'POST', body: { email: OWNER.email, password: 'bad-bad-bad-bad' } }); if (r.status === 429) blocked = true }
  assert.ok(blocked)
})
