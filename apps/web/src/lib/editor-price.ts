import type { EditorProduct } from "./editor-product";

// Provisional client-side pricing for the editor Header Bar 2. The storefront
// computes variant prices the same way (base range + attribute deltas) until
// the Super Admin Pricing Management module and a connected price source exist.
export const EDITOR_BASE_PRICE_KS: Record<EditorProduct, number> = {
  "T-Shirt": 25000,
  Phone: 12000,
};

export const EDITOR_GSM_PRICE_KS: Record<string, number> = {
  "160 GSM": 0,
  "180 GSM": 1000,
  "200 GSM": 2000,
  "240 GSM": 3500,
};

export const EDITOR_SIZE_PRICE_KS: Record<string, number> = {
  XS: 0,
  S: 0,
  M: 1000,
  L: 2000,
  XL: 3000,
  "2XL": 4000,
  "3XL": 5000,
};

export type EditorPriceInput = {
  product: EditorProduct;
  gsm?: string;
  size?: string;
};

// Returns the price in Ks once the product's required selections are present,
// or null while a required choice is still missing.
export function calculateEditorPriceKs({ product, gsm, size }: EditorPriceInput): number | null {
  const base = EDITOR_BASE_PRICE_KS[product];
  if (base === undefined) return null;
  if (product === "Phone") return base;
  if (!gsm || !size) return null;
  const gsmDelta = EDITOR_GSM_PRICE_KS[gsm];
  const sizeDelta = EDITOR_SIZE_PRICE_KS[size];
  if (gsmDelta === undefined || sizeDelta === undefined) return null;
  return base + gsmDelta + sizeDelta;
}
