import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SearchBar from '../search/SearchBar';
import { PAGE_CONTAINER_CLASS } from '../common/PageContainer';

/**
 * NavIcon — individual toolbar icon button with design.md §5 nav-icon spec:
 *   - At least 40 × 40 px hit area (spec §4).
 *   - Hover: icon tilts -6°, label fades in beneath, 120ms.
 *   - Accessible aria-label.
 *   - Keyboard focus-visible ring.
 */
function NavIcon({ icon, label, onClick, badge, badgePulse, 'aria-label': ariaLabel }) {
  const [bouncing, setBouncing] = useState(false);

  useEffect(() => {
    if (badgePulse) {
      setBouncing(true);
      const t = setTimeout(() => setBouncing(false), 300);
      return () => clearTimeout(t);
    }
  }, [badgePulse]);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel || label}
      className="
        group relative flex min-h-[40px] min-w-[40px] flex-col items-center justify-center p-2
        cursor-pointer rounded-sm
        focus-visible:outline-2 focus-visible:outline-moss focus-visible:outline-offset-2
      "
    >
      {/* Icon — tilts -6° on hover, 120ms */}
      <span
        className="
          relative block text-ink
          transition-transform duration-120 ease-out
          group-hover:-rotate-6
        "
      >
        {icon}

        {/* Badge */}
        {badge != null && badge > 0 && (
          <span
            className={[
              'absolute -top-1.5 -right-1.5',
              'flex h-4 w-4 items-center justify-center',
              'rounded-full bg-marigold',
              'font-mono text-[9px] font-medium text-ink',
              bouncing ? 'animate-[cart-badge-bounce_300ms_ease-out]' : '',
            ].join(' ')}
          >
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>

      {/* Label — fades in on hover, 120ms */}
      <span
        className="
          block text-[10px] font-sans text-ink/70
          opacity-0 transition-opacity duration-120 ease-out
          group-hover:opacity-100
          select-none
        "
      >
        {label}
      </span>
    </button>
  );
}

/**
 * Toolbar — sticky flat bar with hairline Clay bottom border.
 * Aligned to the shared PageContainer so logo and icons line up with the grid.
 */
export default function Toolbar({
  cartCount = 0,
  cartAdded = false,
  user = null,
  onSearch,
  onCart,
  onProfile,
  onHelp,
}) {
  const navigate = useNavigate();

  const handleProfileClick = () => {
    if (onProfile) {
      onProfile();
    } else {
      navigate('/profile');
    }
  };

  const handleCartClick = () => {
    if (onCart) {
      onCart();
    } else {
      navigate('/cart');
    }
  };

  const handleHelpClick = () => {
    if (onHelp) {
      onHelp();
    } else {
      navigate('/help');
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-clay bg-bone">
      <div className={`${PAGE_CONTAINER_CLASS} flex items-center justify-between py-2`}>
        {/* Wordmark — General Sans Bold */}
        <Link
          to="/dashboard"
          className="font-heading text-xl font-bold text-ink no-underline focus-visible:outline-2 focus-visible:outline-moss focus-visible:outline-offset-2 rounded-xs"
          aria-label="CampX home"
        >
          CampX
        </Link>

        {/* Right-side icons: Search → User → Cart → Help */}
        <nav className="flex items-center gap-1" aria-label="Toolbar actions">
          {/* Search */}
          <SearchBar onSearch={onSearch} />

          {/* User / Profile (Account) */}
          <NavIcon
            label={user?.name ?? 'Profile'}
            aria-label={user?.name ? `${user.name}'s account` : 'Account'}
            onClick={handleProfileClick}
            icon={
              user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="h-5 w-5 rounded-full object-cover"
                />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )
            }
          />

          {/* Cart */}
          <NavIcon
            label="Cart"
            aria-label="Cart"
            onClick={handleCartClick}
            badge={cartCount}
            badgePulse={cartAdded}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            }
          />

          {/* Help */}
          <NavIcon
            label="Help"
            aria-label="Help"
            onClick={handleHelpClick}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            }
          />
        </nav>
      </div>
    </header>
  );
}
