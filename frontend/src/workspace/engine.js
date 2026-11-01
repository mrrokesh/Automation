// Workspace engine: message delivery, workflow runner, AI agent, keyword rules, inbox polling, lead pulling
// and the sequence scheduler. Pure functions over a small "ctx": { get, update, toast, status }.
import { api } from '../api'

export const uid = () => Math.random().toString(36).slice(2, 9)
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const SEED_TEMPLATES = [
  ['Offer message', 'Ecommerce', 'Hi {{1}}! {{2}}% off on any purchase. Use code {{3}}. Offer ends tonight.'],
  ['Order cancelled', 'Ecommerce', 'Hi {{1}}! Your order {{2}} of {{3}} has been cancelled. We hope to see you again.'],
  ['COD to Prepaid', 'Ecommerce', 'Hey {{1}}, your order for {{2}} is confirmed. Pay now and get {{3}} off with code {{4}}.'],
  ['Delivery tracking', 'Ecommerce', 'Hey {{1}}, your order of {{2}} from {{3}} has shipped. Track it here.'],
  ['Admission enquiry', 'Education', 'Hi {{1}}, thanks for your interest in {{2}}. Reply YES to book a counselling call.'],
  ['Appointment reminder', 'Healthcare', 'Hi {{1}}, a reminder of your appointment on {{2}} at {{3}}.'],
  ['Webinar invite', 'Webinar', 'Hi {{1}}, join our webinar "{{2}}" on {{3}}. Register here.'],
]

export const defaultState = () => ({
  contacts: [], labels: ['Lead', 'Customer'], attrs: [], keywords: [], canned: [], products: [], hooks: [], pays: [],
  sequences: [], enrol: [], campaigns: [], msglog: [], meta: {}, hist: {}, seen: [], chat: { frt: 5 },
  templates: SEED_TEMPLATES.map(([name, cat, body]) => ({ id: uid(), name, cat, body, channel: 'whatsapp' })),
  workflows: [{ id: uid(), name: 'Admission Registration (sample)', event: 'incomingWA', on: false, steps: [
    { type: 'send', channel: 'whatsapp', text: 'Hi {{name}}, thanks for your interest! Which course are you looking for?' },
    { type: 'label', value: 'Lead' }, { type: 'wait', value: '1' },
    { type: 'send', channel: 'email', text: 'Hi {{name}}, here is our admission brochure.' }] }],
  agent: { name: 'Support agent', system: 'You are a helpful support agent. Answer briefly and politely.', knowledge: 'Our hours are 9am to 6pm Monday to Saturday.\nRefunds are processed in 5-7 working days.', exit: 'bye, goodbye, stop', auto: false },
  wallet: 50,
})

// {{name}} and {{1}} become the contact's name; other numbered variables are left as an ellipsis.
export const fill = (t, c) => String(t).replace(/\{\{\s*name\s*\}\}/g, c.name || '').replace(/\{\{\s*1\s*\}\}/g, c.name || '').replace(/\{\{\s*(\d+)\s*\}\}/g, '…')

export const UNIT = { minutes: 1, hours: 60, days: 1440 }
export const dueIn = (s) => (+s.delay || 0) * UNIT[s.unit || 'days'] * 60000

const tokens = (s) => String(s).toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || []
export function kwMatch(k, text) {
  return k.words.some((w) => {
    if (k.match === 'exact') return text === w
    const a = text.toLowerCase(), b = w.toLowerCase()
    if (a.includes(b) || b.includes(a)) return true
    const tb = new Set(tokens(w))
    return tokens(text).some((t) => tb.has(t))
  })
}

