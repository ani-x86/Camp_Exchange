import { readApiResponse } from '../../services/apiResponse';

function getAccessToken() {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    throw new Error('Your session has expired. Sign in again to publish a listing.');
  }
  return token;
}

function toListing(product, seller) {
  return {
    ...product,
    images: product.images.map((image) => image.url),
    seller: {
      name: product.sellerName || seller?.name,
      verified: product.sellerVerified ?? seller?.verified,
      campus: seller?.campus,
    },
  };
}

/**
 * createListing(draft, seller) → Promise<Listing>
 *
 * Publishes image files and listing fields to the authenticated products API.
 */
export async function createListing(draft, seller) {
  const formData = new FormData();
  formData.append('itemTitle', draft.title.trim());
  formData.append('category', draft.category);
  formData.append('price', draft.price);
  formData.append('description', draft.description.trim());
  formData.append('condition', draft.condition || '');

  const sortedImages = [...draft.images]
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  for (const image of sortedImages) {
    formData.append('images', image.file);
  }

  const response = await fetch('/api/products', {
    method: 'POST',
    headers: { Authorization: `Bearer ${getAccessToken()}` },
    body: formData,
  });
  const { product } = await readApiResponse(response, 'Could not publish this listing.');
  return toListing(product, seller);
}

/**
 * getListings() → Promise<Listing[]>
 * Returns the authenticated user's persisted listings.
 */
export async function getListings() {
  const response = await fetch('/api/products/me/listings', {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
  });
  const { products } = await readApiResponse(response, 'Could not load your listings.');
  return products.map((product) => toListing(product));
}
