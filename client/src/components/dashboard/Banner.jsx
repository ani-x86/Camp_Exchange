import { useState, useEffect, useRef } from 'react';

/**
 * Banner — full-width image banner below the toolbar.
 *
 * Behaviour:
 *  - Single image: renders statically, no crossfade.
 *  - Multiple images: crossfades on a 4s hold, 150ms fade
 *    (matching toast enter in design.md §5).
 *  - No arrows, no dot indicators — clean crossfade only.
 *  - prefers-reduced-motion: no crossfade, shows first image statically.
 *  - Bone (#F2EFE6) background underneath — visible while image loads.
 *  - Bottom scrim (subtle Ink-tinted gradient) only for contrast — no
 *    full-image darken.
 *
 * Props:
 *  - images  (string[])  Array of imported image URLs
 *  - alt     (string?)   Alt text for the banner image
 */

const HOLD_MS  = 4000;
const FADE_MS  = 150;

export default function Banner({ images = [], alt = 'CampusXchange banner' }) {
  const [current, setCurrent] = useState(0);
  const [fading, setFading]   = useState(false);
  const timerRef = useRef(null);

  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (images.length <= 1 || prefersReduced) return;

    const cycle = () => {
      setFading(true);
      setTimeout(() => {
        setCurrent((c) => (c + 1) % images.length);
        setFading(false);
      }, FADE_MS);
    };

    timerRef.current = setInterval(cycle, HOLD_MS + FADE_MS);
    return () => clearInterval(timerRef.current);
  }, [images.length, prefersReduced]);

  if (!images || images.length === 0) return null;

  return (
    <div className="relative w-full overflow-hidden bg-bone">
      <img
        key={current}
        src={images[current]}
        alt={alt}
        className={[
          'w-full object-cover',
          // Reasonable max height — enough impact without eating too much viewport
          'max-h-64 sm:max-h-80 md:max-h-96',
          // Crossfade transition
          'transition-opacity ease-out',
          fading ? 'opacity-0 duration-150' : 'opacity-100 duration-150',
        ].join(' ')}
      />

      {/* Subtle bottom scrim — only for contrast where text might sit */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
        style={{
          background:
            'linear-gradient(to top, rgba(23,24,26,0.3) 0%, transparent 100%)',
        }}
        aria-hidden="true"
      />
    </div>
  );
}
