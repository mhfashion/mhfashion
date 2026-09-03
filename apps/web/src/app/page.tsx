import Header from "@/components/Header";
import Hero from "@/components/Hero";
import CategoryRow from "@/components/CategoryRow";
import ProductSection from "@/components/ProductSection";
import CollectionGrid from "@/components/CollectionGrid";
import Footer from "@/components/Footer";
import { getNewArrivals, getBestSellers } from "@/lib/products";

// Fetch products fresh on every request instead of baking the result into
// the static HTML at build time (build-time fetches can fail silently in
// sandboxed build environments and leave the page permanently empty).
export const dynamic = "force-dynamic";

// Server Component — fetches live data from Supabase on each request.
export default async function HomePage() {
  const [newArrivals, bestSellers] = await Promise.all([
    getNewArrivals(6),
    getBestSellers(6),
  ]);

  return (
    <main>
      <Header />
      <Hero />
      <CategoryRow />
      <ProductSection title="NEW ARRIVALS" products={newArrivals} />
      <ProductSection title="BEST SELLERS" products={bestSellers} />
      <CollectionGrid />
      <Footer />
    </main>
  );
}
