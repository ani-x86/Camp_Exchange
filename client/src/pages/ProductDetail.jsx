import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useGetProductByIdQuery } from '../redux/productsApi';
import ChatButton from '../features/chat/ChatButton';
import ChatDrawer from '../features/chat/ChatDrawer';


/**
 * ProductDetail — Single product listing display page for CampusXchange.
 *
 * Rules & Constraints:
 *  - Design system (design.md): Bone background (#F2EFE6), Ink text (#17181A),
 *    Moss (#3F6B3E) for verified signals & primary buttons, Marigold (#E0A72E)
 *    for price tag and tag corner, Clay (#C9C2B2) for dividers/borders.
 *  - Typography: General Sans for titles (font-heading), Inter for body (font-sans),
 *    IBM Plex Mono (font-mono) ONLY for literal data (price, PRN, order codes).
 *  - Motion: Animate only on action (click/hover). Primary button hover underline
 *    grow (150ms), active scale to 0.97 (100ms). Disabled state is flat Clay.
 *  - Gating: Unverified users cannot purchase (Phase 1 auth rule). Sold/Reserved
 *    items disable the Buy button with plain status copy.
 *  - Rule 1: No manual "mark as paid" or manual confirmation path (payments flow
 *    through Razorpay webhook in Phase 3).
 *  - Stretch goal rule: Seller ratings/reviews are omitted entirely.
 */
