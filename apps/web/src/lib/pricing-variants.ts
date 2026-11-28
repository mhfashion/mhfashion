// Pricing Management (owner spec 2026-11-21): a variant is one full specification combination
// **including its size**, and it owns its price. Prices are manual — nothing is added on top of an
// attribute — and an attribute the owner adds to a product turns into new variants (rows) and new
// columns on screen without any schema change: the attribute keys live in each row's `options` map.
//
// The store is the same `productPrices` the Price Table and the storefront read, so both views and
// the cart see one price per variant. Everything here is pure so the grid, the matrix, the CSV
// round-trip and the tests share one definition of a valid variant.

import {
  type AdminAttributeDefinition,
  type AdminAvailability,
  type AdminDemoData,
  type AdminOrderItem,
  type AdminPriceHistoryEntry,
  type AdminProduct,
  type AdminStock,
  type AdminVariantStatus,
} from "@/lib/admin-demo-data";
import { attributeChain, cascadeRules } from "@/lib/admin-attributes";
import {
  combinationLabel,
  combinationsFor,
  isValidCombination,
  MAX_COMBINATIONS,
  rowKey,
  type PricingAttribute,
  type PricingOptions,
} from "@/lib/pricing-combinations";

type AdminAttributeKey = AdminAttributeDefinition["key"];

export type VariantRow = {
  /** `attr=value|…` over the product's attribute keys, size included. */
  key: string;
  options: PricingOptions;
  size: string;
  priceKs: number | null;
  /** Typed by the admin, never converted from Ks. Null means Missing Price. */
  priceUsd: number | null;
  status: AdminVariantStatus;
  /** What the row itself says; `effectiveAvailability` folds in stock and the product/option switches. */
  availability: AdminAvailability;
  /** Ready to sell: both prices set, Active, Available, and not switched off by product or option. */
  effectiveAvailability: AdminAvailability;
  stock: AdminStock | null;
  sku: string | null;
  note: string | null;
  version: number;
  updatedAt: string | null;
};

export type VariantColumn = { key: string; label: string };

export const DEFAULT_PRICING_ATTRIBUTES = ["size"] as const;

export const AVAILABILITY_STATES: AdminAvailability[] = ["Available", "Out of Stock", "Temporarily Unavailable", "Disabled"];

/** A Ks price: whole number above zero. The dollar price allows two decimals. */
export function parseUsdInput(raw: string): { ok: true; value: number } | { ok: false; error: string } {
  const cleaned = raw.trim().replace(/^\$\s*/, "").replace(/,/g, "");
  if (!cleaned) return { ok: false, error: "Enter a USD price." };
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return { ok: false, error: "USD prices take at most two decimals." };
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return { ok: false, error: "USD prices must be more than $0." };
  return { ok: true, value: Math.round(value * 100) / 100 };
}

export const formatUsdInput = (value: number | null | undefined) => (value ? value.toFixed(2) : "");

/** A price pair is complete only when both currencies are set; one alone is Missing Price. */
export function hasFullPrice(row: Pick<VariantRow, "priceKs" | "priceUsd">): boolean {
  return row.priceKs !== null && row.priceUsd !== null;
}

/** Stock tracking answers "is it in stock", so zero quantity overrides a manual Available. */
function stockAvailability(stock: AdminStock | null | undefined, fallback: AdminAvailability): AdminAvailability {
  if (!stock?.tracking) return fallback;
  return stock.quantity > 0 ? "Available" : "Out of Stock";
}

/** The availability the customer sees, after the product switch and the option switch. */
export function effectiveAvailability(
  data: AdminDemoData,
  productId: string,
  options: PricingOptions,
  row: { status: AdminVariantStatus; availability: AdminAvailability; stock: AdminStock | null },
): AdminAvailability {
  const productSwitch = data.productAvailability?.[productId];
  if (productSwitch === "Disabled") return "Disabled";
  for (const [key, value] of Object.entries(options)) {
    const optionSwitch = data.optionAvailability?.[productId]?.[key]?.[value];
    if (optionSwitch === "Disabled") return "Disabled";
    if (optionSwitch === "Temporarily Unavailable") return "Temporarily Unavailable";
  }
  if (row.status === "Disabled" || row.availability === "Disabled") return "Disabled";
  const stock = stockAvailability(row.stock, row.availability);
  if (stock === "Out of Stock") return "Out of Stock";
  if (row.availability === "Temporarily Unavailable") return "Temporarily Unavailable";
  if (productSwitch === "Out of Stock") return "Out of Stock";
  return "Available";
}

