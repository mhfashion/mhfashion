import Link from "next/link";
import { ArrowUpRight, Clock3 } from "lucide-react";
import type { GuidePost } from "@/lib/guides";

export default function GuideCard({
  post,
  categoryName,
  index,
}: {
  post: GuidePost;
  categoryName: string;
  index: number;
}) {
  return (
    <article className="group border-t border-border py-6 sm:py-8">
      <Link
        href={`/guide/${post.slug}`}
        className="flex h-full flex-col rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-bg"
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-accent">
            {categoryName}
          </span>
          <span className="text-xs tabular-nums text-text-faint" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>
        <h3 className="mb-3 flex items-start justify-between gap-4 text-lg font-bold leading-snug transition-colors group-hover:text-accent sm:text-xl">
          {post.title}
          <ArrowUpRight size={20} className="mt-1 shrink-0 text-text-muted transition-colors group-hover:text-accent" aria-hidden="true" />
        </h3>
        <p className="mb-5 max-w-lg text-sm leading-relaxed text-text-secondary">
          {post.excerpt}
        </p>
        <div className="mt-auto flex items-center justify-between gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-text-muted">
            <Clock3 size={13} aria-hidden="true" /> {post.readingMinutes} min read
          </span>
          <span className="font-semibold text-text-primary group-hover:text-accent">Read guide</span>
        </div>
      </Link>
    </article>
  );
}
