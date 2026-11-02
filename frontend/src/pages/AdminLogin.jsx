import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../useAuth'
import { Logo } from '../components/ui'

const isAdmin = (u) => u?.role === 'owner' || u?.role === 'admin' || u?.isPlatformAdmin
const home = (u) => (u?.isPlatformAdmin ? '/app/platform' : '/app/admin')
const L = ({ children }) => <span className="mb-1.5 block text-sm font-medium">{children}</span>

// Dedicated sign-in for the admin portal at /admin. Only owners and admins get through; anyone else is signed back out.
export default function AdminLogin() {
  const { ready, user, refresh, signOut } = useAuth()
  const nav = useNavigate()
  const [f, setF] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [shake, setShake] = useState(0)
  useEffect(() => { document.title = 'Admin sign-in | Rokesh' }, [])

  if (ready && isAdmin(user)) return <Navigate to={home(user)} replace />

  async function submit(e) {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      const { user: u } = await api.login(f.email, f.password)
      if (!isAdmin(u)) { await signOut(); throw new Error('This account does not have admin access.') }
      await refresh(); nav(home(u))
    } catch (err) { setError(err.message); setShake((k) => k + 1) }
    finally { setBusy(false) }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-night p-6">
      <form key={shake} onSubmit={submit} className={`w-full max-w-sm space-y-5 rounded-[28px] border border-white/10 bg-page p-8 shadow-soft ${error ? 'animate-shake' : 'animate-reveal'}`}>
        <Link to="/" className="inline-block text-ink no-underline"><Logo /></Link>
        <div><h1 className="text-3xl font-semibold">Admin sign-in</h1><p className="mt-1 opacity-70">For workspace owners, admins and platform admins.</p></div>
        {ready && user && !isAdmin(user) && <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm">You are signed in as {user.email}, which does not have admin access. Sign in with an admin account below.</p>}
        <label className="block"><L>Email</L><input type="email" required autoComplete="username" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className="field" /></label>
        <label className="block"><L>Password</L><input type="password" required maxLength={200} autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} className="field" /></label>
        {error && <p role="alert" className="animate-pop rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="btn w-full">{busy ? 'Please wait' : 'Sign in to admin'}</button>
        <p className="text-center text-sm"><Link to="/login" className="text-brand-600">Regular login</Link></p>
      </form>
    </main>
  )
}
