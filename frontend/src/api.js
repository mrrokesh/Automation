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

export const api = {
  me: () => request('/me'),
  register: (body) => post('/register', body),
  login: (email, password) => post('/login', { email, password }),
  logout: () => post('/logout'),
  forgot: (email) => post('/forgot', { email }),
  reset: (body) => post('/reset', body),
  contact: (body) => post('/public/contact', body),
  publicForm: (id) => request(`/public/forms/${encodeURIComponent(id)}`),
  submitForm: (id, values) => post(`/public/forms/${encodeURIComponent(id)}/submit`, values),
  status: () => request('/status'),
  workspaceState: () => request('/workspace/state'),
  saveState: (state) => request('/workspace/state', { method: 'PUT', body: { state } }),
  forms: () => request('/forms'),
  saveForm: (form) => post('/forms', form),
  deleteForm: (id) => request(`/forms/${id}`, { method: 'DELETE' }),
  inbox: () => request('/inbox'),
  logMessage: (m) => post('/inbox/log', m),
  leads: () => request('/leads'),
  ackLeads: (ids) => post('/leads/ack', { ids }),
  users: () => request('/users'),
  addUser: (email, password) => post('/users', { email, password }),
  removeUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),
  send: (m) => post('/send', m),
  agent: (m) => post('/agent', m),
  paymentLink: (m) => post('/payment-link', m),
  call: (m) => post('/call', m),
  verifyEmails: (emails) => post('/verify-email', { emails }),
}
