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
} from "lucide-react";
import AdSlotBanner from "@/components/AdSlotBanner";
import Header from "@/components/Header";
import GuideBanner from "@/components/guide/GuideBanner";
import GuideLabel from "@/components/guide/GuideLabel";
import GuidePostGrid from "@/components/guide/GuidePostGrid";
import T from "@/components/T";
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
  const categoryCounts = new Map(catalog.categories.map((category) => [category.slug, catalog.posts.filter((post) => post.categorySlug === category.slug).length]));
  // "Other Guide" opens a post list like every other guide, never a single article. When the catalogue has its own
  // catch-all category this row shows that category's posts; otherwise it falls back to the full post list.
  const otherGuide = catalog.categories.find((category) => /other/i.test(category.slug) || /other/i.test(category.name));
  const otherGuideName = otherGuide?.name ?? "Other Guide";
  const otherGuideHref = otherGuide ? guideUrl(otherGuide.slug, query) : guideUrl("", query);

  return (
    <div>
      <Header />
      <main className="w-full bg-bg px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="mx-auto grid w-full max-w-[1480px] gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="hidden lg:flex lg:flex-col lg:gap-4">
            <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#69b917] via-[#4a9d0f] to-[#25720b] p-5 text-white shadow-sm">
              <BookOpen size={34} strokeWidth={2.5} aria-hidden="true" />
              <h2 className="mt-5 text-2xl font-black leading-none">MH Fashion<br />Guide</h2>
              <p className="mt-3 text-xs leading-relaxed text-white/85"><T k="guide.heroTag" /></p>
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
              <Link href={otherGuideHref} data-guide-editor className={`flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-semibold ${otherGuide && selectedCategory === otherGuide.slug ? "bg-accent/10 text-accent" : "hover:bg-bg"}`}>
                <span className="flex h-7 w-7 items-center justify-center text-text-secondary"><Pencil size={16} aria-hidden="true" /></span>
                {otherGuideName}
              </Link>
              <div className="my-2 border-t border-border" />
              <Link href="/faq" className="flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-semibold hover:bg-bg"><HelpCircle size={17} /> FAQ</Link>
              <Link href="/contact" data-guide-contact className="flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-semibold hover:bg-bg"><ShieldAlert size={17} /> Contact / copyright claim</Link>
            </nav>
            <div className="overflow-hidden rounded-2xl bg-gradient-to-b from-[#efffdc] to-[#d9f4bd] p-5 text-center text-[#18350d]">
              <Sparkles size={25} className="mx-auto text-[#6eae18]" aria-hidden="true" />
              <h3 className="mt-3 text-base font-black"><T k="guide.earnTitle1" /><br /><T k="guide.earnTitle2" /></h3>
              <p className="mt-2 text-[10px]"><T k="guide.earnSub" /></p>
              <Link href="/account" className="mt-4 inline-flex rounded-full bg-[#54a817] px-4 py-2 text-[10px] font-bold text-white"><T k="guide.joinNow" /> <ArrowRight size={13} className="ml-1" /></Link>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="mb-4">
              <GuideBanner
                eyebrow="MH Fashion Guide"
                title={<><T k="guide.learnCreate1" /><br /><em className="text-[#54a817]"><T k="guide.learnCreate2" /></em></>}
                lead={<T k="guide.lead" />}
                action={
                  <Link href="#articles" className="inline-flex items-center rounded-full bg-[#55a918] px-2.5 py-1 text-[9px] font-bold text-white shadow-sm sm:px-3.5 sm:py-1.5 sm:text-[11px]">
                    <T k="guide.browseAll" /> <ArrowRight size={13} className="ml-1.5 sm:h-[15px] sm:w-[15px]" />
                  </Link>
                }
              />
            </div>

            <AdSlotBanner slot="guide-top" />

            <div className="mb-4 -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:hidden">
              <Link href={guideUrl("", query)} className={`group flex w-[74px] shrink-0 flex-col items-center justify-center gap-1 rounded-lg border p-1.5 outline-none focus-visible:ring-2 focus-visible:ring-accent sm:w-auto sm:min-h-[92px] sm:min-w-[150px] sm:flex-row sm:justify-start sm:gap-3 sm:p-4 ${!selectedCategory && !query ? "border-accent bg-accent/10" : "border-border bg-bg-surface hover:border-accent/60"}`}>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent sm:h-10 sm:w-10 sm:rounded-xl"><BookOpen size={13} /></span>
                <span className="text-center text-[9px] font-bold leading-tight sm:text-left sm:text-xs"><T k="guide.allGuides" /></span>
              </Link>
              <Link href={otherGuideHref} data-guide-editor className="group flex w-[74px] shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-border bg-bg-surface p-1.5 hover:border-accent/60 sm:w-auto sm:min-h-[92px] sm:min-w-[150px] sm:flex-row sm:items-center sm:justify-start sm:gap-3 sm:p-4">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent sm:h-10 sm:w-10 sm:rounded-xl"><Pencil size={13} /></span>
                <span className="text-center text-[9px] font-bold leading-tight sm:text-left sm:text-xs">{otherGuideName}</span>
              </Link>
              {catalog.categories.map((category) => <CategoryShortcut key={category.id} category={category} count={categoryCounts.get(category.slug) ?? 0} selected={selectedCategory === category.slug} query={query} />)}
              <Link href="/faq" className="group flex w-[74px] shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-border bg-bg-surface p-1.5 hover:border-accent/60 sm:w-auto sm:min-h-[92px] sm:min-w-[150px] sm:flex-row sm:justify-start sm:gap-3 sm:p-4">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent sm:h-10 sm:w-10 sm:rounded-xl"><Star size={13} /></span>
                <span className="text-center text-[9px] font-bold leading-tight sm:text-left sm:text-xs">Points &amp; Rewards</span>
              </Link>
            </div>

            <section id="articles" aria-labelledby="articles-heading" className="scroll-mt-24">
              <div className="mb-3">
                <h2 id="articles-heading" className="border-l-4 border-accent pl-3 text-lg font-black sm:text-xl"><GuideLabel id="guide.latest" fallback="Latest Guides" /></h2>
                <p className="mt-1 pl-4 text-xs text-text-muted">{posts.length} {posts.length === 1 ? "post" : "posts"}{activeCategory ? ` in ${activeCategory.name}` : ""}</p>
              </div>

              {catalog.source === "unavailable" ? (
                <div className="rounded-2xl border border-border bg-bg-surface px-6 py-12 text-center" role="status"><BookOpen size={26} className="mx-auto mb-4 text-text-muted" /><h3 className="text-lg font-bold">Posts are temporarily unavailable.</h3></div>
              ) : posts.length ? (
                <>
                  {/* Without JavaScript "See more" cannot run, so every card shows at once. */}
                  <noscript>
                    <style>{`[data-guide-card="more"]{display:block !important}`}</style>
                  </noscript>
                  <GuidePostGrid
                    key={`${selectedCategory}|${query}|${posts.length}`}
                    posts={posts}
                    categoryNames={Object.fromEntries(catalog.categories.map((category) => [category.slug, category.name]))}
                  />
                </>
              ) : (
                <div className="rounded-2xl border border-border bg-bg-surface px-6 py-12 text-center"><Search size={26} className="mx-auto mb-4 text-text-muted" /><h3 className="text-lg font-bold"><T k="guide.noGuidesMatch" /></h3></div>
              )}
            </section>
          </div>
        </div>
      </main>

    </div>
  );
}
