import { useState, useCallback, useEffect, useRef } from 'react';
import { validateImageFile, validateImageCount } from './validators';

/**
 * useListingDraft — all listing form state, image management, and validation.
 * listing.md §8 useListingDraft hook
 */
export function useListingDraft() {
  const [images, setImages] = useState([]); // ListingImage[]
  const [imageError, setImageError] = useState(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('');

  const [errors, setErrors] = useState({}); // fieldKey → string | null

  // Track all created object URLs so we can revoke on unmount
  const objectUrlsRef = useRef(new Set());

  // Revoke all object URLs on unmount
  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  /** Add images from a FileList */
  const addImages = useCallback((fileList) => {
    setImageError(null);
    const files = Array.from(fileList);

    // Validate each file first
    for (const file of files) {
      const err = validateImageFile(file);
      if (err) {
        setImageError(err);
        return;
      }
    }

    setImages((prev) => {
      const countErr = validateImageCount(prev.length, files.length);
      if (countErr) {
        setImageError(countErr);
        return prev;
      }

      const newImages = files.map((file, i) => {
        const url = URL.createObjectURL(file);
        objectUrlsRef.current.add(url);
        return {
          id: crypto.randomUUID(),
          file,
          previewUrl: url,
          isPrimary: prev.length === 0 && i === 0,
        };
      });
      return [...prev, ...newImages];
    });
  }, []);

  /** Remove an image by id */
  const removeImage = useCallback((id) => {
    setImages((prev) => {
      const target = prev.find((img) => img.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
        objectUrlsRef.current.delete(target.previewUrl);
      }

      const remaining = prev.filter((img) => img.id !== id);

      // If we removed the primary, promote first remaining
      const hadPrimary = target?.isPrimary;
      if (hadPrimary && remaining.length > 0) {
        remaining[0] = { ...remaining[0], isPrimary: true };
      }
      return remaining;
    });
    setImageError(null);
  }, []);

  /** Make an image the primary by id */
  const makePrimary = useCallback((id) => {
    setImages((prev) =>
      prev.map((img) => ({ ...img, isPrimary: img.id === id }))
    );
  }, []);

  /** Set a field error */
  const setError = (key, msg) =>
    setErrors((prev) => ({ ...prev, [key]: msg }));

  const clearError = (key) =>
    setErrors((prev) => ({ ...prev, [key]: null }));

  const draft = { title, category, price, description, condition, images };

  return {
    // Image state
    images,
    imageError,
    setImageError,
    addImages,
    removeImage,
    makePrimary,

    // Info fields
    title, setTitle,
    category, setCategory,
    price, setPrice,
    description, setDescription,
    condition, setCondition,

    // Field errors
    errors,
    setError,
    clearError,

    // Aggregated draft
    draft,
  };
}
