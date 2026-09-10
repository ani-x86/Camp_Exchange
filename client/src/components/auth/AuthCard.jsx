/**
 * AuthCard — shared layout shell for SignIn and SignUp pages.
 *
 * Visual identity (design.md §3): index-card-style tile with a small
 * Marigold "tag corner" accent echoing the pinboard/corkboard concept.
 * Left-aligned throughout, no drop shadow (paper aesthetic).
 *
 * Props:
 *  - title       (string)   Heading text, rendered in General Sans
 *  - subtitle    (string?)  Optional secondary line beneath heading
 *  - children    (node)     Form content
 *  - footer      (node?)    Link to the alternate auth page
 */
export default function AuthCard({ title, subtitle, children, footer }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bone px-4 py-12 font-sans">
      <div className="relative w-full max-w-md">
        {/* Marigold tag-corner accent — design.md §3 "string tag" */}
        <div
          className="absolute -top-2 -left-2 h-6 w-6 rounded-br-lg bg-marigold"
          aria-hidden="true"
        />

        <div className="rounded-sm border border-clay bg-bone px-6 py-8 sm:px-8">
          {/* Heading — General Sans Bold, left-aligned */}
          <h1 className="font-heading text-2xl font-bold text-ink">
            {title}
          </h1>

          {subtitle && (
            <p className="mt-1 text-sm text-ink/60">{subtitle}</p>
          )}

          <div className="mt-6">{children}</div>

          {footer && (
            <div className="mt-6 text-center text-sm text-ink/60">
              {footer}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
