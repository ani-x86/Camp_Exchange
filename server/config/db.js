import mongoose from 'mongoose';

let _connected = false;

/**
 * connectDB — connects to MongoDB Atlas using MONGODB_URI from env.
 * Safe to call multiple times (no-op if already connected).
 * database.md §6
 */
export async function connectDB() {
  if (_connected || mongoose.connection.readyState === 1) return;

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || 'campx';

  if (!uri) {
    throw new Error('[connectDB] MONGODB_URI is not set in environment variables.');
  }

  // autoIndex: true in dev, false in prod (sync via syncAllIndexes() on deploy)
  const isDev = process.env.NODE_ENV !== 'production';

  try {
    await mongoose.connect(uri, {
      dbName,
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
      autoIndex: isDev,
    });

    _connected = true;
    console.log(`[DB] Connected to MongoDB — db: "${dbName}" env: ${process.env.NODE_ENV || 'development'}`);
  } catch (err) {
    // Log without embedding credentials
    console.error(`[DB] Connection failed: ${err.message}`);
    throw err;
  }
}

/**
 * disconnectDB — graceful shutdown.
 */
export async function disconnectDB() {
  if (!_connected && mongoose.connection.readyState === 0) return;
  await mongoose.connection.close();
  _connected = false;
  console.log('[DB] Disconnected from MongoDB.');
}

/**
 * syncAllIndexes — call on deployment when autoIndex is false.
 * Runs ensureIndexes on every registered model.
 */
export async function syncAllIndexes() {
  const modelNames = mongoose.modelNames();
  console.log(`[DB] Syncing indexes for: ${modelNames.join(', ')}`);
  await Promise.all(
    modelNames.map((name) => mongoose.model(name).ensureIndexes())
  );
  console.log('[DB] Index sync complete.');
}

// ── Connection event logging (no credentials in logs) ──────────────────────────

mongoose.connection.on('disconnected', () => {
  _connected = false;
  console.warn('[DB] MongoDB disconnected.');
});

mongoose.connection.on('reconnected', () => {
  _connected = true;
  console.log('[DB] MongoDB reconnected.');
});

mongoose.connection.on('error', (err) => {
  console.error(`[DB] MongoDB error: ${err.message}`);
});

// ── Graceful shutdown on SIGINT / SIGTERM ──────────────────────────────────────

async function shutdown(signal) {
  console.log(`\n[DB] ${signal} received — closing MongoDB connection.`);
  await disconnectDB();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ── Legacy named export for backward compat with existing server.js ────────────
export { _connected as isConnected };
