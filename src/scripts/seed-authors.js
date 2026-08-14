// Crée les auteurs existants (upsert par slug, idempotent).
//   node src/scripts/seed-authors.js
import 'dotenv/config'
import { connectDB, disconnectDB } from '../config/db.js'
import { Author } from '../models/Author.js'

const AUTHORS = [
  {
    slug: 'cynthia',
    name: 'Cynthia',
    signature: 'Cynthia de Pokecop',
    role: 'Rôle à compléter (ex. Rédactrice en chef TCG)',
    bio: "Bio à compléter : ancienneté dans le TCG, domaines d'expertise (Pokémon, One Piece…), et ce qui rend son analyse fiable.",
    order: 1,
  },
  { slug: 'morgans', name: 'Morgans', signature: 'Morgans de Pokecop', role: 'Rôle à compléter', bio: 'Bio à compléter.', order: 2 },
  { slug: 'ariel', name: 'Ariel', signature: 'Ariel de Pokecop', role: 'Rôle à compléter', bio: 'Bio à compléter.', order: 3 },
  { slug: 'lucy', name: 'Lucy', signature: 'Lucy de Pokecop', role: 'Rôle à compléter', bio: 'Bio à compléter.', order: 4 },
  { slug: 'tsunade', name: 'Tsunade', signature: 'Tsunade de Pokecop', role: 'Rôle à compléter', bio: 'Bio à compléter.', order: 5 },
  { slug: 'varus', name: 'Varus', signature: 'Varus de Pokecop', role: 'Rôle à compléter', bio: 'Bio à compléter.', order: 6 },
]

await connectDB(process.env.MONGODB_URI)
let n = 0
for (const a of AUTHORS) {
  await Author.findOneAndUpdate({ slug: a.slug }, { $setOnInsert: a }, { upsert: true, setDefaultsOnInsert: true })
  n++
}
console.log(`Seeded ${n} auteurs`)
await disconnectDB()
process.exit(0)
