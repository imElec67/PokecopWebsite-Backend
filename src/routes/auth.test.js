import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

let app, mongod, User

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret'
  delete process.env.CLOUDFLARE_DEPLOY_HOOK_URL
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
  ;({ app } = await import('../app.js'))
  ;({ User } = await import('../models/User.js'))
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})

beforeEach(async () => {
  await mongoose.connection.db.dropDatabase()
  await User.create({
    email: 'author@pokecop.com',
    name: 'Author',
    passwordHash: await User.hashPassword('correct-password'),
  })
})

const login = (password) =>
  request(app).post('/api/auth/login').send({ email: 'author@pokecop.com', password })

describe('login brute-force protection', () => {
  it('valid credentials return a token', async () => {
    const res = await login('correct-password')
    expect(res.status).toBe(200)
    expect(res.body.token).toBeTruthy()
  })

  it('blocks with 429 after too many failed attempts from the same IP', async () => {
    let blocked = null
    for (let i = 0; i < 6; i++) {
      const res = await login('wrong-password')
      if (res.status === 429) { blocked = res; break }
      expect(res.status).toBe(401)
    }
    expect(blocked, 'expected a 429 within 6 failed attempts').not.toBeNull()
    expect(blocked.body.error).toMatch(/tentatives/i)
    // even the CORRECT password is refused while blocked - the bot can't
    // confirm a hit once throttled
    const res = await login('correct-password')
    expect(res.status).toBe(429)
  })
})
