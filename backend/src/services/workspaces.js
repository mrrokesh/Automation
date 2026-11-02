import { randomBytes } from 'node:crypto'
import { query } from '../db.js'

export const newInboundKey = () => randomBytes(24).toString('hex')

export const slugify = (name) => String(name || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'workspace'

// A URL-safe, unique slug derived from the name (rokesh, rokesh-2, rokesh-3, ...).
export async function uniqueSlug(name, client = { query }) {
  const base = slugify(name).padEnd(2, 'x')
  for (let i = 1; i < 200; i++) {
    const slug = i === 1 ? base : `${base}-${i}`
    const { rowCount } = await client.query('SELECT 1 FROM workspaces WHERE slug = $1', [slug])
    if (!rowCount) return slug
  }
  return `${base}-${randomBytes(3).toString('hex')}`
}
