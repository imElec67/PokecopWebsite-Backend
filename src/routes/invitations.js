import { Router } from 'express'
import { Series } from '../models/Series.js'
import { requireAuth } from '../middleware/auth.js'
import { slugify } from '../utils/slugify.js'
import { triggerDeploy } from '../services/deployHook.js'

const router = Router()

async function uniqueSlug(name, base, { ignoreId } = {}) {
  const root = base ? slugify(base) : slugify(name)
  let candidate = root || 'serie'
  let n = 1
  // un slug est pris s'il est utilisé maintenant (slug) ou l'a été (previousSlugs)
  const taken = async (s) => {
    const clash = { $or: [{ slug: s }, { previousSlugs: s }] }
    return Series.exists(ignoreId ? { $and: [clash, { _id: { $ne: ignoreId } }] } : clash)
  }
  while (await taken(candidate)) {
    n += 1
    candidate = `${root}-${n}`
  }
  return candidate
}

// ---- Public ----
// Structure { games: [ { game, series: [...] } ] } attendue par le front.
router.get('/invitations', async (req, res, next) => {
  try {
    const all = await Series.find().sort({ releaseDate: -1, order: 1 })
    const byGame = new Map()
    for (const s of all) {
      if (!byGame.has(s.game)) byGame.set(s.game, [])
      byGame.get(s.game).push(s.toJSON())
    }
    res.json({ games: [...byGame.entries()].map(([game, series]) => ({ game, series })) })
  } catch (err) { next(err) }
})

router.get('/invitations/:slug', async (req, res, next) => {
  try {
    // slug courant d'abord, puis anciens slugs → le front redirige vers serie.slug
    const serie =
      (await Series.findOne({ slug: req.params.slug })) ||
      (await Series.findOne({ previousSlugs: req.params.slug }))
    if (!serie) return res.status(404).json({ error: 'Not found' })
    res.json(serie)
  } catch (err) { next(err) }
})

// ---- Admin (authentifié) ----
router.get('/admin/invitations', requireAuth, async (req, res, next) => {
  try {
    res.json(await Series.find().sort({ releaseDate: -1 }))
  } catch (err) { next(err) }
})

router.get('/admin/invitations/:id', requireAuth, async (req, res, next) => {
  try {
    const s = await Series.findById(req.params.id)
    if (!s) return res.status(404).json({ error: 'Not found' })
    res.json(s)
  } catch (err) { next(err) }
})

router.post('/admin/invitations', requireAuth, async (req, res, next) => {
  try {
    const body = req.body || {}
    if (!body.name || !body.game) return res.status(400).json({ error: 'game and name required' })
    const slug = await uniqueSlug(body.name, body.slug || body.setCode)
    const serie = await Series.create({ ...body, slug })
    await triggerDeploy()
    res.status(201).json(serie)
  } catch (err) { next(err) }
})

router.put('/admin/invitations/:id', requireAuth, async (req, res, next) => {
  try {
    const serie = await Series.findById(req.params.id)
    if (!serie) return res.status(404).json({ error: 'Not found' })

    const body = req.body || {}
    const fields = ['game', 'block', 'setCode', 'name', 'logo', 'releaseDate',
      'summary', 'tip', 'order', 'items']
    for (const f of fields) if (f in body) serie[f] = body[f]

    // re-slug uniquement si un slug explicite est fourni et différent
    if (body.slug && slugify(body.slug) !== serie.slug) {
      const oldSlug = serie.slug
      serie.slug = await uniqueSlug(serie.name, body.slug, { ignoreId: serie._id })
      serie.previousSlugs = [...new Set([...(serie.previousSlugs || []), oldSlug])]
        .filter((s) => s !== serie.slug)
    }

    await serie.save()
    await triggerDeploy()
    res.json(serie)
  } catch (err) { next(err) }
})

router.delete('/admin/invitations/:id', requireAuth, async (req, res, next) => {
  try {
    const deleted = await Series.findByIdAndDelete(req.params.id)
    if (!deleted) return res.status(404).json({ error: 'Not found' })
    await triggerDeploy()
    res.status(204).end()
  } catch (err) { next(err) }
})

export default router
