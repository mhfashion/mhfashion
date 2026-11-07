import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Coffee,
  Filter,
  Grid2X2,
  Heart,
  Search,
  Shirt,
  ShoppingBag,
  Smartphone,
  SlidersHorizontal,
  Smile,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { getBestSellers, getNewArrivals } from "@/lib/products";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

 type SearchParams = { q?: string | string[]; sort?: string | string[]; category?: string | string[] };
 type PageProps = { searchParams: Promise<SearchParams> };

const CATEGORIES = [
  { label: "All", slug: "", Icon: Grid2X2, count: 256 },
  { label: "T-Shirts", slug: "t-shirts", Icon: Shirt, count: 128 },
  { label: "Kids", slug: "kids-t-shirts", Icon: Smile, count: 48 },
  { label: "Phone Covers", slug: "phone-covers", Icon: Smartphone, count: 36 },
  { label: "Bags", slug: "bags", Icon: ShoppingBag, count: 24 },
  { label: "Cups", slug: "cups", Icon: Coffee, count: 20 },
];

function first(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function popularUrl(category: string, sort: string, query: string) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (sort) params.set("sort", sort);
  if (query) params.set("q", query);
  const value = params.toString();
  return value ? `/popular?${value}` : "/popular";
}

function ProductVisual({ product, rank }: { product: Product; rank: number }) {
  return <div className="relative rounded-xl border border-border bg-bg-surface p-2.5 shadow-sm"><span className={`absolute left-3 top-3 z-10 rounded-full px-2 py-1 text-[9px] font-black text-white ${rank === 1 ? "bg-[#69b917]" : rank === 2 ? "bg-[#8bc34a]" : "bg-[#f2b719]"}`}>#{rank}</span><span className="absolute right-3 top-3 z-10 rounded-full bg-bg-surface/90 px-2 py-1 text-[9px] font-bold text-accent">{rank === 1 ? "BEST SELLER" : rank === 2 ? "TRENDING" : "POPULAR"}</span><ProductCard product={product} /><div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-[10px] text-text-muted"><span>★ 4.{9 - (rank % 3)} ({(12 - (rank % 5))}.5K)</span><Heart size={14} className="text-text-primary" /></div></div>;
}

function FilterPanel() {
  return <aside className="hidden rounded-2xl border border-border bg-bg-surface p-5 lg:block"><h2 className="flex items-center gap-2 border-b border-border pb-4 text-sm font-black"><Filter size={17} /> Filter Products</h2><fieldset className="mt-5"><legend className="text-xs font-black">Category</legend><div className="mt-3 space-y-2.5">{CATEGORIES.slice(1, 6).map(({ label, count }) => <label key={label} className="flex items-center gap-2 text-xs text-text-secondary"><span className="flex h-4 w-4 rounded border border-border-light" /> {label} ({count})</label>)}</div></fieldset><fieldset className="mt-6"><legend className="text-xs font-black">Price Range</legend><div className="mt-4 h-1 rounded-full bg-accent"><span className="relative -top-1 block h-3 w-3 rounded-full bg-accent" /><span className="relative -top-4 ml-auto block h-3 w-3 rounded-full bg-accent" /></div><div className="mt-2 flex justify-between text-[10px] text-text-muted"><span>MMK 0</span><span>MMK 100,000+</span></div></fieldset><fieldset className="mt-6"><legend className="text-xs font-black">Color</legend><div className="mt-3 flex flex-wrap gap-2">{["#fff", "#1b1f24", "#e94b45", "#2448d8", "#20a866", "#f3d21c", "#a084e8", "#ef50ca", "#ef7f65", "#a8adb2"].map((color) => <span key={color} className="h-5 w-5 rounded-full border border-border-light" style={{ backgroundColor: color }} />)}</div></fieldset><fieldset className="mt-6"><legend className="text-xs font-black">Size</legend><div className="mt-3 flex flex-wrap gap-1.5">{["XS", "S", "M", "L", "XL", "XXL"].map((size) => <span key={size} className="rounded border border-border px-2 py-1 text-[10px]">{size}</span>)}</div></fieldset><label className="mt-6 flex items-center gap-2 text-xs"><span className="flex h-4 w-4 items-center justify-center rounded bg-accent text-accent-foreground"><Check size={11} /></span> In Stock Only</label><button className="mt-5 w-full rounded-full bg-accent py-2.5 text-xs font-bold text-accent-foreground">Apply Filters <ArrowRight size={13} className="ml-1 inline" /></button></aside>;
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Popular Products — MH Fashion", description: "Discover MH Fashion's most popular custom products and customer-loved designs." };
}

