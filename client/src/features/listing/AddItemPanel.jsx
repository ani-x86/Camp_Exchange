import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useListingDraft } from './useListingDraft';
import PhotoUploader from './PhotoUploader';
import ItemInfoFields from './ItemInfoFields';
import SellerInfoRows from './SellerInfoRows';
import PreviewModal from './PreviewModal';
import PublishSuccess from './PublishSuccess';
import { createListing } from './createListing';
import {
  validateTitle,
  validateCategory,
  validatePrice,
  validateDescription,
} from './validators';

/**
 * AddItemPanel — full Add Item form rendered inside the Profile card shell.
 * listing.md §2–§9
 *
 * @param {object} seller - { name, verified, campus }
 */
export default function AddItemPanel({ seller }) {
  const navigate = useNavigate();
  const draft = useListingDraft();
  const previewBtnRef = useRef(null);

  const [showPreview, setShowPreview] = useState(false);
  const [publishState, setPublishState] = useState('idle'); // idle | publishing | success | error
  const [publishError, setPublishError] = useState(null);
  const [publishedListing, setPublishedListing] = useState(null);

  // ── Derived state ──────────────────────────────────────────────────
  const primaryImage = draft.images.find((img) => img.isPrimary) || null;
  const canPreview = !!primaryImage && !!draft.title.trim();

  const formValid =
    !validateTitle(draft.title) &&
    !validateCategory(draft.category) &&
    !validatePrice(draft.price) &&
    !validateDescription(draft.description) &&
    primaryImage;

  const canPublish = formValid && seller.verified;

  // ── Validate all fields before publish attempt ─────────────────────
  function runFullValidation() {
    const errs = {
      title: validateTitle(draft.title),
      category: validateCategory(draft.category),
      price: validatePrice(draft.price),
      description: validateDescription(draft.description),
    };
    Object.entries(errs).forEach(([k, v]) => draft.setError(k, v));
    if (!primaryImage) {
      draft.setImageError('Add a primary photo to continue.');
    }
    return !Object.values(errs).some(Boolean) && !!primaryImage;
  }

  // ── Publish ───────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!runFullValidation()) return;
    if (!seller.verified) return;

    setPublishState('publishing');
    setPublishError(null);

    try {
      const listing = await createListing(draft.draft, seller);
      setPublishedListing(listing);
      setPublishState('success');
    } catch (err) {
      setPublishError(err.message || 'Something went wrong. Try again.');
      setPublishState('error');
    }
  };

  // ── Reset for "Add another" ───────────────────────────────────────
  const handleAddAnother = () => {
    setPublishedListing(null);
    setPublishState('idle');
    setPublishError(null);
  };

  // ── Success state ─────────────────────────────────────────────────
  if (publishState === 'success' && publishedListing) {
    return <PublishSuccess listing={publishedListing} onAddAnother={handleAddAnother} />;
  }

  return (
    <>
      {/* Panel Header */}
      <div className="mb-5 border-b border-clay pb-4">
        <h1 className="font-heading text-xl font-bold text-ink">Add item</h1>
        <p className="mt-0.5 text-xs text-ink/50">Photos and details buyers will see.</p>
      </div>

      <form
        noValidate
        onSubmit={(e) => { e.preventDefault(); handlePublish(); }}
        className="space-y-6"
      >
        {/* ── Section A: Photos ─────────────────────────── */}
        <PhotoUploader
          images={draft.images}
          imageError={draft.imageError}
          onAdd={draft.addImages}
          onRemove={draft.removeImage}
          onMakePrimary={draft.makePrimary}
        />

        <div className="border-t border-clay" />

        {/* ── Section B: Item Info ──────────────────────── */}
        <ItemInfoFields
          title={draft.title} setTitle={draft.setTitle}
          category={draft.category} setCategory={draft.setCategory}
          price={draft.price} setPrice={draft.setPrice}
          description={draft.description} setDescription={draft.setDescription}
          condition={draft.condition} setCondition={draft.setCondition}
          errors={draft.errors}
          setError={draft.setError}
          clearError={draft.clearError}
        />

        <div className="border-t border-clay" />

        {/* ── Section C: Seller Info ────────────────────── */}
        <SellerInfoRows seller={seller} />

        <div className="border-t border-clay" />

        {/* ── Section D: Actions ───────────────────────── */}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          {/* Preview */}
          <button
            ref={previewBtnRef}
            type="button"
            disabled={!canPreview}
            aria-disabled={!canPreview}
            onClick={() => setShowPreview(true)}
            className={`
              flex-1 rounded-sm border px-4 py-2.5 text-sm font-medium transition-colors
              ${canPreview
                ? 'border-clay text-ink hover:border-moss hover:text-moss active:scale-[0.97]'
                : 'cursor-not-allowed border-clay bg-clay/20 text-ink/30'
              }
            `}
          >
            Preview listing
          </button>

          {/* Publish */}
          <button
            type="submit"
            disabled={publishState === 'publishing' || !canPublish}
            aria-disabled={publishState === 'publishing' || !canPublish}
            className={`
              group relative flex-1 rounded-sm px-4 py-2.5 text-sm font-medium
              transition-[background-color,transform] duration-150 ease-out
              ${publishState === 'publishing' || !canPublish
                ? 'cursor-not-allowed border border-clay bg-clay text-ink/40'
                : 'cursor-pointer bg-moss text-bone hover:bg-moss-hover active:scale-[0.97]'
              }
            `}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {publishState === 'publishing' && (
                <svg
                  className="h-4 w-4 animate-spin text-bone/70"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              )}
              {publishState === 'publishing' ? 'Publishing…' : 'Publish item'}
            </span>

            {/* Underline accent — design.md §5 */}
            {canPublish && publishState !== 'publishing' && (
              <span
                className="absolute bottom-2 left-1/2 h-px w-3/5 -translate-x-1/2 scale-x-0 bg-bone/50 transition-transform duration-150 ease-out group-hover:scale-x-100"
                aria-hidden="true"
              />
            )}
          </button>
        </div>

        {/* Publish error message */}
        {publishState === 'error' && publishError && (
          <p role="alert" className="text-xs text-rust text-center">
            {publishError}
          </p>
        )}

        {/* Disabled publish explanation */}
        {!seller.verified && (
          <p className="text-center text-xs text-ink/40" aria-live="polite">
            Only verified students can publish listings.
          </p>
        )}
      </form>

      {/* Preview Modal */}
      {showPreview && (
        <PreviewModal
          draft={draft.draft}
          seller={seller}
          triggerRef={previewBtnRef}
          onClose={() => setShowPreview(false)}
          onPublish={() => { setShowPreview(false); handlePublish(); }}
          publishDisabled={!canPublish || publishState === 'publishing'}
        />
      )}
    </>
  );
}
