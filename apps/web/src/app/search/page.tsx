import type { Metadata } from "next";
import Link from "next/link";
import { Search as SearchIcon, X } from "lucide-react";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import { getBestSellers, normalizeSearchQuery, searchProducts } from "@/lib/products";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Search — MH Fashion", description: "Search the MH Fashion catalog by product name, line or product type.", robots: { index: false, follow: true } };

const SUGGESTIONS = [
  { label: "T-Shirts", href: "/collections?category=t-shirts" },
  { label: "Hoodies", href: "/collections?category=hoodies" },
  { label: "Phone Covers", href: "/collections?category=phone-covers" },
  { label: "MH Sport jerseys", href: "/mh-fashion" },
  { label: "Nyein ready-made", href: "/nyein" },
  { label: "All products", href: "/products" },
];

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const raw = params.q ?? "";
  const term = normalizeSearchQuery(raw);
  const tooShort = term.length > 0 && term.length < 2;
  const results = term.length >= 2 ? await searchProducts(term) : [];
  const popular = term.length >= 2 && !results.length ? await getBestSellers(6) : [];

  return (
    <div><Header /><main className="w-full bg-bg px-4 py-5 sm:px-6 lg:px-8 lg:py-8"><div className="mx-auto max-w-[1480px]">
      <div className="mb-5">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent">Shop</p>
        <h1 className="mt-2 text-2xl font-black sm:text-4xl">Search</h1>
      </div>

      <form action="/search" method="get" role="search" data-search-form className="flex max-w-xl items-center gap-2 rounded-full border border-border bg-bg-surface px-3 py-1.5">
        <SearchIcon size={16} className="shrink-0 text-text-secondary" />
        <input
          type="search"
          name="q"
          aria-label="Search products"
          defaultValue={raw}
          placeholder="Search a product, a line or a type"
          autoFocus
          className="w-full bg-transparent py-1.5 text-xs outline-none placeholder:text-text-faint"
        />
        {term ? <a href="/search" aria-label="Clear search" className="text-text-muted hover:text-accent"><X size={15} /></a> : null}
        <button type="submit" className="rounded-full bg-accent px-3 py-1.5 text-[11px] font-bold text-accent-foreground">Search</button>
      </form>

      {term.length >= 2 ? (
        <section className="mt-6" data-search-results>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-xl font-black"><span className="text-accent">{results.length}</span> {results.length === 1 ? "result" : "results"} for “{term}”</h2>
              <p className="mt-1 text-xs text-text-muted">Matched on the product name, the line and the product type.</p>
            </div>
            <Link href="/products" className="rounded-full bg-accent/10 px-3 py-1.5 text-[10px] font-bold text-accent">Browse all products</Link>
          </div>

          {results.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              {results.map((product) => <div key={product.id} data-search-result className="aspect-square overflow-hidden rounded-xl border border-border bg-bg-surface p-1.5 shadow-sm sm:p-2.5"><ProductCard product={product} /></div>)}
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-bg-surface p-8 text-center" data-search-empty>
              <SearchIcon size={26} className="mx-auto text-text-muted" />
              <h3 className="mt-3 text-base font-black">Nothing matched “{term}”</h3>
              <p className="mt-1 text-xs text-text-muted">Try a shorter word, a colour, or one of these:</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((item) => <a key={item.href} href={item.href} className="rounded-full border border-border px-3 py-1.5 text-[10px] font-bold hover:border-accent hover:text-accent">{item.label}</a>)}
              </div>
            </div>
          )}

          {popular.length ? (
            <section className="mt-8">
              <h3 className="text-base font-black">Popular right now</h3>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                {popular.map((product) => <div key={product.id} className="aspect-square overflow-hidden rounded-xl border border-border bg-bg-surface p-1.5 shadow-sm sm:p-2.5"><ProductCard product={product} /></div>)}
              </div>
            </section>
          ) : null}
        </section>
      ) : (
        <section className="mt-6" data-search-idle>
          <div className="rounded-2xl border border-border bg-bg-surface p-8 text-center">
            <SearchIcon size={26} className="mx-auto text-text-muted" />
            <h3 className="mt-3 text-base font-black">{tooShort ? "Type at least two characters" : "What are you looking for?"}</h3>
            <p className="mt-1 text-xs text-text-muted">Search the catalog by product name, by line (MH Sport, Nyein) or by product type.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((item) => <a key={item.href} href={item.href} className="rounded-full border border-border px-3 py-1.5 text-[10px] font-bold hover:border-accent hover:text-accent">{item.label}</a>)}
            </div>
          </div>
        </section>
      )}
    </div></main></div>
  );
}
