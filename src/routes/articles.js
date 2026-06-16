import { Router } from 'express'
import { Article } from '../models/Article.js'
import { requireAuth } from '../middleware/auth.js'
import { slugify } from '../utils/slugify.js'
import { triggerDeploy } from '../services/deployHook.js'

const router = Router()

async function uniqueSlug(title, base) {
  const root = base ? slugify(base) : slugify(title)
  let candidate = root || 'article'
  let n = 1
  // bump suffix until the slug is free
  while (await Article.exists({ slug: candidate })) {
    n += 1
    candidate = `${root}-${n}`
  }
  return candidate
}

// ---- Public reads ----
router.get('/articles', async (req, res, next) => {
  try {
    // featured posts pinned to the top, then newest first
    const articles = await Article.find({ status: 'published' }).sort({ featured: -1, publishedAt: -1 })
    res.json(articles)
  } catch (err) { next(err) }
})

router.get('/articles/:slug', async (req, res, next) => {
  try {
    const article = await Article.findOne({ slug: req.params.slug, status: 'published' })
    if (!article) return res.status(404).json({ error: 'Not found' })
    res.json(article)
  } catch (err) { next(err) }
})

// ---- Admin (authenticated) ----
router.get('/admin/articles', requireAuth, async (req, res, next) => {
  try {
    const articles = await Article.find().sort({ updatedAt: -1 })
    res.json(articles)
  } catch (err) { next(err) }
})

router.get('/admin/articles/:id', requireAuth, async (req, res, next) => {
  try {
    const article = await Article.findById(req.params.id)
    if (!article) return res.status(404).json({ error: 'Not found' })
    res.json(article)
  } catch (err) { next(err) }
})

router.post('/admin/articles', requireAuth, async (req, res, next) => {
  try {
    const body = req.body || {}
    if (!body.title) return res.status(400).json({ error: 'Title is required' })
    const slug = await uniqueSlug(body.title, body.slug)
    const article = await Article.create({
      ...body,
      slug,
      publishedAt: body.status === 'published' ? new Date() : null,
    })
    await triggerDeploy() // a new published article changes the public site
    res.status(201).json(article)
  } catch (err) { next(err) }
})

router.put('/admin/articles/:id', requireAuth, async (req, res, next) => {
  try {
    const article = await Article.findById(req.params.id)
    if (!article) return res.status(404).json({ error: 'Not found' })

    const body = req.body || {}
    const fields = ['title', 'excerpt', 'content', 'coverImage', 'author', 'tags',
      'featured', 'status', 'metaTitle', 'metaDescription']
    for (const f of fields) if (f in body) article[f] = body[f]

    // re-slug only if an explicit slug was provided
    if (body.slug && slugify(body.slug) !== article.slug) {
      article.slug = await uniqueSlug(article.title, body.slug)
    }
    // stamp publishedAt the first time it goes live
    if (article.status === 'published' && !article.publishedAt) article.publishedAt = new Date()

    await article.save()
    await triggerDeploy()
    res.json(article)
  } catch (err) { next(err) }
})

router.delete('/admin/articles/:id', requireAuth, async (req, res, next) => {
  try {
    const deleted = await Article.findByIdAndDelete(req.params.id)
    if (!deleted) return res.status(404).json({ error: 'Not found' })
    await triggerDeploy()
    res.status(204).end()
  } catch (err) { next(err) }
})

export default router
