process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret'
import { describe, it, expect } from 'vitest'
import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { requireAuth } from '../src/middleware/auth.js'

function makeApp() {
  const app = express()
  app.get('/protected', requireAuth, (req, res) => res.json({ email: req.user.email }))
  return app
}

describe('requireAuth', () => {
  it('rejects requests with no token (401)', async () => {
    const res = await request(makeApp()).get('/protected')
    expect(res.status).toBe(401)
  })

  it('rejects an invalid token (401)', async () => {
    const res = await request(makeApp()).get('/protected').set('Authorization', 'Bearer nope')
    expect(res.status).toBe(401)
  })

  it('passes a valid token and exposes req.user', async () => {
    const token = jwt.sign({ sub: '1', email: 'a@b.fr', name: 'A' }, process.env.JWT_SECRET)
    const res = await request(makeApp()).get('/protected').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.email).toBe('a@b.fr')
  })
})
