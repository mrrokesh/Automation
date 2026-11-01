import { Router } from 'express'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'
import { randomInt } from 'node:crypto'
import { config } from '../config.js'
import { query } from '../db.js'
import { hashPassword, verifyPassword, DUMMY_HASH } from '../password.js'
import { currentUser, requireAuth } from '../middleware/auth.js'
import { clip, emailLive, resendSend } from '../services/providers.js'

const router = Router()
const emailOk = (e) => typeof e === 'string' && e.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)
const pwOk = (p) => typeof p === 'string' && p.length >= 10 && p.length <= 200
const SESSION_MS = 7 * 24 * 3600 * 1000
const publicUser = (u) => ({ id: String(u.id), email: u.email, role: u.role, name: u.name || '', phone: u.phone || '', company: u.company || '' })

const cookieOptions = { httpOnly: true, sameSite: 'strict', secure: config.production, maxAge: SESSION_MS, path: '/' }
const startSession = (res, user) => res.cookie('sid', jwt.sign({ sub: String(user.id) }, config.jwtSecret, { expiresIn: '7d' }), cookieOptions)

// 10 attempts per 15 minutes per IP on credential endpoints.
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts, try again later' } })

const userCount = async () => Number((await query('SELECT count(*) FROM users')).rows[0].count)
const resets = new Map() // email -> { code, exp }; in memory, so a restart cancels pending resets

// The first account becomes the owner; after that only the owner adds members.
router.post('/register', limiter, async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {}
    if (!emailOk(email) || !pwOk(password)) return res.status(400).json({ error: 'Enter a valid email and a password of 10 to 200 characters' })
    if (await userCount()) return res.status(403).json({ error: 'Registration is closed; ask the owner to add you' })
    const { rows } = await query(
      `INSERT INTO users (email, password_hash, role, name, phone, company) VALUES ($1, $2, 'owner', $3, $4, $5)
       ON CONFLICT (email) DO NOTHING RETURNING id, email, role, name, phone, company`,
      [email.trim().toLowerCase(), await hashPassword(password), clip(req.body.name, 80), clip(req.body.phone, 24), clip(req.body.company, 80)],
    )
    if (!rows.length) return res.status(409).json({ error: 'An account with this email already exists' })
    startSession(res, rows[0])
    res.status(201).json({ ok: true, user: publicUser(rows[0]) })
  } catch (err) { next(err) }
})

router.post('/login', limiter, async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {}
    if (!emailOk(email) || typeof password !== 'string' || password.length > 200) return res.status(401).json({ error: 'Wrong email or password' })
    const { rows } = await query('SELECT id, email, role, name, phone, company, password_hash FROM users WHERE email = $1', [email.trim().toLowerCase()])
    const user = rows[0]
    const ok = await verifyPassword(password, user ? user.password_hash : DUMMY_HASH) // always hash, so timing does not reveal valid emails
    if (!user || !ok) return res.status(401).json({ error: 'Wrong email or password' })
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
    const { rows } = await query('UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, email, role, name, phone, company', [await hashPassword(req.body.password), email])
    resets.delete(email)
    if (!rows.length) return res.status(400).json({ error: 'Code is invalid or expired' })
    startSession(res, rows[0])
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// ---- Members (owner only to change) ----
router.get('/users', requireAuth, async (_req, res, next) => {
  try { res.json({ users: (await query('SELECT id, email, role FROM users ORDER BY id')).rows.map((u) => ({ id: String(u.id), email: u.email, role: u.role })) }) } catch (err) { next(err) }
})

router.post('/users', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'owner') return res.status(403).json({ error: 'Owner only' })
    const { email, password } = req.body ?? {}
    if (!emailOk(email) || !pwOk(password)) return res.status(400).json({ error: 'Enter a valid email and a password of 10 to 200 characters' })
    const { rowCount } = await query("INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'member') ON CONFLICT (email) DO NOTHING", [email.trim().toLowerCase(), await hashPassword(password)])
    if (!rowCount) return res.status(409).json({ error: 'Already exists' })
    res.json({ ok: true })
  } catch (err) { next(err) }
})

router.delete('/users/:id', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'owner' || String(req.user.id) === req.params.id) return res.status(403).json({ error: 'Owner only, and not yourself' })
    if (!/^\d+$/.test(req.params.id)) return res.status(404).json({ error: 'Not found' })
    await query('DELETE FROM users WHERE id = $1', [req.params.id])
    res.json({ ok: true })
  } catch (err) { next(err) }
})

export default router
