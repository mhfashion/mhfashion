"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import { useCart } from "@/lib/cart-context";
import { useI18n } from "@/lib/i18n";

export default function ProductDetailActions({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { t } = useI18n();
  const [added, setAdded] = useState(false);

  function addToCart() {
    addItem(product);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  function buyNow() {
    addItem(product);
    window.location.href = "/cart";
  }

  return (
    <div className="grid grid-cols-3 gap-1.5">
      <button type="button" onClick={buyNow} className="rounded-md bg-accent px-2 py-2.5 text-[11px] font-bold text-accent-foreground transition-opacity hover:opacity-85 sm:text-xs">
        {t("product.buyNow")}
      </button>
      <button type="button" onClick={addToCart} className="rounded-md border border-accent px-2 py-2.5 text-[11px] font-bold text-accent transition-colors hover:bg-accent hover:text-accent-foreground sm:text-xs">
        {added ? t("product.addedToCart") : t("product.addToCart")}
      </button>
      <a href={`/create?product=${encodeURIComponent(product.slug)}`} className="rounded-md border border-border px-2 py-2.5 text-center text-[11px] font-bold text-text-primary transition-colors hover:border-accent hover:text-accent sm:text-xs">
        {t("product.editDesign")}
      </a>
    </div>
  );
}
