// Tenant isolation: two workspaces must never see or change each other's data.
import { teardown, makeClient } from './setup.js'
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'

process.env.INBOUND_KEY = 'legacy-' + randomBytes(12).toString('hex')

const { createApp } = await import('../src/app.js')
const { pool } = await import('../src/db.js')

let server, base
const client = makeClient(() => base)
const pw = () => 'Pw-' + randomBytes(9).toString('hex')
const A = { email: 'a-owner@example.test', password: pw() }, B = { email: 'b-owner@example.test', password: pw() }
const a = client(), b = client(), anon = client()
let wsB // { id, slug }
let keyB

before(async () => {
  server = createApp().listen(0, '127.0.0.1')
  await new Promise((ok) => server.once('listening', ok))
  base = `http://127.0.0.1:${server.address().port}`
  assert.equal((await a.call('/api/register', { method: 'POST', body: { ...A, company: 'Workspace A' } })).status, 201)
  const created = await a.call('/api/platform/workspaces', { method: 'POST', body: { name: 'Workspace B', ownerEmail: B.email, ownerPassword: B.password } })
  assert.equal(created.status, 201); wsB = created.json.workspace
  assert.equal((await b.call('/api/login', { method: 'POST', body: B })).status, 200)
  keyB = (await a.call(`/api/platform/workspaces/${wsB.id}`)).json.workspace.inboundKey
})
after(async () => { await new Promise((ok) => server.close(ok)); await pool.end(); await teardown() })

test('each workspace keeps its own working data document', async () => {
  assert.equal((await b.call('/api/workspace/state')).json.state, null)
  assert.equal((await a.call('/api/workspace/state', { method: 'PUT', body: { state: { contacts: [{ id: '1', name: 'Only in A' }] } } })).status, 200)
  assert.equal((await b.call('/api/workspace/state')).json.state, null, 'B sees nothing of A')
  assert.equal((await b.call('/api/workspace/state', { method: 'PUT', body: { state: { contacts: [{ id: '9', name: 'Only in B' }] } } })).status, 200)
  assert.equal((await a.call('/api/workspace/state')).json.state.contacts[0].name, 'Only in A', "B's save did not touch A")
  assert.equal((await b.call('/api/workspace/state')).json.state.contacts[0].name, 'Only in B')
})

test('forms and responses are private to their workspace; ids cannot be used across workspaces', async () => {
  const fa = (await a.call('/api/forms', { method: 'POST', body: { title: 'A form', fields: [{ name: 'name', label: 'Name', type: 'text' }] } })).json
  assert.equal((await anon.call(`/api/public/forms/${fa.id}/submit`, { method: 'POST', body: { name: 'Visitor' } })).status, 200)
  const listB = (await b.call('/api/forms')).json
  assert.equal(listB.forms.length, 0); assert.equal(listB.submissions.length, 0)
  // B cannot overwrite or delete A's form by guessing its id
  const hijack = await b.call('/api/forms', { method: 'POST', body: { id: fa.id, title: 'Hijacked', fields: [] } })
  assert.equal(hijack.status, 200); assert.notEqual(hijack.json.id, fa.id, 'a foreign id creates a new form instead of overwriting')
  await b.call(`/api/forms/${fa.id}`, { method: 'DELETE' })
  const still = (await a.call('/api/forms')).json
  assert.equal(still.forms.length, 1); assert.equal(still.forms[0].title, 'A form'); assert.equal(still.submissions.length, 1)
  assert.equal((await b.call('/api/forms')).json.forms.length, 1, "B's own new form is only in B")
})

