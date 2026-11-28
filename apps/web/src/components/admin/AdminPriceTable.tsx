"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, RotateCcw, Save, Search, Shirt } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import { AdminButton, AdminCard, AdminCardHeader, AdminEmpty } from "@/components/admin/AdminUi";
import { updateAdminData, useAdminDemoData } from "@/lib/admin-demo-store";
import {
  boxMembers, priceSheetSummary, productPriceRows, productSheets, productSpec, saveProductSheet,
  type ProductSheet, type ProductSpecBox,
} from "@/lib/price-table";
import { formatPriceInput, parsePriceInput } from "@/lib/pricing-combinations";
import { matchesSearchQuery } from "@/lib/search-text";

const cellKey = (boxKey: string, size: string) => `${boxKey}::${size}`;
const splitKey = (key: string) => {
  const index = key.lastIndexOf("::");
  return { boxKey: key.slice(0, index), size: key.slice(index + 2) };
};

/** One spec box: what that variant is made of, then one price per size it sells. */
function SpecBox({
  box,
  pending,
  dirty,
  onType,
  mobile = false,
  first,
}: {
  box: ProductSpecBox;
  pending: Record<string, string>;
  dirty: Set<string>;
  onType: (key: string, value: string) => void;
  /** The phone branch marks its own nodes, so the hidden desktop copy never duplicates a selector. */
  mobile?: boolean;
  first: boolean;
}) {
  const spec = productSpec(box.product, box.products);
  return (
    <div
      {...{ [mobile ? "data-price-box-mobile" : "data-price-box"]: box.key }}
      className={first ? "" : "mt-3 border-t border-dashed border-[#eaedf1] pt-3"}
    >
      <div className="flex flex-wrap items-center justify-between gap-1.5 px-4 sm:px-5">
        <p className="text-[10px] font-bold text-[#4a6b33]">
          {box.product.fabric} · {box.product.gsm ? `${box.product.gsm} GSM` : "One size"}
          {box.products.length > 1 ? <span className="ml-1 font-semibold text-[#87909b]">({box.products.length} products share this box)</span> : null}
        </p>
        {box.priced < box.total ? (
          <span data-price-box-missing={box.key} className="rounded-full bg-[#fff4e0] px-2 py-0.5 text-[9px] font-bold text-[#8a6a00]">
            {box.total - box.priced} size{box.total - box.priced === 1 ? "" : "s"} not priced
          </span>
        ) : null}
      </div>

      <dl data-price-box-spec={box.key} className="mx-4 mt-2 grid gap-x-5 gap-y-1 rounded-xl border border-[#eef0f3] bg-[#fafbfc] px-3 py-2 text-[10px] sm:mx-5 sm:grid-cols-2">
        {spec.map((line) => (
          <div key={line.label} className="flex min-w-0 items-baseline justify-between gap-2">
            <dt className="shrink-0 text-[#8c95a1]">{line.label}</dt>
            <dd className="break-words text-right font-bold text-[#3c4553]">{line.value}</dd>
          </div>
        ))}
      </dl>

      <ul className="mt-2 px-4 pb-1 sm:px-5">
        {box.prices.map((row) => {
          const key = cellKey(box.key, row.size);
          const value = pending[key] ?? formatPriceInput(row.priceKs);
          const invalid = dirty.has(key) && value.trim() !== "" && !parsePriceInput(value).ok;
          return (
            <li key={row.size} className="flex items-center justify-between gap-3 py-1">
              <span className="text-[11px] font-bold text-[#333c49]">Size {row.size}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[#a4acb6]">Ks</span>
                <input
                  {...{ [mobile ? "data-price-cell-mobile" : "data-price-cell"]: key }}
                  aria-label={`${box.type} ${box.product.fabric} ${row.size} price`}
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
    </div>
  );
}

/** One product type: a card holding a box per spec the shop makes. */
function TypeCard({
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
  mobile?: boolean;
}) {
  return (
    <div {...{ [mobile ? "data-price-sheet-mobile" : "data-price-sheet"]: sheet.type }} className="min-w-0">
      <AdminCard className="overflow-hidden">
        <div className="px-4 pt-3.5 pb-2 sm:px-5">
          <h3 data-price-sheet-title={sheet.type} className="flex items-center gap-1.5 text-[13px] font-bold text-[#202733]">
            <Shirt size={14} className="text-[#4cae22]" /> {sheet.type}
          </h3>
          <p className="mt-0.5 text-[10px] text-[#87909b]">
            {sheet.boxes.length} spec{sheet.boxes.length === 1 ? "" : "s"} · {sheet.priced} of {sheet.total} sizes set
          </p>
        </div>
        <div className="pb-2">
          {sheet.boxes.map((box, index) => (
            <SpecBox key={box.key} box={box} pending={pending} dirty={dirty} onType={onType} mobile={mobile} first={index === 0} />
          ))}
        </div>
      </AdminCard>
    </div>
  );
}

export default function AdminPriceTable() {
  const data = useAdminDemoData();
  const [pending, setPending] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [openType, setOpenType] = useState<string | null>(null);

  const sheets = useMemo(() => productSheets(data), [data]);
  const summary = useMemo(() => priceSheetSummary(sheets), [sheets]);
  const boxes = useMemo(() => sheets.flatMap((sheet) => sheet.boxes), [sheets]);
  const visible = useMemo(
    () => sheets.filter((sheet) => matchesSearchQuery(
      `${sheet.type} ${sheet.boxes.map((box) => `${box.product.fabric} ${box.product.gsm ?? ""} ${box.products.map((entry) => entry.name).join(" ")}`).join(" ")}`,
      search,
    )),
    [sheets, search],
  );

  const dirty = useMemo(() => {
    const keys = new Set<string>();
    for (const [key, typed] of Object.entries(pending)) {
      const { boxKey, size } = splitKey(key);
      const box = boxes.find((entry) => entry.key === boxKey);
      if (!box) continue;
      const stored = box.prices.find((row) => row.size === size)?.priceKs ?? null;
      const text = typed.trim();
      if (text === "" ? stored !== null : text !== formatPriceInput(stored)) keys.add(key);
    }
    return keys;
  }, [pending, boxes]);

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
    // A price belongs to the spec box: the typed value is written on every product made to that spec.
    const changes = new Map<string, { size: string; priceKs: number }[]>();
    for (const key of dirty) {
      const { boxKey, size } = splitKey(key);
      const typed = pending[key].trim();
      if (typed === "") continue;
      const parsed = parsePriceInput(typed);
      if (!parsed.ok) continue;
      changes.set(boxKey, [...(changes.get(boxKey) ?? []), { size, priceKs: parsed.value }]);
    }
    if (!changes.size) {
      setPending({});
      setMessage("Nothing new to save — every size already sells at the price you typed.");
      return;
    }
    const at = new Date().toISOString();
    let applied = 0;
    updateAdminData((current) => {
      let next = current;
      for (const [boxKey, edits] of changes) {
        const representative = boxes.find((box) => box.key === boxKey)?.product;
        if (!representative) continue;
        for (const product of boxMembers(next, representative)) {
          const rows = productPriceRows(next, product);
          const forProduct = edits
            .filter((edit) => rows.some((row) => row.size === edit.size))
            .map((edit) => ({
              size: edit.size,
              priceKs: edit.priceKs,
              version: rows.find((row) => row.size === edit.size)?.version ?? 0,
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
      <AdminShell active="price-table" title="Price Table" description="Prices are set here, once per spec, and posting never types one.">
        <AdminEmpty title="No products yet" description="Post a product first; its spec then appears here for pricing." />
      </AdminShell>
    );
  }

  const active = visible.find((sheet) => sheet.type === openType) ?? visible[0] ?? null;

  return (
    <AdminShell
      active="price-table"
      title="Price Table"
      description="Prices are set here, once per spec — never on a product, and never while posting."
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
            title="Prices by product type and spec"
            description={`${summary.priced} of ${summary.total} size prices set across ${sheets.length} type${sheets.length === 1 ? "" : "s"}.`}
            actions={(
              <div className="flex items-center gap-1.5">
                <AdminButton variant="ghost" onClick={discard} disabled={!dirty.size}><RotateCcw size={12} /> Discard</AdminButton>
                <AdminButton onClick={save} disabled={!dirty.size}><Save size={12} /> Save{dirty.size ? ` (${dirty.size})` : ""}</AdminButton>
              </div>
            )}
          />
          <p className="border-b border-[#f0f2f4] bg-[#f7fbf3] px-4 py-2 text-[10px] font-semibold text-[#4a6b33] sm:px-5">
            Inside a T-shirt card each box is one spec — Combed Cotton 180 GSM is priced separately from Cotton 220 GSM,
            and a product made to that spec reads its box. A product is never priced on its own.
            <Link href="/admin/products" className="ml-1 inline-flex items-center gap-0.5 font-bold text-[#3f8c22] hover:underline">
              Products <ArrowRight size={10} />
            </Link>
          </p>
          {message ? <p role="status" data-price-table-message className="px-4 py-2 text-[10px] font-semibold text-[#3f8c22] sm:px-5">{message}</p> : null}
        </AdminCard>

        {/* Phone: one type at a time. */}
        <div className="sm:hidden">
          <div className="flex gap-1.5 overflow-x-auto pb-2" role="group" aria-label="Product type">
            {visible.map((sheet) => {
              const isActive = active?.type === sheet.type;
              return (
                <button
                  key={sheet.type}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setOpenType(sheet.type)}
                  className={`shrink-0 rounded-full border px-2.5 py-1.5 text-[10px] font-bold ${isActive ? "border-[#4cae22] bg-[#eef8e6] text-[#3f8c22]" : "border-[#e4e8ed] bg-white text-[#6c7683]"}`}
                >
                  {sheet.type} <span className="opacity-70">{sheet.priced}/{sheet.total}</span>
                </button>
              );
            })}
          </div>
          {active ? (
            <TypeCard sheet={active} pending={pending} dirty={dirty} onType={type} mobile />
          ) : null}
        </div>

        {/* Tablet and up: every type, one card each. */}
        <div className="hidden gap-3 sm:grid sm:grid-cols-1 xl:grid-cols-2">
          {visible.map((sheet) => (
            <TypeCard key={sheet.type} sheet={sheet} pending={pending} dirty={dirty} onType={type} />
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
