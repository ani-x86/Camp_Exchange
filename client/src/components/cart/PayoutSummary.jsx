/**
 * PayoutSummary — financial breakdown and primary checkout trigger.
 *
 * Rules:
 *  - Right-aligned numeric values in IBM Plex Mono.
 *  - Updates silently in place without ambient numbers animation.
 *  - Primary button spec (design.md §5): hover underline-grow (150ms),
 *    active scale to 0.97 (100ms). Disabled state is flat/Clay.
 *  - Flat paper aesthetic, border-clay, no SaaS drop-shadow.
 *
 * Props:
 *  - itemsTotal       (number)
 *  - platformFee      (number)
 *  - onCheckout       (fn)
 *  - disabled         (bool)
 */
export default function PayoutSummary({
  itemsTotal = 0,
  platformFee = 0,
  onCheckout,
  disabled = false,
}) {
  const finalTotal = itemsTotal + platformFee;

  return (
    <div className="rounded-sm border border-clay bg-bone p-5 sm:p-6">
      <h2 className="font-heading text-base font-bold text-ink">
        Payout summary
      </h2>

      <div className="mt-4 space-y-2.5">
        {/* Items Total */}
        <div className="flex items-center justify-between text-sm">
          <span className="font-sans text-ink/70">Items total</span>
          <span className="font-mono text-ink">₹{itemsTotal}</span>
        </div>

        {/* Platform Fee */}
        <div className="flex items-center justify-between text-sm">
          <span className="font-sans text-ink/70">Campus platform fee</span>
          <span className="font-mono text-moss font-medium">
            {platformFee === 0 ? '₹0 (Free)' : `₹${platformFee}`}
          </span>
        </div>

        {/* Hairline Divider */}
        <div className="border-t border-clay pt-2.5" />

        {/* Total Payout */}
        <div className="flex items-center justify-between">
          <span className="font-sans text-sm font-semibold text-ink">
            Total payout
          </span>
          <span className="font-mono text-lg font-bold text-ink">
            ₹{finalTotal}
          </span>
        </div>
      </div>

      {/* Primary Checkout Button — design.md §5 buttons spec */}
      <div className="mt-6">
        <button
          type="button"
          onClick={onCheckout}
          disabled={disabled || finalTotal <= 0}
          className={`
            group relative w-full rounded-sm px-4 py-2.5
            font-sans text-sm font-medium
            transition-[background-color,transform] duration-150 ease-out
            ${
              disabled || finalTotal <= 0
                ? 'cursor-not-allowed border border-clay bg-clay text-ink/40'
                : 'cursor-pointer bg-moss text-bone hover:bg-moss-hover active:scale-[0.97] active:duration-100'
            }
          `}
        >
          <span className="relative z-10">
            Proceed to checkout
          </span>

          {/* Underline accent grows from center on hover — 150ms */}
          {!disabled && finalTotal > 0 && (
            <span
              className="
                absolute bottom-2 left-1/2 h-px w-3/5
                -translate-x-1/2 scale-x-0
                bg-bone/50
                transition-transform duration-150 ease-out
                group-hover:scale-x-100
              "
              aria-hidden="true"
            />
          )}
        </button>
      </div>

      <p className="mt-3 text-center text-[11px] text-ink/50 font-sans select-none">
        Campus handoff • Razorpay secure payment
      </p>
    </div>
  );
}
