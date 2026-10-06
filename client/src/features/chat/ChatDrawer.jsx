/**
 * ChatDrawer — the main chat panel.
 * Desktop: right-side drawer (400px, slides in). Mobile: full screen.
 * chat.md §5.2, §5.3, §5.4, §5.5, §5.6
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useChat } from './useChat';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';

// ── Sub-components ────────────────────────────────────────────────────────────

function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 font-sans text-[11px] text-moss font-medium">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      Verified student
    </span>
  );
}

function ChatHeader({ conversation, onClose }) {
  const other = conversation?.otherUser;
  return (
    <div className="flex items-center gap-3 border-b border-clay px-4 py-3 bg-bone shrink-0">
      <button
        type="button"
        onClick={onClose}
        className="text-ink/60 hover:text-ink transition-colors duration-150 p-1 -ml-1 cursor-pointer"
        aria-label="Close chat"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      <div className="flex-1 min-w-0">
        <p className="font-heading text-sm font-semibold text-ink truncate">
          {other?.displayName || '…'}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="font-sans text-[11px] text-ink/50">
            {conversation?.yourRole === 'buyer' ? 'Seller' : 'Buyer'}
          </span>
          {other?.verified && <VerifiedBadge />}
        </div>
      </div>
    </div>
  );
}

function ListingPreview({ conversation }) {
  const listing = conversation?.listing;
  if (!listing) return null;
  return (
    <div className="border-b border-clay px-4 py-3 bg-bone shrink-0">
      <div className="flex items-center gap-3">
        {listing.imageUrl && (
          <img
            src={listing.imageUrl}
            alt={listing.title}
            className="h-12 w-12 rounded-sm object-cover border border-clay shrink-0"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-sans text-xs text-ink/80 font-medium truncate">{listing.title}</p>
          <span className="inline-block mt-0.5 rounded-sm border border-marigold/60 bg-marigold/15 px-2 py-0.5 font-mono text-xs font-semibold text-ink">
            ₹{Number(listing.price).toLocaleString('en-IN')}
          </span>
        </div>
        <Link
          to={`/products/${listing.id}`}
          className="shrink-0 font-sans text-[11px] text-moss underline hover:no-underline"
        >
          View listing
        </Link>
      </div>
    </div>
  );
}

function DateDivider({ label }) {
  return (
    <div className="flex items-center gap-2 my-3 px-1" aria-hidden="true">
      <hr className="flex-1 border-clay/60" />
      <span className="font-sans text-[10px] text-ink/35 select-none whitespace-nowrap">{label}</span>
      <hr className="flex-1 border-clay/60" />
    </div>
  );
}

function formatDateLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function MessageList({ messages, currentUserId, hasMore, onLoadOlder, isLoading, onRetry }) {
  const bottomRef = useRef(null);
  const listRef   = useRef(null);
  const [showNewPill, setShowNewPill] = useState(false);
  const isScrolledUp = useRef(false);

  // Auto-scroll to bottom on new message (unless user scrolled up)
  useEffect(() => {
    if (!isScrolledUp.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setShowNewPill(true);
    }
  }, [messages.length]);

  // Initial scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, []);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    isScrolledUp.current = !atBottom;
    if (atBottom) setShowNewPill(false);
  };

  // Group messages by day
  const groupedMessages = [];
  let lastDate = null;
  for (const msg of messages) {
    const date = msg.createdAt ? formatDateLabel(msg.createdAt) : null;
    if (date && date !== lastDate) {
      groupedMessages.push({ type: 'divider', label: date, key: `div-${date}` });
      lastDate = date;
    }
    groupedMessages.push({ type: 'msg', msg, key: msg.id || msg.clientId });
  }

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
            <div className={`h-10 rounded-sm bg-clay/30 animate-pulse ${i % 2 === 0 ? 'w-48' : 'w-36'}`} />
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-8 flex flex-col items-center gap-4">
        <p className="font-sans text-sm text-ink/40 text-center">
          Say hello and ask about the item.
        </p>
        <div className="flex gap-2 flex-wrap justify-center">
          {['Is this still available?', 'Is the price negotiable?'].map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => document.getElementById('chat-message-input')?.focus?.()}
              className="rounded-sm border border-clay px-3 py-1.5 font-sans text-xs text-ink/70 hover:border-ink/40 cursor-pointer transition-colors duration-150"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto px-4 py-3"
        role="list"
        aria-label="Messages"
      >
        {hasMore && (
          <button
            type="button"
            onClick={onLoadOlder}
            className="w-full text-center font-sans text-xs text-ink/50 py-2 hover:text-ink/80 cursor-pointer transition-colors duration-150 mb-2"
          >
            Load older messages
          </button>
        )}

        {groupedMessages.map((item) =>
          item.type === 'divider' ? (
            <DateDivider key={item.key} label={item.label} />
          ) : (
            <MessageBubble
              key={item.key}
              message={item.msg}
              isOwn={item.msg.senderId === currentUserId}
              onRetry={onRetry}
            />
          )
        )}
        <div ref={bottomRef} />
      </div>

      {showNewPill && (
        <button
          type="button"
          onClick={() => {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
            setShowNewPill(false);
          }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-moss text-bone font-sans text-xs px-3 py-1 shadow-sm cursor-pointer"
        >
          ↓ New messages
        </button>
      )}
    </div>
  );
}

// ── Main ChatDrawer ───────────────────────────────────────────────────────────

/**
 * @param {object} props
 * @param {string}      props.conversationId
 * @param {string}      props.currentUserId
 * @param {function}    props.onClose
 * @param {boolean}     props.isOpen
 */
