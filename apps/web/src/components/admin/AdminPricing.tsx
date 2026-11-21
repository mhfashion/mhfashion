"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, Check, ChevronDown, Download, History, RotateCcw, Save, Search, Tags, Upload } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import { AdminBadge, AdminButton, AdminCard, AdminCardHeader, AdminEmpty, AdminInput, AdminSelect, AdminStat } from "@/components/admin/AdminUi";
import { getDemoAdminSession } from "@/lib/admin-demo-auth";
import { updateAdminData, useAdminDemoData } from "@/lib/admin-demo-store";
import { formatKs, type AdminDemoData } from "@/lib/admin-demo-data";
import {
  applyPriceChanges, pricingScopes, scopeAttributes, scopeHistory, scopePrices, scopeRows, scopeVersions,
  type PriceChange, type PricingScope, type PricingScopeKind,
} from "@/lib/admin-pricing";
import {
  buildPricingCsv, combinationLabel, combinationSearchText, formatPriceInput, importChanges, parsePriceInput,
  parsePricingCsv, priceState, pricingSummary, type PricingAttribute, type PricingImportRow, type PricingRow,
} from "@/lib/pricing-combinations";

type Filters = Record<string, string[]>;

function firstScope(data: AdminDemoData): PricingScope {
  if (data.tshirtPosts.length) return { kind: "post", id: data.tshirtPosts[0].id };
  if (data.products.length) return { kind: "product", id: data.products[0].id };
  return { kind: "post", id: "" };
}

