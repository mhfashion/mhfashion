import {
  priceTableCell, 
  priceTableSizes,
  type AdminDemoData,
  type AdminPriceTable,
  type AdminProductCategory,
  type AdminProductDraft,
  type AdminProduct,
  type AdminTshirtPost,
} from "@/lib/admin-demo-data";
import type { PricingScope } from "@/lib/admin-pricing";

/**
 * The shop's own category names (the storefront's category row) and the price-table column each one is
 * posted under, so every category the shop lists has a price without adding a second vocabulary.
 */
export const SHOP_CATEGORY_PRICES: { shop: string; column: AdminProductCategory }[] = [
  { shop: "T-Shirts", column: "T-Shirt" },
  { shop: "Kids T-Shirts", column: "T-Shirt" },
  { shop: "Phone Covers", column: "Accessory" },
  { shop: "Bags", column: "Accessory" },
  { shop: "Cups", column: "Accessory" },
];

/** Every post in the shop is a T-shirt post, so its prices come from the T-shirt column. */
export const POST_PRICE_CATEGORY: AdminProductCategory = "T-Shirt";

export type TablePriceCell = { size: string; priceKs: number | null };

/** The prices a post of this category picks up, one per size that category sells. */
export function pricesForCategory(table: AdminPriceTable, category: AdminProductCategory): TablePriceCell[] {
  return priceTableSizes(category).map((size) => ({ size, priceKs: priceTableCell(table, category, size) }));
}

/** Lowest price of a category — what a product card shows until a size is chosen. */
export function lowestTablePrice(table: AdminPriceTable, category: AdminProductCategory): number | null {
  const prices = pricesForCategory(table, category)
    .map((cell) => cell.priceKs)
    .filter((price): price is number => price !== null);
  return prices.length ? Math.min(...prices) : null;
}

/**
 * True when the table prices every size the category sells. Posting a product of a half-filled
 * category is refused, so a size can never be sold at an unknown price.
 */
export function categoryFullyPriced(table: AdminPriceTable, category: AdminProductCategory): boolean {
  return pricesForCategory(table, category).every((cell) => cell.priceKs !== null);
}

/** The category a pricing scope draws its prices from: a product's own category, else the T-shirt column. */
export function scopePriceCategory(
  data: Pick<AdminDemoData, "products" | "tshirtPosts">,
  scope: PricingScope,
): AdminProductCategory | null {
  if (scope.kind === "product") {
    const product = data.products.find((entry: AdminProduct) => entry.id === scope.id);
    return product?.category ?? null;
  }
  const post = data.tshirtPosts.find((entry: AdminTshirtPost) => entry.id === scope.id);
  return post ? POST_PRICE_CATEGORY : null;
}

/**
 * The draft a save writes: a posted product's price is the table's lowest price for its category, so the
 * form never types one. A category the table does not price keeps whatever the draft already held.
 */
export function draftWithTablePrice(draft: AdminProductDraft, table: AdminPriceTable): AdminProductDraft {
  const price = lowestTablePrice(table, draft.category);
  return price === null ? draft : { ...draft, priceKs: String(price) };
}

/**
 * The price each pricing row should carry, read from the table by the row's size. Rows whose size has
 * no table price are left out, so a fill never clears a price the admin set by hand.
 */
export function fillPricesFromTable(
  table: AdminPriceTable,
  category: AdminProductCategory | null,
  rows: { key: string; options: Record<string, string> }[],
): Map<string, number> {
  const filled = new Map<string, number>();
  if (!category) return filled;
  for (const row of rows) {
    const size = row.options.size;
    if (!size) continue;
    const price = priceTableCell(table, category, size);
    if (price !== null) filled.set(row.key, price);
  }
  return filled;
}
