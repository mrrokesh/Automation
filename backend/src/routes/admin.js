import { Router } from 'express'
import { query } from '../db.js'
import { hashPassword } from '../password.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { audit } from '../services/audit.js'
import { agentProvider, clip, emailLive, emailRe, razorpayLive, twilioLive } from '../services/providers.js'

// The workspace admin portal for owners and admins. Everything is limited to the caller's own workspace;
// platform-wide things (all workspaces, demo requests, support tickets, system) live in routes/platform.js.
// Mounted at /api/admin.
const router = Router()
router.use(requireAuth, requireAdmin)
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next)
const isOwner = (u) => u.role === 'owner'
const pwOk = (p) => typeof p === 'string' && p.length >= 10 && p.length <= 200
const idOk = (s) => /^\d{1,18}$/.test(String(s))
const page = (req) => ({ limit: Math.min(Math.max(+req.query.limit || 50, 1), 200), offset: Math.max(+req.query.offset || 0, 0) })

const userRow = (u) => ({ id: String(u.id), email: u.email, name: u.name, role: u.role, disabled: u.disabled, createdAt: u.created_at, lastLoginAt: u.last_login_at })

// ---------- Overview ----------
router.get('/overview', wrap(async (req, res) => {
  const ws = req.user.workspace_id
  const n = async (sql) => Number((await query(sql, [ws])).rows[0].n)
  const [users, active, forms, subs, inbox, leads, contacts] = await Promise.all([
    n('SELECT count(*) AS n FROM users WHERE workspace_id = $1'), n('SELECT count(*) AS n FROM users WHERE workspace_id = $1 AND NOT disabled'),
    n('SELECT count(*) AS n FROM forms WHERE workspace_id = $1'),
    n('SELECT count(*) AS n FROM submissions s JOIN forms f ON f.id = s.form_id WHERE f.workspace_id = $1'),
    n('SELECT count(*) AS n FROM inbox WHERE workspace_id = $1'), n('SELECT count(*) AS n FROM leads WHERE workspace_id = $1'),
    n("SELECT coalesce(jsonb_array_length(data->'contacts'), 0) AS n FROM workspace_state WHERE workspace_id = $1").catch(() => 0),
  ])
  const logins = await query(
    `SELECT to_char(d::date, 'YYYY-MM-DD') AS day, count(t.*)::int AS n
       FROM generate_series(current_date - 6, current_date, '1 day') d
       LEFT JOIN audit_log t ON t.at::date = d::date AND t.action = 'login' AND t.workspace_id = $1 GROUP BY d ORDER BY d`, [ws])
  res.json({
    counts: { users, activeUsers: active, forms, submissions: subs, inboxMessages: inbox, pendingLeads: leads, contacts },
    activity: { logins: logins.rows },
    providers: { twilio: twilioLive(), email: emailLive(), razorpay: razorpayLive(), ai: agentProvider() || null },
  })
}))

// ---------- Users of this workspace ----------
router.get('/users', wrap(async (req, res) => {
  const { rows } = await query('SELECT id, email, name, role, disabled, created_at, last_login_at FROM users WHERE workspace_id = $1 ORDER BY id', [req.user.workspace_id])
  res.json({ users: rows.map(userRow) })
}))

// Who may be changed here: someone in this workspace, never an owner or a platform admin, never yourself,
// and only the owner may change an admin.
async function target(req, res) {
  if (!idOk(req.params.id)) { res.status(404).json({ error: 'Not found' }); return null }
  const { rows } = await query('SELECT id, email, name, role, disabled, is_platform_admin FROM users WHERE id = $1 AND workspace_id = $2', [req.params.id, req.user.workspace_id])
  const t = rows[0]
  if (!t) { res.status(404).json({ error: 'Not found' }); return null }
  if (String(t.id) === String(req.user.id)) { res.status(403).json({ error: 'You cannot change your own account here' }); return null }
  if (t.role === 'owner') { res.status(403).json({ error: 'The owner account cannot be changed' }); return null }
  if (t.is_platform_admin) { res.status(403).json({ error: 'Platform admins are managed by the platform' }); return null }
  if (t.role === 'admin' && !isOwner(req.user)) { res.status(403).json({ error: 'Only the owner can change an admin' }); return null }
  return t
}

