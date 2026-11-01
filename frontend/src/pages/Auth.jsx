import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../useAuth'
import { Logo } from '../components/ui'

// Visual guide only: the server enforces the real rule (10 to 200 characters).
function strength(pw) {
  let s = 0
  if (pw.length >= 10) s++
  if (pw.length >= 14) s++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++
  return s
}
const LEVELS = [['Too short', 'bg-red-500'], ['Okay', 'bg-amber-500'], ['Good', 'bg-lime-500'], ['Strong', 'bg-emerald-500'], ['Excellent', 'bg-emerald-600']]

const TEMPLATES = [['Offer message', 'Hi {{1}}! {{2}}% off. Use code {{3}}.'], ['Order cancelled', 'Hi {{1}}, order {{2}} has been cancelled.'], ['Delivery tracking', 'Hey {{1}}, your order from {{2}} has shipped.']]

function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-night p-12 text-white lg:flex lg:flex-col lg:justify-between" aria-hidden="true">
      <div className="pointer-events-none absolute inset-0 blur-3xl">
        <i className="absolute -top-10 -left-10 size-80 animate-float rounded-full bg-brand-500 opacity-60" />
        <i className="absolute -right-10 -bottom-10 size-96 animate-float rounded-full bg-accent opacity-40 [animation-delay:-6s]" />
      </div>
      <Link to="/" className="relative text-white no-underline"><Logo /></Link>
      <div className="relative space-y-6">
        <h2 className="animate-reveal text-4xl leading-tight font-semibold">Put growth on <span className="bg-gradient-to-r from-accent to-brand-500 bg-clip-text text-transparent">autopilot</span></h2>
        <p className="text-white/70">Ready-to-send WhatsApp and email messages. Add them to your workspace after you sign in.</p>
        <ul className="space-y-3">
          {TEMPLATES.map(([t, body], i) => (
            <li key={t} style={{ animationDelay: `${300 + i * 300}ms` }} className="animate-pop rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur"><b className="block text-sm">{t}</b><span className="text-sm text-white/70">{body}</span></li>
          ))}
        </ul>
      </div>
      <p className="relative text-sm text-white/50">&copy; 2026 Rokesh</p>
    </aside>
  )
}

const L = ({ children }) => <span className="mb-1.5 block text-sm font-medium">{children}</span>

