"use client";

import { Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useCurrency } from "@/lib/currency-context";
import { useI18n } from "@/lib/i18n";

export default function CartBox({ onClose }: { onClose: () => void }) {
  const { items, itemCount, updateQuantity, removeItem } = useCart();
  const { formatRangeKs } = useCurrency();
  const { t } = useI18n();
  const subtotal = items.reduce((sum, item) => sum + item.priceMinKs * item.quantity, 0);

  return (
    <div className="absolute right-0 top-full z-[70] mt-3 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-bg-surface shadow-2xl">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div><h2 className="text-sm font-black">{t("cart.title")}</h2><p className="mt-0.5 text-[10px] text-text-muted">{itemCount} {itemCount === 1 ? t("cart.item") : t("cart.items")}</p></div>
        <button type="button" onClick={onClose} aria-label="Close cart" className="rounded-full p-1 text-text-muted hover:bg-bg"><X size={15} /></button>
      </div>
      {items.length ? <>
        <div className="max-h-72 divide-y divide-border overflow-y-auto">
          {items.map((item) => <div key={item.id} className="flex gap-2.5 px-4 py-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-bg">
              {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" /> : <ShoppingCart size={18} className="m-4 text-text-muted" />}
            </div>
            <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{item.name}</p><p className="mt-1 text-[10px] text-text-muted">{formatRangeKs(item.priceMinKs, item.priceMaxKs)}</p><div className="mt-1.5 flex items-center gap-1"><button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)} className="rounded border border-border p-0.5" aria-label="Decrease quantity"><Minus size={11} /></button><span className="min-w-5 text-center text-[10px] font-bold">{item.quantity}</span><button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)} className="rounded border border-border p-0.5" aria-label="Increase quantity"><Plus size={11} /></button></div></div>
            <button type="button" onClick={() => removeItem(item.id)} aria-label="Remove item" className="self-start p-1 text-text-muted hover:text-red-400"><Trash2 size={14} /></button>
          </div>)}
        </div>
        <div className="border-t border-border px-4 py-3"><div className="flex items-center justify-between text-xs"><span className="text-text-muted">{t("cart.subtotal")}</span><strong>{formatRangeKs(subtotal, subtotal)}</strong></div><a href="/cart" onClick={onClose} className="mt-3 block rounded-lg bg-accent px-3 py-2 text-center text-xs font-bold text-accent-foreground">{t("cart.viewCart")}</a></div>
      </> : <div className="px-4 py-10 text-center"><ShoppingCart size={25} className="mx-auto text-text-muted" /><p className="mt-3 text-xs font-semibold">{t("cart.empty")}</p><a href="/new" onClick={onClose} className="mt-4 inline-flex rounded-full bg-accent px-4 py-2 text-[10px] font-bold text-accent-foreground">{t("cart.shopNow")}</a></div>}
    </div>
  );
}
