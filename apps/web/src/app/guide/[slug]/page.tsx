import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Clock3,
  CreditCard,
  HelpCircle,
  Pencil,
  Ruler,
  Shirt,
  Sparkles,
} from "lucide-react";
import Header from "@/components/Header";
import GuideCard from "@/components/guide/GuideCard";
import GuideLabel from "@/components/guide/GuideLabel";
import { getGuideCatalog, getGuidePostBySlug } from "@/lib/guides";
import { guideMetadata } from "@/lib/guide-metadata";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

function CategoryIcon({ slug, size = 18 }: { slug: string; size?: number }) {
  if (slug.includes("product")) return <Shirt size={size} aria-hidden="true" />;
  if (slug.includes("design")) return <Pencil size={size} aria-hidden="true" />;
  if (slug.includes("payment")) return <CreditCard size={size} aria-hidden="true" />;
  if (slug.includes("delivery")) return <Ruler size={size} aria-hidden="true" />;
  return <BookOpen size={size} aria-hidden="true" />;
}

function FallbackCover({ categorySlug }: { categorySlug: string }) {
  const tone = categorySlug.includes("design")
    ? "from-[#dceeff] via-[#c8dcf5] to-[#aec6e8]"
    : categorySlug.includes("payment")
      ? "from-[#eaf2ff] via-[#dce8f9] to-[#bbd0ed]"
      : categorySlug.includes("delivery")
        ? "from-[#fff0bd] via-[#f7df88] to-[#eec964]"
        : "from-[#efffdc] via-[#d9f0bd] to-[#b7da91]";

  return (
    <div className={`relative h-full min-h-[230px] overflow-hidden bg-gradient-to-br ${tone}`}>
      <div className="absolute -right-10 -top-16 h-72 w-72 rounded-full bg-white/45 blur-sm" />
      <div className="absolute bottom-[-70px] left-[28%] h-72 w-48 rotate-[-8deg] rounded-[45%] bg-white/75 shadow-xl" />
      <BookOpen className="absolute left-7 top-7 text-[#4f9715]/70" size={42} aria-hidden="true" />
      <span className="absolute bottom-7 left-7 text-4xl font-black leading-none text-[#28530e]/70">MH<br /><span className="text-lg">FASHION</span></span>
    </div>
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getGuidePostBySlug(slug);
  if (!post) {
    const catalog = await getGuideCatalog();
    if (catalog.source === "unavailable") throw new Error("Guide content is temporarily unavailable");
    return { title: "Guide not found — MH Fashion", robots: { index: false, follow: true } };
  }
  return guideMetadata({
    title: post.seoTitle || `${post.title} — MH Fashion Guide`,
    description: post.seoDescription || post.excerpt,
    path: `/guide/${post.slug}`,
    article: true,
  });
}

export default async function GuideArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const [post, catalog] = await Promise.all([getGuidePostBySlug(slug), getGuideCatalog()]);
  if (catalog.source === "unavailable") throw new Error("Guide content is temporarily unavailable");
  if (!post) notFound();

  const category = catalog.categories.find((item) => item.slug === post.categorySlug);
  const categoryNames = new Map(catalog.categories.map((item) => [item.slug, item.name]));
  const related = catalog.posts.filter((item) => item.slug !== post.slug && item.categorySlug === post.categorySlug).slice(0, 3);
  const categoryUrl = `/guide?category=${encodeURIComponent(post.categorySlug)}#articles`;

  return (
    <div>
      <Header />
      <main className="w-full bg-bg px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="mx-auto grid w-full max-w-[1480px] gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="hidden xl:flex xl:flex-col xl:gap-4">
            <Link href="/guide" className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#69b917] via-[#4a9d0f] to-[#25720b] p-5 text-white shadow-sm">
              <BookOpen size={34} strokeWidth={2.5} aria-hidden="true" />
              <h2 className="mt-5 text-2xl font-black leading-none">MH Fashion<br />Guide</h2>
              <p className="mt-3 text-xs text-white/85">Back to all guides</p>
            </Link>
            <nav aria-label="Guide navigation" className="rounded-2xl border border-border bg-bg-surface p-2">
              <Link href="/guide#articles" className="flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-bold text-accent hover:bg-bg"><BookOpen size={17} /> <GuideLabel id="guide.allGuides" fallback="All Guides" /></Link>
              {catalog.categories.map((item) => <Link key={item.id} href={`/guide?category=${item.slug}#articles`} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-semibold hover:bg-bg ${item.slug === post.categorySlug ? "bg-accent/10 text-accent" : ""}`}><CategoryIcon slug={item.slug} /> {item.name}</Link>)}
              <div className="my-2 border-t border-border" />
              <Link href="/faq" className="flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-semibold hover:bg-bg"><HelpCircle size={17} /> FAQ</Link>
            </nav>
            <div className="rounded-2xl bg-gradient-to-b from-[#efffdc] to-[#d9f4bd] p-5 text-center text-[#18350d]"><Sparkles size={24} className="mx-auto text-[#6eae18]" /><p className="mt-3 text-sm font-black">Keep learning.<br />Keep creating.</p><Link href="/create" className="mt-4 inline-flex rounded-full bg-[#54a817] px-4 py-2 text-[10px] font-bold text-white">Create a design <ArrowRight size={13} className="ml-1" /></Link></div>
          </aside>

          <div className="min-w-0">
            <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-2 text-xs text-text-muted">
              <Link href="/guide" className="hover:text-accent"><GuideLabel id="nav.guide" fallback="Guide" /></Link><span aria-hidden="true">/</span><span className="text-text-primary">{category?.name ?? "Article"}</span>
            </nav>

            <header className="overflow-hidden rounded-2xl border border-border bg-bg-surface">
              <div className="grid lg:grid-cols-[minmax(280px,0.9fr)_1.1fr]">
                <div className="min-h-[235px] lg:min-h-[300px]">{post.coverImageUrl ? <img src={post.coverImageUrl} alt="" className="h-full min-h-[235px] w-full object-cover lg:min-h-[300px]" /> : <FallbackCover categorySlug={post.categorySlug} />}</div>
                <div className="flex flex-col justify-center p-6 sm:p-9 lg:p-10">
                  <Link href={categoryUrl} className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-[10px] font-bold text-accent-foreground hover:opacity-90"><CategoryIcon slug={post.categorySlug} size={12} /> {category?.name ?? "Guide"}</Link>
                  <h1 className="mt-5 text-3xl font-black leading-[1.02] tracking-tight sm:text-4xl">{post.title}</h1>
                  <p className="mt-4 text-sm leading-relaxed text-text-secondary">{post.excerpt}</p>
                  <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-text-muted"><span className="inline-flex items-center gap-1.5"><Clock3 size={14} /> {post.readingMinutes} min read</span><span aria-hidden="true">·</span><span>MH Fashion Guide</span></div>
                </div>
              </div>
            </header>

            {catalog.source === "starter" && <p className="mt-4 rounded-xl border border-border bg-bg-surface px-4 py-3 text-xs leading-relaxed text-text-muted">Starter guide · This article describes the planned experience. Some features and integrations are still in development.</p>}

            <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_230px] lg:items-start">
              <article aria-label={post.title} className="min-w-0 rounded-2xl border border-border bg-bg-surface p-6 sm:p-8 lg:p-10">
                <div className="mb-8 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-accent"><BookOpen size={14} /> <GuideLabel id="guide.article" fallback="Article" /></div>
                <div className="space-y-10">
                  {post.sections.map((section, index) => (
                    <section key={`${index}:${section.heading}`} id={`section-${index + 1}`} className="scroll-mt-24">
                      <div className="mb-4 flex items-start gap-3"><span className="mt-1 text-2xl font-black leading-none text-accent/70">{String(index + 1).padStart(2, "0")}</span><h2 className="text-xl font-bold leading-snug sm:text-2xl">{section.heading}</h2></div>
                      <div className="space-y-4 text-sm leading-7 text-text-secondary">{section.paragraphs.map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}{section.bullets && <ul className="space-y-2 pl-5 marker:text-accent">{section.bullets.map((bullet, bulletIndex) => <li key={bulletIndex}>{bullet}</li>)}</ul>}</div>
                    </section>
                  ))}
                </div>
                <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6"><Link href="/guide#articles" className="inline-flex items-center gap-2 text-xs font-semibold text-text-secondary hover:text-accent"><ArrowLeft size={14} /> <GuideLabel id="guide.allGuides" fallback="All guides" /></Link><Link href={categoryUrl} className="inline-flex items-center gap-2 text-xs font-semibold text-accent"><GuideLabel id="guide.moreIn" fallback="More in" /> {category?.name ?? "this category"} <ArrowRight size={14} /></Link></div>
              </article>

              <aside className="rounded-2xl border border-border bg-bg-surface p-5 lg:sticky lg:top-24">
                <nav aria-label="On this page"><h2 className="mb-4 border-l-4 border-accent pl-3 text-xs font-black uppercase tracking-[0.15em]"><GuideLabel id="guide.onPage" fallback="On this page" /></h2><ol className="space-y-3">{post.sections.map((section, index) => <li key={`${index}:${section.heading}`}><a href={`#section-${index + 1}`} className="flex items-start gap-2 text-xs leading-relaxed text-text-secondary hover:text-accent"><span className="text-[10px] tabular-nums text-accent/70">{String(index + 1).padStart(2, "0")}</span>{section.heading}</a></li>)}</ol></nav>
              </aside>
            </div>

            {related.length > 0 && <section aria-labelledby="related-heading" className="mt-10 border-t border-border pt-8"><div className="mb-5 flex items-center justify-between"><h2 id="related-heading" className="border-l-4 border-accent pl-3 text-xl font-black"><GuideLabel id="guide.keepExploring" fallback="Keep exploring" /></h2><Link href={categoryUrl} className="text-xs font-semibold text-accent">View all <ArrowRight size={14} className="ml-1 inline" /></Link></div><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{related.map((item, index) => <GuideCard key={item.id} post={item} categoryName={categoryNames.get(item.categorySlug) ?? "Guide"} index={index} />)}</div></section>}
          </div>
        </div>
      </main>

    </div>
  );
}
