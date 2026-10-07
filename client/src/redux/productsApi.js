import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

/**
 * productsApi — RTK Query slice for product listings.
 *
 * All 8 canonical categories supported:
 *   books | electronics | lab-equipment | stationery | furniture | clothing | sports | other
 */

// ── Fixture data ────────────────────────────────────────────────────

const RAW_PRODUCTS = [
  // Books
  { _id: 'b1', title: 'Engineering Mathematics Vol. 3', price: 180, category: 'books', seller: 'Priya S.' },
  { _id: 'b2', title: 'Data Structures using C — Reema Thareja', price: 220, category: 'books', seller: 'Rahul M.' },
  { _id: 'b3', title: 'Signals and Systems — Oppenheim', price: 120, category: 'books', seller: 'Ananya K.' },
  { _id: 'b4', title: 'Operating Systems Concepts (Dinosaur)', price: 290, category: 'books', seller: 'Dev P.' },

  // Electronics
  { _id: 'e1', title: 'Scientific Calculator FX-991ES Plus', price: 650, category: 'electronics', seller: 'Meera R.' },
  { _id: 'e2', title: 'USB-C Hub 7-in-1', price: 800, category: 'electronics', seller: 'Sanya J.' },
  { _id: 'e3', title: 'Laptop Stand Adjustable Aluminum', price: 450, category: 'electronics', seller: 'Arjun T.' },

  // Lab Equipment
  { _id: 'l1', title: 'Lab Coat White (Size M)', price: 120, category: 'lab-equipment', seller: 'Aarav S.' },
  { _id: 'l2', title: 'Vernier Calipers 150mm — Mitutoyo', price: 280, category: 'lab-equipment', seller: 'Tanvi S.' },
  { _id: 'l3', title: 'Analog Multimeter — Mastech', price: 90, category: 'lab-equipment', seller: 'Kavya I.' },

  // Stationery
  { _id: 's1', title: 'Staedtler Drawing Instrument Set', price: 160, category: 'stationery', seller: 'Pooja N.' },
  { _id: 's2', title: 'A1 Drawing Board + Drafting Tape', price: 200, category: 'stationery', seller: 'Vivek S.' },

  // Furniture
  { _id: 'f1', title: 'Wooden Study Table — Foldable', price: 1200, category: 'furniture', seller: 'Aditya H.' },
  { _id: 'f2', title: 'Study Chair — Mesh Back', price: 900, category: 'furniture', seller: 'Riya C.' },

  // Clothing
  { _id: 'c1', title: 'College Hoodie (Navy, Size L)', price: 350, category: 'clothing', seller: 'Tanvi S.' },
  { _id: 'c2', title: 'Sports Track Pant (Size M)', price: 120, category: 'clothing', seller: 'Rohan G.' },

  // Sports
  { _id: 'sp1', title: 'Badminton Racket — Yonex GR-303', price: 280, category: 'sports', seller: 'Suraj P.' },
  { _id: 'sp2', title: 'Yoga Mat — 6mm Thick', price: 220, category: 'sports', seller: 'Lavanya R.' },

  // Other
  { _id: 'o1', title: 'Desk Lamp — LED with USB Charging Port', price: 400, category: 'other', seller: 'Diya K.' },
  { _id: 'o2', title: 'Whiteboard 60x45cm', price: 250, category: 'other', seller: 'Sameer J.' },
  { _id: 'o3', title: 'Mini Fridge 20L — Haier', price: 2200, category: 'other', seller: 'Arjun D.' },
];

/**
 * Per-category working media matching canonical categories.
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
  'lab-equipment': {
    description: 'Standard engineering & lab equipment, calibrated and clean.',
    images: [
      'https://images.unsplash.com/photo-1582719471384-894fbb16e074?auto=format&fit=crop&w=600&q=80',
    ],
  },
  stationery: {
    description: 'Engineering drawing and study stationery, complete set.',
    images: [
      'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?auto=format&fit=crop&w=600&q=80',
    ],
  },
  furniture: {
    description: 'Sturdy, hostel-tested study furniture. Ready for campus pickup.',
    images: [
      'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=600&q=80',
    ],
  },
  clothing: {
    description: 'Washed and ready to wear. Official collegiate/sports gear.',
    images: [
      'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=600&q=80',
    ],
  },
  sports: {
    description: 'Good condition sports equipment for campus recreation.',
    images: [
      'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=600&q=80',
    ],
  },
  other: {
    description: 'Hostel and study accessories in great working condition.',
    images: [
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=600&q=80',
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
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  endpoints: (builder) => ({
    getProducts: builder.query({
      queryFn: async (_arg, _queryApi, _extraOptions, fetchWithBQ) => {
        try {
          const res = await fetchWithBQ('/products');
          if (res.data?.products && res.data.products.length > 0) {
            const mapped = res.data.products.map((p) => {
              // If seed used dummy campx-demo placeholder URLs that 404, provide reliable category photo
              const hasBrokenDemoImage =
                !p.images ||
                p.images.length === 0 ||
                (typeof p.images[0] === 'string' && p.images[0].includes('campx-demo')) ||
                (p.images[0]?.url && p.images[0].url.includes('campx-demo'));

              if (hasBrokenDemoImage) {
                const fallbackImg = CATEGORY_MEDIA[p.category]?.images?.[0] || CATEGORY_MEDIA.other.images[0];
                return {
                  ...p,
                  images: [{ url: fallbackImg, publicId: 'fallback' }],
                };
              }
              return p;
            });
            return { data: mapped };
          }
        } catch {
          // ignore and fall back
        }
        return {
          data: MOCK_PRODUCTS,
        };
      },
    }),

    getProductById: builder.query({
      queryFn: async (id, _queryApi, _extraOptions, fetchWithBQ) => {
        try {
          const res = await fetchWithBQ(`/products/${id}`);
          if (res.data?.product) {
            const p = res.data.product;
            const hasBrokenDemoImage =
              !p.images ||
              p.images.length === 0 ||
              (typeof p.images[0] === 'string' && p.images[0].includes('campx-demo')) ||
              (p.images[0]?.url && p.images[0].url.includes('campx-demo'));

            if (hasBrokenDemoImage) {
              const fallbackImg = CATEGORY_MEDIA[p.category]?.images?.[0] || CATEGORY_MEDIA.other.images[0];
              return {
                data: {
                  ...p,
                  images: [{ url: fallbackImg, publicId: 'fallback' }],
                },
              };
            }
            return { data: p };
          }
        } catch {
          // ignore
        }
        const item = MOCK_PRODUCTS.find((p) => (p.id === id || p._id === id));
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
