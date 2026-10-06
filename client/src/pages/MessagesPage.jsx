/**
 * MessagesPage — /messages inbox.
 * chat.md §5.7
 *
 * Desktop: list on the left, chat drawer on the right.
 * Mobile: full-screen list → full-screen chat.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import ConversationList from '../features/chat/ConversationList';
import ChatDrawer from '../features/chat/ChatDrawer';

export default function MessagesPage() {
  const [activeConvId, setActiveConvId] = useState(null);

  // Simulated currentUserId — replace with real auth context when available
  const currentUserId = localStorage.getItem('userId') || null;

  return (
    <div className="min-h-screen bg-bone font-sans text-ink">
      {/* Header */}
      <header className="border-b border-clay bg-bone">
        <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6 flex items-center gap-4">
          <Link
            to="/dashboard"
            className="font-sans text-sm text-ink/60 hover:text-ink transition-colors duration-150"
          >
            ← Browse
          </Link>
          <h1 className="font-heading text-lg font-semibold text-ink">Messages</h1>
        </div>
      </header>

      <main className="mx-auto max-w-5xl">
        {/* Mobile: just the list; when a conv is selected the drawer covers full screen */}
        <div className="md:hidden">
          <ConversationList onSelectConversation={setActiveConvId} />
        </div>

        {/* Desktop: side-by-side */}
        <div className="hidden md:flex h-[calc(100dvh-57px)]">
          {/* Left: conversation list */}
          <div className="w-[360px] shrink-0 border-r border-clay overflow-y-auto">
            <ConversationList onSelectConversation={setActiveConvId} />
          </div>

          {/* Right: chat panel or empty state */}
          <div className="flex-1 flex items-center justify-center bg-bone text-center px-8">
            {activeConvId ? null : (
              <p className="font-sans text-sm text-ink/35">
                Select a conversation to start chatting.
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Chat drawer (both mobile + desktop) */}
      {activeConvId && (
        <ChatDrawer
          conversationId={activeConvId}
          currentUserId={currentUserId}
          isOpen={!!activeConvId}
          onClose={() => setActiveConvId(null)}
        />
      )}
    </div>
  );
}
