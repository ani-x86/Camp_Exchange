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

const MOCK_PRODUCTS = [
  // Books
  { _id: 'b1', title: 'Engineering Mathematics Vol. 2', price: 280, category: 'books', imageUrl: null, seller: 'Priya S.' },
  { _id: 'b2', title: 'Data Structures & Algorithms', price: 350, category: 'books', imageUrl: null, seller: 'Rahul M.' },
  { _id: 'b3', title: 'Physics for JEE', price: 200, category: 'books', imageUrl: null, seller: 'Ananya K.' },
  { _id: 'b4', title: 'Organic Chemistry Narendra Awasthi', price: 450, category: 'books', imageUrl: null, seller: 'Dev P.' },

  // Electronics
  { _id: 'e1', title: 'Casio FX-991EX Scientific Calculator', price: 900, category: 'electronics', imageUrl: null, seller: 'Meera R.' },
  { _id: 'e2', title: 'Mi Wired Earphones', price: 300, category: 'electronics', imageUrl: null, seller: 'Kunal V.' },
  { _id: 'e3', title: 'Belkin USB-C Hub (5-in-1)', price: 1200, category: 'electronics', imageUrl: null, seller: 'Sanya J.' },
  { _id: 'e4', title: 'Logitech M235 Wireless Mouse', price: 750, category: 'electronics', imageUrl: null, seller: 'Arjun T.' },
  { _id: 'e5', title: 'HP 32 GB USB 3.0 Pen Drive', price: 450, category: 'electronics', imageUrl: null, seller: 'Ishika B.' },

  // Clothes
  // ⚠ NOTE: 'clothes' is NOT in the backend enum (books|electronics|furniture|stationery|other).
  // Mapped to 'other' in API calls until the backend enum is updated.
  { _id: 'c1', title: 'College Hoodie — L', price: 550, category: 'clothes', imageUrl: null, seller: 'Tanvi S.' },
  { _id: 'c2', title: 'Sports Track Pants', price: 320, category: 'clothes', imageUrl: null, seller: 'Rohan G.' },
  { _id: 'c3', title: 'Formal Shirt — M (barely used)', price: 400, category: 'clothes', imageUrl: null, seller: 'Nidhi A.' },

  // Furniture
  { _id: 'f1', title: 'Study Table with Bookshelf', price: 3200, category: 'furniture', imageUrl: null, seller: 'Aditya H.' },
  { _id: 'f2', title: 'Folding Chair (pair)', price: 800, category: 'furniture', imageUrl: null, seller: 'Riya C.' },
  { _id: 'f3', title: 'Bedside Lamp', price: 250, category: 'furniture', imageUrl: null, seller: 'Karan L.' },

  // Stationery
  { _id: 's1', title: 'Staedtler Geometry Set', price: 150, category: 'stationery', imageUrl: null, seller: 'Pooja N.' },
  { _id: 's2', title: 'A4 Ring Binders (set of 3)', price: 120, category: 'stationery', imageUrl: null, seller: 'Vivek S.' },
  { _id: 's3', title: 'Highlighter Pack — 8 colors', price: 90, category: 'stationery', imageUrl: null, seller: 'Sonali P.' },
  { _id: 's4', title: 'Graph Notebooks (5 qty)', price: 75, category: 'stationery', imageUrl: null, seller: 'Akash D.' },

  // Other
  { _id: 'o1', title: 'Yoga Mat', price: 600, category: 'other', imageUrl: null, seller: 'Lavanya R.' },
  { _id: 'o2', title: 'Badminton Racket Set', price: 900, category: 'other', imageUrl: null, seller: 'Suraj P.' },
  { _id: 'o3', title: 'Tiffin Box (steel, 3-tier)', price: 350, category: 'other', imageUrl: null, seller: 'Diya K.' },
];

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
      queryFn: () => ({
        data: MOCK_PRODUCTS,
      }),
    }),
  }),
});

export const { useGetProductsQuery } = productsApi;
