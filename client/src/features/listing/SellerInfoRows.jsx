/**
 * SellerInfoRows — read-only seller block, auto-filled from profile data.
 * listing.md §5
 */

function LockIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="text-clay"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function SellerRow({ label, value, isMono }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-clay last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-ink/50">{label}</p>
        <p className={`mt-0.5 text-sm text-ink ${isMono ? 'font-mono' : ''} truncate`}>
          {value}
        </p>
      </div>
      <div className="flex items-center gap-1 text-xs text-ink/30">
        <LockIcon />
        <span>auto</span>
      </div>
    </div>
  );
}

export default function SellerInfoRows({ seller }) {
  return (
    <section aria-labelledby="seller-info-heading">
      <h2 id="seller-info-heading" className="mb-1 text-xs font-medium text-ink/50 uppercase tracking-wide">
        Seller information
      </h2>

      <div className="rounded-sm border border-clay bg-bone/50 divide-y divide-clay px-3">
        <SellerRow label="Seller name" value={seller.name} />
        <div className="flex items-center gap-3 py-2.5 border-b border-clay">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-ink/50">Verified status</p>
            {seller.verified ? (
              <div className="mt-0.5 flex items-center gap-1.5 text-sm text-moss font-medium">
                {/* Checkmark */}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Verified Student</span>
              </div>
            ) : (
              <p className="mt-0.5 text-sm text-rust">Not verified</p>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-ink/30">
            <LockIcon />
            <span>auto</span>
          </div>
        </div>
        <SellerRow label="Campus" value={seller.campus} />
      </div>

      {/* Unverified warning */}
      {!seller.verified && (
        <p className="mt-2 text-xs text-ink/50" role="note">
          Only verified students can publish listings. You can still preview your item.
        </p>
      )}
    </section>
  );
}
