import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CreditCard,
  HelpCircle,
  Pencil,
  Ruler,
  Search,
  Shirt,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import GuideCard from "@/components/guide/GuideCard";
import GuideLabel from "@/components/guide/GuideLabel";
import { filterGuidePosts, getGuideCatalog, type GuideCategory } from "@/lib/guides";
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

function CategoryIcon({ slug, size = 20 }: { slug: string; size?: number }) {
  if (slug.includes("product")) return <Shirt size={size} aria-hidden="true" />;
  if (slug.includes("design")) return <Pencil size={size} aria-hidden="true" />;
  if (slug.includes("payment")) return <CreditCard size={size} aria-hidden="true" />;
  if (slug.includes("delivery")) return <Ruler size={size} aria-hidden="true" />;
  return <BookOpen size={size} aria-hidden="true" />;
}

function CategoryShortcut({
  category,
  count,
  selected,
  query,
}: {
  category: GuideCategory;
  count: number;
  selected: boolean;
  query: string;
}) {
  return (
    <Link
      href={guideUrl(category.slug, query)}
      className={`group flex min-h-[58px] items-center gap-2 rounded-xl border p-2 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent sm:min-h-[92px] sm:gap-3 sm:p-4 ${selected ? "border-accent bg-accent/10" : "border-border bg-bg-surface hover:border-accent/60"}`}
      aria-current={selected ? "page" : undefined}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground sm:h-10 sm:w-10 sm:rounded-xl">
        <CategoryIcon slug={category.slug} size={15} />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-bold leading-tight">{category.name.replace(" Guide", "")}</span>
        <span className="mt-0.5 block text-[9px] text-text-muted sm:mt-1 sm:text-[10px]">{count} {count === 1 ? "Post" : "Posts"}</span>
      </span>
      <ArrowRight size={14} className="ml-auto shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent" aria-hidden="true" />
    </Link>
  );
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  return guideMetadata({
    title: "MH Fashion Guide — Products, Design & Payment",
    description: "Helpful MH Fashion guides, tutorials and tips for products, design, payment and delivery.",
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
  const featured = !selectedCategory && !query ? catalog.posts.find((post) => post.featured) ?? catalog.posts[0] : undefined;
  const categoryCounts = new Map(catalog.categories.map((category) => [category.slug, catalog.posts.filter((post) => post.categorySlug === category.slug).length]));

  return (
    <div>
      <Header />
      <main className="w-full bg-bg px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="mx-auto grid w-full max-w-[1480px] gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="hidden xl:flex xl:flex-col xl:gap-4">
            <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#69b917] via-[#4a9d0f] to-[#25720b] p-5 text-white shadow-sm">
              <BookOpen size={34} strokeWidth={2.5} aria-hidden="true" />
              <h2 className="mt-5 text-2xl font-black leading-none">MH Fashion<br />Guide</h2>
              <p className="mt-3 text-xs leading-relaxed text-white/85">Everything you need to know</p>
              <div className="mt-5 h-1 w-12 rounded-full bg-white/80" />
            </div>
            <nav aria-label="Guide categories" className="rounded-2xl border border-border bg-bg-surface p-2">
              <Link href={guideUrl("", query)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-bold ${!selectedCategory ? "bg-accent/10 text-accent" : "hover:bg-bg"}`}>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10"><BookOpen size={15} aria-hidden="true" /></span>
                <GuideLabel id="guide.allGuides" fallback="All Guides" />
              </Link>
              {catalog.categories.map((category) => (
                <Link key={category.id} href={guideUrl(category.slug, query)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-semibold ${selectedCategory === category.slug ? "bg-accent/10 text-accent" : "hover:bg-bg"}`}>
                  <span className="flex h-7 w-7 items-center justify-center text-text-secondary"><CategoryIcon slug={category.slug} size={16} /></span>
                  {category.name}
                </Link>
              ))}
              <div className="my-2 border-t border-border" />
              <Link href="/faq" className="flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-semibold hover:bg-bg"><HelpCircle size={17} /> FAQ</Link>
            </nav>
            <div className="overflow-hidden rounded-2xl bg-gradient-to-b from-[#efffdc] to-[#d9f4bd] p-5 text-center text-[#18350d]">
              <Sparkles size={25} className="mx-auto text-[#6eae18]" aria-hidden="true" />
              <h3 className="mt-3 text-base font-black">Earn Points<br />with Every Order!</h3>
              <p className="mt-2 text-[10px]">Shop · Learn · Earn</p>
              <Link href="/account" className="mt-4 inline-flex rounded-full bg-[#54a817] px-4 py-2 text-[10px] font-bold text-white">Join Now <ArrowRight size={13} className="ml-1" /></Link>
            </div>
          </aside>

          <div className="min-w-0">
            <section className="relative isolate mb-5 min-h-[155px] overflow-hidden rounded-2xl bg-gradient-to-r from-[#efffdb] via-[#e0f7c4] to-[#c4ee9c] px-4 py-4 text-[#172810] sm:min-h-[230px] sm:px-9 sm:py-9 lg:min-h-[255px] lg:px-10">
              <div className="relative z-10 max-w-[70%] sm:max-w-[48%]">
                <span className="inline-flex rounded-full bg-[#5aa817] px-2 py-1 text-[8px] font-black uppercase tracking-wide text-white sm:px-3 sm:py-1.5 sm:text-[10px]">MH Fashion Guide</span>
                <h1 className="mt-2 text-2xl font-black leading-[0.95] tracking-tight sm:mt-4 sm:text-5xl">Learn. Create.<br /><em className="text-[#54a817]">Enjoy!</em></h1>
                <p className="mt-2 max-w-sm text-[10px] leading-relaxed text-[#355128] sm:mt-4 sm:text-sm">Explore our helpful guides, tutorials and tips to make the most of your MH Fashion experience.</p>
                <Link href="#articles" className="mt-3 inline-flex items-center rounded-full bg-[#55a918] px-3 py-1.5 text-[10px] font-bold text-white shadow-sm sm:mt-5 sm:px-4 sm:py-2.5 sm:text-xs">Browse All Guides <ArrowRight size={13} className="ml-1.5 sm:h-[15px] sm:w-[15px]" /></Link>
              </div>
              <div className="absolute -right-10 -top-12 h-48 w-48 rounded-full bg-[#9bda45]/50 blur-sm sm:right-10 sm:h-80 sm:w-80" />
              <div className="absolute bottom-[-55px] right-[13%] hidden h-64 w-44 rotate-[-8deg] rounded-[45%] bg-white/80 shadow-xl sm:block" aria-hidden="true">
                <div className="absolute left-1/2 top-16 -translate-x-1/2 text-center text-2xl font-black leading-none text-[#4c9d16]">MH<br /><span className="text-xs">FASHION</span></div>
              </div>
              <div className="absolute bottom-3 right-3 text-2xl font-black italic text-[#54a817]/80 sm:bottom-4 sm:right-12 sm:text-4xl">Your<br />Style</div>
            </section>

            <div className="mb-7 grid grid-cols-4 gap-2 sm:grid-cols-4 lg:grid-cols-5 xl:hidden">
              {catalog.categories.map((category) => <CategoryShortcut key={category.id} category={category} count={categoryCounts.get(category.slug) ?? 0} selected={selectedCategory === category.slug} query={query} />)}
              <Link href="/faq" className="group flex min-h-[58px] items-center gap-2 rounded-xl border border-border bg-bg-surface p-2 hover:border-accent/60 sm:col-span-1 sm:min-h-[92px] sm:gap-3 sm:p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent sm:h-10 sm:w-10 sm:rounded-xl"><Star size={16} /></span>
                <span className="text-xs font-bold leading-tight">Points &<br />Rewards</span>
              </Link>
            </div>

            <section id="articles" aria-labelledby="articles-heading" className="scroll-mt-24">
              <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 id="articles-heading" className="border-l-4 border-accent pl-3 text-xl font-black"><GuideLabel id="guide.latest" fallback="Latest Guides" /></h2>
                  <p className="mt-1 pl-4 text-xs text-text-muted">{posts.length} {posts.length === 1 ? "post" : "posts"}{activeCategory ? ` in ${activeCategory.name}` : ""}</p>
                </div>
                <div className="flex items-center gap-3">
                  <form action="/guide#articles" method="get" className="flex items-center rounded-full border border-border bg-bg-surface px-3 py-1.5" role="search">
                    {selectedCategory && <input type="hidden" name="category" value={selectedCategory} />}
                    <Search size={14} className="mr-2 text-text-muted" aria-hidden="true" />
                    <input name="q" defaultValue={query} maxLength={200} placeholder="Search guides..." className="w-28 bg-transparent text-xs outline-none placeholder:text-text-muted sm:w-40" aria-label="Search guides" />
                  </form>
                  {(query || selectedCategory) ? <Link href="/guide#articles" className="flex items-center gap-1 text-xs font-semibold text-accent"><X size={13} /> Clear</Link> : <Link href={guideUrl("", "")} className="hidden text-xs font-semibold text-accent sm:inline-flex sm:items-center">View All Posts <ArrowRight size={14} className="ml-1" /></Link>}
                </div>
              </div>

              {catalog.source === "unavailable" ? (
                <div className="rounded-2xl border border-border bg-bg-surface px-6 py-12 text-center" role="status"><BookOpen size={26} className="mx-auto mb-4 text-text-muted" /><h3 className="text-lg font-bold">Posts are temporarily unavailable.</h3></div>
              ) : posts.length ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {posts.map((post, index) => <GuideCard key={post.id} post={post} categoryName={catalog.categories.find((category) => category.slug === post.categorySlug)?.name ?? "Guide"} index={index} />)}
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-bg-surface px-6 py-12 text-center"><Search size={26} className="mx-auto mb-4 text-text-muted" /><h3 className="text-lg font-bold">No guides match your search.</h3></div>
              )}
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
