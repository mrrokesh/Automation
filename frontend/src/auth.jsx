import { createContext, useCallback, useEffect, useState } from 'react'
import { api } from './api'

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null)

// Holds the signed-in user (null when signed out) and whether the first account still has to be created.
export function AuthProvider({ children }) {
  const [state, setState] = useState({ ready: false, user: null, needsSetup: false })
  const refresh = useCallback(() => api.me().then((d) => setState({ ready: true, user: d.user, needsSetup: !!d.needsSetup })).catch(() => setState((s) => ({ ...s, ready: true }))), [])
  useEffect(() => { refresh() }, [refresh])
  const signOut = useCallback(async () => { await api.logout().catch(() => {}); setState((s) => ({ ...s, user: null })) }, [])
  return <AuthContext.Provider value={{ ...state, refresh, signOut }}>{children}</AuthContext.Provider>
}
