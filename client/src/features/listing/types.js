/**
 * CampX — Listing Feature Types
 * Mirrors listing.md §7 Data Model (JS version — no TypeScript in this project).
 */

export const CATEGORIES = [
  'Books',
  'Electronics',
  'Lab Equipment',
  'Stationery',
  'Furniture',
  'Clothing',
  'Sports',
  'Other',
];

export const CONDITIONS = ['New', 'Like new', 'Good', 'Fair'];

/**
 * ListingImage shape:
 * { id: string, file: File, previewUrl: string, isPrimary: boolean }
 *
 * ListingDraft shape:
 * { title: string, category: string, price: string, description: string, condition: string, images: ListingImage[] }
 *
 * Listing (published) shape:
 * { id, title, category, price (number), description, condition, images (string[]), seller, createdAt, status }
 */
