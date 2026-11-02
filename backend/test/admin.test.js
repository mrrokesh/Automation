// Workspace admin portal tests: access control, user management rules, overview and audit log (own workspace only).
import { teardown, makeClient } from './setup.js'
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'

const { createApp } = await import('../src/app.js')
const { pool } = await import('../src/db.js')

let server, base
const client = makeClient(() => base)
const pw = () => 'Pw-' + randomBytes(9).toString('hex')
const OWNER = { email: 'owner@example.test', password: pw() }
const ADMIN = { email: 'admin@example.test', password: pw() }
const MEMBER = { email: 'member@example.test', password: pw() }
const owner = client(), admin = client(), member = client(), anon = client()
const ids = {}

before(async () => {
  server = createApp().listen(0, '127.0.0.1')
  await new Promise((ok) => server.once('listening', ok))
  base = `http://127.0.0.1:${server.address().port}`
  assert.equal((await owner.call('/api/register', { method: 'POST', body: OWNER })).status, 201)
  assert.equal((await owner.call('/api/admin/users', { method: 'POST', body: { ...ADMIN, role: 'admin' } })).status, 200)
  assert.equal((await owner.call('/api/admin/users', { method: 'POST', body: MEMBER })).status, 200)
  assert.equal((await admin.call('/api/login', { method: 'POST', body: ADMIN })).status, 200)
  assert.equal((await member.call('/api/login', { method: 'POST', body: MEMBER })).status, 200)
  for (const u of (await owner.call('/api/admin/users')).json.users) ids[u.email.split('@')[0]] = u.id
})
after(async () => { await new Promise((ok) => server.close(ok)); await pool.end(); await teardown() })

test('only owners and admins can open the workspace admin API', async () => {
  for (const p of ['/api/admin/overview', '/api/admin/users', '/api/admin/audit']) {
    assert.equal((await anon.call(p)).status, 401, `anonymous ${p}`)
    assert.equal((await member.call(p)).status, 403, `member ${p}`)
    assert.equal((await admin.call(p)).status, 200, `admin ${p}`)
    assert.equal((await owner.call(p)).status, 200, `owner ${p}`)
  }
  assert.equal((await member.call('/api/admin/users', { method: 'POST', body: { email: 'x@example.test', password: pw() } })).status, 403)
})

test('a workspace admin cannot use the platform API', async () => {
  for (const p of ['/api/platform/overview', '/api/platform/workspaces', '/api/platform/demo-requests', '/api/platform/tickets', '/api/platform/system', '/api/platform/audit']) {
    assert.equal((await admin.call(p)).status, 403, `workspace admin ${p}`)
    assert.equal((await member.call(p)).status, 403, `member ${p}`)
    assert.equal((await anon.call(p)).status, 401, `anonymous ${p}`)
  }
})

test('cross-origin writes to the admin API are blocked', async () => {
  const r = await owner.call(`/api/admin/users/${ids.member}`, { method: 'PATCH', body: { disabled: true }, headers: { Origin: 'http://evil.example' } })
  assert.equal(r.status, 403)
})

test('users: list shows role and status; admins cannot touch owners or other admins', async () => {
  const users = (await admin.call('/api/admin/users')).json.users
  assert.deepEqual(users.map((u) => u.role).sort(), ['admin', 'member', 'owner'])
  assert.ok(users.every((u) => !('password_hash' in u) && !('passwordHash' in u)), 'no hashes in the response')
  assert.equal((await admin.call(`/api/admin/users/${ids.owner}`, { method: 'PATCH', body: { disabled: true } })).status, 403, 'the owner cannot be changed')
  assert.equal((await owner.call(`/api/admin/users/${ids.owner}`, { method: 'PATCH', body: { disabled: true } })).status, 403, 'not even by themselves')
  assert.equal((await admin.call(`/api/admin/users/${ids.admin}`, { method: 'PATCH', body: { name: 'x' } })).status, 403, 'not yourself')
  assert.equal((await admin.call('/api/admin/users', { method: 'POST', body: { email: 'a2@example.test', password: pw(), role: 'admin' } })).status, 403, 'only the owner creates admins')
  assert.equal((await admin.call(`/api/admin/users/${ids.member}`, { method: 'PATCH', body: { role: 'admin' } })).status, 403, 'only the owner changes roles')
  assert.equal((await owner.call(`/api/admin/users/${ids.member}`, { method: 'PATCH', body: { role: 'owner' } })).status, 400, 'owner role cannot be granted')
  assert.equal((await owner.call('/api/admin/users/abc', { method: 'PATCH', body: { disabled: true } })).status, 404)
})

