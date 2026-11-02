import { useCallback, useEffect, useState } from 'react'

export const fmt = (d) => (d ? new Date(d).toLocaleString() : '—')
export const ago = (d) => {
  if (!d) return 'never'
  const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000)
  if (s < 90) return 'just now'
  if (s < 5400) return `${Math.round(s / 60)} min ago`
  if (s < 129600) return `${Math.round(s / 3600)} h ago`
  return `${Math.round(s / 86400)} days ago`
}

// Loads data from an admin endpoint and reloads on demand. Errors are shown in the page instead of crashing it.
export function useLoad(fn, deps = []) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(() => fn().then((d) => { setData(d); setError('') }).catch((e) => setError(e.message)), deps)
  useEffect(() => { load() }, [load])
  return [data, error, load]
}
