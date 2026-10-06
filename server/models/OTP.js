import mongoose from 'mongoose';
import { OTP_PURPOSES, LIMITS } from '../config/constants.js';

const { Schema } = mongoose;

const otpSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required.'],
      lowercase: true,
      trim: true,
      index: true,
    },

    // Hashed OTP code — never store the plain code (database.md §4.4)
    codeHash: {
      type: String,
      required: [true, 'Code hash is required.'],
    },

    purpose: {
      type: String,
      enum: { values: OTP_PURPOSES, message: '{VALUE} is not a valid OTP purpose.' },
      required: [true, 'Purpose is required.'],
    },

    // Max 5 attempts before the OTP is considered burned
    attempts: {
      type: Number,
      default: 0,
      max: [5, 'Maximum OTP attempts exceeded.'],
    },

    expiresAt: {
      type: Date,
      required: [true, 'Expiry date is required.'],
    },

    // Stores { name, prn, passwordHash } for 'signup' purpose
    // so we can create the User only after OTP is verified.
    // select: false — never returned in normal queries.
    tempData: { type: Schema.Types.Mixed, select: false },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
    strict: true,
    versionKey: false,
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// TTL index — MongoDB auto-deletes documents when expiresAt is reached (database.md §4.4)
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Latest OTP lookup (find most recent valid OTP for an email + purpose)
otpSchema.index({ email: 1, purpose: 1, createdAt: -1 });

export default mongoose.model('OTP', otpSchema);
