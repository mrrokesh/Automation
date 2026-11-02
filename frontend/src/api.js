// Small fetch wrapper. Cookies carry the session, so everything stays same-origin (Vite proxies /api in dev).
async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || data.note || `Request failed (${res.status})`)
  return data
}
const post = (path, body = {}) => request(path, { method: 'POST', body })
const patch = (path, body) => request(path, { method: 'PATCH', body })
const del = (path, body) => request(path, { method: 'DELETE', body })
const query = (params) => {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== '' && v != null) q.set(k, v)
  const s = q.toString()
  return s ? `?${s}` : ''
}

export const api = {
  me: () => request('/me'),
  register: (body) => post('/register', body),
  login: (email, password) => post('/login', { email, password }),
  logout: () => post('/logout'),
  forgot: (email) => post('/forgot', { email }),
  reset: (body) => post('/reset', body),
  contact: (body) => post('/public/contact', body),
  support: (body) => post('/public/support', body),
  publicForm: (id) => request(`/public/forms/${encodeURIComponent(id)}`),
  submitForm: (id, values) => post(`/public/forms/${encodeURIComponent(id)}/submit`, values),
  status: () => request('/status'),
  workspaceInfo: () => request('/workspace/info'),
  workspaceState: () => request('/workspace/state'),
  saveState: (state) => request('/workspace/state', { method: 'PUT', body: { state } }),
  forms: () => request('/forms'),
  saveForm: (form) => post('/forms', form),
  deleteForm: (id) => del(`/forms/${id}`),
  inbox: () => request('/inbox'),
  logMessage: (m) => post('/inbox/log', m),
  leads: () => request('/leads'),
  ackLeads: (ids) => post('/leads/ack', { ids }),
  users: () => request('/users'),
  addUser: (email, password) => post('/users', { email, password }),
  removeUser: (id) => del(`/users/${id}`),
  send: (m) => post('/send', m),
  agent: (m) => post('/agent', m),
  paymentLink: (m) => post('/payment-link', m),
  call: (m) => post('/call', m),
  verifyEmails: (emails) => post('/verify-email', { emails }),

  // Workspace admin portal: owners and admins, their own workspace only.
  admin: {
    overview: () => request('/admin/overview'),
    users: () => request('/admin/users'),
    inviteUser: (body) => post('/admin/users', body),
    updateUser: (id, body) => patch(`/admin/users/${id}`, body),
    resetPassword: (id, password) => post(`/admin/users/${id}/reset-password`, { password }),
    deleteUser: (id) => del(`/admin/users/${id}`),
    audit: (offset = 0, action = '') => request(`/admin/audit${query({ limit: 50, offset, action })}`),
  },

  // Platform portal: platform admins only, across every workspace.
  platform: {
    overview: () => request('/platform/overview'),
    workspaces: () => request('/platform/workspaces'),
    workspace: (id) => request(`/platform/workspaces/${id}`),
    createWorkspace: (body) => post('/platform/workspaces', body),
    updateWorkspace: (id, body) => patch(`/platform/workspaces/${id}`, body),
    deleteWorkspace: (id, confirm) => del(`/platform/workspaces/${id}`, { confirm }),
    rotateKey: (id) => post(`/platform/workspaces/${id}/rotate-key`),
    resetPassword: (id, password) => post(`/platform/users/${id}/reset-password`, { password }),
    setPlatformAdmin: (id, isPlatformAdmin) => patch(`/platform/users/${id}/platform-admin`, { isPlatformAdmin }),
    demos: (status = '') => request(`/platform/demo-requests${query({ limit: 200, status })}`),
    updateDemo: (id, body) => patch(`/platform/demo-requests/${id}`, body),
    deleteDemo: (id) => del(`/platform/demo-requests/${id}`),
    tickets: (status = '') => request(`/platform/tickets${query({ limit: 200, status })}`),
    updateTicket: (id, body) => patch(`/platform/tickets/${id}`, body),
    replyTicket: (id, message) => post(`/platform/tickets/${id}/reply`, { message }),
    deleteTicket: (id) => del(`/platform/tickets/${id}`),
    audit: (offset = 0, action = '') => request(`/platform/audit${query({ limit: 50, offset, action })}`),
    system: () => request('/platform/system'),
  },
}
