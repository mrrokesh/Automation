import { createContext, useContext } from 'react'

export const WorkspaceContext = createContext(null)

// { S, update(fn), toast(msg), status, engine, me }  where update() edits a copy of S and saves it to the server.
export const useWs = () => useContext(WorkspaceContext)
