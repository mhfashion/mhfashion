import type { Metadata } from "next";
import { ArrowRight, Coffee, Palette, Shirt, ShoppingBag, Smartphone, Sparkles, Smile } from "lucide-react";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import { getBestSellers, getNewArrivals } from "@/lib/products";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Collections — MH Fashion", description: "Explore MH Fashion collections for every style." };

const COLLECTIONS = [
  { name: "All Collections", detail: "Everyday favorites", Icon: Sparkles, tone: "from-[#efffdc] to-[#b9ea7d]" },
  { name: "T-Shirts", detail: "Soft custom staples", Icon: Shirt, tone: "from-[#e5f3d4] to-[#cce7a8]" },
  { name: "Kids", detail: "Playful everyday prints", Icon: Smile, tone: "from-[#fff1c6] to-[#f6d98b]" },
  { name: "Phone Covers", detail: "Carry your style", Icon: Smartphone, tone: "from-[#e5ddf4] to-[#c7b9e7]" },
  { name: "Bags", detail: "Made to go anywhere", Icon: ShoppingBag, tone: "from-[#f3e3d2] to-[#e5c09b]" },
  { name: "Cups", detail: "Your daily essentials", Icon: Coffee, tone: "from-[#d9edf0] to-[#a9d9df]" },
];

export default async function CollectionsPage() {
  const [newArrivals, bestSellers] = await Promise.all([getNewArrivals(6), getBestSellers(6)]);
  const products = [...newArrivals, ...bestSellers].filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index).slice(0, 8);
  return <div><Header /><main className="w-full bg-bg px-4 py-4 sm:px-6 lg:px-8 lg:py-6"><div className="mx-auto max-w-[1480px]">
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#efffdc] via-[#dbf6bb] to-[#b9ea7d] px-4 py-4 sm:px-10 sm:py-10"><div className="relative z-10 max-w-xl"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#4c9d16] sm:text-xs sm:tracking-[0.18em]">MH Fashion Collection</p><h1 className="mt-2 text-2xl font-black leading-[0.95] sm:mt-3 sm:text-5xl">Find Your<br /><span className="text-[#4f9d16]">Own Style.</span></h1><p className="mt-2 max-w-md text-[10px] leading-relaxed text-[#355128] sm:mt-4 sm:text-sm">Explore curated collections made for the way you live, create and express yourself.</p><a href="#collections" className="mt-3 inline-flex items-center rounded-full bg-accent px-3 py-1.5 text-[10px] font-bold text-accent-foreground sm:mt-5 sm:px-4 sm:py-2.5 sm:text-xs">Explore collections <ArrowRight size={13} className="ml-1.5 sm:h-[15px] sm:w-[15px]" /></a></div><div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-[#8bd33c]/45 sm:h-80 sm:w-80" /><div className="absolute bottom-[-55px] right-[16%] hidden h-64 w-44 rotate-[-7deg] rounded-[44%] bg-white/80 shadow-xl sm:block"><div className="absolute left-1/2 top-16 -translate-x-1/2 text-center text-2xl font-black leading-none text-[#4c9d16]">MH<br /><span className="text-xs">COLLECT</span></div></div><Palette className="absolute bottom-4 right-4 text-[#4e9d13]/70 sm:bottom-7 sm:right-7" size={34} /></section>
    <section id="collections" className="mt-6"><div className="mb-4"><h2 className="text-xl font-black">Shop by collection</h2><p className="mt-1 text-xs text-text-muted">Curated categories for every kind of creator</p></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">{COLLECTIONS.map(({ name, detail, Icon, tone }) => <a key={name} href="#collection-products" className={`group relative overflow-hidden rounded-xl bg-gradient-to-br ${tone} p-4 text-[#26351f] transition-transform hover:-translate-y-1`}><Icon size={25} className="mb-10 opacity-70" /><h3 className="text-sm font-black">{name}</h3><p className="mt-1 text-[10px] opacity-75">{detail}</p><ArrowRight size={15} className="absolute bottom-4 right-4 transition-transform group-hover:translate-x-1" /></a>)}</div></section>
    <section id="collection-products" className="mt-7"><div className="mb-4 flex items-end justify-between"><div><h2 className="text-xl font-black">Featured from our collections</h2><p className="mt-1 text-xs text-text-muted">A few favorites to start exploring</p></div><a href="/new" className="text-xs font-semibold text-accent">See new arrivals <ArrowRight size={13} className="ml-1 inline" /></a></div>{products.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">{products.map((product) => <div key={product.id} className="rounded-xl border border-border bg-bg-surface p-2.5 shadow-sm"><ProductCard product={product} /></div>)}</div> : <div className="rounded-xl border border-border bg-bg-surface p-10 text-center text-sm text-text-muted">Collections are coming soon.</div>}</section>
  </div></main></div>;
}
