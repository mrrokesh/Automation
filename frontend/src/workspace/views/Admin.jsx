import { useState } from 'react'
import { api } from '../../api'
import { useWs } from '../context'
import { B, Card, In, Mut, Page, Pill, Row, Sel, Table, Td, onForm, Submit } from '../ui'
import { ago, fmt, useLoad } from './adminKit'
import { Bars, Wait } from './adminParts'

// ---- Workspace admin: overview, users and audit log of the signed-in user's own workspace ----
export function AdminOverview() {
  const { me } = useWs()
  const [d, error] = useLoad(api.admin.overview)
  if (!d) return <Wait title="Admin overview" error={error} />
  const c = d.counts
  const tiles = [['Users', `${c.activeUsers}/${c.users}`, 'active / total'], ['Contacts', c.contacts], ['Forms', c.forms], ['Form responses', c.submissions], ['Inbox messages', c.inboxMessages], ['Leads waiting', c.pendingLeads]]
  const p = d.providers
  const prov = [['WhatsApp / SMS (Twilio)', p.twilio], ['Email (Resend)', p.email], ['Payments (Razorpay)', p.razorpay], ['AI agent', p.ai]]
  return (
    <Page title={`Admin overview · ${me.workspaceName}`}>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        {tiles.map(([k, v, s]) => <Card key={k}><p className="text-sm opacity-70">{k}</p><div className="font-display text-3xl font-semibold">{v}</div>{s && <p className="text-xs opacity-55">{s}</p>}</Card>)}
      </div>
      <div className="max-w-md"><Bars rows={d.activity.logins} label="Sign-ins, last 7 days" /></div>
      <Card><p className="mb-2 text-sm font-medium">Connected services</p>
        <Row>{prov.map(([k, v]) => <Pill key={k} className={v ? '!border-emerald-300 !bg-emerald-50 !text-emerald-800' : ''}>{k}: {v ? (typeof v === 'string' ? v : 'live') : 'simulated'}</Pill>)}</Row>
        <Mut>Message and AI keys are set by the platform. Ask your platform admin to enable a service.</Mut></Card>
    </Page>
  )
}

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

// The audit log is the same table for both portals; `platform` switches the endpoint and adds a workspace column.
export function AuditLog({ platform = false }) {
  const [offset, setOffset] = useState(0)
  const [action, setAction] = useState('')
  const [d, error] = useLoad(() => (platform ? api.platform.audit(offset, action) : api.admin.audit(offset, action)), [offset, action, platform])
  if (!d) return <Wait title="Audit log" error={error} />
  const actions = ['', 'login', 'login.failed', 'login.blocked', 'user.invited', 'user.updated', 'user.password_reset', 'user.deleted',
    ...(platform ? ['workspace.created', 'workspace.updated', 'workspace.deleted', 'workspace.key_rotated', 'platform.granted', 'platform.revoked', 'demo.updated', 'ticket.updated', 'ticket.replied'] : [])]
  const head = platform ? ['When', 'Workspace', 'Who', 'Action', 'Target', 'Detail'] : ['When', 'Who', 'Action', 'Target', 'Detail']
  return (
    <Page title={platform ? 'Platform audit log' : 'Audit log'} hint={platform ? 'Sign-ins and admin actions across every workspace, newest first. Passwords are never recorded.' : 'Sign-ins and admin actions in your workspace, newest first. Passwords are never recorded.'}>
      <Row><Sel w="w-56" value={action} aria-label="Filter by action" onChange={(e) => { setOffset(0); setAction(e.target.value) }}>{actions.map((a) => <option key={a} value={a}>{a || 'All actions'}</option>)}</Sel>
        <B v="o" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))}>Newer</B><B v="o" disabled={offset + 50 >= d.total} onClick={() => setOffset(offset + 50)}>Older</B>
        <span className="text-sm opacity-60">{d.total} entries</span></Row>
      <Table head={head} empty="Nothing logged yet." rows={d.entries.map((e) => (
        <tr key={e.id}><Td>{fmt(e.at)}</Td>{platform && <Td>{e.workspace || '—'}</Td>}<Td>{e.actor || '—'}</Td><Td><Pill>{e.action}</Pill></Td><Td>{e.target}</Td><Td>{e.detail}</Td></tr>))} />
    </Page>
  )
}

export const AdminAudit = () => <AuditLog />
export const PlatformAudit = () => <AuditLog platform />
