// Plan §17 S6: the search page answers in two groups, each with its own cap, and the group lives in the
// address as `?type=` so a link can point at one of them. Designs are not a group: artwork is posted with
// the product it prints, so a design never appears on its own.
export const SEARCH_CAPS = { products: 40, guides: 10 } as const;

export type SearchType = keyof typeof SEARCH_CAPS;

export function readSearchType(value: string | undefined): SearchType {
  return value === "guides" ? value : "products";
}

export function searchHref(query: string, type: SearchType): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (type !== "products") params.set("type", type);
  return params.size ? `/search?${params.toString()}` : "/search";
}
