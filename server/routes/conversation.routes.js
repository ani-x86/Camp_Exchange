import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  createOrGetConversation,
  listConversations,
  getConversationById,
  listMessages,
  sendMessageRest,
  markConversationRead,
} from '../controllers/conversationController.js';
import authenticate from '../middleware/authenticate.js';
import requireVerified from '../middleware/requireVerified.js';

const router = Router();

// Rate limits — reusing express-rate-limit already in the project
const conversationLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  message: { error: 'Too many requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const messageLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  message: { error: 'Too many messages, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// All chat routes require authentication
router.use(authenticate);

// POST   /api/conversations
router.post('/',   requireVerified, conversationLimiter, createOrGetConversation);

// GET    /api/conversations
router.get('/',    conversationLimiter, listConversations);

// GET    /api/conversations/:id
router.get('/:id', conversationLimiter, getConversationById);

// GET    /api/conversations/:id/messages
router.get('/:id/messages', messageLimiter, listMessages);

// POST   /api/conversations/:id/messages  (REST fallback)
router.post('/:id/messages', requireVerified, messageLimiter, sendMessageRest);

// PATCH  /api/conversations/:id/read
router.patch('/:id/read', conversationLimiter, markConversationRead);

export default router;
