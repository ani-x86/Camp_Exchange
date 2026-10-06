import { CATEGORIES, CONDITIONS } from './types';
import {
  validateTitle,
  validateCategory,
  validatePrice,
  validateDescription,
} from './validators';

/**
 * FieldWrapper — label + input + counter + error.
 */
function FieldWrapper({ id, label, error, counter, children }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-xs font-medium text-ink/60">
        {label}
      </label>
      {children}
      <div className="flex items-center justify-between">
        <div aria-live="polite" id={`${id}-error`} className="min-h-[1rem]">
          {error && (
            <p className="text-xs text-rust">{error}</p>
          )}
        </div>
        {counter && (
          <p className="text-xs text-ink/40 tabular-nums font-mono" aria-live="polite">
            {counter}
          </p>
        )}
      </div>
    </div>
  );
}

const inputBase =
  'w-full rounded-sm border bg-bone px-3 py-2 text-sm text-ink placeholder-ink/30 transition-colors duration-120 focus:border-moss focus:outline-none';
const inputDefault = 'border-clay';
const inputError = 'border-rust animate-[field-shake_200ms_ease-in-out]';

/**
 * ItemInfoFields — title, category, price, description, condition.
 * listing.md §4
 */
export default function ItemInfoFields({
  title, setTitle,
  category, setCategory,
  price, setPrice,
  description, setDescription,
  condition, setCondition,
  errors, setError, clearError,
}) {
  const handleTitleBlur = () => {
    const err = validateTitle(title);
    setError('title', err);
  };

  const handleCategoryBlur = () => {
    const err = validateCategory(category);
    setError('category', err);
  };

  const handlePriceBlur = () => {
    const err = validatePrice(price);
    setError('price', err);
  };

  const handleDescriptionBlur = () => {
    const err = validateDescription(description);
    setError('description', err);
  };

  // Block e, +, -, . in price input
  const blockPriceKeys = (e) => {
    if (['e', 'E', '+', '-', '.'].includes(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <section aria-labelledby="item-info-heading" className="space-y-4">
      <h2 id="item-info-heading" className="text-xs font-medium text-ink/50 uppercase tracking-wide">
        Item information
      </h2>

      {/* Title */}
      <FieldWrapper
        id="item-title"
        label="Item title"
        error={errors.title}
        counter={`${title.length}/80`}
      >
        <input
          id="item-title"
          type="text"
          value={title}
          maxLength={80}
          placeholder="e.g. VLSI Design textbook, 3rd edition"
          aria-describedby="item-title-error"
          aria-invalid={!!errors.title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (errors.title) clearError('title');
          }}
          onBlur={handleTitleBlur}
          className={`${inputBase} ${errors.title ? inputError : inputDefault}`}
        />
      </FieldWrapper>

      {/* Category */}
      <FieldWrapper id="item-category" label="Category" error={errors.category}>
        <select
          id="item-category"
          value={category}
          aria-describedby="item-category-error"
          aria-invalid={!!errors.category}
          onChange={(e) => {
            setCategory(e.target.value);
            if (errors.category) clearError('category');
          }}
          onBlur={handleCategoryBlur}
          className={`${inputBase} ${errors.category ? inputError : inputDefault} cursor-pointer`}
        >
          <option value="">Select a category…</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </FieldWrapper>

      {/* Price */}
      <FieldWrapper id="item-price" label="Price" error={errors.price}>
        <div className="relative">
          <span
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-mono text-sm text-ink/50"
            aria-hidden="true"
          >
            ₹
          </span>
          <input
            id="item-price"
            type="number"
            min="1"
            max="100000"
            step="1"
            value={price}
            placeholder="450"
            aria-describedby="item-price-error"
            aria-invalid={!!errors.price}
            onKeyDown={blockPriceKeys}
            onChange={(e) => {
              setPrice(e.target.value);
              if (errors.price) clearError('price');
            }}
            onBlur={handlePriceBlur}
            className={`${inputBase} pl-7 font-mono ${errors.price ? inputError : inputDefault}`}
          />
        </div>
      </FieldWrapper>

      {/* Description */}
      <FieldWrapper
        id="item-description"
        label="Description"
        error={errors.description}
        counter={`${description.length}/500`}
      >
        <textarea
          id="item-description"
          rows={4}
          maxLength={500}
          value={description}
          placeholder="Describe the item's condition, edition, what's included…"
          aria-describedby="item-description-error"
          aria-invalid={!!errors.description}
          onChange={(e) => {
            setDescription(e.target.value);
            if (errors.description) clearError('description');
          }}
          onBlur={handleDescriptionBlur}
          className={`${inputBase} resize-none leading-relaxed ${errors.description ? inputError : inputDefault}`}
        />
      </FieldWrapper>

      {/* Condition (optional) */}
      <FieldWrapper id="item-condition" label="Condition (optional)" error={null}>
        <select
          id="item-condition"
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          className={`${inputBase} ${inputDefault} cursor-pointer`}
        >
          <option value="">Not specified</option>
          {CONDITIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </FieldWrapper>
    </section>
  );
}
