import { useState, useRef, useEffect } from 'react';

/**
 * ProfileField — reusable profile row for both read-only and editable fields.
 *
 * Requirements:
 *  - Read-only: rendered as plain label/value text — NOT disabled inputs (which
 *    wrongly imply "editable later").
 *  - PRN uses monospace (IBM Plex Mono) per design.md §2.
 *  - Editable fields (email, mobile): show label + value with an "Edit" button.
 *    Clicking "Edit" toggles an inline input with Save/Cancel.
 *  - Focus spec (design.md §5): Clay → Moss border over 120ms, no glow/shadow.
 *  - Error spec (design.md §5): Rust border + horizontal shake (±4px, 200ms).
 *
 * Props:
 *  - label         (string)   Field display label
 *  - value         (string)   Current value
 *  - isEditable    (bool)     Whether this field has an Edit affordance
 *  - isLocked      (bool)     Shows subtle locked indicator for campus-verified records
 *  - isMono        (bool)     Use IBM Plex Mono for literal data (PRN)
 *  - type          (string)   'text' | 'email' | 'tel'
 *  - placeholder   (string?)  Placeholder when editing
 *  - onChange      (fn)       Called when value is saved: (newValue) => void
 *  - validate      (fn?)      (val) => errorMessage | null
 *  - notice        (string?)  Informational note displayed when editing (e.g. email OTP)
 */
export default function ProfileField({
  label,
  value = '',
  isEditable = false,
  isLocked = false,
  isMono = false,
  type = 'text',
  placeholder = '',
  onChange,
  validate,
  notice,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(value);
  const [error, setError] = useState('');
  const [hasShaken, setHasShaken] = useState(false);
  const inputRef = useRef(null);

  // Sync draftValue if external value updates
  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  // Focus input on edit mode open
  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setDraftValue(value);
    setError('');
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDraftValue(value);
    setError('');
    setIsEditing(false);
  };

  const handleSave = () => {
    if (validate) {
      const err = validate(draftValue);
      if (err) {
        setError(err);
        setHasShaken(true);
        const timer = setTimeout(() => setHasShaken(false), 200);
        return () => clearTimeout(timer);
      }
    }

    setError('');
    setIsEditing(false);
    onChange?.(draftValue);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  return (
    <div className="border-b border-clay/60 py-2.5 last:border-b-0">
      {/* Horizontal label and value row */}
      {!isEditing ? (
        <div className="flex items-center justify-between gap-3">
          <span className="font-sans text-xs font-medium text-ink/60 shrink-0">
            {label}
          </span>

          <div className="flex items-center gap-2 text-right truncate">
            <span
              className={`
                text-sm text-ink truncate
                ${isMono ? 'font-mono' : 'font-sans'}
                ${!value ? 'text-ink/40 italic' : ''}
              `}
            >
              {value || 'Not provided'}
            </span>

            {isLocked && !isEditable && (
              <span
                className="flex items-center gap-0.5 text-[10px] text-ink/40 select-none shrink-0"
                title="Locked campus record"
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>locked</span>
              </span>
            )}

            {isEditable && (
              <button
                type="button"
                onClick={handleStartEdit}
                className="font-sans text-xs font-medium text-moss hover:underline cursor-pointer ml-1 shrink-0"
                aria-label={`Edit ${label}`}
              >
                Edit
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-1.5 space-y-2">
          {/* Input field — follows design.md §5 focus & error motion */}
          <div className={hasShaken ? 'animate-field-shake' : ''}>
            <input
              ref={inputRef}
              type={type}
              value={draftValue}
              onChange={(e) => {
                setDraftValue(e.target.value);
                if (error) setError('');
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={`
                w-full rounded-sm border bg-bone px-3 py-1.5
                font-sans text-sm text-ink placeholder:text-ink/30
                outline-none transition-colors duration-120 ease-out
                ${
                  error
                    ? 'border-rust'
                    : 'border-clay focus:border-moss'
                }
              `}
            />
          </div>

          {/* Validation Error Message */}
          {error && (
            <p className="font-sans text-xs text-rust" role="alert">
              {error}
            </p>
          )}

          {/* Notice (e.g. Email re-verification warning) */}
          {notice && (
            <div className="flex items-start gap-1.5 rounded-sm bg-marigold/10 p-2 border border-marigold/30">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mt-0.5 shrink-0 text-ink/70"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="font-sans text-[11px] leading-tight text-ink/75">
                {notice}
              </p>
            </div>
          )}

          {/* Action buttons (Save / Cancel) */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={handleCancel}
              className="font-sans text-xs text-ink/60 hover:text-ink cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="
                rounded-sm bg-moss px-2.5 py-1
                font-sans text-xs font-medium text-bone
                transition-colors duration-120 hover:bg-moss-hover
                active:scale-[0.97] cursor-pointer
              "
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
