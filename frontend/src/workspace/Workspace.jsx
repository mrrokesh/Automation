import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from '../useAuth'
import { Logo } from '../components/ui'
import WorkspaceProvider from './WorkspaceProvider'
import { useWs } from './context'
import { Attributes, Contacts, Dashboard, Forms, Labels } from './views/Data'
import { Campaigns, Catalog, QR, Templates } from './views/Marketing'
import { Integrations, Keywords, Sequences, Workflows } from './views/Automation'
import { Canned, Inbox, Team } from './views/Support'
import { Agent, Payments, Verifier, Voice } from './views/AiCommerce'
import { AdminAudit, AdminDemos, AdminOverview, AdminSystem, AdminTickets, AdminUsers } from './views/Admin'

const MENU = [
  ['Dashboard', [['dash', 'Dashboard', Dashboard]]],
  ['Data', [['contacts', 'Contacts', Contacts], ['attributes', 'Attributes', Attributes], ['labels', 'Labels', Labels], ['forms', 'Smart Forms', Forms]]],
  ['Marketing', [['campaigns', 'Broadcasts', Campaigns], ['templates', 'Template Library', Templates], ['qr', 'QR & Chat Button', QR]]],
  ['Automations', [['keywords', 'Keywords', Keywords], ['workflows', 'Workflows', Workflows], ['sequences', 'Sequences', Sequences], ['integrations', 'Integrations', Integrations]]],
  ['Agentic AI', [['agent', 'AI Chat Agent', Agent], ['voice', 'Voice Calls', Voice]]],
  ['Support', [['inbox', 'Team Inbox', Inbox], ['canned', 'Canned Responses', Canned], ['team', 'Team & Chat Settings', Team]]],
  ['Commerce', [['catalog', 'WhatsApp Catalog', Catalog], ['payments', 'Payment Links', Payments]]],
  ['Tools', [['verifier', 'Email Verifier', Verifier]]],
]
// Owners and admins also get the admin portal. The API enforces this too.
const ADMIN = ['Admin', [['admin', 'Overview', AdminOverview], ['admin-users', 'Users', AdminUsers], ['admin-demos', 'Demo requests', AdminDemos], ['admin-support', 'Support tickets', AdminTickets], ['admin-audit', 'Audit log', AdminAudit], ['admin-system', 'System', AdminSystem]]]
const isAdmin = (u) => u?.role === 'owner' || u?.role === 'admin'

function Shell() {
  const { S, status, saveState } = useWs()
  const { user, signOut } = useAuth()
  const menu = isAdmin(user) ? [...MENU, ADMIN] : MENU
  const items = menu.flatMap(([, i]) => i)
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => { setOpen(false) }, [pathname])
  const current = items.find(([k]) => pathname.endsWith('/' + k))?.[1] || 'Workspace'
  useEffect(() => { document.title = `${current} | Rokesh` }, [current])
  const link = ({ isActive }) => `block rounded-xl px-3 py-2 text-sm no-underline transition ${isActive ? 'bg-brand-500/15 font-semibold text-brand-600' : 'text-ink hover:bg-ink/5'}`

  return (
    <div className="flex min-h-screen bg-page">
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 shrink-0 overflow-y-auto border-r border-ink/10 bg-white p-4 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <Link to="/" className="mb-4 block text-ink no-underline"><Logo /></Link>
        {menu.map(([group, items]) => (
          <div key={group} className="mb-3"><h6 className="px-3 pb-1 text-[11px] font-semibold tracking-wide uppercase opacity-50">{group}</h6>
            {items.map(([k, label]) => <NavLink key={k} to={`/app/${k}`} className={link}>{label}</NavLink>)}</div>
        ))}
      </aside>
      {open && <button aria-label="Close menu" className="fixed inset-0 z-20 bg-night/40 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-ink/10 bg-white/85 px-4 py-3 backdrop-blur">
          <button type="button" aria-label="Menu" onClick={() => setOpen(true)} className="grid size-9 cursor-pointer place-items-center rounded-lg border border-ink/15 text-lg lg:hidden">☰</button>
          <b className="font-display text-lg">{current}</b>
          <span className="ml-auto hidden rounded-full border border-ink/15 bg-white px-3 py-1 text-xs sm:inline">{status.live ? 'Live delivery' : 'Simulated delivery'}</span>
          <span className="text-xs opacity-60" aria-live="polite">{saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Not saved' : 'Saved'}</span>
          <span className="hidden text-sm opacity-70 md:inline">{user?.email}</span>
          <button type="button" onClick={signOut} className="btn btn-o btn-sm !px-4 !py-1.5 !text-[13px]">Sign out</button>
        </header>
        <main className="p-4 sm:p-6">
          <Routes>
            <Route index element={<Navigate to="dash" replace />} />
            {items.map(([k, , View]) => <Route key={k} path={k} element={<View />} />)}
            <Route path="*" element={<Navigate to="/app/dash" replace />} />
          </Routes>
          <p className="sr-only">{S.contacts.length} contacts</p>
        </main>
      </div>
    </div>
  )
}

export default function Workspace() {
  return <WorkspaceProvider><Shell /></WorkspaceProvider>
}
