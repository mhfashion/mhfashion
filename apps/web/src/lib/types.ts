export type Product = {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  // Artwork painted on top of the variant mockup; absent until the catalog carries one.
  designSvgUrl?: string;
  isNew?: boolean;
  productType?: string;
  /** Free words the owner typed when posting the product; the shop search matches them. */
  tags?: string[];
  /** Catalogue line: "MH Fashion", "Nyein", "Accessories", "Streetwear"... */
  subBrand?: string;
  isCustomizable?: "full" | "partial" | "none";
  priceMinKs: number;
  priceMaxKs: number;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string; // lucide-react icon name, resolved by the component
};
