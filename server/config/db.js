/**
 * config/db.js — re-exports the PostgreSQL pool module.
 *
 * This file exists so existing imports of '../config/db.js' throughout
 * the server still resolve during the MongoDB → PostgreSQL migration.
 * All real logic lives in src/db/pool.js.
 */

export { getPool, connectDB, disconnectDB, withTransaction } from '../src/db/pool.js';
