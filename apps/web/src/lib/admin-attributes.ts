// Attribute Management (Plan §16 P2). The chain is the canonical §4.1 vocabulary: order, labels and
// the option list that new posts and the pricing grid offer. A change is refused when it would strip
// an option that an existing priced combination depends on, so the price book cannot be orphaned.

import {
  TSHIRT_POST_ATTRIBUTES,
  createSeedAttributeChain,
  type AdminAttributeDefinition,
  type AdminDemoData,
  type AdminTshirtPostAttribute,
  type AdminTshirtPostAttributeKey,
} from "@/lib/admin-demo-data";

export type ChainIssue = { key: AdminTshirtPostAttributeKey; message: string };

export function attributeChain(data: AdminDemoData): AdminAttributeDefinition[] {
  return data.attributeChain?.length ? data.attributeChain : createSeedAttributeChain();
}

/** The chain in the shape `tshirtPostDraftFrom` expects. */
export function chainAsPostAttributes(data: AdminDemoData): AdminTshirtPostAttribute[] {
  return attributeChain(data)
    .filter((attribute) => attribute.enabled && attribute.options.length > 0)
    .map((attribute) => ({ key: attribute.key, label: attribute.label, options: [...attribute.options] }));
}

export function chainLabel(data: AdminDemoData, key: AdminTshirtPostAttributeKey): string {
  return attributeChain(data).find((attribute) => attribute.key === key)?.label
    ?? TSHIRT_POST_ATTRIBUTES.find((attribute) => attribute.key === key)?.label
    ?? key;
}

export function chainOrder(data: AdminDemoData): AdminTshirtPostAttributeKey[] {
  return attributeChain(data).map((attribute) => attribute.key);
}

/** Where an option is still in use: priced post rows, and unpriced post options. */
export function chainUsage(
  data: AdminDemoData,
  key: AdminTshirtPostAttributeKey,
  option: string,
): { pricedPosts: string[]; pricedRows: number; draftPosts: string[] } {
  const pricedPosts: string[] = [];
  const draftPosts: string[] = [];
  let pricedRows = 0;
  for (const post of data.tshirtPosts) {
    const attribute = post.attributes.find((entry) => entry.key === key);
    if (!attribute?.options.includes(option)) continue;
    const rows = post.prices.filter((row) => row.options[key] === option);
    if (rows.length) {
      pricedPosts.push(post.title);
      pricedRows += rows.length;
    } else {
      draftPosts.push(post.title);
    }
  }
  return { pricedPosts, pricedRows, draftPosts };
}

export function chainIssues(data: AdminDemoData): ChainIssue[] {
  const chain = attributeChain(data);
  const issues: ChainIssue[] = [];
  const seen = new Map<string, AdminTshirtPostAttributeKey>();
  for (const attribute of chain) {
    const label = attribute.label.trim().toLowerCase();
    if (!label) issues.push({ key: attribute.key, message: "The label cannot be empty." });
    else if (seen.has(label)) issues.push({ key: attribute.key, message: `The label "${attribute.label}" is already used by another attribute.` });
    else seen.set(label, attribute.key);
    if (!attribute.options.length) issues.push({ key: attribute.key, message: "An enabled attribute needs at least one option." });
    if (new Set(attribute.options).size !== attribute.options.length) {
      issues.push({ key: attribute.key, message: "Two options share the same name." });
    }
  }
  return issues;
}

export type ChainPatch = {
  label?: string;
  options?: string[];
  enabled?: boolean;
};

/**
 * Applies one attribute change. Returns the untouched data plus issues when the change would
 * orphan a price row; the caller shows those instead of writing.
 */
export function applyChainPatch(
  data: AdminDemoData,
  key: AdminTshirtPostAttributeKey,
  patch: ChainPatch,
): { data: AdminDemoData; issues: string[] } {
  const chain = attributeChain(data);
  const current = chain.find((attribute) => attribute.key === key);
  if (!current) return { data, issues: [`Unknown attribute "${key}".`] };
  const issues: string[] = [];

  const label = patch.label === undefined ? current.label : patch.label.trim();
  if (!label) issues.push("The label cannot be empty.");
  const clash = chain.find((attribute) => attribute.key !== key && attribute.label.trim().toLowerCase() === label.toLowerCase());
  if (clash) issues.push(`"${label}" is already the ${clash.label} label.`);

  const options = patch.options === undefined ? current.options : [...new Set(patch.options.map((option) => option.trim()).filter(Boolean))];
  if (!options.length) issues.push("Keep at least one option.");
  for (const option of current.options) {
    if (options.includes(option)) continue;
    const usage = chainUsage(data, key, option);
    if (usage.pricedRows) {
      issues.push(`"${option}" still prices ${usage.pricedRows} row${usage.pricedRows === 1 ? "" : "s"} in ${usage.pricedPosts.join(", ")}. Change those prices first.`);
    }
  }

  const enabled = patch.enabled === undefined ? current.enabled : patch.enabled;
  if (!enabled && current.enabled) {
    const pricedRows = data.tshirtPosts.reduce((total, post) => {
      const attribute = post.attributes.find((entry) => entry.key === key);
      if (!attribute) return total;
      return total + post.prices.filter((row) => attribute.options.includes(row.options[key] ?? "")).length;
    }, 0);
    if (pricedRows) issues.push(`"${label}" prices ${pricedRows} row${pricedRows === 1 ? "" : "s"} across posts. Unprice them before switching it off.`);
  }

  if (issues.length) return { data, issues };
  return {
    data: {
      ...data,
      attributeChain: chain.map((attribute) => (attribute.key === key ? { ...attribute, label, options, enabled } : attribute)),
    },
    issues: [],
  };
}

/** Moves one attribute up or down in the chain; the order drives every grid column. */
export function moveAttribute(data: AdminDemoData, key: AdminTshirtPostAttributeKey, direction: -1 | 1): AdminDemoData {
  const chain = attributeChain(data);
  const index = chain.findIndex((attribute) => attribute.key === key);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= chain.length) return data;
  const next = [...chain];
  [next[index], next[target]] = [next[target], next[index]];
  return { ...data, attributeChain: next };
}

export function resetAttributeChain(data: AdminDemoData): AdminDemoData {
  return { ...data, attributeChain: createSeedAttributeChain() };
}
