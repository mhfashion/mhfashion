"use client";

import { useRef, useState } from "react";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { cartLineTotal, cartSubtotal, variantLabel, type CartItem } from "@/lib/cart-items";
import { useCurrency } from "@/lib/currency-context";
import { useI18n } from "@/lib/i18n";

export default function CartPageClient() {
  const { items, itemCount, updateQuantity, removeItem, clearCart } = useCart();
  const { formatRangeKs } = useCurrency();
  const { t } = useI18n();
  const subtotal = cartSubtotal(items);
  const [notice, setNotice] = useState("");
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const emptyHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const removeRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Removing a line takes the focused button with it, so the focus has to be handed to the line that
  // takes its place; the empty-state heading is the last resort when nothing is left.
  const focusAfterRemoval = (index: number, before: CartItem[]) => {
    const next = before[index + 1] ?? before[index - 1];
    requestAnimationFrame(() => {
      const target = next ? removeRefs.current[next.key] : null;
      (target ?? headingRef.current ?? emptyHeadingRef.current)?.focus();
    });
  };

  const removeLine = (index: number) => {
    const item = items[index];
    removeItem(item.key);
    setNotice(`${t("cart.removed")}: ${item.name}`);
    focusAfterRemoval(index, items);
  };

  const changeQuantity = (index: number, quantity: number) => {
    const item = items[index];
    updateQuantity(item.key, quantity);
    if (quantity > 0) return;
    // Decrementing past one deletes the line, so it needs the same focus handover.
    setNotice(`${t("cart.removed")}: ${item.name}`);
    focusAfterRemoval(index, items);
  };

  const clearAll = () => {
    clearCart();
    setNotice(t("cart.cleared"));
    requestAnimationFrame(() => emptyHeadingRef.current?.focus());
  };

  const noticeRegion = <p role="status" aria-live="polite" data-cart-notice className="sr-only">{notice}</p>;

  if (!items.length) return <section className="min-h-[390px] rounded-2xl border border-border bg-bg-surface px-5 py-16 text-center shadow-sm sm:min-h-[323px]"><ShoppingBag size={42} className="mx-auto text-text-muted" /><h2 ref={emptyHeadingRef} tabIndex={-1} className="mt-4 text-xl font-black">{t("cart.empty")}</h2><p className="mt-2 text-xs text-text-muted">{t("cart.emptyHelp")}</p><a href="/new" className="mt-6 inline-flex h-9 min-w-[189px] items-center justify-center rounded-full bg-accent px-5 text-xs font-bold text-accent-foreground">{t("cart.shopNow")} <ArrowRight size={14} className="ml-1.5" /></a>{noticeRegion}</section>;

  return <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
    {noticeRegion}
    <section className="overflow-hidden rounded-2xl border border-border bg-bg-surface shadow-sm"><div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6"><div><h2 ref={headingRef} tabIndex={-1} className="text-base font-black">{t("cart.itemsTitle")}</h2><p className="mt-1 text-[10px] text-text-muted">{itemCount} {itemCount === 1 ? t("cart.item") : t("cart.items")}</p></div><button type="button" onClick={clearAll} className="text-[10px] font-semibold text-text-muted hover:text-red-400">{t("cart.clear")}</button></div>
      <div className="divide-y divide-border">{items.map((item, index) => <article key={item.key} data-cart-line={item.key} className="flex gap-3 p-4 sm:gap-4 sm:p-6"><a href={`/products/${item.slug}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-bg sm:h-24 sm:w-24">{item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" /> : <ShoppingBag size={22} className="m-7 text-text-muted" />}</a><div className="min-w-0 flex-1"><a href={`/products/${item.slug}`} className="block truncate text-sm font-bold hover:text-accent">{item.name}</a>{variantLabel(item.variant) ? <p data-cart-variant className="mt-1 text-[10px] font-semibold text-text-secondary">{variantLabel(item.variant)}</p> : null}<p className="mt-0.5 text-xs text-text-muted">{formatRangeKs(item.unitPriceKs ?? item.priceMinKs, item.unitPriceKs ?? item.priceMaxKs)}</p><div className="mt-3 flex items-center gap-2"><div className="flex items-center rounded-lg border border-border"><button type="button" onClick={() => changeQuantity(index, item.quantity - 1)} className="p-1.5" aria-label="Decrease quantity"><Minus size={13} /></button><span aria-live="polite" data-cart-quantity className="min-w-7 text-center text-xs font-bold">{item.quantity}</span><button type="button" onClick={() => changeQuantity(index, item.quantity + 1)} className="p-1.5" aria-label="Increase quantity"><Plus size={13} /></button></div><button ref={(node) => { removeRefs.current[item.key] = node; }} type="button" data-cart-remove onClick={() => removeLine(index)} className="ml-1 flex items-center gap-1 text-[10px] text-text-muted hover:text-red-400"><Trash2 size={13} /> {t("cart.remove")}</button></div></div><strong className="shrink-0 text-xs font-bold">{formatRangeKs(cartLineTotal(item), cartLineTotal(item))}</strong></article>)}</div>
    </section>
    <aside className="h-fit rounded-2xl border border-border bg-bg-surface p-5 shadow-sm"><h2 className="text-base font-black">{t("cart.summary")}</h2><div className="mt-5 flex items-center justify-between border-b border-border pb-4 text-xs"><span className="text-text-muted">{t("cart.subtotal")}</span><strong>{formatRangeKs(subtotal, subtotal)}</strong></div><div className="mt-4 flex items-center justify-between text-sm font-black"><span>{t("cart.total")}</span><span className="text-accent">{formatRangeKs(subtotal, subtotal)}</span></div><a href="/checkout" data-cart-checkout className="mt-5 flex w-full items-center justify-center rounded-xl bg-accent px-4 py-3 text-xs font-bold text-accent-foreground">{t("cart.checkout")} <ArrowRight size={14} className="ml-1.5" /></a><p className="mt-3 text-center text-[10px] text-text-muted">{t("cart.checkoutHelp")}</p></aside>
  </div>;
}
