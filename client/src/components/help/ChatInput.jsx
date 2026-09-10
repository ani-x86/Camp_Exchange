import { useState, useRef } from 'react';

/**
 * ChatInput — bottom text input bar with Send button.
 *
 * Rules:
 *  - Reuses design.md §5 form-field focus spec: Clay → Moss over 120ms, no glow/shadow.
 *  - Send button: press scale to 0.97 (100ms).
 *  - Enter sends message; disabled while bot reply is in flight.
 *
 * Props:
 *  - onSend      (fn)       (text: string) => void
 *  - disabled    (bool)     True while bot is typing
 *  - placeholder (string?)
 */
export default function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Describe what happened…',
}) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);

  const handleSend = (e) => {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;

    onSend(trimmed);
    setText('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <form
      onSubmit={handleSend}
      className="
        flex items-center gap-2 border-t border-clay bg-bone
        px-4 py-3 sm:px-5
      "
    >
      {/* Text Input */}
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="text"
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Type your message"
          className="
            w-full rounded-sm border border-clay bg-bone px-3.5 py-2
            font-sans text-sm text-ink placeholder:text-clay
            outline-none transition-colors duration-120 ease-out
            focus:border-moss disabled:cursor-not-allowed disabled:bg-clay/10
          "
        />
      </div>

      {/* Send Button — design.md §5 buttons spec (active scale 0.97, 100ms) */}
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        aria-label="Send message"
        className={`
          flex h-9 w-9 shrink-0 items-center justify-center rounded-sm
          transition-[background-color,transform] duration-100 ease-out
          ${
            disabled || !text.trim()
              ? 'cursor-not-allowed bg-clay text-ink/30'
              : 'cursor-pointer bg-moss text-bone hover:bg-moss-hover active:scale-[0.97]'
          }
        `}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </form>
  );
}
