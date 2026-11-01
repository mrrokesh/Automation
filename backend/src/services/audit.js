import { query } from '../db.js'

// Records who did what. Never throws: a logging problem must not break the action being logged.
export async function audit(actor, action, target = '', detail = '') {
  try {
    await query('INSERT INTO audit_log (actor, action, target, detail) VALUES ($1, $2, $3, $4)',
      [String(actor || '').slice(0, 200), action, String(target).slice(0, 200), String(detail).slice(0, 500)])
  } catch (err) { console.error('audit log failed:', err.message) }
}
