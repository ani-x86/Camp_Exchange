/**
 * RecentPurchaseCard — compact, read-only receipt card for historical purchases.
 *
 * Rules:
 *  - Visually secondary: smaller footprint, muted borders, no stepper or remove controls.
 *  - Price in IBM Plex Mono.
 *  - Flat paper aesthetic, rounded-sm, hairline Clay border.
 *
 * Props:
 *  - purchase  (object)  { id, title, price, date, imageUrl, orderCode, seller }
 *  - onClick   (fn?)
 */
export default function RecentPurchaseCard({ purchase, onClick }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(purchase)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(purchase);
        }
      }}
      aria-label={`View order details for ${purchase.title}`}
      className="
        group flex items-center gap-3 rounded-sm border border-clay bg-bone p-2.5
        transition-colors duration-120 ease-out hover:border-moss/50
        cursor-pointer text-left
      "
    >
      {/* Thumbnail */}
      {purchase.imageUrl ? (
        <img
          src={purchase.imageUrl}
          alt={purchase.title}
          className="h-12 w-12 rounded-sm object-cover border border-clay shrink-0 bg-clay/20"
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-sm border border-clay bg-clay/20 text-[10px] text-ink/40 shrink-0 font-sans">
          Past
        </div>
      )}

      {/* Details */}
      <div className="min-w-0 flex-1">
        <h4 className="font-heading text-xs font-semibold text-ink truncate group-hover:text-moss transition-colors duration-120">
          {purchase.title}
        </h4>

        <div className="mt-0.5 flex items-center justify-between">
          <span className="font-mono text-xs font-medium text-ink/80">
            ₹{purchase.price}
          </span>
          <span className="font-sans text-[10px] text-ink/40">
            {purchase.date}
          </span>
        </div>

        <div className="mt-1 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-moss" aria-hidden="true" />
          <span className="font-mono text-[10px] text-ink/60 truncate">
            {purchase.orderCode}
          </span>
        </div>
      </div>
    </div>
  );
}
