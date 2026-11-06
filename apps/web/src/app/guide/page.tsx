import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, Clock3, Search, X } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import GuideCard from "@/components/guide/GuideCard";
import { filterGuidePosts, getGuideCatalog } from "@/lib/guides";
import { guideMetadata } from "@/lib/guide-metadata";

export const dynamic = "force-dynamic";

type SearchParams = { category?: string | string[]; q?: string | string[] };
type PageProps = { searchParams: Promise<SearchParams> };

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function guideUrl(category: string, query: string): string {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (query) params.set("q", query);
  return params.size ? `/guide?${params.toString()}#articles` : "/guide#articles";
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  return guideMetadata({
    title: "MH Fashion Guide — Products, Design & Payment",
    description: "Find your fit, understand product options, and learn the MH Fashion design, payment and delivery workflow. Practical guides for your next custom piece.",
    path: "/guide",
    noindex: Boolean(first(params.q) || first(params.category)),
  });
}

export default async function GuidePage({ searchParams }: PageProps) {
  const [catalog, params] = await Promise.all([getGuideCatalog(), searchParams]);
  const query = first(params.q).trim().slice(0, 200);
  const selectedCategory = first(params.category);
  const activeCategory = catalog.categories.find((category) => category.slug === selectedCategory);
  const posts = filterGuidePosts(catalog.posts, selectedCategory, query);
  const categoryNames = new Map(catalog.categories.map((category) => [category.slug, category.name]));
  const featured = !selectedCategory && !query
    ? catalog.posts.find((post) => post.featured) ?? catalog.posts[0]
    : undefined;

  return (
    <div>
      <Header />
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 md:py-12">
        <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-xs text-text-muted">
          <Link href="/" className="hover:text-accent">Home</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="text-text-primary">Guide</span>
        </nav>

        <section className="mb-10 flex flex-col justify-between gap-8 border-b border-border pb-10 md:flex-row md:items-end md:gap-12">
          <div className="max-w-xl">
            <p className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
              <BookOpen size={14} aria-hidden="true" /> The MH Fashion handbook
            </p>
            <h1 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
              KNOW YOUR<br /><span className="text-accent">NEXT MOVE.</span>
            </h1>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-text-secondary">
              From choosing your product to making it yours. Clear answers for every step of your custom piece.
            </p>
          </div>
          <form action="/guide#articles" method="get" className="w-full md:max-w-sm" role="search">
            <label htmlFor="guide-search" className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.15em] text-text-muted">
              What do you want to know?
            </label>
            {selectedCategory && <input type="hidden" name="category" value={selectedCategory} />}
            <div className="flex items-center gap-2 rounded-lg border border-border-light bg-bg-surface p-1.5 focus-within:border-accent">
              <Search size={17} className="ml-2 shrink-0 text-text-muted" aria-hidden="true" />
              <input
                key={`${selectedCategory}:${query}`}
                id="guide-search"
                type="search"
                name="q"
                defaultValue={query}
                maxLength={200}
                placeholder="Search products, payments, design…"
                className="min-w-0 flex-1 bg-transparent py-2 text-xs text-text-primary outline-none placeholder:text-text-muted"
              />
              <button type="submit" aria-label="Search guides" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground outline-none focus-visible:ring-2 focus-visible:ring-text-primary">
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
          </form>
        </section>

        {catalog.source === "starter" && (
          <p className="mb-8 rounded-lg border border-border bg-bg-surface px-4 py-3 text-xs leading-relaxed text-text-muted">
            Starter handbook · These guides explain the planned MH Fashion experience. Some features and payment integrations are still being developed.
          </p>
        )}

        {featured && (
          <section aria-labelledby="featured-heading" className="mb-10">
            <Link href={`/guide/${featured.slug}`} className="group flex flex-col gap-6 rounded-xl border border-border bg-bg-surface p-6 outline-none focus-visible:ring-2 focus-visible:ring-accent sm:p-8 md:flex-row md:items-center md:gap-12">
              <div className="flex items-center gap-4 md:w-40 md:shrink-0 md:flex-col md:items-start">
                <span aria-hidden="true" className="text-5xl font-black tracking-tighter text-accent sm:text-6xl">01<span className="text-text-faint">/</span></span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-accent">Start here</p>
                  <p className="mt-1 text-xs text-text-muted">{categoryNames.get(featured.categorySlug)}</p>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="featured-heading" className="mb-3 text-2xl font-bold leading-tight transition-colors group-hover:text-accent sm:text-3xl">{featured.title}</h2>
                <p className="max-w-xl text-sm leading-relaxed text-text-secondary">{featured.excerpt}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-xs text-text-muted"><Clock3 size={13} aria-hidden="true" /> {featured.readingMinutes} min read</span>
              </div>
              <span className="flex items-center gap-2 text-sm font-semibold text-accent md:self-end">Read guide <ArrowUpRight size={18} aria-hidden="true" /></span>
            </Link>
          </section>
        )}

        <section id="articles" aria-labelledby="articles-heading" className="scroll-mt-24">
          <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <h2 id="articles-heading" className="text-lg font-bold">Browse the handbook</h2>
            <nav aria-label="Guide categories" className="flex flex-wrap gap-2">
              <Link href={guideUrl("", query)} aria-current={!selectedCategory ? "page" : undefined} className={`rounded-full border px-3.5 py-2 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-accent ${!selectedCategory ? "border-accent bg-accent text-accent-foreground" : "border-border text-text-secondary hover:border-border-light hover:text-text-primary"}`}>
                All guides <span className="ml-1 opacity-70">{catalog.posts.length}</span>
              </Link>
              {catalog.categories.map((category) => (
                <Link key={category.id} href={guideUrl(category.slug, query)} aria-current={selectedCategory === category.slug ? "page" : undefined} className={`rounded-full border px-3.5 py-2 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-accent ${selectedCategory === category.slug ? "border-accent bg-accent text-accent-foreground" : "border-border text-text-secondary hover:border-border-light hover:text-text-primary"}`}>
                  {category.name} <span className="ml-1 opacity-70">{catalog.posts.filter((post) => post.categorySlug === category.slug).length}</span>
                </Link>
              ))}
            </nav>
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs text-text-muted" aria-live="polite">
            <p>{posts.length} {posts.length === 1 ? "guide" : "guides"}{activeCategory ? ` in ${activeCategory.name}` : ""}{query ? ` matching “${query}”` : ""}</p>
            {(query || selectedCategory) && <Link href="/guide#articles" className="flex items-center gap-1 hover:text-accent"><X size={12} aria-hidden="true" /> Clear filters</Link>}
          </div>

          {catalog.source === "unavailable" ? (
            <div className="rounded-lg border border-border bg-bg-surface px-6 py-12 text-center" role="status">
              <BookOpen size={26} className="mx-auto mb-4 text-text-muted" aria-hidden="true" />
              <h3 className="mb-2 text-lg font-bold">The handbook is temporarily unavailable.</h3>
              <p className="text-sm text-text-secondary">We could not load the guides. Please try again in a moment.</p>
              <Link href="/guide" className="mt-5 inline-block text-sm font-semibold text-accent">Try again</Link>
            </div>
          ) : posts.length ? (
            <div className="grid gap-x-10 md:grid-cols-2">
              {posts.map((post, index) => <GuideCard key={post.id} post={post} categoryName={categoryNames.get(post.categorySlug) ?? "Guide"} index={index} />)}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-bg-surface px-6 py-12 text-center">
              <Search size={26} className="mx-auto mb-4 text-text-muted" aria-hidden="true" />
              <h3 className="mb-2 text-lg font-bold">{query || selectedCategory ? "No guides match your search." : "New guides are on the way."}</h3>
              <p className="text-sm text-text-secondary">{query || selectedCategory ? "Try a different keyword or browse all categories." : "Published articles will appear here when they are ready."}</p>
              {(query || selectedCategory) && <Link href="/guide#articles" className="mt-5 inline-block text-sm font-semibold text-accent">Browse all guides</Link>}
            </div>
          )}
        </section>

        <aside className="mt-10 flex flex-col justify-between gap-5 border-t border-border py-8 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold">Your idea. Your next piece.</h2>
            <p className="mt-2 text-sm text-text-muted">Explore the design workspace and see how it comes together.</p>
          </div>
          <Link href="/create" className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-accent px-5 py-3 text-xs font-bold text-accent-foreground outline-none focus-visible:ring-2 focus-visible:ring-text-primary sm:self-auto">Explore the editor <ArrowRight size={15} aria-hidden="true" /></Link>
        </aside>
      </main>
      <Footer />
    </div>
  );
}
