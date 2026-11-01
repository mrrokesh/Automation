// Test harness: every test file gets its own throwaway PostgreSQL schema (migrated from sql/*.sql) and
// throwaway secrets, so tests never read or change real data. The schema is dropped when the run ends.
import 'dotenv/config'
import { randomBytes } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import pg from 'pg'

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set in backend/.env')

const schema = 'test_' + randomBytes(5).toString('hex')
process.env.DB_SCHEMA = schema
process.env.TRUST_PROXY = '1' // lets each test client present its own address, so rate limits do not leak between tests
process.env.PEPPER = 'test-pepper-' + randomBytes(24).toString('hex')
process.env.JWT_SECRET = 'test-jwt-' + randomBytes(24).toString('hex')
// No provider keys: sending runs in simulated mode unless a test sets them.
for (const k of ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_SMS_FROM', 'TWILIO_WHATSAPP_FROM', 'RESEND_API_KEY', 'EMAIL_FROM', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'GEMINI_API_KEY', 'ANTHROPIC_API_KEY', 'AGENT_PROVIDER', 'PUBLIC_URL', 'INBOUND_KEY']) process.env[k] = ''

const admin = new pg.Client({ connectionString: process.env.DATABASE_URL })
await admin.connect()
await admin.query(`CREATE SCHEMA ${schema}`)
await admin.query(`SET search_path TO ${schema}`)
const dir = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'sql')
for (const f of (await readdir(dir)).filter((x) => x.endsWith('.sql')).sort()) await admin.query(await readFile(join(dir, f), 'utf8'))

export async function teardown() {
  await admin.query(`DROP SCHEMA ${schema} CASCADE`)
  await admin.end()
}

// Minimal HTTP client that keeps one session cookie.
export function makeClient(getBase) {
  return () => {
    let sid = ''
    const ip = [10, ...randomBytes(3)].join('.')
    const call = async (path, { method = 'GET', body, headers = {} } = {}) => {
      const res = await fetch(getBase() + path, {
        method, redirect: 'manual',
        headers: { 'X-Forwarded-For': ip, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(sid ? { Cookie: `sid=${sid}` } : {}), ...headers },
        body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
      })
      const set = res.headers.get('set-cookie')
      if (set) { const m = set.match(/sid=([^;]*)/); if (m) sid = m[1] }
      const text = await res.text()
      let json = null; try { json = JSON.parse(text) } catch { /* not JSON */ }
      return { status: res.status, json, text, headers: res.headers, cookie: set || '' }
    }
    return { call, hasSession: () => !!sid }
  }
}
