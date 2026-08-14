import mongoose from 'mongoose'

const authorSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true }, // affichage court, ex. "Cynthia"
    // = champ "author" des articles (byline), ex. "Cynthia de Pokecop"
    signature: { type: String, required: true, trim: true },
    role: { type: String, default: '' },
    bio: { type: String, default: '' },
    avatar: { type: String, default: '' }, // URL (optionnel)
    sameAs: { type: [String], default: [] }, // profils publics (X, Instagram…)
    order: { type: Number, default: 0 },
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

export const Author = mongoose.model('Author', authorSchema)
