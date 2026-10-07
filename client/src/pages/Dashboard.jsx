import { useMemo, useState } from 'react';
import Toolbar from '../components/dashboard/Toolbar';
import Banner from '../components/dashboard/Banner';
import CategorySection from '../components/dashboard/CategorySection';
import { PAGE_CONTAINER_CLASS } from '../components/common/PageContainer';
import { useGetProductsQuery } from '../redux/productsApi';

import bannerImg from '../assets/banner/Campxchange-home-banner.png';

/**
 * Category display order and labels.
 * Matches canonical database enum (§3.7):
 *   books | electronics | lab-equipment | stationery | furniture | clothing | sports | other
 */
export const CATEGORIES = [
  { key: 'books',         label: 'Books' },
  { key: 'electronics',   label: 'Electronics' },
  { key: 'lab-equipment', label: 'Lab Equipment' },
  { key: 'stationery',    label: 'Stationery' },
  { key: 'furniture',     label: 'Furniture' },
  { key: 'clothing',      label: 'Clothing' },
  { key: 'sports',        label: 'Sports' },
  { key: 'other',         label: 'Other' },
];

const BANNER_IMAGES = [bannerImg];

/**
 * Dashboard — CampusXchange home page.
 *
 * Visual & alignment spec:
 *  - Shared PAGE_CONTAINER_CLASS (max-w-[1280px] px-4 md:px-6 xl:px-8) across
 *    header, banner, and all product sections.
 *  - Categorized grids capped at 4 items each, empty categories hidden.
 *  - Items-stretch CSS grid layout for uniform row heights.
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
        p.title?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }, [products, searchQuery]);

  // Group products by canonical category key, client-side
  const byCategory = useMemo(() => {
    const map = {};
    CATEGORIES.forEach(({ key }) => { map[key] = []; });
    filteredProducts.forEach((p) => {
      // Map potential legacy aliases
      let cat = p.category;
      if (cat === 'clothes') cat = 'clothing';

      if (map[cat] !== undefined) {
        map[cat].push(p);
      } else {
        map['other'].push(p);
      }
    });
    return map;
  }, [filteredProducts]);

  const currentUser = useMemo(() => {
    const name = localStorage.getItem('userName');
    const avatarUrl = localStorage.getItem('userPhoto');
    return name ? { name, avatarUrl } : null;
  }, []);

  return (
    <div className="min-h-screen bg-bone font-sans text-ink">
      {/* ── Toolbar ── */}
      <Toolbar
        cartCount={0}
        cartAdded={false}
        user={currentUser}
        onSearch={(q) => setSearchQuery(q)}
      />

      {/* ── Banner ── */}
      <Banner images={BANNER_IMAGES} alt="CampX — campus thrift board" />

      {/* ── Active Search Filter Bar ── */}
      {searchQuery && (
        <div className={`${PAGE_CONTAINER_CLASS} pt-4`}>
          <div className="flex items-center justify-between border-b border-clay pb-2">
            <p className="font-sans text-xs text-ink/70">
              Showing listings matching <span className="font-medium text-ink">"{searchQuery}"</span>
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="font-sans text-xs text-moss hover:underline cursor-pointer focus-visible:outline-2 focus-visible:outline-moss focus-visible:outline-offset-2 rounded-xs"
            >
              Clear search
            </button>
          </div>
        </div>
      )}

      {/* ── Product Sections ── */}
      <main className={PAGE_CONTAINER_CLASS}>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="py-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="mb-8">
                {/* Section header skeleton */}
                <div className="mb-4 h-6 w-36 rounded-xs bg-clay/30 animate-pulse" />
                <div className="mb-4 border-t border-clay" />
                {/* 4-column card grid skeleton */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5">
                  {[...Array(4)].map((_, j) => (
                    <div
                      key={j}
                      className="flex flex-col rounded-sm border border-clay bg-bone overflow-hidden animate-pulse"
                    >
                      <div className="aspect-[4/3] w-full bg-clay/30" />
                      <div className="p-3 flex flex-col flex-1">
                        <div className="h-4 w-3/4 bg-clay/30 rounded-xs mb-2" />
                        <div className="h-3 w-full bg-clay/20 rounded-xs mb-1" />
                        <div className="h-3 w-1/2 bg-clay/20 rounded-xs mt-auto pt-2" />
                      </div>
                    </div>
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
              className="mt-3 font-sans text-sm font-medium text-moss hover:underline cursor-pointer focus-visible:outline-2 focus-visible:outline-moss focus-visible:outline-offset-2 rounded-xs"
            >
              Try again
            </button>
          </div>
        )}

        {/* Category sections — empty ones return null in CategorySection */}
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