export function createEngine(ctx) {
  const { get, update, toast, status } = ctx
  const isLive = (channel) => (channel === 'email' ? status().emailLive : status().live)

  // Sends through the backend when the provider is configured; otherwise records a simulated send.
  async function deliver(channel, to, text, extra) {
    await sleep(120)
    let result = 'simulated'
    if (isLive(channel)) {
      try {
        const j = await api.send({ channel, to, text, ...(extra || {}) })
        result = j.status || 'sent'
      } catch (e) { toast(e.message); result = 'failed' }
    }
    update((s) => { s.msglog.push({ at: Date.now(), channel, to, status: result === 'failed' ? 'failed' : 'sent', mode: result }); if (s.msglog.length > 3000) s.msglog.splice(0, s.msglog.length - 3000) })
    return result
  }

  // Uses the AI provider on the backend when configured, else answers from the knowledge base by keyword overlap.
  async function agentReply(msgs) {
    const a = get().agent
    if (status().agentLive) {
      try {
        const j = await api.agent({ system: a.system, knowledge: a.knowledge, messages: msgs })
        if (j.reply) return j.reply
      } catch (e) { return 'Agent error: ' + e.message }
    }
    const q = new Set((msgs[msgs.length - 1].content.toLowerCase().match(/\w{3,}/g)) || [])
    let best = '', score = 0
    a.knowledge.split('\n').forEach((l) => { const sc = (l.toLowerCase().match(/\w{3,}/g) || []).filter((w) => q.has(w)).length; if (sc > score) { score = sc; best = l } })
    return best || "I'm not sure about that. A human agent will follow up."
  }

  // Runs a workflow's steps for one contact. `p` receives progress lines. Mutations of the contact go through update().
  async function execute(w, c, p, { test = false, inbound = '' } = {}) {
    p(`Trigger: ${w.event} for ${c.name}`)
    for (const [i, s] of w.steps.entries()) {
      const n = i + 1
      if (s.type === 'send') { const r = await deliver(s.channel, s.channel === 'email' ? c.email : c.phone, fill(s.text, c)); p(`${n}. send ${s.channel} -> ${r}: ${fill(s.text, c)}`) }
      else if (s.type === 'label') { update((st) => { const x = st.contacts.find((k) => k.id === c.id); if (x) x.label = s.value }); c = { ...c, label: s.value }; p(`${n}. label set to ${s.value}`) }
      else if (s.type === 'wait') { const secs = Math.min(+s.value || 0, test ? 3 : 30); await sleep(secs * 1000); p(`${n}. waited ${secs}s${secs < +s.value ? ' (capped)' : ''}`) }
      else if (s.type === 'cond') { if (c.label !== s.value) { p(`${n}. condition failed (label is "${c.label}"), stopping`); return } p(`${n}. condition passed`) }
      else if (s.type === 'webhook') { try { if (s.value) await fetch(s.value, { method: 'POST', mode: 'no-cors', body: JSON.stringify(c) }); p(`${n}. webhook ${s.value ? 'called' : '(no url)'}`) } catch { p(`${n}. webhook failed`) } }
      else if (s.type === 'attr') {
        const [k, ...v] = String(s.value).split('=')
        const a = get().attrs.find((x) => x.name === k.trim())
        if (a) { update((st) => { const x = st.contacts.find((q) => q.id === c.id); if (x) (x.attrs = x.attrs || {})[a.id] = v.join('=').trim() }); p(`${n}. set ${a.name}`) } else p(`${n}. no attribute named "${k}"`)
      }
      else if (s.type === 'call') {
        if (test) p(`${n}. call skipped in test (would read: ${fill(s.value, c)})`)
        else { const r = await api.call({ to: c.phone, text: fill(s.value, c) }).catch(() => ({ status: 'failed' })); p(`${n}. call -> ${r.status}`) }
      }
      else if (s.type === 'ai') {
        const r = await agentReply([{ role: 'user', content: inbound || 'Hello' }]); p(`${n}. AI reply: ${r}`)
        if (!test && c.phone && !/^HANDOFF\b/.test(r)) await deliver('whatsapp', c.phone, r)
      }
    }
    p('Done.')
  }

  const meta = (s, f) => (s.meta[f] = s.meta[f] || {})

  async function reply(m, text, bot = true) {
    const r = await deliver(m.channel === 'sms' ? 'sms' : 'whatsapp', m.from, text)
    if (status().live) await api.logMessage({ channel: m.channel, to: m.from, text, bot }).catch(() => {})
    return r
  }

  // Handles one inbound message: keyword rules, AI auto-reply, then "incoming" workflows.
  async function onInbound(m, c) {
    update((s) => { const mt = meta(s, m.from); mt.lastIn = m.at; mt.resolved = false })
    const st = get()
    const k = st.keywords.find((x) => kwMatch(x, m.text))
    if (!k) {
      if (!st.agent.auto || !status().agentLive) return false
      const history = [...(st.hist[m.from] || []), { role: 'user', content: m.text }].slice(-12)
      const out = await agentReply(history)
      if (/^HANDOFF\b/.test(out) || /^Agent (error|backend)/.test(out)) { update((s) => { meta(s, m.from).bot = false }); return true }
      update((s) => { s.hist[m.from] = [...history, { role: 'assistant', content: out }].slice(-12); meta(s, m.from).bot = true })
      await reply(m, out)
      return true
    }
    const a = k.action
    update((s) => { meta(s, m.from).bot = true })
    if (a.type === 'message') await reply(m, fill(a.text, c))
    else if (a.type === 'template') { const t = st.templates.find((x) => x.id === a.tpl); if (t) await reply(m, fill(t.body, c)) }
    else if (a.type === 'assign') update((s) => { const mt = meta(s, m.from); mt.assignee = a.agent; mt.bot = false })
    else if (a.type === 'workflow') { const w = st.workflows.find((x) => x.id === a.wf); if (w) await execute(w, c, () => {}, { inbound: m.text }) }
    return true
  }

  // Fetches the shared inbox; new inbound messages create contacts and fire automations.
  async function pollInbox() {
    let d
    try { d = await api.inbox() } catch { return null }
    const seen = new Set(get().seen)
    const fresh = d.messages.filter((m) => m.dir === 'in' && !seen.has(m.id))
    for (const m of fresh) {
      update((s) => { s.seen = [...new Set([...s.seen, m.id])].slice(-500) })
      let c = get().contacts.find((x) => x.phone === m.from)
      if (!c) { c = { id: uid(), name: m.from, phone: m.from, email: '', label: get().labels[0] || '' }; update((s) => { s.contacts.push(c) }) }
      if (await onInbound(m, c)) continue
      for (const w of get().workflows.filter((x) => x.on && x.event === (m.channel === 'whatsapp' ? 'incomingWA' : 'newContact'))) await execute(w, c, () => {}, { inbound: m.text })
    }
    return d.messages
  }

  // Leads pushed through /webhook/contact (Shopify, Zapier, ...) become contacts and start "newContact" workflows.
  async function pullLeads() {
    let d
    try { d = await api.leads() } catch { return }
    if (!d.leads.length) return
    for (const l of d.leads) {
      if (get().contacts.some((x) => (l.phone && x.phone === l.phone) || (l.email && x.email === l.email))) continue
      const c = { id: uid(), name: l.name || l.email || l.phone, phone: l.phone, email: l.email, label: get().labels[0] || '' }
      update((s) => { s.contacts.push(c) })
      for (const w of get().workflows.filter((x) => x.on && x.event === 'newContact')) await execute(w, c, () => {})
    }
    await api.ackLeads(d.leads.map((l) => l.id)).catch(() => {})
  }

  let ticking = false
  // Sends due sequence steps. Runs only while the workspace is open in a browser tab.
  async function tickSequences() {
    if (ticking) return
    ticking = true
    try {
      for (const e of get().enrol.filter((x) => !x.done && x.due <= Date.now())) {
        const st = get(), q = st.sequences.find((x) => x.id === e.seq), c = st.contacts.find((x) => x.id === e.contact)
        if (!q || !c) { update((s) => { const x = s.enrol.find((k) => k.id === e.id); if (x) x.done = true }); continue }
        const step = q.steps[e.step], dest = step.channel === 'email' ? c.email : c.phone
        if (dest) await deliver(step.channel, dest, fill(step.text, c))
        update((s) => {
          const x = s.enrol.find((k) => k.id === e.id); if (!x) return
          x.step++
          if (x.step >= q.steps.length) x.done = true; else x.due = Date.now() + dueIn(q.steps[x.step])
        })
      }
    } finally { ticking = false }
  }

  return { deliver, agentReply, execute, onInbound, pollInbox, pullLeads, tickSequences, meta }
}
