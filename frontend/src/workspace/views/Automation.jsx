import { useEffect, useState } from 'react'
import { api } from '../../api'
import { uid, kwMatch, UNIT, dueIn } from '../engine'
import { useWs } from '../context'
import { B, Code, In, Mut, onForm, Page, Row, Sel, Submit, Table, Td, Area } from '../ui'

// ---- Keywords ----
export function Keywords() {
  const { S, update } = useWs()
  const [type, setType] = useState('message')
  const [test, setTest] = useState({ t: '', res: '' })
  const add = onForm((d, f) => {
    const words = d.words.split(',').map((x) => x.trim()).filter(Boolean)
    if (!words.length) return
    update((s) => { s.keywords.push({ id: uid(), words, match: d.match, action: { type: d.type, text: d.text, tpl: d.tpl, agent: (d.agent || '').trim().toLowerCase(), wf: d.wf } }) }); f.reset()
  })
  const runTest = (e) => { e.preventDefault(); const k = S.keywords.find((x) => kwMatch(x, test.t)); setTest({ ...test, res: k ? `matches: ${k.words.join(', ')} -> ${k.action.type}` : 'no match' }) }
  return (
    <Page title="Keywords" hint="A keyword runs an action when a customer's reply matches. Exact match is case-sensitive. Approximate match triggers when the reply contains the keyword, is contained in it, or shares a word with it. Rules run while this workspace is open and the backend receives inbound messages.">
      <form onSubmit={add}><Row><In name="words" placeholder="Keywords, comma separated" required w="w-60" /><Sel name="match" w="w-36"><option value="exact">Exact match</option><option value="approx">Approximate</option></Sel>
        <Sel name="type" w="w-44" value={type} onChange={(e) => setType(e.target.value)}><option value="message">Send message</option><option value="template">Send template</option><option value="assign">Assign to agent</option><option value="workflow">Trigger workflow</option></Sel>
        {type === 'message' && <In name="text" placeholder="Reply text" w="w-60" />}
        {type === 'template' && <Sel name="tpl" w="w-44">{S.templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Sel>}
        {type === 'assign' && <In name="agent" placeholder="Agent email" w="w-48" />}
        {type === 'workflow' && <Sel name="wf" w="w-44">{S.workflows.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Sel>}
        <Submit>Save keyword</Submit></Row></form>
      <Table head={['Keywords', 'Match', 'Action', '']} empty="No keywords yet." rows={S.keywords.map((k) => <tr key={k.id}><Td>{k.words.join(', ')}</Td><Td>{k.match}</Td><Td>{k.action.type}{k.action.text ? `: ${k.action.text}` : ''}{k.action.agent ? `: ${k.action.agent}` : ''}</Td><Td><B v="d" onClick={() => update((s) => { s.keywords = s.keywords.filter((x) => x.id !== k.id) })}>Delete</B></Td></tr>)} />
      <h3 className="font-display text-lg font-semibold">Test a message</h3>
      <form onSubmit={runTest}><Row><In placeholder="Type a customer reply" w="w-72" value={test.t} onChange={(e) => setTest({ ...test, t: e.target.value })} /><B v="o" onClick={runTest}>Test</B><span className="text-sm">{test.res}</span></Row></form>
    </Page>
  )
}

// ---- Workflows: trigger event + ordered steps; the engine runs them against a chosen contact ----
const STEP = { send: 'Send message', label: 'Add label', attr: 'Set attribute (name=value)', wait: 'Wait (seconds)', cond: 'If contact has label (else stop)', webhook: 'Send webhook', ai: 'AI reply (uses agent)', call: 'Make call (reads script aloud)' }
const EVENTS = ['incomingWA', 'instagramEvent', 'newContact', 'keyword']

function WorkflowEditor({ id, onDone }) {
  const { S, update, engine } = useWs()
  const [log, setLog] = useState('')
  const [tc, setTc] = useState(S.contacts[0]?.id || '')
  const w = S.workflows.find((x) => x.id === id)
  if (!w) return null
  const edit = (fn) => update((s) => fn(s.workflows.find((x) => x.id === id)))
  const run = async () => {
    const c = S.contacts.find((x) => x.id === tc)
    if (!c) return setLog('Add a contact first.')
    setLog('')
    await engine.execute(w, c, (t) => setLog((l) => l + t + '\n'), { test: true })
  }
  return (
    <Page title="Edit workflow">
      <Row><In value={w.name} onChange={(e) => edit((x) => { x.name = e.target.value })} w="w-64" aria-label="Workflow name" /><Sel w="w-44" value={w.event} onChange={(e) => edit((x) => { x.event = e.target.value })}>{EVENTS.map((x) => <option key={x}>{x}</option>)}</Sel>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={w.on} onChange={(e) => edit((x) => { x.on = e.target.checked })} className="size-4 accent-brand-500" /> Active</label></Row>
      <div className="space-y-2">
        {w.steps.map((s, i) => (
          <div key={i} className="rounded-2xl border border-ink/10 bg-white/80 p-3"><b className="text-sm">{i + 1}. {STEP[s.type]}</b>
            <Row className="mt-2">
              {s.type === 'send'
                ? <><Sel w="w-28" value={s.channel} onChange={(e) => edit((x) => { x.steps[i].channel = e.target.value })}>{['whatsapp', 'email', 'sms'].map((c) => <option key={c}>{c}</option>)}</Sel><In w="w-96" value={s.text} onChange={(e) => edit((x) => { x.steps[i].text = e.target.value })} aria-label="Message" /></>
                : <In w="w-72" value={s.value || ''} onChange={(e) => edit((x) => { x.steps[i].value = e.target.value })} aria-label="Value" />}
              <B v="o" onClick={() => i > 0 && edit((x) => { [x.steps[i - 1], x.steps[i]] = [x.steps[i], x.steps[i - 1]] })}>↑</B>
              <B v="o" onClick={() => i < w.steps.length - 1 && edit((x) => { [x.steps[i + 1], x.steps[i]] = [x.steps[i], x.steps[i + 1]] })}>↓</B>
              <B v="d" onClick={() => edit((x) => { x.steps.splice(i, 1) })}>✕</B></Row></div>
        ))}
      </div>
      <Row>Add step: {Object.entries(STEP).map(([k, v]) => <B key={k} v="o" onClick={() => edit((x) => { x.steps.push(k === 'send' ? { type: k, channel: 'whatsapp', text: 'Hi {{name}}' } : { type: k, value: k === 'wait' ? '1' : '' }) })}>{v}</B>)}</Row>
      <Row><Sel w="w-52" value={tc} onChange={(e) => setTc(e.target.value)}>{S.contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}{!S.contacts.length && <option value="">(add a contact first)</option>}</Sel><B onClick={run}>Run test</B><B v="o" onClick={onDone}>Done</B></Row>
      <pre className="min-h-20 rounded-2xl bg-night p-4 font-mono text-[13px] whitespace-pre-wrap text-accent">{log}</pre>
    </Page>
  )
}

export function Workflows() {
  const { S, update } = useWs()
  const [editing, setEditing] = useState(null)
  if (editing) return <WorkflowEditor id={editing} onDone={() => setEditing(null)} />
  return (
    <Page title="Workflows">
      <B onClick={() => { const w = { id: uid(), name: 'New workflow', event: 'incomingWA', on: false, steps: [] }; update((s) => { s.workflows.push(w) }); setEditing(w.id) }}>+ Add flow</B>
      <Table head={['Name', 'Event', 'Steps', 'Active', '']} rows={S.workflows.map((w) => (
        <tr key={w.id}><Td>{w.name}</Td><Td>{w.event}</Td><Td>{w.steps.length}</Td>
          <Td><input type="checkbox" aria-label={`${w.name} active`} checked={w.on} onChange={(e) => update((s) => { s.workflows.find((x) => x.id === w.id).on = e.target.checked })} className="size-4 accent-brand-500" /></Td>
          <Td><Row><B v="o" onClick={() => setEditing(w.id)}>Edit</B><B v="d" onClick={() => update((s) => { s.workflows = s.workflows.filter((x) => x.id !== w.id) })}>Delete</B></Row></Td></tr>))} />
    </Page>
  )
}

// ---- Sequences: timed drip messages. The scheduler runs inside the open workspace only. ----
export function Sequences() {
  const { S, update, toast, engine } = useWs()
  const [lab, setLab] = useState({})
  const create = onForm((d, f) => {
    const steps = d.steps.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [delay, unit, channel, ...t] = l.split('|'); return { delay: +delay || 0, unit: UNIT[unit] ? unit : 'days', channel: ['whatsapp', 'sms', 'email'].includes(channel) ? channel : 'whatsapp', text: t.join('|') } })
    if (!steps.length) return toast('Add at least one step')
    update((s) => { s.sequences.push({ id: uid(), name: d.name, steps }) }); f.reset()
  })
  function enroll(q) {
    let n = 0
    update((s) => {
      s.contacts.filter((c) => !lab[q.id] || c.label === lab[q.id]).forEach((c) => {
        if (!s.enrol.some((e) => e.seq === q.id && e.contact === c.id)) { s.enrol.push({ id: uid(), seq: q.id, contact: c.id, step: 0, due: Date.now() + dueIn(q.steps[0]), done: false }); n++ }
      })
    })
    toast(`${n} enrolled`)
    setTimeout(() => engine.tickSequences(), 50)
  }
  return (
    <Page title="Sequences" hint="Send a series of messages with delays. Steps are sent only while this workspace is open in a browser tab; there is no background scheduler yet.">
      <form onSubmit={create}><Row className="items-start"><In name="name" placeholder="Sequence name" required w="w-52" />
        <Area name="steps" rows={3} w="w-[26rem]" defaultValue={'0|minutes|whatsapp|Hi {{name}}, welcome!\n1|days|email|Hi {{name}}, here is more info.'} aria-label="Steps: delay|unit|channel|message" /><Submit>Create</Submit></Row></form>
      <Table head={['Sequence', 'Steps', 'Enrolled', 'Enroll contacts', '']} empty="No sequences yet." rows={S.sequences.map((q) => (
        <tr key={q.id}><Td>{q.name}</Td><Td>{q.steps.length}</Td><Td>{S.enrol.filter((e) => e.seq === q.id).length}</Td>
          <Td><Row><Sel w="w-32" value={lab[q.id] || ''} onChange={(e) => setLab({ ...lab, [q.id]: e.target.value })}><option value="">All</option>{S.labels.map((l) => <option key={l}>{l}</option>)}</Sel><B onClick={() => enroll(q)}>Enroll</B></Row></Td>
          <Td><B v="d" onClick={() => update((s) => { s.sequences = s.sequences.filter((x) => x.id !== q.id); s.enrol = s.enrol.filter((x) => x.seq !== q.id) })}>Delete</B></Td></tr>))} />
      <h3 className="font-display text-lg font-semibold">Enrollments</h3>
      <Table head={['Contact', 'Sequence', 'Next step', 'Due']} empty="None." rows={S.enrol.map((e) => {
        const q = S.sequences.find((x) => x.id === e.seq), c = S.contacts.find((x) => x.id === e.contact)
        return <tr key={e.id}><Td>{c?.name || '(deleted)'}</Td><Td>{q?.name || '(deleted)'}</Td><Td>{e.done ? 'finished' : e.step + 1}</Td><Td>{e.done ? '' : new Date(e.due).toLocaleString()}</Td></tr>
      })} />
    </Page>
  )
}

