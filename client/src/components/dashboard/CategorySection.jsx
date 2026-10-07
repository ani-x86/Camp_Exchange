import ProductCard from './ProductCard';
import SectionHeader from './SectionHeader';

/**
 * CategorySection — one category section on the CampX dashboard.
 *
 * Spec §3.2, §3.5, §4:
 *  - Responsive CSS grid with items-stretch:
 *      >= 1024px: 4 columns
 *      768px - 1023px: 3 columns
 *      < 768px: 2 columns
 *  - Cards in a row share identical height.
 *  - Shows up to 4 items on the dashboard (remainder accessible via "See all →").
 *  - Completely hidden if products array is empty.
 *  - Uses SectionHeader with title, "See all →", and full-width container divider.
 */
export default function CategorySection({ name, products = [], seeAllHref }) {
  if (!products || products.length === 0) {
    return null;
  }

  // Cap at 4 items on the dashboard as specified in §3.7
  const displayProducts = products.slice(0, 4);

  return (
    <section className="py-8">
      <SectionHeader title={name} seeAllHref={seeAllHref} />

      <div
        className="
          grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4
          gap-4 lg:gap-5 items-stretch
        "
      >
        {displayProducts.map((product) => (
          <ProductCard
            key={product.id || product._id || product.title}
            product={product}
          />
        ))}
      </div>
    </section>
  );
}
