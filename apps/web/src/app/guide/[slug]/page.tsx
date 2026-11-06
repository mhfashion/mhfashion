import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock3 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import GuideCard from "@/components/guide/GuideCard";
import GuideLabel from "@/components/guide/GuideLabel";
import { getGuideCatalog, getGuidePostBySlug } from "@/lib/guides";
import { guideMetadata } from "@/lib/guide-metadata";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

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
  const related = catalog.posts
    .filter((item) => item.slug !== post.slug && item.categorySlug === post.categorySlug)
    .slice(0, 2);
  const categoryUrl = `/guide?category=${encodeURIComponent(post.categorySlug)}#articles`;

  return (
    <div>
      <Header />
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 md:py-12">
        <nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap items-center gap-2 text-xs text-text-muted">
          <Link href="/" className="hover:text-accent"><GuideLabel id="guide.home" fallback="Home" /></Link><span aria-hidden="true">/</span>
          <Link href="/guide" className="hover:text-accent"><GuideLabel id="nav.guide" fallback="Guide" /></Link><span aria-hidden="true">/</span>
          <Link href={categoryUrl} className="hover:text-accent">{category?.name ?? "Article"}</Link>
        </nav>

        <header className="max-w-3xl border-b border-border pb-8">
          <Link href={categoryUrl} className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent hover:underline">{category?.name ?? "Guide"}</Link>
          <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight sm:text-4xl md:text-5xl">{post.title}</h1>
          <p className="mt-5 text-base leading-relaxed text-text-secondary">{post.excerpt}</p>
          <p className="mt-5 flex items-center gap-1.5 text-xs text-text-muted"><Clock3 size={13} aria-hidden="true" /> {post.readingMinutes} min read <span className="mx-2" aria-hidden="true">·</span> <GuideLabel id="guide.handbook" fallback="MH Fashion handbook" /></p>
        </header>

        {catalog.source === "starter" && (
          <p className="mt-6 max-w-3xl rounded-lg border border-border bg-bg-surface px-4 py-3 text-xs leading-relaxed text-text-muted">
            Starter guide · This article describes the planned experience. Some features and integrations are still in development.
          </p>
        )}

        <div className="mt-8 flex flex-col-reverse gap-8 lg:flex-row lg:items-start lg:gap-14">
          <article aria-label={post.title} className="min-w-0 flex-1 space-y-9 lg:max-w-3xl">
            {post.sections.map((section, index) => (
              <section key={`${index}:${section.heading}`} id={`section-${index + 1}`} className="scroll-mt-24">
                <h2 className="mb-4 text-xl font-bold leading-snug sm:text-2xl">{section.heading}</h2>
                <div className="space-y-4 text-sm leading-7 text-text-secondary">
                  {section.paragraphs.map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}
                  {section.bullets && section.bullets.length > 0 && (
                    <ul className="list-disc space-y-2 pl-5 marker:text-accent">
                      {section.bullets.map((bullet, bulletIndex) => <li key={bulletIndex}>{bullet}</li>)}
                    </ul>
                  )}
                </div>
              </section>
            ))}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
              <Link href="/guide#articles" className="inline-flex items-center gap-2 text-xs font-semibold text-text-secondary hover:text-accent"><ArrowLeft size={14} aria-hidden="true" /> All guides</Link>
              <Link href={categoryUrl} className="inline-flex items-center gap-2 text-xs font-semibold text-accent">More in {category?.name ?? "this category"} <ArrowRight size={14} aria-hidden="true" /></Link>
            </div>
          </article>

          <aside className="rounded-lg border border-border bg-bg-surface p-5 lg:sticky lg:top-24 lg:w-60 lg:shrink-0">
            <nav aria-label="On this page">
              <h2 className="mb-4 text-[10px] font-bold uppercase tracking-[0.15em] text-text-muted">On this page</h2>
              <ol className="space-y-3">
                {post.sections.map((section, index) => (
                  <li key={`${index}:${section.heading}`}><a href={`#section-${index + 1}`} className="flex items-start gap-2 text-xs leading-relaxed text-text-secondary hover:text-accent"><span className="mt-0.5 text-[10px] tabular-nums text-text-faint">{String(index + 1).padStart(2, "0")}</span>{section.heading}</a></li>
                ))}
              </ol>
            </nav>
          </aside>
        </div>

        {related.length > 0 && (
          <section aria-labelledby="related-heading" className="mt-14 border-t border-border pt-8">
            <h2 id="related-heading" className="mb-6 text-xl font-bold"><GuideLabel id="guide.keepExploring" fallback="Keep exploring" /></h2>
            <div className="grid gap-x-10 md:grid-cols-2">{related.map((item, index) => <GuideCard key={item.id} post={item} categoryName={categoryNames.get(item.categorySlug) ?? "Guide"} index={index} />)}</div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
