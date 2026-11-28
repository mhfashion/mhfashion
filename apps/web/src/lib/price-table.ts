// The Price Table is one card per product type (T-Shirt, Hoodie, Phone Cover...), and inside it one
// box per **spec** the shop makes — Combed Cotton 160 GSM is a different box from Cotton 220 GSM, and
// each box carries its own prices. A price therefore belongs to what the shop makes, not to a
// catalogue row: every product with that spec reads the same box, and posting never types a price.
import { APPAREL_CATEGORIES } from "@/lib/admin-demo-data";
import type {
  AdminDemoData,
  AdminProduct,
  AdminProductDraft,
} from "@/lib/admin-demo-data";
import { applyPriceChanges, type PricingScope } from "@/lib/admin-pricing";

export type ProductSheetPrice = { size: string; priceKs: number | null; version: number };

/** One spec of a type, with its own prices — the box the owner fills in. */
export type ProductSpecBox = {
  /** `type::spec` — the key its price cells use. */
  key: string;
  type: string;
  specKey: string;
  /** Every product made to this spec; they share the box's prices. */
  products: AdminProduct[];
  /** The product the spec block reads from. */
  product: AdminProduct;
  prices: ProductSheetPrice[];
  priced: number;
  total: number;
};

export type ProductSheet = {
  type: string;
  boxes: ProductSpecBox[];
  priced: number;
  total: number;
};

/**
 * What a price belongs to: a T-shirt, a hoodie, a phone cover — not one catalogue row. Apparel is
 * priced by its category, so Classic and Oversized T-shirts live on the T-shirt card; everything else
 * by its own name, because a phone cover and a tote bag are not the same thing to make.
 */
export function productPriceType(product: AdminProduct): string {
  return APPAREL_CATEGORIES.includes(product.category) ? product.category : product.name.trim();
}

/** The spec a price belongs to: fabric, weight, print method, knit, cuttings and colours. */
export function productSpecKey(product: AdminProduct): string {
  return [
    product.printMethod ?? "",
    product.fabric,
    product.knitStructure ?? "",
    product.cuttings ?? "",
    product.gsm ? String(product.gsm) : "",
    (product.colors ?? []).join(","),
  ].map((part) => part.trim().toLowerCase()).join("|");
}

/** The labelled spec block the owner sees above the sizes — same order as the product sheet. */
export function productSpec(product: AdminProduct, products?: readonly AdminProduct[]): { label: string; value: string }[] {
  return [
    { label: "Product", value: (products?.length ? products : [product]).map((entry) => entry.name).join(", ") },
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

/** One box per spec, in catalogue order; products with an identical spec share a box. */
export function specBoxes(
  data: Pick<AdminDemoData, "products" | "productPrices">,
  type: string,
): ProductSpecBox[] {
  const boxes: ProductSpecBox[] = [];
  for (const product of data.products.filter((entry) => productPriceType(entry) === type)) {
    const specKey = productSpecKey(product);
    const existing = boxes.find((box) => box.specKey === specKey);
    if (existing) {
      existing.products.push(product);
      continue;
    }
    const prices = productPriceRows(data, product);
    boxes.push({
      key: `${type}::${specKey}`,
      type,
      specKey,
      products: [product],
      product,
      prices,
      priced: prices.filter((row) => row.priceKs !== null).length,
      total: prices.length,
    });
  }
  return boxes;
}

/** One card per product type, each holding a box per spec the shop makes. */
export function productSheets(data: Pick<AdminDemoData, "products" | "productPrices">): ProductSheet[] {
  const types: string[] = [];
  for (const product of data.products) {
    const type = productPriceType(product);
    if (!types.includes(type)) types.push(type);
  }
  return types.map((type) => {
    const boxes = specBoxes(data, type);
    return {
      type,
      boxes,
      priced: boxes.reduce((total, box) => total + box.priced, 0),
      total: boxes.reduce((total, box) => total + box.total, 0),
    };
  });
}

/** The box a product is sold from: the spec it is made to. */
export function productBox(data: Pick<AdminDemoData, "products" | "productPrices">, product: AdminProduct): ProductSpecBox | null {
  return specBoxes(data, productPriceType(product)).find((box) => box.specKey === productSpecKey(product)) ?? null;
}

/** The size prices of a box — what its products are listed from. */
export function boxPrices(data: Pick<AdminDemoData, "products" | "productPrices">, boxKey: string): ProductSheetPrice[] {
  for (const sheet of productSheets(data)) {
    const box = sheet.boxes.find((entry) => entry.key === boxKey);
    if (box) return box.prices;
  }
  return [];
}

/** The type a new product will read its prices from, before it exists in the catalogue. */
export function draftPriceType(draft: Pick<AdminProductDraft, "category" | "name">): string {
  return APPAREL_CATEGORIES.includes(draft.category) ? draft.category : draft.name.trim();
}

/** What a draft says about its spec; the spec fields are optional until the form fills them. */
export type DraftSpec = Pick<AdminProductDraft, "category" | "name" | "fabric" | "gsm">
  & Partial<Pick<AdminProduct, "printMethod" | "knitStructure" | "cuttings" | "colors">>;

/** The spec a draft will be made to, so posting can read the matching box. */
export function draftSpecKey(draft: DraftSpec): string {
  return [
    draft.printMethod ?? "",
    draft.fabric ?? "",
    draft.knitStructure ?? "",
    draft.cuttings ?? "",
    draft.gsm ?? "",
    (draft.colors ?? []).join(","),
  ].map((part) => part.trim().toLowerCase()).join("|");
}

export function priceSheetSummary(sheets: readonly ProductSheet[]) {
  return sheets.reduce(
    (total, sheet) => ({ priced: total.priced + sheet.priced, total: total.total + sheet.total }),
    { priced: 0, total: 0 },
  );
}

/**
 * The box a draft reads: its own spec when the Price Table prices it, otherwise the first priced box of
 * its type (a new Cotton tee starts on the T-shirt card), otherwise the first priced box of its
 * category. Posting therefore never asks for a price — it reads a box the owner already filled.
 */
export function templatePrices(
  data: Pick<AdminDemoData, "products" | "productPrices">,
  draft: DraftSpec,
): ProductSheetPrice[] {
  const type = draftPriceType(draft);
  const own = specBoxes(data, type);
  const exact = own.find((box) => box.specKey === draftSpecKey(draft));
  if (exact && exact.priced) return exact.prices;

  const box = own.find((entry) => entry.priced)
    ?? productSheets(data).find((sheet) => sheet.boxes.some((entry) => entry.priced && entry.product.category === draft.category))
      ?.boxes.find((entry) => entry.priced && entry.product.category === draft.category);
  if (box) return box.prices;
  return exact?.prices ?? [];
}

/** A saved draft takes its box's lowest price as its catalogue price; nothing is typed. */
export function draftWithTablePrice(
  draft: AdminProductDraft,
  data: Pick<AdminDemoData, "products" | "productPrices">,
): AdminProductDraft {
  const prices = templatePrices(data, draft)
    .map((row) => row.priceKs)
    .filter((price): price is number => price !== null);
  return prices.length ? { ...draft, priceKs: String(Math.min(...prices)) } : draft;
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
 * The products a box save must reach: a price belongs to the spec, so writing it on one Combed Cotton
 * tee writes it on every product made to that spec — and on nothing else.
 */
export function boxMembers(data: Pick<AdminDemoData, "products">, product: AdminProduct): AdminProduct[] {
  const type = productPriceType(product);
  const specKey = productSpecKey(product);
  return data.products.filter((entry) => productPriceType(entry) === type && productSpecKey(entry) === specKey);
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
