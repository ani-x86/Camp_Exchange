/**
 * CampX — createListing (mock publish)
 * listing.md §7 Mock persistence
 *
 * Converts image files to data URLs (survive reload), persists to localStorage,
 * and returns the new Listing object.
 *
 * Designed as a thin async function that can later be swapped for an RTK Query
 * mutation without touching UI components.
 */

const STORAGE_KEY = 'campx.listings';

function readListings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeListings(listings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(listings));
  } catch (err) {
    if (err.name === 'QuotaExceededError') {
      throw new Error(
        'Images are too large to save. Remove a photo and try again.'
      );
    }
    throw err;
  }
}

/**
 * fileToDataUrl — returns a Promise<string> data URL for a File.
 */
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * createListing(draft, seller) → Promise<Listing>
 *
 * @param {object} draft - { title, category, price (string), description, condition, images: ListingImage[] }
 * @param {object} seller - { name, verified, campus }
 */
export async function createListing(draft, seller) {
  // Sort: primary first
  const sorted = [...draft.images].sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
  const dataUrls = await Promise.all(sorted.map((img) => fileToDataUrl(img.file)));

  const listing = {
    id: crypto.randomUUID(),
    title: draft.title.trim(),
    category: draft.category,
    price: Number(draft.price),
    description: draft.description.trim(),
    condition: draft.condition || null,
    images: dataUrls, // primary first
    seller: {
      name: seller.name,
      verified: seller.verified,
      campus: seller.campus,
    },
    createdAt: new Date().toISOString(),
    status: 'active',
  };

  const existing = readListings();
  writeListings([listing, ...existing]);
  return listing;
}

/**
 * getListings() → Listing[]
 * Returns all listings from localStorage (newest first).
 */
export function getListings() {
  return readListings();
}
