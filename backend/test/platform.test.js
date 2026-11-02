// Platform portal tests: workspaces lifecycle, platform admins, and the demo-request and support queues.
import { teardown, makeClient } from './setup.js'
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'

const { createApp } = await import('../src/app.js')
const { pool } = await import('../src/db.js')

let server, base
const client = makeClient(() => base)
const pw = () => 'Pw-' + randomBytes(9).toString('hex')
const PLAT = { email: 'platform@example.test', password: pw() }
const A_OWNER = { email: 'acme-owner@example.test', password: pw() }
const plat = client(), anon = client()
let acme // { id, slug }

before(async () => {
  server = createApp().listen(0, '127.0.0.1')
  await new Promise((ok) => server.once('listening', ok))
  base = `http://127.0.0.1:${server.address().port}`
  const reg = await plat.call('/api/register', { method: 'POST', body: { ...PLAT, company: 'Rokesh HQ' } })
  assert.equal(reg.status, 201)
  assert.equal(reg.json.user.isPlatformAdmin, true); assert.equal(reg.json.user.workspaceSlug, 'rokesh-hq'); assert.equal(reg.json.user.role, 'owner')
})
after(async () => { await new Promise((ok) => server.close(ok)); await pool.end(); await teardown() })

test('workspaces: create with an owner, validate, list with counts', async () => {
  assert.equal((await plat.call('/api/platform/workspaces', { method: 'POST', body: { name: '', ownerEmail: A_OWNER.email, ownerPassword: A_OWNER.password } })).status, 400)
  assert.equal((await plat.call('/api/platform/workspaces', { method: 'POST', body: { name: 'Acme', ownerEmail: 'nope', ownerPassword: A_OWNER.password } })).status, 400)
  assert.equal((await plat.call('/api/platform/workspaces', { method: 'POST', body: { name: 'Acme', ownerEmail: A_OWNER.email, ownerPassword: 'short' } })).status, 400)
  const r = await plat.call('/api/platform/workspaces', { method: 'POST', body: { name: 'Acme Corp', ownerEmail: A_OWNER.email, ownerPassword: A_OWNER.password, ownerName: 'Ann' } })
  assert.equal(r.status, 201); acme = r.json.workspace; assert.equal(acme.slug, 'acme-corp')
  assert.equal((await plat.call('/api/platform/workspaces', { method: 'POST', body: { name: 'Acme Corp', ownerEmail: A_OWNER.email, ownerPassword: pw() } })).status, 409, 'an email can belong to one account only')
  const again = await plat.call('/api/platform/workspaces', { method: 'POST', body: { name: 'Acme Corp', ownerEmail: 'second@example.test', ownerPassword: pw() } })
  assert.equal(again.json.workspace.slug, 'acme-corp-2', 'slugs stay unique')
  const list = (await plat.call('/api/platform/workspaces')).json.workspaces
  assert.deepEqual(list.map((w) => w.slug), ['rokesh-hq', 'acme-corp', 'acme-corp-2'])
  assert.equal(list[1].users, 1)
  const owner = client(); const login = await owner.call('/api/login', { method: 'POST', body: A_OWNER })
  assert.equal(login.status, 200); assert.equal(login.json.user.role, 'owner'); assert.equal(login.json.user.isPlatformAdmin, false); assert.equal(login.json.user.workspaceName, 'Acme Corp')
})

test('workspace detail shows users and the webhook key; rotating the key changes it', async () => {
  const d = (await plat.call(`/api/platform/workspaces/${acme.id}`)).json
  assert.equal(d.users.length, 1); assert.equal(d.users[0].email, A_OWNER.email); assert.equal(d.workspace.inboundKey.length, 48); assert.equal(d.workspace.own, false)
  assert.equal((await plat.call(`/api/platform/workspaces/${acme.id}/rotate-key`, { method: 'POST', body: {} })).status, 200)
  assert.notEqual((await plat.call(`/api/platform/workspaces/${acme.id}`)).json.workspace.inboundKey, d.workspace.inboundKey)
  assert.equal((await plat.call('/api/platform/workspaces/abc')).status, 404)
  assert.equal((await plat.call('/api/platform/workspaces/999999')).status, 404)
})

