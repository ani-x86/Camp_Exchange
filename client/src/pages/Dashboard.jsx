import { useMemo, useState } from 'react';
import Toolbar from '../components/dashboard/Toolbar';
import Banner from '../components/dashboard/Banner';
import CategorySection from '../components/dashboard/CategorySection';
import { useGetProductsQuery } from '../redux/productsApi';

// Bundled banner image — imported via Vite (no Windows absolute paths)
import bannerImg from '../assets/banner/Campxchange-home-banner.png';

/**
 * Category display order and labels.
 *
 * ⚠ NOTE: 'clothes' is NOT in the backend enum (books|electronics|furniture|stationery|other).
 * It is included here for UI purposes. When the backend enum is updated to include 'clothes',
 * no component changes are needed — only this array needs the new key.
 * Until then, clothes products from the API will surface under 'other'.
 */
const CATEGORIES = [
  { key: 'books',       label: 'Books' },
  { key: 'electronics', label: 'Electronics' },
  { key: 'clothes',     label: 'Clothes' },   // ⚠ enum mismatch — see note above
  { key: 'furniture',   label: 'Furniture' },
  { key: 'stationery',  label: 'Stationery' },
  { key: 'other',       label: 'Other' },
];

const BANNER_IMAGES = [bannerImg];

/**
 * Dashboard — CampusXchange home page.
 *
 * Composes: Toolbar → Banner → CategorySection × N
 *
 * Data: one useGetProductsQuery() call, grouped client-side by category.
 * Phase 2 swap: the mock queryFn in productsApi.js is replaced with a
 * real API call — this component needs zero changes.
 */
export default function Dashboard() {
  const { data: products = [], isLoading, isError, refetch } = useGetProductsQuery();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter products by search query if active
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }, [products, searchQuery]);

  // Group products by category key, client-side
  const byCategory = useMemo(() => {
    const map = {};
    CATEGORIES.forEach(({ key }) => { map[key] = []; });
    filteredProducts.forEach((p) => {
      if (map[p.category] !== undefined) {
        map[p.category].push(p);
      } else {
        // Unknown category falls into 'other'
        map['other'].push(p);
      }
    });
    return map;
  }, [filteredProducts]);

  return (
    <div className="min-h-screen bg-bone font-sans text-ink">
      {/* ── Toolbar ── */}
      <Toolbar
        cartCount={0}      // wire from Redux cartSlice in Phase 3
        cartAdded={false}  // wire from cart action dispatch in Phase 3
        user={null}        // wire from Redux authSlice in Phase 1 backend
        onSearch={(q) => setSearchQuery(q)}
      />

      {/* ── Banner ── */}
      <Banner images={BANNER_IMAGES} alt="CampusXchange — campus thrift board" />

      {/* ── Active Search Filter Bar ── */}
      {searchQuery && (
        <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
          <div className="flex items-center justify-between border-b border-clay pb-2">
            <p className="font-sans text-xs text-ink/70">
              Showing listings matching <span className="font-medium text-ink">"{searchQuery}"</span>
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="font-sans text-xs text-moss hover:underline cursor-pointer"
            >
              Clear search
            </button>
          </div>
        </div>
      )}

      {/* ── Product grid ── */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6">

        {/* Loading skeleton */}
        {isLoading && (
          <div className="py-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="mb-8">
                {/* Section header skeleton */}
                <div className="mb-4 h-5 w-32 rounded-sm bg-clay/40 animate-pulse" />
                <div className="mb-4 border-t border-clay" />
                {/* Card row skeletons */}
                <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
                  {[...Array(4)].map((_, j) => (
                    <div
                      key={j}
                      className="mb-4 break-inside-avoid rounded-sm border border-clay bg-clay/20 animate-pulse"
                      style={{ height: `${140 + (j % 3) * 30}px` }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {isError && !isLoading && (
          <div className="py-12 text-center">
            <p className="font-sans text-sm text-ink/60">
              Couldn&apos;t load listings right now.
            </p>
            <button
              type="button"
              onClick={refetch}
              className="mt-3 font-sans text-sm font-medium text-moss hover:underline cursor-pointer"
            >
              Try again
            </button>
          </div>
        )}

        {/* Category sections */}
        {!isLoading && !isError &&
          CATEGORIES.map(({ key, label }) => (
            <CategorySection
              key={key}
              name={label}
              products={byCategory[key] ?? []}
              seeAllHref={`/browse?category=${key}`}
            />
          ))
        }
      </main>
    </div>
  );
}
