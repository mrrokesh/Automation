// Outbound providers: Twilio (SMS, WhatsApp, calls), Resend (email), Razorpay (payment links), AI agent.
// Keys are read from the environment at call time. Functions return { code, out } or { status, ... }.
export const clip = (s, n) => String(s ?? '').slice(0, n)
export const e164 = /^\+[1-9]\d{6,14}$/
export const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

const env = () => process.env
export const twilioLive = () => Boolean(env().TWILIO_ACCOUNT_SID && env().TWILIO_AUTH_TOKEN)
export const emailLive = () => Boolean(env().RESEND_API_KEY && env().EMAIL_FROM)
export const razorpayLive = () => Boolean(env().RAZORPAY_KEY_ID && env().RAZORPAY_KEY_SECRET)

// AGENT_PROVIDER=anthropic|gemini forces one; otherwise whichever key is set (Anthropic first).
export function agentProvider() {
  const e = env(), f = e.AGENT_PROVIDER
  if (f === 'gemini' && e.GEMINI_API_KEY) return 'gemini'
  if (f === 'anthropic' && e.ANTHROPIC_API_KEY) return 'anthropic'
  if (f) return null
  return e.ANTHROPIC_API_KEY ? 'anthropic' : e.GEMINI_API_KEY ? 'gemini' : null
}

const basic = (a, b) => 'Basic ' + Buffer.from(`${a}:${b}`).toString('base64')

export async function twilioSend(channel, to, text) {
  const e = env()
  const from = channel === 'whatsapp' ? e.TWILIO_WHATSAPP_FROM : e.TWILIO_SMS_FROM
  if (!from) return { status: 'failed', error: `TWILIO_${channel === 'whatsapp' ? 'WHATSAPP' : 'SMS'}_FROM is not set` }
  const wrap = (n) => (channel === 'whatsapp' ? `whatsapp:${n}` : n)
  const body = new URLSearchParams({ To: wrap(to), From: from.startsWith('whatsapp:') || channel === 'sms' ? from : `whatsapp:${from}`, Body: text })
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${e.TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: 'POST', headers: { Authorization: basic(e.TWILIO_ACCOUNT_SID, e.TWILIO_AUTH_TOKEN), 'Content-Type': 'application/x-www-form-urlencoded' }, body })
  const j = await r.json().catch(() => ({}))
  return r.ok ? { status: 'sent', sid: j.sid } : { status: 'failed', error: j.message || `HTTP ${r.status}` }
}

export async function twilioCall(to, text) {
  const e = env(), from = e.TWILIO_VOICE_FROM || e.TWILIO_SMS_FROM
  if (!twilioLive() || !from) return { code: 200, out: { status: 'simulated', note: 'Twilio credentials or TWILIO_VOICE_FROM missing' } }
  const esc = text.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c])
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${e.TWILIO_ACCOUNT_SID}/Calls.json`, {
    method: 'POST', headers: { Authorization: basic(e.TWILIO_ACCOUNT_SID, e.TWILIO_AUTH_TOKEN), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, From: from, Twiml: `<Response><Say>${esc}</Say></Response>` }) })
  const j = await r.json().catch(() => ({}))
  return r.ok ? { code: 200, out: { status: 'sent', sid: j.sid } } : { code: 502, out: { status: 'failed', error: j.message || `HTTP ${r.status}` } }
}

export async function resendSend({ to, subject, text, html, from: wantFrom }) {
  const e = env()
  // A custom sender is honoured only on the same domain as EMAIL_FROM (the verified domain).
  const dom = (s) => (String(s).match(/@([^>\s]+)/) || [])[1]?.toLowerCase()
  const from = wantFrom && dom(wantFrom) && dom(wantFrom) === dom(e.EMAIL_FROM) && !/[\r\n]/.test(wantFrom) ? clip(wantFrom, 200) : e.EMAIL_FROM
  const body = { from, to: [to], subject: clip(subject || 'Message', 150) }
  if (html) body.html = clip(html, 200000); else body.text = clip(text, 5000)
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${e.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const j = await r.json().catch(() => ({}))
  return r.ok ? { code: 200, out: { status: 'sent', id: j.id } } : { code: 502, out: { status: 'failed', error: j.message || `HTTP ${r.status}` } }
}

export async function razorpayLink(b, amount) {
  const e = env()
  const r = await fetch('https://api.razorpay.com/v1/payment_links', { method: 'POST', headers: { Authorization: basic(e.RAZORPAY_KEY_ID, e.RAZORPAY_KEY_SECRET), 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, currency: 'INR', description: clip(b.description, 200), customer: { name: clip(b.name, 80), contact: clip(b.phone, 20) } }) })
  const j = await r.json().catch(() => ({}))
  return r.ok ? { code: 200, out: { status: 'created', url: j.short_url } } : { code: 502, out: { status: 'failed', error: j.error?.description || `HTTP ${r.status}` } }
}

// Forwards a cleaned conversation to the chosen AI provider. Keys stay on the server.
export async function askAgent(provider, system, msgs) {
  const e = env()
  if (provider === 'gemini') {
    const model = e.AGENT_MODEL || 'gemini-flash-latest'
    const r = await fetch(`${e.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com'}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST', headers: { 'x-goog-api-key': e.GEMINI_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: msgs.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })), generationConfig: { maxOutputTokens: 400 } }) })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) return { code: 502, out: { error: j.error?.message || `Gemini HTTP ${r.status}` } }
    const reply = (j.candidates?.[0]?.content?.parts || []).map((x) => x.text || '').join('').trim()
    return { code: 200, out: { reply: reply || null } }
  }
  const r = await fetch((e.ANTHROPIC_BASE_URL || 'https://api.anthropic.com') + '/v1/messages', {
    method: 'POST', headers: { 'x-api-key': e.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: e.AGENT_MODEL || 'claude-sonnet-5-5', max_tokens: 400, system, messages: msgs }) })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) return { code: 502, out: { error: j.error?.message || `Anthropic HTTP ${r.status}` } }
  const reply = (j.content || []).filter((x) => x.type === 'text').map((x) => x.text).join('').trim()
  return { code: 200, out: { reply: reply || null } }
}

const DISPOSABLE = new Set(['mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com', 'yopmail.com', 'trashmail.com', 'sharklasers.com', 'getnada.com', 'throwawaymail.com'])

// Email verifier: syntax, disposable-domain list and MX lookup. It never contacts the mail server,
// so "valid_domain" means the domain can receive mail, not that the mailbox exists.
export async function verifyEmails(list) {
  const { resolveMx } = (await import('node:dns')).promises
  const cache = {}, results = []
  for (const e of list) {
    if (!emailRe.test(e) || e.length > 254) { results.push({ email: e, result: 'invalid_syntax' }); continue }
    const d = e.split('@')[1]
    if (DISPOSABLE.has(d)) { results.push({ email: e, result: 'disposable' }); continue }
    if (!(d in cache)) cache[d] = await resolveMx(d).then((r) => r.length > 0).catch(() => false)
    results.push({ email: e, result: cache[d] ? 'valid_domain' : 'no_mx' })
  }
  return results
}
