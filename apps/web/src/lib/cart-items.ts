import type { Product } from "@/lib/types";

/**
 * The exact combination a customer bought. Two adds with different values must stay separate
 * lines: they are different products to the print desk, even when the catalogue id matches.
 */
export type CartVariant = {
  size: string | null;
  color: string | null;
  material: string | null;
  gsm: string | null;
  fit: string | null;
  sleeve: string | null;
  /** Further attributes the post sells on (Print Method, Knit Structure, MH Cuttings). */
  extras?: Record<string, string>;
};

export type CartItem = Product & {
  /** Product id plus the variant signature; the line identity in the cart. */
  key: string;
  quantity: number;
  variant: CartVariant;
  /** Price of this combination for one unit, when the product page could compute it. */
  unitPriceKs?: number;
};

export const EMPTY_VARIANT: CartVariant = {
  size: null,
  color: null,
  material: null,
  gsm: null,
  fit: null,
  sleeve: null,
};

export function normalizeCartVariant(input?: Partial<CartVariant> | null): CartVariant {
  const extras = input?.extras
    ? Object.fromEntries(
        Object.entries(input.extras)
          .map(([label, value]) => [label, value?.trim()] as const)
          .filter(([, value]) => Boolean(value))
          .sort(([left], [right]) => left.localeCompare(right)),
      )
    : {};
  return {
    size: input?.size ?? null,
    color: input?.color ?? null,
    material: input?.material ?? null,
    gsm: input?.gsm ?? null,
    fit: input?.fit ?? null,
    sleeve: input?.sleeve ?? null,
    ...(Object.keys(extras).length ? { extras } : {}),
  };
}

export function cartItemKey(productId: string, variant?: Partial<CartVariant> | null): string {
  const value = normalizeCartVariant(variant);
  return [productId, value.size, value.color, value.material, value.gsm, value.fit, value.sleeve]
    .map((part) => (part ?? "").toString().trim())
    .concat(Object.entries(value.extras ?? {}).flatMap(([label, option]) => [label, option]))
    .join("::");
}

/** "M · Black · Premium Cotton · 180 GSM · Oversized · Short Sleeve" */
export function variantLabel(variant?: Partial<CartVariant> | null): string {
  const value = normalizeCartVariant(variant);
  return [value.size, value.color, value.material, value.gsm, value.fit, value.sleeve]
    .concat(Object.values(value.extras ?? {}))
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" · ");
}

export function addCartItem(
  items: CartItem[],
  product: Product,
  variant?: Partial<CartVariant> | null,
  quantity = 1,
  unitPriceKs?: number,
): CartItem[] {
  const normalized = normalizeCartVariant(variant);
  const key = cartItemKey(product.id, normalized);
  const amount = Math.max(1, Math.round(quantity));
  const existing = items.find((item) => item.key === key);
  if (existing) {
    return items.map((item) => (item.key === key ? { ...item, quantity: item.quantity + amount } : item));
  }
  return [...items, { ...product, key, quantity: amount, variant: normalized, ...(unitPriceKs ? { unitPriceKs } : {}) }];
}

export function updateCartQuantity(items: CartItem[], key: string, quantity: number): CartItem[] {
  if (quantity <= 0) return items.filter((item) => item.key !== key);
  return items.map((item) => (item.key === key ? { ...item, quantity } : item));
}

export function removeCartItem(items: CartItem[], key: string): CartItem[] {
  return items.filter((item) => item.key !== key);
}

export function cartLineTotal(item: CartItem): number {
  return (item.unitPriceKs ?? item.priceMinKs) * item.quantity;
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((total, item) => total + cartLineTotal(item), 0);
}

/** Older carts stored bare products; give every line a key and a variant so nothing collapses. */
export function normalizeCartItems(stored: unknown): CartItem[] {
  if (!Array.isArray(stored)) return [];
  return stored
    .filter((item): item is CartItem => Boolean(item) && typeof item === "object" && "id" in item)
    .map((item, index) => {
      const variant = normalizeCartVariant(item.variant);
      return {
        ...item,
        variant,
        key: item.key ?? `${cartItemKey(item.id, variant)}::${index}`,
        quantity: Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 1,
      };
    });
}
