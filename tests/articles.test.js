process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret'
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { useTestDB } from './helpers/db.js'
import { app } from '../src/app.js'
import { Article } from '../src/models/Article.js'

useTestDB()

function authHeader() {
  const token = jwt.sign({ sub: '1', email: 'a@b.fr', name: 'A' }, process.env.JWT_SECRET)
  return ['Authorization', `Bearer ${token}`]
}

beforeEach(async () => {
  await Article.create({ title: 'Live', slug: 'live', status: 'published', publishedAt: new Date() })
  await Article.create({ title: 'Hidden', slug: 'hidden', status: 'draft' })
})

describe('public article reads', () => {
  it('GET /api/articles returns only published articles', async () => {
    const res = await request(app).get('/api/articles')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].slug).toBe('live')
  })

  it('GET /api/articles/:slug returns a published article', async () => {
    const res = await request(app).get('/api/articles/live')
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Live')
  })

  it('GET /api/articles/:slug returns 404 for a draft', async () => {
    const res = await request(app).get('/api/articles/hidden')
    expect(res.status).toBe(404)
  })

  it('pins featured articles to the top regardless of date', async () => {
    // "live" was published now; add an OLDER featured article — it must come first
    await Article.create({
      title: 'Pinned', slug: 'pinned', status: 'published', featured: true,
      publishedAt: new Date('2000-01-01'),
    })
    const res = await request(app).get('/api/articles')
    expect(res.status).toBe(200)
    expect(res.body.map((a) => a.slug)).toEqual(['pinned', 'live'])
  })
})

describe('admin article CRUD', () => {
  it('GET /api/admin/articles requires auth', async () => {
    const res = await request(app).get('/api/admin/articles')
    expect(res.status).toBe(401)
  })

  it('GET /api/admin/articles returns drafts + published', async () => {
    const res = await request(app).get('/api/admin/articles').set(...authHeader())
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
  })

  it('POST creates an article and auto-generates a unique slug', async () => {
    const res = await request(app)
      .post('/api/admin/articles')
      .set(...authHeader())
      .send({ title: 'Live', status: 'draft' }) // same title as existing "live"
    expect(res.status).toBe(201)
    expect(res.body.slug).toBe('live-2') // de-duplicated
  })

  it('POST sets publishedAt when created as published', async () => {
    const res = await request(app)
      .post('/api/admin/articles')
      .set(...authHeader())
      .send({ title: 'Fresh', status: 'published' })
    expect(res.status).toBe(201)
    expect(res.body.publishedAt).toBeTruthy()
  })

  it('PUT updates an existing article', async () => {
    const created = await Article.create({ title: 'Edit me', slug: 'edit-me', status: 'draft' })
    const res = await request(app)
      .put(`/api/admin/articles/${created.id}`)
      .set(...authHeader())
      .send({ title: 'Edited' })
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Edited')
  })

  it('PUT sets publishedAt the first time status flips to published', async () => {
    const created = await Article.create({ title: 'Draft', slug: 'draft-one', status: 'draft' })
    const res = await request(app)
      .put(`/api/admin/articles/${created.id}`)
      .set(...authHeader())
      .send({ status: 'published' })
    expect(res.status).toBe(200)
    expect(res.body.publishedAt).toBeTruthy()
  })

  it('persists tags and featured on create and update', async () => {
    const created = await request(app)
      .post('/api/admin/articles')
      .set(...authHeader())
      .send({ title: 'Tagged', tags: ['Pokémon', 'Intemporel'], featured: true, status: 'draft' })
    expect(created.status).toBe(201)
    expect(created.body.tags).toEqual(['Pokémon', 'Intemporel'])
    expect(created.body.featured).toBe(true)

    const updated = await request(app)
      .put(`/api/admin/articles/${created.body.id}`)
      .set(...authHeader())
      .send({ tags: ['One Piece'], featured: false })
    expect(updated.status).toBe(200)
    expect(updated.body.tags).toEqual(['One Piece'])
    expect(updated.body.featured).toBe(false)
  })

  it('DELETE removes an article (204)', async () => {
    const created = await Article.create({ title: 'Bye', slug: 'bye', status: 'draft' })
    const res = await request(app).delete(`/api/admin/articles/${created.id}`).set(...authHeader())
    expect(res.status).toBe(204)
    expect(await Article.findById(created.id)).toBeNull()
  })
})