test('disabling a user signs them out and blocks login; enabling restores access', async () => {
  assert.equal((await member.call('/api/forms')).status, 200)
  assert.equal((await admin.call(`/api/admin/users/${ids.member}`, { method: 'PATCH', body: { disabled: true } })).status, 200)
  assert.equal((await member.call('/api/forms')).status, 401, 'existing session stops working')
  const login = await client().call('/api/login', { method: 'POST', body: MEMBER })
  assert.equal(login.status, 403); assert.match(login.json.error, /disabled/i)
  assert.equal((await client().call('/api/login', { method: 'POST', body: { ...MEMBER, password: 'wrong-wrong-wrong' } })).status, 401, 'a wrong password does not reveal the account is disabled')
  assert.equal((await admin.call(`/api/admin/users/${ids.member}`, { method: 'PATCH', body: { disabled: false } })).status, 200)
  assert.equal((await client().call('/api/login', { method: 'POST', body: MEMBER })).status, 200)
})

test('owner can promote, reset a password, and delete; sessions of deleted users end', async () => {
  assert.equal((await owner.call(`/api/admin/users/${ids.member}`, { method: 'PATCH', body: { role: 'admin' } })).status, 200)
  assert.equal((await owner.call(`/api/admin/users/${ids.member}`, { method: 'PATCH', body: { role: 'member' } })).status, 200)
  const fresh = pw()
  assert.equal((await owner.call(`/api/admin/users/${ids.member}/reset-password`, { method: 'POST', body: { password: 'short' } })).status, 400)
  assert.equal((await owner.call(`/api/admin/users/${ids.member}/reset-password`, { method: 'POST', body: { password: fresh } })).status, 200)
  assert.equal((await client().call('/api/login', { method: 'POST', body: MEMBER })).status, 401, 'old password no longer works')
  const m = client()
  assert.equal((await m.call('/api/login', { method: 'POST', body: { email: MEMBER.email, password: fresh } })).status, 200)
  assert.equal((await owner.call(`/api/admin/users/${ids.member}`, { method: 'DELETE' })).status, 200)
  assert.equal((await m.call('/api/forms')).status, 401)
  assert.equal((await owner.call('/api/admin/users')).json.users.length, 2)
})

test('overview and audit log report this workspace without secrets', async () => {
  const o = (await admin.call('/api/admin/overview')).json
  assert.equal(o.counts.users, 2); assert.equal(o.counts.activeUsers, 2); assert.equal(o.activity.logins.length, 7)
  assert.ok(!('newDemoRequests' in o.counts) && !('openTickets' in o.counts), 'platform queues are not part of a workspace overview')
  const a = (await admin.call('/api/admin/audit?limit=100')).json
  const actions = new Set(a.entries.map((e) => e.action))
  for (const x of ['owner.created', 'user.invited', 'login', 'user.updated', 'user.password_reset', 'user.deleted']) assert.ok(actions.has(x), `audit has ${x}`)
  assert.ok(a.entries.every((e) => !/Pw-/.test(e.detail)), 'passwords never appear in the log')
  assert.ok((await admin.call('/api/admin/audit?action=login')).json.entries.every((e) => e.action === 'login'))
  assert.equal((await admin.call('/api/admin/audit?limit=2')).json.entries.length, 2)
})
