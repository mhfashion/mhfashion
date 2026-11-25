import type { Product } from "@/lib/types";

/**
 * Ready-made Nyein pieces. They are printed exactly as shown, so every one is `isCustomizable: "none"` and no card
 * offers a design link. The catalogue takes over as soon as it carries Nyein rows; these stand in until then.
 */
export const NYEIN_PIECES: Product[] = [
  { id: "nyein-01", name: "Nyein Oversized Tee", slug: "nyein-oversized-tee", productType: "T-Shirt", subBrand: "Nyein", isCustomizable: "none", isNew: true, priceMinKs: 28000, priceMaxKs: 32000 },
  { id: "nyein-02", name: "Nyein Heavyweight Tee", slug: "nyein-heavyweight-tee", productType: "T-Shirt", subBrand: "Nyein", isCustomizable: "none", isNew: true, priceMinKs: 34000, priceMaxKs: 38000 },
  { id: "nyein-03", name: "Nyein Boxy Tee", slug: "nyein-boxy-tee", productType: "T-Shirt", subBrand: "Nyein", isCustomizable: "none", priceMinKs: 30000, priceMaxKs: 34000 },
  { id: "nyein-04", name: "Nyein Pocket Tee", slug: "nyein-pocket-tee", productType: "T-Shirt", subBrand: "Nyein", isCustomizable: "none", priceMinKs: 27000, priceMaxKs: 31000 },
  { id: "nyein-05", name: "Nyein Long Sleeve", slug: "nyein-long-sleeve", productType: "Long Sleeve", subBrand: "Nyein", isCustomizable: "none", priceMinKs: 38000, priceMaxKs: 42000 },
  { id: "nyein-06", name: "Nyein Crop Tee", slug: "nyein-crop-tee", productType: "T-Shirt", subBrand: "Nyein", isCustomizable: "none", priceMinKs: 26000, priceMaxKs: 30000 },
  { id: "nyein-07", name: "Nyein Hoodie", slug: "nyein-hoodie", productType: "Hoodie", subBrand: "Nyein", isCustomizable: "none", isNew: true, priceMinKs: 52000, priceMaxKs: 58000 },
  { id: "nyein-08", name: "Nyein Tote", slug: "nyein-tote", productType: "Tote Bag", subBrand: "Nyein", isCustomizable: "none", priceMinKs: 22000, priceMaxKs: 26000 },
];
