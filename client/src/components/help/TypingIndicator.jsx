/**
 * TypingIndicator — 3 pulsing dots indicating AI bot processing.
 *
 * Motion spec:
 *  - 3 small dots pulsing in sequence (opacity 0.3 → 1 → 0.3).
 *  - Staggered ~150ms apart, looping while bot prepares response.
 *  - Left-aligned with bot avatar.
 */
export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-2.5 sm:gap-3 opacity-0 animate-[message-enter_150ms_ease-out_forwards]">
      {/* Bot Avatar */}
      <div
        className="
          flex h-7 w-7 shrink-0 items-center justify-center
          rounded-full border border-clay bg-bone text-xs select-none
        "
        aria-hidden="true"
      >
        🤖
      </div>

      {/* Bubble with 3 pulsing dots */}
      <div
        role="status"
        aria-label="Bot is typing"
        className="
          flex items-center gap-1.5 rounded-sm border border-clay bg-bone
          px-3.5 py-3 select-none
        "
      >
        <span
          className="h-1.5 w-1.5 rounded-full bg-ink/70 animate-[typing-dot_900ms_infinite_ease-in-out]"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="h-1.5 w-1.5 rounded-full bg-ink/70 animate-[typing-dot_900ms_infinite_ease-in-out]"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="h-1.5 w-1.5 rounded-full bg-ink/70 animate-[typing-dot_900ms_infinite_ease-in-out]"
          style={{ animationDelay: '300ms' }}
        />
      </div>
    </div>
  );
}