function Password({ value, onChange, isNew, label = 'Password', autoComplete }) {
  const [show, setShow] = useState(false)
  const level = strength(value)
  return (
    <label className="block">
      <L>{label}</L>
      <div className="relative">
        <input type={show ? 'text' : 'password'} required minLength={isNew ? 10 : 1} maxLength={200} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete || (isNew ? 'new-password' : 'current-password')} placeholder={isNew ? 'At least 10 characters' : 'Your password'} className="field pr-16" />
        <button type="button" aria-pressed={show} onClick={() => setShow((s) => !s)} className="absolute inset-y-0 right-3 my-auto h-8 cursor-pointer rounded-lg px-2 text-sm font-semibold text-brand-600 hover:bg-brand-500/10">{show ? 'Hide' : 'Show'}</button>
      </div>
      {isNew && value && (
        <div className="animate-pop pt-2" aria-live="polite">
          <div className="flex gap-1.5">{[0, 1, 2, 3].map((i) => <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i < Math.max(level, 1) ? LEVELS[level][1] : 'bg-ink/15'}`} />)}</div>
          <p className="mt-1 text-xs opacity-70">{LEVELS[level][0]}</p>
        </div>
      )}
    </label>
  )
}

export default function Auth() {
  const { ready, user, needsSetup, refresh } = useAuth()
  const nav = useNavigate()
  const [mode, setMode] = useState('login') // login | register | forgot | reset
  const [f, setF] = useState({ email: '', password: '', name: '', phone: '', company: '', code: '' })
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [shake, setShake] = useState(0)
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: typeof v === 'string' ? v : v.target.value }))

  useEffect(() => { document.title = 'Login | Rokesh' }, [])
  useEffect(() => { if (ready && needsSetup) setMode('register') }, [ready, needsSetup])
  if (ready && user) return <Navigate to="/app" replace />

  async function submit(e) {
    e.preventDefault()
    setError(''); setNote(''); setBusy(true)
    try {
      if (mode === 'login') await api.login(f.email, f.password)
      else if (mode === 'register') await api.register({ email: f.email, password: f.password, name: f.name, phone: f.phone, company: f.company })
      else if (mode === 'forgot') {
        const r = await api.forgot(f.email)
        setNote(r.demoCode ? `No mail service is configured, so your code is ${r.demoCode} (shown only outside production).` : 'If that email has an account, a code is on its way.')
        setMode('reset'); return
      } else await api.reset({ email: f.email, code: f.code, password: f.password })
      await refresh(); nav('/app')
    } catch (err) { setError(err.message); setShake((k) => k + 1) }
    finally { setBusy(false) }
  }

  const titles = { login: ['Login to Rokesh', 'Sign in to continue.'], register: ['Create the owner account', 'The first account becomes the workspace owner.'], forgot: ['Forgot password', 'We will send a reset code.'], reset: ['Choose a new password', 'Enter the code and a new password.'] }
  const [title, sub] = titles[mode]

  return (
    <main className="grid min-h-screen bg-page lg:grid-cols-2">
      <BrandPanel />
      <section className="grid place-items-center p-6">
        <form key={shake} onSubmit={submit} className={`w-full max-w-sm space-y-5 ${error ? 'animate-shake' : 'animate-reveal'}`}>
          <Link to="/" className="text-ink no-underline lg:hidden"><Logo /></Link>
          <div><h1 className="text-3xl font-semibold">{title}</h1><p className="mt-1 opacity-70">{sub}</p></div>
          {mode === 'register' && <>
            <label className="block"><L>Full name</L><input value={f.name} onChange={set('name')} autoComplete="name" className="field" /></label>
            <label className="block"><L>Company</L><input value={f.company} onChange={set('company')} autoComplete="organization" className="field" /></label>
            <label className="block"><L>Mobile number</L><input type="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" placeholder="+91 98765 43210" className="field" /></label>
          </>}
          <label className="block"><L>Work email</L><input type="email" required value={f.email} onChange={set('email')} autoComplete="username" placeholder="you@company.com" className="field" /></label>
          {mode === 'reset' && <label className="block"><L>Reset code</L><input required inputMode="numeric" value={f.code} onChange={set('code')} autoComplete="one-time-code" className="field" /></label>}
          {mode !== 'forgot' && <Password value={f.password} onChange={set('password')} isNew={mode !== 'login'} label={mode === 'reset' ? 'New password' : 'Password'} />}
          {note && <p role="status" className="rounded-xl border border-brand-500/30 bg-brand-500/10 px-4 py-3 text-sm">{note}</p>}
          {error && <p role="alert" className="animate-pop rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <button disabled={busy} className="btn w-full">{busy && <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}{busy ? 'Please wait' : { login: 'Login', register: 'Create account', forgot: 'Send code', reset: 'Reset password' }[mode]}</button>
          <div className="flex justify-between text-sm">
            {mode === 'login' ? <button type="button" onClick={() => setMode('forgot')} className="cursor-pointer text-brand-600 hover:underline">Forgot password?</button> : <button type="button" onClick={() => setMode('login')} className="cursor-pointer text-brand-600 hover:underline">Back to login</button>}
            {mode === 'login' && needsSetup && <button type="button" onClick={() => setMode('register')} className="cursor-pointer text-brand-600 hover:underline">Start a trial</button>}
          </div>
          {mode === 'login' && !needsSetup && <p className="text-sm opacity-60">New here? Ask your workspace owner to add you.</p>}
        </form>
      </section>
    </main>
  )
}
