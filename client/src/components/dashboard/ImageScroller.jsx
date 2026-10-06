/**
 * ImageScroller — horizontal, snap-to-item photo gallery.
 *
 * Native overflow scrolling gives touch swipe + momentum for free, `snap-*`
 * gives the snap-to-item stop, and `scroll-smooth` eases it — no JS needed.
 *
 * Motion (design.md §5): none of its own; it only reacts to the user's swipe.
 * The card's `group-hover` zoom is applied to each slide, so the photo
 * still answers the card hover without a second wrapper element.
 *
 * Props:
 *  - images (string[] | string) Photo URLs. Renders a placeholder when empty.
 *  - alt    (string)            Alt text base; the slide number is appended when >1.
 */
export function ImageScroller({ images = [], alt = '' }) {
  const rawList = Array.isArray(images)
    ? images
    : typeof images === 'string' && images
      ? [images]
      : [];
  const list = rawList
    .map((img) => (typeof img === 'object' && img?.url ? img.url : img))
    .filter(Boolean);

  if (list.length === 0) {
    return (
      <div className="flex aspect-[3/2] items-center justify-center bg-clay/20">
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
    );
  }

  return (
    <div
      className="
        flex aspect-[3/2] snap-x snap-mandatory overflow-x-auto scroll-smooth
        [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
      "
    >
      {list.map((src, i) => (
        <img
          key={i}
          src={src}
          alt={list.length > 1 ? `${alt} — photo ${i + 1}` : alt}
          loading={i === 0 ? 'eager' : 'lazy'}
          className="
            h-full w-full shrink-0 snap-center object-cover
            transition-transform duration-200 ease-out group-hover:scale-[1.03]
          "
        />
      ))}
    </div>
  );
}

export default ImageScroller;