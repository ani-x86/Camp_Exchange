/**
 * BioBox — prose bio input with character counter.
 *
 * design.md §2 Type rule:
 * "IBM Plex Mono is NOT used here (bio is prose, not data — monospace is reserved
 * for literal data like price/PRN/order IDs). Use Inter, same as other body text."
 *
 * design.md §5 Form fields spec:
 * Focus: border shifts Clay → Moss over 120ms, no glow/shadow.
 *
 * Props:
 *  - value      (string)   Current bio text
 *  - onChange   (fn)       (newBio) => void
 *  - maxLength  (number)   Default 300
 *  - disabled   (bool?)
 */
export default function BioBox({
  value = '',
  onChange,
  maxLength = 300,
  disabled = false,
}) {
  const charCount = value.length;
  const isNearLimit = charCount >= maxLength * 0.9;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label
          htmlFor="profile-bio"
          className="font-sans text-xs font-medium text-ink/60"
        >
          Bio
        </label>
        <span
          className={`
            font-sans text-[11px]
            ${isNearLimit ? 'text-marigold font-medium' : 'text-ink/40'}
          `}
          aria-live="polite"
        >
          {charCount}/{maxLength}
        </span>
      </div>

      <textarea
        id="profile-bio"
        rows={3}
        maxLength={maxLength}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder="Tell fellow students what you study, clubs, or items you're trading…"
        className="
          w-full rounded-sm border border-clay bg-bone px-3 py-2
          font-sans text-sm text-ink placeholder:text-ink/30
          outline-none transition-colors duration-120 ease-out
          focus:border-moss disabled:cursor-not-allowed disabled:bg-clay/10
          resize-none
        "
      />
    </div>
  );
}
