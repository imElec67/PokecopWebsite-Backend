import mongoose from 'mongoose'

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    availability: {
      type: String,
      enum: ['in_stock', 'out_of_stock', 'upcoming', 'invitation'],
      default: 'upcoming',
    },
    url: { type: String, default: '' },
  },
  { _id: false }
)

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    image: { type: String, default: '' },
    description: { type: String, default: '' },
    price: { type: Number, default: null },
    priceMax: { type: Number, default: null },
    ean: { type: String, default: '' },
    suppliers: { type: [supplierSchema], default: [] },
  },
  { _id: false }
)

const seriesSchema = new mongoose.Schema(
  {
    game: { type: String, required: true, trim: true }, // "Pokemon" | "One Piece" | …
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true }, // unique tous jeux confondus
    // slugs sous lesquels la série a vécu (renommage) : le public GET y retombe
    previousSlugs: { type: [String], default: [], index: true },
    block: { type: String, default: '' },
    setCode: { type: String, default: '' },
    name: { type: String, required: true, trim: true },
    logo: { type: String, default: '' },
    releaseDate: { type: Date, default: null },
    summary: { type: String, default: '' },
    tip: { type: String, default: '' },
    order: { type: Number, default: 0 },
    items: { type: [itemSchema], default: [] },
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

export const Series = mongoose.model('Series', seriesSchema)
