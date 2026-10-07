/**
 * CampX — refresh_tokens repository.
 * database.md §4.7
 *
 * Raw tokens live in httpOnly cookies only.
 * Only token_hash is stored here — if this table is breached, tokens
 * cannot be replayed without the raw values.
 *
 * Expiry: logical (reads filter expires_at > now() AND revoked_at IS NULL).
 * purgeExpiredRefreshTokens() removes stale rows on a schedule.
 */

import { getPool } from '../pool.js';

const REFRESH_EXPIRY_DAYS = 7;

export async function createRefreshToken(userId, tokenHash) {
  const expiresAt = new Date(
    Date.now() + REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  );

  const pool = getPool();
  const { rows } = await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1,$2,$3)
     RETURNING id, user_id, expires_at, created_at`,
    [userId, tokenHash, expiresAt]
  );
  return rows[0];
}

/**
 * findValidRefreshToken — returns the token row only if valid (not expired, not revoked).
 */
export async function findValidRefreshToken(tokenHash) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT id, user_id, token_hash, expires_at, revoked_at, created_at
     FROM refresh_tokens
     WHERE token_hash = $1
       AND expires_at > now()
       AND revoked_at IS NULL`,
    [tokenHash]
  );
  return rows[0] ?? null;
}

export async function revokeRefreshToken(tokenHash) {
  const pool = getPool();
  await pool.query(
    'UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1',
    [tokenHash]
  );
}

export async function revokeAllUserTokens(userId) {
  const pool = getPool();
  await pool.query(
    'UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL',
    [userId]
  );
}

/**
 * purgeExpiredRefreshTokens — deletes expired and revoked token rows.
 * Should be called on a cron schedule.
 * @returns {number} rows deleted
 */
export async function purgeExpiredRefreshTokens() {
  const pool = getPool();
  const { rowCount } = await pool.query(
    `DELETE FROM refresh_tokens
     WHERE expires_at <= now() OR revoked_at IS NOT NULL`
  );
  return rowCount;
}
