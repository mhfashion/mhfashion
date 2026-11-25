import type { Metadata } from "next";
import { ArrowRight, Flame } from "lucide-react";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import { getBestSellers } from "@/lib/products";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Popular Products — MH Fashion", description: "Shop the products customers love most from MH Fashion." };

export default async function PopularPage() {
  const products = await getBestSellers(20);
  return <div><Header /><main className="w-full bg-bg px-4 py-4 sm:px-6 lg:px-8 lg:py-6"><div className="mx-auto max-w-[1480px]">
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#efffdc] via-[#dbf5b8] to-[#b7e97a] px-4 py-4 sm:px-10 sm:py-10"><div className="relative z-10 max-w-xl"><p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#4c9d16] sm:text-xs sm:tracking-[0.18em]"><Flame size={13} /> Customer favorites</p><h1 className="mt-2 text-2xl font-black leading-[0.95] sm:mt-3 sm:text-5xl">Most Loved.<br /><span className="text-[#4f9d16]">Best Sellers.</span></h1><p className="mt-2 max-w-md text-[10px] leading-relaxed text-[#355128] sm:mt-4 sm:text-sm">The designs our community buys and wears the most.</p><a href="#popular" className="mt-3 inline-flex items-center rounded-full bg-accent px-3 py-1.5 text-[10px] font-bold text-accent-foreground sm:mt-5 sm:px-4 sm:py-2.5 sm:text-xs">Shop best sellers <ArrowRight size={13} className="ml-1.5 sm:h-[15px] sm:w-[15px]" /></a></div><div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-[#8bd33c]/45 sm:h-80 sm:w-80" /><div className="absolute bottom-[-55px] right-[16%] hidden h-64 w-44 rotate-[-5deg] rounded-[42%] bg-white/85 shadow-xl sm:block"><div className="absolute left-1/2 top-16 -translate-x-1/2 text-center text-2xl font-black leading-none text-accent">MH<br /><span className="text-xs">FAVORITES</span></div></div></section>
    <section id="popular" className="mt-6"><div className="mb-4 flex items-end justify-between"><div><h2 className="text-xl font-black"><span className="text-accent">{products.length}</span> Popular Products</h2><p className="mt-1 text-xs text-text-muted">Our most purchased designs, ranked by popularity</p></div><span className="rounded-full bg-accent/10 px-3 py-1.5 text-[10px] font-bold text-accent">Best sellers</span></div>{products.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">{products.map((product, index) => <div key={product.id} className="relative flex aspect-square min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-bg-surface p-1.5 shadow-sm sm:p-2.5"><span className="absolute left-2 top-2 z-10 rounded-full bg-accent px-1.5 py-0.5 text-[7px] font-black text-accent-foreground sm:left-3 sm:top-3 sm:px-2 sm:py-1 sm:text-[9px]">#{index + 1}</span><ProductCard product={product} /></div>)}</div> : <div className="rounded-xl border border-border bg-bg-surface p-10 text-center text-sm text-text-muted">Popular products will appear here soon.</div>}</section>
  </div></main></div>;
}
