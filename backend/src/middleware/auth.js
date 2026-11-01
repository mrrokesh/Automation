import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { query } from '../db.js'

const COLS = 'id, email, role, name, phone, company'

// Resolves the signed-in user (or null) from the session cookie. A token for a deleted user is treated as signed out.
export async function currentUser(req) {
  const token = req.cookies?.sid
  if (!token) return null
  try {
    const { sub } = jwt.verify(token, config.jwtSecret)
    const { rows } = await query(`SELECT ${COLS} FROM users WHERE id = $1`, [sub])
    return rows[0] || null
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') return null
    throw err
  }
}

export async function requireAuth(req, res, next) {
  try {
    const user = await currentUser(req)
    if (!user) return res.status(401).json({ error: 'Sign in required' })
    req.user = user
    next()
  } catch (err) { next(err) }
}

// Workspace API calls must come from this site. Public endpoints (forms, status, webhooks) are exempt.
export function sameOrigin(req, res, next) {
  const open = req.path.startsWith('/public/') || req.path === '/status' || req.path === '/health'
  const origin = req.headers.origin
  if (open || !origin) return next()
  try { if (new URL(origin).host === req.host) return next() } catch { /* fall through */ }
  res.status(403).json({ error: 'Cross-origin blocked' })
}
