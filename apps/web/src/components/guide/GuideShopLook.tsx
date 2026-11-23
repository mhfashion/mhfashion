"use client";

import Link from "next/link";
import { ArrowRight, Shirt } from "lucide-react";
import { useCurrency } from "@/lib/currency-context";
import { guideProductHref, guideProductSubtitle, type ResolvedGuideProductLink } from "@/lib/guide-products";

/**
 * The products a guide post talks about, in the post's own order. It renders nothing at all when the post
 * names none or none of them still exist, so a post that sells nothing keeps its current shape.
 */
export default function GuideShopLook({ links }: { links: ResolvedGuideProductLink[] }) {
  const { formatRangeKs } = useCurrency();
  if (links.length === 0) return null;

  return (
    <section aria-labelledby="shop-this-look" className="mt-10 border-t border-border pt-8" data-guide-shop-look>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 id="shop-this-look" className="border-l-4 border-accent pl-3 text-xl font-black">Shop this look</h2>
          <p className="mt-1.5 pl-3 text-xs text-text-muted">The pieces this guide talks about, in the order it mentions them.</p>
        </div>
        <Link href="/products" className="hidden shrink-0 items-center gap-1 text-xs font-semibold text-accent sm:inline-flex">
          All products <ArrowRight size={14} />
        </Link>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {links.map((link) => {
          const href = guideProductHref(link.product.slug);
          const subtitle = guideProductSubtitle(link);
          return (
            <li key={link.product.id} data-guide-product={link.product.slug}>
              <Link href={href} className="flex h-full items-center gap-3 rounded-xl border border-border bg-bg-surface p-2.5 transition-colors hover:border-accent/60">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-bg">
                  {link.product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={link.product.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <Shirt size={20} className="text-text-muted" aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{link.product.name}</span>
                  {subtitle ? <span className="mt-0.5 block truncate text-[11px] text-text-muted">{subtitle}</span> : null}
                  <span className="mt-1 block text-xs font-semibold text-accent">{formatRangeKs(link.product.priceMinKs, link.product.priceMaxKs)}</span>
                </span>
                <ArrowRight size={15} className="shrink-0 text-text-muted" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
