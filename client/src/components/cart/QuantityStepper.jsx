import { useState, useEffect } from 'react';

/**
 * QuantityStepper — [-] [count] [+] control with 150ms spring pop.
 *
 * Motion spec (design.md §5):
 *  - Count scales 1 → 1.15 → 1 over 150ms on each click.
 *  - Number itself is in IBM Plex Mono (data looks like data).
 *  - Reaching 0 triggers removal animation via onDecrease.
 *  - Subtotal updates silently in place (no double animation).
 *
 * Props:
 *  - quantity    (number)   Current count
 *  - maxStock    (number)   Available stock limit
 *  - onIncrease  (fn)       Called on [+] click
 *  - onDecrease  (fn)       Called on [-] click
 */
export default function QuantityStepper({
  quantity = 1,
  maxStock = 5,
  onIncrease,
  onDecrease,
}) {
  const [popping, setPopping] = useState(false);

  // Trigger 150ms pop animation whenever quantity changes
  useEffect(() => {
    setPopping(true);
    const timer = setTimeout(() => setPopping(false), 150);
    return () => clearTimeout(timer);
  }, [quantity]);

  const canIncrease = quantity < maxStock;

  return (
    <div
      role="group"
      aria-label="Item quantity"
      className="inline-flex items-center rounded-sm border border-clay bg-bone"
    >
      {/* Decrease button: [-] */}
      <button
        type="button"
        onClick={onDecrease}
        aria-label={quantity === 1 ? 'Remove item from cart' : 'Decrease quantity'}
        className="
          flex h-7 w-7 items-center justify-center
          text-ink/80 hover:bg-clay/20 active:scale-[0.97]
          transition-[background-color,transform] duration-100 ease-out
          cursor-pointer select-none
        "
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Count display with 150ms spring pop — IBM Plex Mono */}
      <div className="flex h-7 w-8 items-center justify-center border-x border-clay/60 bg-bone">
        <span
          key={quantity}
          className={`
            font-mono text-xs font-medium text-ink select-none
            ${popping ? 'animate-[stepper-pop_150ms_cubic-bezier(0.0,0.0,0.2,1)]' : ''}
          `}
        >
          {quantity}
        </span>
      </div>

      {/* Increase button: [+] */}
      <button
        type="button"
        disabled={!canIncrease}
        onClick={onIncrease}
        aria-label="Increase quantity"
        className={`
          flex h-7 w-7 items-center justify-center
          transition-[background-color,transform] duration-100 ease-out select-none
          ${
            canIncrease
              ? 'cursor-pointer text-ink/80 hover:bg-clay/20 active:scale-[0.97]'
              : 'cursor-not-allowed text-ink/30 bg-clay/10'
          }
        `}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  );
}
