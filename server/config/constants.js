/**
 * config/constants.js — re-exports the canonical DB constants.
 *
 * Single source of truth lives in src/db/constants.js.
 * This shim lets all existing `import ... from '../config/constants.js'`
 * imports resolve without path changes, while ensuring enums are defined once.
 */

export {
  CATEGORIES,
  CONDITIONS,
  PRODUCT_STATUS,
  VERIFICATION_STATUS,
  ROLES,
  PAYMENT_STATUS,
  OTP_PURPOSES,
  REPORT_STATUS,
  REPORT_REASONS,
  LIMITS,
  LOCKED_USER_FIELDS,
  EDITABLE_USER_FIELDS,
  MESSAGE_TYPES,
  MESSAGE_MAX_LENGTH,
  MESSAGES_PAGE_SIZE,
} from '../src/db/constants.js';
