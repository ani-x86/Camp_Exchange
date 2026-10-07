/**
 * chatService — all chat business logic shared by REST and Socket.IO handlers.
 * chat.md §6.4, §7
 *
 * Rules enforced here:
 *  - buyerId/senderId always come from the authenticated user
 *  - sellerId always comes from the product
 *  - Membership verified on every operation
 *  - Message body validated and sanitized
 *  - Sold listing blocks new messages
 */

export {
  getOrCreateConversation,
  getUserConversations,
  getConversationById as getConversation,
  getMessages,
  sendMessage,
  markRead,
  toConversationDTO,
  toMessageDTO,
  displayName,
  findRawConversationById,
} from '../src/db/repositories/conversations.js';
