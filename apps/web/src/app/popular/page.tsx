import type { Metadata } from "next";
import { ArrowRight, Flame } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { getBestSellers } from "@/lib/products";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Popular Products — MH Fashion", description: "Shop the products customers love most from MH Fashion." };

export default async function PopularPage() {
  const products = await getBestSellers(20);
  return <div><Header /><main className="w-full bg-bg px-4 py-4 sm:px-6 lg:px-8 lg:py-6"><div className="mx-auto max-w-[1480px]">
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#efffdc] via-[#dbf5b8] to-[#b7e97a] px-6 py-8 sm:px-10 sm:py-10"><div className="relative z-10 max-w-xl"><p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.18em] text-[#4c9d16]"><Flame size={15} /> Customer favorites</p><h1 className="mt-3 text-4xl font-black leading-[0.95] sm:text-5xl">Most Loved.<br /><span className="text-[#4f9d16]">Best Sellers.</span></h1><p className="mt-4 max-w-md text-sm leading-relaxed text-[#355128]">The designs our community buys and wears the most.</p><a href="#popular" className="mt-5 inline-flex items-center rounded-full bg-accent px-4 py-2.5 text-xs font-bold text-accent-foreground">Shop best sellers <ArrowRight size={15} className="ml-1.5" /></a></div><div className="absolute -right-12 -top-16 h-80 w-80 rounded-full bg-[#8bd33c]/45" /><div className="absolute bottom-[-55px] right-[16%] hidden h-64 w-44 rotate-[-7deg] rounded-[44%] bg-white/80 shadow-xl sm:block"><div className="absolute left-1/2 top-16 -translate-x-1/2 text-center text-2xl font-black leading-none text-[#4c9d16]">MH<br /><span className="text-xs">FAVORITES</span></div></div></section>
    <section id="popular" className="mt-6"><div className="mb-4 flex items-end justify-between"><div><h2 className="text-xl font-black"><span className="text-accent">{products.length}</span> Popular Products</h2><p className="mt-1 text-xs text-text-muted">Our most purchased designs, ranked by popularity</p></div><span className="rounded-full bg-accent/10 px-3 py-1.5 text-[10px] font-bold text-accent">Best sellers</span></div>{products.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">{products.map((product, index) => <div key={product.id} className="relative rounded-xl border border-border bg-bg-surface p-2.5 shadow-sm"><span className="absolute left-3 top-3 z-10 rounded-full bg-accent px-2 py-1 text-[9px] font-black text-accent-foreground">#{index + 1}</span><ProductCard product={product} /><div className="mt-2 border-t border-border pt-2 text-[10px] text-text-muted">★ Customer favorite</div></div>)}</div> : <div className="rounded-xl border border-border bg-bg-surface p-10 text-center text-sm text-text-muted">Popular products will appear here soon.</div>}</section>
  </div></main><Footer /></div>;
}
