import { useState } from 'react'
import { api } from '../../api'
import { useWs } from '../context'
import { A, B, Card, Code, In, Mut, Page, Pill, Row, Sel, Area, Table, Td, onForm, Submit } from '../ui'
import { ago, fmt, useLoad } from './adminKit'
import { Bars, NoteBox, Wait } from './adminParts'

// ---- Platform overview ----
export function PlatformOverview() {
  const [d, error] = useLoad(api.platform.overview)
  if (!d) return <Wait title="Platform overview" error={error} />
  const c = d.counts
  const tiles = [['Workspaces', `${c.activeWorkspaces}/${c.workspaces}`, 'active / total'], ['Suspended', c.suspendedWorkspaces], ['Users', c.users], ['Platform admins', c.platformAdmins], ['New demo requests', c.newDemoRequests], ['Open tickets', c.openTickets]]
  const p = d.providers
  const prov = [['WhatsApp / SMS (Twilio)', p.twilio], ['Email (Resend)', p.email], ['Payments (Razorpay)', p.razorpay], ['AI agent', p.ai]]
  return (
    <Page title="Platform overview" hint="Everything across all workspaces. Message and AI provider keys are shared by every workspace.">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        {tiles.map(([k, v, s]) => <Card key={k}><p className="text-sm opacity-70">{k}</p><div className="font-display text-3xl font-semibold">{v}</div>{s && <p className="text-xs opacity-55">{s}</p>}</Card>)}
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Bars rows={d.activity.workspaces} label="New workspaces, last 7 days" />
        <Bars rows={d.activity.logins} label="Sign-ins, last 7 days" />
        <Bars rows={d.activity.demoRequests} label="Demo requests, last 7 days" />
        <Bars rows={d.activity.tickets} label="Support tickets, last 7 days" />
      </div>
      <Card><p className="mb-2 text-sm font-medium">Connected services</p>
        <Row>{prov.map(([k, v]) => <Pill key={k} className={v ? '!border-emerald-300 !bg-emerald-50 !text-emerald-800' : ''}>{k}: {v ? (typeof v === 'string' ? v : 'live') : 'simulated'}</Pill>)}</Row></Card>
    </Page>
  )
}