/** What the shop may show and sell: both prices set and the customer-facing state is Available. */
export function variantSellable(row: VariantRow): boolean {
  return hasFullPrice(row) && row.effectiveAvailability === "Available";
}

/** The attributes the shop can price: the enabled chain, in display order. */
export function pricingAttributes(data: AdminDemoData): AdminAttributeDefinition[] {
  return attributeChain(data).filter((attribute) => attribute.enabled && attribute.options.length > 0);
}

/** The attribute keys one product prices; a product never prices an attribute the chain dropped. */
export function productAttributeKeys(data: AdminDemoData, product: AdminProduct): string[] {
  const available = new Set<string>(pricingAttributes(data).map((attribute) => attribute.key));
  const chosen = data.productPricingAttributes?.[product.id] ?? [...DEFAULT_PRICING_ATTRIBUTES];
  const keys = chosen.filter((key) => available.has(key));
  return (keys as AdminAttributeKey[]).includes("size") ? keys as AdminAttributeKey[] : [...keys, "size"] as AdminAttributeKey[];
}

/** The attributes behind the Table View columns, in chain order (Size always last). */
export function productPricingAttributes(data: AdminDemoData, product: AdminProduct): PricingAttribute[] {
  const keys = productAttributeKeys(data, product);
  const chain = pricingAttributes(data);
  const ordered = chain
    .filter((attribute) => keys.includes(attribute.key) && attribute.key !== "size")
    .concat(chain.filter((attribute) => attribute.key === "size"))
    // A product sells its own stocked sizes, not every size the chain knows.
    .map((attribute) => ({
      key: attribute.key,
      label: attribute.label,
      options: attribute.key === "size" ? [...product.sizes] : [...attribute.options],
    }));
  return ordered;
}

export function variantColumns(attributes: readonly PricingAttribute[]): VariantColumn[] {
  return attributes.map((attribute) => ({ key: attribute.key, label: attribute.label }));
}

function rowOptions(row: { options?: Record<string, string>; size: string }): PricingOptions {
  const options: PricingOptions = { ...(row.options ?? {}) };
  options.size = row.size;
  return options;
}

/**
 * Every valid combination a product prices, one row per size. A combination the store has no price
 * row for is still listed, so an unpriced variant shows as Incomplete instead of disappearing.
 */
export function variantRows(data: AdminDemoData, product: AdminProduct): VariantRow[] {
  const attributes = productPricingAttributes(data, product);
  const rows: VariantRow[] = [];
  for (const combination of combinationsFor(attributes, cascadeRules(data))) {
    const size = combination.options.size ?? "";
    const stored = data.productPrices.find((row) => {
      if (row.productId !== product.id) return false;
      const options = rowOptions(row);
      return Object.keys(combination.options).every((key) => options[key] === combination.options[key])
        && !Object.keys(options).some((key) => key !== "size" && !(key in combination.options));
    });
    const status = stored?.status ?? "Active";
    const availability = stored?.availability ?? "Available";
    const stock = stored?.stock ?? null;
    rows.push({
      key: combination.key,
      options: combination.options,
      size,
      priceKs: stored?.priceKs ?? null,
      priceUsd: stored?.priceUsd ?? null,
      status,
      availability,
      effectiveAvailability: effectiveAvailability(data, product.id, combination.options, { status, availability, stock }),
      stock,
      sku: stored?.sku ?? null,
      note: stored?.note ?? null,
      version: stored?.version ?? 0,
      updatedAt: stored?.updatedAt ?? null,
    });
  }
  return rows;
}

/** The variants of one specification (everything but the size), in size order — the Matrix View. */
export function matrixRows(data: AdminDemoData, product: AdminProduct, options: PricingOptions): VariantRow[] {
  const spec = Object.fromEntries(Object.entries(options).filter(([key]) => key !== "size"));
  return variantRows(data, product).filter((row) => Object.entries(spec).every(([key, value]) => row.options[key] === value));
}

