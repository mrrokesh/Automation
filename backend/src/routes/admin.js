import { Router } from 'express'
import { query } from '../db.js'
import { config } from '../config.js'
import { hashPassword } from '../password.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { audit } from '../services/audit.js'
import { agentProvider, clip, emailLive, emailRe, razorpayLive, resendSend, twilioLive } from '../services/providers.js'

// Everything here needs a signed-in owner or admin. Mounted at /api/admin.
const router = Router()
router.use(requireAuth, requireAdmin)
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next)
const isOwner = (u) => u.role === 'owner'
const pwOk = (p) => typeof p === 'string' && p.length >= 10 && p.length <= 200
const idOk = (s) => /^\d{1,18}$/.test(String(s))
const page = (req) => ({ limit: Math.min(Math.max(+req.query.limit || 50, 1), 200), offset: Math.max(+req.query.offset || 0, 0) })

const userRow = (u) => ({ id: String(u.id), email: u.email, name: u.name, role: u.role, disabled: u.disabled, createdAt: u.created_at, lastLoginAt: u.last_login_at })

// ---------- Overview ----------
router.get('/overview', wrap(async (_req, res) => {
  const n = async (sql) => Number((await query(sql)).rows[0].n)
  const days = (table, col = 'at', extra = '') => query(
    `SELECT to_char(d::date, 'YYYY-MM-DD') AS day, count(t.*)::int AS n
       FROM generate_series(current_date - 6, current_date, '1 day') d
       LEFT JOIN ${table} t ON t.${col}::date = d::date ${extra} GROUP BY d ORDER BY d`)
  const [users, active, newDemos, openTickets, forms, subs, inbox, leads, contacts] = await Promise.all([
    n('SELECT count(*) AS n FROM users'), n('SELECT count(*) AS n FROM users WHERE NOT disabled'),
    n("SELECT count(*) AS n FROM demo_requests WHERE status = 'new'"), n("SELECT count(*) AS n FROM support_tickets WHERE status <> 'resolved'"),
    n('SELECT count(*) AS n FROM forms'), n('SELECT count(*) AS n FROM submissions'), n('SELECT count(*) AS n FROM inbox'),
    n('SELECT count(*) AS n FROM leads'),
    n("SELECT coalesce(jsonb_array_length(data->'contacts'), 0) AS n FROM workspace_state WHERE id = 1").catch(() => 0),
  ])
  const [logins, demos, tickets] = await Promise.all([
    days('audit_log', 'at', "AND t.action = 'login'"), days('demo_requests'), days('support_tickets'),
  ])
  res.json({
    counts: { users, activeUsers: active, newDemoRequests: newDemos, openTickets, forms, submissions: subs, inboxMessages: inbox, pendingLeads: leads, contacts },
    activity: { logins: logins.rows, demoRequests: demos.rows, tickets: tickets.rows },
    providers: { twilio: twilioLive(), email: emailLive(), razorpay: razorpayLive(), ai: agentProvider() || null },
  })
}))

// ---------- Users ----------
router.get('/users', wrap(async (_req, res) => {
  const { rows } = await query('SELECT id, email, name, role, disabled, created_at, last_login_at FROM users ORDER BY id')
  res.json({ users: rows.map(userRow) })
}))

// Who may be changed through the portal: never an owner, and only the owner may change an admin.
async function target(req, res) {
  if (!idOk(req.params.id)) { res.status(404).json({ error: 'Not found' }); return null }
  const { rows } = await query('SELECT id, email, name, role, disabled FROM users WHERE id = $1', [req.params.id])
  const t = rows[0]
  if (!t) { res.status(404).json({ error: 'Not found' }); return null }
  if (String(t.id) === String(req.user.id)) { res.status(403).json({ error: 'You cannot change your own account here' }); return null }
  if (t.role === 'owner') { res.status(403).json({ error: 'The owner account cannot be changed' }); return null }
  if (t.role === 'admin' && !isOwner(req.user)) { res.status(403).json({ error: 'Only the owner can change an admin' }); return null }
  return t
}

router.post('/users', wrap(async (req, res) => {
  const { email, password, role = 'member', name = '' } = req.body ?? {}
  if (typeof email !== 'string' || !emailRe.test(email) || !pwOk(password)) return res.status(400).json({ error: 'Enter a valid email and a password of 10 to 200 characters' })
  if (!['member', 'admin'].includes(role)) return res.status(400).json({ error: 'Role must be member or admin' })
  if (role === 'admin' && !isOwner(req.user)) return res.status(403).json({ error: 'Only the owner can create an admin' })
  const { rowCount } = await query('INSERT INTO users (email, password_hash, role, name) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING',
    [email.trim().toLowerCase(), await hashPassword(password), role, clip(name, 80)])
  if (!rowCount) return res.status(409).json({ error: 'Already exists' })
  await audit(req.user.email, 'user.invited', email.trim().toLowerCase(), `role ${role}`)
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
  await audit(req.user.email, 'user.updated', t.email, notes.join(', '))
  res.json({ ok: true })
}))

