import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { query } from '../db.js'

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.sid
    if (!token) return res.status(401).json({ error: 'Sign in required' })
    const { sub } = jwt.verify(token, config.jwtSecret)
    const { rows } = await query('SELECT id, email FROM users WHERE id = $1', [sub])
    if (!rows.length) return res.status(401).json({ error: 'Sign in required' })
    req.user = rows[0]
    next()
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Sign in required' })
    next(err)
  }
}