// ---- Integrations: saved outbound webhooks ----
export function Integrations() {
  const { S, update, toast } = useWs()
  const add = onForm((d, f) => {
    if (!/^https:\/\//.test(d.url)) return toast('Use an https URL')
    update((s) => { s.hooks.push({ id: uid(), name: d.name, url: d.url }) }); f.reset()
  })
  const test = async (h) => { try { await fetch(h.url, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ test: true, from: 'workspace' }) }); toast('Test request sent') } catch { toast('Request failed') } }
  return (
    <Page title="Integrations" hint="Save webhook endpoints and use them in a workflow's Send webhook step. Zapier, Make, Slack incoming webhooks and Google Apps Script URLs all work this way. Browsers block reading cross-site responses, so test calls report only that the request was sent.">
      <form onSubmit={add}><Row><In name="name" placeholder="Name (e.g. Slack alerts)" required w="w-52" /><In name="url" type="url" placeholder="https://hooks…" required w="w-80" /><Submit>Save</Submit></Row></form>
      <Table head={['Name', 'URL', '']} empty="None saved." rows={S.hooks.map((h) => <tr key={h.id}><Td>{h.name}</Td><Td className="break-all">{h.url}</Td><Td><Row><B v="o" onClick={() => test(h)}>Test</B><B v="d" onClick={() => update((s) => { s.hooks = s.hooks.filter((x) => x.id !== h.id) })}>Delete</B></Row></Td></tr>)} />
      <h3 className="font-display text-lg font-semibold">Inbound: push contacts in</h3>
      <InboundInfo />
      <Mut>Not built: native connector screens for Shopify, Facebook, HubSpot or Salesforce. Use webhooks through Zapier, Make or Pabbly.</Mut>
    </Page>
  )
}

// This workspace's own webhook addresses. The key is shown to owners and admins only.
function InboundInfo() {
  const [info, setInfo] = useState(null)
  useEffect(() => { api.workspaceInfo().then(setInfo).catch(() => {}) }, [])
  if (!info) return <Mut>Loading…</Mut>
  const base = location.origin + '/webhook'
  return (
    <div className="space-y-2">
      <Mut>Have Shopify, Pabbly, Zapier or Make POST JSON <Code>{'{"name","phone","email"}'}</Code> to <Code>{base}/contact/{info.slug}?key={info.inboundKey || 'ASK_AN_ADMIN'}</Code>. New contacts appear here and start newContact workflows while this workspace is open.</Mut>
      <Mut>Point Twilio's inbound message URL at <Code>{base}/twilio/{info.slug}</Code>. Both need a public https address (for example a tunnel).</Mut>
      {!info.inboundKey && <Mut>Only owners and admins can see the key.</Mut>}
    </div>
  )
}
