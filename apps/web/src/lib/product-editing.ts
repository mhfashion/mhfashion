import type { Product } from "@/lib/types";

/** The brand line a product belongs to, for the "Nyein" and similar collection pages. */
export const NYEIN_BRAND = "Nyein";

/**
 * Whether the design editor applies to a product. Nyein (and anything else flagged
 * `is_customizable = 'none'`) is sold exactly as shown: the buyer picks size and colour, but
 * cannot open the editor, and no editor draft is painted on the mockup.
 */
export function isDesignEditable(product: Pick<Product, "isCustomizable" | "subBrand">): boolean {
  // A Nyein piece is sold exactly as shown even when its row never set the flag.
  if (product.subBrand && product.subBrand.trim().toLowerCase() === NYEIN_BRAND.toLowerCase()) return false;
  return product.isCustomizable !== "none";
}

/** Shown on ready-made products in place of the "Edit Design" action. */
export const READY_MADE_NOTE = "Ready-made design — sold as shown, no design editing.";

