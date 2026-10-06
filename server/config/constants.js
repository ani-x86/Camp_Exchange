/**
 * CampX — Shared DB constants (single source of truth).
 * database.md §3
 *
 * Every enum and limit is defined ONCE here and imported by models, validators,
 * and seed scripts. Never retype these strings elsewhere.
 */

export const CATEGORIES = [
  'books',
  'electronics',
  'lab-equipment',
  'stationery',
  'furniture',
  'clothing',
  'sports',
  'other',
];

export const CONDITIONS = ['new', 'like-new', 'good', 'fair'];

export const PRODUCT_STATUS = ['available', 'reserved', 'sold'];

export const VERIFICATION_STATUS = [
  'pending',
  'pending_review',
  'verified',
  'rejected',
];

export const ROLES = ['student', 'admin'];

export const PAYMENT_STATUS = ['created', 'paid', 'failed'];

export const OTP_PURPOSES = ['signup', 'reset'];

export const REPORT_STATUS = ['open', 'reviewed', 'dismissed', 'actioned'];

export const REPORT_REASONS = [
  'spam',
  'prohibited-item',
  'misleading',
  'harassment',
  'other',
];

export const LIMITS = {
  TITLE: [3, 80],
  DESCRIPTION: [10, 500],
  PRICE: [1, 100_000], // whole rupees
  BIO_MAX: 300,
  MAX_IMAGES: 6,
  OTP_TTL_MINUTES: 10,
};

/**
 * Fields the student may NOT edit themselves on their own profile.
 * The profile-update route whitelists: collegeEmail, mobileNumber, bio, avatarUrl.
 */
export const LOCKED_USER_FIELDS = [
  'name',
  'prn',
  'department',
  'academicYear',
  'campusAddress',
  'verificationStatus',
  'verificationConfidence',
  'verifiedAt',
  'role',
  'idCardImagePublicId',
  'passwordHash',
];

// ── Chat constants ─────────────────────────────────────────────────────────────

export const MESSAGE_TYPES = ['text'];

export const MESSAGE_MAX_LENGTH = 1000;

export const MESSAGES_PAGE_SIZE = 30;

