/**
 * ConversationList — inbox rows for the /messages page.
 * chat.md §5.7
 */

import { Link } from 'react-router-dom';
import { useGetConversationsQuery } from './chatApi';

function formatRelativeTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);

  if (mins < 1)    return 'Just now';
  if (mins < 60)   return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days < 7)    return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function VerifiedIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
      aria-label="Verified" className="text-moss shrink-0">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ConversationRow({ conv, onSelect }) {
  const other = conv.otherUser;
  const listing = conv.listing;

  return (
    <button
      type="button"
      onClick={() => onSelect(conv.id)}
      className="w-full flex items-center gap-3 px-4 py-4 border-b border-clay hover:bg-clay/20 transition-colors duration-150 cursor-pointer text-left"
    >
      {/* Listing thumbnail */}
      {listing?.imageUrl ? (
        <img
          src={listing.imageUrl}
          alt=""
          className="h-12 w-12 shrink-0 rounded-sm object-cover border border-clay"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      ) : (
        <div className="h-12 w-12 shrink-0 rounded-sm bg-clay/30" />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0">
            <span className="font-sans text-sm font-medium text-ink truncate">
              {other?.displayName || 'Unknown'}
            </span>
            {other?.verified && <VerifiedIcon />}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {conv.unreadCount > 0 && (
              <span className="inline-flex items-center justify-center h-4 min-w-4 rounded-full bg-moss text-bone font-sans text-[10px] font-semibold px-1">
                {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
              </span>
            )}
            <span className="font-sans text-[10px] text-ink/40 whitespace-nowrap">
              {formatRelativeTime(conv.updatedAt)}
            </span>
          </div>
        </div>

        <p className="mt-0.5 font-sans text-[11px] text-ink/50 truncate">
          {listing?.title || conv.listingSnapshot?.title}
        </p>

        {conv.lastMessage?.body && (
          <p className="mt-0.5 font-sans text-xs text-ink/60 truncate">
            {conv.lastMessage.body}
          </p>
        )}
      </div>
    </button>
  );
}

/**
 * @param {object}   props
 * @param {function} props.onSelectConversation — called with conversationId
 */
export default function ConversationList({ onSelectConversation }) {
  const { data, isLoading, isError, refetch } = useGetConversationsQuery();
  const conversations = data?.conversations || [];

  if (isLoading) {
    return (
      <div className="divide-y divide-clay">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex gap-3 px-4 py-4">
            <div className="h-12 w-12 shrink-0 rounded-sm bg-clay/30 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-28 bg-clay/40 rounded-sm animate-pulse" />
              <div className="h-2.5 w-40 bg-clay/30 rounded-sm animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="font-sans text-sm text-ink/60">Could not load messages.</p>
        <button
          type="button"
          onClick={refetch}
          className="mt-2 font-sans text-xs text-moss underline cursor-pointer"
        >
          Try again
        </button>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="font-sans text-sm text-ink/50">No conversations yet.</p>
        <p className="mt-1 font-sans text-xs text-ink/35">
          Chat with a seller from any listing page.
        </p>
      </div>
    );
  }

  return (
    <div>
      {conversations.map((conv) => (
        <ConversationRow
          key={conv.id}
          conv={conv}
          onSelect={onSelectConversation}
        />
      ))}
    </div>
  );
}
