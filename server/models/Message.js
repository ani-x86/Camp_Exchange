import mongoose from 'mongoose';
import { MESSAGE_TYPES, MESSAGE_MAX_LENGTH } from '../config/constants.js';

const { Schema } = mongoose;

const messageSchema = new Schema(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'Conversation ID is required.'],
    },

    // Set server-side from the authenticated user — never from socket payload or body
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender ID is required.'],
    },

    body: {
      type: String,
      required: [true, 'Message body is required.'],
      trim: true,
      minlength: [1, 'Message cannot be empty.'],
      maxlength: [MESSAGE_MAX_LENGTH, `Message must be ${MESSAGE_MAX_LENGTH} characters or fewer.`],
    },

    type: {
      type: String,
      enum: { values: MESSAGE_TYPES, message: '{VALUE} is not a valid message type.' },
      default: 'text',
    },

    // Set when the other party reads the message
    readAt: { type: Date },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
    strict: true,
    versionKey: false,
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// History load and cursor pagination (newest first)
messageSchema.index({ conversationId: 1, createdAt: -1 });

export default mongoose.model('Message', messageSchema);
