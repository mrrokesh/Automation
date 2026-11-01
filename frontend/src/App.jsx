import { useEffect, useState } from 'react'
import { api } from './api'

// Simple visual guide only: the server enforces the real rule (10 to 200 characters).
function strength(pw) {
  let s = 0
  if (pw.length >= 10) s++
  if (pw.length >= 14) s++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++
  return s
}
const LEVELS = [
  { label: 'Too short', bar: 'bg-red-500' },
  { label: 'Okay', bar: 'bg-amber-500' },
  { label: 'Good', bar: 'bg-lime-500' },
  { label: 'Strong', bar: 'bg-emerald-500' },
  { label: 'Excellent', bar: 'bg-emerald-600' },
]

function Logo({ className = '' }) {
  return (
    <div className={`flex items-center gap-2.5 text-xl font-extrabold tracking-tight ${className}`}>
      <span className="relative grid size-8 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-accent shadow-lg shadow-brand-500/40">
        <span className="size-3.5 -rotate-45 rounded-full border-[3px] border-white border-r-transparent" />
      </span>
      Rokesh
    </div>
  )
}

function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-[#2a1f3d] text-white lg:flex lg:flex-col lg:justify-between lg:p-12" aria-hidden="true">
      <div className="pointer-events-none absolute inset-0 blur-3xl">
        <i className="animate-float absolute -left-10 top-10 size-80 rounded-full bg-brand-500 opacity-60" />
        <i className="animate-float-slow absolute -right-10 bottom-10 size-96 rounded-full bg-accent opacity-40" />
        <i className="animate-float absolute left-1/3 top-1/2 size-64 rounded-full bg-fuchsia-500 opacity-30 [animation-delay:-6s]" />
      </div>
      <Logo className="relative" />
      <div className="relative space-y-6">
        <h2 className="animate-fade-up text-4xl font-extrabold leading-tight tracking-tight">
          Put growth on{' '}
          <span className="animate-shine bg-gradient-to-r from-brand-500 via-accent to-brand-500 bg-[length:200%_auto] bg-clip-text text-transparent">
            autopilot
          </span>
        </h2>
        <p className="animate-fade-up text-slate-300 [animation-delay:120ms]">
          One workspace for every conversation, workflow and customer journey.
        </p>
        <ul className="space-y-3">
          {['New lead captured', 'AI qualifies in seconds', 'Reply sent on WhatsApp'].map((t, i) => (
            <li
              key={t}
              style={{ animationDelay: `${300 + i * 350}ms` }}
              className="animate-pop flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur"
            >
              <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-accent text-sm font-bold">{i + 1}</span>
              {t}
            </li>
          ))}
        </ul>
      </div>
      <p className="relative text-sm text-slate-400">&copy; 2026 Rokesh</p>
    </aside>
  )
}

function AuthForm({ mode, onDone, onSwitch }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [shakeKey, setShakeKey] = useState(0)
  const isRegister = mode === 'register'
  const level = strength(password)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { user } = await (isRegister ? api.register : api.login)(email, password)
      onDone(user)
    } catch (err) {
      setError(err.message)
      setShakeKey((k) => k + 1) // restarts the shake animation on every failure
    } finally {
      setBusy(false)
    }
  }

  const field =
    'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'

  return (
    <form
      key={shakeKey}
      onSubmit={submit}
      className={`w-full max-w-sm space-y-5 ${error ? 'animate-shake' : 'animate-fade-up'}`}
    >
      <Logo className="mb-2 text-slate-900 lg:hidden dark:text-white" />
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {isRegister ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          {isRegister ? 'Start automating in minutes.' : 'Sign in to continue.'}
        </p>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</span>
        <input type="email" required autoComplete="username" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Password</span>
        <div className="relative">
          <input
            type={show ? 'text' : 'password'} required minLength={isRegister ? 10 : 1}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            placeholder={isRegister ? 'At least 10 characters' : 'Your password'}
            value={password} onChange={(e) => setPassword(e.target.value)} className={`${field} pr-16`}
          />
          <button
            type="button" onClick={() => setShow((s) => !s)} aria-pressed={show}
            className="absolute inset-y-0 right-3 my-auto h-8 rounded-lg px-2 text-sm font-semibold text-brand-600 hover:bg-brand-500/10 dark:text-brand-500"
          >
            {show ? 'Hide' : 'Show'}
          </button>
        </div>
        {isRegister && password && (
          <div className="animate-pop pt-1" aria-live="polite">
            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i < Math.max(level, 1) ? LEVELS[level].bar : 'bg-slate-200 dark:bg-slate-700'}`} />
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{LEVELS[level].label}</p>
          </div>
        )}
      </label>

      {error && (
        <p role="alert" className="animate-pop rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </p>
      )}

      <button
        disabled={busy}
        className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-brand-600 via-brand-500 to-accent py-3 font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/40 active:translate-y-0 active:scale-[0.98] disabled:opacity-70 disabled:hover:translate-y-0"
      >
        {busy && <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
        {busy ? 'Please wait' : isRegister ? 'Create account' : 'Sign in'}
      </button>

      <p className="text-center text-sm text-slate-600 dark:text-slate-400">
        {isRegister ? 'Already have an account? ' : 'New here? '}
        <button type="button" onClick={onSwitch} className="font-semibold text-brand-600 hover:underline dark:text-brand-500">
          {isRegister ? 'Sign in' : 'Create one'}
        </button>
      </p>
    </form>
  )
}

function Welcome({ user, onSignOut }) {
  const initial = (user.email || '?')[0].toUpperCase()
  return (
    <div className="animate-fade-up w-full max-w-md space-y-6 text-center">
      <div className="mx-auto grid size-20 animate-pop place-items-center rounded-3xl bg-gradient-to-br from-brand-500 to-accent text-3xl font-extrabold text-white shadow-xl shadow-brand-500/40">
        {initial}
      </div>
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Welcome</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">Signed in as {user.email}</p>
      </div>
      <button
        onClick={onSignOut}
        className="rounded-xl border border-slate-300 px-5 py-2.5 font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:border-brand-500 hover:bg-white dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-900"
      >
        Sign out
      </button>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)
  const [mode, setMode] = useState('login')

  useEffect(() => {
    api.me().then((d) => setUser(d.user)).catch(() => {}).finally(() => setReady(true))
  }, [])

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 dark:bg-slate-950" role="status" aria-label="Loading">
        <span className="size-8 animate-spin rounded-full border-4 border-brand-500/30 border-t-brand-500" />
      </div>
    )
  }

  return (
    <main className="grid min-h-screen bg-[#f3f1ef] lg:grid-cols-2 dark:bg-slate-950">
      <BrandPanel />
      <section className="grid place-items-center p-6">
        {user ? (
          <Welcome user={user} onSignOut={() => api.logout().then(() => setUser(null))} />
        ) : (
          <AuthForm key={mode} mode={mode} onDone={setUser} onSwitch={() => setMode(mode === 'login' ? 'register' : 'login')} />
        )}
      </section>
    </main>
  )
}
