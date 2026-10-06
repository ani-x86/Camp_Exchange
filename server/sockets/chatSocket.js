/**
 * chatSocket — Socket.IO auth, rooms, and message events.
 * chat.md §6.3
 *
 * Security rules:
 *  - Handshake authenticated with the same JWT as REST
 *  - senderId always comes from socket.data.user (never from client payload)
 *  - Room join requires server-side membership check
 *  - Per-user in-memory rate limit on message:send
 */

import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';
import { sendMessage, markRead, toConversationDTO } from '../services/chatService.js';

// Simple per-user in-memory rate limit: 20 messages per 10 seconds
const rateLimitMap = new Map(); // userId → { count, resetAt }

function checkRateLimit(userId) {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 10_000 });
    return true;
  }
  if (entry.count >= 20) return false;
  entry.count++;
  return true;
}

/**
 * initChatSocket — attaches chat namespace to the Socket.IO server.
 * Call once from server.js after creating the io instance.
 *
 * @param {import('socket.io').Server} io
 */
export function initChatSocket(io) {
  // Authenticate every socket handshake using the same JWT as REST
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required.'));
    }
    try {
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      socket.data.user = {
        id: payload.id,
        role: payload.role,
        verificationStatus: payload.verificationStatus,
      };
      next();
    } catch {
      next(new Error('Session expired or invalid.'));
    }
  });

  io.on('connection', (socket) => {
    const { id: userId } = socket.data.user;

    // Join the user's own room for inbox badge updates
    socket.join(`user:${userId}`);

    // ── conversation:join ─────────────────────────────────────────────────────
    socket.on('conversation:join', async ({ conversationId }) => {
      if (!mongoose.isValidObjectId(conversationId)) {
        return socket.emit('error', { code: 'INVALID_ID', message: 'Invalid conversation ID.' });
      }

      try {
        const conv = await Conversation.findById(conversationId).lean();
        if (!conv) {
          return socket.emit('error', { code: 'NOT_FOUND', message: 'Conversation not found.' });
        }

        const isMember =
          conv.buyerId.toString() === userId ||
          conv.sellerId.toString() === userId;

        if (!isMember) {
          return socket.emit('error', { code: 'FORBIDDEN', message: 'Access denied.' });
        }

        socket.join(`conversation:${conversationId}`);
      } catch (err) {
        socket.emit('error', { code: 'SERVER_ERROR', message: err.message });
      }
    });

    // ── message:send ──────────────────────────────────────────────────────────
    socket.on('message:send', async ({ conversationId, body, clientId }) => {
      // Rate limit
      if (!checkRateLimit(userId)) {
        return socket.emit('error', {
          code: 'RATE_LIMITED',
          message: 'Slow down — too many messages.',
          clientId,
        });
      }

      try {
        const msg = await sendMessage(userId, conversationId, body);

        // Emit to every socket in the conversation room (both parties)
        io.to(`conversation:${conversationId}`).emit('message:new', {
          ...msg,
          clientId,
        });

        // Update inbox / badge for both participants
        const conv = await Conversation.findById(conversationId).lean();
        if (conv) {
          const buyerDto  = { conversationId, lastMessage: conv.lastMessage, unread: conv.unread.buyer };
          const sellerDto = { conversationId, lastMessage: conv.lastMessage, unread: conv.unread.seller };
          io.to(`user:${conv.buyerId.toString()}`).emit('conversation:updated', buyerDto);
          io.to(`user:${conv.sellerId.toString()}`).emit('conversation:updated', sellerDto);
        }
      } catch (err) {
        socket.emit('error', {
          code: err.status === 422 ? 'LISTING_UNAVAILABLE' : 'SEND_ERROR',
          message: err.message,
          clientId,
        });
      }
    });

    // ── message:read ──────────────────────────────────────────────────────────
    socket.on('message:read', async ({ conversationId }) => {
      try {
        const result = await markRead(userId, conversationId);
        // Notify the other party their messages were read
        socket.to(`conversation:${conversationId}`).emit('message:read', {
          conversationId,
          readAt: result.readAt,
        });
      } catch {
        // Silent — read receipts are best-effort
      }
    });

    // Leave conversation rooms on disconnect — handled automatically by Socket.IO
  });
}