/** The specifications a product has priced variants for, in attribute order. */
export function specificationGroups(data: AdminDemoData, product: AdminProduct): { key: string; options: PricingOptions; label: string }[] {
  const attributes = productPricingAttributes(data, product).filter((attribute) => attribute.key !== "size");
  const groups = new Map<string, PricingOptions>();
  for (const row of variantRows(data, product)) {
    const options = Object.fromEntries(Object.entries(row.options).filter(([key]) => key !== "size"));
    const key = rowKey(options, attributes.map((attribute) => attribute.key));
    if (!groups.has(key)) groups.set(key, options);
  }
  return [...groups.entries()].map(([key, options]) => ({ key, options, label: combinationLabel(attributes, options) }));
}

export function variantSearchText(attributes: readonly PricingAttribute[], row: VariantRow): string {
  return [
    ...attributes.map((attribute) => `${attribute.label} ${row.options[attribute.key] ?? ""}`),
    row.size,
    row.status,
    row.priceKs === null ? "incomplete" : String(row.priceKs),
  ].join(" ");
}

export type VariantChange = {
  options: PricingOptions;
  size: string;
  priceKs?: number | null;
  priceUsd?: number | null;
  status?: AdminVariantStatus;
  availability?: AdminAvailability;
  stock?: AdminStock | null;
  sku?: string;
  note?: string;
  disableReason?: string;
  expectedVersion: number;
};

export type VariantSaveResult = {
  data: AdminDemoData;
  applied: number;
  conflicts: string[];
  /** Combinations the change would duplicate are refused, never silently merged. */
  duplicates: string[];
};

const variantKey = (options: PricingOptions, size: string, keys: readonly string[]) => rowKey({ ...options, size }, keys);

function historyEntry(
  product: AdminProduct,
  change: VariantChange,
  previous: { priceKs: number | null; priceUsd: number | null; availability: AdminAvailability },
  actor: string,
  at: string,
): AdminPriceHistoryEntry {
  return {
    id: `price-history-product-${product.id}-${variantKey(change.options, change.size, ["size"])}-${at}-${Math.random().toString(36).slice(2, 7)}`,
    scopeKind: "product",
    scopeId: product.id,
    options: { ...change.options, size: change.size },
    oldPriceKs: previous.priceKs,
    newPriceKs: change.priceKs ?? previous.priceKs ?? 0,
    oldPriceUsd: previous.priceUsd,
    newPriceUsd: change.priceUsd ?? previous.priceUsd ?? null,
    oldAvailability: previous.availability,
    newAvailability: change.availability ?? previous.availability,
    note: change.note,
    actor,
    at,
  };
}

/**
 * Writes variant prices for one product. A change carrying a stale version is reported as a conflict
 * instead of overwriting another admin's save; a change that would create a second row for the same
 * combination is reported as a duplicate instead of being written.
 */
