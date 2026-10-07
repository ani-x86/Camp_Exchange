/**
 * CampX — Migration runner.
 * database.md §5 (idempotent tracking)
 *
 * Usage:  node src/db/migrate.js   (or npm run migrate)
 *
 * Reads all .sql files from src/db/migrations/ in ascending numeric order.
 * Each migration runs in its own transaction; on failure it rolls back and
 * exits so the applied set is always consistent.
 * Already-applied migrations are skipped (checked via schema_migrations table).
 * Never edit an applied migration — add a new numbered file instead.
 */

import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool, disconnectDB } from './pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       TEXT        PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function getApplied(client) {
  const { rows } = await client.query(
    'SELECT name FROM schema_migrations ORDER BY name'
  );
  return new Set(rows.map((r) => r.name));
}

async function runMigrations() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    // Ensure tracking table exists outside any transaction
    await ensureMigrationsTable(client);

    const files = (await readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith('.sql'))
      .sort(); // ascending — 0001, 0002, …

    const applied = await getApplied(client);
    let ran = 0;

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`[migrate] ✓ skipped  ${file} (already applied)`);
        continue;
      }

      const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8');

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (name) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`[migrate] ✅ applied  ${file}`);
        ran++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[migrate] ❌ failed   ${file}: ${err.message}`);
        throw err;
      }
    }

    if (ran === 0) {
      console.log('[migrate] Nothing to apply — schema is up to date.');
    } else {
      console.log(`[migrate] Done — ${ran} migration(s) applied.`);
    }
  } finally {
    client.release();
    await disconnectDB();
  }
}

runMigrations().catch((err) => {
  console.error('[migrate] Fatal:', err.message);
  process.exit(1);
});
