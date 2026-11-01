// Applies sql/*.sql files in order, once each. Usage: npm run migrate
import 'dotenv/config'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import pg from 'pg'

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set in backend/.env')
  process.exit(1)
}
const dir = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'sql')
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 })

try {
  await client.connect()
  await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())')
  const done = new Set((await client.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name))
  for (const file of (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()) {
    if (done.has(file)) { console.log(`skip   ${file}`); continue }
    await client.query('BEGIN')
    try {
      await client.query(await readFile(join(dir, file), 'utf8'))
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file])
      await client.query('COMMIT')
      console.log(`applied ${file}`)
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    }
  }
  console.log('Migrations up to date.')
} catch (err) {
  console.error('Migration failed:', err.message)
  process.exitCode = 1
} finally {
  await client.end().catch(() => {})
}
