import { Router } from 'express'
import { pool, query } from '../db.js'
import { config } from '../config.js'
import { hashPassword } from '../password.js'
import { requireAuth, requirePlatformAdmin } from '../middleware/auth.js'
import { audit } from '../services/audit.js'
import { newInboundKey, uniqueSlug } from '../services/workspaces.js'
import { agentProvider, clip, emailLive, emailRe, razorpayLive, resendSend, twilioLive } from '../services/providers.js'

// The platform portal: platform admins run every workspace, plus the public "Book a demo" and Support queues.
// Mounted at /api/platform.
const router = Router()
router.use(requireAuth, requirePlatformAdmin)
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next)
const pwOk = (p) => typeof p === 'string' && p.length >= 10 && p.length <= 200
const idOk = (s) => /^\d{1,18}$/.test(String(s))
const page = (req) => ({ limit: Math.min(Math.max(+req.query.limit || 50, 1), 200), offset: Math.max(+req.query.offset || 0, 0) })

// ---------- Overview ----------
router.get('/overview', wrap(async (_req, res) => {
  const n = async (sql) => Number((await query(sql)).rows[0].n)
  const days = (table, extra = '', col = 'at') => query(
    `SELECT to_char(d::date, 'YYYY-MM-DD') AS day, count(t.*)::int AS n
       FROM generate_series(current_date - 6, current_date, '1 day') d
       LEFT JOIN ${table} t ON t.${col}::date = d::date ${extra} GROUP BY d ORDER BY d`)
  const [workspaces, active, users, admins, newDemos, openTickets] = await Promise.all([
    n('SELECT count(*) AS n FROM workspaces'), n("SELECT count(*) AS n FROM workspaces WHERE status = 'active'"),
    n('SELECT count(*) AS n FROM users'), n('SELECT count(*) AS n FROM users WHERE is_platform_admin'),
    n("SELECT count(*) AS n FROM demo_requests WHERE status = 'new'"), n("SELECT count(*) AS n FROM support_tickets WHERE status <> 'resolved'"),
  ])
  const [logins, demos, tickets, signups] = await Promise.all([
    days('audit_log', "AND t.action = 'login'"), days('demo_requests'), days('support_tickets'), days('workspaces', '', 'created_at'),
  ])
  res.json({
    counts: { workspaces, activeWorkspaces: active, suspendedWorkspaces: workspaces - active, users, platformAdmins: admins, newDemoRequests: newDemos, openTickets },
    activity: { logins: logins.rows, demoRequests: demos.rows, tickets: tickets.rows, workspaces: signups.rows },
    providers: { twilio: twilioLive(), email: emailLive(), razorpay: razorpayLive(), ai: agentProvider() || null },
  })
}))

// ---------- Workspaces ----------
const wsRow = (w) => ({
  id: String(w.id), name: w.name, slug: w.slug, status: w.status, createdAt: w.created_at,
  users: Number(w.users), contacts: Number(w.contacts), lastLoginAt: w.last_login_at,
})
const LIST = `SELECT w.id, w.name, w.slug, w.status, w.created_at,
                     (SELECT count(*) FROM users u WHERE u.workspace_id = w.id) AS users,
                     (SELECT coalesce(jsonb_array_length(s.data->'contacts'), 0) FROM workspace_state s WHERE s.workspace_id = w.id) AS contacts,
                     (SELECT max(u.last_login_at) FROM users u WHERE u.workspace_id = w.id) AS last_login_at
                FROM workspaces w`

router.get('/workspaces', wrap(async (_req, res) => {
  const { rows } = await query(`${LIST} ORDER BY w.id`)
  res.json({ workspaces: rows.map((w) => wsRow({ ...w, contacts: w.contacts ?? 0 })) })
}))

