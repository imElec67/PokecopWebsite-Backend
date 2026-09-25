// Migration : les anciens états de disponibilité "in_stock" et "out_of_stock"
// deviennent "link" (un lien reste un lien, dispo ou non). Idempotent.
//
//   node src/scripts/migrate-availability-link.js          # DRY-RUN (compte)
//   node src/scripts/migrate-availability-link.js --apply  # écrit en base
import 'dotenv/config'
import { connectDB, disconnectDB } from '../config/db.js'
import { Series } from '../models/Series.js'

const APPLY = process.argv.includes('--apply')
const OLD = ['in_stock', 'out_of_stock']

await connectDB(process.env.MONGODB_URI)

// compte les fournisseurs encore sur un ancien état
const toFix = await Series.aggregate([
  { $unwind: '$items' },
  { $unwind: '$items.suppliers' },
  { $match: { 'items.suppliers.availability': { $in: OLD } } },
  { $count: 'n' },
])
const n = toFix[0]?.n || 0
console.log(`${n} fournisseur(s) en ${OLD.join('/')} → "link"`)

if (APPLY && n > 0) {
  const res = await Series.updateMany(
    { 'items.suppliers.availability': { $in: OLD } },
    { $set: { 'items.$[].suppliers.$[s].availability': 'link' } },
    { arrayFilters: [{ 's.availability': { $in: OLD } }] }
  )
  console.log(`✅ appliqué - ${res.modifiedCount} série(s) modifiée(s)`)
} else if (!APPLY) {
  console.log('(dry-run - relance avec --apply pour écrire)')
}

await disconnectDB()
process.exit(0)