export function saveVariantChanges(
  data: AdminDemoData,
  productId: string,
  changes: readonly VariantChange[],
  actor: string,
  at: string,
): VariantSaveResult {
  const product = data.products.find((entry) => entry.id === productId);
  if (!product) return { data, applied: 0, conflicts: [], duplicates: [] };
  const keys = productAttributeKeys(data, product);
  const rows = data.productPrices.map((row) => ({ ...row }));
  const history: AdminPriceHistoryEntry[] = [];
  const conflicts: string[] = [];
  const duplicates: string[] = [];
  let applied = 0;

  for (const change of changes) {
    const options = { ...change.options, size: change.size };
    if (!isValidCombination(options, cascadeRules(data))) {
      duplicates.push(variantKey(change.options, change.size, keys));
      continue;
    }
    const at2 = rows.findIndex((row) => row.productId === productId && variantKey(rowOptions(row), row.size, keys) === variantKey(change.options, change.size, keys));
    if (at2 === -1) {
      const priceKs = change.priceKs ?? null;
      if (priceKs === null && !change.availability && !change.status) continue;
      rows.push({
        productId,
        size: change.size,
        options,
        priceKs: priceKs ?? 0,
        priceUsd: change.priceUsd ?? null,
        status: change.status ?? "Active",
        availability: change.availability ?? "Available",
        stock: change.stock ?? undefined,
        sku: change.sku,
        note: change.note,
        disableReason: change.disableReason,
        version: 1,
        updatedBy: actor,
        updatedAt: at,
      });
      history.push(historyEntry(product, change, { priceKs: null, priceUsd: null, availability: "Available" }, actor, at));
      applied += 1;
      continue;
    }
    const row = rows[at2];
    if (row.version !== change.expectedVersion) {
      conflicts.push(variantKey(change.options, change.size, keys));
      continue;
    }
    const nextAvailability = change.availability ?? (change.status === "Disabled" ? "Disabled" : row.availability ?? "Available");
    const priceChanged = (change.priceKs !== undefined && change.priceKs !== row.priceKs)
      || (change.priceUsd !== undefined && change.priceUsd !== row.priceUsd);
    const availabilityChanged = nextAvailability !== (row.availability ?? "Available");
    const metaChanged = (change.sku !== undefined && change.sku !== row.sku)
      || (change.note !== undefined && change.note !== row.note)
      || change.stock !== undefined;
    if (!priceChanged && !availabilityChanged && !metaChanged) continue;
    rows[at2] = {
      ...row,
      options,
      priceKs: change.priceKs ?? row.priceKs,
      priceUsd: change.priceUsd === undefined ? row.priceUsd ?? null : change.priceUsd,
      status: change.status ?? row.status ?? "Active",
      availability: nextAvailability,
      stock: change.stock === undefined ? row.stock : change.stock ?? undefined,
      sku: change.sku ?? row.sku,
      note: change.note ?? row.note,
      disableReason: change.disableReason ?? row.disableReason,
      version: row.version + 1,
      updatedBy: actor,
      updatedAt: at,
    };
    if (priceChanged || availabilityChanged) {
      history.push(historyEntry(product, change, {
        priceKs: row.priceKs,
        priceUsd: row.priceUsd ?? null,
        availability: row.availability ?? "Available",
      }, actor, at));
    }
    applied += 1;
  }

  if (!applied) return { data, applied: 0, conflicts, duplicates };
  const products = data.products.map((entry) => {
    if (entry.id !== productId) return entry;
    // The catalogue price is the cheapest variant a customer can actually buy.
    const sellable = rows
      .filter((row) => row.productId === productId)
      .filter((row) => (row.availability ?? "Available") === "Available" && row.priceKs > 0);
    const prices = sellable.map((row) => row.priceKs);
    return prices.length ? { ...entry, priceKs: Math.min(...prices) } : entry;
  });
  return {
    data: { ...data, products, productPrices: rows, priceHistory: [...data.priceHistory, ...history] },
    applied,
    conflicts,
    duplicates,
  };
}

/** Which attributes a product prices; the grid re-reads it and shows the new columns at once. */
export function setProductAttributes(data: AdminDemoData, productId: string, keys: readonly string[]): AdminDemoData {
  const available = new Set<string>(pricingAttributes(data).map((attribute) => attribute.key));
  const chosen = keys.filter((key) => available.has(key)) as AdminAttributeKey[];
  const next = chosen.includes("size") ? chosen : [...chosen, "size"];
  const chainOrder = pricingAttributes(data).map((attribute) => attribute.key as string);
  const ordered = chainOrder.filter((key) => next.includes(key));
  return {
    ...data,
    productPricingAttributes: { ...(data.productPricingAttributes ?? {}), [productId]: ordered },
  };
}

export function variantStatusLabel(status: AdminVariantStatus) {
  return status === "Disabled" ? "Disabled" : "Active";
}

export type PricingOverview = {
  products: number;
  productsPriced: number;
  variants: number;
  priced: number;
  incomplete: number;
  missingUsd: number;
  outOfStock: number;
  disabled: number;
  attributes: number;
  recent: AdminPriceHistoryEntry[];
};

export function pricingOverview(data: AdminDemoData): PricingOverview {
  let variants = 0;
  let priced = 0;
  let incomplete = 0;
  let disabled = 0;
  let missingUsd = 0;
  let outOfStock = 0;
  let productsPriced = 0;
  for (const product of data.products) {
    const rows = variantRows(data, product);
    const complete = rows.filter((row) => hasFullPrice(row)).length;
    variants += rows.length;
    priced += complete;
    incomplete += rows.length - complete;
    missingUsd += rows.filter((row) => row.priceUsd === null).length;
    outOfStock += rows.filter((row) => row.effectiveAvailability === "Out of Stock").length;
    disabled += rows.filter((row) => row.effectiveAvailability === "Disabled").length;
    if (complete) productsPriced += 1;
  }
  return {
    products: data.products.length,
    productsPriced,
    variants,
    priced,
    incomplete,
    missingUsd,
    outOfStock,
    disabled,
    attributes: pricingAttributes(data).length,
    recent: [...data.priceHistory].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 8),
  };
}