router.post('/users', wrap(async (req, res) => {
  const { email, password, role = 'member', name = '' } = req.body ?? {}
  if (typeof email !== 'string' || !emailRe.test(email) || !pwOk(password)) return res.status(400).json({ error: 'Enter a valid email and a password of 10 to 200 characters' })
  if (!['member', 'admin'].includes(role)) return res.status(400).json({ error: 'Role must be member or admin' })
  if (role === 'admin' && !isOwner(req.user)) return res.status(403).json({ error: 'Only the owner can create an admin' })
  const { rowCount } = await query('INSERT INTO users (email, password_hash, role, name, workspace_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING',
    [email.trim().toLowerCase(), await hashPassword(password), role, clip(name, 80), req.user.workspace_id])
  if (!rowCount) return res.status(409).json({ error: 'Already exists' })
  await audit(req.user.email, 'user.invited', email.trim().toLowerCase(), `role ${role}`, req.user.workspace_id)
  res.json({ ok: true })
}))

router.patch('/users/:id', wrap(async (req, res) => {
  const t = await target(req, res); if (!t) return
  const b = req.body ?? {}, sets = [], vals = [], notes = []
  if (b.role !== undefined) {
    if (!isOwner(req.user)) return res.status(403).json({ error: 'Only the owner can change roles' })
    if (!['member', 'admin'].includes(b.role)) return res.status(400).json({ error: 'Role must be member or admin' })
    vals.push(b.role); sets.push(`role = $${vals.length}`); notes.push(`role ${t.role} -> ${b.role}`)
  }
  if (b.disabled !== undefined) { vals.push(!!b.disabled); sets.push(`disabled = $${vals.length}`); notes.push(b.disabled ? 'disabled' : 'enabled') }
  if (b.name !== undefined) { vals.push(clip(b.name, 80)); sets.push(`name = $${vals.length}`) }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to change' })
  vals.push(t.id)
  await query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${vals.length}`, vals)
  await audit(req.user.email, 'user.updated', t.email, notes.join(', '), req.user.workspace_id)
  res.json({ ok: true })
}))

// Sets a temporary password. The owner shares it privately; the person can reset it again from the login page.
router.post('/users/:id/reset-password', wrap(async (req, res) => {
  const t = await target(req, res); if (!t) return
  if (!pwOk(req.body?.password)) return res.status(400).json({ error: 'Password must be 10 to 200 characters' })
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [await hashPassword(req.body.password), t.id])
  await audit(req.user.email, 'user.password_reset', t.email, '', req.user.workspace_id)
  res.json({ ok: true })
}))

router.delete('/users/:id', wrap(async (req, res) => {
  const t = await target(req, res); if (!t) return
  await query('DELETE FROM users WHERE id = $1', [t.id])
  await audit(req.user.email, 'user.deleted', t.email, '', req.user.workspace_id)
  res.json({ ok: true })
}))

// ---------- Audit log of this workspace ----------
router.get('/audit', wrap(async (req, res) => {
  const { limit, offset } = page(req)
  const ws = req.user.workspace_id
  const action = typeof req.query.action === 'string' && /^[a-z._]{1,40}$/.test(req.query.action) ? req.query.action : null
  const { rows } = await query('SELECT id, at, actor, action, target, detail FROM audit_log WHERE workspace_id = $1 AND ($2::text IS NULL OR action = $2) ORDER BY id DESC LIMIT $3 OFFSET $4', [ws, action, limit, offset])
  const total = Number((await query('SELECT count(*) AS n FROM audit_log WHERE workspace_id = $1 AND ($2::text IS NULL OR action = $2)', [ws, action])).rows[0].n)
  res.json({ entries: rows.map((r) => ({ ...r, id: String(r.id) })), total })
}))

export default router
