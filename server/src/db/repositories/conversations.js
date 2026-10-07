/**
 * CampX — conversations and messages repository.
 * database.md / chat.md
 */

import { getPool } from '../pool.js';
import { MESSAGE_MAX_LENGTH, MESSAGES_PAGE_SIZE } from '../constants.js';

export function displayName(fullName = '') {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export function toConversationDTO(row, callerId) {
  if (!row) return null;
  const callerIdStr = String(callerId);
  const isBuyer = String(row.buyer_id) === callerIdStr;
  const otherId = isBuyer ? row.seller_id : row.buyer_id;
  const otherName = isBuyer ? row.seller_name : row.buyer_name;
  const otherVerification = isBuyer ? row.seller_verification_status : row.buyer_verification_status;
  const otherAvatar = isBuyer ? row.seller_avatar_url : row.buyer_avatar_url;
  const unreadCount = isBuyer ? Number(row.unread_buyer || 0) : Number(row.unread_seller || 0);

  return {
    id: row.id,
    listing: {
      id: row.listing_id,
      title: row.listing_title,
      price: row.listing_price,
      imageUrl: row.listing_image_url,
      status: row.listing_status,
    },
    otherUser: otherName
      ? {
          id: otherId,
          displayName: displayName(otherName),
          verified: otherVerification === 'verified',
          avatarUrl: otherAvatar || null,
        }
      : null,
    yourRole: isBuyer ? 'buyer' : 'seller',
    lastMessage: row.last_message_body
      ? {
          body: row.last_message_body,
          senderId: row.last_message_sender_id,
          createdAt: row.last_message_at,
        }
      : undefined,
    unreadCount,
    updatedAt: row.updated_at,
  };
}

export function toMessageDTO(row) {
  if (!row) return null;
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    type: row.type || 'text',
    createdAt: row.created_at,
    readAt: row.read_at || null,
  };
}

const CONVERSATION_JOIN_QUERY = `
  SELECT
    c.id, c.listing_id, c.buyer_id, c.seller_id,
    c.listing_title, c.listing_price, c.listing_image_url,
    c.last_message_body, c.last_message_at,
    c.unread_buyer, c.unread_seller,
    c.created_at, c.updated_at,
    p.status AS listing_status,
    ub.name AS buyer_name,
    ub.verification_status AS buyer_verification_status,
    ub.avatar_url AS buyer_avatar_url,
    us.name AS seller_name,
    us.verification_status AS seller_verification_status,
    us.avatar_url AS seller_avatar_url
  FROM conversations c
  LEFT JOIN products p ON p.id = c.listing_id
  JOIN users ub ON ub.id = c.buyer_id
  JOIN users us ON us.id = c.seller_id
`;

export async function findRawConversationById(conversationId) {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT * FROM conversations WHERE id = $1',
    [conversationId]
  );
  return rows[0] || null;
}

export async function getConversationById(callerId, conversationId) {
  const pool = getPool();
  const { rows } = await pool.query(
    `${CONVERSATION_JOIN_QUERY} WHERE c.id = $1`,
    [conversationId]
  );

  const conv = rows[0];
  if (!conv) {
    const err = new Error('Conversation not found.');
    err.status = 404;
    throw err;
  }

  const callerStr = String(callerId);
  if (String(conv.buyer_id) !== callerStr && String(conv.seller_id) !== callerStr) {
    const err = new Error('Access denied.');
    err.status = 403;
    throw err;
  }

  return toConversationDTO(conv, callerId);
}

export async function getOrCreateConversation(callerId, listingId) {
  const pool = getPool();

  const prodRes = await pool.query(
    'SELECT id, seller_id, title, price, images, status FROM products WHERE id = $1',
    [listingId]
  );
  const product = prodRes.rows[0];

  if (!product) {
    const err = new Error('Listing not found.');
    err.status = 404;
    throw err;
  }

  if (!product.seller_id) {
    const err = new Error("This listing can't be messaged.");
    err.status = 422;
    throw err;
  }

  const sellerId = String(product.seller_id);
  const buyerId = String(callerId);

  if (sellerId === buyerId) {
    const err = new Error("You can't message yourself.");
    err.status = 400;
    throw err;
  }

  const primaryImage = Array.isArray(product.images) && product.images[0]
    ? (typeof product.images[0] === 'string' ? product.images[0] : product.images[0].url)
    : '';

  // Upsert conversation
  const { rows } = await pool.query(
    `INSERT INTO conversations (listing_id, buyer_id, seller_id, listing_title, listing_price, listing_image_url)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (listing_id, buyer_id, seller_id)
     DO UPDATE SET updated_at = conversations.updated_at
     RETURNING id, (xmax = 0) AS created`,
    [product.id, buyerId, sellerId, product.title, product.price, primaryImage || '']
  );

  const conversationId = rows[0].id;
  const created = Boolean(rows[0].created);

  const convDto = await getConversationById(callerId, conversationId);
  return { conversation: convDto, conversationId, created };
}

