// Integration tests against the real database, using only throwaway rows whose email matches
// "test-<hex>@example.test" (deleted afterwards). Run: npm test   (needs DATABASE_URL in backend/.env)
import 'dotenv/config'
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'

// Use throwaway secrets so tests never depend on (or reveal) the real PEPPER / JWT_SECRET.
process.env.PEPPER = 'test-pepper-' + randomBytes(24).toString('hex')
process.env.JWT_SECRET = 'test-jwt-' + randomBytes(24).toString('hex')
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set in backend/.env')

const { createApp } = await import('../src/app.js')
const { pool, query } = await import('../src/db.js')
const { hashPassword, verifyPassword } = await import('../src/password.js')

const tag = randomBytes(4).toString('hex')
const email = (n) => `test-${tag}-${n}@example.test`
const PASSWORD = 'Test-' + randomBytes(10).toString('hex')
let server, base

before(async () => {
  server = createApp().listen(0, '127.0.0.1')
  await new Promise((ok) => server.once('listening', ok))
  base = `http://127.0.0.1:${server.address().port}`
})
after(async () => {
  await query("DELETE FROM users WHERE email LIKE $1", [`test-${tag}-%@example.test`])
  await new Promise((ok) => server.close(ok))
  await pool.end()
})

function client() {
  let sid = ''
  return async (path, { method = 'GET', body } = {}) => {
    const res = await fetch(base + path, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(sid ? { Cookie: `sid=${sid}` } : {}) }, body: body ? JSON.stringify(body) : undefined })
    const set = res.headers.get('set-cookie'); if (set) { const m = set.match(/sid=([^;]*)/); sid = m ? m[1] : sid; return { status: res.status, json: await res.json().catch(() => ({})), cookie: set } }
    return { status: res.status, json: await res.json().catch(() => ({})), cookie: '' }
  }
}

test('health reports the database as up', async () => {
  const r = await client()('/api/health'); assert.equal(r.status, 200); assert.equal(r.json.database, 'up')
})

test('password hashing: bcrypt, 12 rounds, random salt, pepper required', async () => {
  const h1 = await hashPassword(PASSWORD), h2 = await hashPassword(PASSWORD)
  assert.match(h1, /^\$2b\$12\$/); assert.notEqual(h1, h2)
  assert.equal(await verifyPassword(PASSWORD, h1), true); assert.equal(await verifyPassword(PASSWORD + 'x', h1), false)
  const bcrypt = (await import('bcrypt')).default
  assert.equal(await bcrypt.compare(PASSWORD, h1), false, 'the raw password alone must not match: the pepper is part of the input')
  assert.equal(await verifyPassword('a'.repeat(72) + 'zzzz', await hashPassword('a'.repeat(100))), false, 'long passwords are not truncated at 72 bytes')
})

test('register validates input, stores only a hash, and starts a hardened session', async () => {
  const c = client()
  assert.equal((await c('/api/auth/register', { method: 'POST', body: { email: 'nope', password: PASSWORD } })).status, 400)
  assert.equal((await c('/api/auth/register', { method: 'POST', body: { email: email(1), password: 'short' } })).status, 400)
  const reg = await c('/api/auth/register', { method: 'POST', body: { email: email(1).toUpperCase(), password: PASSWORD } })
  assert.equal(reg.status, 201); assert.equal(reg.json.user.email, email(1), 'emails are stored lowercase')
  assert.match(reg.cookie, /HttpOnly/i); assert.match(reg.cookie, /SameSite=Strict/i)
  const row = (await query('SELECT password_hash FROM users WHERE email = $1', [email(1)])).rows[0]
  assert.match(row.password_hash, /^\$2b\$12\$/); assert.ok(!row.password_hash.includes(PASSWORD))
  assert.equal((await c('/api/auth/register', { method: 'POST', body: { email: email(1), password: PASSWORD } })).status, 409)
  assert.equal((await c('/api/auth/me')).json.user.email, email(1))
})

test('login and logout', async () => {
  const c = client()
  assert.equal((await c('/api/auth/me')).status, 401)
  const wrong = await c('/api/auth/login', { method: 'POST', body: { email: email(1), password: 'wrong-wrong-wrong' } })
  const nobody = await c('/api/auth/login', { method: 'POST', body: { email: email(9), password: 'wrong-wrong-wrong' } })
  assert.equal(wrong.status, 401); assert.equal(nobody.status, 401); assert.equal(wrong.json.error, nobody.json.error)
  assert.equal((await c('/api/auth/login', { method: 'POST', body: { email: email(1), password: PASSWORD } })).status, 200)
  assert.equal((await c('/api/auth/me')).status, 200)
  await c('/api/auth/logout', { method: 'POST', body: {} })
  assert.equal((await fetch(base + '/api/auth/me')).status, 401, 'no cookie means no session')
})

test('a tampered or deleted-user session is rejected', async () => {
  const c = client(); await c('/api/auth/register', { method: 'POST', body: { email: email(2), password: PASSWORD } })
  assert.equal((await c('/api/auth/me')).status, 200)
  await query('DELETE FROM users WHERE email = $1', [email(2)])
  assert.equal((await c('/api/auth/me')).status, 401, 'token for a deleted user stops working')
  const bad = await fetch(base + '/api/auth/me', { headers: { Cookie: 'sid=not.a.jwt' } }); assert.equal(bad.status, 401)
})

test('invalid JSON and unknown API paths get clean errors', async () => {
  const r = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' })
  assert.equal(r.status, 400); assert.equal((await r.json()).error, 'Invalid JSON')
  assert.equal((await fetch(base + '/api/nope')).status, 404)
})

test('login is rate limited per address', async () => {
  const c = client(); let blocked = false
  for (let i = 0; i < 12; i++) { const r = await c('/api/auth/login', { method: 'POST', body: { email: email(1), password: 'bad-bad-bad-bad' } }); if (r.status === 429) blocked = true }
  assert.ok(blocked)
})
