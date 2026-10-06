import mongoose from 'mongoose';
import {
  CATEGORIES,
  CONDITIONS,
  PRODUCT_STATUS,
  LIMITS,
} from '../config/constants.js';

const { Schema } = mongoose;
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME?.trim() || '';

/**
 * Validates that an image URL is a genuine Cloudinary delivery URL.
 * Rejects `data:` URLs — listing.md mock data uses them but the real DB must not.
 */
function isCloudinaryUrl(url) {
  if (!url) return false;
  if (url.startsWith('data:')) return false;
  // Accept both the configured cloud name and the generic res.cloudinary.com pattern
  return (
    url.startsWith('https://res.cloudinary.com/') ||
    (CLOUDINARY_CLOUD_NAME &&
      url.includes(`res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}`))
  );
}

const imageSchema = new Schema(
  {
    url: {
      type: String,
      required: [true, 'Image URL is required.'],
      validate: {
        validator: isCloudinaryUrl,
        message: 'Image must be a valid Cloudinary URL (data: URLs are not allowed).',
      },
    },
    publicId: {
      type: String,
      required: [true, 'Image Cloudinary public ID is required.'],
    },
  },
  { _id: false }
);

const productSchema = new Schema(
  {
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Seller ID is required.'],
      index: true,
    },

    title: {
      type: String,
      required: [true, 'Title is required.'],
      trim: true,
      minlength: [LIMITS.TITLE[0], `Title must be at least ${LIMITS.TITLE[0]} characters.`],
      maxlength: [LIMITS.TITLE[1], `Title must be ${LIMITS.TITLE[1]} characters or fewer.`],
    },

    description: {
      type: String,
      required: [true, 'Description is required.'],
      trim: true,
      minlength: [LIMITS.DESCRIPTION[0], `Description must be at least ${LIMITS.DESCRIPTION[0]} characters.`],
      maxlength: [LIMITS.DESCRIPTION[1], `Description must be ${LIMITS.DESCRIPTION[1]} characters or fewer.`],
    },

    category: {
      type: String,
      required: [true, 'Category is required.'],
      enum: { values: CATEGORIES, message: '{VALUE} is not a valid category.' },
    },

    condition: {
      type: String,
      enum: { values: CONDITIONS, message: '{VALUE} is not a valid condition.' },
    },

    // Integer whole rupees — database.md §8
    price: {
      type: Number,
      required: [true, 'Price is required.'],
      min: [LIMITS.PRICE[0], `Price must be at least ₹${LIMITS.PRICE[0]}.`],
      max: [LIMITS.PRICE[1], `Price must be ₹${LIMITS.PRICE[1].toLocaleString('en-IN')} or less.`],
      validate: {
        validator: Number.isInteger,
        message: 'Price must be a whole number (no decimals).',
      },
    },

    // First item is always the primary image — database.md §4.2
    // Length validated in schema validator (not enum) to allow a custom message
    images: {
      type: [imageSchema],
      validate: [
        {
          validator(arr) { return arr.length >= 1; },
          message: 'At least one image is required.',
        },
        {
          validator(arr) { return arr.length <= LIMITS.MAX_IMAGES; },
          message: `A listing can have at most ${LIMITS.MAX_IMAGES} images.`,
        },
      ],
    },

    status: {
      type: String,
      enum: { values: PRODUCT_STATUS, message: '{VALUE} is not a valid product status.' },
      default: 'available',
    },

    // Set only while status === 'reserved'
    reservedFor: { type: Schema.Types.ObjectId, ref: 'User' },

    pickup: {
      location: { type: String },
      timeWindow: { type: String },
    },

    viewCount: { type: Number, default: 0, min: 0 },

    soldAt: { type: Date },
  },
  {
    timestamps: true,
    strict: true,
    versionKey: false,
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// Full-text search — title weighted 10x, description 2x (database.md §5)
productSchema.index(
  { title: 'text', description: 'text' },
  { weights: { title: 10, description: 2 }, name: 'product_text_search' }
);

// Browse with category + price filters
productSchema.index({ status: 1, category: 1, price: 1 });

// Newest-first dashboard feed
productSchema.index({ status: 1, createdAt: -1 });

// Seller's "My Listings" view
productSchema.index({ sellerId: 1, createdAt: -1 });

// ── Helper — exported for service layer ──────────────────────────────────────

/**
 * assertSellerVerified — checks that the user with `userId` has verificationStatus === 'verified'.
 * Call from the product creation service before saving a new product.
 */
export async function assertSellerVerified(userId) {
  const User = mongoose.model('User');
  const user = await User.findById(userId).select('verificationStatus').lean();
  if (!user) throw new Error('Seller not found.');
  if (user.verificationStatus !== 'verified') {
    throw new Error('Only verified students can list items for sale.');
  }
}

export default mongoose.model('Product', productSchema);
