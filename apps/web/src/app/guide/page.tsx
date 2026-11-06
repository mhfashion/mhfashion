import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, Clock3, Search, X } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import GuideCard from "@/components/guide/GuideCard";
import GuideLabel from "@/components/guide/GuideLabel";
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
    title: "MH Fashion Blog Posts — Products, Design & Payment",
    description: "Read MH Fashion posts about products, design, payment and delivery for your next custom piece.",
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
      <main className="w-full px-6 py-6 sm:px-8 lg:px-10 md:py-10">
        <section className="mb-8 flex flex-col justify-between gap-5 border-b border-border pb-7 lg:flex-row lg:items-end">
          <div>
            <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
              <BookOpen size={14} aria-hidden="true" /> <GuideLabel id="guide.blog" fallback="MH Fashion blog posts" />
            </p>
            <h1 className="text-2xl font-black leading-none tracking-tight sm:text-3xl"><GuideLabel id="guide.blogPosts" fallback="Blog posts" /></h1>
          </div>
          <form action="/guide#articles" method="get" className="w-full md:max-w-sm" role="search">
            <label htmlFor="guide-search" className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.15em] text-text-muted">
              Search posts
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
                <button type="submit" aria-label="Search posts" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground outline-none focus-visible:ring-2 focus-visible:ring-text-primary">
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
          </form>
        </section>

        {catalog.source === "starter" && (
          <p className="mb-8 rounded-lg border border-border bg-bg-surface px-4 py-3 text-xs leading-relaxed text-text-muted">
            Starter posts · These articles explain the planned MH Fashion experience. Some features and payment integrations are still being developed.
          </p>
        )}

        {featured && (
          <section aria-labelledby="featured-heading" className="mb-10">
              <Link href={`/guide/${featured.slug}`} className="group grid overflow-hidden rounded-xl border border-border bg-bg-surface outline-none focus-visible:ring-2 focus-visible:ring-accent md:grid-cols-[minmax(240px,0.8fr)_1.2fr]">
              {featured.coverImageUrl && <div className="relative aspect-[16/9] overflow-hidden bg-bg md:aspect-auto"><img src={featured.coverImageUrl} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /></div>}
              <div className="flex flex-col justify-between gap-6 p-5 sm:p-7">
                <div>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-accent"><GuideLabel id="guide.featured" fallback="Featured post" /></p>
                    <p className="text-xs text-text-muted">{categoryNames.get(featured.categorySlug)}</p>
                  </div>
                  <h2 id="featured-heading" className="mb-3 text-xl font-bold leading-tight transition-colors group-hover:text-accent sm:text-2xl">{featured.title}</h2>
                  <p className="max-w-2xl text-sm leading-relaxed text-text-secondary">{featured.excerpt}</p>
                </div>
                <div className="flex items-center justify-between gap-4 text-xs">
                  <span className="inline-flex items-center gap-1.5 text-text-muted"><Clock3 size={13} aria-hidden="true" /> {featured.readingMinutes} min read</span>
                  <span className="flex items-center gap-2 font-semibold text-accent"><GuideLabel id="guide.read" fallback="Read post" /> <ArrowUpRight size={18} aria-hidden="true" /></span>
                </div>
              </div>
            </Link>
          </section>
        )}

        <section id="articles" aria-labelledby="articles-heading" className="scroll-mt-24">
          <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <h2 id="articles-heading" className="text-lg font-bold"><GuideLabel id="guide.latest" fallback="Latest posts" /></h2>
            <nav aria-label="Post categories" className="flex flex-wrap gap-2">
              <Link href={guideUrl("", query)} aria-current={!selectedCategory ? "page" : undefined} className={`rounded-full border px-3.5 py-2 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-accent ${!selectedCategory ? "border-accent bg-accent text-accent-foreground" : "border-border text-text-secondary hover:border-border-light hover:text-text-primary"}`}>
                All posts <span className="ml-1 opacity-70">{catalog.posts.length}</span>
              </Link>
              {catalog.categories.map((category) => (
                <Link key={category.id} href={guideUrl(category.slug, query)} aria-current={selectedCategory === category.slug ? "page" : undefined} className={`rounded-full border px-3.5 py-2 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-accent ${selectedCategory === category.slug ? "border-accent bg-accent text-accent-foreground" : "border-border text-text-secondary hover:border-border-light hover:text-text-primary"}`}>
                  {category.name} <span className="ml-1 opacity-70">{catalog.posts.filter((post) => post.categorySlug === category.slug).length}</span>
                </Link>
              ))}
            </nav>
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs text-text-muted" aria-live="polite">
            <p>{posts.length} {posts.length === 1 ? "post" : "posts"}{activeCategory ? ` in ${activeCategory.name}` : ""}{query ? ` matching “${query}”` : ""}</p>
            {(query || selectedCategory) && <Link href="/guide#articles" className="flex items-center gap-1 hover:text-accent"><X size={12} aria-hidden="true" /> Clear filters</Link>}
          </div>

          {catalog.source === "unavailable" ? (
            <div className="rounded-lg border border-border bg-bg-surface px-6 py-12 text-center" role="status">
              <BookOpen size={26} className="mx-auto mb-4 text-text-muted" aria-hidden="true" />
              <h3 className="mb-2 text-lg font-bold">Posts are temporarily unavailable.</h3>
              <p className="text-sm text-text-secondary">We could not load the posts. Please try again in a moment.</p>
              <Link href="/guide" className="mt-5 inline-block text-sm font-semibold text-accent"><GuideLabel id="guide.tryAgain" fallback="Try again" /></Link>
            </div>
          ) : posts.length ? (
            <div className="grid gap-x-8 md:grid-cols-2 xl:grid-cols-3">
              {posts.map((post, index) => <GuideCard key={post.id} post={post} categoryName={categoryNames.get(post.categorySlug) ?? "Guide"} index={index} />)}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-bg-surface px-6 py-12 text-center">
              <Search size={26} className="mx-auto mb-4 text-text-muted" aria-hidden="true" />
              <h3 className="mb-2 text-lg font-bold">{query || selectedCategory ? "No posts match your search." : "New posts are on the way."}</h3>
              <p className="text-sm text-text-secondary">{query || selectedCategory ? "Try a different keyword or browse all categories." : "Published posts will appear here when they are ready."}</p>
              {(query || selectedCategory) && <Link href="/guide#articles" className="mt-5 inline-block text-sm font-semibold text-accent"><GuideLabel id="guide.browse" fallback="Browse all posts" /></Link>}
            </div>
          )}
        </section>

        <aside className="mt-10 flex flex-col justify-between gap-5 border-t border-border py-8 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold"><GuideLabel id="guide.idea" fallback="Your idea. Your next piece." /></h2>
            <p className="mt-2 text-sm text-text-muted">Explore the design workspace and see how it comes together.</p>
          </div>
          <Link href="/create" className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-accent px-5 py-3 text-xs font-bold text-accent-foreground outline-none focus-visible:ring-2 focus-visible:ring-text-primary sm:self-auto"><GuideLabel id="guide.editor" fallback="Explore the editor" /> <ArrowRight size={15} aria-hidden="true" /></Link>
        </aside>
      </main>
      <Footer />
    </div>
  );
}
