/**
 * The option boxes a product page shows: Size, Color, Material, Fit Type, Sleeve, GSM, and any further
 * attribute the admin ticks for that post (Print Method, Knit Structure, MH Cuttings).
 *
 * The admin's choice is the truth. A product with attribute rows shows exactly the groups it was sold
 * in, so a drop with no colour choice simply has no colour box; a drop with one option shows that option
 * already chosen. Only a product with no attribute rows at all falls back to the shop's defaults, so an
 * unconfigured catalogue still sells.
 */
export type ProductOptionGroup = {
  key: string;
  label: string;
  options: string[];
};

export const SIZE_OPTIONS_FOR_SALE = ["S", "M", "L", "XL", "XXL"] as const;

/** Shown while a design-editable product has no attribute rows in the catalogue yet. */
export const DEFAULT_PRODUCT_OPTION_GROUPS: ProductOptionGroup[] = [
  { key: "size", label: "Size", options: [...SIZE_OPTIONS_FOR_SALE] },
  { key: "color", label: "Color", options: ["Black", "White", "Green", "Sand", "Red", "Navy"] },
  { key: "material", label: "Material", options: ["Cotton", "Premium Cotton", "Polyester", "Blend"] },
  { key: "fit", label: "Fit Type", options: ["Oversized", "Regular", "Slim Fit", "Loose Fit"] },
  { key: "sleeve", label: "Sleeve", options: ["Short Sleeve", "Long Sleeve"] },
  { key: "gsm", label: "GSM", options: ["160 GSM", "180 GSM", "200 GSM", "240 GSM"] },
];

/**
 * A ready-made piece is printed as shown, so nothing varies except the size the customer wears. The
 * admin's own rows replace this list whenever they exist.
 */
export const READY_MADE_PRODUCT_OPTION_GROUPS: ProductOptionGroup[] = [
  { key: "size", label: "Size", options: [...SIZE_OPTIONS_FOR_SALE] },
];

/** Attribute keys the cart already stores as named fields. */
export const CART_VARIANT_KEYS = ["size", "color", "material", "gsm", "fit", "sleeve"] as const;

function cleanOptions(options: readonly string[]): string[] {
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const option of options) {
    const value = option.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    cleaned.push(value);
  }
  return cleaned;
}

/** Drops blank options and empty groups, and narrows duplicate option values to one. */
export function normalizeProductOptionGroups(groups: readonly ProductOptionGroup[] | null | undefined): ProductOptionGroup[] {
  if (!groups?.length) return [];
  const seen = new Set<string>();
  const normalized: ProductOptionGroup[] = [];
  for (const group of groups) {
    const key = group.key.trim().toLowerCase();
    const label = group.label.trim();
    if (!key || !label || seen.has(key)) continue;
    const options = cleanOptions(group.options ?? []);
    if (!options.length) continue;
    seen.add(key);
    normalized.push({ key, label, options });
  }
  return normalized;
}

/**
 * The groups the page renders. `configured` is the product's attribute rows: `null` means the catalogue
 * has none, and only then does a default list stand in.
 */
export function resolveProductOptionGroups(
  configured: readonly ProductOptionGroup[] | null | undefined,
  options: { readyMade?: boolean } = {},
): ProductOptionGroup[] {
  const fromCatalogue = normalizeProductOptionGroups(configured);
  if (fromCatalogue.length) return fromCatalogue;
  return options.readyMade ? READY_MADE_PRODUCT_OPTION_GROUPS : DEFAULT_PRODUCT_OPTION_GROUPS;
}

/** A one-option group is not a choice: it opens with that option chosen. */
export function defaultOptionSelection(groups: readonly ProductOptionGroup[]): Record<string, string> {
  const selection: Record<string, string> = {};
  for (const group of groups) {
    if (group.options.length === 1) selection[group.key] = group.options[0];
  }
  return selection;
}

/** The groups the shopper still has to answer. Only configured groups are ever required. */
export function missingOptionKeys(groups: readonly ProductOptionGroup[], selection: Record<string, string | null | undefined>): string[] {
  return groups
    .filter((group) => group.options.length > 1)
    .filter((group) => {
      const chosen = selection[group.key];
      return !chosen || !group.options.includes(chosen);
    })
    .map((group) => group.key);
}

/** "Color: Black · Size: M" for a summary line; skips groups without a choice. */
export function optionSelectionLabel(groups: readonly ProductOptionGroup[], selection: Record<string, string | null | undefined>): string {
  return groups
    .map((group) => [group, selection[group.key]?.trim()] as const)
    .filter(([, value]) => Boolean(value))
    .map(([group, value]) => `${group.label}: ${value}`)
    .join(" · ");
}

/**
 * The cart and the page key size, color, material, fit, sleeve and gsm by name; an attribute the admin
 * named differently ("Fabric Type", "MH Cuttings") still becomes that key so the page has one vocabulary.
 */
export function optionKeyForAttributeName(name: string): string {
  const normalized = name.trim().toLowerCase();
  if (normalized.startsWith("size")) return "size";
  if (normalized.startsWith("col")) return "color";
  if (normalized.startsWith("fabric") || normalized.startsWith("material")) return "material";
  if (normalized.startsWith("fit")) return "fit";
  if (normalized.startsWith("sleeve")) return "sleeve";
  if (normalized.includes("gsm")) return "gsm";
  if (normalized.startsWith("print")) return "print";
  if (normalized.startsWith("knit")) return "knit";
  if (normalized.includes("cutting")) return "cutting";
  return normalized.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "option";
}
