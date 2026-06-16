import { Router } from 'express'
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'
import { requireAuth } from '../middleware/auth.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
})

const router = Router()

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

router.post('/upload', requireAuth, upload.single('image'), (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: 'No image provided' })
  const stream = cloudinary.uploader.upload_stream(
    { folder: 'pokecop-blog', resource_type: 'image' },
    (err, result) => {
      if (err) return next(err)
      res.json({ url: result.secure_url })
    }
  )
  stream.end(req.file.buffer)
})

export default router
