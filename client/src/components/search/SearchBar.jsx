import { useState, useRef, useEffect, useCallback } from 'react';
import SuggestionDropdown from './SuggestionDropdown';
import { getSuggestions } from '../../services/searchSuggestions';

/**
 * SearchBar — expandable search input in Toolbar with follow-up keyword suggestions.
 *
 * Motion & Interaction spec (design.md §5):
 *  - Expand: icon grows to full input width over 200ms ease-out.
 *  - Auto-focus: cursor focuses only after the 200ms expand finishes.
 *  - Collapse: reverses over 180ms ease-out (asymmetric in/out).
 *  - Focus styling: border shifts Clay → Moss over 120ms, no glow/shadow.
 *  - Input debounce: 250ms before requesting suggestions.
 *  - Keyboard navigation: Arrow Up/Down navigates chips, Enter commits, Esc collapses.
 *  - Click outside collapses the search bar.
 *
 * Props:
 *  - onSearch  (fn?)   (query: string) => void — called when user executes search
 */
export default function SearchBar({ onSearch }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [suggestions, setSuggestions] = useState({ category: null, chips: [] });
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const expandTimerRef = useRef(null);

  // Check prefers-reduced-motion
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Debounce input by ~250ms ──
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  // ── Fetch suggestions when debounced query changes or when opened ──
  useEffect(() => {
    if (!isExpanded) return;

    let active = true;
    getSuggestions(debouncedQuery).then((res) => {
      if (active) {
        setSuggestions(res);
        setSelectedIndex(-1);
      }
    });

    return () => {
      active = false;
    };
  }, [debouncedQuery, isExpanded]);

  // ── Expand handling & auto-focus after 200ms expand finishes ──
  const handleOpen = () => {
    setIsExpanded(true);
    setShowDropdown(true);

    // Auto-focus text cursor only after the 200ms animation completes
    const delay = prefersReduced ? 0 : 200;
    expandTimerRef.current = setTimeout(() => {
      inputRef.current?.focus();
    }, delay);
  };

  // ── Collapse handling ──
  const handleCollapse = useCallback(() => {
    clearTimeout(expandTimerRef.current);
    setShowDropdown(false);
    setIsExpanded(false);
    setQuery('');
    setDebouncedQuery('');
    setSelectedIndex(-1);
  }, []);

  // ── Close on click outside ──
  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        handleCollapse();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isExpanded, handleCollapse]);

  // ── Execute search ──
  const executeSearch = (searchTerm) => {
    const finalTerm = searchTerm.trim();
    if (!finalTerm) return;

    onSearch?.(finalTerm);
    setShowDropdown(false);
  };

  // ── Keyboard support (Up, Down, Enter, Esc) ──
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCollapse();
      return;
    }

    const totalChips = suggestions.chips.length;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (totalChips === 0) return;
      setSelectedIndex((prev) => (prev + 1) % totalChips);
      setShowDropdown(true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (totalChips === 0) return;
      setSelectedIndex((prev) => (prev <= 0 ? totalChips - 1 : prev - 1));
      setShowDropdown(true);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < totalChips) {
        const selectedChip = suggestions.chips[selectedIndex];
        setQuery(selectedChip);
        executeSearch(selectedChip);
      } else {
        executeSearch(query);
      }
    }
  };

  // ── Chip click: fills input and immediately fires search ──
  const handleSelectChip = (chipText) => {
    setQuery(chipText);
    executeSearch(chipText);
  };

  return (
    <div ref={containerRef} className="relative flex items-center justify-end">
      {/* ── Closed / Trigger Icon State ── */}
      {!isExpanded && (
        <button
          type="button"
          onClick={handleOpen}
          aria-label="Search"
          className="group relative flex flex-col items-center gap-0.5 p-2 cursor-pointer"
        >
          {/* Icon tilts -6° on hover, 120ms (design.md §5) */}
          <span
            className="
              relative block text-ink
              transition-transform duration-120 ease-out
              group-hover:-rotate-6
            "
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>

          {/* Label fades in on hover over 120ms (design.md §5) */}
          <span
            className="
              block text-[10px] font-sans text-ink/70
              opacity-0 transition-opacity duration-120 ease-out
              group-hover:opacity-100
              select-none
            "
          >
            Search
          </span>
        </button>
      )}

      {/* ── Expanded Inline Search Bar State ── */}
      {isExpanded && (
        <div
          className="
            relative flex items-center
            w-64 sm:w-80 md:w-96
            transition-[width] duration-200 ease-out
          "
        >
          {/* Search Input Shell */}
          <div
            className="
              flex w-full items-center rounded-sm border border-clay bg-bone
              px-2.5 py-1.5
              transition-[border-color] duration-120 ease-out
              focus-within:border-moss
            "
          >
            {/* Search Icon Prefix */}
            <span className="text-ink/60 shrink-0 mr-2" aria-hidden="true">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>

            {/* Static Single-Line Inter Input (Clay placeholder) */}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={handleKeyDown}
              placeholder="Search books, electronics, furniture…"
              aria-label="Search listings"
              className="
                w-full bg-transparent font-sans text-sm text-ink
                placeholder:text-clay outline-none
              "
            />

            {/* Clear / Collapse 'X' Icon Button */}
            <button
              type="button"
              onClick={handleCollapse}
              aria-label="Close search"
              className="
                ml-1 text-ink/50 hover:text-ink
                p-1 rounded-sm cursor-pointer
                transition-colors duration-120 shrink-0
              "
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* ── Follow-Up Suggestion Dropdown ── */}
          {showDropdown && suggestions.chips.length > 0 && (
            <SuggestionDropdown
              chips={suggestions.chips}
              category={suggestions.category}
              selectedIndex={selectedIndex}
              query={debouncedQuery}
              onSelectChip={handleSelectChip}
            />
          )}
        </div>
      )}
    </div>
  );
}
