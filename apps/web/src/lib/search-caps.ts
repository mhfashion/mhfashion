// Plan §17 S6: how many products one search answer carries. The page lists product cards only — there are no
// result groups — so the cap covers the catalog alone.
export const SEARCH_CAPS = { products: 40 } as const;
