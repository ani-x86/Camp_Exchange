import { useEffect, useRef } from 'react';

/**
 * PreviewModal — shows the listing as a buyer would see it.
 * listing.md §6 Preview modal
 *
 * - Focus trapped
 * - Esc closes
 * - Focus returns to trigger on close
 */
export default function PreviewModal({ draft, seller, triggerRef, onClose, onPublish, publishDisabled }) {
  const modalRef = useRef(null);
  const primaryImage = draft.images.find((img) => img.isPrimary);

  // Trap focus
  useEffect(() => {
    const focusable = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable?.[0];
    const last = focusable?.[focusable.length - 1];

    first?.focus();

    const trapTab = (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
        triggerRef?.current?.focus();
      }
    };

    document.addEventListener('keydown', trapTab);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('keydown', trapTab);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose, triggerRef]);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 py-8 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
          triggerRef?.current?.focus();
        }
      }}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-sm overflow-y-auto rounded-sm border border-clay bg-bone shadow-md"
        style={{ maxHeight: '90vh' }}
      >
        {/* Close */}
        <button
          type="button"
          aria-label="Close preview"
          onClick={() => {
            onClose();
            triggerRef?.current?.focus();
          }}
          className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-sm border border-clay text-ink/50 hover:border-moss hover:text-moss transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Buyer view header */}
        <div className="border-b border-clay px-5 py-4">
          <p className="text-[10px] font-medium uppercase tracking-widest text-ink/40">Preview — buyer's view</p>
          <h2 id="preview-modal-title" className="mt-1 font-heading text-lg font-bold text-ink">
            {draft.title || <span className="text-ink/30 italic">No title yet</span>}
          </h2>
        </div>

        {/* Primary image */}
        {primaryImage ? (
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: '4/3' }}>
            <img
              src={primaryImage.previewUrl}
              alt={draft.title || 'Listing photo'}
              className="h-full w-full object-cover"
            />
            {/* Marigold price tag corner — design.md §3 */}
            {draft.price && (
              <div className="absolute bottom-0 right-0 bg-marigold px-3 py-1.5">
                <span className="font-mono text-base font-bold text-ink">
                  ₹{Number(draft.price).toLocaleString('en-IN')}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center bg-clay/20 text-sm text-ink/30">
            No photo added yet
          </div>
        )}

        {/* Details */}
        <div className="space-y-4 p-5">
          {/* Category + condition chips */}
          <div className="flex flex-wrap gap-1.5">
            {draft.category && (
              <span className="rounded-sm border border-clay px-2 py-0.5 text-xs text-ink/60">
                {draft.category}
              </span>
            )}
            {draft.condition && (
              <span className="rounded-sm border border-clay px-2 py-0.5 text-xs text-ink/60">
                {draft.condition}
              </span>
            )}
          </div>

          {/* Description */}
          {draft.description ? (
            <p className="text-sm leading-relaxed text-ink/80">{draft.description}</p>
          ) : (
            <p className="text-sm italic text-ink/30">No description yet.</p>
          )}

          {/* Additional images strip */}
          {draft.images.filter((img) => !img.isPrimary).length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {draft.images.filter((img) => !img.isPrimary).map((img) => (
                <img
                  key={img.id}
                  src={img.previewUrl}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-sm object-cover border border-clay"
                />
              ))}
            </div>
          )}

          {/* Seller block */}
          <div className="rounded-sm border border-clay bg-bone/50 px-3 py-2.5">
            <p className="text-xs text-ink/40 mb-1">Seller</p>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-clay/40 flex items-center justify-center text-xs font-bold text-ink/60">
                {seller.name?.[0] || '?'}
              </div>
              <div>
                <p className="text-sm font-medium text-ink">{seller.name}</p>
                {seller.verified && (
                  <div className="flex items-center gap-1 text-xs text-moss">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Verified Student
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                onClose();
                triggerRef?.current?.focus();
              }}
              className="flex-1 rounded-sm border border-clay bg-bone px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-moss hover:text-moss active:scale-[0.97]"
            >
              Back to editing
            </button>
            <button
              type="button"
              onClick={onPublish}
              disabled={publishDisabled}
              aria-disabled={publishDisabled}
              className={`
                flex-1 rounded-sm px-3 py-2 text-sm font-medium transition-colors active:scale-[0.97]
                ${publishDisabled
                  ? 'cursor-not-allowed border border-clay bg-clay text-ink/40'
                  : 'bg-moss text-bone hover:bg-moss-hover'
                }
              `}
            >
              Publish item
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
