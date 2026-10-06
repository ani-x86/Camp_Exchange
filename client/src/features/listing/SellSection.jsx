import { Link } from 'react-router-dom';

/**
 * SellSection — "Sell on CampX" entry block shown on the /profile page.
 * listing.md §1.1
 *
 * Placed between Bio and Save changes on the ProfileCard.
 */
export default function SellSection() {
  return (
    <section
      aria-labelledby="sell-section-heading"
      className="rounded-sm border border-clay bg-bone px-4 py-3.5"
    >
      {/* Row: heading + button */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id="sell-section-heading" className="text-sm font-semibold text-ink">
            Sell on CampX
          </h2>
          <p className="mt-0.5 text-xs text-ink/50">
            List a book, gadget or lab item
          </p>
        </div>

        <Link
          to="/profile/add-item"
          className="
            shrink-0 rounded-sm border border-clay bg-bone px-3 py-1.5
            text-xs font-medium text-ink
            transition-colors duration-150
            hover:border-moss hover:text-moss
            active:scale-[0.97] active:duration-100
            focus-visible:outline-2 focus-visible:outline-moss focus-visible:outline-offset-2
          "
        >
          + Add item
        </Link>
      </div>
    </section>
  );
}
