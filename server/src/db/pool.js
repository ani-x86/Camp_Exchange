/**
 * CampX — PostgreSQL connection pool.
 * database.md §6
 *
 * Exports:
 *   getPool()          — returns the shared pg.Pool (creates on first call)
 *   connectDB()        — runs SELECT 1 health check, throws on failure
 *   disconnectDB()     — drains the pool
 *   withTransaction(fn)— BEGIN/COMMIT/ROLLBACK wrapper, always releases client
 *
 * SSL is enabled in production unless the connection string already sets it.
 * No credentials appear in any log line.
 */

import pg from 'pg';

const { Pool } = pg;

let _pool = null;

function redactUrl(url) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.username}:***@${u.host}${u.pathname}`;
  } catch {
    return '<invalid-url>';
  }
}

/**
 * getPool — returns (or creates) the singleton Pool.
 * Safe to call multiple times.
 */
export function getPool() {
  if (_pool) return _pool;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      '[DB] DATABASE_URL is not set. Copy .env.example → .env and fill it in.'
    );
  }

  const isProduction = process.env.NODE_ENV === 'production';

  // Enable SSL in production. If the URL already contains sslmode=require,
  // pg reads it automatically; we add the rejectUnauthorized guard on top.
  const ssl = isProduction ? { rejectUnauthorized: true } : false;

  _pool = new Pool({
    connectionString: url,
    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    ssl,
  });

  _pool.on('connect', () => {
    console.log(`[DB] Pool client connected — ${redactUrl(url)}`);
  });

  _pool.on('error', (err) => {
    // Log without credentials
    console.error(`[DB] Idle client error: ${err.message}`);
  });

  return _pool;
}

/**
 * connectDB — verify connectivity on startup.
 * Throws if the database is unreachable.
 */
export async function connectDB() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    console.log('[DB] PostgreSQL connection verified.');
  } finally {
    client.release();
  }
}

/**
 * disconnectDB — drain the pool gracefully.
 */
export async function disconnectDB() {
  if (!_pool) return;
  await _pool.end();
  _pool = null;
  console.log('[DB] Pool drained and closed.');
}

/**
 * withTransaction — runs `fn(client)` inside BEGIN…COMMIT.
 * Always releases the client; rolls back on error.
 *
 * @param {(client: import('pg').PoolClient) => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function withTransaction(fn) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── Graceful shutdown ──────────────────────────────────────────────────────────

async function shutdown(signal) {
  console.log(`\n[DB] ${signal} — draining pool.`);
  await disconnectDB();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
