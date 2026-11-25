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
import GuideBanner from "@/components/guide/GuideBanner";
import GuideCard from "@/components/guide/GuideCard";
import GuideLabel from "@/components/guide/GuideLabel";
import { getGuideCatalog, getGuidePostBySlug, relatedGuidePosts } from "@/lib/guides";
import { resolveGuideProductLinks } from "@/lib/guide-products";
import { getProductsBySlugs } from "@/lib/products";
import GuideShopLook from "@/components/guide/GuideShopLook";
import { guideMetadata } from "@/lib/guide-metadata";
import JsonLd from "@/components/JsonLd";
import { articleSchema, breadcrumbSchema } from "@/lib/structured-data";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

function CategoryIcon({ slug, size = 18 }: { slug: string; size?: number }) {
  if (slug.includes("product")) return <Shirt size={size} aria-hidden="true" />;
  if (slug.includes("design")) return <Pencil size={size} aria-hidden="true" />;
  if (slug.includes("payment")) return <CreditCard size={size} aria-hidden="true" />;
  if (slug.includes("delivery")) return <Ruler size={size} aria-hidden="true" />;
  return <BookOpen size={size} aria-hidden="true" />;
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
  // Related first by category, then by the products both posts sell, then anything else: an article stays
  // inside its own guide when it can, and still gets cards when its category has nothing else to offer.
  const related = relatedGuidePosts(catalog.posts, post, 4);
  const linkedProducts = await getProductsBySlugs(post.productLinks.map((link) => link.slug));
  const linkedBySlug = new Map(linkedProducts.map((product) => [product.slug, product]));
  const shopLook = await resolveGuideProductLinks(post.productLinks, (productSlug) => linkedBySlug.get(productSlug) ?? null);
  const categoryUrl = `/guide?category=${encodeURIComponent(post.categorySlug)}#articles`;
  // Same contract as the guide landing page: "Other Guide" lists posts, so it never points at one article.
  const otherGuide = catalog.categories.find((item) => /other/i.test(item.slug) || /other/i.test(item.name));
  const otherGuideName = otherGuide?.name ?? "Other Guide";
  const otherGuideHref = otherGuide ? `/guide?category=${encodeURIComponent(otherGuide.slug)}#articles` : "/guide#articles";

  return (
    <>
      <JsonLd data={articleSchema(post, { categoryName: category?.name })} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "Guide", path: "/guide" },
        ...(category ? [{ name: category.name, path: `/guide?category=${encodeURIComponent(category.slug)}#articles` }] : []),
        { name: post.title, path: `/guide/${post.slug}` },
      ])} />
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
              <Link href={otherGuideHref} data-guide-editor className={`flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-semibold hover:bg-bg ${otherGuide && post.categorySlug === otherGuide.slug ? "bg-accent/10 text-accent" : ""}`}><Pencil size={17} /> {otherGuideName}</Link>
              <div className="my-2 border-t border-border" />
              <Link href="/faq" className="flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-semibold hover:bg-bg"><HelpCircle size={17} /> FAQ</Link>
            </nav>
            <div className="rounded-2xl bg-gradient-to-b from-[#efffdc] to-[#d9f4bd] p-5 text-center text-[#18350d]"><Sparkles size={24} className="mx-auto text-[#6eae18]" /><p className="mt-3 text-sm font-black">Keep learning.<br />Keep creating.</p><Link href="/create" className="mt-4 inline-flex rounded-full bg-[#54a817] px-4 py-2 text-[10px] font-bold text-white">Create a design <ArrowRight size={13} className="ml-1" /></Link></div>
          </aside>

          <div className="min-w-0">
            <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-2 text-xs text-text-muted">
              <Link href="/guide" className="hover:text-accent"><GuideLabel id="nav.guide" fallback="Guide" /></Link><span aria-hidden="true">/</span><span className="text-text-primary">{category?.name ?? "Article"}</span>
            </nav>

            <div className="mb-6">
              <GuideBanner
                eyebrow={category?.name ?? "MH Fashion Guide"}
                title={post.title}
                lead={post.excerpt}
                meta={
                  <>
                    <span className="inline-flex items-center gap-1"><Clock3 size={12} /> {post.readingMinutes} min read</span>
                    <span aria-hidden="true">·</span>
                    <span>MH Fashion Guide</span>
                  </>
                }
                action={
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={categoryUrl} className="inline-flex items-center gap-1.5 rounded-full bg-[#55a918] px-3 py-1.5 text-[10px] font-bold text-white shadow-sm sm:text-[11px]">
                      <ArrowLeft size={12} /> <GuideLabel id="guide.moreIn" fallback="More in" /> {category?.name ?? "this guide"}
                    </Link>
                    <Link href="/guide#articles" className="inline-flex items-center gap-1.5 rounded-full border border-[#4c9d16]/40 bg-white/70 px-3 py-1.5 text-[10px] font-bold text-[#2f6d10] sm:text-[11px]">
                      <GuideLabel id="guide.allGuides" fallback="All guides" />
                    </Link>
                  </div>
                }
              />
            </div>

            {catalog.source === "starter" && <p className="mt-4 rounded-xl border border-border bg-bg-surface px-4 py-3 text-xs leading-relaxed text-text-muted">MH Fashion Guide · Where a feature is still being built, this article says so. Photos are placeholders until licensed photography replaces them.</p>}

            <article aria-label={post.title} className="mt-6 min-w-0 rounded-2xl border border-border bg-bg-surface p-6 sm:p-8 lg:p-10">
              <div className="mb-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-accent"><BookOpen size={14} /> <GuideLabel id="guide.article" fallback="Article" /></div>
              {post.coverImageUrl && (
                <figure data-guide-figure className="mb-8">
                  <img src={post.coverImageUrl} alt="" className="aspect-[16/9] max-h-[420px] w-full rounded-xl object-cover" />
                </figure>
              )}
              <div className="space-y-10">
                {post.sections.map((section, index) => (
                  <section key={`${index}:${section.heading}`} id={`section-${index + 1}`} className="scroll-mt-24">
                    <div className="mb-4 flex items-start gap-3"><span className="mt-1 text-2xl font-black leading-none text-accent/70">{String(index + 1).padStart(2, "0")}</span><h2 className="text-xl font-bold leading-snug sm:text-2xl">{section.heading}</h2></div>
                    {section.images && section.images.length > 0 && (
                      <div className={section.images.length > 1 ? "mb-5 grid gap-4 sm:grid-cols-2" : "mb-5"}>
                        {section.images.map((image) => (
                          <figure key={image.url} data-guide-figure className="overflow-hidden rounded-xl border border-border bg-bg">
                            <img src={image.url} alt={image.caption} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                            <figcaption className="px-3 py-2 text-[10px] leading-relaxed text-text-muted sm:text-[11px]">{image.caption}</figcaption>
                          </figure>
                        ))}
                      </div>
                    )}
                    <div className="space-y-4 text-sm leading-7 text-text-secondary">{section.paragraphs.map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}{section.bullets && <ul className="list-disc space-y-2 pl-5 marker:text-accent">{section.bullets.map((bullet, bulletIndex) => <li key={bulletIndex}>{bullet}</li>)}</ul>}</div>
                  </section>
                ))}
              </div>
              <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6"><Link href="/guide#articles" className="inline-flex items-center gap-2 text-xs font-semibold text-text-secondary hover:text-accent"><ArrowLeft size={14} /> <GuideLabel id="guide.allGuides" fallback="All guides" /></Link><Link href={categoryUrl} className="inline-flex items-center gap-2 text-xs font-semibold text-accent"><GuideLabel id="guide.moreIn" fallback="More in" /> {category?.name ?? "this category"} <ArrowRight size={14} /></Link></div>
            </article>

            <GuideShopLook links={shopLook} />

            {related.length > 0 && <section aria-labelledby="related-heading" className="mt-10 border-t border-border pt-8"><div className="mb-5 flex items-center justify-between"><h2 id="related-heading" className="border-l-4 border-accent pl-3 text-xl font-black"><GuideLabel id="guide.keepExploring" fallback="Keep exploring" /></h2><Link href={categoryUrl} className="text-xs font-semibold text-accent">View all <ArrowRight size={14} className="ml-1 inline" /></Link></div><div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">{related.map((item, index) => <GuideCard key={item.id} post={item} categoryName={categoryNames.get(item.categorySlug) ?? "Guide"} index={index} />)}</div></section>}
          </div>
        </div>
      </main>

    </div>
    </>
  );
}
