import { useEffect, useState } from 'react'
import { api } from '../../api'
import { uid } from '../engine'
import { useWs } from '../context'
import { A, B, Card, Code, In, Mut, onForm, Page, Row, Sel, Submit, Table, Td } from '../ui'

// ---- Dashboard ----
export function Dashboard() {
  const { S, status, me } = useWs()
  const sent = S.campaigns.reduce((a, c) => a + c.sent, 0)
  const tiles = [['Contacts', S.contacts.length], ['Campaigns', S.campaigns.length], ['Messages sent', sent], ['Workflows on', `${S.workflows.filter((w) => w.on).length}/${S.workflows.length}`], ['Wallet', `₹${S.wallet}`]]
  return (
    <Page title={`Hello${me?.name ? ', ' + me.name : ''}`}>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        {tiles.map(([k, v]) => <Card key={k}><p className="text-sm opacity-70">{k}</p><div className="font-display text-3xl font-semibold">{v}</div></Card>)}
      </div>
      <Mut>Delivery mode: <b>{status.live ? 'live backend (Twilio)' : 'simulated (no WhatsApp/SMS leaves this app)'}</b> · Email: <b>{status.emailLive ? 'live (Resend)' : 'simulated'}</b> · AI agent: <b>{status.agentLive ? status.agentProvider : 'keyword match'}</b></Mut>
    </Page>
  )
}

// ---- Attributes ----
export const ATTR_TYPES = ['Textfield', 'Paragraph', 'Date', 'Time', 'Timestamp', 'Dropdown', 'Number', 'Phone', 'Email', 'Website', 'Link', 'Currency']
export const DEFAULTS = [['name', 'Name'], ['phone', 'Phone'], ['email', 'Email'], ['label', 'Label']]

export function Attributes() {
  const { S, update, toast } = useWs()
  const add = onForm((d, f) => {
    if (S.attrs.length >= 50) return toast('Limit is 50 attributes')
    if (S.attrs.some((a) => a.name.toLowerCase() === d.name.trim().toLowerCase())) return toast('Name already used')
    update((s) => { s.attrs.push({ id: uid(), name: d.name.trim(), type: d.type, opts: d.type === 'Dropdown' ? d.opts : '' }) }); f.reset()
  })
  return (
    <Page title="Contact Attributes" hint={`Default attributes (name, phone, email, label) are built in. Create up to 50 of your own. Types: ${ATTR_TYPES.join(', ')}.`}>
      <form onSubmit={add}><Row><In name="name" placeholder="Attribute name" required maxLength={40} w="w-52" /><Sel name="type" w="w-36">{ATTR_TYPES.map((t) => <option key={t}>{t}</option>)}</Sel><In name="opts" placeholder="Dropdown options, comma separated" w="w-64" /><Submit>Create attribute</Submit></Row></form>
      <Table head={['Name', 'Type', 'Kind', '']} rows={[
        ...DEFAULTS.map((d) => <tr key={d[0]}><Td>{d[1]}</Td><Td>—</Td><Td>Default</Td><Td /></tr>),
        ...S.attrs.map((a) => <tr key={a.id}><Td>{a.name}</Td><Td>{a.type}{a.opts && ` (${a.opts})`}</Td><Td>Secondary</Td><Td><B v="d" onClick={() => update((s) => { s.attrs = s.attrs.filter((x) => x.id !== a.id) })}>Delete</B></Td></tr>),
      ]} />
    </Page>
  )
}

// ---- Labels ----
export function Labels() {
  const { S, update } = useWs()
  const add = onForm((d, f) => { const v = d.l.trim(); if (v && !S.labels.includes(v)) update((s) => { s.labels.push(v) }); f.reset() })
  return (
    <Page title="Labels">
      <form onSubmit={add}><Row><In name="l" placeholder="New label" required w="w-52" /><Submit>Add label</Submit></Row></form>
      <Table head={['Label', 'Contacts', '']} rows={S.labels.map((l) => <tr key={l}><Td>{l}</Td><Td>{S.contacts.filter((c) => c.label === l).length}</Td><Td><B v="d" onClick={() => update((s) => { s.labels = s.labels.filter((x) => x !== l) })}>Delete</B></Td></tr>)} />
    </Page>
  )
}

