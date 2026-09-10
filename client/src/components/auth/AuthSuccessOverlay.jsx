import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * AuthSuccessOverlay — transient celebratory GIF after successful auth.
 *
 * Timing (design.md "fraction of a second" feel):
 *  1. Overlay + GIF fade in:  150ms
 *  2. GIF plays (hold capped): ~1200ms
 *  3. Fade out:               150ms
 *  4. → onComplete (redirect) fires immediately after
 *  Total added time: ~1500ms max.
 *
 * Resilience:
 *  - prefers-reduced-motion: skip entirely, call onComplete immediately.
 *  - GIF load failure / slow network: 300ms timeout → route anyway.
 *  - The animation is a delight-add, never a gate.
 *
 * Props:
 *  - gifs        (string[])  Array of GIF URLs/paths to pick from randomly
 *  - onComplete  (fn)        Called after animation finishes (triggers redirect)
 *  - active      (bool)      When true, starts the overlay sequence
 */

const FADE_DURATION = 150;   // ms — design.md fade spec
const HOLD_CAP = 1200;       // ms — max visible hold
const LOAD_TIMEOUT = 300;    // ms — don't block redirect on slow GIF

export default function AuthSuccessOverlay({ gifs = [], onComplete, active }) {
  const [phase, setPhase] = useState('idle'); // idle | fade-in | hold | fade-out | done
  const [gifUrl, setGifUrl] = useState(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Check prefers-reduced-motion
  const prefersReducedMotion = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (!active) return;

    // Respect prefers-reduced-motion: skip overlay entirely
    if (prefersReducedMotion()) {
      onCompleteRef.current?.();
      return;
    }

    // Pick a random GIF
    if (!gifs || gifs.length === 0) {
      onCompleteRef.current?.();
      return;
    }

    const randomGif = gifs[Math.floor(Math.random() * gifs.length)];
    let cancelled = false;

    // Preload GIF with a 300ms timeout
    const img = new Image();
    let loadTimeout;

    const startSequence = () => {
      if (cancelled) return;
      setGifUrl(randomGif);
      setPhase('fade-in');

      // After fade-in (150ms), hold for up to 1200ms
      setTimeout(() => {
        if (cancelled) return;
        setPhase('hold');

        setTimeout(() => {
          if (cancelled) return;
          setPhase('fade-out');

          // After fade-out (150ms), signal completion
          setTimeout(() => {
            if (cancelled) return;
            setPhase('done');
            onCompleteRef.current?.();
          }, FADE_DURATION);
        }, HOLD_CAP);
      }, FADE_DURATION);
    };

    img.onload = () => {
      clearTimeout(loadTimeout);
      startSequence();
    };

    img.onerror = () => {
      clearTimeout(loadTimeout);
      if (!cancelled) onCompleteRef.current?.();
    };

    // 300ms timeout — if GIF hasn't loaded, route anyway
    loadTimeout = setTimeout(() => {
      if (!cancelled) {
        // If the image loaded in time, startSequence already ran.
        // If not, just route immediately.
        if (phase === 'idle') {
          onCompleteRef.current?.();
          cancelled = true;
        }
      }
    }, LOAD_TIMEOUT);

    img.src = randomGif;

    return () => {
      cancelled = true;
      clearTimeout(loadTimeout);
    };
  }, [active, gifs, prefersReducedMotion, phase]);

  // Don't render anything when idle or done
  if (phase === 'idle' || phase === 'done' || !gifUrl) return null;

  const animClass =
    phase === 'fade-in' || phase === 'hold'
      ? 'animate-fade-in'
      : 'animate-fade-out';

  return (
    <div
      className={`
        absolute inset-0 z-50
        flex items-center justify-center
        rounded-sm bg-bone/90
        ${animClass}
      `}
      aria-live="polite"
      role="status"
    >
      <img
        src={gifUrl}
        alt="Success!"
        className="max-h-48 max-w-48 rounded-sm object-contain"
      />
    </div>
  );
}
