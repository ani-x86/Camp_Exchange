import mongoose from 'mongoose';

const { Schema } = mongoose;

const refreshTokenSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required.'],
      index: true,
    },

    // Only a hash of the token is stored — the raw token lives in the httpOnly cookie.
    // If this collection is breached, tokens cannot be replayed without the raw values.
    tokenHash: {
      type: String,
      required: [true, 'Token hash is required.'],
      unique: true,
    },

    expiresAt: {
      type: Date,
      required: [true, 'Expiry date is required.'],
    },

    // Set on logout or rotation — allows detecting replay of revoked tokens
    revokedAt: { type: Date },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
    strict: true,
    versionKey: false,
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// TTL index — auto-removes expired tokens (database.md §4.7)
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Lookup by token hash on refresh + revoke
refreshTokenSchema.index({ tokenHash: 1 }, { unique: true });

export default mongoose.model('RefreshToken', refreshTokenSchema);
