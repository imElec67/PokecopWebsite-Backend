import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.js'
import articleRoutes from './routes/articles.js'
import uploadRoutes from './routes/upload.js'
import { notFound, errorHandler } from './middleware/error.js'

export function buildApp() {
  const app = express()

  const origins = (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean)
  app.use(cors({ origin: origins.length ? origins : true }))
  app.use(express.json({ limit: '15mb' }))

  app.get('/api/health', (req, res) => res.json({ ok: true }))
  app.use('/api/auth', authRoutes)
  app.use('/api', articleRoutes)
  app.use('/api', uploadRoutes)

  app.use(notFound)
  app.use(errorHandler)
  return app
}

export const app = buildApp()