export default async function PopularPage({ searchParams }: PageProps) {
  const [bestSellers, newArrivals, params] = await Promise.all([getBestSellers(16), getNewArrivals(8), searchParams]);
  const category = first(params.category);
  const query = first(params.q).trim().toLocaleLowerCase();
  const sort = first(params.sort);
  const seen = new Set<string>();
  const source = [...bestSellers, ...newArrivals].filter((product) => { if (seen.has(product.id)) return false; seen.add(product.id); return true; });
  const filtered = source.filter((product) => !query || product.name.toLocaleLowerCase().includes(query));
  const products = [...filtered].sort((a, b) => sort === "price-low" ? a.priceMinKs - b.priceMinKs : sort === "price-high" ? b.priceMinKs - a.priceMinKs : 0);
  const displayed = products.length ? products : source;

  return <div><Header /><main className="w-full bg-bg px-4 py-4 sm:px-6 lg:px-8 lg:py-6"><div className="mx-auto max-w-[1480px]">
    <section className="grid gap-4 lg:grid-cols-[0.65fr_1.35fr] lg:items-center"><div className="px-2 py-5 sm:px-4 lg:px-6"><p className="text-4xl font-black leading-none sm:text-5xl">🔥 Popular<br /><span className="text-accent">Products</span></p><p className="mt-5 max-w-sm text-sm leading-relaxed text-text-secondary">Discover our most loved and trending designs!</p></div><div className="relative min-h-[190px] overflow-hidden rounded-2xl bg-gradient-to-r from-[#efffdc] via-[#dbf5b8] to-[#b7e97a] p-6 sm:min-h-[220px] sm:p-9"><div className="relative z-10"><h1 className="text-4xl font-black italic leading-none sm:text-5xl">Trending Now</h1><p className="mt-3 max-w-xs text-sm font-semibold">Shop the most popular items loved by our customers!</p><a href="#products" className="mt-5 inline-flex rounded-full bg-accent px-4 py-2.5 text-xs font-bold text-accent-foreground">Shop Popular <ArrowRight size={14} className="ml-1" /></a></div><div className="absolute -right-12 -top-14 h-72 w-72 rounded-full bg-[#8dd63e]/50" /><div className="absolute bottom-[-55px] right-[19%] hidden h-64 w-40 rotate-[-5deg] rounded-[42%] bg-white/85 shadow-xl sm:block"><div className="absolute left-1/2 top-16 -translate-x-1/2 text-center text-2xl font-black leading-none text-accent">MH<br /><span className="text-xs">FASHION</span></div></div><div className="absolute bottom-4 right-6 text-2xl font-black italic text-[#4f9917]/70">Good Vibes<br />Only ♡</div></div></section>
    <nav aria-label="Popular categories" className="my-5 flex gap-2 overflow-x-auto pb-1">{CATEGORIES.map(({ label, slug, Icon, count }) => <Link key={label} href={popularUrl(slug, sort, query)} className={`flex min-w-[108px] shrink-0 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-bold ${category === slug ? "border-accent bg-accent text-accent-foreground" : "border-border bg-bg-surface hover:border-accent"}`}><Icon size={18} /><span>{label}<span className="ml-1 text-[10px] opacity-70">{count}</span></span></Link>)}</nav>
    <div className="mb-5 grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]"><FilterPanel /><section id="products" className="min-w-0"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black"><span className="text-accent">{displayed.length || 256}</span> Products Found</h2><p className="mt-1 text-xs text-text-muted">Popular designs selected for you</p></div><div className="flex items-center gap-2"><form action="/popular" method="get" className="hidden items-center rounded-lg border border-border bg-bg-surface px-3 py-2 sm:flex"><Search size={14} className="mr-2 text-text-muted" /><input name="q" defaultValue={first(params.q)} placeholder="Search products..." className="w-32 bg-transparent text-xs outline-none" />{category && <input type="hidden" name="category" value={category} />}</form><Link href={popularUrl(category, sort === "price-low" ? "price-high" : "price-low", query)} className="inline-flex items-center gap-1 rounded-lg border border-border bg-bg-surface px-3 py-2 text-xs font-semibold"><SlidersHorizontal size={14} /> Sort <ChevronDown size={13} /></Link><span className="hidden rounded-lg bg-accent p-2 text-accent-foreground sm:inline-flex"><Grid2X2 size={16} /></span></div></div><div className="mb-4 flex gap-2 lg:hidden"><button className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-bg-surface py-2 text-xs font-semibold"><Filter size={14} /> Filter</button><button className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-bg-surface py-2 text-xs font-semibold"><SlidersHorizontal size={14} /> Most Popular</button></div>{displayed.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{displayed.slice(0, 12).map((product, index) => <ProductVisual key={product.id} product={product} rank={index + 1} />)}</div> : <div className="rounded-2xl border border-border bg-bg-surface p-10 text-center text-sm text-text-muted">No products found.</div>}</section></div>
  </div></main><Footer /></div>;
}
