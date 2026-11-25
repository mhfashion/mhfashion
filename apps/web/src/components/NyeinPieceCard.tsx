"use client";

import { useState } from "react";
import { Shirt } from "lucide-react";
import type { Product } from "@/lib/types";
import { useCart } from "@/lib/cart-context";
import { useCurrency } from "@/lib/currency-context";
import { useI18n } from "@/lib/i18n";

export default function NyeinPieceCard({ piece, href }: { piece: Product; href?: string }) {
  const { addItem } = useCart();
  const { formatRangeKs } = useCurrency();
  const { t } = useI18n();
  const [added, setAdded] = useState(false);

  function addToCart() {
    addItem(piece);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  function buyNow() {
    addItem(piece);
    window.location.href = "/cart";
  }

  const artwork = piece.imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={piece.imageUrl} alt={piece.name} className="h-full w-full object-cover" />
  ) : (
    <Shirt size={34} className="text-text-faint" aria-hidden="true" />
  );

  return (
    <article
      data-nyein-piece={piece.slug}
      className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-bg-surface p-1.5 shadow-sm"
    >
      {href ? (
        <a href={href} className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-bg">
          {artwork}
        </a>
      ) : (
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-bg">{artwork}</div>
      )}
      <p className="mt-1 truncate text-[9px] sm:text-[10px]">{piece.name}</p>
      <p className="text-[9px] font-bold text-accent sm:text-[10px]">{formatRangeKs(piece.priceMinKs, piece.priceMaxKs)}</p>
      <div className="mt-1 grid grid-cols-2 gap-1">
        <button
          type="button"
          onClick={buyNow}
          data-nyein-buy={piece.slug}
          className="rounded-md bg-accent px-1 py-1.5 text-[8px] font-bold text-accent-foreground transition-opacity hover:opacity-90 sm:text-[9px]"
        >
          {t("product.buy")}
        </button>
        <button
          type="button"
          onClick={addToCart}
          data-nyein-cart={piece.slug}
          className="rounded-md border border-accent px-1 py-1.5 text-[8px] font-bold text-accent transition-colors hover:bg-accent/10 sm:text-[9px]"
        >
          {added ? t("product.addedToCart") : t("product.addToCart")}
        </button>
      </div>
    </article>
  );
}
