import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import jwt from 'jsonwebtoken'

let app, mongod, token

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret'
  delete process.env.CLOUDFLARE_DEPLOY_HOOK_URL
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
  ;({ app } = await import('../app.js'))
  token = jwt.sign({ sub: 'u1', email: 'a@b.c', name: 'T' }, process.env.JWT_SECRET)
})
afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})
beforeEach(async () => {
  await mongoose.connection.db.dropDatabase()
})

const auth = (r) => r.set('Authorization', `Bearer ${token}`)
async function createSeries(body) {
  const res = await auth(request(app).post('/api/admin/invitations')).send({
    game: 'Pokemon',
    name: 'Nuit Noire',
    setCode: 'ME05',
    ...body,
  })
  expect(res.status).toBe(201)
  return res.body
}

describe('public invitations', () => {
  it('GET /api/invitations renvoie la structure { games }', async () => {
    await createSeries({ game: 'Pokemon', name: 'A', slug: 'me05' })
    await createSeries({ game: 'One Piece', name: 'B', slug: 'op13' })
    const res = await request(app).get('/api/invitations')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.games)).toBe(true)
    const games = res.body.games.map((g) => g.game).sort()
    expect(games).toEqual(['One Piece', 'Pokemon'])
    const pk = res.body.games.find((g) => g.game === 'Pokemon')
    expect(pk.series[0].slug).toBe('me05')
  })

  it('GET /api/invitations/:slug renvoie une série, 404 sinon', async () => {
    await createSeries({ slug: 'me05' })
    expect((await request(app).get('/api/invitations/me05')).status).toBe(200)
    expect((await request(app).get('/api/invitations/inconnu')).status).toBe(404)
  })

  it('renomme le slug : l’ancien résout vers le nouveau (previousSlugs)', async () => {
    const s = await createSeries({ slug: 'me05' })
    const upd = await auth(request(app).put(`/api/admin/invitations/${s.id}`)).send({ slug: 'me05-nuit-noire' })
    expect(upd.status).toBe(200)
    expect(upd.body.slug).toBe('me05-nuit-noire')
    expect(upd.body.previousSlugs).toContain('me05')
    const res = await request(app).get('/api/invitations/me05')
    expect(res.status).toBe(200)
    expect(res.body.slug).toBe('me05-nuit-noire')
  })
})

describe('admin invitations', () => {
  it('exige un JWT', async () => {
    expect((await request(app).get('/api/admin/invitations')).status).toBe(401)
  })

  it('CRUD complet avec items et fournisseurs', async () => {
    const s = await createSeries({
      slug: 'me05',
      items: [{ name: 'ETB', suppliers: [{ name: 'Amazon', availability: 'in_stock', url: '' }] }],
    })
    expect(s.items[0].suppliers[0].name).toBe('Amazon')
    expect(s.items[0].suppliers[0].availability).toBe('in_stock')

    const upd = await auth(request(app).put(`/api/admin/invitations/${s.id}`)).send({ name: 'Nuit Noire v2' })
    expect(upd.body.name).toBe('Nuit Noire v2')

    const del = await auth(request(app).delete(`/api/admin/invitations/${s.id}`))
    expect(del.status).toBe(204)
    expect((await request(app).get('/api/invitations/me05')).status).toBe(404)
  })

  it('refuse une série sans game ou name (400)', async () => {
    const res = await auth(request(app).post('/api/admin/invitations')).send({ game: 'Pokemon' })
    expect(res.status).toBe(400)
  })

  it('évite les collisions de slug', async () => {
    await createSeries({ name: 'Nuit Noire', slug: 'me05' })
    const b = await createSeries({ name: 'Nuit Noire', slug: 'me05' })
    expect(b.slug).not.toBe('me05')
  })
})
