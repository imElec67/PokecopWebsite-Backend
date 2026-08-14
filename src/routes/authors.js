import { Router } from 'express'
import { Author } from '../models/Author.js'
import { requireAuth } from '../middleware/auth.js'
import { slugify } from '../utils/slugify.js'
import { triggerDeploy } from '../services/deployHook.js'

const router = Router()

async function uniqueSlug(base, { ignoreId } = {}) {
  const root = slugify(base) || 'auteur'
  let candidate = root
  let n = 1
  const taken = (s) =>
    Author.exists(ignoreId ? { slug: s, _id: { $ne: ignoreId } } : { slug: s })
  while (await taken(candidate)) {
    n += 1
    candidate = `${root}-${n}`
  }
  return candidate
}

const EDITABLE = ['name', 'signature', 'role', 'bio', 'avatar', 'sameAs', 'order']

// ---- public : liste des auteurs ----
router.get('/authors', async (req, res, next) => {
  try {
    res.json(await Author.find().sort({ order: 1, name: 1 }))
  } catch (e) {
    next(e)
  }
})

// ---- admin ----
router.get('/admin/authors', requireAuth, async (req, res, next) => {
  try {
    res.json(await Author.find().sort({ order: 1, name: 1 }))
  } catch (e) {
    next(e)
  }
})

router.get('/admin/authors/:id', requireAuth, async (req, res, next) => {
  try {
    const a = await Author.findById(req.params.id)
    if (!a) return res.status(404).json({ error: 'Not found' })
    res.json(a)
  } catch (e) {
    next(e)
  }
})

router.post('/admin/authors', requireAuth, async (req, res, next) => {
  try {
    const body = req.body || {}
    if (!body.name) return res.status(400).json({ error: 'name required' })
    const signature = (body.signature || body.name).trim()
    const slug = await uniqueSlug(body.slug || body.name)
    const author = await Author.create({ ...body, signature, slug })
    await triggerDeploy()
    res.status(201).json(author)
  } catch (e) {
    next(e)
  }
})

router.put('/admin/authors/:id', requireAuth, async (req, res, next) => {
  try {
    const author = await Author.findById(req.params.id)
    if (!author) return res.status(404).json({ error: 'Not found' })
    const body = req.body || {}
    for (const k of EDITABLE) if (body[k] !== undefined) author[k] = body[k]
    if (body.slug && slugify(body.slug) !== author.slug) {
      author.slug = await uniqueSlug(body.slug, { ignoreId: author._id })
    }
    if (!author.signature) author.signature = author.name
    await author.save()
    await triggerDeploy()
    res.json(author)
  } catch (e) {
    next(e)
  }
})

router.delete('/admin/authors/:id', requireAuth, async (req, res, next) => {
  try {
    const deleted = await Author.findByIdAndDelete(req.params.id)
    if (!deleted) return res.status(404).json({ error: 'Not found' })
    await triggerDeploy()
    res.status(204).end()
  } catch (e) {
    next(e)
  }
})

export default router
