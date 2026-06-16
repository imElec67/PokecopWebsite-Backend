process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret'
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { useTestDB } from './helpers/db.js'
import { app } from '../src/app.js'
import { User } from '../src/models/User.js'

useTestDB()

beforeEach(async () => {
  await User.create({
    email: 'author@pokecop.fr',
    name: 'Author One',
    passwordHash: await User.hashPassword('secret123'),
  })
})

describe('POST /api/auth/login', () => {
  it('returns a token for valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'author@pokecop.fr', password: 'secret123' })
    expect(res.status).toBe(200)
    expect(res.body.token).toBeTruthy()
    expect(res.body.user).toMatchObject({ email: 'author@pokecop.fr', name: 'Author One' })
    expect(res.body.user.passwordHash).toBeUndefined()
  })

  it('rejects a wrong password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'author@pokecop.fr', password: 'wrong' })
    expect(res.status).toBe(401)
  })

  it('rejects an unknown email with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@pokecop.fr', password: 'secret123' })
    expect(res.status).toBe(401)
  })
})
