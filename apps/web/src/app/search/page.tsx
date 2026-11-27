import type { Metadata } from "next";
import Link from "next/link";
import { Search as SearchIcon } from "lucide-react";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import SearchField from "@/components/SearchField";
import T from "@/components/T";
import { normalizeSearchQuery, searchCatalog } from "@/lib/products";
import { SEARCH_CAPS } from "@/lib/search-caps";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Search — MH Fashion", description: "Search the MH Fashion catalog by product name, line, product type or tag.", robots: { index: false, follow: true } };

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
  const searching = term.length >= 2;
  const { products } = searching ? await searchCatalog(term, SEARCH_CAPS.products) : { products: [] };

  return (
    <div><Header /><main className="w-full bg-bg px-4 py-5 sm:px-6 lg:px-8 lg:py-8"><div className="mx-auto max-w-[1480px]">
      {searching ? null : (
        <div className="mb-5">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent"><T k="search.kicker" /></p>
          <h1 className="mt-2 text-2xl font-black sm:text-4xl"><T k="search.title" /></h1>
        </div>
      )}

      <form action="/search" method="get" role="search" data-search-form className="flex max-w-xl items-center gap-2 rounded-full border border-border bg-bg-surface px-3 py-1.5">
        <SearchField initial={raw} />
      </form>

      {searching ? (
        products.length ? (
          <section className="mt-5" data-search-results>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5" data-search-group="products">
              {products.map((product) => <div key={product.id} data-search-result className="aspect-square overflow-hidden rounded-xl border border-border bg-bg-surface p-1.5 shadow-sm sm:p-2.5"><ProductCard product={product} /></div>)}
            </div>
          </section>
        ) : (
          <section className="mt-5" data-search-empty>
            <div className="min-h-[311px] rounded-2xl border border-border bg-bg-surface p-8 text-center sm:min-h-[212px]">
              <SearchIcon size={26} className="mx-auto text-text-muted" />
              <h2 className="mt-3 text-base font-black"><T k="search.emptyTitle" /></h2>
              <p className="mt-1 text-xs text-text-muted"><T k="search.emptyHelp" /></p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((item) => <Link key={item.href} href={item.href} className="rounded-full border border-border px-3 py-1.5 text-[10px] font-bold hover:border-accent hover:text-accent">{item.label}</Link>)}
              </div>
            </div>
          </section>
        )
      ) : (
        <section className="mt-6" data-search-idle>
          <div className="min-h-[311px] rounded-2xl border border-border bg-bg-surface p-8 text-center sm:min-h-[212px]">
            <SearchIcon size={26} className="mx-auto text-text-muted" />
            <h2 className="mt-3 text-base font-black"><T k={tooShort ? "search.idleShort" : "search.idleTitle"} /></h2>
            <p className="mt-1 text-xs text-text-muted"><T k="search.idleHelp" /></p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((item) => <Link key={item.href} href={item.href} className="rounded-full border border-border px-3 py-1.5 text-[10px] font-bold hover:border-accent hover:text-accent">{item.label}</Link>)}
            </div>
          </div>
        </section>
      )}
    </div></main></div>
  );
}
