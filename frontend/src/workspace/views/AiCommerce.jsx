import { useRef, useState } from 'react'
import { api } from '../../api'
import { useWs } from '../context'
import { A, B, In, Mut, onForm, Page, Row, Sel, Submit, Area, Table, Td } from '../ui'

// ---- AI Chat Agent: settings plus a test chat ----
export function Agent() {
  const { S, update, toast, engine, status } = useWs()
  const [form, setForm] = useState(S.agent)
  const [chat, setChat] = useState([])
  const [text, setText] = useState('')
  const hist = useRef([])
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const save = () => { update((s) => { s.agent = form }); toast('Saved') }
  async function send(e) {
    e.preventDefault()
    const t = text.trim(); if (!t) return
    setText(''); setChat((c) => [...c, ['u', t]]); hist.current.push({ role: 'user', content: t })
    if (S.agent.exit.split(',').some((x) => x.trim() && t.toLowerCase().includes(x.trim().toLowerCase()))) return setChat((c) => [...c, ['a', 'Goodbye! Conversation ended.']])
    const r = await engine.agentReply(hist.current)
    hist.current.push({ role: 'assistant', content: r })
    setChat((c) => [...c, ['a', /^HANDOFF\b/.test(r) ? '(would hand off to a human agent)' : r]])
  }
  return (
    <Page title="AI Chat Agent">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <label className="block text-sm">Name<In className="mt-1 w-full" w="" value={form.name} onChange={set('name')} /></label>
          <label className="block text-sm">System prompt<Area className="mt-1" rows={4} value={form.system} onChange={set('system')} /></label>
          <label className="block text-sm">Knowledge base (one fact per line)<Area className="mt-1" rows={6} value={form.knowledge} onChange={set('knowledge')} /></label>
          <label className="block text-sm">Exit phrases (comma separated)<In className="mt-1 w-full" w="" value={form.exit} onChange={set('exit')} /></label>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={form.auto} onChange={set('auto')} className="mt-1 size-4 accent-brand-500" />Auto-reply to inbound messages that match no keyword (needs an AI key; unanswerable chats go to a human)</label>
          <B onClick={save}>Save</B>
          <Mut>{status.agentLive ? `Replies come from ${status.agentProvider} configured on your server (usage is billed by that provider).` : 'No ANTHROPIC_API_KEY or GEMINI_API_KEY in backend/.env: answers come from the knowledge base by keyword match.'}</Mut>
        </div>
        <div className="space-y-2">
          <p className="text-sm">New chat</p>
          <div className="h-72 space-y-1.5 overflow-auto rounded-2xl border border-ink/10 bg-white/70 p-3" aria-live="polite">
            {chat.map(([who, t], i) => <div key={i} className={who === 'u' ? 'text-right' : ''}><span className={`inline-block max-w-[85%] rounded-xl px-3 py-1.5 ${who === 'u' ? 'bg-brand-600 text-white' : 'bg-ink/10'}`}>{t}</span></div>)}
          </div>
          <form onSubmit={send}><Row><In className="min-w-0 flex-1" w="" placeholder="Type a message" value={text} onChange={(e) => setText(e.target.value)} /><Submit>Send</Submit></Row></form>
        </div>
      </div>
    </Page>
  )
}

const contactOpts = (S) => S.contacts.length ? S.contacts.map((c) => <option key={c.id} value={c.id}>{c.name} {c.phone}</option>) : <option value="">(add a contact first)</option>

// ---- Voice calls (text-to-speech through Twilio) ----
export function Voice() {
  const { S, toast } = useWs()
  const [out, setOut] = useState('')
  const call = onForm(async (d) => {
    const c = S.contacts.find((x) => x.id === d.c); if (!c) return toast('Pick a contact')
    if (!confirm(`Place a call to ${c.name} (${c.phone})?`)) return
    const r = await api.call({ to: c.phone, text: d.t }).catch((e) => ({ status: 'failed', error: e.message }))
    setOut(`${r.status}: ${r.error || r.note || r.sid || ''}`)
  })
  return (
    <Page title="Voice Calls" hint="Places an outbound call that reads your script aloud (text-to-speech). It is not a two-way conversational voice AI. Needs Twilio credentials and a voice-capable number. Calls cost money and phone numbers must be E.164.">
      <form onSubmit={call}><Row><Sel name="c" w="w-56">{contactOpts(S)}</Sel><In name="t" placeholder="Script (max 500 chars)" required maxLength={500} w="w-[26rem] max-w-full" /><Submit>Call</Submit></Row></form>
      {out && <p>{out}</p>}
    </Page>
  )
}

