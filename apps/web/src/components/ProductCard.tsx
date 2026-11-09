"use client";

import { useState } from "react";
import { Heart, Shirt } from "lucide-react";
import type { Product } from "@/lib/types";
import { useCurrency } from "@/lib/currency-context";
import { useI18n } from "@/lib/i18n";

export default function ProductCard({ product }: { product: Product }) {
  const [favorited, setFavorited] = useState(false);
  const { formatRangeKs } = useCurrency();
  const { t } = useI18n();
  const productUrl = `/products/${product.slug}`;

  return (
    <div className="group flex h-full aspect-square min-h-0 flex-col">
      <a href={productUrl} className="relative block min-h-0 flex-1 overflow-hidden rounded-lg bg-bg-surface">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center"><Shirt size={22} className="text-border-light" /></span>
        )}

        {product.isNew && (
          <span className="absolute left-1.5 top-1.5 rounded bg-accent px-1 py-0.5 text-[7px] font-bold text-accent-foreground">NEW</span>
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
          <Heart size={15} fill={favorited ? "currentColor" : "none"} className={favorited ? "text-accent" : "text-text-primary"} />
        </button>
      </a>

      <a href={productUrl} className="mt-1 block shrink-0 truncate text-[10px]">{product.name}</a>
      <div className="mt-1.5 shrink-0 rounded-md border border-border bg-bg-surface p-1.5 shadow-sm">
        <span className="block truncate px-1 text-[10px] font-semibold text-text-primary">
          {formatRangeKs(product.priceMinKs, product.priceMaxKs)}
        </span>
        <a href={productUrl} className="mt-1.5 block rounded-md bg-accent px-2 py-1.5 text-center text-[10px] font-bold text-accent-foreground transition-opacity hover:opacity-85">
          {t("product.buy")}
        </a>
      </div>
    </div>
  );
}
