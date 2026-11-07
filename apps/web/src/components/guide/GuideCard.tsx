import Link from "next/link";
import { ArrowRight, BookOpen, Clock3, Heart, Bookmark } from "lucide-react";
import type { GuidePost } from "@/lib/guides";

const FALLBACK_BACKGROUNDS: Record<string, string> = {
  "product-guide": "from-[#edf5e8] via-[#d5e9c7] to-[#b9d8a2]",
  "design-guide": "from-[#dceeff] via-[#c8dcf5] to-[#aec6e8]",
  "payment-guide": "from-[#eaf2ff] via-[#dce8f9] to-[#bbd0ed]",
  "delivery-guide": "from-[#fff0bd] via-[#f7df88] to-[#eec964]",
};

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

  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-bg-surface shadow-sm transition-shadow hover:shadow-lg">
      <Link href={`/guide/${post.slug}`} className="block outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset">
        <div className="relative aspect-[1.7/1] overflow-hidden bg-bg">
          {post.coverImageUrl ? (
            <img src={post.coverImageUrl} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className={`relative h-full w-full bg-gradient-to-br ${fallbackBackground}`}>
              <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/40 blur-sm" />
              <div className="absolute bottom-[-35px] left-[22%] h-40 w-28 rotate-[-7deg] rounded-[42%] bg-white/75 shadow-md" />
              <BookOpen className="absolute left-5 top-5 text-[#4f9715]/70" size={30} aria-hidden="true" />
              <span className="absolute bottom-5 left-5 max-w-[70%] text-xl font-black leading-tight text-[#28530e]/75">MH Fashion</span>
            </div>
          )}
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#57a914] px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
            <BookOpen size={11} aria-hidden="true" /> {categoryName.replace(" Guide", "")}
          </span>
          <span className="absolute bottom-[-1px] left-3 inline-flex items-center gap-1 rounded-full bg-bg-surface px-2.5 py-1.5 text-[10px] font-semibold text-text-primary shadow-sm">
            <Clock3 size={12} aria-hidden="true" /> {post.readingMinutes} min read
          </span>
          <span aria-label="Save post" className="absolute right-3 top-3 rounded-full bg-white/85 p-1.5 text-text-primary opacity-0 transition-opacity group-hover:opacity-100">
            <Bookmark size={14} aria-hidden="true" />
          </span>
        </div>
        <div className="p-4">
          <h3 className="line-clamp-2 min-h-[2.8rem] text-base font-bold leading-snug transition-colors group-hover:text-accent">{post.title}</h3>
          <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-xs leading-relaxed text-text-secondary">{post.excerpt}</p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent">Read More <ArrowRight size={14} aria-hidden="true" /></span>
            <span className="inline-flex items-center gap-1 text-[10px] text-text-muted"><Heart size={13} aria-hidden="true" /> {128 - index * 17}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
