/**
 * CampX — users repository.
 * database.md §4.1
 *
 * Rules enforced here:
 *  - No SELECT * — every query names its columns explicitly.
 *  - getAuthRecordByEmail is the ONLY function that may read password_hash.
 *  - toPublicUser always strips passwordHash + idCardImagePublicId and adds
 *    a computed `verified` boolean.
 *  - College domain validated before insert (env COLLEGE_EMAIL_DOMAIN).
 *  - Postgres error codes mapped to friendly messages (§8).
 */

import { getPool } from '../pool.js';
import { VERIFICATION_STATUS, ROLES, LIMITS } from '../constants.js';

const COLLEGE_EMAIL_DOMAIN = process.env.COLLEGE_EMAIL_DOMAIN || 'college.edu';
const CAMPUS_NAME = process.env.CAMPUS_NAME || 'ABC College';

// Columns safe for public API responses (no password_hash, no id_card_image_public_id)
const PUBLIC_COLUMNS = `
  id, name, college_email, prn, mobile_number, department, academic_year,
  campus_address, campus, bio, avatar_url, verification_status,
  verification_confidence, verified_at, role, created_at, updated_at
`.trim();

/**
 * toPublicUser — maps a DB row to the API shape.
 * Always strips passwordHash and idCardImagePublicId.
 * Adds computed boolean `verified`.
 */
export function toPublicUser(row) {
  if (!row) return null;
  const { password_hash, id_card_image_public_id, ...rest } = row;
  return {
    id: rest.id,
    name: rest.name,
    collegeEmail: rest.college_email,
    prn: rest.prn,
    mobileNumber: rest.mobile_number ?? null,
    department: rest.department ?? null,
    academicYear: rest.academic_year ?? null,
    campusAddress: rest.campus_address ?? null,
    campus: rest.campus,
    bio: rest.bio ?? null,
    avatarUrl: rest.avatar_url ?? null,
    verificationStatus: rest.verification_status,
    verificationConfidence: rest.verification_confidence ?? null,
    verifiedAt: rest.verified_at ?? null,
    role: rest.role,
    createdAt: rest.created_at,
    updatedAt: rest.updated_at,
    // Computed boolean that profile page and Add Item page read
    verified: rest.verification_status === 'verified',
  };
}

function validateEmail(email) {
  if (!email.endsWith(`@${COLLEGE_EMAIL_DOMAIN}`)) {
    const err = new Error(
      `Email must be a valid @${COLLEGE_EMAIL_DOMAIN} address.`
    );
    err.status = 400;
    throw err;
  }
}

function mapPgError(err) {
  if (err.code === '23505') {
    if (err.constraint?.includes('college_email')) {
      return Object.assign(
        new Error('An account with this email already exists.'),
        { status: 409 }
      );
    }
    if (err.constraint?.includes('prn')) {
      return Object.assign(
        new Error('An account with this PRN already exists.'),
        { status: 409 }
      );
    }
    return Object.assign(new Error('Duplicate value.'), { status: 409 });
  }
  if (err.code === '23514') {
    return Object.assign(
      new Error(`Validation failed: ${err.detail || err.message}`),
      { status: 400 }
    );
  }
  return err;
}

export async function createUser({ name, collegeEmail, passwordHash, prn, campus }) {
  const email = collegeEmail.trim().toLowerCase();
  validateEmail(email);

  const pool = getPool();
  try {
    const { rows } = await pool.query(
      `INSERT INTO users
         (name, college_email, password_hash, prn, campus)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${PUBLIC_COLUMNS}`,
      [name.trim(), email, passwordHash, prn.trim(), campus || CAMPUS_NAME]
    );
    return toPublicUser(rows[0]);
  } catch (err) {
    throw mapPgError(err);
  }
}

export async function findUserById(id) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`,
    [id]
  );
  return toPublicUser(rows[0]);
}

export async function findUserByEmail(email) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_COLUMNS} FROM users WHERE college_email = $1`,
    [email.toLowerCase()]
  );
  return toPublicUser(rows[0]);
}

/**
 * getAuthRecordByEmail — the ONLY function allowed to read password_hash.
 * Returns the raw row (including passwordHash) for bcrypt comparison.
 */
export async function getAuthRecordByEmail(email) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT id, college_email, password_hash, role, verification_status
     FROM users WHERE college_email = $1`,
    [email.toLowerCase()]
  );
  return rows[0] ?? null;
}

export async function updateUser(id, fields) {
  // Only EDITABLE_USER_FIELDS can be changed here;
  // callers enforce the whitelist at the route level.
  const allowed = ['college_email', 'mobile_number', 'bio', 'avatar_url'];
  const sets = [];
  const values = [];

  for (const [k, v] of Object.entries(fields)) {
    if (!allowed.includes(k)) continue;
    sets.push(`${k} = $${values.length + 1}`);
    values.push(v);
  }

  if (sets.length === 0) return findUserById(id);

  values.push(id);
  const pool = getPool();
  try {
    const { rows } = await pool.query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${values.length}
       RETURNING ${PUBLIC_COLUMNS}`,
      values
    );
    return toPublicUser(rows[0]);
  } catch (err) {
    throw mapPgError(err);
  }
}

export async function setVerificationStatus(id, status, { confidence, verifiedAt, idCardImagePublicId } = {}) {
  const pool = getPool();
  const { rows } = await pool.query(
    `UPDATE users
     SET verification_status        = $1,
         verification_confidence    = $2,
         verified_at                = $3,
         id_card_image_public_id    = COALESCE($4, id_card_image_public_id)
     WHERE id = $5
     RETURNING ${PUBLIC_COLUMNS}`,
    [status, confidence ?? null, verifiedAt ?? null, idCardImagePublicId ?? null, id]
  );
  return toPublicUser(rows[0]);
}

export async function getPendingReviewUsers() {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_COLUMNS}, id_card_image_public_id
     FROM users
     WHERE verification_status = 'pending_review'
     ORDER BY created_at ASC`
  );
  return rows.map((r) => ({ ...toPublicUser(r), idCardImagePublicId: r.id_card_image_public_id }));
}

export async function countUsers(filter = {}) {
  const pool = getPool();
  const conditions = [];
  const values = [];
  if (filter.verificationStatus) {
    values.push(filter.verificationStatus);
    conditions.push(`verification_status = $${values.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM users ${where}`, values);
  return rows[0].n;
}
