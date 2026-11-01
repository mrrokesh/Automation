import { Router } from 'express'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'
import { config } from '../config.js'
import { query } from '../db.js'
import { hashPassword, verifyPassword, DUMMY_HASH } from '../password.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
const emailOk = (e) => typeof e === 'string' && e.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)
const SESSION_MS = 7 * 24 * 3600 * 1000

const cookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: config.production,
  maxAge: SESSION_MS,
  path: '/',
}
const startSession = (res, user) =>
  res.cookie('sid', jwt.sign({ sub: user.id }, config.jwtSecret, { expiresIn: '7d' }), cookieOptions)

// 10 attempts per 15 minutes per IP on credential endpoints.
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts, try again later' } })

router.post('/register', limiter, async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {}
    if (!emailOk(email)) return res.status(400).json({ error: 'Enter a valid email address' })
    if (typeof password !== 'string' || password.length < 10 || password.length > 200) {
      return res.status(400).json({ error: 'Password must be 10 to 200 characters' })
    }
    const passwordHash = await hashPassword(password)
    const { rows } = await query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING RETURNING id, email',
      [email.trim().toLowerCase(), passwordHash],
    )
    if (!rows.length) return res.status(409).json({ error: 'An account with this email already exists' })
    startSession(res, rows[0])
    res.status(201).json({ user: rows[0] })
  } catch (err) { next(err) }
})

router.post('/login', limiter, async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {}
    if (!emailOk(email) || typeof password !== 'string' || password.length > 200) {
      return res.status(401).json({ error: 'Wrong email or password' })
    }
    const { rows } = await query('SELECT id, email, password_hash FROM users WHERE email = $1', [email.trim().toLowerCase()])
    const user = rows[0]
    const ok = await verifyPassword(password, user ? user.password_hash : DUMMY_HASH)
    if (!user || !ok) return res.status(401).json({ error: 'Wrong email or password' })
    startSession(res, user)
    res.json({ user: { id: user.id, email: user.email } })
  } catch (err) { next(err) }
})

router.post('/logout', (_req, res) => {
  res.clearCookie('sid', { ...cookieOptions, maxAge: undefined })
  res.json({ ok: true })
})

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }))

export default router
