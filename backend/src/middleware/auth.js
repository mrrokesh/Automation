import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { query } from '../db.js'

// The signed-in user with their workspace. Platform admins keep access even if their workspace is suspended.
const SELECT = `SELECT u.id, u.email, u.role, u.name, u.phone, u.company, u.disabled, u.is_platform_admin, u.workspace_id,
                       w.name AS workspace_name, w.slug AS workspace_slug, w.status AS workspace_status
                  FROM users u JOIN workspaces w ON w.id = u.workspace_id WHERE u.id = $1`

// Resolves the signed-in user (or null) from the session cookie. Deleted, disabled and suspended-workspace
// accounts are treated as signed out.
export async function currentUser(req) {
  const token = req.cookies?.sid
  if (!token) return null
  try {
    const { sub } = jwt.verify(token, config.jwtSecret)
    const { rows } = await query(SELECT, [sub])
    const u = rows[0]
    if (!u || u.disabled) return null
    if (u.workspace_status !== 'active' && !u.is_platform_admin) return null
    return u
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

// Workspace admin portal: owners and admins of the user's own workspace. The browser hides the menu too,
// but this is the real check.
export function requireAdmin(req, res, next) {
  if (req.user && (req.user.role === 'owner' || req.user.role === 'admin')) return next()
  res.status(403).json({ error: 'Admin only' })
}

// Platform portal: only users flagged as platform admins.
export function requirePlatformAdmin(req, res, next) {
  if (req.user?.is_platform_admin) return next()
  res.status(403).json({ error: 'Platform admin only' })
}

// Workspace API calls must come from this site. Public endpoints (forms, status, webhooks) are exempt.
export function sameOrigin(req, res, next) {
  const open = req.path.startsWith('/public/') || req.path === '/status' || req.path === '/health'
  const origin = req.headers.origin
  if (open || !origin) return next()
  try { if (new URL(origin).host === req.host) return next() } catch { /* fall through */ }
  res.status(403).json({ error: 'Cross-origin blocked' })
}
