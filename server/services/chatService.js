/**
 * chatService — all chat business logic shared by REST and Socket.IO handlers.
 * chat.md §6.4, §7
 *
 * Rules enforced here (not in controllers/sockets):
 *  - buyerId/senderId always come from the authenticated user
 *  - sellerId always comes from the product
 *  - Membership verified on every operation
 *  - Message body validated and sanitized
 *  - Sold listing blocks new messages
 */

import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Product from '../models/Product.js';
import { MESSAGES_PAGE_SIZE, MESSAGE_MAX_LENGTH } from '../config/constants.js';

// ── Whitelist for user fields in DTOs ──────────────────────────────────────────
// chat.md §6.5: never expose phone, email, PRN, address, passwordHash, etc.
const USER_DTO_SELECT = 'name verificationStatus avatarUrl';

/**
 * displayName("Aarav Sharma") → "Aarav S."
 */
function displayName(fullName = '') {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

/**
 * toConversationDTO — shapes a Conversation doc + caller context into a safe DTO.
 * chat.md §6.5
 */
function toConversationDTO(conv, callerId) {
  const callerIsbuyer = conv.buyerId._id
    ? conv.buyerId._id.toString() === callerId.toString()
    : conv.buyerId.toString() === callerId.toString();

  const otherUser = callerIsbuyer ? conv.sellerId : conv.buyerId;
  const unreadCount = callerIsbuyer ? conv.unread.buyer : conv.unread.seller;

  const otherUserDoc = typeof otherUser === 'object' && otherUser.name
    ? otherUser
    : null;

  return {
    id: conv._id,
    listing: {
      id: conv.listingId?._id || conv.listingId,
      title: conv.listingSnapshot.title,
      price: conv.listingSnapshot.price,
      imageUrl: conv.listingSnapshot.imageUrl,
      status: conv.listingId?.status,
    },
    otherUser: otherUserDoc
      ? {
          id: otherUserDoc._id,
          displayName: displayName(otherUserDoc.name),
          verified: otherUserDoc.verificationStatus === 'verified',
          avatarUrl: otherUserDoc.avatarUrl || null,
        }
      : null,
    yourRole: callerIsbuyer ? 'buyer' : 'seller',
    lastMessage: conv.lastMessage?.body ? conv.lastMessage : undefined,
    unreadCount,
    updatedAt: conv.updatedAt,
  };
}

/**
 * toMessageDTO — safe message shape.
 */
function toMessageDTO(msg) {
  return {
    id: msg._id,
    conversationId: msg.conversationId,
    senderId: msg.senderId,
    body: msg.body,
    type: msg.type,
    createdAt: msg.createdAt,
    readAt: msg.readAt || null,
  };
}

// ── Service functions ─────────────────────────────────────────────────────────

/**
 * getOrCreateConversation
 * chat.md §6.2
 */
export async function getOrCreateConversation(callerId, listingId) {
  if (!mongoose.isValidObjectId(listingId)) {
    const err = new Error('Invalid listing ID.'); err.status = 400; throw err;
  }

  const product = await Product.findById(listingId)
    .select('sellerId title price images status')
    .lean();

  if (!product) {
    const err = new Error('Listing not found.'); err.status = 404; throw err;
  }
  if (!product.sellerId) {
    const err = new Error("This listing can't be messaged."); err.status = 422; throw err;
  }

  const sellerId = product.sellerId.toString();
  const buyerId  = callerId.toString();

  if (sellerId === buyerId) {
    const err = new Error("You can't message yourself."); err.status = 400; throw err;
  }

  // Optionally block NEW conversations on sold items (existing ones still return)
  // Re-fetch if found by the unique index below handles this gracefully

  const listingSnapshot = {
    title:    product.title,
    price:    product.price,
    imageUrl: product.images?.[0]?.url || '',
  };

  try {
    const conv = await Conversation.findOneAndUpdate(
      { listingId, buyerId: callerId, sellerId: product.sellerId },
      { $setOnInsert: { listingId, buyerId: callerId, sellerId: product.sellerId, listingSnapshot } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate('buyerId', USER_DTO_SELECT)
     .populate('sellerId', USER_DTO_SELECT)
     .populate('listingId', 'status');

    return { conversation: conv, created: conv.createdAt?.getTime() === Date.now() };
  } catch (err) {
    // Duplicate key race — re-fetch
    if (err.code === 11000) {
      const conv = await Conversation.findOne({ listingId, buyerId: callerId, sellerId: product.sellerId })
        .populate('buyerId', USER_DTO_SELECT)
        .populate('sellerId', USER_DTO_SELECT)
        .populate('listingId', 'status');
      return { conversation: conv, created: false };
    }
    throw err;
  }
}

/**
 * getUserConversations — inbox list, newest updated first.
 * chat.md §6.1 GET /api/conversations
 */
export async function getUserConversations(callerId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  const conversations = await Conversation.find({
    $or: [{ buyerId: callerId }, { sellerId: callerId }],
  })
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('buyerId', USER_DTO_SELECT)
    .populate('sellerId', USER_DTO_SELECT)
    .populate('listingId', 'status')
    .lean();

  return conversations.map((c) => toConversationDTO(c, callerId));
}

/**
 * getConversation — single conversation with membership check.
 */
export async function getConversation(callerId, conversationId) {
  if (!mongoose.isValidObjectId(conversationId)) {
    const err = new Error('Invalid conversation ID.'); err.status = 400; throw err;
  }

  const conv = await Conversation.findById(conversationId)
    .populate('buyerId', USER_DTO_SELECT)
    .populate('sellerId', USER_DTO_SELECT)
    .populate('listingId', 'status');

  if (!conv) { const err = new Error('Conversation not found.'); err.status = 404; throw err; }

  assertMember(conv, callerId);
  return toConversationDTO(conv, callerId);
}

/**
 * getMessages — cursor-paginated history, newest first.
 * chat.md §6.1 GET /api/conversations/:id/messages
 */
export async function getMessages(callerId, conversationId, { before, limit = MESSAGES_PAGE_SIZE } = {}) {
  if (!mongoose.isValidObjectId(conversationId)) {
    const err = new Error('Invalid conversation ID.'); err.status = 400; throw err;
  }

  const conv = await Conversation.findById(conversationId).lean();
  if (!conv) { const err = new Error('Conversation not found.'); err.status = 404; throw err; }
  assertMember(conv, callerId);

  const query = { conversationId };
  if (before) {
    // cursor: createdAt of last received message
    query.createdAt = { $lt: new Date(before) };
  }

  const messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .lean();

  return messages.map(toMessageDTO);
}

/**
 * sendMessage — shared by REST + Socket. chat.md §6.4
 */
export async function sendMessage(callerId, conversationId, body) {
  if (!mongoose.isValidObjectId(conversationId)) {
    const err = new Error('Invalid conversation ID.'); err.status = 400; throw err;
  }

  const conv = await Conversation.findById(conversationId)
    .populate('listingId', 'status');

  if (!conv) { const err = new Error('Conversation not found.'); err.status = 404; throw err; }
  assertMember(conv, callerId);

  // Block sending when listing is sold or removed
  const listingStatus = conv.listingId?.status;
  if (listingStatus === 'sold') {
    const err = new Error('This listing is no longer available. No new messages can be sent.');
    err.status = 422; throw err;
  }

  // Validate + sanitize body
  const trimmed = typeof body === 'string' ? body.trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') : '';
  if (!trimmed) { const err = new Error('Message cannot be empty.'); err.status = 400; throw err; }
  if (trimmed.length > MESSAGE_MAX_LENGTH) {
    const err = new Error(`Message must be ${MESSAGE_MAX_LENGTH} characters or fewer.`); err.status = 400; throw err;
  }

  const callerStr = callerId.toString();
  const isBuyer   = conv.buyerId.toString() === callerStr;
  const otherRole = isBuyer ? 'seller' : 'buyer';

  const msg = await Message.create({
    conversationId: conv._id,
    senderId: callerId,
    body: trimmed,
    type: 'text',
  });

  // Update conversation: lastMessage, updatedAt, increment other party's unread
  const lastMsgBody = trimmed.length > 120 ? trimmed.slice(0, 120) : trimmed;
  await Conversation.updateOne({ _id: conv._id }, {
    lastMessage: { body: lastMsgBody, senderId: callerId, createdAt: msg.createdAt },
    [`unread.${otherRole}`]: (conv.unread[otherRole] || 0) + 1,
    updatedAt: new Date(),
  });

  return toMessageDTO(msg);
}

/**
 * markRead — reset caller's unread counter, mark messages readAt.
 * chat.md §6.1 PATCH /api/conversations/:id/read
 */
export async function markRead(callerId, conversationId) {
  if (!mongoose.isValidObjectId(conversationId)) {
    const err = new Error('Invalid conversation ID.'); err.status = 400; throw err;
  }

  const conv = await Conversation.findById(conversationId).lean();
  if (!conv) { const err = new Error('Conversation not found.'); err.status = 404; throw err; }
  assertMember(conv, callerId);

  const callerStr = callerId.toString();
  const isBuyer   = conv.buyerId.toString() === callerStr;
  const callerRole = isBuyer ? 'buyer' : 'seller';

  // Reset this user's unread count
  await Conversation.updateOne({ _id: conv._id }, { [`unread.${callerRole}`]: 0 });

  // Mark all messages from the other party as read
  const otherId = isBuyer ? conv.sellerId : conv.buyerId;
  const now = new Date();
  await Message.updateMany(
    { conversationId: conv._id, senderId: otherId, readAt: null },
    { readAt: now }
  );

  return { readAt: now };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function assertMember(conv, callerId) {
  const callerStr = callerId.toString();
  const buyerStr  = conv.buyerId?._id ? conv.buyerId._id.toString() : conv.buyerId?.toString();
  const sellerStr = conv.sellerId?._id ? conv.sellerId._id.toString() : conv.sellerId?.toString();
  const isMember  = buyerStr === callerStr || sellerStr === callerStr;
  if (!isMember) {
    const err = new Error('Access denied.'); err.status = 403; throw err;
  }
}

// Export DTO helpers for socket layer
export { toConversationDTO, toMessageDTO, displayName };
