export type Product = {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  isNew?: boolean;
  productType?: string;
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
