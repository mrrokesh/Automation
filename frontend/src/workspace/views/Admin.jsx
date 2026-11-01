import { useCallback, useEffect, useState } from 'react'
import { api } from '../../api'
import { useWs } from '../context'
import { B, Card, In, Mut, Page, Pill, Row, Sel, Area, Table, Td, onForm, Submit } from '../ui'

const fmt = (d) => (d ? new Date(d).toLocaleString() : '—')
const ago = (d) => {
  if (!d) return 'never'
  const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000)
  if (s < 90) return 'just now'
  if (s < 5400) return `${Math.round(s / 60)} min ago`
  if (s < 129600) return `${Math.round(s / 3600)} h ago`
  return `${Math.round(s / 86400)} days ago`
}

// Loads data from an admin endpoint and reloads on demand. Errors are shown in the page instead of crashing it.
function useLoad(fn, deps = []) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(() => fn().then((d) => { setData(d); setError('') }).catch((e) => setError(e.message)), deps)
  useEffect(() => { load() }, [load])
  return [data, error, load]
}
const Wait = ({ title, error }) => <Page title={title}><Mut>{error || 'Loading…'}</Mut></Page>

// ---- Overview ----
function Bars({ rows, label }) {
  const max = Math.max(1, ...rows.map((r) => r.n))
  return (
    <Card>
      <p className="text-sm font-medium">{label}</p>
      <div className="mt-3 flex h-24 items-end gap-2" role="img" aria-label={`${label}: ${rows.map((r) => `${r.day} ${r.n}`).join(', ')}`}>
        {rows.map((r) => (
          <div key={r.day} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${r.day}: ${r.n}`}>
            <div className="w-full rounded-t bg-brand-500/70" style={{ height: `${Math.max(4, (r.n / max) * 100)}%` }} />
            <span className="text-[10px] opacity-60">{r.day.slice(8)}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function AdminOverview() {
  const [d, error] = useLoad(api.admin.overview)
  if (!d) return <Wait title="Admin overview" error={error} />
  const c = d.counts
  const tiles = [['Users', `${c.activeUsers}/${c.users}`, 'active / total'], ['New demo requests', c.newDemoRequests], ['Open tickets', c.openTickets], ['Contacts', c.contacts], ['Forms', c.forms], ['Form responses', c.submissions], ['Inbox messages', c.inboxMessages], ['Leads waiting', c.pendingLeads]]
  const p = d.providers
  const prov = [['WhatsApp / SMS (Twilio)', p.twilio], ['Email (Resend)', p.email], ['Payments (Razorpay)', p.razorpay], ['AI agent', p.ai]]
  return (
    <Page title="Admin overview">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        {tiles.map(([k, v, s]) => <Card key={k}><p className="text-sm opacity-70">{k}</p><div className="font-display text-3xl font-semibold">{v}</div>{s && <p className="text-xs opacity-55">{s}</p>}</Card>)}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Bars rows={d.activity.logins} label="Sign-ins, last 7 days" />
        <Bars rows={d.activity.demoRequests} label="Demo requests, last 7 days" />
        <Bars rows={d.activity.tickets} label="Support tickets, last 7 days" />
      </div>
      <Card><p className="mb-2 text-sm font-medium">Connected services</p>
        <Row>{prov.map(([k, v]) => <Pill key={k} className={v ? '!border-emerald-300 !bg-emerald-50 !text-emerald-800' : ''}>{k}: {v ? (typeof v === 'string' ? v : 'live') : 'simulated'}</Pill>)}</Row>
        <Mut>Add keys in backend/.env to switch a service from simulated to live.</Mut></Card>
    </Page>
  )
}

// ---- Users ----
export function AdminUsers() {
  const { me, toast } = useWs()
  const [d, error, load] = useLoad(api.admin.users)
  const [reset, setReset] = useState(null) // { id, email }
  const owner = me.role === 'owner'
  const act = (fn) => fn().then(load).catch((e) => toast(e.message))
  const invite = onForm((v, f) => act(() => api.admin.inviteUser(v)).then(() => f.reset()))
  const doReset = onForm((v) => api.admin.resetPassword(reset.id, v.password).then(() => { toast(`Temporary password set for ${reset.email}`); setReset(null) }).catch((e) => toast(e.message)))
  if (!d) return <Wait title="Users" error={error} />

  // The server enforces these rules too; hiding the buttons just keeps the screen honest.
  const canChange = (u) => String(u.id) !== String(me.id) && u.role !== 'owner' && (u.role !== 'admin' || owner)
  return (
    <Page title="Users" hint="Disabled users are signed out immediately and cannot log in. The owner account cannot be changed here. Only the owner can create admins or change roles.">
      <form onSubmit={invite}><Row>
        <In name="email" type="email" placeholder="Email" required w="w-56" /><In name="name" placeholder="Name (optional)" w="w-44" />
        <In name="password" type="password" minLength={10} placeholder="Temporary password (10+ chars)" required w="w-64" autoComplete="new-password" />
        <Sel name="role" w="w-32"><option value="member">Member</option>{owner && <option value="admin">Admin</option>}</Sel><Submit>Add user</Submit></Row></form>
      <Table head={['User', 'Role', 'Status', 'Last sign-in', 'Added', '']} rows={d.users.map((u) => (
        <tr key={u.id}>
          <Td><b>{u.email}</b>{u.name && <span className="block text-xs opacity-60">{u.name}</span>}</Td>
          <Td>{owner && canChange(u)
            ? <Sel w="w-28" value={u.role} aria-label={`Role of ${u.email}`} onChange={(e) => act(() => api.admin.updateUser(u.id, { role: e.target.value }))}><option value="member">Member</option><option value="admin">Admin</option></Sel>
            : <Pill>{u.role}</Pill>}</Td>
          <Td>{u.disabled ? <Pill className="!border-red-300 !bg-red-50 !text-red-700">Disabled</Pill> : <Pill className="!border-emerald-300 !bg-emerald-50 !text-emerald-800">Active</Pill>}</Td>
          <Td title={fmt(u.lastLoginAt)}>{ago(u.lastLoginAt)}</Td><Td>{fmt(u.createdAt).split(',')[0]}</Td>
          <Td>{canChange(u) && <Row>
            <B v="o" onClick={() => act(() => api.admin.updateUser(u.id, { disabled: !u.disabled }))}>{u.disabled ? 'Enable' : 'Disable'}</B>
            <B v="o" onClick={() => setReset({ id: u.id, email: u.email })}>Reset password</B>
            <B v="d" onClick={() => confirm(`Delete ${u.email}? This cannot be undone.`) && act(() => api.admin.deleteUser(u.id))}>Delete</B></Row>}</Td>
        </tr>))} />
      {reset && (
        <Card className="max-w-xl"><form onSubmit={doReset} className="space-y-2">
          <p className="font-medium">Set a temporary password for {reset.email}</p>
          <In name="password" type="password" minLength={10} required placeholder="At least 10 characters" w="w-72" autoComplete="new-password" />
          <Mut>Share it privately. They can pick a new one from the login page with Forgot password.</Mut>
          <Row><Submit>Set password</Submit><B v="o" onClick={() => setReset(null)}>Cancel</B></Row></form></Card>
      )}
    </Page>
  )
}

// ---- Demo requests ----
const STATUS_TABS = ['', 'new', 'contacted', 'closed']
export function AdminDemos() {
  const { toast } = useWs()
  const [tab, setTab] = useState('new')
  const [d, error, load] = useLoad(() => api.admin.demos(tab), [tab])
  const act = (fn) => fn().then(load).catch((e) => toast(e.message))
  if (!d) return <Wait title="Demo requests" error={error} />
  return (
    <Page title="Demo requests" hint='Everyone who used "Book a demo" on the website. They are also added to the workspace as contacts.'>
      <Row>{STATUS_TABS.map((t) => <B key={t || 'all'} v={tab === t ? 'p' : 'o'} onClick={() => setTab(t)}>{t || 'all'}</B>)}<span className="text-sm opacity-60">{d.total} shown</span></Row>
      <Table head={['When', 'Who', 'Company', 'Interest', 'Status', 'Note']} empty="No requests here." rows={d.requests.map((r) => (
        <tr key={r.id}>
          <Td>{fmt(r.at)}</Td>
          <Td><b>{r.name}</b><a href={`mailto:${r.email}`} className="block text-xs text-brand-600">{r.email}</a>{r.phone && <span className="block text-xs opacity-60">{r.phone}</span>}</Td>
          <Td>{r.company || '—'}{r.employees && <span className="block text-xs opacity-60">{r.employees} people</span>}</Td><Td>{r.interest || '—'}</Td>
          <Td><Sel w="w-32" value={r.status} aria-label={`Status of ${r.email}`} onChange={(e) => act(() => api.admin.updateDemo(r.id, { status: e.target.value }))}>{['new', 'contacted', 'closed'].map((s) => <option key={s}>{s}</option>)}</Sel></Td>
          <Td><NoteBox value={r.note} onSave={(note) => act(() => api.admin.updateDemo(r.id, { note }))} /><B v="d" className="mt-1" onClick={() => confirm('Delete this request?') && act(() => api.admin.deleteDemo(r.id))}>Delete</B></Td>
        </tr>))} />
    </Page>
  )
}
function NoteBox({ value, onSave }) {
  const [v, setV] = useState(value)
  return <In value={v} w="w-56" placeholder="Add a note" aria-label="Note" onChange={(e) => setV(e.target.value)} onBlur={() => v !== value && onSave(v)} />
}

// ---- Support tickets ----
export function AdminTickets() {
  const { toast, me } = useWs()
  const [tab, setTab] = useState('')
  const [d, error, load] = useLoad(() => api.admin.tickets(tab), [tab])
  const [open, setOpen] = useState(null)
  const act = (fn) => fn().then(load).catch((e) => toast(e.message))
  const reply = onForm((v, f) => api.admin.replyTicket(open, v.message).then((r) => { toast(r.delivery === 'sent' ? 'Reply emailed' : 'Reply saved. Email is not configured, so nothing was sent'); f.reset(); load() }).catch((e) => toast(e.message)))
  if (!d) return <Wait title="Support tickets" error={error} />
  const prioCls = { high: '!border-red-300 !bg-red-50 !text-red-700', low: 'opacity-70' }
  return (
    <Page title="Support tickets" hint="Requests from the public Support page. Replies are emailed when Resend is configured in backend/.env.">
      <Row>{['', 'open', 'pending', 'resolved'].map((t) => <B key={t || 'all'} v={tab === t ? 'p' : 'o'} onClick={() => setTab(t)}>{t || 'all'}</B>)}<span className="text-sm opacity-60">{d.total} shown</span></Row>
      <div className="space-y-3">
        {d.tickets.length === 0 && <Mut>No tickets here.</Mut>}
        {d.tickets.map((t) => (
          <Card key={t.id} className="space-y-2">
            <div className="flex flex-wrap items-center gap-2"><b className="font-display text-lg">#{t.id} {t.subject}</b><Pill>{t.status}</Pill><Pill className={prioCls[t.priority] || ''}>{t.priority}</Pill></div>
            <p className="text-xs opacity-65">{t.name || 'Unnamed'} · <a href={`mailto:${t.email}`} className="text-brand-600">{t.email}</a> · {fmt(t.at)}{t.replied_at && ` · replied ${ago(t.replied_at)}`}</p>
            <p className="whitespace-pre-wrap">{t.message}</p>
            <Row>
              <Sel w="w-32" value={t.status} aria-label="Status" onChange={(e) => act(() => api.admin.updateTicket(t.id, { status: e.target.value }))}>{['open', 'pending', 'resolved'].map((s) => <option key={s}>{s}</option>)}</Sel>
              <Sel w="w-28" value={t.priority} aria-label="Priority" onChange={(e) => act(() => api.admin.updateTicket(t.id, { priority: e.target.value }))}>{['low', 'normal', 'high'].map((s) => <option key={s}>{s}</option>)}</Sel>
              <B v="o" onClick={() => act(() => api.admin.updateTicket(t.id, { assignee: t.assignee ? '' : me.email }))}>{t.assignee ? `Assigned: ${t.assignee} (clear)` : 'Assign to me'}</B>
              <NoteBox value={t.note} onSave={(note) => act(() => api.admin.updateTicket(t.id, { note }))} />
              <B v="o" onClick={() => setOpen(open === t.id ? null : t.id)}>{open === t.id ? 'Close reply' : 'Reply'}</B>
              <B v="d" onClick={() => confirm('Delete this ticket?') && act(() => api.admin.deleteTicket(t.id))}>Delete</B>
            </Row>
            {open === t.id && <form onSubmit={reply} className="space-y-2"><Area name="message" rows={4} required placeholder={`Reply to ${t.email}`} aria-label="Reply" /><Submit>Send reply</Submit></form>}
          </Card>
        ))}
      </div>
    </Page>
  )
}

// ---- Audit log ----
export function AdminAudit() {
  const [offset, setOffset] = useState(0)
  const [action, setAction] = useState('')
  const [d, error] = useLoad(() => api.admin.audit(offset, action), [offset, action])
  if (!d) return <Wait title="Audit log" error={error} />
  const actions = ['', 'login', 'login.failed', 'login.blocked', 'user.invited', 'user.updated', 'user.password_reset', 'user.deleted', 'demo.updated', 'ticket.updated', 'ticket.replied']
  return (
    <Page title="Audit log" hint="Sign-ins and admin actions, newest first. Passwords are never recorded.">
      <Row><Sel w="w-52" value={action} aria-label="Filter by action" onChange={(e) => { setOffset(0); setAction(e.target.value) }}>{actions.map((a) => <option key={a} value={a}>{a || 'All actions'}</option>)}</Sel>
        <B v="o" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))}>Newer</B><B v="o" disabled={offset + 50 >= d.total} onClick={() => setOffset(offset + 50)}>Older</B>
        <span className="text-sm opacity-60">{d.total} entries</span></Row>
      <Table head={['When', 'Who', 'Action', 'Target', 'Detail']} empty="Nothing logged yet." rows={d.entries.map((e) => <tr key={e.id}><Td>{fmt(e.at)}</Td><Td>{e.actor || '—'}</Td><Td><Pill>{e.action}</Pill></Td><Td>{e.target}</Td><Td>{e.detail}</Td></tr>)} />
    </Page>
  )
}

// ---- System ----
export function AdminSystem() {
  const [d, error] = useLoad(api.admin.system)
  if (!d) return <Wait title="System" error={error} />
  const mb = (n) => `${(n / 1048576).toFixed(1)} MB`
  const up = d.uptimeSeconds > 3600 ? `${(d.uptimeSeconds / 3600).toFixed(1)} h` : `${Math.round(d.uptimeSeconds / 60)} min`
  const c = d.configured
  const flags = [['Reverse proxy (TRUST_PROXY)', c.trustProxy], ['Public URL (PUBLIC_URL)', c.publicUrl], ['Inbound webhook key', c.inboundWebhookKey], ['Twilio', c.twilio], ['WhatsApp sender', c.twilioWhatsapp], ['SMS sender', c.twilioSms], ['Email (Resend)', c.email], ['Razorpay', c.razorpay], ['AI provider', c.aiProvider]]
  return (
    <Page title="System" hint="Read-only. Secrets are never shown; this only says whether each setting is present.">
      <div className="grid gap-3 md:grid-cols-2">
        <Card><p className="mb-2 font-medium">Server</p><dl className="space-y-1 text-sm"><div className="flex justify-between"><dt>Environment</dt><dd>{d.environment}</dd></div><div className="flex justify-between"><dt>Node</dt><dd>{d.node}</dd></div><div className="flex justify-between"><dt>Uptime</dt><dd>{up}</dd></div></dl></Card>
        <Card><p className="mb-2 font-medium">Database</p><dl className="space-y-1 text-sm"><div className="flex justify-between"><dt>Engine</dt><dd>{d.database.version}</dd></div><div className="flex justify-between"><dt>Size</dt><dd>{mb(d.database.sizeBytes)}</dd></div><div className="flex justify-between"><dt>Migrations</dt><dd>{d.database.migrations.length || 'n/a'}</dd></div></dl>
          {d.database.migrations.length > 0 && <p className="mt-2 text-xs opacity-60">{d.database.migrations.join(', ')}</p>}</Card>
      </div>
      <Card><p className="mb-2 font-medium">Configuration</p>
        <Row>{flags.map(([k, v]) => <Pill key={k} className={v ? '!border-emerald-300 !bg-emerald-50 !text-emerald-800' : ''}>{k}: {v ? (typeof v === 'string' ? v : 'set') : 'not set'}</Pill>)}</Row></Card>
    </Page>
  )
}
