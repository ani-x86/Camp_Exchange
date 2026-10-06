/**
 * conversationController — thin REST layer over chatService.
 * chat.md §6.1, §6.2
 */

import {
  getOrCreateConversation,
  getUserConversations,
  getConversation,
  getMessages,
  sendMessage,
  markRead,
  toConversationDTO,
} from '../services/chatService.js';

// POST /api/conversations
// Body: { listingId }
export async function createOrGetConversation(req, res) {
  try {
    const { listingId } = req.body;
    if (!listingId) return res.status(400).json({ error: 'listingId is required.' });

    const { conversation, created } = await getOrCreateConversation(req.user.id, listingId);
    const dto = toConversationDTO(conversation, req.user.id);
    res.status(created ? 201 : 200).json({ conversation: dto });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

// GET /api/conversations
export async function listConversations(req, res) {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const conversations = await getUserConversations(req.user.id, page, limit);
    res.json({ conversations });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

// GET /api/conversations/:id
export async function getConversationById(req, res) {
  try {
    const dto = await getConversation(req.user.id, req.params.id);
    res.json({ conversation: dto });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

// GET /api/conversations/:id/messages
export async function listMessages(req, res) {
  try {
    const { before, limit } = req.query;
    const messages = await getMessages(req.user.id, req.params.id, { before, limit });
    res.json({ messages });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

// POST /api/conversations/:id/messages — REST fallback send
export async function sendMessageRest(req, res) {
  try {
    const { body } = req.body;
    const msg = await sendMessage(req.user.id, req.params.id, body);
    res.status(201).json({ message: msg });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

// PATCH /api/conversations/:id/read
export async function markConversationRead(req, res) {
  try {
    const result = await markRead(req.user.id, req.params.id);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}
