// The Price Table is one sheet per product: the product and the spec it is made with, then one price
// per size it stocks. Products are priced separately (a T-shirt is not a phone cover), and posting a
// product never types a price — it copies the sheet of a product already priced in its category.
import { APPAREL_CATEGORIES } from "@/lib/admin-demo-data";
import type {
  AdminDemoData,
  AdminProduct,
  AdminProductCategory,
  AdminProductDraft,
} from "@/lib/admin-demo-data";
import { applyPriceChanges, type PricingScope } from "@/lib/admin-pricing";

export type ProductSheetPrice = { size: string; priceKs: number | null; version: number };

export type ProductSheet = {
  /** The product type the sheet prices; every product of that type reads it. */
  type: string;
  /** The products that use this sheet — the owner prices the type once, not each product. */
  products: AdminProduct[];
  /** The product the spec block describes (the first of the type). */
  product: AdminProduct;
  prices: ProductSheetPrice[];
  priced: number;
  total: number;
};

/**
 * What a price belongs to: a T-shirt, a hoodie, a phone cover — not one catalogue row. Apparel is
 * priced by its category, so Classic and Oversized T-shirts share the T-shirt sheet; everything else is
 * priced by its own name, because a phone cover and a tote bag are not the same thing to make.
 */
export function productPriceType(product: AdminProduct): string {
  return APPAREL_CATEGORIES.includes(product.category) ? product.category : product.name.trim();
}

/** The labelled spec block the owner sees above the sizes — same order as the product sheet. */
export function productSpec(product: AdminProduct): { label: string; value: string }[] {
  return [
    { label: "Product", value: product.name },
    { label: "Type", value: product.category },
    { label: "Print Method", value: product.printMethod?.trim() || "—" },
    { label: "Fabric Type", value: product.fabric.trim() || "—" },
    { label: "Knit Structure", value: product.knitStructure?.trim() || "—" },
    { label: "MH Cuttings", value: product.cuttings?.trim() || "—" },
    { label: "GSM", value: product.gsm ? `${product.gsm} GSM` : "—" },
    { label: "Color", value: product.colors?.length ? product.colors.join(", ") : "—" },
  ];
}

/** Every size the product stocks, with the price the sheet holds for it. */
export function productPriceRows(data: Pick<AdminDemoData, "productPrices">, product: AdminProduct): ProductSheetPrice[] {
  return product.sizes.map((size) => {
    const row = data.productPrices.find((entry) => entry.productId === product.id && entry.size === size);
    return { size, priceKs: row?.priceKs ?? null, version: row?.version ?? 0 };
  });
}

/** One sheet per product type, in catalogue order, priced from the first product of that type. */
export function productSheets(data: Pick<AdminDemoData, "products" | "productPrices">): ProductSheet[] {
  const sheets: ProductSheet[] = [];
  for (const product of data.products) {
    const type = productPriceType(product);
    const existing = sheets.find((sheet) => sheet.type === type);
    if (existing) {
      existing.products.push(product);
      continue;
    }
    const prices = productPriceRows(data, product);
    sheets.push({
      type,
      products: [product],
      product,
      prices,
      priced: prices.filter((row) => row.priceKs !== null).length,
      total: prices.length,
    });
  }
  return sheets;
}

/** The size prices a type sells at — what a product of that type is listed from. */
export function typePrices(
  data: Pick<AdminDemoData, "products" | "productPrices">,
  type: string,
): ProductSheetPrice[] {
  return productSheets(data).find((sheet) => sheet.type === type)?.prices ?? [];
}

/** The type a new product will read its prices from, before it exists in the catalogue. */
export function draftPriceType(draft: Pick<AdminProductDraft, "category" | "name">): string {
  return APPAREL_CATEGORIES.includes(draft.category) ? draft.category : draft.name.trim();
}

/** Lowest size price — what the product card shows until a size is chosen. */
export function lowestProductPrice(data: Pick<AdminDemoData, "products" | "productPrices">, product: AdminProduct): number | null {
  const prices = productPriceRows(data, product)
    .map((row) => row.priceKs)
    .filter((price): price is number => price !== null);
  return prices.length ? Math.min(...prices) : null;
}

/** True when every stocked size has a price, so the product can be sold. */
export function productFullyPriced(data: Pick<AdminDemoData, "products" | "productPrices">, product: AdminProduct): boolean {
  return productPriceRows(data, product).every((row) => row.priceKs !== null);
}

