/**
 * GoogleAuthButton — "Continue with Google" OAuth trigger.
 *
 * Visual spec:
 *  - Outlined: Clay border, Ink text, no gradient, no drop shadow.
 *  - Hover: border shifts Clay → Moss over 120ms (same as form-field
 *    focus transition in design.md §5).
 *  - Press: scale 0.97 over 100ms.
 *  - Small Google "G" SVG icon left-aligned.
 *
 * Does NOT implement the OAuth flow itself — calls `onClick` which
 * should be wired to a handleGoogleAuth() stub from the parent page.
 */
export default function GoogleAuthButton({
  onClick,
  loading = false,
  disabled = false,
  text = 'Continue with Google',
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={loading}
      className={`
        flex w-full items-center justify-center gap-3
        rounded-sm border border-clay bg-bone
        px-4 py-2.5
        font-sans text-sm font-medium text-ink
        transition-[border-color,transform,opacity] duration-120 ease-out
        ${
          isDisabled
            ? 'cursor-not-allowed opacity-65'
            : 'hover:border-moss active:scale-[0.97] active:duration-100 cursor-pointer'
        }
      `}
    >
      {loading ? (
        <svg
          className="h-4.5 w-4.5 animate-spin text-moss"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        /* Google "G" — flat, multi-color inline SVG */
        <svg
          width="18"
          height="18"
          viewBox="0 0 48 48"
          aria-hidden="true"
          className="shrink-0"
        >
          <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
          />
          <path
            fill="#FBBC05"
            d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.04 24.04 0 0 0 0 21.56l7.98-6.19z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
          />
          <path fill="none" d="M0 0h48v48H0z" />
        </svg>
      )}

      <span>{loading ? 'Connecting with Google…' : text}</span>
    </button>
  );
}
