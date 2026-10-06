/**
 * ChatButton — "Chat with seller" secondary action on the product page.
 * chat.md §5.1, §3
 */

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCreateOrGetConversationMutation } from './chatApi';

function MessageIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className="animate-spin"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

/**
 * @param {object} props
 * @param {string}   props.listingId       — Product._id
 * @param {string}   props.sellerId        — to detect seller's own listing
 * @param {string|null} props.currentUserId — from auth context; null if logged out
 * @param {string}   props.verificationStatus — 'verified' | other
 * @param {function} props.onOpen          — called with conversationId when ready
 */
export default function ChatButton({
  listingId,
  sellerId,
  currentUserId,
  verificationStatus,
  onOpen,
}) {
  const [createConv, { isLoading }] = useCreateOrGetConversationMutation();
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Seller sees nothing (or a muted label) for their own listing
  if (currentUserId && sellerId && currentUserId === sellerId) {
    return (
      <p className="text-xs text-ink/40 font-sans py-1 select-none">
        This is your listing
      </p>
    );
  }

  const handleClick = async () => {
    setError(null);

    // Not logged in → redirect to login, with return URL
    if (!currentUserId) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}?chat=open`);
      return;
    }

    // Not verified
    if (verificationStatus !== 'verified') {
      // Surface via a toast if available; otherwise use inline error
      setError('Verify your student ID to message sellers.');
      return;
    }

    try {
      const result = await createConv(listingId).unwrap();
      onOpen(result.conversation.id);
    } catch (err) {
      setError(err?.data?.error || 'Could not open chat. Try again.');
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        id={`chat-btn-${listingId}`}
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className={`
          flex items-center justify-center gap-2
          rounded-sm border border-ink/30 px-4 py-3.5
          font-sans text-sm font-medium text-ink
          transition-[border-color,opacity,transform] duration-150 ease-out
          focus-visible:outline-2 focus-visible:outline-moss focus-visible:outline-offset-2
          ${isLoading
            ? 'cursor-not-allowed opacity-50'
            : 'cursor-pointer hover:border-ink/60 active:scale-[0.97] active:duration-100'
          }
        `}
        aria-label="Chat with seller"
      >
        {isLoading ? <SpinnerIcon /> : <MessageIcon />}
        <span>Chat with seller</span>
      </button>
      {error && (
        <p className="text-xs text-rust font-sans" role="alert">{error}</p>
      )}
    </div>
  );
}
