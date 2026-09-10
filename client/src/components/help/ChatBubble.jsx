/**
 * ChatBubble — renders a single conversational message for bot or user.
 *
 * Visual & Motion specs:
 *  - Bot: left-aligned, Bone background, hairline Clay border, Ink text.
 *  - User: right-aligned, light Moss tint background, subtle Moss border, Ink text.
 *  - Typography: Inter (font-sans) — conversation, not monospace data.
 *  - Entrance animation: fades in + slides up 8px over 150ms ease-out (identical both directions).
 *
 * Props:
 *  - message  (object)  { id, sender: 'bot'|'user', text, time }
 */
export default function ChatBubble({ message }) {
  const isBot = message.sender === 'bot';

  return (
    <div
      className={`
        flex items-start gap-2.5 sm:gap-3
        opacity-0 animate-[message-enter_150ms_ease-out_forwards]
        ${isBot ? 'justify-start' : 'justify-end'}
      `}
    >
      {/* Bot Avatar (Left) */}
      {isBot && (
        <div
          className="
            flex h-7 w-7 shrink-0 items-center justify-center
            rounded-full border border-clay bg-bone text-xs select-none
          "
          aria-hidden="true"
        >
          🤖
        </div>
      )}

      {/* Message Bubble Shell */}
      <div
        className={`
          max-w-[82%] sm:max-w-[75%] rounded-sm px-3.5 py-2.5 text-sm
          ${
            isBot
              ? 'border border-clay bg-bone text-ink'
              : 'border border-moss/35 bg-moss/15 text-ink'
          }
        `}
      >
        <p className="font-sans leading-relaxed whitespace-pre-wrap">
          {message.text}
        </p>

        {message.time && (
          <span
            className={`
              mt-1 block text-[10px] font-sans select-none
              ${isBot ? 'text-ink/45' : 'text-ink/55 text-right'}
            `}
          >
            {message.time}
          </span>
        )}
      </div>

      {/* User Avatar (Right) */}
      {!isBot && (
        <div
          className="
            flex h-7 w-7 shrink-0 items-center justify-center
            rounded-full border border-moss/40 bg-moss/20 text-xs select-none
          "
          aria-hidden="true"
        >
          👤
        </div>
      )}
    </div>
  );
}
