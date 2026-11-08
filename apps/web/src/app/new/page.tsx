import type { Metadata } from "next";
import { ArrowRight, Sparkles } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { getNewArrivals } from "@/lib/products";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "New Arrivals — MH Fashion", description: "Discover the latest designs from MH Fashion." };

export default async function NewPage() {
  const products = await getNewArrivals(20);
  return <div><Header /><main className="w-full bg-bg px-4 py-4 sm:px-6 lg:px-8 lg:py-6"><div className="mx-auto max-w-[1480px]">
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#efffdc] via-[#dbf6bb] to-[#b9ea7d] px-6 py-8 sm:px-10 sm:py-10"><div className="relative z-10 max-w-xl"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#4c9d16]">MH Fashion</p><h1 className="mt-3 text-4xl font-black leading-[0.95] sm:text-5xl">Fresh Looks.<br /><span className="text-[#4f9d16]">Just Dropped.</span></h1><p className="mt-4 max-w-md text-sm leading-relaxed text-[#355128]">The latest designs, colors and ideas made for your style.</p><a href="#latest" className="mt-5 inline-flex items-center rounded-full bg-accent px-4 py-2.5 text-xs font-bold text-accent-foreground">See latest arrivals <ArrowRight size={15} className="ml-1.5" /></a></div><div className="absolute -right-12 -top-16 h-80 w-80 rounded-full bg-[#8bd33c]/45" /><div className="absolute bottom-[-55px] right-[16%] hidden h-64 w-44 rotate-[-7deg] rounded-[44%] bg-white/80 shadow-xl sm:block"><div className="absolute left-1/2 top-16 -translate-x-1/2 text-center text-2xl font-black leading-none text-[#4c9d16]">NEW<br /><span className="text-xs">DROP</span></div></div><Sparkles className="absolute bottom-7 right-7 text-[#4e9d13]/70" size={52} /></section>
    <section id="latest" className="mt-6"><div className="mb-4 flex items-end justify-between"><div><h2 className="text-xl font-black"><span className="text-accent">{products.length}</span> New Arrivals</h2><p className="mt-1 text-xs text-text-muted">The newest designs from MH Fashion</p></div><span className="rounded-full bg-accent/10 px-3 py-1.5 text-[10px] font-bold text-accent">Latest first</span></div>{products.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">{products.map((product) => <div key={product.id} className="rounded-xl border border-border bg-bg-surface p-2.5 shadow-sm"><span className="mb-1 inline-flex rounded-full bg-accent px-2 py-1 text-[9px] font-black text-accent-foreground">NEW</span><ProductCard product={product} /></div>)}</div> : <div className="rounded-xl border border-border bg-bg-surface p-10 text-center text-sm text-text-muted">No new arrivals yet.</div>}</section>
  </div></main><Footer /></div>;
}