/** One popover per attribute: every value starts ticked, unticking narrows the table. */
function AttributeFilter({
  attribute, selected, onChange,
}: {
  attribute: PricingAttribute;
  selected: string[] | undefined;
  onChange: (values: string[] | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = selected && selected.length < attribute.options.length ? selected : null;
  const isOn = (option: string) => !active || active.includes(option);
  const count = active ? active.length : attribute.options.length;
  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-label={`Filter by ${attribute.label}`}
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[10px] font-bold transition-colors ${active ? "border-[#4cae22] bg-[#eef8e6] text-[#3f8c22]" : "border-[#e4e8ed] bg-white text-[#6c7683] hover:bg-[#f7f9fb]"}`}
      >
        {attribute.label} <span className="text-[9px] opacity-70">{count}/{attribute.options.length}</span>
        <ChevronDown size={12} />
      </button>
      {open ? (
        <div role="group" aria-label={`${attribute.label} values`} className="absolute left-0 top-9 z-30 w-52 rounded-xl border border-[#e4e8ed] bg-white p-2 shadow-xl">
          {attribute.options.map((option) => (
            <label key={option} className="flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 text-[10px] font-semibold text-[#3c4553] hover:bg-[#f7f9fb]">
              <input
                type="checkbox"
                checked={isOn(option)}
                onChange={() => {
                  const current = active ?? attribute.options;
                  const next = isOn(option) ? current.filter((value) => value !== option) : [...current, option];
                  onChange(next.length === attribute.options.length ? undefined : next);
                }}
              />
              {option}
            </label>
          ))}
          <div className="mt-1 flex justify-between border-t border-[#f0f2f4] pt-1.5">
            <button type="button" onClick={() => onChange(undefined)} className="text-[9px] font-bold text-[#3f8c22]">All</button>
            <button type="button" onClick={() => setOpen(false)} className="text-[9px] font-bold text-[#6c7683]">Close</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AdminPricing() {
  const data = useAdminDemoData();
  const [scope, setScope] = useState<PricingScope>(() => firstScope(data));
  const [filters, setFilters] = useState<Filters>({});
  const [search, setSearch] = useState("");
  const [unpricedOnly, setUnpricedOnly] = useState(false);
  const [pending, setPending] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [anchor, setAnchor] = useState<number | null>(null);
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkMessage, setBulkMessage] = useState("");
  const [message, setMessage] = useState("");
  const [historyKey, setHistoryKey] = useState<string | null>(null);
  const [importRows, setImportRows] = useState<PricingImportRow[] | null>(null);
  const [importIssues, setImportIssues] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const scopes = useMemo(() => pricingScopes(data), [data]);
  const activeScope = scopes.find((entry) => entry.kind === scope.kind && entry.id === scope.id) ? scope : firstScope(data);
  const attributes = useMemo(() => scopeAttributes(data, activeScope), [data, activeScope]);
  const rows = useMemo(() => scopeRows(data, activeScope), [data, activeScope]);
  const prices = useMemo(() => scopePrices(data, activeScope), [data, activeScope]);
  const versions = useMemo(() => scopeVersions(data, activeScope), [data, activeScope]);
  const summary = pricingSummary(rows, prices);
  const history = scopeHistory(data, activeScope);

  const filtered = useMemo(() => rows.filter((row) => {
    if (unpricedOnly && priceState(prices.get(row.key)) === "priced") return false;
    for (const [key, values] of Object.entries(filters)) {
      if (values.length && !values.includes(row.options[key] ?? "")) return false;
    }
    const query = search.trim().toLowerCase();
    return !query || combinationSearchText(attributes, row.options).includes(query);
  }), [rows, filters, search, unpricedOnly, prices, attributes]);

  const dirtyKeys = Object.keys(pending);
  const invalidKeys = dirtyKeys.filter((key) => !parsePriceInput(pending[key]).ok);
  const changedKeys = dirtyKeys.filter((key) => {
    const parsed = parsePriceInput(pending[key]);
    return parsed.ok && parsed.value !== (prices.get(key) ?? 0);
  });

  function resetScope(next: PricingScope) {
    setScope(next);
    setFilters({});
    setSearch("");
    setUnpricedOnly(false);
    setPending({});
    setSelected(new Set());
    setAnchor(null);
    setHistoryKey(null);
    setMessage("");
  }

  function priceText(row: PricingRow) {
    return row.key in pending ? pending[row.key] : formatPriceInput(prices.get(row.key) ?? null);
  }

  function setCell(row: PricingRow, value: string) {
    setPending((current) => {
      const next = { ...current };
      const original = formatPriceInput(prices.get(row.key) ?? null);
      if (value === original) delete next[row.key];
      else next[row.key] = value;
      return next;
    });
  }

  function toggleRow(row: PricingRow, index: number, shift: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (shift && anchor !== null) {
        const [from, to] = anchor < index ? [anchor, index] : [index, anchor];
        filtered.slice(from, to + 1).forEach((entry) => next.add(entry.key));
      } else if (next.has(row.key)) {
        next.delete(row.key);
      } else {
        next.add(row.key);
      }
      return next;
    });
    setAnchor(index);
  }

  function save() {
    if (invalidKeys.length) {
      setMessage(`Fix ${invalidKeys.length} invalid price${invalidKeys.length === 1 ? "" : "s"} before saving.`);
      return;
    }
    const changes: PriceChange[] = changedKeys.map((key) => {
      const row = rows.find((entry) => entry.key === key)!;
      const parsed = parsePriceInput(pending[key]);
      return { key, options: row.options, priceKs: parsed.ok ? parsed.value : 0, expectedVersion: versions.get(key) ?? 1 };
    });
    if (!changes.length) {
      setMessage("Nothing to save.");
      return;
    }
    const actor = getDemoAdminSession()?.name ?? "Admin";
    let applied = 0;
    let conflicts: string[] = [];
    updateAdminData((current) => {
      const result = applyPriceChanges(current, activeScope, changes, actor, new Date().toISOString());
      applied = result.applied;
      conflicts = result.conflicts;
      return result.data;
    });
    setPending((current) => {
      const next = { ...current };
      changes.filter((change) => !conflicts.includes(change.key)).forEach((change) => delete next[change.key]);
      return next;
    });
    setMessage(conflicts.length
      ? `${applied} price${applied === 1 ? "" : "s"} saved. ${conflicts.length} row${conflicts.length === 1 ? " was" : "s were"} changed by someone else — reload before saving those.`
      : `${applied} price${applied === 1 ? "" : "s"} saved.`);
  }

  function discard() {
    setPending({});
    setMessage("Unsaved changes discarded.");
  }

  function applyBulk(kind: "set" | "copy") {
    if (!selected.size) return;
    let value: number | null = null;
    if (kind === "set") {
      const parsed = parsePriceInput(bulkPrice);
      if (!parsed.ok) {
        setBulkMessage(parsed.error);
        return;
      }
      value = parsed.value;
    } else {
      const source = filtered.find((row) => selected.has(row.key));
      const parsed = parsePriceInput(source ? priceText(source) : "");
      if (!parsed.ok) {
        setBulkMessage("Pick a row that already has a price to copy from.");
        return;
      }
      value = parsed.value;
    }
    setPending((current) => {
      const next = { ...current };
      filtered.filter((row) => selected.has(row.key)).forEach((row) => {
        const original = formatPriceInput(prices.get(row.key) ?? null);
        const text = formatPriceInput(value);
        if (text === original) delete next[row.key];
        else next[row.key] = text;
      });
      return next;
    });
    setBulkMessage(`${selected.size} row${selected.size === 1 ? "" : "s"} will change — save to apply.`);
    setBulkPrice("");
  }

  function exportCsv(all: boolean) {
    const csv = buildPricingCsv(attributes, all ? rows : filtered, prices);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mhfashion-prices-${activeScope.kind}-${activeScope.id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function readImport(file: File | null) {
    if (!file) return;
    const text = await file.text();
    const result = parsePricingCsv(text, attributes, rows, prices);
    setImportRows(result.rows);
    setImportIssues(result.issues);
    setMessage("");
  }

  function confirmImport() {
    if (!importRows) return;
    const changes = importChanges(importRows).map((row) => ({
      key: row.key!,
      options: row.options,
      priceKs: row.priceKs!,
      expectedVersion: versions.get(row.key!) ?? 1,
    }));
    if (!changes.length) {
      setMessage("The file changes nothing.");
      setImportRows(null);
      return;
    }
    const actor = getDemoAdminSession()?.name ?? "Admin";
    let applied = 0;
    let conflicts: string[] = [];
    updateAdminData((current) => {
      const result = applyPriceChanges(current, activeScope, changes, actor, new Date().toISOString());
      applied = result.applied;
      conflicts = result.conflicts;
      return result.data;
    });
    setImportRows(null);
    setMessage(`${applied} price${applied === 1 ? "" : "s"} imported${conflicts.length ? `, ${conflicts.length} skipped (changed elsewhere)` : ""}.`);
  }

  const rowHistory = historyKey
    ? history.filter((entry) => Object.entries(entry.options).every(([key, value]) => rows.find((row) => row.key === historyKey)?.options[key] === value))
    : [];

  return (
    <AdminShell
      active="pricing"
      title="Pricing"
      description="One price per full valid combination. A combination with no price is not sold."
      search={(
        <label className="flex h-10 w-full max-w-[420px] items-center gap-2.5 rounded-full border border-[#e6e9ed] bg-[#f8f9fb] px-3.5 text-[#8c95a1] focus-within:border-[#a5d972] focus-within:bg-white">
          <Search size={16} className="shrink-0" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search combinations" placeholder="Search size, colour, fabric..." className="min-w-0 flex-1 bg-transparent text-[11px] text-[#252c37] outline-none placeholder:text-[#9da5af]" />
        </label>
      )}
    >
      <section aria-label="Pricing metrics" className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-3">
        <AdminStat label="Valid combinations" value={String(summary.total)} hint="Every row the cascade allows" icon={<Tags size={21} />} />
        <AdminStat label="Priced" value={String(summary.priced)} hint="Sellable on the storefront" icon={<Check size={21} />} />
        <AdminStat label="Unpriced" value={String(summary.unpriced)} hint="Shown to shoppers as not sold" icon={<ArrowLeftRight size={21} />} />
      </section>

      <AdminCard className="mt-3">
        <div className="flex flex-wrap items-end gap-2 border-b border-[#f0f2f4] px-4 py-3 sm:px-5">
          <label className="min-w-[240px] flex-1">
            <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-[#828c99]">Scope</span>
            <AdminSelect
              aria-label="Pricing scope"
              value={`${activeScope.kind}:${activeScope.id}`}
              onChange={(event) => {
                const [kind, ...rest] = event.target.value.split(":");
                resetScope({ kind: kind as PricingScopeKind, id: rest.join(":") });
              }}
            >
              <optgroup label="T-shirt posts">
                {scopes.filter((entry) => entry.kind === "post").map((entry) => (
                  <option key={`post:${entry.id}`} value={`post:${entry.id}`}>{entry.label} · {entry.combinationCount} combinations</option>
                ))}
              </optgroup>
              <optgroup label="Products">
                {scopes.filter((entry) => entry.kind === "product").map((entry) => (
                  <option key={`product:${entry.id}`} value={`product:${entry.id}`}>{entry.label} · {entry.combinationCount} sizes</option>
                ))}
              </optgroup>
            </AdminSelect>
          </label>
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Attribute filters">
            {attributes.map((attribute) => (
              <AttributeFilter
                key={attribute.key}
                attribute={attribute}
                selected={filters[attribute.key]}
                onChange={(values) => setFilters((current) => {
                  const next = { ...current };
                  if (!values) delete next[attribute.key];
                  else next[attribute.key] = values;
                  return next;
                })}
              />
            ))}
            <button
              type="button"
              aria-pressed={unpricedOnly}
              onClick={() => setUnpricedOnly((value) => !value)}
              className={`inline-flex h-8 items-center rounded-full border px-2.5 text-[10px] font-bold transition-colors ${unpricedOnly ? "border-[#d9a300] bg-[#fff7e0] text-[#8a6a00]" : "border-[#e4e8ed] bg-white text-[#6c7683] hover:bg-[#f7f9fb]"}`}
            >
              Unpriced only
            </button>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <span data-pricing-filtered-count className="text-[10px] font-bold text-[#6c7683]">{filtered.length} of {rows.length} rows</span>
            <AdminButton compact variant="secondary" onClick={() => exportCsv(false)} aria-label="Export filtered rows as CSV"><Download size={12} /> Export</AdminButton>
            <AdminButton compact variant="secondary" onClick={() => fileRef.current?.click()} aria-label="Import a price CSV"><Upload size={12} /> Import</AdminButton>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" aria-label="Price CSV file" onChange={(event) => { void readImport(event.target.files?.[0] ?? null); event.target.value = ""; }} />
          </div>
        </div>

        {selected.size ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-[#f0f2f4] bg-[#f6fbf1] px-4 py-2 sm:px-5">
            <span className="text-[10px] font-bold text-[#3f8c22]">{selected.size} selected</span>
            <AdminInput value={bulkPrice} onChange={(event) => setBulkPrice(event.target.value)} inputMode="numeric" placeholder="Ks 24,000" aria-label="Bulk exact price" className="h-8 w-32" />
            <AdminButton compact variant="secondary" onClick={() => applyBulk("set")} aria-label="Set exact price on selected rows">Set exact price</AdminButton>
            <AdminButton compact variant="secondary" onClick={() => applyBulk("copy")} aria-label="Copy price from the first selected row"><ArrowLeftRight size={12} /> Copy from first row</AdminButton>
            <AdminButton compact variant="ghost" onClick={() => setSelected(new Set())}>Clear</AdminButton>
            {bulkMessage ? <span className="text-[10px] font-semibold text-[#6c7683]">{bulkMessage}</span> : null}
          </div>
        ) : null}

        {rows.length === 0 ? (
          <AdminEmpty title="This scope has no valid combinations" description="Enable attributes on the post, or add sizes to the product." />
        ) : (
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-[10px]">
              <thead className="sticky top-0 z-10 bg-[#fafbfc] text-[9px] font-semibold text-[#828c99]">
                <tr>
                  <th className="sticky left-0 z-20 bg-[#fafbfc] px-3 py-2.5">
                    <input
                      type="checkbox"
                      aria-label="Select all filtered rows"
                      checked={filtered.length > 0 && filtered.every((row) => selected.has(row.key))}
                      onChange={(event) => setSelected(event.target.checked ? new Set(filtered.map((row) => row.key)) : new Set())}
                    />
                  </th>
                  {attributes.map((attribute) => (
                    <th key={attribute.key} className="whitespace-nowrap px-3 py-2.5 font-semibold">{attribute.label}</th>
                  ))}
                  <th className="px-3 py-2.5 font-semibold">Price (Ks)</th>
                  <th className="px-3 py-2.5 text-right font-semibold">History</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f2f4]">
                {filtered.length ? filtered.map((row, index) => {
                  const text = priceText(row);
                  const parsed = parsePriceInput(text);
                  const stored = prices.get(row.key);
                  const isDirty = row.key in pending;
                  return (
                    <tr key={row.key} className={isDirty ? "bg-[#fffdf3]" : "hover:bg-[#fafbfc]"}>
                      <td className="sticky left-0 bg-white px-3 py-1.5">
                        <input
                          type="checkbox"
                          aria-label={`Select ${combinationLabel(attributes, row.options)}`}
                          checked={selected.has(row.key)}
                          onChange={() => toggleRow(row, index, false)}
                          onClick={(event) => { if (event.shiftKey) toggleRow(row, index, true); }}
                        />
                      </td>
                      {attributes.map((attribute) => (
                        <td key={attribute.key} className="whitespace-nowrap px-3 py-1.5 text-[#4b5563]">{row.options[attribute.key] ?? "—"}</td>
                      ))}
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <input
                            value={text}
                            inputMode="numeric"
                            aria-label={`Price for ${combinationLabel(attributes, row.options)}`}
                            aria-invalid={text.trim() !== "" && !parsed.ok}
                            onChange={(event) => setCell(row, event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Escape") {
                                event.preventDefault();
                                setCell(row, formatPriceInput(stored ?? null));
                                setMessage("Edit cancelled.");
                              }
                              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                                event.preventDefault();
                                const next = filtered[index + (event.key === "ArrowDown" ? 1 : -1)];
                                if (!next) return;
                                const target = document.querySelector<HTMLInputElement>(`[data-price-row="${next.key}"]`);
                                target?.focus();
                                target?.select();
                              }
                            }}
                            data-price-row={row.key}
                            className={`h-8 w-28 rounded-lg border bg-white px-2 text-[10px] font-semibold tabular-nums text-[#252c37] outline-none focus:border-[#a5d972] ${text.trim() !== "" && !parsed.ok ? "border-[#e6a5a5] bg-[#fdf3f3] text-[#a33]" : "border-[#e2e7ec]"}`}
                          />
                          {stored ? <span className="text-[9px] text-[#98a1ac]">{formatKs(stored)}</span> : <AdminBadge tone="amber">Unpriced</AdminBadge>}
                        </div>
                        {text.trim() !== "" && !parsed.ok ? <span className="mt-0.5 block text-[9px] font-semibold text-[#a33]">{parsed.error}</span> : null}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <button
                          type="button"
                          aria-label={`Price history for ${combinationLabel(attributes, row.options)}`}
                          onClick={() => setHistoryKey(historyKey === row.key ? null : row.key)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#e4e8ed] text-[#6c7683] hover:bg-[#f7f9fb]"
                        >
                          <History size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                }) : <tr><td colSpan={attributes.length + 3}><AdminEmpty title="No combination matches these filters" description="Clear a filter or the search box." /></td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {historyKey ? (
          <div className="border-t border-[#f0f2f4] bg-[#fafbfc] px-4 py-3 sm:px-5">
            <div className="mb-1.5 flex items-center justify-between">
              <h3 className="text-[10px] font-bold text-[#3c4553]">Price history</h3>
              <button type="button" onClick={() => setHistoryKey(null)} className="text-[9px] font-bold text-[#6c7683]">Close</button>
            </div>
            {rowHistory.length ? (
              <ul className="space-y-1">
                {rowHistory.map((entry) => (
                  <li key={entry.id} className="flex flex-wrap items-center gap-2 text-[10px] text-[#6c7683]">
                    <span className="font-bold text-[#3c4553]">{entry.oldPriceKs ? formatKs(entry.oldPriceKs) : "Unpriced"} → {formatKs(entry.newPriceKs)}</span>
                    <span>{entry.actor}</span>
                    <span>{new Date(entry.at).toLocaleString("en-GB", { timeZone: "Asia/Yangon" })}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-[10px] text-[#98a1ac]">No changes recorded for this row yet.</p>}
          </div>
        ) : null}

        {dirtyKeys.length ? (
          <div className="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-[#e8d9a8] bg-[#fff8e6] px-4 py-2.5 sm:px-5">
            <span data-pricing-dirty-count className="text-[10px] font-bold text-[#8a6a00]">
              {dirtyKeys.length} unsaved change{dirtyKeys.length === 1 ? "" : "s"}{invalidKeys.length ? ` · ${invalidKeys.length} invalid` : ""}
            </span>
            <div className="ml-auto flex gap-1.5">
              <AdminButton compact variant="ghost" onClick={discard}><RotateCcw size={12} /> Discard</AdminButton>
              <AdminButton compact onClick={save} disabled={!changedKeys.length}><Save size={12} /> Save all</AdminButton>
            </div>
          </div>
        ) : null}
      </AdminCard>

      {message ? <p data-pricing-message role="status" className="mt-2 text-[10px] font-semibold text-[#3f8c22]">{message}</p> : null}

      {importRows ? (
        <AdminCard className="mt-3">
          <AdminCardHeader title="CSV import preview" description="Nothing is written until you confirm." />
          <div className="px-4 pb-3 sm:px-5">
            <ul className="mb-2 space-y-1 text-[10px] text-[#6c7683]">
              {(["new", "change", "same", "invalid"] as const).map((status) => {
                const count = importRows.filter((row) => row.status === status).length;
                return count ? <li key={status}><span className="font-bold text-[#3c4553]">{count}</span> {status === "same" ? "unchanged" : status}</li> : null;
              })}
            </ul>
            {importIssues.map((issue) => <p key={issue} className="text-[10px] font-semibold text-[#a33]">{issue}</p>)}
            <div className="max-h-52 overflow-auto rounded-lg border border-[#f0f2f4]">
              <table className="w-full min-w-[520px] text-left text-[10px]">
                <thead className="bg-[#fafbfc] text-[9px] text-[#828c99]">
                  <tr><th className="px-2 py-1.5">Line</th><th className="px-2 py-1.5">Combination</th><th className="px-2 py-1.5">Price</th><th className="px-2 py-1.5">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-[#f0f2f4]">
                  {importRows.map((row) => (
                    <tr key={`${row.line}-${row.status}`}>
                      <td className="px-2 py-1.5 tabular-nums text-[#98a1ac]">{row.line}</td>
                      <td className="px-2 py-1.5 text-[#4b5563]">{combinationLabel(attributes, row.options)}</td>
                      <td className="px-2 py-1.5 tabular-nums">{row.priceKs ? formatKs(row.priceKs) : "—"}</td>
                      <td className="px-2 py-1.5">{row.reason ? <span className="font-semibold text-[#a33]">{row.reason}</span> : <AdminBadge tone={row.status === "invalid" ? "red" : row.status === "same" ? "slate" : "green"}>{row.status}</AdminBadge>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 flex gap-1.5">
              <AdminButton compact onClick={confirmImport}><Check size={12} /> Apply {importChanges(importRows).length} row{importChanges(importRows).length === 1 ? "" : "s"}</AdminButton>
              <AdminButton compact variant="ghost" onClick={() => setImportRows(null)}>Cancel</AdminButton>
            </div>
          </div>
        </AdminCard>
      ) : null}

      <p className="mt-3 text-[10px] text-[#98a1ac]">
        Combinations come from the attributes enabled on the post. Attribute Management (Plan §16 P2) will let the Super Admin edit the chain itself — until then, edit the post to change its attributes.
      </p>
      <Link href="/admin/posts" className="mt-1 inline-block text-[10px] font-bold text-[#3f8c22]">Open Posts</Link>
    </AdminShell>
  );
}