// ---- Workspaces ----
function WorkspaceDetail({ id, onClose, onChanged }) {
  const { toast } = useWs()
  const [d, error, load] = useLoad(() => api.platform.workspace(id), [id])
  const [reset, setReset] = useState(null)
  const [confirmText, setConfirmText] = useState('')
  const act = (fn, after) => fn().then((r) => { load(); onChanged(); after?.(r) }).catch((e) => toast(e.message))
  if (!d) return <Card>{error || 'Loading…'}</Card>
  const w = d.workspace
  const hookBase = `${location.origin}/webhook`
  const doReset = onForm((v) => api.platform.resetPassword(reset.id, v.password).then(() => { toast(`Temporary password set for ${reset.email}`); setReset(null) }).catch((e) => toast(e.message)))
  return (
    <Card className="space-y-4">
      <Row className="justify-between"><div><h3 className="font-display text-xl font-semibold">{w.name} <Pill className={w.status === 'active' ? '!border-emerald-300 !bg-emerald-50 !text-emerald-800' : '!border-red-300 !bg-red-50 !text-red-700'}>{w.status}</Pill></h3><Mut>Address: <Code>{w.slug}</Code></Mut></div><B v="o" onClick={onClose}>Close</B></Row>
      <Row>
        <NoteBox value={w.name} onSave={(name) => act(() => api.platform.updateWorkspace(id, { name }))} />
        {w.status === 'active'
          ? <B v="o" disabled={w.own} title={w.own ? 'You cannot suspend your own workspace' : ''} onClick={() => confirm(`Suspend ${w.name}? Its users are signed out and cannot log in.`) && act(() => api.platform.updateWorkspace(id, { status: 'suspended' }))}>Suspend</B>
          : <B onClick={() => act(() => api.platform.updateWorkspace(id, { status: 'active' }))}>Reactivate</B>}
      </Row>
      <div className="space-y-1 text-sm">
        <p className="font-medium">Inbound webhooks</p>
        <Mut>Twilio: <Code>{hookBase}/twilio/{w.slug}</Code></Mut>
        <Mut>Contacts: <Code>{hookBase}/contact/{w.slug}?key={w.inboundKey.slice(0, 6)}…</Code> <B v="o" className="ml-2" onClick={() => confirm('Create a new key? The old one stops working immediately.') && act(() => api.platform.rotateKey(id))}>New key</B></Mut>
      </div>
      <Table head={['User', 'Role', 'Status', 'Last sign-in', 'Platform admin', '']} rows={d.users.map((u) => (
        <tr key={u.id}><Td><b>{u.email}</b>{u.name && <span className="block text-xs opacity-60">{u.name}</span>}</Td><Td><Pill>{u.role}</Pill></Td>
          <Td>{u.disabled ? 'Disabled' : 'Active'}</Td><Td title={fmt(u.lastLoginAt)}>{ago(u.lastLoginAt)}</Td>
          <Td><input type="checkbox" aria-label={`${u.email} is a platform admin`} checked={u.isPlatformAdmin} className="size-4 accent-brand-500"
            onChange={(e) => confirm(`${e.target.checked ? 'Give' : 'Remove'} platform admin access for ${u.email}?`) && act(() => api.platform.setPlatformAdmin(u.id, e.target.checked))} /></Td>
          <Td><B v="o" onClick={() => setReset({ id: u.id, email: u.email })}>Reset password</B></Td></tr>))} />
      {reset && (
        <form onSubmit={doReset} className="space-y-2 rounded-2xl border border-ink/10 bg-white p-4"><p className="font-medium">Temporary password for {reset.email}</p>
          <In name="password" type="password" minLength={10} required placeholder="At least 10 characters" w="w-72" autoComplete="new-password" /><Row><Submit>Set password</Submit><B v="o" onClick={() => setReset(null)}>Cancel</B></Row></form>
      )}
      {!w.own && (
        <div className="space-y-2 rounded-2xl border border-red-200 bg-red-50/60 p-4">
          <p className="font-medium text-red-800">Delete this workspace</p>
          <Mut>Permanently deletes its users, contacts, forms, messages and settings. This cannot be undone. Type <Code>{w.slug}</Code> to confirm.</Mut>
          <Row><In value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={w.slug} w="w-52" aria-label="Type the workspace address" />
            <B v="d" disabled={confirmText !== w.slug} onClick={() => act(() => api.platform.deleteWorkspace(id, confirmText), onClose)}>Delete workspace</B></Row>
        </div>
      )}
    </Card>
  )
}

export function PlatformWorkspaces({ prefill }) {
  const { toast } = useWs()
  const [d, error, load] = useLoad(api.platform.workspaces)
  const [open, setOpen] = useState(null)
  const create = onForm((v, f) => api.platform.createWorkspace(v).then((r) => { toast(`Workspace "${r.workspace.name}" created`); f.reset(); load(); setOpen(r.workspace.id) }).catch((e) => toast(e.message)))
  if (!d) return <Wait title="Workspaces" error={error} />
  return (
    <Page title="Workspaces" hint="Each workspace is a separate customer with its own users, contacts, forms and messages. Create one with a temporary owner password, then share it privately.">
      <form onSubmit={create}><Row>
        <In name="name" placeholder="Workspace name" required w="w-48" defaultValue={prefill?.company || ''} /><In name="ownerName" placeholder="Owner name" w="w-40" defaultValue={prefill?.name || ''} />
        <In name="ownerEmail" type="email" placeholder="Owner email" required w="w-56" defaultValue={prefill?.email || ''} />
        <In name="ownerPassword" type="password" minLength={10} placeholder="Temporary password (10+ chars)" required w="w-64" autoComplete="new-password" /><Submit>Create workspace</Submit></Row></form>
      <Table head={['Workspace', 'Address', 'Status', 'Users', 'Contacts', 'Last sign-in', '']} empty="No workspaces." rows={d.workspaces.map((w) => (
        <tr key={w.id}><Td><b>{w.name}</b></Td><Td><Code>{w.slug}</Code></Td>
          <Td>{w.status === 'active' ? <Pill className="!border-emerald-300 !bg-emerald-50 !text-emerald-800">Active</Pill> : <Pill className="!border-red-300 !bg-red-50 !text-red-700">Suspended</Pill>}</Td>
          <Td>{w.users}</Td><Td>{w.contacts}</Td><Td title={fmt(w.lastLoginAt)}>{ago(w.lastLoginAt)}</Td>
          <Td><B v="o" onClick={() => setOpen(open === w.id ? null : w.id)}>{open === w.id ? 'Hide' : 'Manage'}</B></Td></tr>))} />
      {open && <WorkspaceDetail key={open} id={open} onClose={() => setOpen(null)} onChanged={load} />}
    </Page>
  )
}

