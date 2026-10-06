/**
 * MessageInput — auto-growing textarea with send button.
 * chat.md §5.4 MessageInput
 *
 * - Enter sends, Shift+Enter newlines
 * - Disabled when listing unavailable (sold/removed)
 * - Character counter appears near the limit (from 900/1000)
 */

import { useState, useRef, useEffect } from 'react';

const MAX = 1000;
const COUNTER_THRESHOLD = 900;

function SendIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}

export default function MessageInput({ onSend, disabled, disabledReason }) {
  const [value, setValue] = useState('');
  const textareaRef = useRef(null);

  // Auto-grow up to ~4 rows
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 104)}px`; // 4 × ~26px
  }, [value]);

  const canSend = value.trim().length > 0 && value.length <= MAX && !disabled;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend) submit();
    }
  };

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const remaining = MAX - value.length;
  const showCounter = value.length >= COUNTER_THRESHOLD;

  return (
    <div className="border-t border-clay bg-bone px-3 py-2">
      {disabled && disabledReason && (
        <p className="mb-2 font-sans text-xs text-ink/50 text-center">{disabledReason}</p>
      )}

      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          id="chat-message-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={disabled ? '' : 'Type a message…'}
          rows={1}
          maxLength={MAX + 1} // allow typing over to show counter, block send
          className={`
            flex-1 resize-none rounded-sm border border-clay bg-bone
            font-sans text-sm text-ink placeholder:text-ink/35
            px-3 py-2 leading-relaxed
            focus:outline-none focus:border-ink/40
            transition-[border-color] duration-150
            ${disabled ? 'cursor-not-allowed opacity-50' : ''}
          `}
          aria-label="Message"
          aria-disabled={disabled}
        />

        <button
          type="button"
          id="chat-send-btn"
          onClick={submit}
          disabled={!canSend}
          className={`
            shrink-0 flex items-center justify-center
            h-9 w-9 rounded-sm
            transition-[background-color,opacity,transform] duration-150 ease-out
            focus-visible:outline-2 focus-visible:outline-moss focus-visible:outline-offset-2
            ${canSend
              ? 'bg-moss text-bone cursor-pointer hover:bg-moss/90 active:scale-[0.95]'
              : 'bg-clay/40 text-ink/30 cursor-not-allowed'
            }
          `}
          aria-label="Send message"
        >
          <SendIcon />
        </button>
      </div>

      {showCounter && (
        <p
          className={`mt-1 text-right font-sans text-[10px] ${
            remaining < 0 ? 'text-rust' : 'text-ink/40'
          }`}
          aria-live="polite"
        >
          {remaining < 0 ? `${Math.abs(remaining)} over limit` : `${remaining} left`}
        </p>
      )}
    </div>
  );
}
