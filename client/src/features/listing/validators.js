/**
 * CampX — Listing Validators
 * listing.md §3 (image rules), §4 (info field rules)
 */

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = ['image/jpeg', 'image/png'];
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png'];
const MAX_IMAGES = 6; // 1 primary + 5 additional

/**
 * Validates a single File for upload.
 * Returns an error string or null.
 */
export function validateImageFile(file) {
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  if (!ALLOWED_MIME.includes(file.type) || !ALLOWED_EXT.includes(ext)) {
    return 'Only JPG and PNG images are allowed.';
  }
  if (file.size > MAX_SIZE_BYTES) {
    return `"${file.name}" is larger than 5 MB.`;
  }
  return null;
}

/**
 * Returns error if adding `count` more images would exceed the limit.
 */
export function validateImageCount(currentCount, addingCount) {
  if (currentCount + addingCount > MAX_IMAGES) {
    return `You can add up to ${MAX_IMAGES} photos.`;
  }
  return null;
}

export function validateTitle(val) {
  const v = val.trim();
  if (!v) return 'Item title is required.';
  if (v.length < 3) return 'Title must be at least 3 characters.';
  if (v.length > 80) return 'Title must be 80 characters or fewer.';
  return null;
}

export function validateCategory(val) {
  if (!val) return 'Please select a category.';
  return null;
}

export function validatePrice(val) {
  const v = val.trim();
  if (!v) return 'Price is required.';
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > 100000) {
    return 'Price must be a whole number between ₹1 and ₹1,00,000.';
  }
  return null;
}

export function validateDescription(val) {
  const v = val.trim();
  if (!v) return 'Description is required.';
  if (v.length < 10) return 'Description must be at least 10 characters.';
  if (v.length > 500) return 'Description must be 500 characters or fewer.';
  return null;
}
