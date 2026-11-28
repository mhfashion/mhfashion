// The shop reads the owner's stored prices. A variant carries MMK and USD as typed in the Price
// Table, so the currency toggle picks a column and never converts one amount into the other.

export type ProductVariantPrice = {
  signature: string;
  options: Record<string, string>;
  size: string;
  priceKs: number | null;
  priceUsd: number | null;
  availability: string;
};

/** The variant a shopper picked: every option they chose must name the same value in the row. */
export function findVariant(
  variants: ProductVariantPrice[] | null | undefined,
  selection: Record<string, string | null | undefined>,
): ProductVariantPrice | null {
  if (!variants?.length) return null;
  const chosen = Object.entries(selection)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => [key, value as string] as const);
  if (!chosen.length) return null;

  const matches = variants.filter((variant) => chosen.every(([key, value]) => variant.options[key] === value));
  if (!matches.length) return null;
  // A row that names exactly the chosen options wins; otherwise the nearest (most specific) one does.
  const exact = matches.find((variant) => Object.keys(variant.options).length === chosen.length);
  return exact ?? matches.sort((a, b) => Object.keys(b.options).length - Object.keys(a.options).length)[0];
}

/** Only a variant priced in both currencies, marked Available, may be bought. */
export function variantIsSellable(variant: ProductVariantPrice | null): variant is ProductVariantPrice & { priceKs: number; priceUsd: number } {
  return Boolean(variant && variant.priceKs !== null && variant.priceUsd !== null && variant.availability === "Available");
}

/** What the shop says when the picked combination cannot be sold. */
export function variantNotice(variant: ProductVariantPrice | null): string | null {
  if (!variant) return "This combination is not offered.";
  if (variant.availability !== "Available") return `This combination is ${variant.availability.toLowerCase()}.`;
  if (variant.priceKs === null || variant.priceUsd === null) return "This combination is not priced yet.";
  return null;
}
