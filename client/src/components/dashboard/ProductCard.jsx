import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * ProductCard — pinboard index-card tile following design.md §3 and laptop alignment spec.
 *
 * Visual & alignment spec:
 *  - 1px Clay border, rounded-sm, Bone paper background.
 *  - flex h-full flex-col: stretches to row height in CSS Grid.
 *  - Fixed 4:3 image ratio (aspect-[4/3]), object-cover, w-full.
 *  - Neutral placeholder on image error or missing URL (bg-clay/20 with icon).
 *  - Title: line-clamp-2 with min-h-[2.5rem] (2 lines reserved).
 *  - Description: line-clamp-2 with min-h-[2rem].
 *  - Price: mt-auto to align baselines across the row. Monospace per design.md §2.
 *  - Marigold tag corner: top-right, lifts 3° on card hover.
 *  - Card dips to 0.98 scale on click, subtle hover shadow and border.
 */
export function ProductCard({ product }) {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);

  const { id, _id, title, description, price, images, imageUrl } = product;
  const productId = id || _id;

  // Extract primary image URL safely
  const rawImage = Array.isArray(images) && images.length > 0 ? images[0] : (imageUrl || '');
  const imageSrc = typeof rawImage === 'object' && rawImage?.url ? rawImage.url : rawImage;

  const handleClick = () => {
    if (productId) {
      navigate(`/products/${productId}`);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <article
      tabIndex={0}
      role="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="
        group relative flex h-full w-full flex-col text-left
        border border-clay rounded-sm bg-bone
        overflow-hidden cursor-pointer
        transition-all duration-150 ease-out
        hover:border-ink/20 hover:shadow-sm
        focus-visible:outline-2 focus-visible:outline-moss focus-visible:outline-offset-2
        active:scale-[0.98]
      "
    >
      {/* Marigold tag corner — top-right inside border, lifts 3° on hover */}
      <span
        className="
          absolute top-0 right-0 z-10
          h-6 w-6 bg-marigold rounded-bl-lg
          origin-top-right pointer-events-none
          transition-transform duration-200 ease-out
          group-hover:rotate-3
        "
        aria-hidden="true"
      />

      {/* ── Fixed 4:3 Image Area ── */}
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-clay/20">
        {!imageError && imageSrc ? (
          <img
            src={imageSrc}
            alt={title}
            loading="lazy"
            decoding="async"
            onError={() => setImageError(true)}
            className="
              h-full w-full object-cover
              transition-transform duration-200 ease-out
              group-hover:scale-[1.03]
            "
          />
        ) : (
          /* Neutral Fallback Placeholder (design.md & spec §3.1) */
          <div
            className="flex h-full w-full items-center justify-center bg-clay/20 text-ink/40 select-none"
            aria-hidden="true"
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-clay/90"
            >
              {/* Package / item icon */}
              <path d="m7.5 4.27 9 5.15" />
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
              <path d="m3.3 7 8.7 5 8.7-5" />
              <path d="M12 22V12" />
            </svg>
          </div>
        )}
      </div>

      {/* ── Card Body (flex-1 to push price to baseline) ── */}
      <div className="flex flex-1 flex-col p-3">
        {/* Title — exactly 2 lines height reserved */}
        <h3 className="font-heading text-sm font-semibold text-ink leading-snug line-clamp-2 min-h-[2.5rem]">
          {title}
        </h3>

        {/* Description — 2 lines height reserved, passing 4.5:1 contrast */}
        <p className="mt-1 font-sans text-xs text-ink/70 leading-snug line-clamp-2 min-h-[2rem]">
          {description || 'Campus listing — verified student trade.'}
        </p>

        {/* Price — mt-auto pins every price in a row to the exact same baseline */}
        <div className="mt-auto pt-2.5">
          <p className="font-mono text-sm font-semibold tabular-nums text-ink">
            ₹{Number(price).toLocaleString('en-IN')}
          </p>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
