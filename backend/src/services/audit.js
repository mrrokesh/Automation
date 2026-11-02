import { query } from '../db.js'

// Records who did what, and in which workspace (null for platform-level events). Never throws:
// a logging problem must not break the action being logged.
export async function audit(actor, action, target = '', detail = '', workspaceId = null) {
  try {
    await query('INSERT INTO audit_log (actor, action, target, detail, workspace_id) VALUES ($1, $2, $3, $4, $5)',
      [String(actor || '').slice(0, 200), action, String(target).slice(0, 200), String(detail).slice(0, 500), workspaceId])
  } catch (err) { console.error('audit log failed:', err.message) }
}
