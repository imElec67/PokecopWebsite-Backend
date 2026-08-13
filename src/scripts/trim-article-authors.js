// Nettoie le champ "author" des articles : retire les espaces en début/fin
// (qui créaient de faux doublons d'auteurs). Idempotent.
//
//   node src/scripts/trim-article-authors.js          # DRY-RUN
//   node src/scripts/trim-article-authors.js --apply  # écrit en base
import 'dotenv/config'
import { connectDB, disconnectDB } from '../config/db.js'
import { Article } from '../models/Article.js'

const APPLY = process.argv.includes('--apply')

await connectDB(process.env.MONGODB_URI)

const dirty = await Article.find(
  { $expr: { $ne: ['$author', { $trim: { input: '$author' } }] } },
  'slug author'
).lean()

console.log(`${dirty.length} article(s) avec des espaces parasites :`)
for (const a of dirty) console.log(`  "${a.author}" → "${(a.author || '').trim()}"  (${a.slug})`)

if (APPLY && dirty.length) {
  const res = await Article.updateMany(
    { author: { $type: 'string' } },
    [{ $set: { author: { $trim: { input: '$author' } } } }],
    { updatePipeline: true }
  )
  console.log(`✅ appliqué — ${res.modifiedCount} article(s) mis à jour`)
} else if (!APPLY) {
  console.log('(dry-run — relance avec --apply pour écrire)')
}

await disconnectDB()
process.exit(0)
