import { useState, useEffect, useRef } from 'react';
import { PAGE_CONTAINER_CLASS } from '../common/PageContainer';

/**
 * Banner — hero banner below the toolbar.
 *
 * Spec §3.3 & §3.4:
 *  - Sits inside the shared page container (max-w-[1280px] px-4 md:px-6 xl:px-8)
 *    so the college logo and hero text start on the exact same left line as
 *    the toolbar wordmark, section headers, and first product cards.
 *  - Fixed heights: h-[300px] md:h-[340px] xl:h-[380px] so the Books section
 *    peeks above the fold at 1366 × 768.
 *  - Object-cover with object-left/center keeps the college crest crisp and undistorted.
 *  - Subtle bottom scrim prevents gradient from cutting or obscuring the tagline.
 *  - Smooth 150ms crossfade on multi-image cycle, respect prefers-reduced-motion.
 */

const HOLD_MS = 4000;
const FADE_MS = 150;

export default function Banner({ images = [], alt = 'CampX — campus thrift board' }) {
  const [current, setCurrent] = useState(0);
  const [fading, setFading] = useState(false);
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
    <div className="w-full bg-bone border-b border-clay/30 overflow-hidden">
      <div className={PAGE_CONTAINER_CLASS}>
        <div className="relative h-[300px] md:h-[340px] xl:h-[380px] w-full overflow-hidden bg-bone">
          <img
            key={current}
            src={images[current]}
            alt={alt}
            className={[
              'h-full w-full object-cover object-left md:object-center',
              'transition-opacity ease-out',
              fading ? 'opacity-0 duration-150' : 'opacity-100 duration-150',
            ].join(' ')}
          />

          {/* Gentle bottom scrim — subtle gradient that does not cut into tagline */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 md:h-20"
            style={{
              background:
                'linear-gradient(to top, rgba(23,24,26,0.12) 0%, transparent 100%)',
            }}
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}
