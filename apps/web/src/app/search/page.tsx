import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Search as SearchIcon, Shapes, Shirt, X } from "lucide-react";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import { MH_DESIGN_LIBRARY } from "@/lib/editor-design-library";
import { filterGuidePosts, getGuideCatalog, type GuidePost } from "@/lib/guides";
import { getBestSellers, normalizeSearchQuery, searchCatalog } from "@/lib/products";
import { SEARCH_CAPS, searchHref, readSearchType, type SearchType } from "@/lib/search-caps";
import { matchesSearchQuery } from "@/lib/search-text";

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

const TABS: { type: SearchType; label: string; icon: typeof Shirt }[] = [
  { type: "products", label: "Products", icon: Shirt },
  { type: "guides", label: "Guides", icon: BookOpen },
  { type: "designs", label: "Designs", icon: Shapes },
];

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
  const params = await searchParams;
  const raw = params.q ?? "";
  const term = normalizeSearchQuery(raw);
  const type = readSearchType(params.type);
  const tooShort = term.length > 0 && term.length < 2;
  const searching = term.length >= 2;

  const products = searching ? await searchCatalog(term, SEARCH_CAPS.products) : { products: [], approximate: false };
  const guides: GuidePost[] = searching
    ? filterGuidePosts((await getGuideCatalog()).posts, "", term).slice(0, SEARCH_CAPS.guides)
    : [];
  const designs = searching
    ? MH_DESIGN_LIBRARY
      .filter((design) => matchesSearchQuery([design.name, ...design.layers.map((layer) => layer.name)].join(" "), term))
      .slice(0, SEARCH_CAPS.designs)
    : [];
  const counts: Record<SearchType, number> = { products: products.products.length, guides: guides.length, designs: designs.length };
  const total = counts.products + counts.guides + counts.designs;
  const popular = searching && !total ? await getBestSellers(6) : [];

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
          aria-label="Search products, guides and designs"
          defaultValue={raw}
          placeholder="Search a product, a guide or a design"
          autoFocus
          className="w-full bg-transparent py-1.5 text-xs outline-none placeholder:text-text-faint"
        />
        {term ? <Link href="/search" aria-label="Clear search" className="text-text-muted hover:text-accent"><X size={15} /></Link> : null}
        <button type="submit" className="min-h-9 shrink-0 rounded-full bg-accent px-3.5 py-1.5 text-[11px] font-bold text-accent-foreground">Search</button>
      </form>

      {searching ? (
        <section className="mt-6" data-search-results>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-xl font-black"><span className="text-accent" aria-live="polite">{total}</span> {total === 1 ? "result" : "results"} for “{term}”</h2>
              <p className="mt-1 text-xs text-text-muted">
                {products.approximate
                  ? `No exact product matched “${term}”, so these are the closest ones.`
                  : "Matched on the name, the line, the type, the tags and the guide text."}
              </p>
            </div>
            <Link href="/products" className="rounded-full bg-accent/10 px-3 py-1.5 text-[10px] font-bold text-accent">Browse all products</Link>
          </div>

          <div role="tablist" aria-label="Result groups" className="flex gap-1.5 overflow-x-auto pb-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = tab.type === type;
              return (
                <Link
                  key={tab.type}
                  href={searchHref(term, tab.type)}
                  role="tab"
                  aria-selected={active}
                  data-search-tab={tab.type}
                  data-search-tab-count={counts[tab.type]}
                  className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[11px] font-bold ${active ? "border-accent bg-accent/10 text-accent" : "border-border text-text-secondary hover:border-accent hover:text-accent"}`}
                >
                  <Icon size={14} aria-hidden="true" /> {tab.label} <span className="text-text-muted">{counts[tab.type]}</span>
                </Link>
              );
            })}
          </div>

          <div className="mt-4">
            {type === "products" ? (
              products.products.length ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5" data-search-group="products">
                  {products.products.map((product) => <div key={product.id} data-search-result className="aspect-square overflow-hidden rounded-xl border border-border bg-bg-surface p-1.5 shadow-sm sm:p-2.5"><ProductCard product={product} /></div>)}
                </div>
              ) : <GroupEmpty label="product" term={term} />
            ) : null}

            {type === "guides" ? (
              guides.length ? (
                <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-search-group="guides">
                  {guides.map((guide) => (
                    <li key={guide.slug}>
                      <Link href={`/guide/${guide.slug}`} data-search-guide className="flex h-full flex-col rounded-xl border border-border bg-bg-surface p-4 hover:border-accent">
                        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-accent">{guide.categorySlug.replace(/-/g, " ")}</span>
                        <span className="mt-1.5 text-sm font-black">{guide.title}</span>
                        <span className="mt-1 line-clamp-2 text-xs text-text-muted">{guide.excerpt}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <GroupEmpty label="guide" term={term} />
            ) : null}

            {type === "designs" ? (
              designs.length ? (
                <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-search-group="designs">
                  {designs.map((design) => (
                    <li key={design.id}>
                      <Link href="/create" data-search-design={design.id} className="flex h-full flex-col rounded-xl border border-border bg-bg-surface p-4 hover:border-accent">
                        <span className="text-sm font-black">{design.name}</span>
                        <span className="mt-1 line-clamp-2 text-xs text-text-muted">{design.layers.map((layer) => layer.name).join(" · ")}</span>
                        <span className="mt-2 text-[10px] font-bold text-accent">Open the editor</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <GroupEmpty label="design" term={term} />
            ) : null}
          </div>

          {!total ? (
            <div className="mt-6 rounded-2xl border border-border bg-bg-surface p-8 text-center" data-search-empty>
              <SearchIcon size={26} className="mx-auto text-text-muted" />
              <h3 className="mt-3 text-base font-black">Nothing matched “{term}”</h3>
              <p className="mt-1 text-xs text-text-muted">Try a shorter word, a colour, or one of these:</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((item) => <Link key={item.href} href={item.href} className="rounded-full border border-border px-3 py-1.5 text-[10px] font-bold hover:border-accent hover:text-accent">{item.label}</Link>)}
              </div>
            </div>
          ) : null}

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
            <h2 className="mt-3 text-base font-black">{tooShort ? "Type at least two characters" : "What are you looking for?"}</h2>
            <p className="mt-1 text-xs text-text-muted">Search the catalog by product name, by line (MH Sport, Nyein), by product type, or the guides.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((item) => <Link key={item.href} href={item.href} className="rounded-full border border-border px-3 py-1.5 text-[10px] font-bold hover:border-accent hover:text-accent">{item.label}</Link>)}
            </div>
          </div>
        </section>
      )}
    </div></main></div>
  );
}

function GroupEmpty({ label, term }: { label: string; term: string }) {
  return (
    <div className="rounded-2xl border border-border bg-bg-surface p-8 text-center" data-search-group-empty={label}>
      <p className="text-sm font-black">No {label} matched “{term}”</p>
      <p className="mt-1 text-xs text-text-muted">Another group may have an answer — try the other tabs.</p>
    </div>
  );
}
