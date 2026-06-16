// Usage: node src/scripts/seedUser.js <email> <name> <password>
import 'dotenv/config'
import { connectDB, disconnectDB } from '../config/db.js'
import { User } from '../models/User.js'

const [, , email, name, password] = process.argv
if (!email || !name || !password) {
  console.error('Usage: npm run seed -- <email> <name> <password>')
  process.exit(1)
}

await connectDB(process.env.MONGODB_URI)
const passwordHash = await User.hashPassword(password)
await User.findOneAndUpdate(
  { email: email.toLowerCase() },
  { email: email.toLowerCase(), name, passwordHash },
  { upsert: true, returnDocument: 'after' }
)
console.log(`Seeded user ${email}`)
await disconnectDB()
process.exit(0)
