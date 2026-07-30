// Usage: npm run seed:invitations   (upsert par slug, idempotent)
import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { connectDB, disconnectDB } from '../config/db.js'
import { Series } from '../models/Series.js'

const data = JSON.parse(
  readFileSync(fileURLToPath(new URL('./invitations-seed.json', import.meta.url)), 'utf8')
)

await connectDB(process.env.MONGODB_URI)
let n = 0
for (const g of data.games) {
  for (const s of g.series) {
    await Series.findOneAndUpdate(
      { slug: s.slug },
      { ...s, game: g.game },
      { upsert: true, setDefaultsOnInsert: true }
    )
    n++
  }
}
console.log(`Seeded ${n} séries`)
await disconnectDB()
process.exit(0)
