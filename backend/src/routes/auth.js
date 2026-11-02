import { Router } from 'express'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'
import { randomInt } from 'node:crypto'
import { config } from '../config.js'
import { pool, query } from '../db.js'
import { hashPassword, verifyPassword, DUMMY_HASH } from '../password.js'
import { currentUser, requireAuth } from '../middleware/auth.js'
import { clip, emailLive, resendSend } from '../services/providers.js'
import { audit } from '../services/audit.js'
import { newInboundKey, uniqueSlug } from '../services/workspaces.js'

const router = Router()
const emailOk = (e) => typeof e === 'string' && e.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)
const pwOk = (p) => typeof p === 'string' && p.length >= 10 && p.length <= 200
const SESSION_MS = 7 * 24 * 3600 * 1000
export const publicUser = (u) => ({
  id: String(u.id), email: u.email, role: u.role, name: u.name || '', phone: u.phone || '', company: u.company || '',
  workspaceId: String(u.workspace_id), workspaceName: u.workspace_name || '', workspaceSlug: u.workspace_slug || '',
  isPlatformAdmin: !!u.is_platform_admin,
})

const cookieOptions = { httpOnly: true, sameSite: 'strict', secure: config.production, maxAge: SESSION_MS, path: '/' }
const startSession = (res, user) => res.cookie('sid', jwt.sign({ sub: String(user.id) }, config.jwtSecret, { expiresIn: '7d' }), cookieOptions)

// 10 attempts per 15 minutes per IP on credential endpoints.
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts, try again later' } })

const userCount = async () => Number((await query('SELECT count(*) FROM users')).rows[0].count)
const resets = new Map() // email -> { code, exp }; in memory, so a restart cancels pending resets

// The very first account creates the first workspace and becomes its owner and the platform admin.
// After that, accounts are created by an owner (their workspace) or a platform admin (new workspaces).
router.post('/register', limiter, async (req, res, next) => {
  const client = await pool.connect()
  try {
    const { email, password } = req.body ?? {}
    if (!emailOk(email) || !pwOk(password)) return res.status(400).json({ error: 'Enter a valid email and a password of 10 to 200 characters' })
    if (await userCount()) return res.status(403).json({ error: 'Registration is closed; ask the owner to add you' })
    const hash = await hashPassword(password)
    await client.query('BEGIN')
    const name = clip(req.body.company, 60).trim() || 'My workspace'
    const ws = (await client.query('INSERT INTO workspaces (name, slug, inbound_key) VALUES ($1, $2, $3) RETURNING id, name, slug', [name, await uniqueSlug(name, client), newInboundKey()])).rows[0]
    const { rows } = await client.query(
      `INSERT INTO users (email, password_hash, role, name, phone, company, workspace_id, is_platform_admin) VALUES ($1, $2, 'owner', $3, $4, $5, $6, true)
       ON CONFLICT (email) DO NOTHING RETURNING id, email, role, name, phone, company, workspace_id, is_platform_admin`,
      [email.trim().toLowerCase(), hash, clip(req.body.name, 80), clip(req.body.phone, 24), clip(req.body.company, 80), ws.id])
    if (!rows.length) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'An account with this email already exists' }) }
    await client.query('COMMIT')
    await audit(rows[0].email, 'owner.created', rows[0].email, `workspace ${ws.slug}`, ws.id)
    startSession(res, rows[0])
    res.status(201).json({ ok: true, user: publicUser({ ...rows[0], workspace_name: ws.name, workspace_slug: ws.slug }) })
  } catch (err) { await client.query('ROLLBACK').catch(() => {}); next(err) } finally { client.release() }
})

router.post('/login', limiter, async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {}
    if (!emailOk(email) || typeof password !== 'string' || password.length > 200) return res.status(401).json({ error: 'Wrong email or password' })
    const { rows } = await query(
      `SELECT u.id, u.email, u.role, u.name, u.phone, u.company, u.password_hash, u.disabled, u.is_platform_admin, u.workspace_id,
              w.name AS workspace_name, w.slug AS workspace_slug, w.status AS workspace_status
         FROM users u JOIN workspaces w ON w.id = u.workspace_id WHERE u.email = $1`, [email.trim().toLowerCase()])
    const user = rows[0]
    const ok = await verifyPassword(password, user ? user.password_hash : DUMMY_HASH) // always hash, so timing does not reveal valid emails
    if (!user || !ok) { if (user) await audit(email.trim().toLowerCase(), 'login.failed', '', '', user.workspace_id); return res.status(401).json({ error: 'Wrong email or password' }) }
    if (user.disabled) { await audit(user.email, 'login.blocked', user.email, 'account disabled', user.workspace_id); return res.status(403).json({ error: 'This account is disabled. Ask your workspace owner.' }) }
    if (user.workspace_status !== 'active' && !user.is_platform_admin) { await audit(user.email, 'login.blocked', user.email, 'workspace suspended', user.workspace_id); return res.status(403).json({ error: 'This workspace is suspended. Contact support.' }) }
    await query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id])
    await audit(user.email, 'login', '', '', user.workspace_id)
    startSession(res, user)
    res.json({ ok: true, user: publicUser(user) })
  } catch (err) { next(err) }
})

