"use client";

import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useCurrency } from "@/lib/currency-context";
import { useI18n } from "@/lib/i18n";

export default function CartPageClient() {
  const { items, itemCount, updateQuantity, removeItem, clearCart } = useCart();
  const { formatRangeKs } = useCurrency();
  const { t } = useI18n();
  const subtotal = items.reduce((sum, item) => sum + item.priceMinKs * item.quantity, 0);

  if (!items.length) return <section className="rounded-2xl border border-border bg-bg-surface px-5 py-16 text-center shadow-sm"><ShoppingBag size={42} className="mx-auto text-text-muted" /><h2 className="mt-4 text-xl font-black">{t("cart.empty")}</h2><p className="mt-2 text-xs text-text-muted">{t("cart.emptyHelp")}</p><a href="/new" className="mt-6 inline-flex items-center rounded-full bg-accent px-5 py-2.5 text-xs font-bold text-accent-foreground">{t("cart.shopNow")} <ArrowRight size={14} className="ml-1.5" /></a></section>;

  return <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
    <section className="overflow-hidden rounded-2xl border border-border bg-bg-surface shadow-sm"><div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6"><div><h2 className="text-base font-black">{t("cart.itemsTitle")}</h2><p className="mt-1 text-[10px] text-text-muted">{itemCount} {itemCount === 1 ? t("cart.item") : t("cart.items")}</p></div><button type="button" onClick={clearCart} className="text-[10px] font-semibold text-text-muted hover:text-red-400">{t("cart.clear")}</button></div>
      <div className="divide-y divide-border">{items.map((item) => <article key={item.id} className="flex gap-3 p-4 sm:gap-4 sm:p-6"><a href={`/products/${item.slug}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-bg sm:h-24 sm:w-24">{item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" /> : <ShoppingBag size={22} className="m-7 text-text-muted" />}</a><div className="min-w-0 flex-1"><a href={`/products/${item.slug}`} className="block truncate text-sm font-bold hover:text-accent">{item.name}</a><p className="mt-1 text-xs text-text-muted">{formatRangeKs(item.priceMinKs, item.priceMaxKs)}</p><div className="mt-3 flex items-center gap-2"><div className="flex items-center rounded-lg border border-border"><button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1.5" aria-label="Decrease quantity"><Minus size={13} /></button><span className="min-w-7 text-center text-xs font-bold">{item.quantity}</span><button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1.5" aria-label="Increase quantity"><Plus size={13} /></button></div><button type="button" onClick={() => removeItem(item.id)} className="ml-1 flex items-center gap-1 text-[10px] text-text-muted hover:text-red-400"><Trash2 size={13} /> {t("cart.remove")}</button></div></div><strong className="shrink-0 text-xs font-bold">{formatRangeKs(item.priceMinKs * item.quantity, item.priceMinKs * item.quantity)}</strong></article>)}</div>
    </section>
    <aside className="h-fit rounded-2xl border border-border bg-bg-surface p-5 shadow-sm"><h2 className="text-base font-black">{t("cart.summary")}</h2><div className="mt-5 flex items-center justify-between border-b border-border pb-4 text-xs"><span className="text-text-muted">{t("cart.subtotal")}</span><strong>{formatRangeKs(subtotal, subtotal)}</strong></div><div className="mt-4 flex items-center justify-between text-sm font-black"><span>{t("cart.total")}</span><span className="text-accent">{formatRangeKs(subtotal, subtotal)}</span></div><button type="button" className="mt-5 flex w-full items-center justify-center rounded-xl bg-accent px-4 py-3 text-xs font-bold text-accent-foreground">{t("cart.checkout")} <ArrowRight size={14} className="ml-1.5" /></button><p className="mt-3 text-center text-[10px] text-text-muted">{t("cart.checkoutHelp")}</p></aside>
  </div>;
}
