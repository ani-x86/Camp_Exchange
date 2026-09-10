import { useState } from 'react';
import QuantityStepper from './QuantityStepper';

/**
 * CartItemRow — single listing in the active cart with aligned numeric rhythm.
 *
 * Rules:
 *  - Prices and subtotal in IBM Plex Mono (design.md §2: data looks like data).
 *  - Prices right-aligned in their column for vertical rhythm.
 *  - Subtotal updates silently in place.
 *  - Removal animation: row fades out + collapses height over 200ms ease-in,
 *    remaining rows slide up smoothly to fill the space.
 *
 * Props:
 *  - item              (object)  { id, title, price, quantity, maxStock, imageUrl, category }
 *  - onUpdateQuantity  (fn)      (id, newQty) => void
 *  - onRemove          (fn)      (id) => void
 */
export default function CartItemRow({
  item,
  onUpdateQuantity,
  onRemove,
}) {
  const [isRemoving, setIsRemoving] = useState(false);

  const subtotal = item.price * item.quantity;

  const triggerRemoval = () => {
    if (isRemoving) return;
    setIsRemoving(true);
    // Let 200ms CSS collapse finish before removing from parent state
    setTimeout(() => {
      onRemove(item.id);
    }, 200);
  };

  const handleIncrease = () => {
    if (item.quantity < (item.maxStock ?? 5)) {
      onUpdateQuantity(item.id, item.quantity + 1);
    }
  };

  const handleDecrease = () => {
    if (item.quantity > 1) {
      onUpdateQuantity(item.id, item.quantity - 1);
    } else {
      // Reaching 0 initiates smooth removal
      triggerRemoval();
    }
  };

  return (
    <div
      className={`
        border-b border-clay/70 bg-bone
        transition-all duration-200 ease-in
        ${
          isRemoving
            ? 'max-h-0 opacity-0 py-0 overflow-hidden border-transparent'
            : 'max-h-40 opacity-100 py-4'
        }
      `}
    >
      <div className="flex items-center justify-between gap-3 sm:gap-4">
        {/* Item Photo & Title */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.title}
              className="h-14 w-14 rounded-sm object-cover border border-clay shrink-0 bg-clay/20"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-sm border border-clay bg-clay/20 text-ink/40 text-xs shrink-0 font-sans">
              Item
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h3 className="font-heading text-sm font-semibold text-ink truncate">
              {item.title}
            </h3>

            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-[11px] text-ink/50 uppercase tracking-wider font-sans">
                {item.category}
              </span>

              {/* Price each (Mobile inline) */}
              <span className="font-mono text-xs text-ink/70 sm:hidden">
                ₹{item.price} each
              </span>
            </div>
          </div>
        </div>

        {/* Price Each Column (Tablet/Desktop) — IBM Plex Mono */}
        <div className="hidden sm:block w-20 text-right">
          <span className="font-mono text-xs text-ink/70">
            ₹{item.price}
          </span>
          <span className="block text-[10px] text-ink/40 font-sans">each</span>
        </div>

        {/* Quantity Stepper */}
        <div className="shrink-0">
          <QuantityStepper
            quantity={item.quantity}
            maxStock={item.maxStock ?? 5}
            onIncrease={handleIncrease}
            onDecrease={handleDecrease}
          />
        </div>

        {/* Line Subtotal Column — IBM Plex Mono (Right-aligned) */}
        <div className="w-20 sm:w-24 text-right shrink-0">
          <span className="font-mono text-sm font-semibold text-ink">
            ₹{subtotal}
          </span>
        </div>

        {/* Remove Action Button */}
        <button
          type="button"
          onClick={triggerRemoval}
          aria-label={`Remove ${item.title} from cart`}
          className="
            p-1.5 text-ink/40 hover:text-rust rounded-sm
            transition-colors duration-120 cursor-pointer shrink-0
          "
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
