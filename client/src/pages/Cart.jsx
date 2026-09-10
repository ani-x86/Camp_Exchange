import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CartItemRow from '../components/cart/CartItemRow';
import PayoutSummary from '../components/cart/PayoutSummary';
import RecentPurchaseCard from '../components/cart/RecentPurchaseCard';

const INITIAL_CART = [
  {
    id: 'cart-1',
    title: 'Concepts of Physics — HC Verma (Vol 1 & 2)',
    category: 'Books',
    price: 450,
    quantity: 1,
    maxStock: 3,
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'cart-2',
    title: 'Casio fx-991CW ClassWiz Scientific Calculator',
    category: 'Electronics',
    price: 850,
    quantity: 1,
    maxStock: 1, // Single-unit item
    imageUrl: 'https://images.unsplash.com/photo-1611125832047-1d7ad1e8e48f?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'cart-3',
    title: 'Engineering Drafter & Mini T-Square Set',
    category: 'Stationery',
    price: 280,
    quantity: 2,
    maxStock: 4,
    imageUrl: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=300&q=80',
  },
];

const RECENT_PURCHASES = [
  {
    id: 'ord-101',
    title: 'Digital Signal Processing (Proakis)',
    price: 320,
    date: 'Sep 4, 2026',
    orderCode: 'ORD-84920',
    imageUrl: 'https://images.unsplash.com/photo-1532012164546-f432f2e37b73?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'ord-102',
    title: 'Hostel Study Lamp (Rechargeable)',
    price: 190,
    date: 'Aug 28, 2026',
    orderCode: 'ORD-72104',
    imageUrl: 'https://images.unsplash.com/photo-1534972195531-a756b1126f24?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'ord-103',
    title: 'Chemistry Lab Apron (Cotton)',
    price: 140,
    date: 'Aug 19, 2026',
    orderCode: 'ORD-65319',
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80',
  },
];

/**
 * Cart — CampusXchange shopping cart and recent purchases page.
 *
 * Rules:
 *  - Primary active cart + payout summary at top; recent purchases secondary below.
 *  - Prices in IBM Plex Mono (data looks like data).
 *  - Stepper pop on click (150ms spring), subtotal/total updates silently.
 *  - 200ms height collapse removal animation.
 *  - Recent purchases has single simple 180ms fade-in entrance.
 */
export default function Cart() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState(INITIAL_CART);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Total calculation — updates instantly and silently
  const itemsTotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cartItems]);

  const totalItemCount = useMemo(() => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  }, [cartItems]);

  const handleUpdateQuantity = (id, newQty) => {
    setCartItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: newQty } : item))
    );
  };

  const handleRemove = (id) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCheckout = () => {
    // In Phase 3: wire Razorpay Checkout script + POST /api/transactions/order
    alert('Proceeding to Razorpay checkout for campus pickup!');
  };

  return (
    <div className="min-h-screen bg-bone font-sans text-ink">
      {/* ── Top Header ── */}
      <header className="border-b border-clay bg-bone px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-sm font-medium text-ink hover:text-moss transition-colors duration-120"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Back to board</span>
          </Link>

          <Link
            to="/dashboard"
            className="font-heading text-lg font-bold text-ink no-underline"
            aria-label="CampusXchange home"
          >
            CampX
          </Link>
        </div>
      </header>

      {/* ── Main Content Container ── */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex items-baseline justify-between">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-ink">
            Your Cart
          </h1>

          {totalItemCount > 0 && (
            <span className="font-mono text-xs font-medium text-ink/60">
              {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>

        {/* ── Active Cart Section & Payout Layout ── */}
        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left Column: Cart Items List */}
          <div className="lg:col-span-2">
            {cartItems.length > 0 ? (
              <div className="rounded-sm border border-clay bg-bone px-4 sm:px-6 divide-y-0">
                {cartItems.map((item) => (
                  <CartItemRow
                    key={item.id}
                    item={item}
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemove={handleRemove}
                  />
                ))}
              </div>
            ) : (
              /* Empty Cart State */
              <div className="rounded-sm border border-clay bg-bone p-8 text-center">
                <p className="font-sans text-sm text-ink/70">
                  Your cart is empty — browse listings to add something.
                </p>
                <Link
                  to="/dashboard"
                  className="mt-3 inline-block font-sans text-sm font-medium text-moss hover:underline"
                >
                  Browse Campus Board →
                </Link>
              </div>
            )}
          </div>

          {/* Right Column: Payout Summary */}
          <div className="lg:col-span-1">
            <PayoutSummary
              itemsTotal={itemsTotal}
              platformFee={0}
              onCheckout={handleCheckout}
              disabled={cartItems.length === 0}
            />
          </div>
        </div>

        {/* ── Recent Purchases (Secondary Section) ── */}
        <section className="mt-14 border-t border-clay pt-8 animate-[fade-in_180ms_ease-out]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-base font-bold text-ink/70">
              Recent purchases
            </h2>
            <span className="text-xs text-ink/40 font-sans">
              Completed transactions
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {RECENT_PURCHASES.map((purchase) => (
              <RecentPurchaseCard
                key={purchase.id}
                purchase={purchase}
                onClick={(item) => setSelectedReceipt(item)}
              />
            ))}
          </div>
        </section>

        {/* ── Simple Order Receipt Modal (If recent purchase clicked) ── */}
        {selectedReceipt && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          >
            <div className="w-full max-w-sm rounded-sm border border-clay bg-bone p-6">
              <div className="flex items-center justify-between border-b border-clay pb-3">
                <h3 className="font-heading text-sm font-bold text-ink">
                  Purchase Receipt
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedReceipt(null)}
                  className="text-ink/40 hover:text-ink cursor-pointer p-1"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-2 text-xs font-sans">
                <div className="flex justify-between">
                  <span className="text-ink/60">Item:</span>
                  <span className="font-medium text-ink text-right truncate ml-2">
                    {selectedReceipt.title}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink/60">Order Code:</span>
                  <span className="font-mono text-ink">{selectedReceipt.orderCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink/60">Date:</span>
                  <span className="text-ink">{selectedReceipt.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink/60">Amount Paid:</span>
                  <span className="font-mono font-bold text-ink">₹{selectedReceipt.price}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink/60">Status:</span>
                  <span className="text-moss font-medium">Pickup completed</span>
                </div>
              </div>

              <div className="mt-5 border-t border-clay pt-3 text-center">
                <button
                  type="button"
                  onClick={() => setSelectedReceipt(null)}
                  className="rounded-sm border border-clay px-4 py-1.5 text-xs font-medium text-ink hover:bg-clay/20 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