export async function getUserConversations(callerId, page = 1, limit = 20) {
  const offset = (Math.max(1, page) - 1) * limit;
  const pool = getPool();

  const { rows } = await pool.query(
    `${CONVERSATION_JOIN_QUERY}
     WHERE c.buyer_id = $1 OR c.seller_id = $1
     ORDER BY c.updated_at DESC
     LIMIT $2 OFFSET $3`,
    [callerId, limit, offset]
  );

  return rows.map((r) => toConversationDTO(r, callerId));
}

export async function getMessages(callerId, conversationId, { before, limit = MESSAGES_PAGE_SIZE } = {}) {
  const pool = getPool();

  // Validate membership
  const conv = await findRawConversationById(conversationId);
  if (!conv) {
    const err = new Error('Conversation not found.');
    err.status = 404;
    throw err;
  }

  const callerStr = String(callerId);
  if (String(conv.buyer_id) !== callerStr && String(conv.seller_id) !== callerStr) {
    const err = new Error('Access denied.');
    err.status = 403;
    throw err;
  }

  const params = [conversationId];
  let where = 'conversation_id = $1';

  if (before) {
    params.push(new Date(before));
    where += ` AND created_at < $${params.length}`;
  }

  params.push(Number(limit));
  const query = `
    SELECT id, conversation_id, sender_id, body, type, read_at, created_at
    FROM messages
    WHERE ${where}
    ORDER BY created_at DESC
    LIMIT $${params.length}
  `;

  const { rows } = await pool.query(query, params);
  return rows.map(toMessageDTO);
}

export async function sendMessage(callerId, conversationId, body) {
  const pool = getPool();

  const convRes = await pool.query(
    `SELECT c.*, p.status as listing_status
     FROM conversations c
     LEFT JOIN products p ON p.id = c.listing_id
     WHERE c.id = $1`,
    [conversationId]
  );
  const conv = convRes.rows[0];

  if (!conv) {
    const err = new Error('Conversation not found.');
    err.status = 404;
    throw err;
  }

  const callerStr = String(callerId);
  const isBuyer = String(conv.buyer_id) === callerStr;
  const isSeller = String(conv.seller_id) === callerStr;

  if (!isBuyer && !isSeller) {
    const err = new Error('Access denied.');
    err.status = 403;
    throw err;
  }

  if (conv.listing_status === 'sold') {
    const err = new Error('This listing is no longer available. No new messages can be sent.');
    err.status = 422;
    throw err;
  }

  const trimmed = typeof body === 'string'
    ? body.trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    : '';

  if (!trimmed) {
    const err = new Error('Message cannot be empty.');
    err.status = 400;
    throw err;
  }

  if (trimmed.length > MESSAGE_MAX_LENGTH) {
    const err = new Error(`Message must be ${MESSAGE_MAX_LENGTH} characters or fewer.`);
    err.status = 400;
    throw err;
  }

  const lastMsgSnippet = trimmed.length > 120 ? trimmed.slice(0, 120) : trimmed;

  // Insert message and update conversation in a transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const msgRes = await client.query(
      `INSERT INTO messages (conversation_id, sender_id, body, type)
       VALUES ($1, $2, $3, 'text')
       RETURNING id, conversation_id, sender_id, body, type, read_at, created_at`,
      [conversationId, callerId, trimmed]
    );
    const msg = msgRes.rows[0];

    const unreadField = isBuyer ? 'unread_seller' : 'unread_buyer';
    await client.query(
      `UPDATE conversations
       SET last_message_body = $1,
           last_message_at = $2,
           ${unreadField} = ${unreadField} + 1,
           updated_at = now()
       WHERE id = $3`,
      [lastMsgSnippet, msg.created_at, conversationId]
    );

    await client.query('COMMIT');
    return toMessageDTO(msg);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function markRead(callerId, conversationId) {
  const pool = getPool();
  const conv = await findRawConversationById(conversationId);

  if (!conv) {
    const err = new Error('Conversation not found.');
    err.status = 404;
    throw err;
  }

  const callerStr = String(callerId);
  const isBuyer = String(conv.buyer_id) === callerStr;
  const isSeller = String(conv.seller_id) === callerStr;

  if (!isBuyer && !isSeller) {
    const err = new Error('Access denied.');
    err.status = 403;
    throw err;
  }

  const resetField = isBuyer ? 'unread_buyer' : 'unread_seller';
  const now = new Date();

  await pool.query(
    `UPDATE conversations SET ${resetField} = 0 WHERE id = $1`,
    [conversationId]
  );

  await pool.query(
    `UPDATE messages
     SET read_at = $1
     WHERE conversation_id = $2 AND sender_id <> $3 AND read_at IS NULL`,
    [now, conversationId, callerId]
  );

  return { readAt: now };
}
