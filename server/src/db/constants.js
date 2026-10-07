/**
 * CampX — PostgreSQL database constants (single source of truth).
 * database.md §3
 *
 * Every enum and limit is defined ONCE here. SQL CHECK constraints in
 * 0001_init.sql mirror these arrays. The parity test in __tests__/db.test.js
 * reads pg_constraint and asserts they still match.
 *
 * Application code imports from HERE; never re-type enum strings in repos.
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
  OTP_MAX_ATTEMPTS: 5,
};

/**
 * Fields the student may NOT change on their own profile.
 * The profile-update route whitelists EDITABLE_USER_FIELDS only.
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

export const EDITABLE_USER_FIELDS = [
  'collegeEmail',
  'mobileNumber',
  'bio',
  'avatarUrl',
];

// ── Chat constants ─────────────────────────────────────────────────────────────

export const MESSAGE_TYPES = ['text'];
export const MESSAGE_MAX_LENGTH = 1000;
export const MESSAGES_PAGE_SIZE = 30;
