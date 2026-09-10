import ProductCard from './ProductCard';

/**
 * CategorySection — one repeating section in the pinboard grid.
 *
 * design.md §3: asymmetric card sizing, not forced-uniform tiles.
 * Implemented with CSS `columns` layout (not CSS Grid) so cards
 * flow naturally at different heights — `break-inside-avoid` keeps
 * each card intact.
 *
 * Props:
 *  - name        (string)    Display label, e.g. "Books"
 *  - products    (array)     Product objects for this category
 *  - seeAllHref  (string?)   URL for "See all" link
 */
export default function CategorySection({ name, products = [], seeAllHref }) {
  return (
    <section className="py-6">
      {/* Section header — left-aligned, General Sans Semibold */}
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-heading text-lg font-semibold text-ink">
          {name}
        </h2>
        {seeAllHref && (
          <a
            href={seeAllHref}
            className="font-sans text-sm text-moss hover:underline"
          >
            See all →
          </a>
        )}
      </div>

      {/* Hairline divider */}
      <div className="mb-4 border-t border-clay" />

      {products.length === 0 ? (
        /* Empty state — section always rendered, never hidden */
        <p className="font-sans text-sm text-ink/50">
          No {name.toLowerCase()} listings yet.
        </p>
      ) : (
        /* Pinboard grid — CSS columns for natural asymmetric heights */
        <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
