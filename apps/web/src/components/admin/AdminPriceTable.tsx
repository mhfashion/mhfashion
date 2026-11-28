"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, RotateCcw, Save, Search, Shirt } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import { AdminButton, AdminCard, AdminCardHeader, AdminEmpty } from "@/components/admin/AdminUi";
import { updateAdminData, useAdminDemoData } from "@/lib/admin-demo-store";
import {
  priceSheetSummary, productPriceRows, productPriceType, productSheets, productSpec, saveProductSheet,
  typeMembers, type ProductSheet,
} from "@/lib/price-table";
import { formatPriceInput, parsePriceInput } from "@/lib/pricing-combinations";
import { matchesSearchQuery } from "@/lib/search-text";

const cellKey = (productId: string, size: string) => `${productId}::${size}`;

/** One product's sheet: what the product is made of, then one price per size it stocks. */
function ProductSheetCard({
  sheet,
  pending,
  dirty,
  onType,
  mobile = false,
}: {
  sheet: ProductSheet;
  pending: Record<string, string>;
  dirty: Set<string>;
  onType: (key: string, value: string) => void;
  /** The phone branch marks its own nodes, so the hidden desktop copy never duplicates a selector. */
  mobile?: boolean;
}) {
  const { product, prices } = sheet;
  const spec = productSpec(product);
  return (
    <div {...{ [mobile ? "data-price-sheet-mobile" : "data-price-sheet"]: sheet.type }} className="min-w-0">
    <AdminCard className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-2 px-4 pt-3.5 sm:px-5">
        <div className="min-w-0">
          <h3 data-price-sheet-title={sheet.type} className="flex items-center gap-1.5 text-[13px] font-bold text-[#202733]">
            <Shirt size={14} className="text-[#4cae22]" /> {sheet.type}
          </h3>
          <p className="mt-0.5 text-[10px] text-[#87909b]">
            {sheet.products.length > 1
              ? `${sheet.products.length} products share this price · ${sheet.priced} of ${sheet.total} sizes set`
              : `${product.category} · ${product.status} · ${sheet.priced} of ${sheet.total} sizes set`}
          </p>
          {sheet.products.length > 1 ? (
            <p data-price-sheet-users={sheet.type} className="mt-0.5 text-[9px] text-[#a4acb6]">
              {sheet.products.map((entry) => entry.name).join(" · ")}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          {sheet.priced < sheet.total ? (
            <span data-price-sheet-missing={sheet.type} className="rounded-full bg-[#fff4e0] px-2 py-1 text-[9px] font-bold text-[#8a6a00]">
              {sheet.total - sheet.priced} size{sheet.total - sheet.priced === 1 ? "" : "s"} not priced
            </span>
          ) : null}
        </div>
      </div>

      <dl data-price-sheet-spec={sheet.type} className="mx-4 mt-2.5 grid gap-x-5 gap-y-1 rounded-xl border border-[#eef0f3] bg-[#fafbfc] px-3 py-2 text-[10px] sm:mx-5 sm:grid-cols-2">
        {spec.map((line) => (
          <div key={line.label} className="flex min-w-0 items-baseline justify-between gap-2">
            <dt className="shrink-0 text-[#8c95a1]">{line.label}</dt>
            <dd className="break-words text-right font-bold text-[#3c4553]">{line.value}</dd>
          </div>
        ))}
      </dl>

      <ul className="mt-2 divide-y divide-[#f0f2f4] px-4 pb-3 sm:px-5">
        {prices.map((row) => {
          const key = cellKey(sheet.type, row.size);
          const value = pending[key] ?? formatPriceInput(row.priceKs);
          const invalid = dirty.has(key) && value.trim() !== "" && !parsePriceInput(value).ok;
          return (
            <li key={row.size} className="flex items-center justify-between gap-3 py-1.5">
              <span className="text-[11px] font-bold text-[#333c49]">Size {row.size}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[#a4acb6]">Ks</span>
                <input
                  {...{ [mobile ? "data-price-cell-mobile" : "data-price-cell"]: key }}
                  aria-label={`${sheet.type} ${row.size} price`}
                  aria-invalid={invalid || undefined}
                  inputMode="numeric"
                  placeholder="—"
                  value={value}
                  onChange={(event) => onType(key, event.target.value)}
                  className={`h-10 w-32 rounded-lg border px-2 text-right text-[11px] font-bold tabular-nums outline-none transition-colors sm:h-9 ${invalid ? "border-[#e05252] bg-[#fdf1f1] text-[#a53232]" : "border-[#e6e9ed] bg-white text-[#252c37] focus:border-[#a5d972]"}`}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </AdminCard>
    </div>
  );
}

export default function AdminPriceTable() {
  const data = useAdminDemoData();
  const [pending, setPending] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [openSheet, setOpenSheet] = useState<string | null>(null);

  const sheets = useMemo(() => productSheets(data), [data]);
  const summary = useMemo(() => priceSheetSummary(sheets), [sheets]);
  const visible = useMemo(
    () => sheets.filter((sheet) => matchesSearchQuery(
      `${sheet.type} ${sheet.product.category} ${sheet.product.fabric} ${sheet.products.map((entry) => entry.name).join(" ")}`,
      search,
    )),
    [sheets, search],
  );

  const dirty = useMemo(() => {
    const keys = new Set<string>();
    for (const [key, typed] of Object.entries(pending)) {
      const [type, size] = key.split("::");
      const sheet = sheets.find((entry) => entry.type === type);
      if (!sheet) continue;
      const stored = sheet.prices.find((row) => row.size === size)?.priceKs ?? null;
      const text = typed.trim();
      if (text === "" ? stored !== null : text !== formatPriceInput(stored)) keys.add(key);
    }
    return keys;
  }, [pending, sheets]);

  const invalid = [...dirty].filter((key) => {
    const typed = pending[key].trim();
    return typed !== "" && !parsePriceInput(typed).ok;
  });

  function type(key: string, value: string) {
    setPending((current) => ({ ...current, [key]: value }));
  }

  function save() {
    if (invalid.length) {
      setMessage(`Fix ${invalid.length} price${invalid.length === 1 ? "" : "s"} before saving — prices are whole Ks numbers above zero.`);
      return;
    }
    // A price belongs to the product type: the typed value is written on every product that shares it.
    const byType = new Map<string, { size: string; priceKs: number }[]>();
    for (const key of dirty) {
      const [sheetType, size] = key.split("::");
      const typed = pending[key].trim();
      if (typed === "") continue;
      const parsed = parsePriceInput(typed);
      if (!parsed.ok) continue;
      byType.set(sheetType, [...(byType.get(sheetType) ?? []), { size, priceKs: parsed.value }]);
    }
    if (!byType.size) {
      setPending({});
      setMessage("Nothing new to save — every size already sells at the price you typed.");
      return;
    }
    const at = new Date().toISOString();
    let applied = 0;
    updateAdminData((current) => {
      let next = current;
      for (const [sheetType, changes] of byType) {
        for (const product of typeMembers(next, next.products.find((entry) => productPriceType(entry) === sheetType) ?? next.products[0])) {
          const rows = productPriceRows(next, product);
          const forProduct = changes
            .filter((change) => rows.some((row) => row.size === change.size))
            .map((change) => ({
              size: change.size,
              priceKs: change.priceKs,
              version: rows.find((row) => row.size === change.size)?.version ?? 0,
            }));
          if (!forProduct.length) continue;
          const result = saveProductSheet(next, product.id, forProduct, "Owner", at);
          next = result.data;
          applied += result.applied;
        }
      }
      return next;
    });
    setPending({});
    setMessage(`${applied} price${applied === 1 ? "" : "s"} saved to the Price Table.`);
  }

  function discard() {
    setPending({});
    setMessage("Unsaved changes discarded.");
  }

  if (!data.products.length) {
    return (
      <AdminShell active="price-table" title="Price Table" description="One price per product type and size. A post reads its price from here, so posting never types a price.">
        <AdminEmpty title="No products yet" description="Post a product first; its type then appears here for pricing." />
      </AdminShell>
    );
  }

  const active = visible.find((sheet) => sheet.type === openSheet) ?? visible[0] ?? null;

  return (
    <AdminShell
      active="price-table"
      title="Price Table"
      description="Prices are set here, once per product type — never on a product, and never while posting."
      search={(
        <label className="flex h-10 w-full max-w-[420px] items-center gap-2.5 rounded-full border border-[#e6e9ed] bg-[#f8f9fb] px-3.5 text-[#8c95a1] focus-within:border-[#a5d972] focus-within:bg-white">
          <Search size={16} className="shrink-0" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search prices" placeholder="Search product type or fabric..." className="min-w-0 flex-1 bg-transparent text-[11px] text-[#252c37] outline-none placeholder:text-[#9da5af]" />
        </label>
      )}
    >
      <div className="space-y-3">
        <AdminCard className="overflow-hidden">
          <AdminCardHeader
            title="Prices by product type"
            description={`${summary.priced} of ${summary.total} size prices set across ${sheets.length} type${sheets.length === 1 ? "" : "s"}.`}
            actions={(
              <div className="flex items-center gap-1.5">
                <AdminButton variant="ghost" onClick={discard} disabled={!dirty.size}><RotateCcw size={12} /> Discard</AdminButton>
                <AdminButton onClick={save} disabled={!dirty.size}><Save size={12} /> Save{dirty.size ? ` (${dirty.size})` : ""}</AdminButton>
              </div>
            )}
          />
          <p className="border-b border-[#f0f2f4] bg-[#f7fbf3] px-4 py-2 text-[10px] font-semibold text-[#4a6b33] sm:px-5">
            A T-shirt and a phone cover are priced separately, and every product of the same type reads its type&apos;s price —
            a product is never priced on its own, and posting never asks for one.
            <Link href="/admin/products" className="ml-1 inline-flex items-center gap-0.5 font-bold text-[#3f8c22] hover:underline">
              Products <ArrowRight size={10} />
            </Link>
          </p>
          {message ? <p role="status" data-price-table-message className="px-4 py-2 text-[10px] font-semibold text-[#3f8c22] sm:px-5">{message}</p> : null}
        </AdminCard>

        {/* Phone: one sheet at a time. */}
        <div className="sm:hidden">
          <div className="flex gap-1.5 overflow-x-auto pb-2" role="group" aria-label="Product type">
            {visible.map((sheet) => {
              const isActive = active?.type === sheet.type;
              return (
                <button
                  key={sheet.type}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setOpenSheet(sheet.type)}
                  className={`shrink-0 rounded-full border px-2.5 py-1.5 text-[10px] font-bold ${isActive ? "border-[#4cae22] bg-[#eef8e6] text-[#3f8c22]" : "border-[#e4e8ed] bg-white text-[#6c7683]"}`}
                >
                  {sheet.type} <span className="opacity-70">{sheet.priced}/{sheet.total}</span>
                </button>
              );
            })}
          </div>
          {active ? (
            <ProductSheetCard sheet={active} pending={pending} dirty={dirty} onType={type} mobile />
          ) : null}
        </div>

        {/* Tablet and up: every type stacked. */}
        <div className="hidden gap-3 sm:grid sm:grid-cols-1 xl:grid-cols-2">
          {visible.map((sheet) => (
            <ProductSheetCard key={sheet.type} sheet={sheet} pending={pending} dirty={dirty} onType={type} />
          ))}
        </div>
        {!visible.length ? (
          <p className="rounded-xl border border-dashed border-[#e4e8ed] px-4 py-8 text-center text-[11px] text-[#87909b]">No product type matches “{search}”.</p>
        ) : null}
        <p className="text-[9px] leading-4 text-[#87909b]">
          A size left empty is not sold yet. Saves use the same price history and version check as{" "}
          <Link href="/admin/pricing" className="font-semibold text-[#3f8c22] hover:underline">Admin → Pricing</Link>.
        </p>
      </div>
    </AdminShell>
  );
}
