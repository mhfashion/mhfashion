// Pricing Management store (Plan §4.5.1). A price belongs to one full valid combination:
// post scope reads and writes the post's own `prices` rows (one source of truth for the Posts
// editor and the pricing grid), product scope reads `productPrices` (one row per stocked size).
// Every applied change appends to `priceHistory`, and a save that carries a stale version is
// rejected instead of overwriting another admin's change.

import {
  TSHIRT_POST_ATTRIBUTES,
  type AdminDemoData,
  type AdminPriceHistoryEntry,
  type AdminTshirtPost,
  type AdminTshirtPostAttributeKey,
} from "@/lib/admin-demo-data";
import {
  combinationsFor,
  rowKey,
  type PricingAttribute,
  type PricingOptions,
  type PricingRow,
} from "@/lib/pricing-combinations";

export type PricingScopeKind = "post" | "product";
export type PricingScope = { kind: PricingScopeKind; id: string };

export type PricingScopeOption = PricingScope & {
  label: string;
  hint: string;
  combinationCount: number;
};

export type PriceChange = {
  key: string;
  options: PricingOptions;
  priceKs: number;
  /** Version the grid loaded; the row is only written when the store still holds it. */
  expectedVersion: number;
};

export type PriceChangeResult = {
  data: AdminDemoData;
  applied: number;
  conflicts: string[];
};

const ATTRIBUTE_ORDER = TSHIRT_POST_ATTRIBUTES.map((attribute) => attribute.key);

function postAttributeOrder(key: AdminTshirtPostAttributeKey) {
  const at = ATTRIBUTE_ORDER.indexOf(key);
  return at === -1 ? ATTRIBUTE_ORDER.length : at;
}

function findPost(data: AdminDemoData, id: string) {
  return data.tshirtPosts.find((post) => post.id === id) ?? null;
}

export function pricingScopes(data: AdminDemoData): PricingScopeOption[] {
  const posts = data.tshirtPosts.map((post) => ({
    kind: "post" as const,
    id: post.id,
    label: post.title,
    hint: post.status === "Published" ? "T-shirt post · Published" : `T-shirt post · ${post.status}`,
    combinationCount: scopeRows(data, { kind: "post", id: post.id }).length,
  }));
  const products = data.products.map((product) => ({
    kind: "product" as const,
    id: product.id,
    label: product.name,
    hint: `${product.category} · ${product.sizes.length} size${product.sizes.length === 1 ? "" : "s"}`,
    combinationCount: product.sizes.length,
  }));
  return [...posts, ...products];
}

/** The attributes a scope prices. A post prices its enabled attributes; a product prices its sizes. */
export function scopeAttributes(data: AdminDemoData, scope: PricingScope): PricingAttribute[] {
  if (scope.kind === "product") {
    const product = data.products.find((entry) => entry.id === scope.id);
    if (!product) return [];
    return [{ key: "size", label: "Size", options: product.sizes }];
  }
  const post = findPost(data, scope.id);
  if (!post) return [];
  return [...post.attributes]
    .sort((a, b) => postAttributeOrder(a.key) - postAttributeOrder(b.key))
    .map((attribute) => ({
      key: attribute.key,
      label: TSHIRT_POST_ATTRIBUTES.find((known) => known.key === attribute.key)?.label ?? attribute.label,
      options: attribute.options,
    }));
}

export function scopeRows(data: AdminDemoData, scope: PricingScope): PricingRow[] {
  return combinationsFor(scopeAttributes(data, scope));
}

export function scopeLabel(data: AdminDemoData, scope: PricingScope): string {
  if (scope.kind === "product") {
    return data.products.find((entry) => entry.id === scope.id)?.name ?? scope.id;
  }
  return findPost(data, scope.id)?.title ?? scope.id;
}

function postRowKey(keys: readonly string[], options: Partial<Record<string, string>>): string {
  return rowKey(options as PricingOptions, keys);
}

/** Priced rows for the scope, keyed the same way `scopeRows` keys its rows. */
export function scopePrices(data: AdminDemoData, scope: PricingScope): Map<string, number> {
  const keys = scopeAttributes(data, scope).map((attribute) => attribute.key);
  if (scope.kind === "product") {
    const rows = data.productPrices.filter((row) => row.productId === scope.id);
    return new Map(rows.map((row) => [postRowKey(keys, { size: row.size }), row.priceKs]));
  }
  const post = findPost(data, scope.id);
  if (!post) return new Map();
  return new Map(post.prices.map((row) => [postRowKey(keys, row.options), row.priceKs]));
}

