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
    <div className="grid gap-2 sm:grid-cols-3">
      <button type="button" onClick={buyNow} className="rounded-xl bg-accent px-4 py-3 text-sm font-bold text-accent-foreground transition-opacity hover:opacity-85">
        {t("product.buyNow")}
      </button>
      <button type="button" onClick={addToCart} className="rounded-xl border-2 border-accent px-4 py-3 text-sm font-bold text-accent transition-colors hover:bg-accent hover:text-accent-foreground">
        {added ? t("product.addedToCart") : t("product.addToCart")}
      </button>
      <a href={`/create?product=${encodeURIComponent(product.slug)}`} className="rounded-xl border border-border px-4 py-3 text-center text-sm font-bold text-text-primary transition-colors hover:border-accent hover:text-accent">
        {t("product.editDesign")}
      </a>
    </div>
  );
}
