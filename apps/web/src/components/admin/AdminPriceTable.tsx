"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Grid3x3, RotateCcw, Save } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import { AdminButton, AdminCard, AdminCardHeader } from "@/components/admin/AdminUi";
import { updateAdminData, useAdminDemoData } from "@/lib/admin-demo-store";
import {
  PRICE_TABLE_CATEGORIES,
  PRICE_TABLE_SIZES,
  formatKs,
  priceTableCell,
  priceTableCounts,
  priceTableSizes,
  priceTableSummary,
  setPriceTableCell,
  type AdminPriceTable,
  type AdminProductCategory,
} from "@/lib/admin-demo-data";
import { formatPriceInput, parsePriceInput } from "@/lib/pricing-combinations";
import { SHOP_CATEGORY_PRICES } from "@/lib/price-table";

const cellKey = (category: AdminProductCategory, size: string) => `${category}::${size}`;

export default function AdminPriceTable() {
  const data = useAdminDemoData();
  const [pending, setPending] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<AdminProductCategory>("T-Shirt");

  const summary = useMemo(() => priceTableSummary(data.priceTable), [data.priceTable]);

  const dirtyKeys = useMemo(
    () => Object.keys(pending).filter((key) => {
      const [cat, size] = key.split("::");
      const stored = priceTableCell(data.priceTable, cat as AdminProductCategory, size);
      const typed = pending[key].trim();
      return typed === "" ? stored !== null : typed !== formatPriceInput(stored);
    }),
    [pending, data.priceTable],
  );

  const invalid = dirtyKeys.filter((key) => {
    const typed = pending[key].trim();
    return typed !== "" && !parsePriceInput(typed).ok;
  });

  function stored(cat: AdminProductCategory, size: string) {
    return formatPriceInput(priceTableCell(data.priceTable, cat, size));
  }

  function shown(cat: AdminProductCategory, size: string) {
    return pending[cellKey(cat, size)] ?? stored(cat, size);
  }

  function type(cat: AdminProductCategory, size: string, value: string) {
    setPending((current) => ({ ...current, [cellKey(cat, size)]: value }));
  }

  function save() {
    if (invalid.length) {
      setMessage(`Fix ${invalid.length} price${invalid.length === 1 ? "" : "s"} before saving — prices are whole Ks numbers above zero.`);
      return;
    }
    let next: AdminPriceTable = data.priceTable;
    let applied = 0;
    for (const key of dirtyKeys) {
      const [cat, size] = key.split("::");
      const typed = pending[key].trim();
      if (typed === "") {
        next = setPriceTableCell(next, cat as AdminProductCategory, size, null);
        applied += 1;
        continue;
      }
      const parsed = parsePriceInput(typed);
      if (!parsed.ok) continue;
      next = setPriceTableCell(next, cat as AdminProductCategory, size, parsed.value);
      applied += 1;
    }
    updateAdminData((current) => ({ ...current, priceTable: next }));
    setPending({});
    setMessage(`${applied} price${applied === 1 ? "" : "s"} saved to the Price Table.`);
  }

  function discard() {
    setPending({});
    setMessage("Unsaved changes discarded.");
  }

  function cell(cat: AdminProductCategory, size: string, mobile = false) {
    const key = cellKey(cat, size);
    const value = shown(cat, size);
    const invalidCell = dirtyKeys.includes(key) && value.trim() !== "" && !parsePriceInput(value).ok;
    return (
      <input
        key={key}
        {...{ [mobile ? "data-price-cell-mobile" : "data-price-cell"]: key }}
        aria-label={`${cat} ${size} price`}
        aria-invalid={invalidCell || undefined}
        inputMode="numeric"
        placeholder="—"
        value={value}
        onChange={(event) => type(cat, size, event.target.value)}
        className={`h-11 w-full rounded-lg border px-2 text-right text-[11px] font-bold tabular-nums outline-none transition-colors sm:h-9 ${invalidCell ? "border-[#e05252] bg-[#fdf1f1] text-[#a53232]" : "border-[#e6e9ed] bg-white text-[#252c37] focus:border-[#a5d972]"}`}
      />
    );
  }

  return (
    <AdminShell
      active="price-table"
      title="Price Table"
      description="One price per size and category. A post reads its price from here, so posting never types a price."
    >
      <div className="space-y-3">
        <AdminCard className="overflow-hidden">
          <AdminCardHeader
            title="Prices by size"
            description={`${summary.priced} of ${summary.total} cells priced. Empty cells are sizes the shop does not sell yet.`}
            actions={(
              <div className="flex items-center gap-1.5">
                <AdminButton variant="ghost" onClick={discard} disabled={!dirtyKeys.length}><RotateCcw size={12} /> Discard</AdminButton>
                <AdminButton onClick={save} disabled={!dirtyKeys.length}><Save size={12} /> Save{dirtyKeys.length ? ` (${dirtyKeys.length})` : ""}</AdminButton>
              </div>
            )}
          />
          <p className="border-b border-[#f0f2f4] bg-[#f7fbf3] px-4 py-2 text-[10px] font-semibold text-[#4a6b33] sm:px-5">
            <Grid3x3 size={11} className="mr-1 inline" />
            Posting a product or a T-shirt post fills its price from this table.
            <Link href="/admin/products" className="ml-1 inline-flex items-center gap-0.5 font-bold text-[#3f8c22] hover:underline">
              Products <ArrowRight size={10} />
            </Link>
          </p>

          {/* Phone: one category at a time, 44px rows. */}
          <div className="sm:hidden">
            <div className="flex gap-1.5 overflow-x-auto px-4 py-2.5" role="group" aria-label="Category">
              {PRICE_TABLE_CATEGORIES.map((cat) => {
                const counts = priceTableCounts(data.priceTable, cat);
                const active = cat === category;
                return (
                  <button
                    key={cat}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setCategory(cat)}
                    className={`shrink-0 rounded-full border px-2.5 py-1.5 text-[10px] font-bold ${active ? "border-[#4cae22] bg-[#eef8e6] text-[#3f8c22]" : "border-[#e4e8ed] bg-white text-[#6c7683]"}`}
                  >
                    {cat} <span className="opacity-70">{counts.priced}/{counts.total}</span>
                  </button>
                );
              })}
            </div>
            <ul className="divide-y divide-[#f0f2f4] px-4 pb-3">
              {priceTableSizes(category).map((size) => (
                <li key={size} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-[11px] font-bold text-[#333c49]">{size}</span>
                  <div className="w-36">{cell(category, size, true)}</div>
                </li>
              ))}
            </ul>
          </div>

          {/* Tablet and up: sizes down the side, categories across the top. */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="sticky top-0 z-10 bg-[#fafbfc]">
                  <th scope="col" className="sticky left-0 z-20 bg-[#fafbfc] px-4 py-2 text-[9px] font-bold uppercase tracking-wide text-[#8c95a1]">Size</th>
                  {PRICE_TABLE_CATEGORIES.map((cat) => {
                    const counts = priceTableCounts(data.priceTable, cat);
                    return (
                      <th key={cat} scope="col" aria-label={`${cat}: ${counts.priced} of ${counts.total} sizes priced`} className="px-2 py-2 text-[9px] font-bold uppercase tracking-wide text-[#8c95a1]">
                        {cat}
                        <span aria-hidden="true" className="ml-1 font-semibold normal-case text-[#a4acb6]"> {counts.priced}/{counts.total}</span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {PRICE_TABLE_SIZES.map((size) => (
                  <tr key={size} className="border-t border-[#f0f2f4]">
                    <th scope="row" className="sticky left-0 bg-white px-4 py-1.5 text-[11px] font-bold text-[#333c49]">{size}</th>
                    {PRICE_TABLE_CATEGORIES.map((cat) => (
                      <td key={cat} className="px-2 py-1.5">
                        {priceTableSizes(cat).includes(size)
                          ? cell(cat, size)
                          : <span aria-hidden="true" className="block text-center text-[11px] text-[#c9ced6]">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {message ? <p role="status" data-price-table-message className="px-4 py-2 text-[10px] font-semibold text-[#3f8c22] sm:px-5">{message}</p> : null}
        </AdminCard>

        <AdminCard className="p-4 sm:p-5">
          <h2 className="text-[12px] font-bold text-[#202733]">Shop categories and where their price comes from</h2>
          <ul data-shop-category-prices className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {SHOP_CATEGORY_PRICES.map((entry) => {
              const prices = priceTableSizes(entry.column)
                .map((size) => priceTableCell(data.priceTable, entry.column, size))
                .filter((price): price is number => price !== null);
              return (
                <li key={entry.shop} className="flex items-center justify-between rounded-lg border border-[#eef0f3] px-2.5 py-1.5 text-[10px]">
                  <span className="font-bold text-[#3c4553]">{entry.shop}</span>
                  <span className="tabular-nums text-[#6c7683]">
                    {entry.column} · {prices.length ? `${formatKs(Math.min(...prices))} – ${formatKs(Math.max(...prices))}` : "not priced"}
                  </span>
                </li>
              );
            })}
          </ul>

          <h2 className="mt-4 text-[12px] font-bold text-[#202733]">Posted categories</h2>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {PRICE_TABLE_CATEGORIES.map((cat) => {
              const prices = priceTableSizes(cat)
                .map((size) => priceTableCell(data.priceTable, cat, size))
                .filter((price): price is number => price !== null);
              return (
                <li key={cat} className="flex items-center justify-between rounded-lg border border-[#eef0f3] px-2.5 py-1.5 text-[10px]">
                  <span className="font-bold text-[#3c4553]">{cat}</span>
                  <span className="tabular-nums text-[#6c7683]">
                    {prices.length ? `${formatKs(Math.min(...prices))} – ${formatKs(Math.max(...prices))}` : "Not priced"}
                  </span>
                </li>
              );
            })}
          </ul>
        </AdminCard>
      </div>
    </AdminShell>
  );
}
