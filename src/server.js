import 'dotenv/config'
import { connectDB } from './config/db.js'
import { app } from './app.js'

const port = process.env.PORT || 4000

connectDB(process.env.MONGODB_URI)
  .then(() => {
    app.listen(port, () => console.log(`API listening on :${port}`))
  })
  .catch((err) => {
    console.error('Failed to start server:', err)
    process.exit(1)
  })