export default function ChatDrawer({ conversationId, currentUserId, onClose, isOpen }) {
  const {
    conversation,
    messages,
    isLoading,
    isError,
    hasMore,
    isSocketDown,
    loadOlder,
    sendMessage,
    retryMessage,
  } = useChat(isOpen ? conversationId : null);

  const listingStatus = conversation?.listing?.status;
  const isUnavailable = listingStatus === 'sold';
  const inputDisabled = isUnavailable;
  const disabledReason = isUnavailable
    ? 'This listing is no longer available. No new messages can be sent.'
    : null;

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Prevent body scroll when drawer is open (mobile)
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop — light dimming, click to close */}
      <div
        className="fixed inset-0 bg-ink/10 z-40 md:block"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Chat with seller"
        className={`
          fixed z-50 flex flex-col bg-bone
          /* Mobile: full screen */
          inset-0
          /* Desktop: right drawer */
          md:inset-y-0 md:right-0 md:left-auto md:w-[420px] md:border-l md:border-clay
          /* Entry animation */
          animate-[slide-in-right_200ms_ease-out]
        `}
        style={{ height: '100dvh' }}
      >
        {isSocketDown && (
          <div className="bg-clay/60 text-ink/60 font-sans text-[11px] text-center py-1.5 px-3 shrink-0">
            Reconnecting…
          </div>
        )}

        {isError ? (
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="text-center">
              <p className="font-sans text-sm text-ink/70">Could not load conversation.</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 font-sans text-xs text-moss underline cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            <ChatHeader conversation={conversation} onClose={onClose} />
            <ListingPreview conversation={conversation} />

            {isUnavailable && (
              <div className="px-4 py-2 bg-clay/20 border-b border-clay shrink-0">
                <p className="font-sans text-xs text-ink/50 text-center">
                  This listing is no longer available.
                </p>
              </div>
            )}

            <MessageList
              messages={messages}
              currentUserId={currentUserId}
              hasMore={hasMore}
              onLoadOlder={loadOlder}
              isLoading={isLoading}
              onRetry={retryMessage}
            />

            <MessageInput
              onSend={sendMessage}
              disabled={inputDisabled}
              disabledReason={disabledReason}
            />
          </>
        )}
      </div>
    </>
  );
}
