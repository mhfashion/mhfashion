import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChevronDown, Coffee, Filter, Grid2X2, Heart, Search, Shirt, ShoppingBag, Smartphone, Sparkles, SlidersHorizontal, Smile } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { getBestSellers, getNewArrivals } from "@/lib/products";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

type SearchParams = { q?: string | string[]; sort?: string | string[]; category?: string | string[] };
type PageProps = { searchParams: Promise<SearchParams> };

const CATEGORIES = [
  { label: "All New", slug: "", Icon: Sparkles, count: 48 },
  { label: "T-Shirts", slug: "t-shirts", Icon: Shirt, count: 22 },
  { label: "Kids", slug: "kids-t-shirts", Icon: Smile, count: 9 },
  { label: "Phone Covers", slug: "phone-covers", Icon: Smartphone, count: 7 },
  { label: "Bags", slug: "bags", Icon: ShoppingBag, count: 6 },
  { label: "Cups", slug: "cups", Icon: Coffee, count: 4 },
];

function first(value: string | string[] | undefined) { return (Array.isArray(value) ? value[0] : value) ?? ""; }
function pageUrl(category: string, sort: string, query: string) { const params = new URLSearchParams(); if (category) params.set("category", category); if (sort) params.set("sort", sort); if (query) params.set("q", query); const value = params.toString(); return value ? `/new?${value}` : "/new"; }

function NewProductCard({ product, index }: { product: Product; index: number }) {
  return <div className="relative rounded-xl border border-border bg-bg-surface p-2.5 shadow-sm"><span className="absolute left-3 top-3 z-10 rounded-full bg-accent px-2 py-1 text-[9px] font-black text-accent-foreground">NEW</span><span className="absolute right-3 top-3 z-10 rounded-full bg-bg-surface/90 px-2 py-1 text-[9px] font-bold text-text-muted">{index % 2 ? "JUST IN" : "NEW DROP"}</span><ProductCard product={product} /><div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-[10px] text-text-muted"><span>★ 4.{8 + (index % 2)} · New arrival</span><Heart size={14} /></div></div>;
}

function FilterPanel() {
  return <aside className="hidden rounded-2xl border border-border bg-bg-surface p-5 lg:block"><h2 className="flex items-center gap-2 border-b border-border pb-4 text-sm font-black"><Filter size={17} /> Filter New Arrivals</h2><fieldset className="mt-5"><legend className="text-xs font-black">Category</legend><div className="mt-3 space-y-2.5">{CATEGORIES.slice(1).map(({ label, count }) => <label key={label} className="flex items-center gap-2 text-xs text-text-secondary"><span className="h-4 w-4 rounded border border-border-light" />{label} ({count})</label>)}</div></fieldset><fieldset className="mt-6"><legend className="text-xs font-black">Price Range</legend><div className="mt-4 h-1 rounded-full bg-accent"><span className="relative -top-1 block h-3 w-3 rounded-full bg-accent" /><span className="relative -top-4 ml-auto block h-3 w-3 rounded-full bg-accent" /></div><div className="mt-2 flex justify-between text-[10px] text-text-muted"><span>MMK 0</span><span>MMK 100,000+</span></div></fieldset><fieldset className="mt-6"><legend className="text-xs font-black">Size</legend><div className="mt-3 flex flex-wrap gap-1.5">{["XS", "S", "M", "L", "XL", "XXL"].map((size) => <span key={size} className="rounded border border-border px-2 py-1 text-[10px]">{size}</span>)}</div></fieldset><label className="mt-6 flex items-center gap-2 text-xs"><span className="h-4 w-4 rounded border border-accent bg-accent" /> In Stock Only</label><button className="mt-5 w-full rounded-full bg-accent py-2.5 text-xs font-bold text-accent-foreground">Apply Filters <ArrowRight size={13} className="ml-1 inline" /></button></aside>;
}

export const metadata: Metadata = { title: "New Arrivals — MH Fashion", description: "Explore the latest custom designs and fresh arrivals from MH Fashion." };

