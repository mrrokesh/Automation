import { useCallback, useEffect, useState } from 'react'
import { api } from '../../api'
import { uid, fill } from '../engine'
import { useWs } from '../context'
import { B, Card, In, Mut, onForm, Page, Pill, Row, Sel, Submit, Table, Td } from '../ui'

// ---- Canned responses ----
export function Canned() {
  const { S, update, toast } = useWs()
  const add = onForm((d, f) => {
    if (S.canned.some((c) => c.short === d.short)) return toast('Shortcut exists')
    update((s) => { s.canned.push({ id: uid(), ...d }) }); f.reset()
  })
  return (
    <Page title="Canned Responses" hint='In Team Inbox, type "/" in the reply box to see shortcuts, or type a full shortcut and press Send to expand it.'>
      <form onSubmit={add}><Row><In name="short" placeholder="Shortcut (e.g. hours)" required pattern="[a-z0-9_-]+" w="w-44" /><Sel name="kind" w="w-36"><option value="quick">Quick reply</option><option value="template">Template</option></Sel>
        <In name="text" placeholder="Message text" w="w-72" /><Sel name="tpl" w="w-44">{S.templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Sel><Submit>Add</Submit></Row></form>
      <Table head={['Shortcut', 'Type', 'Content', '']} empty="None." rows={S.canned.map((c) => <tr key={c.id}><Td>/{c.short}</Td><Td>{c.kind}</Td><Td>{c.kind === 'quick' ? c.text : S.templates.find((t) => t.id === c.tpl)?.body || ''}</Td><Td><B v="d" onClick={() => update((s) => { s.canned = s.canned.filter((x) => x.id !== c.id) })}>Delete</B></Td></tr>)} />
    </Page>
  )
}

// ---- Team & chat settings ----
export function Team() {
  const { S, update, toast, me } = useWs()
  const [users, setUsers] = useState(null)
  const load = useCallback(() => api.users().then((d) => setUsers(d.users)).catch((e) => toast(e.message)), [toast])
  useEffect(() => { load() }, [load])
  const owner = me?.role === 'owner'
  const invite = onForm(async (d, f) => { try { await api.addUser(d.email, d.password); f.reset(); load() } catch (e) { toast(e.message) } })
  return (
    <Page title="Team & Chat Settings">
      <h3 className="font-display text-lg font-semibold">Chat preferences</h3>
      <form onSubmit={onForm((d) => { update((s) => { s.chat.frt = Math.max(1, +d.frt || 5) }); toast('Saved') })}><Row>
        <label className="flex items-center gap-2 text-sm">First response time (minutes): <In name="frt" type="number" min="1" max="1440" defaultValue={S.chat.frt} w="w-24" /></label><Submit>Save</Submit></Row></form>
      <Mut>Chats with no reply after this time are marked PENDING and "FRT exceeded" in the Team Inbox.</Mut>
      <h3 className="font-display text-lg font-semibold">Agents</h3>
      <Table head={['Email', 'Role', '']} rows={(users || []).map((x) => <tr key={x.id}><Td>{x.email}</Td><Td>{x.role}</Td><Td>{owner && x.role !== 'owner' && <B v="d" onClick={() => api.removeUser(x.id).then(load)}>Remove</B>}</Td></tr>)} />
      {owner ? <>
        <h3 className="font-display text-lg font-semibold">Invite an agent</h3>
        <form onSubmit={invite}><Row><In name="email" type="email" placeholder="Agent email" required w="w-56" /><In name="password" type="password" minLength={10} placeholder="Temporary password (10+ chars)" required w="w-64" autoComplete="new-password" /><Submit>Create agent</Submit></Row></form>
        <Mut>Share the password with the agent over a private channel; there is no email invite yet. Agents can reset a forgotten password from the login page.</Mut></>
        : <Mut>Only the owner can invite agents.</Mut>}
    </Page>
  )
}

// ---- Team Inbox with chat statuses ----
const WINDOW = 24 * 3600e3
function chatStatus(mt, frtMinutes, msgs) {
  const frt = frtMinutes * 60e3
  const ins = msgs.filter((m) => m.dir === 'in'), lastIn = ins.length ? new Date(ins[ins.length - 1].at).getTime() : 0
  const humanOut = msgs.some((m) => m.dir === 'out' && !m.bot)
  const last = msgs[msgs.length - 1], awaiting = last && last.dir === 'in', overdue = awaiting && Date.now() - new Date(last.at).getTime() > frt
  const s = new Set()
  if (mt.resolved) s.add('RESOLVED'); else if (mt.bot && !humanOut) s.add('CHATBOT'); else if (mt.bot && humanOut) s.add('INTERVENED'); else if (overdue) s.add('PENDING'); else s.add('OPEN')
  s.add(Date.now() - lastIn < WINDOW ? 'ACTIVE' : 'EXPIRED')
  if (overdue && !mt.resolved) { s.add('FRT EXCEEDED'); s.add('PENDING'); s.delete('OPEN') }
  if (!mt.assignee) s.add('UNASSIGNED')
  return s
}
const CATS = ['ALL', 'OPEN', 'PENDING', 'RESOLVED', 'CHATBOT', 'INTERVENED', 'ACTIVE', 'EXPIRED', 'FRT EXCEEDED', 'UNASSIGNED', 'MINE']

function Thread({ from, msgs, users }) {
  const { S, update, engine, status, me } = useWs()
  const mt = S.meta[from] || {}
  const st = chatStatus(mt, S.chat.frt, msgs)
  const expired = st.has('EXPIRED')
  const channel = msgs[0].channel
  const waTemplates = S.templates.filter((t) => t.channel === 'whatsapp')
  const log = (ch, to, text) => api.logMessage({ channel: ch, to, text, bot: false })
  const contact = () => S.contacts.find((x) => x.phone === from) || { name: '' }
  const patch = (fn) => update((s) => { fn((s.meta[from] = s.meta[from] || {})) })

  const sendReply = onForm(async (d, f) => {
    let text = d.t.trim(); const c = S.canned.find((x) => '/' + x.short === text)
    if (c) text = c.kind === 'quick' ? c.text : S.templates.find((t) => t.id === c.tpl)?.body || text
    text = fill(text, contact())
    const r = await engine.deliver(channel, from, text)
    if (r !== 'failed') { await log(channel, from, text); f.reset(); engine.pollInbox() }
  })
  const sendTemplate = onForm(async (d) => {
    const t = S.templates.find((x) => x.id === d.tpl); if (!t) return
    const text = fill(t.body, contact())
    if ((await engine.deliver('whatsapp', from, text)) !== 'failed') { await log('whatsapp', from, text); engine.pollInbox() }
  })

  return (
    <Card className="space-y-2">
      <h3 className="flex flex-wrap items-center gap-2 font-display text-lg font-semibold">{from} <small className="font-sans text-xs font-normal opacity-60">({channel})</small>{[...st].map((x) => <Pill key={x}>{x}{x === 'FRT EXCEEDED' ? ' 🔴' : ''}</Pill>)}</h3>
      {msgs.map((m) => <p key={m.id} className={m.dir === 'out' ? 'text-right text-brand-600' : ''}>{m.text}{m.bot && <small> (bot)</small>}</p>)}
      <Row><Sel w="w-52" value={mt.assignee || ''} onChange={(e) => patch((x) => { x.assignee = e.target.value })} aria-label="Assignee"><option value="">Unassigned</option>{users.map((u) => <option key={u.id}>{u.email}</option>)}</Sel>
        <B v="o" onClick={() => patch((x) => { x.resolved = !x.resolved })}>{mt.resolved ? 'Reopen' : 'Resolve'}</B></Row>
      {expired
        ? <><Mut>The 24-hour window has expired: send a template to reopen it.</Mut><form onSubmit={sendTemplate}><Row><Sel name="tpl" w="w-56">{waTemplates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Sel><Submit>Send template</Submit></Row></form></>
        : <form onSubmit={sendReply}><Row><In name="t" list="canned-list" placeholder='Reply (type "/" for canned responses)' required w="w-96 max-w-full" autoComplete="off" /><Submit>Send</Submit></Row></form>}
      {!status.live && <Mut>Replies are simulated until Twilio is configured.</Mut>}
      <span className="sr-only">{me?.email}</span>
    </Card>
  )
}

export function Inbox() {
  const { S, engine, toast, me } = useWs()
  const [msgs, setMsgs] = useState(null)
  const [users, setUsers] = useState([])
  const [cat, setCat] = useState('ALL')
  const refresh = useCallback(() => engine.pollInbox().then((m) => { if (m) setMsgs(m); else setMsgs((x) => x ?? []) }), [engine])
  useEffect(() => {
    refresh(); api.users().then((d) => setUsers(d.users)).catch(() => {})
    const t = setInterval(refresh, 8000)
    return () => clearInterval(t)
  }, [refresh])
  // Re-render statuses when local meta (assignee/resolved) changes.
  void S.meta
  if (!msgs) return <Page title="Team Inbox"><Mut>Loading…</Mut></Page>
  const threads = {}; msgs.forEach((m) => (threads[m.from] = threads[m.from] || []).push(m))
  const shown = Object.keys(threads).filter((f) => { const mt = S.meta[f] || {}; const st = chatStatus(mt, S.chat.frt, threads[f]); return cat === 'ALL' || (cat === 'MINE' ? mt.assignee === me?.email : st.has(cat)) })
  const newChat = onForm(async (d, f) => {
    const t = S.templates.find((x) => x.id === d.tpl), to = d.to.trim(); if (!t) return
    const c = S.contacts.find((x) => x.phone === to) || { name: '' }, text = fill(t.body, c)
    if ((await engine.deliver('whatsapp', to, text)) !== 'failed') { await api.logMessage({ channel: 'whatsapp', to, text, bot: false }); f.reset(); refresh() } else toast('Send failed')
  })
  return (
    <Page title="Team Inbox">
      <Row>{CATS.map((c) => <B key={c} v={c === cat ? 'p' : 'o'} onClick={() => setCat(c)}>{c}</B>)}</Row>
      <form onSubmit={newChat}><Row><In name="to" placeholder="New conversation: phone with country code" required w="w-72" /><Sel name="tpl" w="w-52">{S.templates.filter((t) => t.channel === 'whatsapp').map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Sel><Submit>Send template</Submit></Row></form>
      <datalist id="canned-list">{S.canned.map((c) => <option key={c.id} value={`/${c.short}`} />)}</datalist>
      <div className="space-y-3">
        {shown.map((f) => <Thread key={f} from={f} msgs={threads[f]} users={users} />)}
        {!shown.length && <Mut>No chats in this view. Point Twilio's inbound webhook at <code>/webhook/twilio</code> (needs a public URL).</Mut>}
      </div>
    </Page>
  )
}
