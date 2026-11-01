import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { Reveal } from '../components/ui'

const L = ({ children }) => <span className="mb-1.5 block text-sm font-medium">{children}</span>

// Public support page: creates a ticket that appears in the admin portal.
export default function Support() {
  const [msg, setMsg] = useState({ text: '', error: false })
  const [busy, setBusy] = useState(false)
  useEffect(() => { document.title = 'Support | Rokesh' }, [])

  async function submit(e) {
    e.preventDefault()
    const form = e.currentTarget
    setBusy(true)
    try { await api.support(Object.fromEntries(new FormData(form))); setMsg({ text: 'Thanks. We received your request and will reply by email.', error: false }); form.reset() }
    catch (err) { setMsg({ text: err.message, error: true }) }
    finally { setBusy(false) }
  }

  return (
    <section className="pb-20">
      <div className="wrap max-w-[720px]">
        <Reveal as="h1" className="font-display text-[clamp(30px,4.4vw,48px)] leading-tight font-semibold">How can we help?</Reveal>
        <Reveal as="p" delay={0.08} className="mt-4 text-lg opacity-80">Send us a question or a problem and our team will reply by email. You may find an answer faster in the <Link to="/guides" className="text-brand-600">guides</Link>.</Reveal>
        <Reveal as="form" delay={0.12} onSubmit={submit} className="mt-8 grid gap-4 rounded-[28px] border border-ink/10 bg-white/85 p-7 shadow-soft">
          <label><L>Your name</L><input name="name" autoComplete="name" className="field" /></label>
          <label><L>Email</L><input name="email" type="email" required autoComplete="email" className="field" /></label>
          <label><L>Subject</L><input name="subject" required maxLength={150} className="field" /></label>
          <label><L>Message</L><textarea name="message" required rows={6} maxLength={5000} className="field" /></label>
          <button disabled={busy} className="btn w-full">{busy ? 'Sending…' : 'Send request'}</button>
          <p role="status" className={`text-center text-sm ${msg.error ? 'text-red-600' : 'text-emerald-700'}`}>{msg.text}</p>
        </Reveal>
      </div>
    </section>
  )
}
