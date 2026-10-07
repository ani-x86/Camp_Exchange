/**
 * SectionHeader — reusable section title, "See all →" link, and divider line.
 * Section spec §3.5:
 *   - Bold title on the left (same size across all sections)
 *   - "See all →" focusable link on the right with visible focus ring
 *   - Thin clay divider underneath spanning full container width
 *   - mb-4 under the header row
 */

export default function SectionHeader({ title, seeAllHref }) {
  return (
    <div className="mb-4">
      <div className="flex items-baseline justify-between pb-2">
        <h2 className="font-heading text-lg font-bold text-ink tracking-tight">
          {title}
        </h2>
        {seeAllHref && (
          <a
            href={seeAllHref}
            className="font-sans text-sm font-medium text-moss hover:underline focus-visible:outline-2 focus-visible:outline-moss focus-visible:outline-offset-2 rounded-xs"
          >
            See all →
          </a>
        )}
      </div>
      <div className="border-t border-clay" />
    </div>
  );
}