export function ProductDetail({ user = { isVerified: true } }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: product, isLoading, isError } = useGetProductByIdQuery(id);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [chatConvId, setChatConvId] = useState(null);

  // Auth context — replace with real auth store values when available
  const currentUserId = localStorage.getItem('userId') || null;
  const verificationStatus = localStorage.getItem('verificationStatus') || 'pending';

  // Normalize image sources from schema (Product.images)
  const rawImages = Array.isArray(product?.images) && product.images.length > 0
    ? product.images
    : product?.imageUrl
      ? [product.imageUrl]
      : [];
  const images = rawImages.map((img) => (typeof img === 'object' && img?.url ? img.url : img)).filter(Boolean);

  const isSold = product?.status === 'sold';
  const isReserved = product?.status === 'reserved';
  const isAvailable = product?.status === 'available' || (!isSold && !isReserved);

  // Verification gate: only verified students can buy items
  const isUserVerified = user?.isVerified ?? true;
  const isBuyDisabled = !isAvailable || !isUserVerified;

  let buyButtonLabel = 'Buy Now';
  if (isSold) {
    buyButtonLabel = 'Sold';
  } else if (isReserved) {
    buyButtonLabel = 'Reserved';
  }

  const handleBuyNow = () => {
    if (isBuyDisabled) return;
    // Directs toward cart / checkout flow (Phase 3)
    navigate('/cart');
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen bg-bone font-sans text-ink px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="h-4 w-28 rounded-sm bg-clay/40 animate-pulse mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="aspect-[4/3] rounded-sm bg-clay/30 animate-pulse" />
            <div className="space-y-4">
              <div className="h-4 w-20 bg-clay/40 rounded-sm animate-pulse" />
              <div className="h-8 w-3/4 bg-clay/40 rounded-sm animate-pulse" />
              <div className="h-8 w-28 bg-clay/40 rounded-sm animate-pulse" />
              <div className="h-20 w-full bg-clay/20 rounded-sm animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not found / error state
  if (isError || !product) {
    return (
      <div className="min-h-screen bg-bone font-sans text-ink px-4 py-16 text-center">
        <div className="mx-auto max-w-md border border-clay rounded-sm bg-bone p-8">
          <p className="font-heading text-lg font-semibold text-ink">
            Listing not found
          </p>
          <p className="mt-2 font-sans text-sm text-ink/70">
            This item may have been removed, sold, or the link is incorrect.
          </p>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="mt-6 inline-block rounded-sm bg-moss px-5 py-2.5 font-sans text-sm font-medium text-bone hover:bg-moss-hover cursor-pointer"
          >
            ← Return to browse
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bone font-sans text-ink">
      {/* Top navigation bar */}
      <header className="border-b border-clay bg-bone">
        <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link
            to="/dashboard"
            className="font-sans text-sm text-ink/70 hover:text-ink flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-moss focus-visible:outline-offset-2"
          >
            <span>←</span>
            <span>Back to listings</span>
          </Link>
          <span className="font-mono text-xs text-ink/50">
            ID: {product._id}
          </span>
        </div>
      </header>

      {/* Main product container */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start">
          
          {/* ── 1. Hero Image & Gallery ── */}
          <div className="flex flex-col">
            {/* Primary hero frame — fixed aspect, no layout shift */}
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-sm border border-clay bg-bone">
              {/* Marigold string-tag corner accent */}
              <span
                className="
                  absolute top-0 right-0 z-10
                  h-8 w-8 bg-marigold rounded-bl-xl
                  origin-top-right
                "
                aria-hidden="true"
              />

              {images.length > 0 ? (
                <img
                  key={activeImageIndex}
                  src={images[activeImageIndex]}
                  alt={`${product.title} — view ${activeImageIndex + 1}`}
                  className="h-full w-full object-cover transition-opacity duration-150 ease-out"
                  loading="eager"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-clay/20">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    className="text-clay"
                    aria-hidden="true"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
              )}
            </div>

            {/* Thumbnail selector — rendered only if multiple photos exist */}
            {images.length > 1 && (
              <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
                {images.map((imgUrl, idx) => {
                  const isActive = idx === activeImageIndex;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      aria-label={`View photo ${idx + 1}`}
                      className={`
                        relative h-16 w-16 shrink-0 overflow-hidden rounded-sm border cursor-pointer
                        transition-[opacity,border-color] duration-150 ease-out
                        focus-visible:outline-2 focus-visible:outline-moss focus-visible:outline-offset-2
                        ${
                          isActive
                            ? 'border-moss ring-2 ring-moss'
                            : 'border-clay opacity-70 hover:opacity-100'
                        }
                      `}
                    >
                      <img
                        src={imgUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── 2. Details & Checkout ── */}
          <div className="flex flex-col">
            {/* Category: plain text, not styled as data */}
            <p className="font-sans text-xs uppercase tracking-wider text-ink/60 font-semibold">
              {product.category}
            </p>

            {/* Title: General Sans (font-heading) */}
            <h1 className="mt-1 font-heading text-2xl sm:text-3xl font-bold text-ink leading-tight">
              {product.title}
            </h1>

            {/* Price: IBM Plex Mono, Marigold tag accent */}
            <div className="mt-4 flex items-baseline gap-2">
              <span className="rounded-sm border border-marigold/60 bg-marigold/15 px-3 py-1 font-mono text-2xl sm:text-3xl font-semibold text-ink">
                ₹{Number(product.price).toLocaleString('en-IN')}
              </span>
            </div>

            {/* Seller attribution & trust status */}
            <div className="mt-4 flex items-center gap-2 font-sans text-xs sm:text-sm text-ink/75 border-y border-clay py-3">
              <span>Listed by <strong className="font-medium text-ink">{product.seller || product.sellerId?.name || 'Verified Student'}</strong></span>
              <span className="inline-flex items-center gap-1 font-medium text-moss">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Verified student
              </span>
            </div>

            {/* Description: Inter, capped ~72 chars line length */}
            <div className="mt-5">
              <h2 className="font-heading text-sm font-semibold text-ink">
                About this item
              </h2>
              <p className="mt-2 font-sans text-sm sm:text-base text-ink/80 leading-relaxed max-w-[72ch] whitespace-pre-line">
                {product.description || 'No description provided by the seller.'}
              </p>
            </div>

            {/* ── 4. Checkout / Buy Section ── */}
            <div className="mt-8 border-t border-clay pt-6">
              {/* Action row: [Chat with seller] [Buy Now] — 60/40 split */}
              <div className="flex gap-2">

                {/* Chat with seller — secondary, flex-[2] */}
                <div className="flex-[2] flex flex-col justify-end">
                  <ChatButton
                    listingId={product._id}
                    sellerId={product.sellerId?._id || product.sellerId}
                    currentUserId={currentUserId}
                    verificationStatus={verificationStatus}
                    onOpen={(convId) => setChatConvId(convId)}
                  />
                </div>

                {/* Buy Now — primary, flex-[3] */}
                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={isBuyDisabled}
                  className={`
                    flex-[3] group relative rounded-sm px-4 py-3.5
                    font-sans text-sm font-medium
                    transition-[background-color,transform] duration-150 ease-out
                    focus-visible:outline-2 focus-visible:outline-moss focus-visible:outline-offset-2
                    ${
                      isBuyDisabled
                        ? 'cursor-not-allowed border border-clay bg-clay text-ink/40'
                        : 'cursor-pointer bg-moss text-bone hover:bg-moss-hover active:scale-[0.97] active:duration-100'
                    }
                  `}
                >
                  <span className="relative z-10">{buyButtonLabel}</span>
                  {!isBuyDisabled && (
                    <span
                      className="
                        absolute bottom-2.5 left-1/2 h-px w-2/5
                        -translate-x-1/2 scale-x-0
                        bg-bone/60
                        transition-transform duration-150 ease-out
                        group-hover:scale-x-100
                      "
                      aria-hidden="true"
                    />
                  )}
                </button>
              </div>

              {/* Informative helper note for gating conditions */}
              {!isUserVerified && isAvailable && (
                <p className="mt-2.5 text-center font-sans text-xs text-ink/60">
                  Only verified students can buy items. Complete your ID check in your profile to enable checkout.
                </p>
              )}

              {isSold && (
                <p className="mt-2.5 text-center font-sans text-xs text-ink/60">
                  This item has already been purchased.
                </p>
              )}

              {isReserved && (
                <p className="mt-2.5 text-center font-sans text-xs text-ink/60">
                  This item is currently reserved for pickup.
                </p>
              )}

              {isAvailable && isUserVerified && (
                <p className="mt-3 text-center font-sans text-[11px] text-ink/50 select-none">
                  In-person campus handoff • Razorpay secure payment
                </p>
              )}
            </div>

          </div>
        </div>
      </main>

      {/* Chat drawer — opens when buyer clicks Chat with seller */}
      <ChatDrawer
        conversationId={chatConvId}
        currentUserId={currentUserId}
        isOpen={!!chatConvId}
        onClose={() => setChatConvId(null)}
      />
    </div>
  );
}

export default ProductDetail;