export function scopeVersions(data: AdminDemoData, scope: PricingScope): Map<string, number> {
  const keys = scopeAttributes(data, scope).map((attribute) => attribute.key);
  if (scope.kind === "product") {
    const rows = data.productPrices.filter((row) => row.productId === scope.id);
    return new Map(rows.map((row) => [postRowKey(keys, { size: row.size }), row.version]));
  }
  const post = findPost(data, scope.id);
  if (!post) return new Map();
  return new Map(post.prices.map((row) => [postRowKey(keys, row.options), row.version ?? 1]));
}

export function scopeHistory(data: AdminDemoData, scope: PricingScope): AdminPriceHistoryEntry[] {
  return data.priceHistory
    .filter((entry) => entry.scopeKind === scope.kind && entry.scopeId === scope.id)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

function nextPriceRowId(post: AdminTshirtPost): string {
  let index = post.prices.length + 1;
  const taken = new Set(post.prices.map((row) => row.id));
  while (taken.has(`price-${post.id}-${index}`)) index += 1;
  return `price-${post.id}-${index}`;
}

export function applyPriceChanges(
  data: AdminDemoData,
  scope: PricingScope,
  changes: readonly PriceChange[],
  actor: string,
  at: string,
): PriceChangeResult {
  const keys = scopeAttributes(data, scope).map((attribute) => attribute.key);
  const conflicts: string[] = [];
  const applied: PriceChange[] = [];

  if (scope.kind === "product") {
    const rows = data.productPrices.map((row) => ({ ...row }));
    for (const change of changes) {
      const size = change.options.size ?? "";
      const at2 = rows.findIndex((row) => row.productId === scope.id && row.size === size);
      if (at2 === -1) {
        rows.push({ productId: scope.id, size, priceKs: change.priceKs, version: 1, updatedBy: actor, updatedAt: at });
        applied.push(change);
        continue;
      }
      if (rows[at2].version !== change.expectedVersion) {
        conflicts.push(change.key);
        continue;
      }
      rows[at2] = { ...rows[at2], priceKs: change.priceKs, version: rows[at2].version + 1, updatedBy: actor, updatedAt: at };
      applied.push(change);
    }
    if (!applied.length) return { data, applied: 0, conflicts };
    return {
      data: {
        ...data,
        productPrices: rows,
        priceHistory: [...data.priceHistory, ...historyFor(data, scope, applied, actor, at)],
      },
      applied: applied.length,
      conflicts,
    };
  }

  const post = findPost(data, scope.id);
  if (!post) return { data, applied: 0, conflicts: changes.map((change) => change.key) };
  const prices = post.prices.map((row) => ({ ...row }));
  for (const change of changes) {
    const key = postRowKey(keys, change.options);
    const at2 = prices.findIndex((row) => postRowKey(keys, row.options) === key);
    if (at2 === -1) {
      prices.push({ id: nextPriceRowId(post), options: change.options, priceKs: change.priceKs, version: 1, updatedBy: actor, updatedAt: at });
      applied.push(change);
      continue;
    }
    if ((prices[at2].version ?? 1) !== change.expectedVersion) {
      conflicts.push(change.key);
      continue;
    }
    prices[at2] = {
      ...prices[at2],
      priceKs: change.priceKs,
      version: (prices[at2].version ?? 1) + 1,
      updatedBy: actor,
      updatedAt: at,
    };
    applied.push(change);
  }
  if (!applied.length) return { data, applied: 0, conflicts };
  return {
    data: {
      ...data,
      tshirtPosts: data.tshirtPosts.map((entry) => (entry.id === post.id ? { ...entry, prices } : entry)),
      priceHistory: [...data.priceHistory, ...historyFor(data, scope, applied, actor, at)],
    },
    applied: applied.length,
    conflicts,
  };
}

function historyFor(
  data: AdminDemoData,
  scope: PricingScope,
  changes: readonly PriceChange[],
  actor: string,
  at: string,
): AdminPriceHistoryEntry[] {
  const before = scopePrices(data, scope);
  return changes.map((change) => ({
    id: `price-history-${scope.kind}-${scope.id}-${change.key}-${at}`,
    scopeKind: scope.kind,
    scopeId: scope.id,
    options: change.options as Partial<Record<AdminTshirtPostAttributeKey, string>>,
    oldPriceKs: before.get(change.key) ?? null,
    newPriceKs: change.priceKs,
    actor,
    at,
  }));
}