router.post('/logout', (_req, res) => {
  res.clearCookie('sid', { ...cookieOptions, maxAge: undefined })
  res.json({ ok: true })
})

// Always 200: user is null when signed out, and needsSetup is true until the first account exists.
router.get('/me', async (req, res, next) => {
  try {
    const user = await currentUser(req)
    res.json({ user: user ? publicUser(user) : null, needsSetup: !user && (await userCount()) === 0 })
  } catch (err) { next(err) }
})

// Password reset: the code is emailed when Resend is configured. Outside production, with no mail service,
// it is returned in the response so the flow can be tried locally.
router.post('/forgot', limiter, async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase()
    const { rows } = await query('SELECT id FROM users WHERE email = $1', [email])
    if (!rows.length) return res.json({ ok: true })
    const code = String(randomInt(100000, 1000000))
    resets.set(email, { code, exp: Date.now() + 15 * 60e3 })
    if (emailLive()) { await resendSend({ to: email, subject: 'Your password reset code', text: `Your code is ${code}. It expires in 15 minutes.` }); return res.json({ ok: true }) }
    res.json(config.production ? { ok: true } : { ok: true, demoCode: code })
  } catch (err) { next(err) }
})

router.post('/reset', limiter, async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase()
    const r = resets.get(email)
    if (!r || r.exp < Date.now() || r.code !== String(req.body?.code || '')) return res.status(400).json({ error: 'Code is invalid or expired' })
    if (!pwOk(req.body?.password)) return res.status(400).json({ error: 'Password must be 10 to 200 characters' })
    const { rows } = await query('UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, email, workspace_id', [await hashPassword(req.body.password), email])
    resets.delete(email)
    if (!rows.length) return res.status(400).json({ error: 'Code is invalid or expired' })
    await audit(email, 'password.reset', email, 'self-service code', rows[0].workspace_id)
    startSession(res, rows[0])
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// ---- Members of the signed-in user's own workspace (owner only to change) ----
router.get('/users', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query('SELECT id, email, role FROM users WHERE workspace_id = $1 ORDER BY id', [req.user.workspace_id])
    res.json({ users: rows.map((u) => ({ id: String(u.id), email: u.email, role: u.role })) })
  } catch (err) { next(err) }
})

router.post('/users', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'owner') return res.status(403).json({ error: 'Owner only' })
    const { email, password } = req.body ?? {}
    if (!emailOk(email) || !pwOk(password)) return res.status(400).json({ error: 'Enter a valid email and a password of 10 to 200 characters' })
    const { rowCount } = await query("INSERT INTO users (email, password_hash, role, workspace_id) VALUES ($1, $2, 'member', $3) ON CONFLICT (email) DO NOTHING",
      [email.trim().toLowerCase(), await hashPassword(password), req.user.workspace_id])
    if (!rowCount) return res.status(409).json({ error: 'Already exists' })
    await audit(req.user.email, 'user.invited', email.trim().toLowerCase(), '', req.user.workspace_id)
    res.json({ ok: true })
  } catch (err) { next(err) }
})

router.delete('/users/:id', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'owner' || String(req.user.id) === req.params.id) return res.status(403).json({ error: 'Owner only, and not yourself' })
    if (!/^\d+$/.test(req.params.id)) return res.status(404).json({ error: 'Not found' })
    const gone = await query("DELETE FROM users WHERE id = $1 AND workspace_id = $2 AND role <> 'owner' RETURNING email", [req.params.id, req.user.workspace_id])
    if (!gone.rowCount) return res.status(404).json({ error: 'Not found' })
    await audit(req.user.email, 'user.deleted', gone.rows[0].email, '', req.user.workspace_id)
    res.json({ ok: true })
  } catch (err) { next(err) }
})

export default router
