"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Box, Minus, Plus, Search } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import { AdminBadge, AdminButton, AdminCard, AdminCardHeader, AdminEmpty, AdminInput, AdminStat } from "@/components/admin/AdminUi";
import { updateAdminData, useAdminDemoData } from "@/lib/admin-demo-store";
import { matchesSearchQuery } from "@/lib/search-text";
import {
  adjustStock, setStockQuantity, stockRows, stockSummary,
} from "@/lib/admin-demo-data";

type StockFilter = "all" | "low" | "out";

export default function AdminInventory() {
  const data = useAdminDemoData();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StockFilter>("all");

  const query = search;
  const summary = useMemo(() => stockSummary(data), [data]);
  const rows = useMemo(() => stockRows(data)
    .filter((row) => matchesSearchQuery(row.product.toLowerCase(), query))
    .filter((row) => (filter === "low" ? row.low : filter === "out" ? row.out : true)), [data, query, filter]);

  function change(productId: string, size: string, delta: number) {
    updateAdminData((current) => adjustStock(current, productId, size, delta));
  }

  function setExact(productId: string, size: string, value: string) {
    const quantity = Number(value);
    if (!Number.isFinite(quantity)) return;
    updateAdminData((current) => setStockQuantity(current, productId, size, quantity));
  }

  return (
    <AdminShell
      active="inventory"
      title="Inventory"
      description={`Stock per product and size. Anything at or below ${data.settings.lowStockThreshold} units is flagged.`}
      search={(
        <label className="flex h-10 w-full max-w-[420px] items-center gap-2.5 rounded-full border border-[#e6e9ed] bg-[#f8f9fb] px-3.5 text-[#8c95a1] focus-within:border-[#a5d972] focus-within:bg-white">
          <Search size={16} className="shrink-0" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search stock" placeholder="Search product..." className="min-w-0 flex-1 bg-transparent text-[11px] text-[#252c37] outline-none placeholder:text-[#9da5af]" />
        </label>
      )}
    >
      <section aria-label="Inventory metrics" className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Units in stock" value={summary.units.toLocaleString("en-US")} hint={`${summary.skus} size SKUs`} icon={<Box size={21} />} />
        <AdminStat label="Low stock" value={String(summary.low)} hint={`At or below ${data.settings.lowStockThreshold} units`} icon={<AlertTriangle size={21} />} />
        <AdminStat label="Out of stock" value={String(summary.out)} hint="Restock before publishing" icon={<AlertTriangle size={21} />} />
        <AdminStat label="Products tracked" value={String(data.products.length)} hint="Catalog entries with stock rows" icon={<Box size={21} />} />
      </section>

      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter stock rows">
        {([
          { id: "all", label: "All rows", count: summary.skus },
          { id: "low", label: "Low stock", count: summary.low },
          { id: "out", label: "Out of stock", count: summary.out },
        ] as { id: StockFilter; label: string; count: number }[]).map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={filter === option.id}
            onClick={() => setFilter(option.id)}
            className={`rounded-full border px-2.5 py-1 text-[9px] font-bold transition-colors ${filter === option.id ? "border-[#4cae22] bg-[#eef8e6] text-[#3f8c22]" : "border-[#e4e8ed] bg-white text-[#6c7683] hover:bg-[#f7f9fb]"}`}
          >
            {option.label} <span className="ml-1 text-[8px] opacity-70">{option.count}</span>
          </button>
        ))}
      </div>

      <AdminCard className="mt-3 overflow-hidden">
        <AdminCardHeader title="Stock levels" description="Adjust counts as production and delivery consume stock" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-[10px]">
            <thead className="bg-[#fafbfc] text-[9px] font-semibold text-[#828c99]">
              <tr>
                <th className="px-4 py-2.5 font-semibold sm:px-5">Product</th>
                <th className="px-3 py-2.5 font-semibold">Category</th>
                <th className="px-3 py-2.5 font-semibold">Size</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-3 py-2.5 font-semibold">Quantity</th>
                <th className="px-4 py-2.5 text-right font-semibold sm:px-5">Adjust</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f2f4]">
              {rows.length ? rows.map((row) => (
                <tr key={`${row.productId}-${row.size}`} className="hover:bg-[#fafbfc]">
                  <td className="px-4 py-2.5 font-bold text-[#303844] sm:px-5">{row.product}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[#727d8a]">{row.category}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[#727d8a]">{row.size}</td>
                  <td className="px-3 py-2.5">
                    {row.out ? <AdminBadge tone="red">Out of stock</AdminBadge> : row.low ? <AdminBadge tone="amber">Low stock</AdminBadge> : <AdminBadge tone="green">In stock</AdminBadge>}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="w-20">
                      <AdminInput
                        value={String(row.quantity)}
                        onChange={(event) => setExact(row.productId, row.size, event.target.value)}
                        inputMode="numeric"
                        aria-label={`${row.product} ${row.size} quantity`}
                        className="h-8 tabular-nums"
                      />
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right sm:px-5">
                    <div className="inline-flex items-center gap-1">
                      <AdminButton compact variant="secondary" onClick={() => change(row.productId, row.size, -1)} aria-label={`Remove one ${row.product} ${row.size}`}><Minus size={12} /></AdminButton>
                      <AdminButton compact variant="secondary" onClick={() => change(row.productId, row.size, 1)} aria-label={`Add one ${row.product} ${row.size}`}><Plus size={12} /></AdminButton>
                      <AdminButton compact variant="ghost" onClick={() => change(row.productId, row.size, 10)} aria-label={`Restock ten ${row.product} ${row.size}`}>+10</AdminButton>
                    </div>
                  </td>
                </tr>
              )) : <tr><td colSpan={6}><AdminEmpty title="No stock rows match this filter" description="Switch back to all rows or clear the search." /></td></tr>}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </AdminShell>
  );
}