test('suspending a workspace signs its users out, blocks login and hides its public forms', async () => {
  const owner = client()
  assert.equal((await owner.call('/api/login', { method: 'POST', body: A_OWNER })).status, 200)
  const form = await owner.call('/api/forms', { method: 'POST', body: { title: 'Enquiry', fields: [{ name: 'name', label: 'Name', type: 'text' }] } })
  assert.equal((await anon.call(`/api/public/forms/${form.json.id}`)).status, 200)
  assert.equal((await plat.call(`/api/platform/workspaces/${acme.id}`, { method: 'PATCH', body: { status: 'weird' } })).status, 400)
  assert.equal((await plat.call(`/api/platform/workspaces/${acme.id}`, { method: 'PATCH', body: { status: 'suspended' } })).status, 200)
  assert.equal((await owner.call('/api/forms')).status, 401, 'existing session stops working')
  const blocked = await client().call('/api/login', { method: 'POST', body: A_OWNER })
  assert.equal(blocked.status, 403); assert.match(blocked.json.error, /suspended/i)
  assert.equal((await anon.call(`/api/public/forms/${form.json.id}`)).status, 404, 'its public forms go offline')
  assert.equal((await plat.call(`/api/platform/workspaces/${acme.id}`, { method: 'PATCH', body: { status: 'active' } })).status, 200)
  assert.equal((await client().call('/api/login', { method: 'POST', body: A_OWNER })).status, 200)
  assert.equal((await anon.call(`/api/public/forms/${form.json.id}`)).status, 200)
})

test('platform admins cannot suspend or delete their own workspace; delete needs the typed address', async () => {
  const own = (await plat.call('/api/platform/workspaces')).json.workspaces[0]
  assert.equal((await plat.call(`/api/platform/workspaces/${own.id}`, { method: 'PATCH', body: { status: 'suspended' } })).status, 403)
  assert.equal((await plat.call(`/api/platform/workspaces/${own.id}`, { method: 'DELETE', body: { confirm: own.slug } })).status, 403)
  const other = (await plat.call('/api/platform/workspaces')).json.workspaces.find((w) => w.slug === 'acme-corp-2')
  assert.equal((await plat.call(`/api/platform/workspaces/${other.id}`, { method: 'DELETE', body: {} })).status, 400)
  assert.equal((await plat.call(`/api/platform/workspaces/${other.id}`, { method: 'DELETE', body: { confirm: 'wrong' } })).status, 400)
  assert.equal((await plat.call(`/api/platform/workspaces/${other.id}`, { method: 'DELETE', body: { confirm: other.slug } })).status, 200)
  assert.equal((await plat.call('/api/platform/workspaces')).json.workspaces.length, 2)
  const log = (await plat.call('/api/platform/audit?action=workspace.deleted')).json.entries
  assert.equal(log.length, 1, 'deletion stays in the audit log after the workspace is gone')
  assert.equal(log[0].target, 'acme-corp-2')
})

test('platform admin access: grant, revoke, never on yourself; reset any password', async () => {
  const owner = client(); await owner.call('/api/login', { method: 'POST', body: A_OWNER })
  const acmeUsers = (await plat.call(`/api/platform/workspaces/${acme.id}`)).json.users
  const uid = acmeUsers[0].id
  assert.equal((await owner.call('/api/platform/overview')).status, 403)
  assert.equal((await plat.call(`/api/platform/users/${uid}/platform-admin`, { method: 'PATCH', body: { isPlatformAdmin: 'yes' } })).status, 400)
  assert.equal((await plat.call(`/api/platform/users/${uid}/platform-admin`, { method: 'PATCH', body: { isPlatformAdmin: true } })).status, 200)
  assert.equal((await owner.call('/api/platform/overview')).status, 200, 'now a platform admin')
  assert.equal((await plat.call(`/api/platform/users/${uid}/platform-admin`, { method: 'PATCH', body: { isPlatformAdmin: false } })).status, 200)
  assert.equal((await owner.call('/api/platform/overview')).status, 403)
  const me = (await plat.call('/api/me')).json.user
  assert.equal((await plat.call(`/api/platform/users/${me.id}/platform-admin`, { method: 'PATCH', body: { isPlatformAdmin: false } })).status, 403, 'nobody removes their own access')
  const fresh = pw()
  assert.equal((await plat.call(`/api/platform/users/${uid}/reset-password`, { method: 'POST', body: { password: 'short' } })).status, 400)
  assert.equal((await plat.call(`/api/platform/users/${uid}/reset-password`, { method: 'POST', body: { password: fresh } })).status, 200)
  assert.equal((await client().call('/api/login', { method: 'POST', body: { email: A_OWNER.email, password: fresh } })).status, 200)
  assert.equal((await plat.call(`/api/platform/users/${me.id}/reset-password`, { method: 'POST', body: { password: pw() } })).status, 403, 'use Forgot password for yourself')
})

