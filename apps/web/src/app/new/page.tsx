import type { Metadata } from "next";
import { ArrowRight, Sparkles } from "lucide-react";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import { getNewArrivals } from "@/lib/products";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "New Arrivals — MH Fashion", description: "Discover the latest designs from MH Fashion." };

export default async function NewPage() {
  const products = await getNewArrivals(20);
  return <div><Header /><main className="w-full bg-bg px-4 py-4 sm:px-6 lg:px-8 lg:py-6"><div className="mx-auto max-w-[1480px]">
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#efffdc] via-[#dbf6bb] to-[#b9ea7d] px-4 py-4 sm:px-10 sm:py-10"><div className="relative z-10 max-w-xl"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#4c9d16] sm:text-xs sm:tracking-[0.18em]">MH Fashion</p><h1 className="mt-2 text-2xl font-black leading-[0.95] sm:mt-3 sm:text-5xl">Fresh Looks.<br /><span className="text-[#4f9d16]">Just Dropped.</span></h1><p className="mt-2 max-w-md text-[10px] leading-relaxed text-[#355128] sm:mt-4 sm:text-sm">The latest designs, colors and ideas made for your style.</p><a href="#latest" className="mt-3 inline-flex items-center rounded-full bg-accent px-3 py-1.5 text-[10px] font-bold text-accent-foreground sm:mt-5 sm:px-4 sm:py-2.5 sm:text-xs">See latest arrivals <ArrowRight size={13} className="ml-1.5 sm:h-[15px] sm:w-[15px]" /></a></div><div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-[#8bd33c]/45 sm:h-80 sm:w-80" /><div className="absolute bottom-[-55px] right-[16%] hidden h-64 w-44 rotate-[-7deg] rounded-[44%] bg-white/80 shadow-xl sm:block"><div className="absolute left-1/2 top-16 -translate-x-1/2 text-center text-2xl font-black leading-none text-[#4c9d16]">NEW<br /><span className="text-xs">DROP</span></div></div><Sparkles className="absolute bottom-4 right-4 text-[#4e9d13]/70 sm:bottom-7 sm:right-7" size={34} /></section>
    <section id="latest" className="mt-6"><div className="mb-4 flex items-end justify-between"><div><h2 className="text-xl font-black"><span className="text-accent">{products.length}</span> New Arrivals</h2><p className="mt-1 text-xs text-text-muted">The newest designs from MH Fashion</p></div><span className="rounded-full bg-accent/10 px-3 py-1.5 text-[10px] font-bold text-accent">Latest first</span></div>{products.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">{products.map((product) => <div key={product.id} className="aspect-square overflow-hidden rounded-xl border border-border bg-bg-surface p-1.5 shadow-sm sm:p-2.5"><ProductCard product={product} /></div>)}</div> : <div className="rounded-xl border border-border bg-bg-surface p-10 text-center text-sm text-text-muted">No new arrivals yet.</div>}</section>
  </div></main></div>;
}
