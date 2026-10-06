import { Link } from 'react-router-dom';

/**
 * PublishSuccess — confirmation state after a listing is published.
 * listing.md §6 Success state
 */
export default function PublishSuccess({ listing, onAddAnother }) {
  const primaryImage = listing.images[0];

  return (
    <div className="flex flex-col items-center gap-5 py-6 text-center">
      {/* Moss animated check — design.md §5 verification badge */}
      <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-moss bg-bone">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#3F6B3E"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="[stroke-dasharray:40] [stroke-dashoffset:40] animate-[draw-check_400ms_ease-out_forwards]"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <div>
        <h2 className="font-heading text-xl font-bold text-ink">Your item is live</h2>
        <p className="mt-1 text-sm text-ink/50">It's now visible to students on campus.</p>
      </div>

      {/* Thumbnail + title */}
      {primaryImage && (
        <div className="flex items-center gap-3 rounded-sm border border-clay bg-bone/50 p-3 w-full">
          <img
            src={primaryImage}
            alt={listing.title}
            className="h-14 w-14 rounded-sm object-cover border border-clay"
          />
          <div className="text-left min-w-0">
            <p className="text-sm font-medium text-ink truncate">{listing.title}</p>
            <p className="mt-0.5 font-mono text-sm text-marigold">
              ₹{listing.price.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      )}

      {/* Links */}
      <div className="flex w-full flex-col gap-2">
        <Link
          to="/dashboard"
          className="w-full rounded-sm bg-moss px-4 py-2.5 text-center text-sm font-medium text-bone transition-colors hover:bg-moss-hover active:scale-[0.97]"
        >
          View on board
        </Link>
        <button
          type="button"
          onClick={onAddAnother}
          className="w-full rounded-sm border border-clay px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-moss hover:text-moss active:scale-[0.97]"
        >
          + Add another item
        </button>
        <Link
          to="/profile"
          className="mt-1 text-xs text-ink/40 underline-offset-2 hover:underline hover:text-ink/70 transition-colors"
        >
          Back to profile
        </Link>
      </div>
    </div>
  );
}