// Sets a temporary password. The owner shares it privately; the person can reset it again from the login page.
router.post('/users/:id/reset-password', wrap(async (req, res) => {
  const t = await target(req, res); if (!t) return
  if (!pwOk(req.body?.password)) return res.status(400).json({ error: 'Password must be 10 to 200 characters' })
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [await hashPassword(req.body.password), t.id])
  await audit(req.user.email, 'user.password_reset', t.email)
  res.json({ ok: true })
}))

router.delete('/users/:id', wrap(async (req, res) => {
  const t = await target(req, res); if (!t) return
  await query('DELETE FROM users WHERE id = $1', [t.id])
  await audit(req.user.email, 'user.deleted', t.email)
  res.json({ ok: true })
}))

// ---------- Demo requests ----------
const DEMO_STATUS = ['new', 'contacted', 'closed']
router.get('/demo-requests', wrap(async (req, res) => {
  const { limit, offset } = page(req)
  const status = DEMO_STATUS.includes(req.query.status) ? req.query.status : null
  const { rows } = await query(
    `SELECT id, at, name, email, phone, company, employees, interest, status, note FROM demo_requests
      WHERE ($1::text IS NULL OR status = $1) ORDER BY at DESC, id DESC LIMIT $2 OFFSET $3`, [status, limit, offset])
  const total = Number((await query('SELECT count(*) AS n FROM demo_requests WHERE ($1::text IS NULL OR status = $1)', [status])).rows[0].n)
  res.json({ requests: rows.map((r) => ({ ...r, id: String(r.id) })), total })
}))

router.patch('/demo-requests/:id', wrap(async (req, res) => {
  if (!idOk(req.params.id)) return res.status(404).json({ error: 'Not found' })
  const b = req.body ?? {}, sets = [], vals = []
  if (b.status !== undefined) { if (!DEMO_STATUS.includes(b.status)) return res.status(400).json({ error: 'Invalid status' }); vals.push(b.status); sets.push(`status = $${vals.length}`) }
  if (b.note !== undefined) { vals.push(clip(b.note, 1000)); sets.push(`note = $${vals.length}`) }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to change' })
  vals.push(req.params.id)
  const { rowCount, rows } = await query(`UPDATE demo_requests SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING email`, vals)
  if (!rowCount) return res.status(404).json({ error: 'Not found' })
  await audit(req.user.email, 'demo.updated', rows[0].email, [b.status && `status ${b.status}`, b.note !== undefined && 'note edited'].filter(Boolean).join(', '))
  res.json({ ok: true })
}))

router.delete('/demo-requests/:id', wrap(async (req, res) => {
  if (!idOk(req.params.id)) return res.status(404).json({ error: 'Not found' })
  const { rows } = await query('DELETE FROM demo_requests WHERE id = $1 RETURNING email', [req.params.id])
  if (rows.length) await audit(req.user.email, 'demo.deleted', rows[0].email)
  res.json({ ok: true })
}))

// ---------- Support tickets ----------
const T_STATUS = ['open', 'pending', 'resolved'], T_PRIORITY = ['low', 'normal', 'high']
router.get('/tickets', wrap(async (req, res) => {
  const { limit, offset } = page(req)
  const status = T_STATUS.includes(req.query.status) ? req.query.status : null
  const { rows } = await query(
    `SELECT id, at, name, email, subject, message, status, priority, assignee, note, replied_at FROM support_tickets
      WHERE ($1::text IS NULL OR status = $1)
      ORDER BY (status = 'resolved'), CASE priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END, at DESC LIMIT $2 OFFSET $3`, [status, limit, offset])
  const total = Number((await query('SELECT count(*) AS n FROM support_tickets WHERE ($1::text IS NULL OR status = $1)', [status])).rows[0].n)
  res.json({ tickets: rows.map((r) => ({ ...r, id: String(r.id) })), total })
}))