/** Every price change, newest first, with the product name the history row belongs to. */
export function pricingHistory(data: AdminDemoData, filter: { search?: string; productId?: string } = {}) {
  const search = (filter.search ?? "").trim().toLowerCase();
  return [...data.priceHistory]
    .filter((entry) => entry.scopeKind === "product")
    .filter((entry) => !filter.productId || entry.scopeId === filter.productId)
    .filter((entry) => {
      if (!search) return true;
      const product = data.products.find((item) => item.id === entry.scopeId)?.name ?? entry.scopeId;
      const spec = Object.entries(entry.options ?? {}).map(([key, value]) => `${key} ${value}`).join(" ");
      return `${product} ${spec} ${entry.actor} ${entry.note ?? ""} ${entry.newAvailability ?? ""}`.toLowerCase().includes(search);
    })
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

/** CSV of the given variants: one line per specification and size, so it round-trips into the grid. */
export function buildVariantCsv(attributes: readonly PricingAttribute[], rows: readonly VariantRow[]): string {
  const escape = (value: string | number) => {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const header = [
    "Specification",
    ...attributes.map((attribute) => attribute.label),
    "Status",
    "MMK Price",
    "USD Price",
    "Availability",
    "SKU",
    "Updated At",
  ];
  const lines = rows.map((row) => [
    combinationLabel(attributes, row.options),
    ...attributes.map((attribute) => row.options[attribute.key] ?? ""),
    row.status,
    row.priceKs ?? "",
    row.priceUsd === null ? "" : row.priceUsd.toFixed(2),
    row.effectiveAvailability,
    row.sku ?? "",
    row.updatedAt ?? "",
  ].map(escape).join(","));
  return [header.join(","), ...lines].join("\n");
}

export const MAX_VARIANT_CSV_ROWS = MAX_COMBINATIONS;

/** The sizes a product stocks; a removed size loses its rows, an added size starts unpriced. */
export function setProductSizes(data: AdminDemoData, productId: string, sizes: readonly string[]): AdminDemoData {
  const next = [...new Set(sizes.map((size) => size.trim()).filter(Boolean))];
  if (!next.length) return data;
  return {
    ...data,
    products: data.products.map((product) => (product.id === productId ? { ...product, sizes: next } : product)),
    productPrices: data.productPrices.filter((row) => row.productId !== productId || next.includes(row.size)),
  };
}

/** Product-wide switch: one product stops selling without touching any variant row. */
export function setProductAvailability(data: AdminDemoData, productId: string, state: AdminAvailability): AdminDemoData {
  return { ...data, productAvailability: { ...(data.productAvailability ?? {}), [productId]: state } };
}

/** Option switch: "stop selling Black" disables every variant that carries it, keeping the rows. */
export function setOptionAvailability(
  data: AdminDemoData,
  productId: string,
  attribute: string,
  option: string,
  state: AdminAvailability,
): AdminDemoData {
  const product = data.optionAvailability?.[productId] ?? {};
  const attributeSwitches = product[attribute] ?? {};
  return {
    ...data,
    optionAvailability: {
      ...(data.optionAvailability ?? {}),
      [productId]: { ...product, [attribute]: { ...attributeSwitches, [option]: state } },
    },
  };
}

/** Turning tracking on keeps the manual availability until a quantity is entered. */
export function setStockTracking(data: AdminDemoData, productId: string, tracking: boolean): AdminDemoData {
  return { ...data, stockTracking: { ...(data.stockTracking ?? {}), [productId]: tracking } };
}

export function stockTrackingOn(data: AdminDemoData, productId: string): boolean {
  return data.stockTracking?.[productId] === true;
}

export type VariantFilter = {
  availability?: AdminAvailability | "all";
  status?: AdminVariantStatus | "all" | "missing";
  missingPrice?: boolean;
  minKs?: number | null;
  maxKs?: number | null;
  minUsd?: number | null;
  maxUsd?: number | null;
};

/** The Table View's filters, applied to the rows the model produced. */
export function filterVariants(rows: readonly VariantRow[], filter: VariantFilter): VariantRow[] {
  return rows.filter((row) => {
    if (filter.availability && filter.availability !== "all" && row.effectiveAvailability !== filter.availability) return false;
    if (filter.status === "missing") {
      if (hasFullPrice(row)) return false;
    } else if (filter.status && filter.status !== "all" && row.status !== filter.status) return false;
    if (filter.missingPrice && hasFullPrice(row)) return false;
    if (filter.minKs !== null && filter.minKs !== undefined && (row.priceKs === null || row.priceKs < filter.minKs)) return false;
    if (filter.maxKs !== null && filter.maxKs !== undefined && (row.priceKs === null || row.priceKs > filter.maxKs)) return false;
    if (filter.minUsd !== null && filter.minUsd !== undefined && (row.priceUsd === null || row.priceUsd < filter.minUsd)) return false;
    if (filter.maxUsd !== null && filter.maxUsd !== undefined && (row.priceUsd === null || row.priceUsd > filter.maxUsd)) return false;
    return true;
  });
}

export type VariantSort = "default" | "mmk-asc" | "mmk-desc" | "usd-asc" | "usd-desc" | "updated";

export function sortVariants(rows: readonly VariantRow[], sort: VariantSort): VariantRow[] {
  const copy = [...rows];
  const num = (value: number | null) => (value === null ? Number.POSITIVE_INFINITY : value);
  if (sort === "mmk-asc") return copy.sort((a, b) => num(a.priceKs) - num(b.priceKs));
  if (sort === "mmk-desc") return copy.sort((a, b) => num(b.priceKs) - num(a.priceKs));
  if (sort === "usd-asc") return copy.sort((a, b) => num(a.priceUsd) - num(b.priceUsd));
  if (sort === "usd-desc") return copy.sort((a, b) => num(b.priceUsd) - num(a.priceUsd));
  if (sort === "updated") {
    return copy.sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime());
  }
  return copy;
}

/** What a post hands to the Price Table: its spec attributes and the price of each combination. */
export type PostPricingInput = {
  productId?: string;
  status: "Draft" | "Published";
  attributes: { key: string; label: string; options: string[]; enabled: boolean }[];
  prices: { options: Record<string, string | undefined>; priceKs: number }[];
};

/**
 * Posting a design hooks it to the Price Table: the product starts pricing the post's specifications,
 * and every combination the post priced gets a variant row per stocked size seeded from that price.
 * An existing price is never overwritten — the console only fills what is still missing — and the
 * USD price stays empty (Missing price) until the owner types one.
 */
export function syncPostPricing(data: AdminDemoData, post: PostPricingInput): { data: AdminDemoData; seeded: number; issues: string[] } {
  const issues: string[] = [];
  const product = data.products.find((entry) => entry.id === post.productId);
  if (post.status !== "Published") return { data, seeded: 0, issues };
  if (!product) {
    if (post.productId) issues.push("The linked product no longer exists.");
    return { data, seeded: 0, issues };
  }

  const known = new Set<string>(pricingAttributes(data).map((attribute) => attribute.key));
  const postKeys = post.attributes.filter((attribute) => attribute.enabled && attribute.options.length).map((attribute) => attribute.key);
  const missingKeys = postKeys.filter((key) => !known.has(key));
  if (missingKeys.length) issues.push(`The post uses ${missingKeys.join(", ")}, which the Price Table does not define.`);

  const usable = postKeys.filter((key) => known.has(key) && key !== "size");
  const nextKeys = [...new Set([...productAttributeKeys(data, product), ...usable])];
  const withAttributes = nextKeys.length === productAttributeKeys(data, product).length
    ? data
    : setProductAttributes(data, product.id, nextKeys);

  // A price the owner already set is never touched: only variants with no stored row are seeded.
  const hasStored = (options: PricingOptions, size: string) => withAttributes.productPrices.some((row) => {
    if (row.productId !== product.id || row.size !== size) return false;
    const stored = rowOptions(row);
    return Object.keys(options).every((key) => key === "size" || stored[key] === options[key]);
  });

  const changes: VariantChange[] = [];
  for (const row of post.prices) {
    if (!(row.priceKs > 0)) continue;
    const options: PricingOptions = {};
    for (const key of usable) {
      const value = row.options[key];
      if (value) options[key] = value;
    }
    for (const size of product.sizes) {
      if (hasStored(options, size)) continue;
      changes.push({ options, size, priceKs: row.priceKs, expectedVersion: 0 });
    }
  }
  if (!changes.length) return { data: withAttributes, seeded: 0, issues };

  const result = saveVariantChanges(withAttributes, product.id, changes, "Post", new Date().toISOString());
  return { data: result.data, seeded: result.applied, issues };
}

/** The order item fields that name a variant attribute, mapped to the chain's option labels. */
export function orderItemOptions(item: AdminOrderItem): PricingOptions {
  const options: PricingOptions = { size: item.size || "" };
  if (item.color) options.color = item.color;
  if (item.material) options.material = item.material;
  if (item.fit) options.fit = item.fit;
  if (item.sleeve) options.sleeve = item.sleeve;
  if (item.printMethod) options.print = item.printMethod;
  if (typeof item.gsm === "number" && item.gsm > 0) options.gsm = `${item.gsm} GSM`;
  return options;
}

/** The variant a sold line names: it matches on every key the line can name, preferring a full match. */
export function variantRowForItem(data: AdminDemoData, item: AdminOrderItem): VariantRow | null {
  const product = data.products.find((entry) => entry.id === item.productId);
  if (!product) return null;
  const wanted = orderItemOptions(item);
  const keys = Object.keys(wanted);
  const candidates = variantRows(data, product).filter((row) => keys.every((key) => row.options[key] === wanted[key]));
  if (!candidates.length) return null;
  return candidates.find((row) => Object.keys(row.options).length === keys.length) ?? candidates[0];
}

const rowKeyOf = (options: PricingOptions) => Object.entries(options).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join("|");

/**
 * A sale moves the variant's own stock when its product tracks stock. The Inventory module keeps
 * blank-garment counts; this keeps the Price Table's per-variant figure, and a refund puts it back.
 * A caller passes "take" once per paid order and "restore" once per refund or cancellation.
 */
export function applyVariantStockForOrder(
  data: AdminDemoData,
  orderId: string,
  direction: "take" | "restore",
): { data: AdminDemoData; moved: { key: string; quantity: number }[] } {
  const order = data.orders.find((entry) => entry.id === orderId);
  if (!order) return { data, moved: [] };
  // The stamp keeps a replayed payment from taking the stock twice, and a second refund from adding it.
  if (direction === "take" && order.variantStockConsumedAt && !order.variantStockRestoredAt) return { data, moved: [] };
  if (direction === "restore" && (!order.variantStockConsumedAt || order.variantStockRestoredAt)) return { data, moved: [] };
  const at = new Date().toISOString();

  const wanted = new Map<string, { productId: string; options: PricingOptions; quantity: number }>();
  for (const item of order.items) {
    const row = variantRowForItem(data, item);
    if (!row?.stock?.tracking) continue;
    const key = `${item.productId}|${rowKeyOf(row.options)}`;
    const existing = wanted.get(key);
    const quantity = Math.max(1, item.quantity);
    if (existing) existing.quantity += quantity;
    else wanted.set(key, { productId: item.productId, options: row.options, quantity });
  }
  if (!wanted.size) return { data, moved: [] };

  const moved: { key: string; quantity: number }[] = [];
  const productPrices = data.productPrices.map((row) => {
    const key = `${row.productId}|${rowKeyOf(rowOptions(row))}`;
    const line = wanted.get(key);
    if (!line?.quantity || !row.stock?.tracking) return row;
    const nextQuantity = direction === "take"
      ? Math.max(0, row.stock.quantity - line.quantity)
      : row.stock.quantity + line.quantity;
    if (nextQuantity === row.stock.quantity) return row;
    moved.push({ key, quantity: nextQuantity - row.stock.quantity });
    return {
      ...row,
      stock: { ...row.stock, quantity: nextQuantity },
      availability: nextQuantity > 0 ? row.availability : "Out of Stock",
      version: row.version + 1,
      updatedAt: new Date().toISOString(),
    };
  });
  const orders = data.orders.map((entry) => (entry.id === orderId
    ? {
      ...entry,
      ...(direction === "take"
        ? { variantStockConsumedAt: at, variantStockRestoredAt: undefined }
        : { variantStockRestoredAt: at }),
    }
    : entry));
  return { data: { ...data, productPrices, orders }, moved };
}
