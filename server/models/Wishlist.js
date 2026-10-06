import mongoose from 'mongoose';

const { Schema } = mongoose;

const wishlistSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required.'],
    },

    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required.'],
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
    strict: true,
    versionKey: false,
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// Unique compound — prevents duplicate saves and serves as the primary lookup key
wishlistSchema.index({ userId: 1, productId: 1 }, { unique: true });

export default mongoose.model('Wishlist', wishlistSchema);
