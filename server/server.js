import 'dotenv/config';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { Server as SocketServer } from 'socket.io';

import { connectDB, getPool } from './config/db.js';
import errorHandler from './middleware/errorHandler.js';

import authRoutes from './routes/auth.routes.js';
import verificationRoutes from './routes/verification.routes.js';
import productRoutes from './routes/product.routes.js';
import cartRoutes from './routes/cart.routes.js';
import transactionRoutes from './routes/transaction.routes.js';
import adminRoutes from './routes/admin.routes.js';
import conversationRoutes from './routes/conversation.routes.js';

import { webhookHandler } from './controllers/transaction.controller.js';
import { initChatSocket } from './sockets/chatSocket.js';

const app = express();

// ─── Ensure DB pool is ready on first request ─────────────────────────────────
app.use(async (_req, _res, next) => {
  try {
    getPool(); // throws if DATABASE_URL missing
    next();
  } catch (err) {
    next(err);
  }
});

// ─── Webhook Route ────────────────────────────────────────────────────────────
// CRITICAL: Must use express.raw() to preserve the raw body for signature verification.
// This MUST come before app.use(express.json()).
app.post('/api/transactions/webhook', express.raw({ type: 'application/json' }), webhookHandler);

// ─── Core Middleware ──────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  let dbStatus = 'unknown';
  try {
    const pool = getPool();
    await pool.query('SELECT 1');
    dbStatus = 'connected';
  } catch {
    dbStatus = 'disconnected';
  }
  res.json({
    status: 'ok',
    service: 'campx-backend',
    phase: 5,
    db: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/conversations', conversationRoutes);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found. Check the endpoint and try again.' });
});

// ─── Centralized Error Handler ────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const start = async () => {
  await connectDB();

  const httpServer = createServer(app);

  const io = new SocketServer(httpServer, {
    cors: {
      origin: CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  initChatSocket(io);

  httpServer.listen(PORT, () => {
    console.log(`CampX API + Socket.IO running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });
};

if (process.env.VERCEL !== '1') {
  start();
}

export default app;
