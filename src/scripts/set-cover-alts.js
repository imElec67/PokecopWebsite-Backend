// Renseigne le texte alternatif des covers (coverAlt) des articles existants à
// partir d'un fichier JSON { "<slug>": "<alt>" }. N'écrase jamais un coverAlt
// déjà saisi et ne touche pas updatedAt (pas une mise à jour de contenu).
//
//   node src/scripts/set-cover-alts.js src/scripts/cover-alts.json          # DRY-RUN
//   node src/scripts/set-cover-alts.js src/scripts/cover-alts.json --apply  # écrit + rebuild
import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { connectDB, disconnectDB } from '../config/db.js'
import { Article } from '../models/Article.js'
import { triggerDeploy } from '../services/deployHook.js'

const file = process.argv[2]
const APPLY = process.argv.includes('--apply')
if (!file || file.startsWith('--')) {
  console.error('Usage : node src/scripts/set-cover-alts.js <fichier.json> [--apply]')
  process.exit(1)
}
const alts = JSON.parse(readFileSync(file, 'utf8'))

await connectDB(process.env.MONGODB_URI)
let updated = 0
for (const [slug, alt] of Object.entries(alts)) {
  const a = await Article.findOne({ slug })
  if (!a) {
    console.warn(`  ⚠ introuvable : ${slug}`)
    continue
  }
  if (a.coverAlt) {
    console.log(`  = déjà renseigné, ignoré : ${slug}`)
    continue
  }
  console.log(`  + ${slug}\n      "${alt}"`)
  if (APPLY) {
    await Article.updateOne({ _id: a._id }, { $set: { coverAlt: alt.trim() } }, { timestamps: false })
  }
  updated += 1
}
console.log(`\n${updated} article(s) ${APPLY ? 'mis à jour' : 'à mettre à jour (dry-run, rien écrit)'}`)
if (APPLY && updated) await triggerDeploy()
await disconnectDB()