export function priceSheetSummary(sheets: readonly ProductSheet[]) {
  return sheets.reduce(
    (total, sheet) => ({ priced: total.priced + sheet.priced, total: total.total + sheet.total }),
    { priced: 0, total: 0 },
  );
}

/**
 * The sheet a draft reads: its own type when the Price Table prices it, otherwise the first priced
 * sheet of the same category (a new accessory starts from the phone cover's prices). Posting therefore
 * never asks for a price — it reads the sheet the owner already filled.
 */
export function templatePrices(
  data: Pick<AdminDemoData, "products" | "productPrices">,
  draft: Pick<AdminProductDraft, "category" | "name">,
): ProductSheetPrice[] {
  const sheets = productSheets(data);
  const own = sheets.find((sheet) => sheet.type === draftPriceType(draft));
  if (own && own.priced) return own.prices;
  const inCategory = sheets.find((sheet) => sheet.product.category === draft.category && sheet.priced);
  return inCategory?.prices ?? own?.prices ?? [];
}

/** A saved draft takes the sheet's lowest price as its catalogue price; nothing is typed. */
export function draftWithTablePrice(
  draft: AdminProductDraft,
  data: Pick<AdminDemoData, "products" | "productPrices">,
): AdminProductDraft {
  const prices = templatePrices(data, draft)
    .map((row) => row.priceKs)
    .filter((price): price is number => price !== null);
  return prices.length ? { ...draft, priceKs: String(Math.min(...prices)) } : draft;
}

/**
 * The price each pricing row should carry, read from the sheet of the product it belongs to. Post rows
 * read the T-shirt sheet, because a posted T-shirt is sold at the T-shirt price. Rows without a sheet
 * price are left out, so a fill never clears a price the admin set by hand.
 */
export function fillPricesFromTable(
  data: Pick<AdminDemoData, "products" | "productPrices">,
  productId: string | null,
  rows: { key: string; options: Record<string, string> }[],
): Map<string, number> {
  const filled = new Map<string, number>();
  if (!productId) return filled;
  const product = data.products.find((entry) => entry.id === productId);
  if (!product) return filled;
  const prices = productPriceRows(data, product);
  for (const row of rows) {
    const size = row.options.size;
    if (!size) continue;
    const price = prices.find((entry) => entry.size === size)?.priceKs ?? null;
    if (price !== null) filled.set(row.key, price);
  }
  return filled;
}

/**
 * The product whose sheet a pricing scope draws from: the product itself, or the T-shirt template for a
 * T-shirt post (a posted T-shirt sells at the T-shirt sheet's prices).
 */
export function scopePriceProductId(data: Pick<AdminDemoData, "products" | "productPrices">, scope: PricingScope): string | null {
  if (scope.kind === "product") return data.products.some((product) => product.id === scope.id) ? scope.id : null;
  return data.products.find((product) => product.category === "T-Shirt")?.id ?? null;
}

/**
 * The sibling products a sheet save must reach: a price belongs to the type, so writing it on one
 * T-shirt writes it on every T-shirt. Returns the product and its siblings.
 */
export function typeMembers(data: Pick<AdminDemoData, "products">, product: AdminProduct): AdminProduct[] {
  const type = productPriceType(product);
  return data.products.filter((entry) => productPriceType(entry) === type);
}

/** Writes the sheet's staged edits through the pricing store, so history and versions stay in step. */
export function saveProductSheet(
  data: AdminDemoData,
  productId: string,
  changes: { size: string; priceKs: number; version: number }[],
  actor: string,
  at: string,
): { data: AdminDemoData; applied: number } {
  const result = applyPriceChanges(
    data,
    { kind: "product", id: productId },
    changes.map((change) => ({
      key: `${productId}::${change.size}`,
      options: { size: change.size },
      priceKs: change.priceKs,
      expectedVersion: change.version,
    })),
    actor,
    at,
  );
  if (!result.applied) return { data, applied: 0 };
  // The catalogue price follows the sheet, so a product card never shows a price the sheet dropped.
  const product = result.data.products.find((entry) => entry.id === productId);
  const lowest = product ? lowestProductPrice(result.data, product) : null;
  const products = lowest === null
    ? result.data.products
    : result.data.products.map((entry) => (entry.id === productId ? { ...entry, priceKs: lowest } : entry));
  return { data: { ...result.data, products }, applied: result.applied };
}
