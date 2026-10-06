import { useRef, useCallback } from 'react';

/**
 * PrimaryImageSlot — large 4:3 drop zone for the primary listing photo.
 * listing.md §3.2
 */
export function PrimaryImageSlot({ image, onAdd, onRemove, error }) {
  const inputRef = useRef(null);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      if (e.dataTransfer.files.length > 0) {
        onAdd(e.dataTransfer.files);
      }
    },
    [onAdd]
  );

  const handleDragOver = (e) => e.preventDefault();

  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !image) {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  return (
    <div>
      <div
        role={image ? undefined : 'button'}
        tabIndex={image ? -1 : 0}
        aria-label={image ? undefined : 'Add primary photo'}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onKeyDown={handleKeyDown}
        onClick={() => !image && inputRef.current?.click()}
        className={`
          relative w-full overflow-hidden rounded-sm
          ${image ? '' : 'cursor-pointer'}
          transition-colors duration-150
        `}
        style={{ aspectRatio: '4/3' }}
      >
        {image ? (
          <>
            {/* Preview */}
            <img
              src={image.previewUrl}
              alt="Primary listing photo"
              className="h-full w-full object-cover"
            />
            {/* Primary badge */}
            <span
              className="absolute top-2 left-2 rounded-sm bg-marigold px-2 py-0.5 font-mono text-[10px] font-medium text-ink"
              aria-label="Primary photo"
            >
              Primary
            </span>
            {/* Remove */}
            <button
              type="button"
              aria-label="Remove primary photo"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(image.id);
              }}
              className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-sm bg-bone/90 text-ink transition-colors hover:bg-rust hover:text-bone"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </>
        ) : (
          /* Empty state drop zone */
          <div
            className={`
              flex h-full w-full flex-col items-center justify-center gap-2
              border-2 border-dashed rounded-sm
              ${error ? 'border-rust bg-rust/5' : 'border-clay bg-bone hover:border-moss hover:bg-moss/5'}
              transition-colors duration-150
            `}
          >
            {/* ImagePlus icon */}
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={error ? 'text-rust' : 'text-clay'} aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
              <line x1="16" y1="5" x2="16" y2="11"/><line x1="13" y1="8" x2="19" y2="8"/>
            </svg>
            <div className="text-center">
              <p className={`text-sm font-medium ${error ? 'text-rust' : 'text-ink'}`}>
                Add primary photo
              </p>
              <p className="mt-0.5 text-xs text-ink/50">JPG or PNG, up to 5 MB</p>
            </div>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        id="primary-photo-input"
        type="file"
        accept="image/jpeg,image/png"
        className="sr-only"
        onChange={(e) => {
          if (e.target.files.length > 0) onAdd(e.target.files);
          e.target.value = '';
        }}
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}

/**
 * ImageThumb — single additional image thumbnail with remove + make-primary actions.
 * listing.md §3.3
 */
function ImageThumb({ image, index, onRemove, onMakePrimary }) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-sm border border-clay bg-bone">
      <img
        src={image.previewUrl}
        alt={`Listing photo ${index + 1}`}
        className="h-full w-full object-cover"
      />
      {/* Remove */}
      <button
        type="button"
        aria-label={`Remove photo ${index + 1}`}
        onClick={() => onRemove(image.id)}
        className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-sm bg-bone/90 text-ink transition-colors hover:bg-rust hover:text-bone"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      {/* Make primary */}
      <button
        type="button"
        aria-label={`Make photo ${index + 1} primary`}
        onClick={() => onMakePrimary(image.id)}
        title="Make primary"
        className="absolute bottom-1 left-1 rounded-sm bg-bone/90 px-1 py-0.5 text-[9px] font-medium text-ink transition-colors hover:bg-marigold"
      >
        ★
      </button>
    </div>
  );
}

/**
 * AddSlot — the dashed "+" tile for adding more photos.
 */
function AddSlot({ onAdd }) {
  const inputRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  return (
    <div>
      <button
        type="button"
        aria-label="Add more photos"
        onClick={() => inputRef.current?.click()}
        onKeyDown={handleKeyDown}
        className="flex aspect-square w-full items-center justify-center rounded-sm border-2 border-dashed border-clay bg-bone text-clay transition-colors hover:border-moss hover:text-moss"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        multiple
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          if (e.target.files.length > 0) onAdd(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}

/**
 * PhotoUploader — full photo upload section.
 * listing.md §3
 */
export default function PhotoUploader({ images, imageError, onAdd, onRemove, onMakePrimary }) {
  const primaryImage = images.find((img) => img.isPrimary) || null;
  const additionalImages = images.filter((img) => !img.isPrimary);
  const canAddMore = images.length < 6;

  return (
    <section aria-labelledby="photos-heading">
      <h2 id="photos-heading" className="mb-3 text-xs font-medium text-ink/50 uppercase tracking-wide">
        Item photos
      </h2>

      {/* Primary slot */}
      <PrimaryImageSlot
        image={primaryImage}
        onAdd={onAdd}
        onRemove={onRemove}
        error={!!imageError && !primaryImage}
      />

      {/* Additional thumbnails */}
      {(additionalImages.length > 0 || (primaryImage && canAddMore)) && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {additionalImages.map((img, i) => (
            <ImageThumb
              key={img.id}
              image={img}
              index={i + 1}
              onRemove={onRemove}
              onMakePrimary={onMakePrimary}
            />
          ))}
          {canAddMore && primaryImage && <AddSlot onAdd={onAdd} />}
        </div>
      )}

      {/* Photo errors — aria-live */}
      <div aria-live="polite" className="mt-2 min-h-[1.25rem]">
        {imageError && (
          <p className="text-xs text-rust">{imageError}</p>
        )}
      </div>
    </section>
  );
}
