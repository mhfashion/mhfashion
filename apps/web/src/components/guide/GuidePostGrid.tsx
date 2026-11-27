"use client";

import { useState } from "react";
import GuideCard from "@/components/guide/GuideCard";
import { GUIDE_GRID_PAGE_SIZE, type GuidePost } from "@/lib/guides";

/**
 * The landing grid. Every card is in the HTML — the ones past the first page are hidden with a class, and
 * a no-JS style in the page shows them all — so "See more" reveals cards instead of fetching them.
 */
export default function GuidePostGrid({
  posts,
  categoryNames,
}: {
  posts: GuidePost[];
  categoryNames: Record<string, string>;
}) {
  const [visible, setVisible] = useState(GUIDE_GRID_PAGE_SIZE);
  const remaining = Math.max(0, posts.length - visible);

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
        {posts.map((post, index) => (
          <div
            key={post.id}
            data-guide-card={index < visible ? "shown" : "more"}
            className={index < visible ? "min-w-0" : "hidden min-w-0"}
          >
            <GuideCard
              post={post}
              categoryName={categoryNames[post.categorySlug] ?? "Guide"}
              index={index}
            />
          </div>
        ))}
      </div>
      {remaining > 0 && (
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            data-guide-see-more
            onClick={() => setVisible((count) => count + GUIDE_GRID_PAGE_SIZE)}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-6 text-xs font-bold text-accent-foreground shadow-sm outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:min-h-11"
          >
            See more
            <span className="rounded-full bg-black/15 px-2 py-0.5 text-[10px] font-semibold">{remaining}</span>
          </button>
        </div>
      )}
    </>
  );
}
