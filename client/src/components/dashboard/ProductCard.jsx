import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImageScroller } from './ImageScroller';

/**
 * ProductCard — pinboard index-card tile following design.md §3 and §5.
 *
 * Visual spec (design.md §3):
 *  - 1px Clay border, rounded-sm, Bone paper background.
 *  - Marigold "string tag" corner accent at top-right, lifts 3° on card hover.
 *  - Photo zoom to 1.03 on hover (200ms ease-out) coordinated with tag lift.
 *  - Card dips to 0.98 scale on click (80ms).
 *  - Typography: Heading (General Sans), body (Inter), price (IBM Plex Mono).
 *
 * Props:
 *  - product: { _id, title, description, price, images, imageUrl }
 */
export function ProductCard({ product }) {
  const navigate = useNavigate();
  const { _id, title, description, price, images, imageUrl } = product;

  // Differentiate horizontal swipe gestures on photos from card clicks
  const pointerStart = useRef({ x: 0, y: 0 });
  const isSwiping = useRef(false);

  const productImages = images || (imageUrl ? [imageUrl] : []);

  const handlePointerDown = (e) => {
    pointerStart.current = { x: e.clientX, y: e.clientY };
    isSwiping.current = false;
  };

  const handlePointerMove = (e) => {
    if (Math.abs(e.clientX - pointerStart.current.x) > 8) {
      isSwiping.current = true;
    }
  };

  const handleClick = () => {
    if (!isSwiping.current) {
      navigate(`/products/${_id}`);
    }
  };

  return (
    <article
      tabIndex={0}
      role="button"
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
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

      {/* Photos — snap-scrollable gallery */}
      <ImageScroller images={productImages} alt={title} />

      {/* Card body */}
      <div className="px-3 py-2.5">
        <h3 className="font-heading text-sm font-semibold text-ink leading-snug line-clamp-2">
          {title}
        </h3>
        {description && (
          <p className="mt-0.5 font-sans text-xs text-ink/60 leading-snug line-clamp-2">
            {description}
          </p>
        )}
        <p className="mt-1.5 font-mono text-sm text-ink/80">
          ₹{Number(price).toLocaleString('en-IN')}
        </p>
      </div>
    </article>
  );
}

export default ProductCard;