test('inbound webhooks land in the right workspace', async () => {
  const twilio = (path, body) => fetch(base + path, { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
  assert.equal((await twilio('/webhook/twilio', 'From=whatsapp%3A%2B911111111111&Body=to+the+oldest')).status, 200) // legacy path: first workspace
  assert.equal((await twilio(`/webhook/twilio/${wsB.slug}`, 'From=%2B922222222222&Body=hello+B')).status, 200)
  assert.equal((await twilio('/webhook/twilio/no-such-workspace', 'From=%2B93&Body=x')).status, 404)
  const inA = (await a.call('/api/inbox')).json.messages, inB = (await b.call('/api/inbox')).json.messages
  assert.deepEqual(inA.map((m) => m.text), ['to the oldest']); assert.deepEqual(inB.map((m) => m.text), ['hello B'])
  assert.equal(inB[0].channel, 'sms')

  const hook = (path, body) => anon.call(path, { method: 'POST', body })
  assert.equal((await hook(`/webhook/contact/${wsB.slug}?key=wrong`, { phone: '+91' })).status, 403)
  assert.equal((await hook(`/webhook/contact/${wsB.slug}?key=${keyB}`, { name: 'Lead B', phone: '+919800000002' })).status, 200)
  assert.equal((await hook(`/webhook/contact?key=${process.env.INBOUND_KEY}`, { name: 'Lead A', phone: '+919800000001' })).status, 200)
  assert.equal((await hook(`/webhook/contact/${wsB.slug}?key=${process.env.INBOUND_KEY}`, { phone: '+91' })).status, 403, "the legacy key does not open B")
  const leadsA = (await a.call('/api/leads')).json.leads, leadsB = (await b.call('/api/leads')).json.leads
  assert.deepEqual(leadsA.map((l) => l.name), ['Lead A']); assert.deepEqual(leadsB.map((l) => l.name), ['Lead B'])
  // B cannot acknowledge (delete) A's leads
  await b.call('/api/leads/ack', { method: 'POST', body: { ids: leadsA.map((l) => l.id) } })
  assert.equal((await a.call('/api/leads')).json.leads.length, 1)
  await b.call('/api/leads/ack', { method: 'POST', body: { ids: leadsB.map((l) => l.id) } })
  assert.equal((await b.call('/api/leads')).json.leads.length, 0)
})

test('the webhook key is shown only to owners and admins, and rotating it cuts the old one off', async () => {
  const info = (await b.call('/api/workspace/info')).json
  assert.equal(info.slug, wsB.slug); assert.equal(info.inboundKey, keyB)
  const m = client()
  await b.call('/api/admin/users', { method: 'POST', body: { email: 'b-member@example.test', password: B.password } })
  await m.call('/api/login', { method: 'POST', body: { email: 'b-member@example.test', password: B.password } })
  assert.equal((await m.call('/api/workspace/info')).json.inboundKey, null, 'members never see the key')
  assert.equal((await a.call(`/api/platform/workspaces/${wsB.id}/rotate-key`, { method: 'POST', body: {} })).status, 200)
  assert.equal((await anon.call(`/webhook/contact/${wsB.slug}?key=${keyB}`, { method: 'POST', body: { phone: '+91' } })).status, 403)
})

test('users and audit logs never leak between workspaces', async () => {
  const usersB = (await b.call('/api/admin/users')).json.users.map((u) => u.email).sort()
  assert.deepEqual(usersB, ['b-member@example.test', 'b-owner@example.test'])
  assert.deepEqual((await b.call('/api/users')).json.users.map((u) => u.email).sort(), usersB)
  const idA = (await a.call('/api/admin/users')).json.users[0].id
  assert.equal((await b.call(`/api/admin/users/${idA}`, { method: 'PATCH', body: { disabled: true } })).status, 404, "B cannot touch A's user by id")
  assert.equal((await b.call(`/api/admin/users/${idA}/reset-password`, { method: 'POST', body: { password: pw() } })).status, 404)
  assert.equal((await b.call(`/api/admin/users/${idA}`, { method: 'DELETE' })).status, 404)
  assert.equal((await b.call(`/api/users/${idA}`, { method: 'DELETE' })).status, 404, 'the older delete route is scoped to B too')
  assert.equal((await a.call('/api/admin/users')).json.users.length, 1, "A's owner is untouched")
  const auditB = (await b.call('/api/admin/audit?limit=200')).json.entries
  assert.ok(auditB.length > 0)
  assert.ok(!auditB.some((e) => e.actor === A.email && e.action === 'login'), "A's sign-ins are not in B's log")
  assert.ok(auditB.every((e) => e.actor.startsWith('b-') || e.action.startsWith('workspace.')), "only B's own events and the platform's actions on B")
  assert.ok(!auditB.some((e) => e.action === 'owner.created'), 'platform-created history of A is not visible to B')
  const ov = (await b.call('/api/admin/overview')).json.counts
  assert.equal(ov.users, 2); assert.equal(ov.forms, 1); assert.equal(ov.inboxMessages, 1)
})

test('deleting a workspace removes its data and nobody else’s', async () => {
  assert.equal((await a.call(`/api/platform/workspaces/${wsB.id}`, { method: 'DELETE', body: { confirm: wsB.slug } })).status, 200)
  assert.equal((await b.call('/api/forms')).status, 401, "B's sessions end")
  const left = await pool.query('SELECT (SELECT count(*) FROM forms) AS forms, (SELECT count(*) FROM inbox) AS inbox, (SELECT count(*) FROM workspace_state) AS state, (SELECT count(*) FROM users) AS users')
  assert.deepEqual({ ...left.rows[0] }, { forms: '1', inbox: '1', state: '1', users: '1' }, "only A's rows remain")
  assert.equal((await a.call('/api/forms')).json.forms.length, 1)
})
