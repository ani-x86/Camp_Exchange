import { useState, useEffect, useRef } from 'react';

/**
 * FormField — labeled text input following design.md §5 form-field spec.
 *
 * Focus:  border Clay → Moss over 120ms, no glow/shadow.
 * Error:  border → Rust + one-time horizontal shake (±4px, 200ms).
 *         Error message shown beneath in Rust.
 * Labels: above inputs, Inter font, persistent (no placeholder-only labels).
 * PRN:    rendered in IBM Plex Mono (font-mono) via `mono` prop.
 *
 * Accessibility (design.md §6):
 *  - 2px Moss outline, offset 2px on keyboard focus (handled in index.css :focus-visible).
 *  - Labels linked via htmlFor / id.
 *
 * Props:
 *  - id          (string)   Unique field identifier
 *  - label       (string)   Visible label text
 *  - type        (string)   Input type — "text", "email", "password", etc.
 *  - value       (string)   Controlled value
 *  - onChange     (fn)       Change handler
 *  - error       (string?)  Error message — triggers Rust border + shake
 *  - placeholder (string?)  Secondary hint (never the only label)
 *  - mono        (bool?)    Render value in IBM Plex Mono (for PRN, data fields)
 *  - autoComplete (string?) Autocomplete hint
 *  - required    (bool?)    HTML required attribute
 */
export default function FormField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  mono = false,
  autoComplete,
  required = false,
}) {
  const [shaking, setShaking] = useState(false);
  const prevErrorRef = useRef(null);
  const inputRef = useRef(null);

  // Trigger shake animation when error changes to a new truthy value
  useEffect(() => {
    if (error && error !== prevErrorRef.current) {
      setShaking(true);
    }
    prevErrorRef.current = error;
  }, [error]);

  const handleAnimationEnd = () => {
    setShaking(false);
  };

  return (
    <div className="mb-4">
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-ink"
      >
        {label}
      </label>

      <input
        ref={inputRef}
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        onAnimationEnd={handleAnimationEnd}
        className={[
          'block w-full rounded-sm border px-3 py-2',
          'text-sm text-ink bg-bone',
          'transition-[border-color] duration-120 ease-out',
          'placeholder:text-clay',
          mono ? 'font-mono' : 'font-sans',
          error ? 'border-rust' : 'border-clay focus:border-moss',
          shaking ? 'animate-field-shake' : '',
        ].join(' ')}
      />

      {error && (
        <p className="mt-1 text-xs text-rust" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
