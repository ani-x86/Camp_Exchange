import mongoose from 'mongoose';
import { REPORT_STATUS, REPORT_REASONS } from '../config/constants.js';

const { Schema } = mongoose;

const reportSchema = new Schema(
  {
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reporter ID is required.'],
    },

    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required.'],
    },

    reason: {
      type: String,
      required: [true, 'Reason is required.'],
      enum: { values: REPORT_REASONS, message: '{VALUE} is not a valid report reason.' },
    },

    details: {
      type: String,
      trim: true,
      maxlength: [300, 'Details must be 300 characters or fewer.'],
    },

    status: {
      type: String,
      enum: { values: REPORT_STATUS, message: '{VALUE} is not a valid report status.' },
      default: 'open',
    },

    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' }, // admin

    reviewedAt: { type: Date },
  },
  {
    timestamps: true,
    strict: true,
    versionKey: false,
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// Admin queue — open reports first, oldest first
reportSchema.index({ status: 1, createdAt: 1 });

// Prevents a user from reporting the same listing twice
reportSchema.index({ reporterId: 1, productId: 1 }, { unique: true });

export default mongoose.model('Report', reportSchema);
