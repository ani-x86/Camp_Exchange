import KeywordChip from './KeywordChip';

/**
 * SuggestionDropdown — displays follow-up keyword chips directly beneath search bar.
 *
 * Visual & motion rules:
 *  - Bone background, thin Clay border, NO floating-card shadow (paper aesthetic).
 *  - Chips cascade in individually with staggered delay (~30ms apart, capped <250ms).
 *  - Maximum 5–6 visible chips; scrolls if more.
 *  - Empty state (no query yet) renders "Recent searches".
 *
 * Props:
 *  - chips          (string[])   List of keyword suggestions
 *  - category       (string?)    Category match name
 *  - selectedIndex  (number)     Keyboard active index
 *  - query          (string)     Current typed query
 *  - onSelectChip   (fn)         (keyword) => void
 */
export default function SuggestionDropdown({
  chips = [],
  category = null,
  selectedIndex = -1,
  query = '',
  onSelectChip,
}) {
  if (!chips || chips.length === 0) return null;

  const isRecentSearches = !query.trim();

  return (
    <div
      role="listbox"
      aria-label="Search suggestions"
      className="
        absolute left-0 right-0 top-full z-50 mt-1.5
        rounded-sm border border-clay bg-bone p-3
        max-h-60 overflow-y-auto
      "
    >
      {/* Dropdown Header */}
      <div className="mb-2 flex items-center justify-between">
        <span className="font-sans text-[10px] font-semibold uppercase tracking-wider text-ink/50 select-none">
          {isRecentSearches ? 'Recent searches' : 'Follow-up topics'}
        </span>

        {category && (
          <span className="inline-flex items-center gap-1 font-sans text-[11px] text-moss">
            <span className="h-1.5 w-1.5 rounded-full bg-moss" aria-hidden="true" />
            <span className="font-medium">{category}</span>
          </span>
        )}
      </div>

      {/* Cascading Chips */}
      <div className="flex flex-wrap gap-1.5">
        {chips.slice(0, 6).map((chip, idx) => (
          <KeywordChip
            key={`${chip}-${idx}`}
            label={chip}
            index={idx}
            isSelected={selectedIndex === idx}
            isCategory={category != null && chip.toLowerCase() === category.toLowerCase()}
            onClick={onSelectChip}
          />
        ))}
      </div>
    </div>
  );
}
