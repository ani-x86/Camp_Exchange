/**
 * CampX — otps repository.
 * database.md §4.4
 *
 * PostgreSQL has no TTL index. Instead:
 *  - Every read filters WHERE expires_at > now().
 *  - purgeExpiredOtps() deletes rows past expiry (run on a schedule).
 *
 * code_hash is always stored — never the plain OTP code.
 */

import { getPool } from '../pool.js';
import { LIMITS } from '../constants.js';

export async function createOtp({ email, codeHash, purpose, tempData }) {
  const expiresAt = new Date(
    Date.now() + LIMITS.OTP_TTL_MINUTES * 60 * 1000
  );

  const pool = getPool();
  // Delete any existing OTP for the same email+purpose (resend scenario)
  await pool.query(
    'DELETE FROM otps WHERE email = $1 AND purpose = $2',
    [email.toLowerCase(), purpose]
  );

  const { rows } = await pool.query(
    `INSERT INTO otps (email, code_hash, purpose, expires_at, temp_data)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id, email, purpose, attempts, expires_at, created_at`,
    [email.toLowerCase(), codeHash, purpose, expiresAt,
     tempData ? JSON.stringify(tempData) : null]
  );
  return rows[0];
}

/**
 * findValidOtp — returns the most recent, non-expired, not-burned OTP.
 * Includes temp_data so the caller can create the user on verify.
 */
export async function findValidOtp(email, purpose) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT id, email, code_hash, purpose, attempts, expires_at, temp_data, created_at
     FROM otps
     WHERE email = $1
       AND purpose = $2
       AND expires_at > now()
       AND attempts < $3
     ORDER BY created_at DESC
     LIMIT 1`,
    [email.toLowerCase(), purpose, LIMITS.OTP_MAX_ATTEMPTS]
  );
  return rows[0] ?? null;
}

export async function incrementOtpAttempts(id) {
  const pool = getPool();
  await pool.query(
    'UPDATE otps SET attempts = attempts + 1 WHERE id = $1',
    [id]
  );
}

export async function deleteOtp(id) {
  const pool = getPool();
  await pool.query('DELETE FROM otps WHERE id = $1', [id]);
}

/**
 * purgeExpiredOtps — deletes all expired OTP rows.
 * Should be called on a cron schedule (e.g. pg_cron or an external scheduler).
 * @returns {number} rows deleted
 */
export async function purgeExpiredOtps() {
  const pool = getPool();
  const { rowCount } = await pool.query(
    'DELETE FROM otps WHERE expires_at <= now()'
  );
  return rowCount;
}
