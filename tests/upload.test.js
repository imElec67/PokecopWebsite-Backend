process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret'
import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'

// Mock the cloudinary uploader so no real network/credentials are needed.
vi.mock('cloudinary', () => ({
  v2: {
    config: vi.fn(),
    uploader: {
      upload_stream: (opts, cb) => {
        // return a writable-ish stub; end() fires the callback with a fake result
        return { end: () => cb(null, { secure_url: 'https://cdn.example/img.webp' }) }
      },
    },
  },
}))

const { app } = await import('../src/app.js')

function authHeader() {
  const token = jwt.sign({ sub: '1', email: 'a@b.fr', name: 'A' }, process.env.JWT_SECRET)
  return ['Authorization', `Bearer ${token}`]
}

describe('POST /api/upload', () => {
  it('requires auth', async () => {
    const res = await request(app).post('/api/upload')
    expect(res.status).toBe(401)
  })

  it('returns the uploaded image URL', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set(...authHeader())
      .attach('image', Buffer.from('fake-bytes'), 'photo.png')
    expect(res.status).toBe(200)
    expect(res.body.url).toBe('https://cdn.example/img.webp')
  })

  it('400 when no file is attached', async () => {
    const res = await request(app).post('/api/upload').set(...authHeader())
    expect(res.status).toBe(400)
  })
})
