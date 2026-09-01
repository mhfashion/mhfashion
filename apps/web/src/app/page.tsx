import Header from "@/components/Header";
import Hero from "@/components/Hero";
import CategoryRow from "@/components/CategoryRow";
import ProductSection from "@/components/ProductSection";
import CollectionGrid from "@/components/CollectionGrid";
import Footer from "@/components/Footer";
import type { Product } from "@/lib/types";

// Placeholder data — will be replaced with Supabase queries once the
// products/attribute_pricing tables have real rows.
const NEW_ARRIVALS: Product[] = [
  { id: "1", name: "Chaos Theory", slug: "chaos-theory", isNew: true, priceMinKs: 22000, priceMaxKs: 26000 },
  { id: "2", name: "Butterfly Effect", slug: "butterfly-effect", priceMinKs: 21000, priceMaxKs: 25000 },
  { id: "3", name: "Lost In Space", slug: "lost-in-space", priceMinKs: 24000, priceMaxKs: 28000 },
  { id: "4", name: "X Marks", slug: "x-marks", priceMinKs: 20000, priceMaxKs: 24000 },
  { id: "5", name: "Dreaming", slug: "dreaming", priceMinKs: 23000, priceMaxKs: 27000 },
  { id: "6", name: "Shadow Hunter", slug: "shadow-hunter", priceMinKs: 22000, priceMaxKs: 26000 },
];

const BEST_SELLERS: Product[] = [
  { id: "7", name: "Void Tee", slug: "void-tee", priceMinKs: 25000, priceMaxKs: 30000 },
  { id: "8", name: "Skull Case", slug: "skull-case", priceMinKs: 8000, priceMaxKs: 8000 },
  { id: "9", name: "Tote Bag", slug: "tote-bag", priceMinKs: 12000, priceMaxKs: 12000 },
  { id: "10", name: "Mug 01", slug: "mug-01", priceMinKs: 9000, priceMaxKs: 9000 },
  { id: "11", name: "Hoodie X", slug: "hoodie-x", priceMinKs: 35000, priceMaxKs: 40000 },
  { id: "12", name: "Cap Basic", slug: "cap-basic", priceMinKs: 14000, priceMaxKs: 14000 },
];

export default function HomePage() {
  return (
    <main>
      <Header />
      <Hero />
      <CategoryRow />
      <ProductSection title="NEW ARRIVALS" products={NEW_ARRIVALS} />
      <ProductSection title="BEST SELLERS" products={BEST_SELLERS} />
      <CollectionGrid />
      <Footer />
    </main>
  );
}