// ---- Payment links (Razorpay) ----
export function Payments() {
  const { S, update, toast, engine } = useWs()
  const [out, setOut] = useState(null)
  const pay = onForm(async (d) => {
    const c = S.contacts.find((x) => x.id === d.c); if (!c) return toast('Pick a contact')
    const r = await api.paymentLink({ amount: d.amount, description: d.d, name: c.name, phone: c.phone }).catch((e) => ({ status: 'failed', error: e.message }))
    update((s) => { s.pays.push({ at: Date.now(), name: c.name, amount: +d.amount, desc: d.d, status: r.status, url: r.url || '' }) })
    if (r.status === 'created') {
      const s = await engine.deliver('whatsapp', c.phone, `Hi ${c.name}, please pay ₹${d.amount} for ${d.d}: ${r.url}`)
      setOut(<>Link: <A href={r.url} target="_blank" rel="noreferrer">{r.url}</A> (WhatsApp: {s})</>)
    } else setOut(`${r.status}: ${r.error || r.note || ''}`)
  })
  return (
    <Page title="Payment Links" hint="Creates a Razorpay payment link (INR) and can send it on WhatsApp. This is a link, not WhatsApp Pay inside the chat. Needs Razorpay keys in backend/.env.">
      <form onSubmit={pay}><Row><Sel name="c" w="w-56">{contactOpts(S)}</Sel><In name="amount" type="number" min="1" step="0.01" placeholder="Amount (INR)" required w="w-36" /><In name="d" placeholder="Description" required w="w-56" /><Submit>Create link</Submit></Row></form>
      {out && <p>{out}</p>}
      <Table head={['When', 'Contact', 'Amount', 'Status', 'Link']} empty="No links yet." rows={[...S.pays].reverse().map((p, i) => <tr key={i}><Td>{new Date(p.at).toLocaleString()}</Td><Td>{p.name}</Td><Td>₹{p.amount}</Td><Td>{p.status}</Td><Td>{p.url && <A href={p.url} target="_blank" rel="noreferrer">open</A>}</Td></tr>)} />
    </Page>
  )
}

// ---- Email verifier: syntax, disposable domains, MX lookup ----
export function Verifier() {
  const [res, setRes] = useState(null)
  const [busy, setBusy] = useState(false)
  const { toast } = useWs()
  const run = onForm(async (d) => {
    setBusy(true)
    try { setRes((await api.verifyEmails(d.emails.split(/[\s,;]+/).filter(Boolean))).results) } catch (e) { toast(e.message) }
    setBusy(false)
  })
  const label = { valid_domain: 'Domain can receive mail', no_mx: 'No mail server for domain', disposable: 'Disposable address', invalid_syntax: 'Invalid format' }
  return (
    <Page title="Email Verifier" hint="Checks the format, a list of disposable domains, and whether the domain has a mail server. It never contacts the mailbox, so valid means the domain can receive mail, not that the address exists. Up to 100 per request.">
      <form onSubmit={run} className="space-y-3"><Area name="emails" rows={5} placeholder="One email per line" required aria-label="Emails" /><button disabled={busy} className="btn btn-sm !px-4 !py-1.5 !text-[13px]">{busy ? 'Checking…' : 'Verify'}</button></form>
      {res && <Table head={['Email', 'Result']} rows={res.map((r) => <tr key={r.email}><Td>{r.email}</Td><Td>{label[r.result] || r.result}</Td></tr>)} />}
    </Page>
  )
}