// ---- Contacts: search, up to five filters, add, CSV import with column mapping ----
const OPS = { eq: 'is equal to', ne: 'is not equal to', has: 'contains', nhas: 'does not contain', empty: 'is empty', nempty: 'is not empty' }
const testOp = (op, val, v) => { val = String(val).toLowerCase(); v = String(v).toLowerCase(); return { eq: val === v, ne: val !== v, has: val.includes(v), nhas: !val.includes(v), empty: val === '', nempty: val !== '' }[op] }
const getVal = (c, k) => (DEFAULTS.some((d) => d[0] === k) ? c[k] || '' : (c.attrs || {})[k] || '')
const csvParse = (t) => {
  const rows = []; let r = [], f = '', q = false
  for (let i = 0; i < t.length; i++) {
    const ch = t[i]
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { f += '"'; i++ } else q = false } else f += ch }
    else if (ch === '"') q = true
    else if (ch === ',') { r.push(f); f = '' }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; r.push(f); f = ''; if (r.some((x) => x.trim())) rows.push(r); r = [] }
    else f += ch
  }
  r.push(f); if (r.some((x) => x.trim())) rows.push(r)
  return rows
}

export function Contacts() {
  const { S, update, toast } = useWs()
  const [q, setQ] = useState('')
  const [mode, setMode] = useState('AND')
  const [rows, setRows] = useState([])
  const [csv, setCsv] = useState(null) // { rows, map, label, newLabel }
  const keys = [...DEFAULTS, ...S.attrs.map((a) => [a.id, a.name])]
  const active = rows.filter((r) => r.k)
  const list = S.contacts.filter((c) => {
    if (q && !JSON.stringify(c).toLowerCase().includes(q.toLowerCase())) return false
    if (!active.length) return true
    const res = active.map((r) => testOp(r.op, getVal(c, r.k), r.v || ''))
    return mode === 'AND' ? res.every(Boolean) : res.some(Boolean)
  })
  const setRow = (i, patch) => setRows((rs) => rs.map((r, n) => (n === i ? { ...r, ...patch } : r)))

  const add = onForm((d, f) => { update((s) => { s.contacts.push({ id: uid(), ...d }) }); f.reset() })

  async function pickFile(e) {
    const file = e.target.files[0]; if (!file) return
    const parsed = csvParse(await file.text())
    if (parsed.length < 2) return toast('CSV needs a header and at least one row')
    const map = parsed[0].map((h) => { const g = keys.find((k) => k[1].toLowerCase() === h.trim().toLowerCase()); return g && g[0] !== 'label' ? g[0] : '' })
    setCsv({ rows: parsed, map, label: S.labels[0] || '__new', newLabel: '' })
  }
  function runImport() {
    let label = csv.label
    if (label === '__new') { label = csv.newLabel.trim(); if (!label) return toast('Enter a label name') }
    let n = 0, skip = 0
    update((s) => {
      if (!s.labels.includes(label)) s.labels.push(label)
      csv.rows.slice(1).forEach((r) => {
        const c = { id: uid(), name: '', phone: '', email: '', label, attrs: {} }
        csv.map.forEach((k, i) => { if (!k) return; const v = (r[i] || '').trim(); if (DEFAULTS.some((d) => d[0] === k)) c[k] = v; else c.attrs[k] = v })
        if (!c.name && !c.phone && !c.email) { skip++; return }
        if (!c.name) c.name = c.email || c.phone
        s.contacts.push(c); n++
      })
    })
    toast(`${n} imported${skip ? `, ${skip} skipped` : ''}`); setCsv(null)
  }

  return (
    <Page title={`Contacts (${list.length}/${S.contacts.length})`}>
      <Row><In placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} w="w-52" aria-label="Search contacts" /><Sel w="w-24" value={mode} onChange={(e) => setMode(e.target.value)}><option>AND</option><option>OR</option></Sel>
        <B v="o" onClick={() => (rows.length >= 5 ? toast('Up to 5 filters') : setRows([...rows, { k: 'name', op: 'has', v: '' }]))}>+ Filter (max 5)</B></Row>
      {rows.map((r, i) => (
        <Row key={i}><Sel w="w-40" value={r.k} onChange={(e) => setRow(i, { k: e.target.value })}>{keys.map((k) => <option key={k[0]} value={k[0]}>{k[1]}</option>)}</Sel>
          <Sel w="w-44" value={r.op} onChange={(e) => setRow(i, { op: e.target.value })}>{Object.entries(OPS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Sel>
          <In value={r.v} placeholder="value" onChange={(e) => setRow(i, { v: e.target.value })} /><B v="d" onClick={() => setRows(rows.filter((_, n) => n !== i))}>✕</B></Row>
      ))}
      <form onSubmit={add}><Row><In name="name" placeholder="Name" required w="w-36" /><In name="phone" placeholder="Phone +91…" w="w-36" /><In name="email" type="email" placeholder="Email" w="w-44" />
        <Sel name="label" w="w-32">{S.labels.map((l) => <option key={l}>{l}</option>)}</Sel><Submit>Add contact</Submit></Row></form>
      <details className="rounded-2xl border border-ink/10 bg-white/60 p-4"><summary className="cursor-pointer font-medium">Upload CSV and map columns</summary>
        <div className="mt-3 space-y-3"><FileInput accept=".csv" onChange={pickFile} aria-label="CSV file" />
          {csv && <div className="space-y-2"><Mut>Map each column to an attribute (unmapped columns are skipped):</Mut>
            {csv.rows[0].map((h, i) => <Row key={i}><span className="w-40 truncate">{h}</span><Sel w="w-44" value={csv.map[i]} onChange={(e) => setCsv({ ...csv, map: csv.map.map((m, n) => (n === i ? e.target.value : m)) })}><option value="">(skip)</option>{keys.filter((k) => k[0] !== 'label').map((k) => <option key={k[0]} value={k[0]}>{k[1]}</option>)}</Sel></Row>)}
            <Row><Sel w="w-44" value={csv.label} onChange={(e) => setCsv({ ...csv, label: e.target.value })}>{S.labels.map((l) => <option key={l}>{l}</option>)}<option value="__new">+ New label…</option></Sel>
              {csv.label === '__new' && <In placeholder="New label name" value={csv.newLabel} onChange={(e) => setCsv({ ...csv, newLabel: e.target.value })} />}<B onClick={runImport}>Import {csv.rows.length - 1} rows</B></Row></div>}</div></details>
      <Table head={[...keys.map((k) => k[1]), '']} empty="No contacts." rows={list.map((c) => <tr key={c.id}>{keys.map((k) => <Td key={k[0]}>{getVal(c, k[0])}</Td>)}<Td><B v="d" onClick={() => update((s) => { s.contacts = s.contacts.filter((x) => x.id !== c.id) })}>Delete</B></Td></tr>)} />
    </Page>
  )
}

// ---- Smart Forms (stored in PostgreSQL so the public link works) ----
export function Forms() {
  const { update, toast } = useWs()
  const [d, setD] = useState(null)
  const [err, setErr] = useState('')
  const load = () => api.forms().then(setD).catch((e) => setErr(e.message))
  useEffect(() => { load() }, [])
  const origin = location.origin

  const create = onForm(async (v, f) => {
    const fields = v.fields.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [label, type, req] = l.split('|'); return { label, name: label.toLowerCase().replace(/\W/g, '_'), type: (type || 'text').trim(), required: /req/i.test(req || '') } })
    await api.saveForm({ title: v.title, intro: v.intro, fields }).then(() => { f.reset(); load() }).catch((e) => toast(e.message))
  })
  function importResponses(id) {
    let n = 0
    update((s) => {
      d.submissions.filter((x) => x.form === id).forEach((x) => {
        const v = x.values, name = v.name || v.full_name || '', phone = v.phone || v.mobile || '', email = v.email || ''
        if ((phone || email) && !s.contacts.some((c) => (phone && c.phone === phone) || (email && c.email === email))) { s.contacts.push({ id: uid(), name: name || email || phone, phone, email, label: s.labels[0] || '' }); n++ }
      })
    })
    toast(`${n} new contacts imported`)
  }
  if (err) return <Page title="Smart Forms"><Mut>{err}</Mut></Page>
  if (!d) return <Page title="Smart Forms"><Mut>Loading…</Mut></Page>
  return (
    <Page title="Smart Forms">
      <form onSubmit={create}><Row className="items-start"><In name="title" placeholder="Form title" required w="w-52" /><In name="intro" placeholder="Intro text" w="w-64" />
        <textarea name="fields" rows={3} defaultValue={'Name|text|required\nPhone|tel|required\nEmail|email'} className="field !w-72 !rounded-lg !px-3 !py-2 text-sm" aria-label="Fields, one per line: label|type|required" /><Submit>Create form</Submit></Row></form>
      <Mut>To embed a form on a page use <Code>{`<iframe src="${origin}/form/FORM_ID" width="100%" height="420" style="border:0"></iframe>`}</Code> (replace FORM_ID with the id in its link).</Mut>
      <Table head={['Form', 'Link', 'Responses', '']} empty="No forms yet." rows={d.forms.map((f) => (
        <tr key={f.id}><Td>{f.title}</Td><Td><A href={`/form/${f.id}`} target="_blank" rel="noreferrer">{origin}/form/{f.id}</A></Td><Td>{d.submissions.filter((x) => x.form === f.id).length}</Td>
          <Td><Row><B v="o" onClick={() => importResponses(f.id)}>Import to contacts</B><B v="d" onClick={() => api.deleteForm(f.id).then(load)}>Delete</B></Row></Td></tr>))} />
    </Page>
  )
}
