import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { User } from '../models/User.js'

const router = Router()

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

    const user = await User.findOne({ email: String(email).toLowerCase() })
    if (!user || !(await user.verifyPassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } })
  } catch (err) {
    next(err)
  }
})

export default router
