// Auth integration tests against a throwaway schema in the real database. Run: npm test
import './setup.js'
import { teardown, makeClient } from './setup.js'
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'

const { createApp } = await import('../src/app.js')
const { pool, query } = await import('../src/db.js')
const { hashPassword, verifyPassword } = await import('../src/password.js')

const PASSWORD = 'Test-' + randomBytes(10).toString('hex')
const OWNER = 'owner@example.test'
let server, base
const client = makeClient(() => base)

before(async () => {
  server = createApp().listen(0, '127.0.0.1')
  await new Promise((ok) => server.once('listening', ok))
  base = `http://127.0.0.1:${server.address().port}`
})
after(async () => {
  await new Promise((ok) => server.close(ok))
  await pool.end()
  await teardown()
})

test('health reports the database as up', async () => {
  const r = await client().call('/api/health'); assert.equal(r.status, 200); assert.equal(r.json.database, 'up')
})

test('password hashing: bcrypt, 12 rounds, random salt, pepper required', async () => {
  const h1 = await hashPassword(PASSWORD), h2 = await hashPassword(PASSWORD)
  assert.match(h1, /^\$2b\$12\$/); assert.notEqual(h1, h2)
  assert.equal(await verifyPassword(PASSWORD, h1), true); assert.equal(await verifyPassword(PASSWORD + 'x', h1), false)
  const bcrypt = (await import('bcrypt')).default
  assert.equal(await bcrypt.compare(PASSWORD, h1), false, 'the raw password alone must not match: the pepper is part of the input')
  assert.equal(await verifyPassword('a'.repeat(72) + 'zzzz', await hashPassword('a'.repeat(100))), false, 'long passwords are not truncated at 72 bytes')
})

test('first account becomes owner with a hardened session; registration then closes', async () => {
  const c = client()
  assert.equal((await c.call('/api/me')).json.needsSetup, true)
  assert.equal((await c.call('/api/auth/register', { method: 'POST', body: { email: 'nope', password: PASSWORD } })).status, 400)
  assert.equal((await c.call('/api/auth/register', { method: 'POST', body: { email: OWNER, password: 'short' } })).status, 400)
  const reg = await c.call('/api/auth/register', { method: 'POST', body: { email: OWNER.toUpperCase(), password: PASSWORD, name: 'Ada' } })
  assert.equal(reg.status, 201); assert.equal(reg.json.user.email, OWNER, 'emails are stored lowercase'); assert.equal(reg.json.user.role, 'owner')
  assert.match(reg.cookie, /HttpOnly/i); assert.match(reg.cookie, /SameSite=Strict/i)
  const row = (await query('SELECT password_hash FROM users WHERE email = $1', [OWNER])).rows[0]
  assert.match(row.password_hash, /^\$2b\$12\$/); assert.ok(!row.password_hash.includes(PASSWORD))
  const me = (await c.call('/api/me')).json; assert.equal(me.user.email, OWNER); assert.equal(me.user.name, 'Ada')
  assert.equal((await client().call('/api/register', { method: 'POST', body: { email: 'x@example.test', password: PASSWORD } })).status, 403)
})

test('login and logout', async () => {
  const c = client()
  assert.equal((await c.call('/api/me')).json.user, null)
  const wrong = await c.call('/api/auth/login', { method: 'POST', body: { email: OWNER, password: 'wrong-wrong-wrong' } })
  const nobody = await c.call('/api/auth/login', { method: 'POST', body: { email: 'nobody@example.test', password: 'wrong-wrong-wrong' } })
  assert.equal(wrong.status, 401); assert.equal(nobody.status, 401); assert.equal(wrong.json.error, nobody.json.error)
  assert.equal((await c.call('/api/auth/login', { method: 'POST', body: { email: OWNER, password: PASSWORD } })).status, 200)
  assert.equal((await c.call('/api/me')).json.user.email, OWNER)
  await c.call('/api/auth/logout', { method: 'POST', body: {} })
  assert.equal((await fetch(base + '/api/me').then((r) => r.json())).user, null, 'no cookie means no session')
})

test('a tampered or deleted-user session is rejected', async () => {
  await query("INSERT INTO users (email, password_hash, workspace_id) VALUES ('temp@example.test', $1, (SELECT min(id) FROM workspaces))", [await hashPassword(PASSWORD)])
  const c = client(); await c.call('/api/login', { method: 'POST', body: { email: 'temp@example.test', password: PASSWORD } })
  assert.equal((await c.call('/api/forms')).status, 200)
  await query("DELETE FROM users WHERE email = 'temp@example.test'")
  assert.equal((await c.call('/api/forms')).status, 401, 'token for a deleted user stops working')
  const bad = await fetch(base + '/api/forms', { headers: { Cookie: 'sid=not.a.jwt' } }); assert.equal(bad.status, 401)
})

test('password reset: wrong code rejected, right code sets a new password', async () => {
  const c = client()
  assert.equal((await c.call('/api/reset', { method: 'POST', body: { email: OWNER, code: '000000', password: PASSWORD + '2' } })).status, 400)
  const f = await c.call('/api/forgot', { method: 'POST', body: { email: OWNER } }); assert.ok(f.json.demoCode, 'outside production the code is returned for local testing')
  assert.equal((await c.call('/api/forgot', { method: 'POST', body: { email: 'nobody@example.test' } })).json.demoCode, undefined)
  assert.equal((await c.call('/api/reset', { method: 'POST', body: { email: OWNER, code: f.json.demoCode, password: 'short' } })).status, 400)
  assert.equal((await c.call('/api/reset', { method: 'POST', body: { email: OWNER, code: f.json.demoCode, password: PASSWORD + '2' } })).status, 200)
  assert.equal((await client().call('/api/login', { method: 'POST', body: { email: OWNER, password: PASSWORD + '2' } })).status, 200)
})

test('invalid JSON and unknown API paths get clean errors', async () => {
  const r = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' })
  assert.equal(r.status, 400); assert.equal((await r.json()).error, 'Invalid JSON')
  assert.equal((await fetch(base + '/api/nope')).status, 404)
})

test('login is rate limited per address', async () => {
  const c = client(); let blocked = false
  for (let i = 0; i < 12; i++) { const r = await c.call('/api/auth/login', { method: 'POST', body: { email: OWNER, password: 'bad-bad-bad-bad' } }); if (r.status === 429) blocked = true }
  assert.ok(blocked)
})