// ---- Demo requests ----
const STATUS_TABS = ['', 'new', 'contacted', 'closed']
export function PlatformDemos() {
  const { toast } = useWs()
  const [tab, setTab] = useState('new')
  const [create, setCreate] = useState(null)
  const [d, error, load] = useLoad(() => api.platform.demos(tab), [tab])
  const act = (fn) => fn().then(load).catch((e) => toast(e.message))
  if (create) return (
    <>
      <Row className="mb-3"><B v="o" onClick={() => setCreate(null)}>← Back to demo requests</B></Row>
      <PlatformWorkspaces prefill={create} />
    </>
  )
  if (!d) return <Wait title="Demo requests" error={error} />
  return (
    <Page title="Demo requests" hint='Everyone who used "Book a demo" on the website. Turn a request into a workspace with one click.'>
      <Row>{STATUS_TABS.map((t) => <B key={t || 'all'} v={tab === t ? 'p' : 'o'} onClick={() => setTab(t)}>{t || 'all'}</B>)}<span className="text-sm opacity-60">{d.total} shown</span></Row>
      <Table head={['When', 'Who', 'Company', 'Interest', 'Status', 'Note']} empty="No requests here." rows={d.requests.map((r) => (
        <tr key={r.id}>
          <Td>{fmt(r.at)}</Td>
          <Td><b>{r.name}</b><a href={`mailto:${r.email}`} className="block text-xs text-brand-600">{r.email}</a>{r.phone && <span className="block text-xs opacity-60">{r.phone}</span>}</Td>
          <Td>{r.company || '—'}{r.employees && <span className="block text-xs opacity-60">{r.employees} people</span>}</Td><Td>{r.interest || '—'}</Td>
          <Td><Sel w="w-32" value={r.status} aria-label={`Status of ${r.email}`} onChange={(e) => act(() => api.platform.updateDemo(r.id, { status: e.target.value }))}>{['new', 'contacted', 'closed'].map((s) => <option key={s}>{s}</option>)}</Sel></Td>
          <Td><NoteBox value={r.note} onSave={(note) => act(() => api.platform.updateDemo(r.id, { note }))} />
            <Row className="mt-1"><B v="o" onClick={() => setCreate({ company: r.company, name: r.name, email: r.email })}>Create workspace</B>
              <B v="d" onClick={() => confirm('Delete this request?') && act(() => api.platform.deleteDemo(r.id))}>Delete</B></Row></Td>
        </tr>))} />
    </Page>
  )
}

