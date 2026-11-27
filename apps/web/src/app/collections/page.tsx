import type { Metadata } from "next";
import { ArrowRight, Coffee, Palette, Shirt, ShoppingBag, Smartphone, Sparkles, Smile } from "lucide-react";
import Header from "@/components/Header";
import T from "@/components/T";
import ProductCard from "@/components/ProductCard";
import { getBestSellers, getNewArrivals } from "@/lib/products";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Collections — MH Fashion", description: "Explore MH Fashion collections for every style." };

const COLLECTIONS = [
  { nameKey: "collections.item.all", detailKey: "collections.item.allDetail", Icon: Sparkles, tone: "from-[#efffdc] to-[#b9ea7d]" },
  { nameKey: "collections.item.tShirts", detailKey: "collections.item.tShirtsDetail", Icon: Shirt, tone: "from-[#e5f3d4] to-[#cce7a8]" },
  { nameKey: "collections.item.kids", detailKey: "collections.item.kidsDetail", Icon: Smile, tone: "from-[#fff1c6] to-[#f6d98b]" },
  { nameKey: "collections.item.phoneCovers", detailKey: "collections.item.phoneCoversDetail", Icon: Smartphone, tone: "from-[#e5ddf4] to-[#c7b9e7]" },
  { nameKey: "collections.item.bags", detailKey: "collections.item.bagsDetail", Icon: ShoppingBag, tone: "from-[#f3e3d2] to-[#e5c09b]" },
  { nameKey: "collections.item.cups", detailKey: "collections.item.cupsDetail", Icon: Coffee, tone: "from-[#d9edf0] to-[#a9d9df]" },
];

export default async function CollectionsPage() {
  const [newArrivals, bestSellers] = await Promise.all([getNewArrivals(6), getBestSellers(6)]);
  const products = [...newArrivals, ...bestSellers].filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index).slice(0, 8);
  return <div><Header /><main className="w-full bg-bg px-4 py-4 sm:px-6 lg:px-8 lg:py-6"><div className="mx-auto max-w-[1480px]">
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#efffdc] via-[#dbf6bb] to-[#b9ea7d] px-4 py-4 sm:px-10 sm:py-10"><div className="relative z-10 max-w-xl"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#4c9d16] sm:text-xs sm:tracking-[0.18em]"><T k="collections.eyebrow" /></p><h1 className="mt-2 text-2xl font-black leading-[0.95] sm:mt-3 sm:text-5xl"><T k="collections.title1" /><br /><span className="text-[#4f9d16]"><T k="collections.title2" /></span></h1><p className="mt-2 max-w-md text-[10px] leading-relaxed text-[#355128] sm:mt-4 sm:text-sm"><T k="collections.lead" /></p><a href="#collections" className="mt-3 inline-flex h-8 items-center rounded-full bg-accent px-3 text-[10px] font-bold text-accent-foreground sm:mt-5 sm:h-9 sm:px-4 sm:text-xs"><T k="collections.cta" /> <ArrowRight size={13} className="ml-1.5 sm:h-[15px] sm:w-[15px]" /></a></div><div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-[#8bd33c]/45 sm:h-80 sm:w-80" /><div className="absolute bottom-[-55px] right-[16%] hidden h-64 w-44 rotate-[-7deg] rounded-[44%] bg-white/80 shadow-xl sm:block"><div className="absolute left-1/2 top-16 -translate-x-1/2 text-center text-2xl font-black leading-none text-[#4c9d16]">MH<br /><span className="text-xs"><T k="collections.mark" /></span></div></div><Palette className="absolute bottom-4 right-4 text-[#4e9d13]/70 sm:bottom-7 sm:right-7" size={34} /></section>
    <section id="collections" className="mt-6"><div className="mb-4"><h2 className="text-xl font-black"><T k="collections.listTitle" /></h2><p className="mt-1 text-xs text-text-muted"><T k="collections.listLead" /></p></div><div className="flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible xl:grid-cols-6">{COLLECTIONS.map(({ nameKey, detailKey, Icon, tone }) => <a key={nameKey} href="#collection-products" className={`group relative min-w-[132px] shrink-0 overflow-hidden rounded-xl bg-gradient-to-br ${tone} p-3 text-[#26351f] transition-transform hover:-translate-y-1 sm:min-w-0 sm:p-4`}><Icon size={20} className="mb-5 opacity-70 sm:mb-10 sm:h-[25px] sm:w-[25px]" /><h3 className="text-sm font-black"><T k={nameKey} /></h3><p className="mt-1 text-[10px] opacity-75"><T k={detailKey} /></p><ArrowRight size={15} className="absolute bottom-3 right-3 transition-transform group-hover:translate-x-1 sm:bottom-4 sm:right-4" /></a>)}</div></section>
    <section id="collection-products" className="mt-7"><div className="mb-4 flex items-end justify-between"><div><h2 className="text-xl font-black"><T k="collections.featured" /></h2><p className="mt-1 text-xs text-text-muted"><T k="collections.featuredLead" /></p></div><a href="/new" className="text-xs font-semibold text-accent"><T k="collections.seeNew" /> <ArrowRight size={13} className="ml-1 inline" /></a></div>{products.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">{products.map((product) => <div key={product.id} className="rounded-xl border border-border bg-bg-surface p-2.5 shadow-sm"><ProductCard product={product} /></div>)}</div> : <div className="rounded-xl border border-border bg-bg-surface p-10 text-center text-sm text-text-muted"><T k="collections.empty" /></div>}</section>
  </div></main></div>;
}
