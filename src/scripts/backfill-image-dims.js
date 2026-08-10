// Ajoute width/height aux <img> de contenu des articles pour éliminer le CLS
// (le navigateur réserve l'espace avant chargement). Les dimensions sont lues
// via Cloudflare Image Transformations (format=json), sans re-télécharger le
// fichier. Idempotent (saute les <img> déjà dimensionnés) et sûr :
//
//   node src/scripts/backfill-image-dims.js          # DRY-RUN (n'écrit rien)
//   node src/scripts/backfill-image-dims.js --apply  # écrit en base
import 'dotenv/config'
import { connectDB, disconnectDB } from '../config/db.js'
import { Article } from '../models/Article.js'

const IMAGES_BASE = (process.env.IMAGES_BASE || 'https://images.pokecop.com').replace(/\/$/, '')
const APPLY = process.argv.includes('--apply')

// dimensions d'origine d'une image, via Cloudflare (aucun resize demandé)
const dimsCache = new Map()
async function fetchDims(url) {
  if (dimsCache.has(url)) return dimsCache.get(url)
  try {
    const res = await fetch(`${IMAGES_BASE}/cdn-cgi/image/format=json/${url}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const j = await res.json()
    const w = j.original?.width || j.width
    const h = j.original?.height || j.height
    const dims = w && h ? { w, h } : null
    dimsCache.set(url, dims)
    return dims
  } catch (e) {
    console.warn(`  ⚠ dims KO pour ${url} (${e.message})`)
    dimsCache.set(url, null)
    return null
  }
}

// ajoute width/height aux <img> de nos images qui n'en ont pas encore
async function processContent(html) {
  const tags = html.match(/<img\s+[^>]*?>/gi) || []
  let out = html
  let changed = 0
  for (const tag of tags) {
    if (/\bwidth\s*=/i.test(tag) && /\bheight\s*=/i.test(tag)) continue // déjà fait
    const src = (tag.match(/\bsrc\s*=\s*"([^"]*)"/i) || [])[1]
    if (!src || !src.startsWith(`${IMAGES_BASE}/`) || src.includes('/cdn-cgi/')) continue
    const dims = await fetchDims(src)
    if (!dims) continue
    const newTag = tag.replace(/^<img\s+/i, `<img width="${dims.w}" height="${dims.h}" `)
    out = out.replace(tag, newTag)
    changed++
  }
  return { out, changed }
}

await connectDB(process.env.MONGODB_URI)
console.log(APPLY ? '=== MODE APPLY (écriture en base) ===' : '=== DRY-RUN (aucune écriture) ===')

const articles = await Article.find({}, 'slug content').lean()
let totalChanged = 0
let articlesTouched = 0
for (const a of articles) {
  const { out, changed } = await processContent(a.content || '')
  if (changed > 0) {
    articlesTouched++
    totalChanged += changed
    console.log(`  ${a.slug}: +${changed} image(s) dimensionnée(s)`)
    if (APPLY) await Article.updateOne({ _id: a._id }, { $set: { content: out } })
  }
}

console.log(`\n${totalChanged} image(s) sur ${articlesTouched} article(s)${APPLY ? ' mises à jour.' : ' seraient mises à jour (dry-run).'}`)
await disconnectDB()
process.exit(0)
