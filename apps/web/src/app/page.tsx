import Header from "@/components/Header";
import Hero from "@/components/Hero";
import CategoryRow from "@/components/CategoryRow";
import ProductSection from "@/components/ProductSection";
import CollectionGrid from "@/components/CollectionGrid";
import Footer from "@/components/Footer";
import { getNewArrivals, getBestSellers } from "@/lib/products";

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
