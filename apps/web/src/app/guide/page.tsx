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
  ShieldAlert,
  Shirt,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import Header from "@/components/Header";
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
      className={`group flex w-[74px] shrink-0 flex-col items-center justify-center gap-1 rounded-lg border p-1.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent sm:w-auto sm:min-h-[92px] sm:min-w-[150px] sm:flex-row sm:items-center sm:justify-start sm:gap-3 sm:p-4 ${selected ? "border-accent bg-accent/10" : "border-border bg-bg-surface hover:border-accent/60"}`}
      aria-current={selected ? "page" : undefined}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground sm:h-10 sm:w-10 sm:rounded-xl">
        <CategoryIcon slug={category.slug} size={13} />
      </span>
      <span className="min-w-0">
        <span className="line-clamp-2 block text-center text-[9px] font-bold leading-tight sm:line-clamp-1 sm:text-left sm:text-xs">{category.name.replace(" Guide", "")}</span>
        <span className="mt-0.5 block text-center text-[8px] text-text-muted sm:mt-1 sm:text-left sm:text-[10px]">{count} {count === 1 ? "Post" : "Posts"}</span>
      </span>
      <ArrowRight size={14} className="ml-auto hidden shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent sm:block" aria-hidden="true" />
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
        <div className="mx-auto grid w-full max-w-[1480px] gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="hidden lg:flex lg:flex-col lg:gap-4">
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
              <Link href="/guide/editor-guide" data-guide-editor className="flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-semibold hover:bg-bg">
                <span className="flex h-7 w-7 items-center justify-center text-text-secondary"><Pencil size={16} aria-hidden="true" /></span>
                Editor Guide
              </Link>
              <div className="my-2 border-t border-border" />
              <Link href="/faq" className="flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-semibold hover:bg-bg"><HelpCircle size={17} /> FAQ</Link>
              <Link href="/contact" data-guide-contact className="flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-semibold hover:bg-bg"><ShieldAlert size={17} /> Contact / copyright claim</Link>
            </nav>
            <div className="overflow-hidden rounded-2xl bg-gradient-to-b from-[#efffdc] to-[#d9f4bd] p-5 text-center text-[#18350d]">
              <Sparkles size={25} className="mx-auto text-[#6eae18]" aria-hidden="true" />
              <h3 className="mt-3 text-base font-black">Earn Points<br />with Every Order!</h3>
              <p className="mt-2 text-[10px]">Shop · Learn · Earn</p>
              <Link href="/account" className="mt-4 inline-flex rounded-full bg-[#54a817] px-4 py-2 text-[10px] font-bold text-white">Join Now <ArrowRight size={13} className="ml-1" /></Link>
            </div>
          </aside>

          <div className="min-w-0">
            <section className="relative isolate mb-4 min-h-[96px] overflow-hidden rounded-xl bg-gradient-to-r from-[#efffdb] via-[#e0f7c4] to-[#c4ee9c] px-3.5 py-2.5 text-[#172810] sm:min-h-[124px] sm:rounded-2xl sm:px-8 sm:py-3.5 lg:min-h-[132px] lg:px-9 lg:py-3.5">
              <div className="relative z-10 max-w-[70%] sm:max-w-[48%]">
                <span className="inline-flex rounded-full bg-[#5aa817] px-2 py-1 text-[8px] font-black uppercase tracking-wide text-white sm:px-3 sm:py-1.5 sm:text-[10px]">MH Fashion Guide</span>
                <h1 className="mt-1 text-lg font-black leading-[0.95] tracking-tight sm:mt-2 sm:text-2xl lg:text-[26px]">Learn. Create.<br /><em className="text-[#54a817]">Enjoy!</em></h1>
                <p className="mt-1.5 hidden max-w-sm text-[10px] leading-relaxed text-[#355128] sm:mt-2 sm:block sm:text-[11px]">Explore our helpful guides, tutorials and tips to make the most of your MH Fashion experience.</p>
                <Link href="#articles" className="mt-2 inline-flex items-center rounded-full bg-[#55a918] px-2.5 py-1 text-[9px] font-bold text-white shadow-sm sm:mt-3 sm:px-3.5 sm:py-1.5 sm:text-[11px]">Browse All Guides <ArrowRight size={13} className="ml-1.5 sm:h-[15px] sm:w-[15px]" /></Link>
              </div>
              <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-[#9bda45]/50 blur-sm sm:right-8 sm:h-52 sm:w-52" />
              <div className="absolute bottom-[-48px] right-[13%] hidden h-44 w-32 rotate-[-8deg] rounded-[45%] bg-white/80 shadow-xl sm:block" aria-hidden="true">
                <div className="absolute left-1/2 top-12 -translate-x-1/2 text-center text-base font-black leading-none text-[#4c9d16]">MH<br /><span className="text-[9px]">FASHION</span></div>
              </div>
              <div className="absolute bottom-2 right-3 text-base font-black italic leading-none text-[#54a817]/80 sm:bottom-3 sm:right-10 sm:text-2xl">Your<br />Style</div>
            </section>

            <div className="mb-4 -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:hidden">
              <Link href={guideUrl("", query)} className={`group flex w-[74px] shrink-0 flex-col items-center justify-center gap-1 rounded-lg border p-1.5 outline-none focus-visible:ring-2 focus-visible:ring-accent sm:w-auto sm:min-h-[92px] sm:min-w-[150px] sm:flex-row sm:justify-start sm:gap-3 sm:p-4 ${!selectedCategory && !query ? "border-accent bg-accent/10" : "border-border bg-bg-surface hover:border-accent/60"}`}>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent sm:h-10 sm:w-10 sm:rounded-xl"><BookOpen size={13} /></span>
                <span className="text-center text-[9px] font-bold leading-tight sm:text-left sm:text-xs">All Guides</span>
              </Link>
              <Link href="/guide/editor-guide" data-guide-editor className="group flex w-[74px] shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-border bg-bg-surface p-1.5 hover:border-accent/60 sm:w-auto sm:min-h-[92px] sm:min-w-[150px] sm:flex-row sm:items-center sm:justify-start sm:gap-3 sm:p-4">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent sm:h-10 sm:w-10 sm:rounded-xl"><Pencil size={13} /></span>
                <span className="text-center text-[9px] font-bold leading-tight sm:text-left sm:text-xs">Editor Guide</span>
              </Link>
              {catalog.categories.map((category) => <CategoryShortcut key={category.id} category={category} count={categoryCounts.get(category.slug) ?? 0} selected={selectedCategory === category.slug} query={query} />)}
              <Link href="/faq" className="group flex w-[74px] shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-border bg-bg-surface p-1.5 hover:border-accent/60 sm:w-auto sm:min-h-[92px] sm:min-w-[150px] sm:flex-row sm:justify-start sm:gap-3 sm:p-4">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent sm:h-10 sm:w-10 sm:rounded-xl"><Star size={13} /></span>
                <span className="text-center text-[9px] font-bold leading-tight sm:text-left sm:text-xs">Points &amp; Rewards</span>
              </Link>
            </div>

            <section id="articles" aria-labelledby="articles-heading" className="scroll-mt-24">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 id="articles-heading" className="border-l-4 border-accent pl-3 text-lg font-black sm:text-xl"><GuideLabel id="guide.latest" fallback="Latest Guides" /></h2>
                  <p className="mt-1 pl-4 text-xs text-text-muted">{posts.length} {posts.length === 1 ? "post" : "posts"}{activeCategory ? ` in ${activeCategory.name}` : ""}</p>
                </div>
                <div className="flex items-center justify-end">
                  {(query || selectedCategory) ? <Link href="/guide#articles" className="flex items-center gap-1 text-xs font-semibold text-accent"><X size={13} /> Clear</Link> : <Link href={guideUrl("", "")} className="hidden text-xs font-semibold text-accent sm:inline-flex sm:items-center">View All Posts <ArrowRight size={14} className="ml-1" /></Link>}
                </div>
              </div>

              {catalog.source === "unavailable" ? (
                <div className="rounded-2xl border border-border bg-bg-surface px-6 py-12 text-center" role="status"><BookOpen size={26} className="mx-auto mb-4 text-text-muted" /><h3 className="text-lg font-bold">Posts are temporarily unavailable.</h3></div>
              ) : posts.length ? (
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
                  {posts.map((post, index) => <GuideCard key={post.id} post={post} categoryName={catalog.categories.find((category) => category.slug === post.categorySlug)?.name ?? "Guide"} index={index} />)}
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-bg-surface px-6 py-12 text-center"><Search size={26} className="mx-auto mb-4 text-text-muted" /><h3 className="text-lg font-bold">No guides match your search.</h3></div>
              )}
            </section>
          </div>
        </div>
      </main>

    </div>
  );
}