export default async function NewPage({ searchParams }: PageProps) {
  const [newArrivals, bestSellers, params] = await Promise.all([getNewArrivals(20), getBestSellers(8), searchParams]);
  const category = first(params.category);
  const query = first(params.q).trim().toLocaleLowerCase();
  const sort = first(params.sort);
  const source = newArrivals.length ? newArrivals : bestSellers;
  const filtered = source.filter((product) => !query || product.name.toLocaleLowerCase().includes(query));
  const products = [...filtered].sort((a, b) => sort === "price-low" ? a.priceMinKs - b.priceMinKs : sort === "price-high" ? b.priceMinKs - a.priceMinKs : 0);

  return <div><Header /><main className="w-full bg-bg px-4 py-4 sm:px-6 lg:px-8 lg:py-6"><div className="mx-auto max-w-[1480px]"><section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#efffdc] via-[#dbf6bb] to-[#b9ea7d] px-6 py-8 sm:px-10 sm:py-10"><div className="relative z-10 max-w-xl"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#4c9d16]">MH Fashion Collection</p><h1 className="mt-3 text-4xl font-black leading-[0.95] sm:text-5xl">Fresh Looks.<br /><span className="text-[#4f9d16]">Just Dropped.</span></h1><p className="mt-4 max-w-md text-sm leading-relaxed text-[#355128]">Meet the latest designs, new colors and fresh ideas made for your style.</p><a href="#products" className="mt-5 inline-flex items-center rounded-full bg-accent px-4 py-2.5 text-xs font-bold text-accent-foreground">Explore New Arrivals <ArrowRight size={15} className="ml-1.5" /></a></div><div className="absolute -right-12 -top-16 h-80 w-80 rounded-full bg-[#8bd33c]/45" /><div className="absolute bottom-[-55px] right-[16%] hidden h-64 w-44 rotate-[-7deg] rounded-[44%] bg-white/80 shadow-xl sm:block"><div className="absolute left-1/2 top-16 -translate-x-1/2 text-center text-2xl font-black leading-none text-[#4c9d16]">NEW<br /><span className="text-xs">DROP</span></div></div><Sparkles className="absolute bottom-7 right-7 text-[#4e9d13]/70" size={52} /></section><nav aria-label="New product categories" className="my-5 flex gap-2 overflow-x-auto pb-1">{CATEGORIES.map(({ label, slug, Icon, count }) => <Link key={label} href={pageUrl(slug, sort, query)} className={`flex min-w-[108px] shrink-0 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-bold ${category === slug ? "border-accent bg-accent text-accent-foreground" : "border-border bg-bg-surface hover:border-accent"}`}><Icon size={18} /><span>{label}<span className="ml-1 text-[10px] opacity-70">{count}</span></span></Link>)}</nav><div className="mb-5 grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]"><FilterPanel /><section id="products" className="min-w-0"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black"><span className="text-accent">{products.length || source.length || 0}</span> New Products</h2><p className="mt-1 text-xs text-text-muted">The newest designs from MH Fashion</p></div><div className="flex items-center gap-2"><form action="/new" method="get" className="hidden items-center rounded-lg border border-border bg-bg-surface px-3 py-2 sm:flex"><Search size={14} className="mr-2 text-text-muted" /><input name="q" defaultValue={first(params.q)} placeholder="Search new products..." className="w-36 bg-transparent text-xs outline-none" />{category && <input type="hidden" name="category" value={category} />}</form><Link href={pageUrl(category, sort === "price-low" ? "price-high" : "price-low", query)} className="inline-flex items-center gap-1 rounded-lg border border-border bg-bg-surface px-3 py-2 text-xs font-semibold"><SlidersHorizontal size={14} /> Sort <ChevronDown size={13} /></Link><span className="hidden rounded-lg bg-accent p-2 text-accent-foreground sm:inline-flex"><Grid2X2 size={16} /></span></div></div><div className="mb-4 flex gap-2 lg:hidden"><button className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-bg-surface py-2 text-xs font-semibold"><Filter size={14} /> Filter</button><button className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-bg-surface py-2 text-xs font-semibold"><SlidersHorizontal size={14} /> Newest First</button></div>{products.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{products.slice(0, 16).map((product, index) => <NewProductCard key={product.id} product={product} index={index} />)}</div> : <div className="rounded-2xl border border-border bg-bg-surface p-10 text-center text-sm text-text-muted">No new products found.</div>}</section></div></div></main><Footer /></div>;
}
