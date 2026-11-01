import express from 'express'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { pool } from './db.js'
import authRoutes from './routes/auth.js'

const frontendDist = fileURLToPath(new URL('../../frontend/dist', import.meta.url))

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  // Behind a reverse proxy (hosting platform) rate limits and secure cookies need the real client address.
  if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1)
  app.use(helmet())
  app.use(express.json({ limit: '10kb' }))
  app.use(cookieParser())

  app.get('/api/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1')
      res.json({ ok: true, database: 'up' })
    } catch {
      res.status(503).json({ ok: false, database: 'down' })
    }
  })

  app.use('/api/auth', authRoutes)
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }))

  // Production: serve the built frontend (npm run build in frontend/) from this same server.
  if (existsSync(join(frontendDist, 'index.html'))) {
    app.use(express.static(frontendDist))
    // Client-side routes (no file extension) fall back to the app; missing files such as /assets/x.js stay 404.
    app.get(/^\/(?!api\/)[^.]*$/, (_req, res) => res.sendFile(join(frontendDist, 'index.html')))
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    const bad = err.type === 'entity.parse.failed'
    if (!bad) console.error(err) // details stay in the server log, never in the response
    res.status(bad ? 400 : 500).json({ error: bad ? 'Invalid JSON' : 'Server error' })
  })

  return app
}
