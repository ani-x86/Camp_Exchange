/**
 * searchSuggestions — keyword suggestion data provider for SearchBar.
 *
 * Simulates the backend endpoint (GET /api/search/suggestions?q=...)
 * returning a matching category (if any) and follow-up refining chips.
 *
 * Rules:
 *  - Follow-up chips are related/refining terms, not just raw product titles.
 *  - An actual ML recommendation engine is out of scope (phases.md stretch goal);
 *    a structured static relation map is used for MVP.
 */

const RECENT_SEARCHES = [
  'Engineering drawing kit',
  'Calculus 1',
  'Scientific calculator',
  'Desk lamp',
  'Lab coat',
];

const SUGGESTION_MAP = [
  {
    keywords: ['book', 'textbook', 'novel', 'guide', 'sem', 'semester', 'read', 'math', 'chem', 'physics', 'notes'],
    category: 'Books',
    chips: [
      'Books',
      'Semester 3 books',
      'Engineering textbooks',
      'GATE exam guides',
      'Used reference books',
    ],
  },
  {
    keywords: ['calc', 'elec', 'tech', 'laptop', 'mouse', 'phone', 'charger', 'cord', 'adapter', 'keyboard', 'monitor'],
    category: 'Electronics',
    chips: [
      'Electronics',
      'Scientific calculator',
      'Laptop stand',
      'Extension board',
      'USB-C charger & cord',
    ],
  },
  {
    keywords: ['desk', 'chair', 'table', 'fur', 'mattress', 'cushion', 'bed', 'stool', 'bookshelf'],
    category: 'Furniture',
    chips: [
      'Furniture',
      'Study desk',
      'Ergonomic chair',
      'Foldable table',
      'Hostel mattress',
    ],
  },
  {
    keywords: ['pen', 'pencil', 'dra', 'drafter', 'sheet', 'scale', 'notebook', 'stat', 'folder', 'binder'],
    category: 'Stationery',
    chips: [
      'Stationery',
      'Engineering drawing kit',
      'Mini drafter & T-square',
      'Notebooks bundle',
      'Geometry scale set',
    ],
  },
  {
    keywords: ['cloth', 'coat', 'lab', 'hoodie', 'jacket', 'shirt', 'apron', 'dress'],
    category: 'Clothes',
    chips: [
      'Clothes',
      'White lab coat',
      'College hoodie',
      'Winter fleece jacket',
      'Chemistry apron',
    ],
  },
];

/**
 * Fetch keyword suggestions for a search query.
 * @param {string} query
 * @returns {Promise<{ category: string | null, chips: string[] }>}
 */
export async function getSuggestions(query = '') {
  const trimmed = query.trim().toLowerCase();

  // If empty query: return recent searches
  if (!trimmed) {
    return {
      category: null,
      chips: RECENT_SEARCHES,
    };
  }

  // Find matching keyword group
  const match = SUGGESTION_MAP.find((entry) =>
    entry.keywords.some((k) => trimmed.includes(k) || k.includes(trimmed))
  );

  if (match) {
    return {
      category: match.category,
      chips: match.chips,
    };
  }

  // Contextual fallback generation for custom queries
  const capitalized = query.trim().charAt(0).toUpperCase() + query.trim().slice(1);
  return {
    category: null,
    chips: [
      capitalized,
      `Used ${capitalized}`,
      `${capitalized} in good condition`,
      `Affordable ${capitalized}`,
      `Campus ${capitalized}`,
    ].slice(0, 5),
  };
}
