import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

/**
 * productsApi — RTK Query slice for product listings.
 *
 * Phase 2 swap: replace `queryFn` with a real baseUrl + url path.
 * No component changes required — hook signatures stay identical.
 *
 * Mock fixture generates 3–5 realistic-looking products per category
 * so the Dashboard is fully functional without a running backend.
 */

// ── Fixture data ────────────────────────────────────────────────────

const RAW_PRODUCTS = [
  // Books
  { _id: 'b1', title: 'Engineering Mathematics Vol. 2', price: 280, category: 'books', seller: 'Priya S.' },
  { _id: 'b2', title: 'Data Structures & Algorithms', price: 350, category: 'books', seller: 'Rahul M.' },
  { _id: 'b3', title: 'Physics for JEE', price: 200, category: 'books', seller: 'Ananya K.' },
  { _id: 'b4', title: 'Organic Chemistry Narendra Awasthi', price: 450, category: 'books', seller: 'Dev P.' },

  // Electronics
  { _id: 'e1', title: 'Casio FX-991EX Scientific Calculator', price: 900, category: 'electronics', seller: 'Meera R.' },
  { _id: 'e2', title: 'Mi Wired Earphones', price: 300, category: 'electronics', seller: 'Kunal V.' },
  { _id: 'e3', title: 'Belkin USB-C Hub (5-in-1)', price: 1200, category: 'electronics', seller: 'Sanya J.' },
  { _id: 'e4', title: 'Logitech M235 Wireless Mouse', price: 750, category: 'electronics', seller: 'Arjun T.' },
  { _id: 'e5', title: 'HP 32 GB USB 3.0 Pen Drive', price: 450, category: 'electronics', seller: 'Ishika B.' },

  // Clothes
  // ⚠ NOTE: 'clothes' is NOT in the backend enum (books|electronics|furniture|stationery|other).
  // Mapped to 'other' in API calls until the backend enum is updated.
  { _id: 'c1', title: 'College Hoodie — L', price: 550, category: 'clothes', seller: 'Tanvi S.' },
  { _id: 'c2', title: 'Sports Track Pants', price: 320, category: 'clothes', seller: 'Rohan G.' },
  { _id: 'c3', title: 'Formal Shirt — M (barely used)', price: 400, category: 'clothes', seller: 'Nidhi A.' },

  // Furniture
  { _id: 'f1', title: 'Study Table with Bookshelf', price: 3200, category: 'furniture', seller: 'Aditya H.' },
  { _id: 'f2', title: 'Folding Chair (pair)', price: 800, category: 'furniture', seller: 'Riya C.' },
  { _id: 'f3', title: 'Bedside Lamp', price: 250, category: 'furniture', seller: 'Karan L.' },

  // Stationery
  { _id: 's1', title: 'Staedtler Geometry Set', price: 150, category: 'stationery', seller: 'Pooja N.' },
  { _id: 's2', title: 'A4 Ring Binders (set of 3)', price: 120, category: 'stationery', seller: 'Vivek S.' },
  { _id: 's3', title: 'Highlighter Pack — 8 colors', price: 90, category: 'stationery', seller: 'Sonali P.' },
  { _id: 's4', title: 'Graph Notebooks (5 qty)', price: 75, category: 'stationery', seller: 'Akash D.' },

  // Other
  { _id: 'o1', title: 'Yoga Mat', price: 600, category: 'other', seller: 'Lavanya R.' },
  { _id: 'o2', title: 'Badminton Racket Set', price: 900, category: 'other', seller: 'Suraj P.' },
  { _id: 'o3', title: 'Tiffin Box (steel, 3-tier)', price: 350, category: 'other', seller: 'Diya K.' },
];

/**
 * Per-category demo media (description + photos) matching the Product model
 * in architecture.md §3 (`description`, `images: [url]`). Lets the card's
 * scroller and description render before the real API lands; the Phase 2
 * swap removes this block along with `queryFn`.
 */
const CATEGORY_MEDIA = {
  books: {
    description: 'Used textbook — minimal highlighting, all pages intact.',
    images: [
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1532012164546-f432f2e37b73?auto=format&fit=crop&w=600&q=80',
    ],
  },
  electronics: {
    description: 'Working condition, light use, charger included where applicable.',
    images: [
      'https://images.unsplash.com/photo-1611125832047-1d7ad1e8e48f?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80',
    ],
  },
  clothes: {
    description: 'Washed and ready to wear — no tears or fading.',
    images: [
      'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1534972195531-a756b1126f24?auto=format&fit=crop&w=600&q=80',
    ],
  },
  furniture: {
    description: 'Sturdy, hostel-tested — pickup from campus.',
    images: [
      'https://images.unsplash.com/photo-1532012164546-f432f2e37b73?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1611125832047-1d7ad1e8e48f?auto=format&fit=crop&w=600&q=80',
    ],
  },
  stationery: {
    description: 'Barely used, full set intact.',
    images: [
      'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
    ],
  },
  other: {
    description: 'Good condition, priced to move.',
    images: [
      'https://images.unsplash.com/photo-1534972195531-a756b1126f24?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=600&q=80',
    ],
  },
};

const MOCK_PRODUCTS = RAW_PRODUCTS.map((p) => ({
  ...p,
  ...(CATEGORY_MEDIA[p.category] ?? CATEGORY_MEDIA.other),
}));

// ── RTK Query API slice ─────────────────────────────────────────────

export const productsApi = createApi({
  reducerPath: 'productsApi',
  // Phase 2 swap: replace baseQuery + add url/method to each endpoint
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  endpoints: (builder) => ({
    /**
     * getProducts — fetch all products.
     *
     * Phase 2: remove queryFn, use `query: () => '/products'`
     */
    getProducts: builder.query({
      queryFn: async (_arg, _queryApi, _extraOptions, fetchWithBQ) => {
        try {
          const res = await fetchWithBQ('/products');
          if (res.data?.products && res.data.products.length > 0) {
            return { data: res.data.products };
          }
        } catch (e) {
          // ignore and fall back
        }
        return {
          data: MOCK_PRODUCTS,
        };
      },
    }),

    /**
     * getProductById — fetch single product by id.
     */
    getProductById: builder.query({
      queryFn: async (id, _queryApi, _extraOptions, fetchWithBQ) => {
        try {
          const res = await fetchWithBQ(`/products/${id}`);
          if (res.data?.product) {
            return { data: res.data.product };
          }
        } catch (e) {
          // ignore
        }
        const item = MOCK_PRODUCTS.find((p) => p._id === id);
        if (item) {
          return { data: { status: 'available', ...item } };
        }
        return {
          error: {
            status: 404,
            data: { error: 'Product not found. Return to browse to find active listings.' },
          },
        };
      },
    }),
  }),
});

export const { useGetProductsQuery, useGetProductByIdQuery } = productsApi;
