/**
 * KeywordChip — individual suggestion tag.
 *
 * Motion spec (design.md §5):
 *  - Staggered entry: ~30ms apart, sliding up 6px + fade in over 150ms.
 *  - Total cascade capped under 250ms.
 *  - Hover: background shifts to very light Moss tint over 120ms.
 *  - Keyboard highlighted state matches hover.
 *  - Click immediately fills search and executes.
 *
 * Props:
 *  - label       (string)   Chip keyword text
 *  - index       (number)   Position in list for stagger calculation
 *  - isSelected  (bool)     Keyboard active index
 *  - isCategory  (bool?)    Optional category indicator
 *  - onClick     (fn)       (label) => void
 */
export default function KeywordChip({
  label,
  index = 0,
  isSelected = false,
  isCategory = false,
  onClick,
}) {
  const delayMs = Math.min(index * 30, 250);

  return (
    <button
      type="button"
      onClick={() => onClick(label)}
      style={{
        animationDelay: `${delayMs}ms`,
      }}
      className={`
        inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1
        font-sans text-xs transition-[background-color,border-color,color] duration-120 ease-out
        cursor-pointer text-left opacity-0 animate-[chip-enter_150ms_ease-out_forwards]
        ${
          isSelected
            ? 'border-moss bg-moss/10 text-moss font-medium'
            : 'border-clay bg-bone text-ink hover:border-moss/60 hover:bg-moss/10 hover:text-moss'
        }
      `}
    >
      {/* Category marker if relevant */}
      {isCategory && (
        <span
          className="h-1.5 w-1.5 rounded-full bg-marigold shrink-0"
          aria-hidden="true"
        />
      )}

      <span>{label}</span>
    </button>
  );
}
