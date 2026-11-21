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
  const category = categoryName.replace(" Guide", "");

  // Phones get a thumbnail-and-text row: a full-width cover made every card taller than the screen.
  return (
    <article className="group overflow-hidden rounded-xl border border-border bg-bg-surface shadow-sm transition-shadow hover:shadow-lg">
      <Link
        href={`/guide/${post.slug}`}
        className="flex gap-2.5 p-2 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset sm:block sm:p-0"
      >
        <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg bg-bg sm:aspect-[1.9/1] sm:h-auto sm:w-full sm:rounded-none">
          {post.coverImageUrl ? (
            <img src={post.coverImageUrl} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className={`relative h-full w-full bg-gradient-to-br ${fallbackBackground}`}>
              <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/40 blur-sm" />
              <div className="absolute bottom-[-35px] left-[22%] h-40 w-28 rotate-[-7deg] rounded-[42%] bg-white/75 shadow-md" />
              <BookOpen className="absolute inset-0 m-auto text-[#4f9715]/80 sm:hidden" size={22} aria-hidden="true" />
              <BookOpen className="absolute left-4 top-4 hidden text-[#4f9715]/70 sm:block" size={26} aria-hidden="true" />
              <span className="absolute bottom-4 left-4 hidden max-w-[70%] text-lg font-black leading-tight text-[#28530e]/75 sm:block">MH Fashion</span>
            </div>
          )}
          <span className="absolute left-2 top-2 hidden items-center gap-1 rounded-full bg-[#57a914] px-2 py-0.5 text-[9px] font-bold text-white shadow-sm sm:inline-flex">
            <BookOpen size={10} aria-hidden="true" /> {category}
          </span>
          <span className="absolute bottom-0 left-2 hidden items-center gap-1 rounded-full bg-bg-surface px-2 py-1 text-[9px] font-semibold text-text-primary shadow-sm sm:inline-flex">
            <Clock3 size={11} aria-hidden="true" /> {post.readingMinutes} min
          </span>
          <span aria-label="Save post" className="absolute right-2 top-2 hidden rounded-full bg-white/85 p-1 text-text-primary opacity-0 transition-opacity group-hover:opacity-100 sm:block">
            <Bookmark size={12} aria-hidden="true" />
          </span>
        </div>

        <div className="min-w-0 flex-1 sm:p-3">
          <h3 className="line-clamp-2 text-[13px] font-bold leading-snug transition-colors group-hover:text-accent sm:min-h-[2.4rem] sm:text-sm">{post.title}</h3>
          <p className="mt-1 hidden line-clamp-2 text-[11px] leading-relaxed text-text-secondary sm:block">{post.excerpt}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[9px] text-text-muted sm:mt-2.5 sm:justify-between sm:text-[10px]">
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-1.5 py-0.5 font-bold text-accent sm:hidden">{category}</span>
            <span className="inline-flex items-center gap-1"><Clock3 size={10} aria-hidden="true" /> {post.readingMinutes} min</span>
            <span className="inline-flex items-center gap-1 sm:ml-auto">
              <Heart size={10} aria-hidden="true" /> {128 - index * 17}
              <ArrowRight size={11} className="ml-0.5 text-accent" aria-hidden="true" />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
