/**
 * MessageBubble — a single chat message with timestamp and status indicators.
 * chat.md §5.4 MessageList
 *
 * - Own messages: right-aligned, soft green tint border
 * - Other's messages: left-aligned, bone with ink border
 * - Status: sending (muted), sent, failed + Retry
 * - Body rendered as plain text (never dangerouslySetInnerHTML — XSS rule)
 */

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function MessageBubble({ message, isOwn, onRetry }) {
  const { body, createdAt, status, readAt } = message;
  const isFailed  = status === 'failed';
  const isSending = status === 'sending';

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}
      role="listitem"
    >
      <div className={`max-w-[75%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        <div
          className={`
            rounded-sm px-3 py-2 font-sans text-sm leading-relaxed
            whitespace-pre-wrap break-words
            ${isOwn
              ? 'bg-moss/10 border border-moss/30 text-ink'
              : 'bg-bone border border-clay text-ink'
            }
            ${isFailed ? 'border-rust/50 bg-rust/5' : ''}
            ${isSending ? 'opacity-50' : ''}
          `}
        >
          {/* Plain text — never innerHTML */}
          {body}
        </div>

        <div className={`mt-0.5 flex items-center gap-1.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
          {createdAt && !isFailed && (
            <span className="font-sans text-[10px] text-ink/40 select-none">
              {isSending ? 'Sending…' : formatTime(createdAt)}
            </span>
          )}

          {isFailed && (
            <div className="flex items-center gap-1">
              <span className="font-sans text-[10px] text-rust">Failed</span>
              <button
                type="button"
                onClick={() => onRetry?.(message)}
                className="font-sans text-[10px] text-moss underline cursor-pointer hover:no-underline"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
