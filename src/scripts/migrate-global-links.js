// Migration : pose le "lien global" (lien affilié unique de la série) sur les
// séries listées ci-dessous, identifiées par leur code d'extension. Idempotent.
//
//   node src/scripts/migrate-global-links.js          # DRY-RUN (liste + compte)
//   node src/scripts/migrate-global-links.js --apply  # écrit en base
import 'dotenv/config'
import { connectDB, disconnectDB } from '../config/db.js'
import { Series } from '../models/Series.js'

const APPLY = process.argv.includes('--apply')

// code d'extension → lien global affilié. Le setCode est comparé sans
// distinction de casse, espaces/tirets ignorés.
const MAPPING = {
  '8.5': 'https://amzn.to/3UfKMMd',
  '10.5': 'https://amzn.to/3SSkFKU',
  ME01: 'https://amzn.to/4cbaA2h',
  ME02: 'https://amzn.to/4c6H6Cz',
  'ME02.5': 'https://amzn.to/4xn3eRN',
  ME03: 'https://amzn.to/4cDcnNC',
  ME04: 'https://amzn.to/4cbaXtH',
  ME05: 'https://amzn.to/4qzz7Um',
}

// normalise pour comparer : minuscules + suppression des espaces/tirets
const norm = (s) => String(s || '').toLowerCase().replace(/[\s-]/g, '')

await connectDB(process.env.MONGODB_URI)

const all = await Series.find({})
const byCode = new Map()
for (const s of all) byCode.set(norm(s.setCode), s)

let applied = 0
for (const [code, link] of Object.entries(MAPPING)) {
  const serie = byCode.get(norm(code))
  if (!serie) {
    console.log(`⚠️  introuvable : setCode "${code}" (aucune série ne correspond)`)
    continue
  }
  if (serie.globalLink === link) {
    console.log(`=  ${serie.setCode} (${serie.name}) : déjà ${link}`)
    continue
  }
  console.log(`${APPLY ? '✅' : '→'} ${serie.setCode} (${serie.name}) : ${serie.globalLink || '(vide)'} → ${link}`)
  if (APPLY) {
    serie.globalLink = link
    await serie.save()
    applied += 1
  }
}

console.log(APPLY
  ? `\n✅ ${applied} série(s) mise(s) à jour`
  : `\n(dry-run - relance avec --apply pour écrire) ${applied > 0 ? applied : ''}`)

await disconnectDB()
process.exit(0)