router.post('/workspaces', wrap(async (req, res) => {
  const { name, ownerEmail, ownerPassword, ownerName = '' } = req.body ?? {}
  const wsName = clip(name, 60).trim()
  if (!wsName) return res.status(400).json({ error: 'Give the workspace a name' })
  if (typeof ownerEmail !== 'string' || !emailRe.test(ownerEmail) || !pwOk(ownerPassword)) return res.status(400).json({ error: 'Enter the owner email and a temporary password of 10 to 200 characters' })
  const hash = await hashPassword(ownerPassword)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const taken = await client.query('SELECT 1 FROM users WHERE email = $1', [ownerEmail.trim().toLowerCase()])
    if (taken.rowCount) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'That email already has an account' }) }
    const ws = (await client.query('INSERT INTO workspaces (name, slug, inbound_key) VALUES ($1, $2, $3) RETURNING id, name, slug, status, created_at',
      [wsName, await uniqueSlug(wsName, client), newInboundKey()])).rows[0]
    await client.query("INSERT INTO users (email, password_hash, role, name, workspace_id) VALUES ($1, $2, 'owner', $3, $4)", [ownerEmail.trim().toLowerCase(), hash, clip(ownerName, 80), ws.id])
    await client.query('COMMIT')
    await audit(req.user.email, 'workspace.created', ws.slug, `owner ${ownerEmail.trim().toLowerCase()}`, ws.id)
    res.status(201).json({ workspace: wsRow({ ...ws, users: 1, contacts: 0 }) })
  } catch (err) { await client.query('ROLLBACK').catch(() => {}); throw err } finally { client.release() }
}))

async function workspaceOf(req, res) {
  if (!idOk(req.params.id)) { res.status(404).json({ error: 'Not found' }); return null }
  const { rows } = await query('SELECT id, name, slug, status FROM workspaces WHERE id = $1', [req.params.id])
  if (!rows[0]) { res.status(404).json({ error: 'Not found' }); return null }
  return rows[0]
}

router.get('/workspaces/:id', wrap(async (req, res) => {
  const w = await workspaceOf(req, res); if (!w) return
  const users = (await query('SELECT id, email, name, role, disabled, is_platform_admin, created_at, last_login_at FROM users WHERE workspace_id = $1 ORDER BY id', [w.id])).rows
  const key = (await query('SELECT inbound_key FROM workspaces WHERE id = $1', [w.id])).rows[0].inbound_key
  res.json({
    workspace: { id: String(w.id), name: w.name, slug: w.slug, status: w.status, inboundKey: key, own: String(w.id) === String(req.user.workspace_id) },
    users: users.map((u) => ({ id: String(u.id), email: u.email, name: u.name, role: u.role, disabled: u.disabled, isPlatformAdmin: u.is_platform_admin, createdAt: u.created_at, lastLoginAt: u.last_login_at })),
  })
}))

router.patch('/workspaces/:id', wrap(async (req, res) => {
  const w = await workspaceOf(req, res); if (!w) return
  const b = req.body ?? {}, sets = [], vals = [], notes = []
  if (b.name !== undefined) { const nm = clip(b.name, 60).trim(); if (!nm) return res.status(400).json({ error: 'Name cannot be empty' }); vals.push(nm); sets.push(`name = $${vals.length}`); notes.push(`name ${nm}`) }
  if (b.status !== undefined) {
    if (!['active', 'suspended'].includes(b.status)) return res.status(400).json({ error: 'Invalid status' })
    if (b.status === 'suspended' && String(w.id) === String(req.user.workspace_id)) return res.status(403).json({ error: 'You cannot suspend your own workspace' })
    vals.push(b.status); sets.push(`status = $${vals.length}`); notes.push(b.status)
  }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to change' })
  vals.push(w.id)
  await query(`UPDATE workspaces SET ${sets.join(', ')} WHERE id = $${vals.length}`, vals)
  await audit(req.user.email, 'workspace.updated', w.slug, notes.join(', '), w.id)
  res.json({ ok: true })
}))

