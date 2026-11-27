import type { Metadata } from "next";
import Link from "next/link";
import { Search as SearchIcon } from "lucide-react";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import SearchField from "@/components/SearchField";
import SearchTabs, { SearchGroupEmpty } from "@/components/SearchTabs";
import T from "@/components/T";
import { MH_DESIGN_LIBRARY } from "@/lib/editor-design-library";
import { filterGuidePosts, getGuideCatalog, type GuidePost } from "@/lib/guides";
import { getBestSellers, normalizeSearchQuery, searchCatalog } from "@/lib/products";
import { SEARCH_CAPS, readSearchType, type SearchType } from "@/lib/search-caps";
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
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent"><T k="search.kicker" /></p>
        <h1 className="mt-2 text-2xl font-black sm:text-4xl"><T k="search.title" /></h1>
      </div>

      <form action="/search" method="get" role="search" data-search-form className="flex max-w-xl items-center gap-2 rounded-full border border-border bg-bg-surface px-3 py-1.5">
        <SearchField initial={raw} />
      </form>

      {searching ? (
        <section className="mt-6" data-search-results>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-xl font-black" aria-live="polite">
                <T k={total === 1 ? "search.resultCountOne" : "search.resultCount"} values={{ count: total, term }} />
              </h2>
              <p className="mt-1 text-xs text-text-muted">
                {products.approximate ? <T k="search.approximate" values={{ term }} /> : <T k="search.matched" />}
              </p>
            </div>
            <Link href="/products" className="rounded-full bg-accent/10 px-3 py-1.5 text-[10px] font-bold text-accent"><T k="search.browseAll" /></Link>
          </div>

          <SearchTabs term={term} type={type} counts={counts} />

          <div className="mt-4">
            {type === "products" ? (
              products.products.length ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5" data-search-group="products">
                  {products.products.map((product) => <div key={product.id} data-search-result className="aspect-square overflow-hidden rounded-xl border border-border bg-bg-surface p-1.5 shadow-sm sm:p-2.5"><ProductCard product={product} /></div>)}
                </div>
              ) : <SearchGroupEmpty group="products" term={term} />
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
              ) : <SearchGroupEmpty group="guides" term={term} />
            ) : null}

            {type === "designs" ? (
              designs.length ? (
                <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-search-group="designs">
                  {designs.map((design) => (
                    <li key={design.id}>
                      <Link href="/create" data-search-design={design.id} className="flex h-full flex-col rounded-xl border border-border bg-bg-surface p-4 hover:border-accent">
                        <span className="text-sm font-black">{design.name}</span>
                        <span className="mt-1 line-clamp-2 text-xs text-text-muted">{design.layers.map((layer) => layer.name).join(" · ")}</span>
                        <span className="mt-2 text-[10px] font-bold text-accent"><T k="search.openEditor" /></span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <SearchGroupEmpty group="designs" term={term} />
            ) : null}
          </div>

          {!total ? (
            <div className="mt-6 rounded-2xl border border-border bg-bg-surface p-8 text-center" data-search-empty>
              <SearchIcon size={26} className="mx-auto text-text-muted" />
              <h3 className="mt-3 text-base font-black"><T k="search.emptyTitle" values={{ term }} /></h3>
              <p className="mt-1 text-xs text-text-muted"><T k="search.emptyHelp" /></p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((item) => <Link key={item.href} href={item.href} className="rounded-full border border-border px-3 py-1.5 text-[10px] font-bold hover:border-accent hover:text-accent">{item.label}</Link>)}
              </div>
            </div>
          ) : null}

          {popular.length ? (
            <section className="mt-8">
              <h3 className="text-base font-black"><T k="search.popular" /></h3>
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
