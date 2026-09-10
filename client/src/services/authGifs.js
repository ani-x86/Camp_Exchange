/**
 * authGifs — dynamic GIF discovery for the auth success overlay.
 *
 * Uses Vite's import.meta.glob to eagerly import all GIF files from
 * Content/gif/account-login/ so newly dropped GIFs are automatically
 * picked up without code changes (just restart the dev server).
 *
 * Returns an array of resolved URLs.
 */

// Eager-import all GIFs from the account-login content folder.
// The `as: 'url'` import attribute tells Vite to return the resolved
// public URL for each matched file rather than the file contents.
const gifModules = import.meta.glob(
  '../../../Content/gif/account-login/*.gif',
  { eager: true, import: 'default', query: '?url' }
);

// Extract resolved URLs into a simple array
const allGifs = Object.values(gifModules);

/**
 * Returns the full list of available auth celebration GIF URLs.
 */
export function getAuthGifs() {
  return allGifs;
}

/**
 * Returns a single random auth celebration GIF URL, or null if none exist.
 */
export function getRandomAuthGif() {
  if (allGifs.length === 0) return null;
  return allGifs[Math.floor(Math.random() * allGifs.length)];
}
