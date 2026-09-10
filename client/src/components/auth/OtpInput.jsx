import { useState, useRef, useEffect } from 'react';

/**
 * OtpInput — 6-digit OTP verification input following design.md §5.
 *
 * Each digit gets its own box rendered in IBM Plex Mono (design.md §2:
 * "Data looks like data — OTP is a literal value").
 *
 * Focus:  border Clay → Moss over 120ms, no glow/shadow.
 * Error:  border → Rust + horizontal shake (±4px, 200ms).
 *
 * Props:
 *  - length      (number)   Number of digits (default 6)
 *  - value       (string)   Controlled OTP string
 *  - onChange    (fn)        Called with updated OTP string
 *  - error       (string?)  Error message — triggers Rust border + shake
 *  - disabled    (bool?)    Disable all inputs during verification
 */
export default function OtpInput({
  length = 6,
  value = '',
  onChange,
  error,
  disabled = false,
}) {
  const inputRefs = useRef([]);
  const [shaking, setShaking] = useState(false);
  const prevErrorRef = useRef(null);

  // Trigger shake when error changes to a new truthy value
  useEffect(() => {
    if (error && error !== prevErrorRef.current) {
      setShaking(true);
    }
    prevErrorRef.current = error;
  }, [error]);

  const handleAnimationEnd = () => {
    setShaking(false);
  };

  const digits = value.split('').concat(Array(length).fill('')).slice(0, length);

  const focusInput = (index) => {
    if (inputRefs.current[index]) {
      inputRefs.current[index].focus();
    }
  };

  const handleChange = (e, index) => {
    const char = e.target.value.slice(-1); // Take only the last typed character
    if (char && !/^\d$/.test(char)) return; // Only digits allowed

    const newDigits = [...digits];
    newDigits[index] = char;
    const newValue = newDigits.join('');
    onChange(newValue);

    // Auto-advance to next input on digit entry
    if (char && index < length - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // If current box is empty, move back and clear that one
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        onChange(newDigits.join(''));
        focusInput(index - 1);
        e.preventDefault();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      focusInput(index - 1);
      e.preventDefault();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      focusInput(index + 1);
      e.preventDefault();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pasted) {
      onChange(pasted);
      // Focus the next empty slot, or the last one
      focusInput(Math.min(pasted.length, length - 1));
    }
  };

  return (
    <div>
      <div
        className={`flex justify-center gap-2 ${shaking ? 'animate-field-shake' : ''}`}
        onAnimationEnd={handleAnimationEnd}
      >
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => (inputRefs.current[i] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(e, i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            onPaste={i === 0 ? handlePaste : undefined}
            disabled={disabled}
            aria-label={`Digit ${i + 1} of ${length}`}
            className={[
              'h-12 w-10 rounded-sm border text-center',
              'font-mono text-lg text-ink bg-bone',
              'transition-[border-color] duration-120 ease-out',
              error ? 'border-rust' : 'border-clay focus:border-moss',
              disabled ? 'opacity-50 cursor-not-allowed' : '',
            ].join(' ')}
          />
        ))}
      </div>

      {error && (
        <p className="mt-2 text-center text-xs text-rust" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
