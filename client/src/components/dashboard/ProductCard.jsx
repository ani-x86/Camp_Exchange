import { useNavigate } from 'react-router-dom';

/**
 * ProductCard — pinboard index-card tile following design.md §3 and §5.
 *
 * Visual spec (design.md §3):
 *  - NOT rounded SaaS card with drop shadow.
 *  - Border: 1px Clay, rounded-sm (subtle corner, not pill).
 *  - Marigold "string tag" corner accent: top-right, `rounded-bl-lg`.
 *  - Photo in fixed-size frame — overflow hidden, NO layout shift on zoom.
 *  - Price in IBM Plex Mono (design.md §2: data, not prose).
 *
 * Hover spec (design.md §5 product card):
 *  - Photo scales to 1.03 inside frame, 200ms ease-out.
 *  - Marigold tag lifts 3° simultaneously, same 200ms trigger.
 *  - ONE motion, TWO elements — not separate animations.
 *  - Click: card dips to 0.98 for 80ms before navigating.
 *
 * Props:
 *  - product  ({ _id, title, price, imageUrl, category })
 */
export default function ProductCard({ product }) {
  const navigate = useNavigate();
  const { _id, title, price, imageUrl } = product;

  const handleClick = () => {
    // 80ms dip is handled by active:scale CSS; navigate fires after
    navigate(`/products/${_id}`);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="
        group relative w-full text-left
        border border-clay rounded-sm bg-bone
        overflow-hidden
        break-inside-avoid mb-4
        cursor-pointer
        transition-transform duration-[80ms] ease-out
        active:scale-[0.98]
      "
    >
      {/* Marigold tag corner — top-right, lifts 3° with photo on hover */}
      <span
        className="
          absolute top-0 right-0 z-10
          h-6 w-6 bg-marigold rounded-bl-lg
          origin-top-right
          transition-transform duration-200 ease-out
          group-hover:rotate-3
        "
        aria-hidden="true"
      />

      {/* Photo — fixed-aspect frame, no layout shift on zoom */}
      <div className="relative overflow-hidden bg-clay/20" style={{ paddingBottom: '66%' }}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="
              absolute inset-0 h-full w-full object-cover
              transition-transform duration-200 ease-out
              group-hover:scale-[1.03]
            "
            loading="lazy"
          />
        ) : (
          /* Placeholder when no image is set */
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              className="text-clay"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="px-3 py-2.5">
        <p className="font-sans text-sm font-medium text-ink leading-snug line-clamp-2">
          {title}
        </p>
        <p className="mt-1 font-mono text-sm text-ink/80">
          ₹{price.toLocaleString('en-IN')}
        </p>
      </div>
    </button>
  );
}
