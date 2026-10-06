/**
 * useChat — all conversation + message state, socket handling, and send logic.
 * chat.md §10 (useChat hook)
 *
 * Manages:
 *  - Loading conversation + paginated messages
 *  - Optimistic message send with failed/retry state
 *  - Socket room join/leave on mount/unmount
 *  - Real-time message:new deduplication by id/clientId
 *  - Read state + unread badge updates via conversation:updated
 *  - Socket reconnect detection for "Reconnecting..." banner
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket } from './socket';
import {
  useGetConversationQuery,
  useGetMessagesQuery,
  useSendMessageRestMutation,
  useMarkReadMutation,
} from './chatApi';

export function useChat(conversationId) {
  const [messages, setMessages] = useState([]);       // normalized by id
  const [hasMore, setHasMore]   = useState(true);
  const [isSocketDown, setIsSocketDown] = useState(false);
  const seenIds = useRef(new Set());
  const oldestCursor = useRef(null);

  // ── Server data ───────────────────────────────────────────────────────────
  const {
    data: convData,
    isLoading: convLoading,
    isError: convError,
  } = useGetConversationQuery(conversationId, { skip: !conversationId });

  const {
    data: initialMessages,
    isLoading: msgsLoading,
    isError: msgsError,
  } = useGetMessagesQuery({ conversationId }, { skip: !conversationId });

  const [sendRest] = useSendMessageRestMutation();
  const [markReadApi] = useMarkReadMutation();

  // ── Load initial messages ─────────────────────────────────────────────────
  useEffect(() => {
    if (!initialMessages?.messages) return;
    const msgs = [...initialMessages.messages].reverse(); // API returns newest-first
    seenIds.current = new Set(msgs.map((m) => m.id));
    setMessages(msgs);
    if (msgs.length > 0) {
      oldestCursor.current = msgs[0].createdAt;
    }
    setHasMore(initialMessages.messages.length === 30);
  }, [initialMessages]);

  // ── Socket: join room, listen for events ─────────────────────────────────
  useEffect(() => {
    if (!conversationId) return;
    const socket = getSocket();
    if (!socket) return;

    socket.emit('conversation:join', { conversationId });

    function onMessageNew(msg) {
      const dedupeKey = msg.clientId || msg.id;
      if (seenIds.current.has(dedupeKey) || seenIds.current.has(msg.id)) {
        // Replace optimistic pending message with confirmed one
        setMessages((prev) =>
          prev.map((m) =>
            m.clientId === msg.clientId || m.id === msg.id
              ? { ...msg, status: 'sent' }
              : m
          )
        );
        return;
      }
      seenIds.current.add(msg.id);
      setMessages((prev) => [...prev, { ...msg, status: 'sent' }]);
    }

    function onMessageRead({ readAt }) {
      setMessages((prev) =>
        prev.map((m) => (!m.readAt ? { ...m, readAt } : m))
      );
    }

    function onDisconnect() { setIsSocketDown(true); }
    function onConnect()    { setIsSocketDown(false); }

    socket.on('message:new', onMessageNew);
    socket.on('message:read', onMessageRead);
    socket.on('disconnect', onDisconnect);
    socket.on('connect', onConnect);

    return () => {
      socket.off('message:new', onMessageNew);
      socket.off('message:read', onMessageRead);
      socket.off('disconnect', onDisconnect);
      socket.off('connect', onConnect);
      // Leave room on unmount
      socket.emit('conversation:leave', { conversationId });
    };
  }, [conversationId]);

  // ── Mark read on open ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!conversationId || !convData) return;
    markReadApi(conversationId);
  }, [conversationId, convData, markReadApi]);

  // ── Load older messages (cursor pagination) ───────────────────────────────
  const loadOlder = useCallback(async () => {
    if (!hasMore || !oldestCursor.current) return;
    // Trigger RTK Query with the before cursor
    // (We re-fetch via imperative REST since we're already past the initial load)
    try {
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams({ limit: '30', before: oldestCursor.current });
      const res = await fetch(`/api/conversations/${conversationId}/messages?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      const older = [...(json.messages || [])].reverse();
      if (older.length === 0) { setHasMore(false); return; }

      const newMsgs = older.filter((m) => !seenIds.current.has(m.id));
      newMsgs.forEach((m) => seenIds.current.add(m.id));
      setMessages((prev) => [...newMsgs, ...prev]);
      oldestCursor.current = newMsgs[0]?.createdAt;
      setHasMore(older.length === 30);
    } catch {
      // Network error — user can retry
    }
  }, [conversationId, hasMore]);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (body) => {
    if (!body?.trim() || !conversationId) return;

    const clientId = `pending-${Date.now()}-${Math.random()}`;
    const optimistic = {
      id: clientId,
      clientId,
      conversationId,
      senderId: null, // filled by server
      body: body.trim(),
      type: 'text',
      createdAt: new Date().toISOString(),
      status: 'sending',
    };

    // Add optimistic message immediately
    seenIds.current.add(clientId);
    setMessages((prev) => [...prev, optimistic]);

    const socket = getSocket();

    // Try socket first; fall back to REST if socket is down
    if (socket?.connected) {
      socket.emit('message:send', { conversationId, body: body.trim(), clientId });

      // If no confirmation arrives in 5s, fall back to REST
      const timeout = setTimeout(async () => {
        if (!seenIds.current.has(clientId)) return; // already confirmed
        try {
          const msg = await sendRest({ conversationId, body: body.trim() }).unwrap();
          setMessages((prev) =>
            prev.map((m) => (m.clientId === clientId ? { ...msg.message, status: 'sent' } : m))
          );
        } catch {
          setMessages((prev) =>
            prev.map((m) => (m.clientId === clientId ? { ...m, status: 'failed' } : m))
          );
        }
      }, 5000);

      // Clean up timeout if socket confirms
      socket.once('message:new', (msg) => {
        if (msg.clientId === clientId) clearTimeout(timeout);
      });
    } else {
      // REST fallback
      try {
        const msg = await sendRest({ conversationId, body: body.trim() }).unwrap();
        setMessages((prev) =>
          prev.map((m) => (m.clientId === clientId ? { ...msg.message, status: 'sent' } : m))
        );
        seenIds.current.add(msg.message.id);
      } catch {
        setMessages((prev) =>
          prev.map((m) => (m.clientId === clientId ? { ...m, status: 'failed' } : m))
        );
      }
    }
  }, [conversationId, sendRest]);

  // ── Retry failed message ──────────────────────────────────────────────────
  const retryMessage = useCallback((failedMsg) => {
    setMessages((prev) => prev.filter((m) => m.clientId !== failedMsg.clientId));
    seenIds.current.delete(failedMsg.clientId);
    sendMessage(failedMsg.body);
  }, [sendMessage]);

  return {
    conversation: convData?.conversation,
    messages,
    isLoading: convLoading || msgsLoading,
    isError: convError || msgsError,
    hasMore,
    isSocketDown,
    loadOlder,
    sendMessage,
    retryMessage,
  };
}
