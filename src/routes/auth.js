import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import jwt from 'jsonwebtoken'
import { User } from '../models/User.js'

const router = Router()

// Brute-force protection: after 5 failed logins from the same IP, block for
// 15 minutes (even with the right password, so a bot can't confirm a hit).
// Successful logins don't count against the quota. In-memory store - resets
// on dyno restart, which is fine for slowing password guessing.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' },
})

router.post('/login', loginLimiter, async (req, res, next) => {
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
