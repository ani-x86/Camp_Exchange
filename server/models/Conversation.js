import mongoose from 'mongoose';

const { Schema } = mongoose;

const conversationSchema = new Schema(
  {
    listingId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Listing ID is required.'],
    },

    // Set server-side from the authenticated user — never from request body
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Buyer ID is required.'],
    },

    // Set server-side from product.sellerId — never from request body
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Seller ID is required.'],
    },

    // Snapshot keeps the header readable if the listing is edited or removed
    listingSnapshot: {
      title:    { type: String, required: true },
      price:    { type: Number, required: true },
      imageUrl: { type: String, required: true },
    },

    // Truncated to 120 chars — for inbox preview row only
    lastMessage: {
      body:      { type: String, maxlength: 120 },
      senderId:  { type: Schema.Types.ObjectId, ref: 'User' },
      createdAt: { type: Date },
    },

    unread: {
      buyer:  { type: Number, default: 0, min: 0 },
      seller: { type: Number, default: 0, min: 0 },
    },
  },
  {
    timestamps: true,
    strict: true,
    versionKey: false,
  }
);

// ── Validation: buyer !== seller ──────────────────────────────────────────────
conversationSchema.pre('validate', function () {
  if (
    this.buyerId &&
    this.sellerId &&
    this.buyerId.toString() === this.sellerId.toString()
  ) {
    this.invalidate('buyerId', "You can't message yourself.");
  }
});

// ── Indexes ───────────────────────────────────────────────────────────────────

// Prevents duplicate conversations; creation must handle the duplicate-key race
conversationSchema.index(
  { listingId: 1, buyerId: 1, sellerId: 1 },
  { unique: true }
);

// Buyer inbox — newest updated conversations first
conversationSchema.index({ buyerId: 1, updatedAt: -1 });

// Seller inbox — newest updated conversations first
conversationSchema.index({ sellerId: 1, updatedAt: -1 });

export default mongoose.model('Conversation', conversationSchema);
