import type { Product } from "@/lib/types";

/**
 * A wishlist keeps a snapshot of the product, not a live query: the list lives in the browser, so
 * the saved page has to render without asking the catalog. The product page is the place that shows
 * the current price.
 */
export const WISHLIST_LIMIT = 100;

function toWishlistItem(input: unknown): Product | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Record<string, unknown>;
  const id = typeof value.id === "string" ? value.id.trim() : "";
  const slug = typeof value.slug === "string" ? value.slug.trim() : "";
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!id || !slug || !name) return null;
  const number = (candidate: unknown) => (typeof candidate === "number" && Number.isFinite(candidate) ? candidate : 0);
  return {
    id,
    slug,
    name,
    imageUrl: typeof value.imageUrl === "string" && value.imageUrl ? value.imageUrl : undefined,
    isNew: value.isNew === true,
    productType: typeof value.productType === "string" ? value.productType : undefined,
    subBrand: typeof value.subBrand === "string" ? value.subBrand : undefined,
    isCustomizable: value.isCustomizable === "full" || value.isCustomizable === "partial" || value.isCustomizable === "none" ? value.isCustomizable : undefined,
    priceMinKs: number(value.priceMinKs),
    priceMaxKs: number(value.priceMaxKs),
  };
}

/** Accepts anything a previous version may have stored and keeps the newest copy of each product. */
export function normalizeWishlist(input: unknown): Product[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const items: Product[] = [];
  for (const entry of input) {
    const item = toWishlistItem(entry);
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    items.push(item);
    if (items.length >= WISHLIST_LIMIT) break;
  }
  return items;
}

export function isWishlisted(items: Product[], productId: string): boolean {
  return items.some((item) => item.id === productId);
}

/** Saving is a toggle: the heart in the card and on the saved page must never create a duplicate. */
export function toggleWishlistItem(items: Product[], product: Product): Product[] {
  const item = toWishlistItem(product);
  if (!item) return items;
  if (isWishlisted(items, item.id)) return items.filter((entry) => entry.id !== item.id);
  return [item, ...items].slice(0, WISHLIST_LIMIT);
}

export function removeWishlistItem(items: Product[], productId: string): Product[] {
  return items.filter((item) => item.id !== productId);
}
