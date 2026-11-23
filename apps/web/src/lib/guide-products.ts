import type { Product } from "./types";

/**
 * How a guide post points at the products it sells.
 *
 * The Nyein brief (Plan P2 item 11) still has to say how a post relates to Product → Style → Colour and
 * to fixed-design products, so this deliberately models only what is already true and useful: a post
 * names the product slugs it talks about, in the order it talks about them, with an optional "as shown"
 * line. That is enough for a reader to go from an article to the product, and it is the shape the brief
 * can extend without rewriting the posts that already exist.
 */

/** A post that lists more than this is a catalogue page, not a guide. */
export const GUIDE_PRODUCT_LIMIT = 6;

export type GuideProductLink = {
  /** The product's slug, exactly as `/products/<slug>` uses it. */
  slug: string;
  /** Shown under the product name, e.g. "As shown in white". Empty when the post has nothing to add. */
  note: string;
};

export type ResolvedGuideProductLink = GuideProductLink & { product: Product };

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

/**
 * Reads whatever the database or an older post holds and returns links that can be rendered: strings are
 * accepted as a bare slug, blanks are dropped, a slug appears once (first mention wins), and the list is
 * cut at the limit. A malformed entry is skipped rather than thrown, because one bad row must not take
 * the whole post down.
 */
export function normalizeGuideProductLinks(value: unknown): GuideProductLink[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const links: GuideProductLink[] = [];
  for (const entry of value) {
    const record = asRecord(entry);
    const rawSlug = typeof entry === "string" ? entry : record && typeof record.slug === "string" ? record.slug : "";
    const slug = rawSlug.trim().toLowerCase().replace(/^\/+|\/+$/g, "");
    if (!slug || slug.includes("/") || /\s/.test(slug) || seen.has(slug)) continue;
    const rawNote = record && typeof record.note === "string" ? record.note : "";
    seen.add(slug);
    links.push({ slug, note: rawNote.replace(/\s+/g, " ").trim().slice(0, 80) });
    if (links.length >= GUIDE_PRODUCT_LIMIT) break;
  }
  return links;
}

/** `/products/<slug>`, encoded once, so a slug with an odd character cannot break the link. */
export function guideProductHref(slug: string): string {
  return `/products/${encodeURIComponent(slug.trim())}`;
}

/**
 * Resolves the slugs against the catalogue. A slug that no longer exists is dropped instead of rendered
 * as a dead card; the rest keep the post's order. The lookup is injected so this can be tested without a
 * database and so the page can fetch all slugs in one query.
 */
export async function resolveGuideProductLinks(
  links: GuideProductLink[],
  lookup: (slug: string) => Promise<Product | null> | Product | null,
): Promise<ResolvedGuideProductLink[]> {
  const resolved = await Promise.all(links.map(async (link) => ({ link, product: await lookup(link.slug) })));
  return resolved.flatMap(({ link, product }) => (product ? [{ ...link, product }] : []));
}

/** What a card says under the name: the post's own note, or the catalogue line when there is none. */
export function guideProductSubtitle(link: ResolvedGuideProductLink): string {
  if (link.note) return link.note;
  return link.product.subBrand?.trim() || link.product.productType?.trim() || "";
}

/** The admin's one-line summary of a post's relationship: "tee-white, hoodie" or "no products linked". */
export function guideProductLinkSummary(links: GuideProductLink[]): string {
  return links.length ? links.map((link) => link.slug).join(", ") : "No products linked";
}
