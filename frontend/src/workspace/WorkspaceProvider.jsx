import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../useAuth'
import { WorkspaceContext } from './context'
import { createEngine, defaultState } from './engine'

// Loads the workspace document from the server, keeps it in memory, and saves changes shortly after each edit.
export default function WorkspaceProvider({ children }) {
  const { user } = useAuth()
  const [S, setS] = useState(null)
  const [status, setStatus] = useState({})
  const [toastMsg, setToastMsg] = useState('')
  const [saveState, setSaveState] = useState('saved') // saved | saving | error
  const ref = useRef(null)
  const statusRef = useRef({})
  const timer = useRef(0)
  const toastTimer = useRef(0)

  const flush = useCallback(async () => {
    setSaveState('saving')
    try { await api.saveState(ref.current); setSaveState('saved') } catch { setSaveState('error') }
  }, [])

  const update = useCallback((fn) => {
    const next = structuredClone(ref.current)
    fn(next)
    ref.current = next
    setS(next)
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, 600)
  }, [flush])

  const toast = useCallback((m) => {
    setToastMsg(m)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastMsg(''), 2500)
  }, [])

  useEffect(() => {
    let alive = true
    api.status().then((s) => { if (alive) { statusRef.current = s; setStatus(s) } }).catch(() => {})
    api.workspaceState().then((d) => {
      if (!alive) return
      const base = defaultState()
      ref.current = { ...base, ...(d.state || {}) } // new fields added in later versions get their defaults
      setS(ref.current)
      if (!d.state) flush()
    }).catch(() => { if (alive) setSaveState('error') })
    // Save pending edits if the tab closes right after a change.
    const bye = () => { if (timer.current) { clearTimeout(timer.current); fetch('/api/workspace/state', { method: 'PUT', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state: ref.current }) }) } }
    addEventListener('pagehide', bye)
    return () => { alive = false; removeEventListener('pagehide', bye) }
  }, [flush])

  const engine = useMemo(() => createEngine({ get: () => ref.current, update, toast, status: () => statusRef.current }), [update, toast])

  // Background jobs while the workspace is open: inbox, new leads and the sequence scheduler.
  useEffect(() => {
    if (!S) return
    const ids = [
      setInterval(() => { if (statusRef.current.live) engine.pollInbox() }, 8000),
      setInterval(() => engine.pullLeads(), 10000),
      setInterval(() => engine.tickSequences(), 10000),
    ]
    return () => ids.forEach(clearInterval)
  }, [engine, !!S]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!S) return <div className="grid min-h-screen place-items-center" role="status" aria-label="Loading workspace"><span className="size-8 animate-spin rounded-full border-4 border-brand-500/30 border-t-brand-500" /></div>
  return (
    <WorkspaceContext.Provider value={{ S, update, toast, status, engine, me: user, saveState }}>
      {children}
      {toastMsg && <div role="status" className="fixed right-4 bottom-4 z-50 animate-pop rounded-xl bg-night px-4 py-3 text-sm text-white shadow-soft">{toastMsg}</div>}
    </WorkspaceContext.Provider>
  )
}
