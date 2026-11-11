"use client";

import { useState } from "react";
import { Heart, Shirt } from "lucide-react";
import type { Product } from "@/lib/types";
import { useCurrency } from "@/lib/currency-context";
import { useI18n } from "@/lib/i18n";

export default function ProductCard({ product, boxed = false }: { product: Product; boxed?: boolean }) {
  const [favorited, setFavorited] = useState(false);
  const { formatRangeKs } = useCurrency();
  const { t } = useI18n();
  const productUrl = `/products/${product.slug}`;

  return (
    <article className={`group flex h-full aspect-square min-h-0 flex-col ${boxed ? "rounded-xl border border-border/70 bg-bg p-2 shadow-sm transition-colors hover:border-accent/50 sm:p-2.5" : ""}`}>
      <a href={productUrl} className={`relative block min-h-0 flex-1 overflow-hidden rounded-lg ${boxed ? "border border-border/60 bg-bg-surface" : "bg-bg-surface"}`}>
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center"><Shirt size={22} className="text-border-light" /></span>
        )}

        {product.isNew && (
          <span className="absolute left-1.5 top-1.5 rounded bg-accent px-1 py-0.5 text-[6px] font-bold text-accent-foreground sm:text-[7px]">NEW</span>
        )}

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setFavorited((f) => !f);
          }}
          aria-label="Favorite"
          className="absolute right-1.5 top-1.5"
        >
          <Heart size={13} className={`${favorited ? "text-accent" : "text-text-primary"} sm:h-[15px] sm:w-[15px]`} fill={favorited ? "currentColor" : "none"} />
        </button>
      </a>

      <a href={productUrl} className="mt-0.5 block shrink-0 truncate text-[9px] sm:mt-1 sm:text-[10px]">{product.name}</a>
      <div className={`mt-1 shrink-0 ${boxed ? "" : "rounded-md border border-border bg-bg-surface p-1 shadow-sm sm:mt-1.5 sm:p-1.5"}`}>
        <span className="block truncate px-0.5 text-[8px] font-semibold text-text-primary sm:px-1 sm:text-[10px]">
          {formatRangeKs(product.priceMinKs, product.priceMaxKs)}
        </span>
        <a href={productUrl} className="mt-1 block rounded-md bg-accent px-1.5 py-1 text-center text-[8px] font-bold text-accent-foreground transition-opacity hover:opacity-85 sm:mt-1.5 sm:px-2 sm:py-1.5 sm:text-[10px]">
          {t("product.buy")}
        </a>
      </div>
    </article>
  );
}