test('demo requests: public form stores them; platform admin filters, updates and deletes', async () => {
  assert.equal((await anon.call('/api/public/contact', { method: 'POST', body: { name: 'Ada' } })).status, 400)
  const body = { name: 'Ada', email: 'ada@corp.test', company: 'Corp', phone: '+911', employees: '51-200', interest: 'WhatsApp, Email' }
  assert.equal((await anon.call('/api/public/contact', { method: 'POST', body })).status, 200)
  const list = (await plat.call('/api/platform/demo-requests?status=new')).json
  assert.equal(list.total, 1)
  const r = list.requests[0]
  assert.equal(r.company, 'Corp'); assert.equal(r.interest, 'WhatsApp, Email'); assert.equal(r.status, 'new')
  assert.equal((await plat.call(`/api/platform/demo-requests/${r.id}`, { method: 'PATCH', body: { status: 'weird' } })).status, 400)
  assert.equal((await plat.call(`/api/platform/demo-requests/${r.id}`, { method: 'PATCH', body: { status: 'contacted', note: 'Called, sending a demo link' } })).status, 200)
  assert.equal((await plat.call('/api/platform/demo-requests?status=new')).json.total, 0)
  assert.equal((await plat.call('/api/platform/demo-requests?status=contacted')).json.requests[0].note, 'Called, sending a demo link')
  assert.equal((await plat.call(`/api/platform/demo-requests/${r.id}`, { method: 'DELETE' })).status, 200)
  assert.equal((await plat.call('/api/platform/demo-requests')).json.total, 0)
})

test('support tickets: public submit, validation, triage, reply (simulated without email), delete', async () => {
  assert.equal((await anon.call('/api/public/support', { method: 'POST', body: { email: 'c@x.test', subject: '', message: 'hi' } })).status, 400)
  assert.equal((await anon.call('/api/public/support', { method: 'POST', body: { email: 'c@x.test', subject: 'Cannot log in', message: 'Reset code never arrives' } })).status, 200)
  const t = (await plat.call('/api/platform/tickets')).json.tickets[0]
  assert.equal(t.status, 'open'); assert.equal(t.priority, 'normal'); assert.equal(t.subject, 'Cannot log in')
  assert.equal((await plat.call(`/api/platform/tickets/${t.id}`, { method: 'PATCH', body: { priority: 'urgent' } })).status, 400)
  assert.equal((await plat.call(`/api/platform/tickets/${t.id}`, { method: 'PATCH', body: { priority: 'high', assignee: PLAT.email, note: 'Checking mail logs' } })).status, 200)
  assert.equal((await plat.call(`/api/platform/tickets/${t.id}/reply`, { method: 'POST', body: { message: '  ' } })).status, 400)
  const rep = await plat.call(`/api/platform/tickets/${t.id}/reply`, { method: 'POST', body: { message: 'We have fixed your reset email.' } })
  assert.equal(rep.status, 200); assert.equal(rep.json.delivery, 'simulated')
  const after = (await plat.call('/api/platform/tickets')).json.tickets[0]
  assert.equal(after.status, 'pending'); assert.equal(after.priority, 'high'); assert.ok(after.replied_at)
  assert.equal((await plat.call(`/api/platform/tickets/${t.id}`, { method: 'PATCH', body: { status: 'resolved' } })).status, 200)
  assert.equal((await plat.call('/api/platform/tickets?status=open')).json.total, 0)
  assert.equal((await plat.call(`/api/platform/tickets/${t.id}`, { method: 'DELETE' })).status, 200)
  assert.equal((await plat.call('/api/platform/tickets')).json.total, 0)
})

test('public support form is rate limited', async () => {
  const c = client()
  let limited = 0
  for (let i = 0; i < 8; i++) if ((await c.call('/api/public/support', { method: 'POST', body: { email: 'r@x.test', subject: 's', message: 'm' } })).status === 429) limited++
  assert.ok(limited >= 1)
  const left = (await plat.call('/api/platform/tickets')).json.tickets
  await Promise.all(left.map((t) => plat.call(`/api/platform/tickets/${t.id}`, { method: 'DELETE' })))
})

test('overview, system and the global audit log report real data without secrets', async () => {
  const o = (await plat.call('/api/platform/overview')).json
  assert.equal(o.counts.workspaces, 2); assert.equal(o.counts.activeWorkspaces, 2); assert.equal(o.counts.platformAdmins, 1); assert.equal(o.activity.workspaces.length, 7)
  const s = (await plat.call('/api/platform/system')).json
  assert.match(s.node, /^v\d+/); assert.ok(s.database.sizeBytes > 0); assert.equal(s.configured.email, false)
  assert.ok(!JSON.stringify(s).match(/postgres(ql)?:\/\//i), 'no connection strings')
  const a = (await plat.call('/api/platform/audit?limit=200')).json
  const actions = new Set(a.entries.map((e) => e.action))
  for (const x of ['owner.created', 'workspace.created', 'workspace.updated', 'workspace.deleted', 'workspace.key_rotated', 'platform.granted', 'platform.revoked', 'demo.updated', 'ticket.replied']) assert.ok(actions.has(x), `audit has ${x}`)
  assert.ok(a.entries.every((e) => !/Pw-/.test(e.detail)), 'passwords never appear in the log')
  const acmeId = acme.id
  const scoped = (await plat.call(`/api/platform/audit?workspace=${acmeId}`)).json.entries
  assert.ok(scoped.length > 0 && scoped.every((e) => e.workspace === 'Acme Corp'), 'filter by workspace')
})