// ---- Support tickets ----
export function PlatformTickets() {
  const { toast, me } = useWs()
  const [tab, setTab] = useState('')
  const [d, error, load] = useLoad(() => api.platform.tickets(tab), [tab])
  const [open, setOpen] = useState(null)
  const act = (fn) => fn().then(load).catch((e) => toast(e.message))
  const reply = onForm((v, f) => api.platform.replyTicket(open, v.message).then((r) => { toast(r.delivery === 'sent' ? 'Reply emailed' : 'Reply saved. Email is not configured, so nothing was sent'); f.reset(); load() }).catch((e) => toast(e.message)))
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
              <Sel w="w-32" value={t.status} aria-label="Status" onChange={(e) => act(() => api.platform.updateTicket(t.id, { status: e.target.value }))}>{['open', 'pending', 'resolved'].map((s) => <option key={s}>{s}</option>)}</Sel>
              <Sel w="w-28" value={t.priority} aria-label="Priority" onChange={(e) => act(() => api.platform.updateTicket(t.id, { priority: e.target.value }))}>{['low', 'normal', 'high'].map((s) => <option key={s}>{s}</option>)}</Sel>
              <B v="o" onClick={() => act(() => api.platform.updateTicket(t.id, { assignee: t.assignee ? '' : me.email }))}>{t.assignee ? `Assigned: ${t.assignee} (clear)` : 'Assign to me'}</B>
              <NoteBox value={t.note} onSave={(note) => act(() => api.platform.updateTicket(t.id, { note }))} />
              <B v="o" onClick={() => setOpen(open === t.id ? null : t.id)}>{open === t.id ? 'Close reply' : 'Reply'}</B>
              <B v="d" onClick={() => confirm('Delete this ticket?') && act(() => api.platform.deleteTicket(t.id))}>Delete</B>
            </Row>
            {open === t.id && <form onSubmit={reply} className="space-y-2"><Area name="message" rows={4} required placeholder={`Reply to ${t.email}`} aria-label="Reply" /><Submit>Send reply</Submit></form>}
          </Card>
        ))}
      </div>
    </Page>
  )
}

// ---- System ----
export function PlatformSystem() {
  const [d, error] = useLoad(api.platform.system)
  if (!d) return <Wait title="System" error={error} />
  const mb = (n) => `${(n / 1048576).toFixed(1)} MB`
  const up = d.uptimeSeconds > 3600 ? `${(d.uptimeSeconds / 3600).toFixed(1)} h` : `${Math.round(d.uptimeSeconds / 60)} min`
  const c = d.configured
  const flags = [['Reverse proxy (TRUST_PROXY)', c.trustProxy], ['Public URL (PUBLIC_URL)', c.publicUrl], ['Legacy inbound key (INBOUND_KEY)', c.inboundWebhookKey], ['Twilio', c.twilio], ['WhatsApp sender', c.twilioWhatsapp], ['SMS sender', c.twilioSms], ['Email (Resend)', c.email], ['Razorpay', c.razorpay], ['AI provider', c.aiProvider]]
  return (
    <Page title="System" hint="Read-only. Secrets are never shown; this only says whether each setting is present.">
      <div className="grid gap-3 md:grid-cols-2">
        <Card><p className="mb-2 font-medium">Server</p><dl className="space-y-1 text-sm"><div className="flex justify-between"><dt>Environment</dt><dd>{d.environment}</dd></div><div className="flex justify-between"><dt>Node</dt><dd>{d.node}</dd></div><div className="flex justify-between"><dt>Uptime</dt><dd>{up}</dd></div></dl></Card>
        <Card><p className="mb-2 font-medium">Database</p><dl className="space-y-1 text-sm"><div className="flex justify-between"><dt>Engine</dt><dd>{d.database.version}</dd></div><div className="flex justify-between"><dt>Size</dt><dd>{mb(d.database.sizeBytes)}</dd></div><div className="flex justify-between"><dt>Migrations</dt><dd>{d.database.migrations.length || 'n/a'}</dd></div></dl>
          {d.database.migrations.length > 0 && <p className="mt-2 text-xs opacity-60">{d.database.migrations.join(', ')}</p>}</Card>
      </div>
      <Card><p className="mb-2 font-medium">Configuration</p>
        <Row>{flags.map(([k, v]) => <Pill key={k} className={v ? '!border-emerald-300 !bg-emerald-50 !text-emerald-800' : ''}>{k}: {v ? (typeof v === 'string' ? v : 'set') : 'not set'}</Pill>)}</Row></Card>
      <Mut>Provider keys (Twilio, Resend, Razorpay, AI) are set once for the whole platform and shared by every workspace. <A href="https://github.com/mrrokesh/Automation#configuration-and-secrets" target="_blank" rel="noreferrer">How to configure them</A>.</Mut>
    </Page>
  )
}
