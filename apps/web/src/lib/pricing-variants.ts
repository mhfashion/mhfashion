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
  type AdminDemoData,
  type AdminPriceHistoryEntry,
  type AdminProduct,
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
  status: AdminVariantStatus;
  version: number;
  updatedAt: string | null;
};

export type VariantColumn = { key: string; label: string };

export const DEFAULT_PRICING_ATTRIBUTES = ["size"] as const;

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
    rows.push({
      key: combination.key,
      options: combination.options,
      size,
      priceKs: stored?.priceKs ?? null,
      status: stored?.status ?? "Active",
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
  priceKs: number | null;
  status?: AdminVariantStatus;
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
  previous: number | null,
  actor: string,
  at: string,
): AdminPriceHistoryEntry {
  return {
    id: `price-history-product-${product.id}-${variantKey(change.options, change.size, ["size"])}-${at}`,
    scopeKind: "product",
    scopeId: product.id,
    options: { ...change.options, size: change.size },
    oldPriceKs: previous,
    newPriceKs: change.priceKs ?? previous ?? 0,
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
      if (change.priceKs === null) continue;
      rows.push({
        productId,
        size: change.size,
        options,
        priceKs: change.priceKs,
        status: change.status ?? "Active",
        version: 1,
        updatedBy: actor,
        updatedAt: at,
      });
      history.push(historyEntry(product, change, null, actor, at));
      applied += 1;
      continue;
    }
    const row = rows[at2];
    if (row.version !== change.expectedVersion) {
      conflicts.push(variantKey(change.options, change.size, keys));
      continue;
    }
    if (change.priceKs === null && (change.status ?? row.status) === (row.status ?? "Active")) continue;
    rows[at2] = {
      ...row,
      options,
      priceKs: change.priceKs ?? row.priceKs,
      status: change.status ?? row.status ?? "Active",
      version: row.version + 1,
      updatedBy: actor,
      updatedAt: at,
    };
    if (change.priceKs !== null && change.priceKs !== row.priceKs) history.push(historyEntry(product, change, row.priceKs, actor, at));
    applied += 1;
  }

  if (!applied) return { data, applied: 0, conflicts, duplicates };
  const products = data.products.map((entry) => {
    if (entry.id !== productId) return entry;
    const prices = rows.filter((row) => row.productId === productId).map((row) => row.priceKs).filter((price) => price > 0);
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
  disabled: number;
  attributes: number;
  recent: AdminPriceHistoryEntry[];
};

export function pricingOverview(data: AdminDemoData): PricingOverview {
  let variants = 0;
  let priced = 0;
  let incomplete = 0;
  let disabled = 0;
  let productsPriced = 0;
  for (const product of data.products) {
    const rows = variantRows(data, product);
    const complete = rows.filter((row) => row.priceKs !== null).length;
    variants += rows.length;
    priced += complete;
    incomplete += rows.length - complete;
    disabled += rows.filter((row) => row.status === "Disabled").length;
    if (complete) productsPriced += 1;
  }
  return {
    products: data.products.length,
    productsPriced,
    variants,
    priced,
    incomplete,
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
      return `${product} ${spec} ${entry.actor}`.toLowerCase().includes(search);
    })
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

/** CSV of the given variants: one line per specification and size, so it round-trips into the grid. */
export function buildVariantCsv(attributes: readonly PricingAttribute[], rows: readonly VariantRow[]): string {
  const escape = (value: string | number) => {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const header = ["Specification", ...attributes.map((attribute) => attribute.label), "Status", "Price (Ks)"];
  const lines = rows.map((row) => [
    combinationLabel(attributes, row.options),
    ...attributes.map((attribute) => row.options[attribute.key] ?? ""),
    row.status,
    row.priceKs ?? "",
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