// A new secret for the workspace's inbound contact webhook. The old one stops working at once.
router.post('/workspaces/:id/rotate-key', wrap(async (req, res) => {
  const w = await workspaceOf(req, res); if (!w) return
  await query('UPDATE workspaces SET inbound_key = $1 WHERE id = $2', [newInboundKey(), w.id])
  await audit(req.user.email, 'workspace.key_rotated', w.slug, '', w.id)
  res.json({ ok: true })
}))

// Permanently deletes the workspace and everything in it. The caller must type the slug, and cannot delete their own workspace.
router.delete('/workspaces/:id', wrap(async (req, res) => {
  const w = await workspaceOf(req, res); if (!w) return
  if (String(w.id) === String(req.user.workspace_id)) return res.status(403).json({ error: 'You cannot delete your own workspace' })
  if (req.body?.confirm !== w.slug) return res.status(400).json({ error: 'Type the workspace address to confirm' })
  await query('DELETE FROM workspaces WHERE id = $1', [w.id])
  await audit(req.user.email, 'workspace.deleted', w.slug, w.name, null) // platform-level, so it outlives the workspace
  res.json({ ok: true })
}))

// Platform admins can set a temporary password for any user in any workspace (owners included).
router.post('/users/:id/reset-password', wrap(async (req, res) => {
  if (!idOk(req.params.id)) return res.status(404).json({ error: 'Not found' })
  if (!pwOk(req.body?.password)) return res.status(400).json({ error: 'Password must be 10 to 200 characters' })
  const { rows } = await query('SELECT id, email, workspace_id FROM users WHERE id = $1', [req.params.id])
  const t = rows[0]; if (!t) return res.status(404).json({ error: 'Not found' })
  if (String(t.id) === String(req.user.id)) return res.status(403).json({ error: 'Use Forgot password for your own account' })
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [await hashPassword(req.body.password), t.id])
  await audit(req.user.email, 'user.password_reset', t.email, 'by platform', t.workspace_id)
  res.json({ ok: true })
}))

// Grants or removes platform admin on a user. Not on yourself, so at least one platform admin always remains.
router.patch('/users/:id/platform-admin', wrap(async (req, res) => {
  if (!idOk(req.params.id)) return res.status(404).json({ error: 'Not found' })
  if (typeof req.body?.isPlatformAdmin !== 'boolean') return res.status(400).json({ error: 'isPlatformAdmin must be true or false' })
  if (String(req.params.id) === String(req.user.id)) return res.status(403).json({ error: 'You cannot change your own platform access' })
  const { rows } = await query('UPDATE users SET is_platform_admin = $1 WHERE id = $2 RETURNING email, workspace_id', [req.body.isPlatformAdmin, req.params.id])
  if (!rows[0]) return res.status(404).json({ error: 'Not found' })
  await audit(req.user.email, req.body.isPlatformAdmin ? 'platform.granted' : 'platform.revoked', rows[0].email, '', rows[0].workspace_id)
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

// ---------- Audit log across all workspaces ----------
router.get('/audit', wrap(async (req, res) => {
  const { limit, offset } = page(req)
  const action = typeof req.query.action === 'string' && /^[a-z._]{1,40}$/.test(req.query.action) ? req.query.action : null
  const ws = idOk(req.query.workspace) ? req.query.workspace : null
  const { rows } = await query(
    `SELECT a.id, a.at, a.actor, a.action, a.target, a.detail, w.name AS workspace FROM audit_log a LEFT JOIN workspaces w ON w.id = a.workspace_id
      WHERE ($1::text IS NULL OR a.action = $1) AND ($2::bigint IS NULL OR a.workspace_id = $2) ORDER BY a.id DESC LIMIT $3 OFFSET $4`, [action, ws, limit, offset])
  const total = Number((await query('SELECT count(*) AS n FROM audit_log WHERE ($1::text IS NULL OR action = $1) AND ($2::bigint IS NULL OR workspace_id = $2)', [action, ws])).rows[0].n)
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
