import mongoose from 'mongoose'

const articleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // slugs this article used to live under (filled on rename); public reads
    // fall back to them so legacy URLs redirect instead of 404ing
    previousSlugs: { type: [String], default: [], index: true },
    excerpt: { type: String, default: '' },
    content: { type: String, default: '' }, // HTML from the editor
    coverImage: { type: String, default: '' }, // URL
    author: { type: String, default: '' },
    tags: { type: [String], default: [] },
    featured: { type: Boolean, default: false, index: true }, // pinned to top of /blog
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
    publishedAt: { type: Date, default: null },
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform(_doc, ret) {
        ret.id = ret._id.toString()
        delete ret._id
        return ret
      },
    },
  }
)

export const Article = mongoose.model('Article', articleSchema)