router.patch('/tickets/:id', wrap(async (req, res) => {
  if (!idOk(req.params.id)) return res.status(404).json({ error: 'Not found' })
  const b = req.body ?? {}, sets = [], vals = [], notes = []
  if (b.status !== undefined) { if (!T_STATUS.includes(b.status)) return res.status(400).json({ error: 'Invalid status' }); vals.push(b.status); sets.push(`status = $${vals.length}`); notes.push(`status ${b.status}`) }
  if (b.priority !== undefined) { if (!T_PRIORITY.includes(b.priority)) return res.status(400).json({ error: 'Invalid priority' }); vals.push(b.priority); sets.push(`priority = $${vals.length}`); notes.push(`priority ${b.priority}`) }
  if (b.assignee !== undefined) { vals.push(clip(b.assignee, 120)); sets.push(`assignee = $${vals.length}`); notes.push(`assignee ${clip(b.assignee, 120) || 'none'}`) }
  if (b.note !== undefined) { vals.push(clip(b.note, 2000)); sets.push(`note = $${vals.length}`); notes.push('note edited') }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to change' })
  vals.push(req.params.id)
  const { rowCount, rows } = await query(`UPDATE support_tickets SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING id, email`, vals)
  if (!rowCount) return res.status(404).json({ error: 'Not found' })
  await audit(req.user.email, 'ticket.updated', `#${rows[0].id} ${rows[0].email}`, notes.join(', '))
  res.json({ ok: true })
}))

// Emails the customer through Resend. Without Resend the reply is recorded but not sent, and the response says so.
router.post('/tickets/:id/reply', wrap(async (req, res) => {
  if (!idOk(req.params.id)) return res.status(404).json({ error: 'Not found' })
  const message = clip(req.body?.message, 5000).trim()
  if (!message) return res.status(400).json({ error: 'Write a reply first' })
  const { rows } = await query('SELECT id, email, subject FROM support_tickets WHERE id = $1', [req.params.id])
  const t = rows[0]; if (!t) return res.status(404).json({ error: 'Not found' })
  let sent = 'simulated'
  if (emailLive()) {
    const { code, out } = await resendSend({ to: t.email, subject: `Re: ${t.subject}`, text: message })
    if (code !== 200) return res.status(502).json({ error: out.error || 'Email provider failed' })
    sent = 'sent'
  }
  await query("UPDATE support_tickets SET status = CASE WHEN status = 'resolved' THEN status ELSE 'pending' END, replied_at = now() WHERE id = $1", [t.id])
  await audit(req.user.email, 'ticket.replied', `#${t.id} ${t.email}`, sent)
  res.json({ ok: true, delivery: sent })
}))

router.delete('/tickets/:id', wrap(async (req, res) => {
  if (!idOk(req.params.id)) return res.status(404).json({ error: 'Not found' })
  const { rows } = await query('DELETE FROM support_tickets WHERE id = $1 RETURNING id, email', [req.params.id])
  if (rows.length) await audit(req.user.email, 'ticket.deleted', `#${rows[0].id} ${rows[0].email}`)
  res.json({ ok: true })
}))

// ---------- Audit log ----------
router.get('/audit', wrap(async (req, res) => {
  const { limit, offset } = page(req)
  const action = typeof req.query.action === 'string' && /^[a-z._]{1,40}$/.test(req.query.action) ? req.query.action : null
  const { rows } = await query('SELECT id, at, actor, action, target, detail FROM audit_log WHERE ($1::text IS NULL OR action = $1) ORDER BY id DESC LIMIT $2 OFFSET $3', [action, limit, offset])
  const total = Number((await query('SELECT count(*) AS n FROM audit_log WHERE ($1::text IS NULL OR action = $1)', [action])).rows[0].n)
  res.json({ entries: rows.map((r) => ({ ...r, id: String(r.id) })), total })
}))

// ---------- System (no secrets, only whether things are configured) ----------
router.get('/system', wrap(async (_req, res) => {
  const db = (await query('SELECT version() AS v, pg_database_size(current_database()) AS size')).rows[0]
  const migrations = await query('SELECT name FROM schema_migrations ORDER BY name').then((r) => r.rows.map((x) => x.name)).catch(() => [])
  res.json({
    node: process.version, uptimeSeconds: Math.round(process.uptime()), environment: config.production ? 'production' : 'development',
    database: { version: db.v.split(' ').slice(0, 2).join(' '), sizeBytes: Number(db.size), migrations },
    configured: {
      trustProxy: Boolean(process.env.TRUST_PROXY), publicUrl: Boolean(process.env.PUBLIC_URL), inboundWebhookKey: (process.env.INBOUND_KEY || '').length >= 16,
      twilio: twilioLive(), twilioWhatsapp: Boolean(process.env.TWILIO_WHATSAPP_FROM), twilioSms: Boolean(process.env.TWILIO_SMS_FROM),
      email: emailLive(), razorpay: razorpayLive(), aiProvider: agentProvider() || null,
    },
  })
}))

export default router
