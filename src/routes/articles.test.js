import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import jwt from 'jsonwebtoken'

let app, mongod, token

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret'
  delete process.env.CLOUDFLARE_DEPLOY_HOOK_URL // keep triggerDeploy a no-op
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
  ;({ app } = await import('../app.js'))
  token = jwt.sign({ sub: 'u1', email: 'test@pokecop.com', name: 'Test' }, process.env.JWT_SECRET)
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})

beforeEach(async () => {
  await mongoose.connection.db.dropDatabase()
})

const auth = (req) => req.set('Authorization', `Bearer ${token}`)

async function createArticle(body) {
  const res = await auth(request(app).post('/api/admin/articles')).send({
    status: 'published',
    content: '<p>contenu</p>',
    ...body,
  })
  expect(res.status).toBe(201)
  return res.body
}

describe('public reads', () => {
  it('serves a published article by slug', async () => {
    await createArticle({ title: 'Mon premier article' })
    const res = await request(app).get('/api/articles/mon-premier-article')
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Mon premier article')
  })

  it('404s on unknown slug', async () => {
    const res = await request(app).get('/api/articles/inconnu')
    expect(res.status).toBe(404)
  })
})

describe('slug renames', () => {
  it('still resolves the old slug after a rename, answering with the new slug', async () => {
    const a = await createArticle({ title: 'Ancien titre' })
    const upd = await auth(request(app).put(`/api/admin/articles/${a.id}`)).send({ slug: 'nouveau-slug' })
    expect(upd.status).toBe(200)
    expect(upd.body.slug).toBe('nouveau-slug')
    expect(upd.body.previousSlugs).toContain('ancien-titre')

    // the legacy URL keeps working: the API returns the article under its new
    // slug so the front can redirect (no 404, no duplicate content)
    const res = await request(app).get('/api/articles/ancien-titre')
    expect(res.status).toBe(200)
    expect(res.body.slug).toBe('nouveau-slug')
  })

  it('accumulates successive renames and never lists the current slug as previous', async () => {
    const a = await createArticle({ title: 'Titre un' })
    await auth(request(app).put(`/api/admin/articles/${a.id}`)).send({ slug: 'titre-deux' })
    await auth(request(app).put(`/api/admin/articles/${a.id}`)).send({ slug: 'titre-trois' })
    // rename back to an earlier slug: it must leave previousSlugs
    const res = await auth(request(app).put(`/api/admin/articles/${a.id}`)).send({ slug: 'titre-un' })
    expect(res.body.slug).toBe('titre-un')
    expect(res.body.previousSlugs).toEqual(expect.arrayContaining(['titre-deux', 'titre-trois']))
    expect(res.body.previousSlugs).not.toContain('titre-un')
  })

  it('does not let a new article take a slug that redirects to another one', async () => {
    const a = await createArticle({ title: 'Guide ETB' })
    await auth(request(app).put(`/api/admin/articles/${a.id}`)).send({ slug: 'guide-etb-2026' })
    // "guide-etb" is now a legacy slug of the first article
    const b = await createArticle({ title: 'Guide ETB' })
    expect(b.slug).not.toBe('guide-etb')
    expect(b.slug).not.toBe('guide-etb-2026')
  })

  it('a real slug wins over another article legacy slug', async () => {
    const a = await createArticle({ title: 'Article alpha' })
    await auth(request(app).put(`/api/admin/articles/${a.id}`)).send({ slug: 'alpha-v2' })
    // craft an article whose current slug equals alpha's legacy slug
    const b = await createArticle({ title: 'Article beta', slug: 'article-alpha-bis' })
    expect(b.slug).toBe('article-alpha-bis')
    const res = await request(app).get('/api/articles/article-alpha-bis')
    expect(res.body.title).toBe('Article beta')
  })
})
