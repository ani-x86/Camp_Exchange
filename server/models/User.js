import mongoose from 'mongoose';
import {
  VERIFICATION_STATUS,
  ROLES,
  LIMITS,
} from '../config/constants.js';

const { Schema } = mongoose;
const COLLEGE_EMAIL_DOMAIN = process.env.COLLEGE_EMAIL_DOMAIN || 'college.edu';
const CAMPUS_NAME = process.env.CAMPUS_NAME || 'ABC College';

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required.'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters.'],
      maxlength: [80, 'Name must be 80 characters or fewer.'],
    },

    collegeEmail: {
      type: String,
      required: [true, 'College email is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator(v) {
          // Configurable domain check — COLLEGE_EMAIL_DOMAIN env var
          return v.endsWith(`@${COLLEGE_EMAIL_DOMAIN}`);
        },
        message: `Email must be a valid @${COLLEGE_EMAIL_DOMAIN} address.`,
      },
    },

    // select: false — never returned unless explicitly projected
    // rules.md: never log or return full objects containing passwordHash
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required.'],
      select: false,
    },

    prn: {
      type: String,
      required: [true, 'PRN is required.'],
      unique: true,
      trim: true,
      match: [/^\d+$/, 'PRN must contain digits only.'],
    },

    mobileNumber: { type: String, trim: true }, // normalized E.164 e.g. +919876543210

    department: { type: String, trim: true },

    academicYear: { type: String, trim: true }, // e.g. "3rd Year (Sem 5)"

    campusAddress: { type: String, trim: true }, // e.g. "Hostel Block B, Room 314"

    campus: {
      type: String,
      required: true,
      default: CAMPUS_NAME,
    },

    bio: {
      type: String,
      trim: true,
      maxlength: [LIMITS.BIO_MAX, `Bio must be ${LIMITS.BIO_MAX} characters or fewer.`],
    },

    avatarUrl: { type: String }, // Cloudinary public URL

    // rules.md rule 2: never returned to general frontend — only admin verification endpoint
    idCardImagePublicId: {
      type: String,
      select: false,
    },

    verificationStatus: {
      type: String,
      enum: {
        values: VERIFICATION_STATUS,
        message: '{VALUE} is not a valid verification status.',
      },
      default: 'pending',
    },

    // OCR match score from the verification microservice (0–1)
    verificationConfidence: {
      type: Number,
      min: [0, 'Confidence must be ≥ 0.'],
      max: [1, 'Confidence must be ≤ 1.'],
    },

    verifiedAt: { type: Date },

    role: {
      type: String,
      enum: { values: ROLES, message: '{VALUE} is not a valid role.' },
      default: 'student',
    },
  },
  {
    timestamps: true,
    strict: true,
    versionKey: false,
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// admin verification review queue — compound index, no field-level equivalent
userSchema.index({ verificationStatus: 1, createdAt: 1 });

// ── Virtual ───────────────────────────────────────────────────────────────────

// Convenience boolean that profile page and Add Item page read
userSchema.virtual('verified').get(function () {
  return this.verificationStatus === 'verified';
});

// ── toJSON transform ──────────────────────────────────────────────────────────
// rules.md: passwordHash, idCardImagePublicId, __v must NEVER appear in output

userSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    delete ret.passwordHash;
    delete ret.idCardImagePublicId;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('User', userSchema);
