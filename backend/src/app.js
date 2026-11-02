import express from 'express'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { pool } from './db.js'
import authRoutes from './routes/auth.js'
import { publicApi, workspaceApi, webhooks } from './routes/workspace.js'
import { sameOrigin } from './middleware/auth.js'
import adminRoutes from './routes/admin.js'
import platformRoutes from './routes/platform.js'
import { config } from './config.js'

const frontendDist = fileURLToPath(new URL('../../frontend/dist', import.meta.url))

const csp = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  fontSrc: ["'self'", 'https://fonts.gstatic.com'],
  imgSrc: ["'self'", 'data:', 'https:'],
  connectSrc: ["'self'"],
  frameAncestors: ["'none'"],
  objectSrc: ["'none'"],
  // Only upgrade http subresources to https in production; local http development must keep working.
  upgradeInsecureRequests: config.production ? [] : null,
}

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  // Behind a reverse proxy (hosting platform) rate limits and secure cookies need the real client address.
  if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1)

  // The public form page and its API may be embedded on other sites; everything else may not be framed.
  const embeddable = helmet({ contentSecurityPolicy: { directives: { ...csp, frameAncestors: ['*'] } }, frameguard: false })
  const locked = helmet({ contentSecurityPolicy: { directives: csp } })
  app.use((req, res, next) => (req.path === '/form' || req.path.startsWith('/form/') || req.path.startsWith('/api/public/') ? embeddable : locked)(req, res, next))
  app.use((req, res, next) => { res.setHeader('Cache-Control', req.path.startsWith('/api/') ? 'no-store' : 'no-cache'); next() })
  app.use('/api/workspace/state', express.json({ limit: '4mb' })) // the workspace document; parsed before the small global limit
  app.use(express.json({ limit: '250kb' }))
  app.use(cookieParser())

  app.get('/api/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1')
      res.json({ ok: true, database: 'up' })
    } catch {
      res.status(503).json({ ok: false, database: 'down' })
    }
  })

  app.use('/api', sameOrigin)
  app.use('/api/auth', authRoutes) // same handlers under both prefixes
  app.use('/api', authRoutes)
  app.use('/api', publicApi)
  app.use('/api/admin', adminRoutes)
  app.use('/api/platform', platformRoutes)
  app.use('/api', workspaceApi)
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }))
  app.use('/webhook', webhooks)

  // Production: serve the built frontend (npm run build in frontend/) from this same server.
  if (existsSync(join(frontendDist, 'index.html'))) {
    app.use(express.static(frontendDist))
    // Client-side routes (no file extension) fall back to the app; missing files such as /assets/x.js stay 404.
    app.get(/^\/(?!api\/|webhook\/)[^.]*$/, (_req, res) => res.sendFile(join(frontendDist, 'index.html')))
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    const bad = err.type === 'entity.parse.failed'
    if (!bad) console.error(err) // details stay in the server log, never in the response
    res.status(bad ? 400 : 500).json({ error: bad ? 'Invalid JSON' : 'Server error' })
  })

  return app
}
