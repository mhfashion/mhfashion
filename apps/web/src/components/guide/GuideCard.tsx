import Link from "next/link";
import { ArrowRight, BookOpen, Clock3, Heart } from "lucide-react";
import type { GuidePost } from "@/lib/guides";

const FALLBACK_BACKGROUNDS: Record<string, string> = {
  "product-guide": "from-[#edf5e8] via-[#d5e9c7] to-[#b9d8a2]",
  "design-guide": "from-[#dceeff] via-[#c8dcf5] to-[#aec6e8]",
  "payment-guide": "from-[#eaf2ff] via-[#dce8f9] to-[#bbd0ed]",
  "delivery-guide": "from-[#fff0bd] via-[#f7df88] to-[#eec964]",
};

/**
 * A square card on the same grid as the product cards: cover, two-line title, one meta row. The
 * old cover-plus-excerpt card stood about twice as tall as a product tile.
 */
export default function GuideCard({
  post,
  categoryName,
  index,
}: {
  post: GuidePost;
  categoryName: string;
  index: number;
}) {
  const fallbackBackground = FALLBACK_BACKGROUNDS[post.categorySlug] ?? "from-[#eef8df] to-[#cbeaa9]";
  const category = categoryName.replace(" Guide", "");

  return (
    <article className="group flex aspect-square h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-bg-surface p-1.5 shadow-sm transition-shadow hover:shadow-lg sm:p-2.5">
      <Link
        href={`/guide/${post.slug}`}
        className="flex min-h-0 flex-1 flex-col outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg bg-bg">
          {post.coverImageUrl ? (
            <img src={post.coverImageUrl} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className={`relative h-full w-full bg-gradient-to-br ${fallbackBackground}`}>
              <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/40 blur-sm" />
              <div className="absolute bottom-[-26px] right-2 h-24 w-16 rotate-[7deg] rounded-[42%] bg-white/75 shadow-sm" />
              <BookOpen className="absolute left-2 top-2 text-[#4f9715]/80" size={14} aria-hidden="true" />
              <span className="absolute bottom-1.5 left-2 text-[9px] font-black leading-none text-[#28530e]/70 sm:text-[10px]">MH Fashion</span>
            </div>
          )}
          <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-[#57a914] px-1.5 py-0.5 text-[7px] font-bold text-white shadow-sm sm:text-[9px]">
            <BookOpen size={8} aria-hidden="true" /> {category}
          </span>
          <span className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded-full bg-bg-surface/95 px-1.5 py-0.5 text-[7px] font-semibold text-text-primary shadow-sm sm:text-[9px]">
            <Clock3 size={8} aria-hidden="true" /> {post.readingMinutes} min
          </span>
        </div>

        <h3 className="mt-1 line-clamp-2 shrink-0 text-[10px] font-bold leading-snug transition-colors group-hover:text-accent sm:mt-1.5 sm:text-[11px]">{post.title}</h3>
        <div className="mt-0.5 flex shrink-0 items-center gap-1 text-[8px] text-text-muted sm:mt-1 sm:text-[9px]">
          <Heart size={8} aria-hidden="true" /> {128 - index * 17}
          <ArrowRight size={10} className="ml-auto text-accent" aria-hidden="true" />
        </div>
      </Link>
    </article>
  );
}
