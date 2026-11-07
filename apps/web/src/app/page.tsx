import {
  ArrowRight,
  Heart,
  Palette,
  ShoppingBag,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CategoryRow from "@/components/CategoryRow";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/lib/types";
import { getNewArrivals, getBestSellers } from "@/lib/products";

export const dynamic = "force-dynamic";

function ProductStrip({ products }: { products: Product[] }) {
  if (!products.length) return <div className="rounded-xl border border-border bg-bg-surface px-5 py-10 text-center text-xs text-text-muted">Products will appear here soon.</div>;
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{products.slice(0, 5).map((product, index) => <div key={product.id} className="relative rounded-xl border border-border bg-bg-surface p-2.5 shadow-sm"><span className={`absolute left-3 top-3 z-10 rounded-full px-2 py-1 text-[9px] font-bold text-white ${index === 0 ? "bg-[#f4b718]" : "bg-accent"}`}>{index === 0 ? "BEST SELLER" : index === 1 ? "TRENDING" : "POPULAR"}</span><ProductCard product={product} /></div>)}</div>;
}

export default async function HomePage() {
  const [newArrivals, bestSellers] = await Promise.all([getNewArrivals(6), getBestSellers(6)]);
  const seen = new Set<string>();
  const products = [...newArrivals, ...bestSellers].filter((product) => { if (seen.has(product.id)) return false; seen.add(product.id); return true; });

  return (
    <main>
      <Header />
      <div className="w-full bg-bg px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="mx-auto max-w-[1480px]">
          <section className="relative isolate min-h-[250px] overflow-hidden rounded-2xl bg-gradient-to-r from-[#efffdc] via-[#dcf4bc] to-[#b6e773] px-6 py-8 sm:px-10 sm:py-10 lg:min-h-[300px] lg:px-12">
            <div className="relative z-10 max-w-[56%] sm:max-w-[47%]"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#4c9d16]">MH Fashion</p><h1 className="mt-3 text-4xl font-black leading-[0.95] tracking-tight sm:text-5xl lg:text-6xl">Design Your<br /><span className="text-[#4d9e16]">Own Style!</span></h1><p className="mt-4 max-w-sm text-xs leading-relaxed text-[#355128] sm:text-sm">Wear what defines you — custom prints made your way.</p><a href="/create" className="mt-5 inline-flex items-center rounded-full bg-[#55a918] px-4 py-2.5 text-xs font-bold text-white shadow-sm">Start Designing <ArrowRight size={15} className="ml-1.5" /></a></div><div className="absolute -right-12 -top-24 h-80 w-80 rounded-full bg-[#95d64a]/60 blur-sm" /><div className="absolute bottom-[-75px] right-[15%] hidden h-80 w-52 rotate-[-6deg] rounded-[44%] bg-white/80 shadow-xl sm:block"><div className="absolute left-1/2 top-20 -translate-x-1/2 text-center text-3xl font-black leading-none text-[#4d9e16]">MH<br /><span className="text-sm">FASHION</span></div></div><div className="absolute bottom-8 right-7 text-3xl font-black italic leading-tight text-[#37770e]/80 sm:right-14 sm:text-4xl">Be Creative<br />Be Unique</div><div className="absolute bottom-4 left-7 flex gap-1.5"><span className="h-2 w-2 rounded-full bg-accent" /><span className="h-2 w-2 rounded-full bg-accent/40" /><span className="h-2 w-2 rounded-full bg-accent/40" /></div>
          </section>

          <CategoryRow />

          <section className="mb-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]"><a href="/categories/t-shirts" className="group relative min-h-[150px] overflow-hidden rounded-2xl bg-gradient-to-r from-[#f5f5f2] to-[#dfe8d9] p-5 sm:p-7"><div className="relative z-10"><h2 className="text-xl font-black sm:text-2xl">Premium Cotton T-Shirts</h2><p className="mt-1 text-xs text-text-secondary">Soft · Breathable · Durable</p><span className="mt-5 inline-flex rounded-full bg-accent px-3 py-2 text-[10px] font-bold text-accent-foreground">Shop Now <ArrowRight size={13} className="ml-1" /></span></div><div className="absolute -bottom-20 right-[-10px] h-48 w-48 rounded-full bg-white/80" /><span className="absolute bottom-5 right-9 text-4xl font-black text-[#85ad69]/60">MH</span></a><a href="/account" className="relative min-h-[150px] overflow-hidden rounded-2xl bg-gradient-to-br from-[#d7f5a8] via-[#79bf20] to-[#4e9e12] p-5 text-white sm:p-7"><p className="text-xs font-bold uppercase tracking-[0.15em] text-white/80">Rewards</p><h2 className="mt-2 text-2xl font-black">Get Rewards<br />with MH Points!</h2><p className="mt-1 text-xs text-white/85">Shop more, earn more.</p><span className="mt-4 inline-flex rounded-full bg-white px-3 py-2 text-[10px] font-bold text-[#4e9e12]">Learn More <ArrowRight size={13} className="ml-1" /></span><SparkleDecoration /></a></section>

          <section className="mb-6"><div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 text-sm font-black sm:text-base"><Heart size={17} className="text-accent" /> Popular Products</h2><a href="/products" className="text-[10px] font-semibold text-accent sm:text-xs">View All <ArrowRight size={13} className="ml-1 inline" /></a></div><ProductStrip products={bestSellers.length ? bestSellers : products} /></section>
          <section className="mb-6"><div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 text-sm font-black sm:text-base"><Palette size={17} className="text-accent" /> New Arrivals</h2><a href="/products?new=true" className="text-[10px] font-semibold text-accent sm:text-xs">View All <ArrowRight size={13} className="ml-1 inline" /></a></div><ProductStrip products={newArrivals.length ? newArrivals : products} /></section>
        </div>
      </div>
      <Footer />
    </main>
  );
}

function SparkleDecoration() {
  return <div className="absolute bottom-[-22px] right-6 flex h-28 w-28 items-center justify-center rounded-full bg-[#f4c824] text-4xl shadow-lg">★</div>;
}
