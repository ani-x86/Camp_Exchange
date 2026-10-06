import mongoose from 'mongoose';
import { PAYMENT_STATUS } from '../config/constants.js';

const { Schema } = mongoose;

const transactionSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required.'],
    },

    buyerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Buyer ID is required.'],
    },

    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Seller ID is required.'],
    },

    // Price copied from the product at checkout — never recomputed.
    // Stored as an integer (whole rupees) so receipts survive price edits.
    amount: {
      type: Number,
      required: [true, 'Amount is required.'],
      min: [1, 'Amount must be at least ₹1.'],
      validate: {
        validator: Number.isInteger,
        message: 'Amount must be a whole number.',
      },
    },

    // Snapshot ensures receipts survive product edits or deletion
    productSnapshot: {
      title: { type: String, required: true },
      imageUrl: { type: String, required: true },
    },

    // ── CRITICAL (rules.md rule 1) ─────────────────────────────────────────────
    // paymentStatus MUST only ever be set to 'paid' by markTransactionPaid(),
    // which is called exclusively from the Razorpay webhook handler after
    // cryptographic signature verification. No other route, script, admin
    // action, or direct DB write may set this field to 'paid'. Ever.
    // ──────────────────────────────────────────────────────────────────────────
    paymentStatus: {
      type: String,
      enum: { values: PAYMENT_STATUS, message: '{VALUE} is not a valid payment status.' },
      default: 'created',
    },

    razorpayOrderId: {
      type: String,
      required: [true, 'Razorpay order ID is required.'],
      unique: true,
    },

    // sparse: only indexed when present — database.md §5
    razorpayPaymentId: { type: String },

    paidAt: { type: Date },

    pickupDetails: {
      location: { type: String },
      timeWindow: { type: String },
    },

    receiptSentAt: { type: Date },
  },
  {
    timestamps: true,
    strict: true,
    versionKey: false,
  }
);

// ── Schema validator — buyer ≠ seller ─────────────────────────────────────────
transactionSchema.pre('validate', function () {
  if (
    this.buyerId &&
    this.sellerId &&
    this.buyerId.toString() === this.sellerId.toString()
  ) {
    this.invalidate('buyerId', 'Buyer and seller must be different users.');
  }
});

// ── Indexes ───────────────────────────────────────────────────────────────────

// Webhook lookup — unique index created by unique:true on the field itself

// Duplicate webhook protection — sparse because paymentId is set only after payment
transactionSchema.index(
  { razorpayPaymentId: 1 },
  { unique: true, sparse: true }
);

// Buyer order history
transactionSchema.index({ buyerId: 1, createdAt: -1 });

// Seller sales history
transactionSchema.index({ sellerId: 1, createdAt: -1 });

// ── Static: markTransactionPaid ───────────────────────────────────────────────
/**
 * Idempotent webhook handler — called when Razorpay confirms payment.
 *
 * Rules:
 * - Only moves status from 'created' → 'paid' (never 'failed' → 'paid').
 * - Calling it twice with the same paymentId is safe (no-op on second call).
 * - Also sets the associated product to 'sold' + 'soldAt' in the same session
 *   so both operations succeed or both are rolled back.
 *
 * @param {string} razorpayOrderId
 * @param {string} razorpayPaymentId
 * @returns {Promise<{ transaction, product }>}
 */
transactionSchema.statics.markTransactionPaid = async function (
  razorpayOrderId,
  razorpayPaymentId
) {
  const Transaction = this;
  const Product = mongoose.model('Product');

  // Check for idempotency — if already paid with this exact paymentId, return as-is
  const existing = await Transaction.findOne({ razorpayOrderId });
  if (!existing) throw new Error(`Transaction not found for order ${razorpayOrderId}.`);

  if (existing.paymentStatus === 'paid') {
    // Already processed — idempotent no-op
    return { transaction: existing, product: null };
  }

  // Run both writes inside a MongoDB session/transaction so they are atomic
  const session = await mongoose.startSession();
  let transaction, product;

  try {
    await session.withTransaction(async () => {
      const now = new Date();

      [transaction] = await Transaction.findOneAndUpdate(
        // Guard: only update if still in 'created' state (prevents races)
        { razorpayOrderId, paymentStatus: 'created' },
        {
          paymentStatus: 'paid',
          razorpayPaymentId,
          paidAt: now,
        },
        { new: true, session }
      ).then(doc => [doc]);

      if (!transaction) {
        // Another webhook beat us to it — idempotent exit
        transaction = existing;
        return;
      }

      product = await Product.findByIdAndUpdate(
        transaction.productId,
        { status: 'sold', soldAt: now },
        { new: true, session }
      );
    });
  } finally {
    session.endSession();
  }

  return { transaction, product };
};

export default mongoose.model('Transaction', transactionSchema);
