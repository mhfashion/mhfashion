"use client";

import Link from "next/link";
import { Heart, ShoppingBag, Trash2 } from "lucide-react";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import { useWishlist } from "@/lib/wishlist-context";

export default function WishlistPage() {
  const { items, count, clear } = useWishlist();

  return (
    <div>
      <Header />
      <main className="w-full bg-bg px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-[1480px]">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-accent"><Heart size={13} /> Saved</p>
              <h1 className="mt-2 text-2xl font-black sm:text-4xl">Wishlist</h1>
              <p data-wishlist-summary className="mt-1 text-xs text-text-muted sm:text-sm">
                {count === 0 ? "Nothing saved yet." : `${count} ${count === 1 ? "item" : "items"} saved on this device.`}
              </p>
            </div>
            {count > 0 ? (
              <button type="button" onClick={clear} data-wishlist-clear className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-[11px] font-bold hover:border-accent hover:text-accent">
                <Trash2 size={13} /> Clear wishlist
              </button>
            ) : null}
          </div>

          {count ? (
            <div data-wishlist-items className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              {items.map((product) => (
                <div key={product.id} data-wishlist-item={product.id} className="aspect-square overflow-hidden rounded-xl border border-border bg-bg-surface p-1.5 shadow-sm sm:p-2.5">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          ) : (
            <div data-wishlist-empty className="rounded-2xl border border-border bg-bg-surface p-10 text-center">
              <Heart size={28} className="mx-auto text-text-muted" />
              <h2 className="mt-3 text-base font-black">No saved designs yet</h2>
              <p className="mx-auto mt-1 max-w-md text-xs text-text-muted">
                Tap the heart on any product to keep it here. The list stays on this device — the price you see on the product page is always the current one.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Link href="/products" className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2.5 text-[11px] font-bold text-accent-foreground"><ShoppingBag size={13} /> Browse products</Link>
                <Link href="/new" className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2.5 text-[11px] font-bold">New arrivals</Link>
                <Link href="/popular" className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2.5 text-[11px] font-bold">Popular</Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
