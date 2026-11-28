"use client";

// Pricing Management (owner spec 2026-11-21). One screen with the spec's navigation — Overview,
// Product Pricing, Price Table, Price History, Attribute Management — over the dynamic variant model
// in `lib/pricing-variants.ts`: every specification combination (size included) is a variant with its
// own manual price, and switching an attribute on for a product adds rows and columns without a
// schema change.

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown, ArrowUp, Check, CopyPlus, Download, Grid3x3, Plus, RotateCcw, Save, Search,
  Table2, Trash2, X,
} from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import { AdminButton, AdminCard, AdminCardHeader, AdminEmpty, AdminInput, AdminSelect, AdminStat } from "@/components/admin/AdminUi";
import { getDemoAdminSession } from "@/lib/admin-demo-auth";
import { updateAdminData, useAdminDemoData } from "@/lib/admin-demo-store";
import { formatKs, type AdminProductCategory } from "@/lib/admin-demo-data";
import { applyChainPatch, attributeChain, moveAttribute } from "@/lib/admin-attributes";
import { formatPriceInput, parsePriceInput } from "@/lib/pricing-combinations";
import {
  buildVariantCsv, matrixRows, pricingAttributes, pricingHistory, pricingOverview, productAttributeKeys,
  productPricingAttributes, saveVariantChanges, setProductAttributes, setProductSizes, specificationGroups,
  variantColumns, variantRows, variantSearchText, type VariantRow,
} from "@/lib/pricing-variants";
import { matchesSearchQuery } from "@/lib/search-text";

type Tab = "overview" | "product" | "table" | "history" | "attributes";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "product", label: "Product Pricing" },
  { id: "table", label: "Price Table" },
  { id: "history", label: "Price History" },
  { id: "attributes", label: "Attribute Management" },
];

const PAGE_SIZE = 25;

const statusTone = (row: VariantRow) => {
  if (row.priceKs === null) return { label: "Incomplete", className: "bg-[#fff4e0] text-[#8a6a00]" };
  if (row.status === "Disabled") return { label: "Disabled", className: "bg-[#f1f3f5] text-[#6c7683]" };
  return { label: "Active", className: "bg-[#eef8e6] text-[#3f8c22]" };
};

export default function AdminPricingManagement() {
  const data = useAdminDemoData();
  const [tab, setTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | AdminProductCategory>("all");
  const [status, setStatus] = useState<"all" | "Active" | "Draft">("all");
  const [productId, setProductId] = useState<string | null>(data.products[0]?.id ?? null);
  const [view, setView] = useState<"table" | "matrix">("table");
  const [pending, setPending] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [message, setMessage] = useState("");
  const [matrixKey, setMatrixKey] = useState<string | null>(null);
  const [bulkPrice, setBulkPrice] = useState("");
  const [newSize, setNewSize] = useState("");
  const [newOption, setNewOption] = useState<Record<string, string>>({});
  const [newAttribute, setNewAttribute] = useState({ label: "", options: "" });

  const products = useMemo(() => data.products.filter((product) => {
    if (category !== "all" && product.category !== category) return false;
    if (status !== "all" && product.status !== status) return false;
    return matchesSearchQuery(`${product.name} ${product.category} ${product.fabric} ${product.designName}`, search);
  }), [data.products, category, status, search]);

  const product = data.products.find((entry) => entry.id === productId) ?? products[0] ?? null;
  const attributes = useMemo(() => (product ? productPricingAttributes(data, product) : []), [data, product]);
  const rows = useMemo(() => (product ? variantRows(data, product) : []), [data, product]);
  const columns = variantColumns(attributes);
  const overview = useMemo(() => pricingOverview(data), [data]);
  const history = useMemo(() => pricingHistory(data, { search }), [data, search]);
  const groups = useMemo(() => (product ? specificationGroups(data, product) : []), [data, product]);
  const matrixSpec = groups.find((group) => group.key === matrixKey) ?? groups[0] ?? null;
  const matrix = useMemo(
    () => (product && matrixSpec ? matrixRows(data, product, matrixSpec.options) : []),
    [data, product, matrixSpec],
  );

  const filteredRows = rows.filter((row) => {
    if (status !== "all" && product?.status !== status) return false;
    return matchesSearchQuery(variantSearchText(attributes, row), search);
  });
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const paged = filteredRows.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const dirty = Object.keys(pending);
  const invalid = dirty.filter((key) => !parsePriceInput(pending[key]).ok);

  function priceText(row: VariantRow) {
    return row.key in pending ? pending[row.key] : formatPriceInput(row.priceKs);
  }

  function editPrice(row: VariantRow, value: string) {
    setPending((current) => {
      const next = { ...current };
      if (value === formatPriceInput(row.priceKs)) delete next[row.key];
      else next[row.key] = value;
      return next;
    });
  }

  function actor() {
    return getDemoAdminSession()?.name ?? "Admin";
  }

  function savePrices(source: VariantRow[]) {
    if (invalid.length) {
      setMessage(`${invalid.length} price${invalid.length === 1 ? "" : "s"} need fixing before saving.`);
      return;
    }
    const changes = source
      .filter((row) => row.key in pending)
      .map((row) => {
        const parsed = parsePriceInput(pending[row.key]);
        return {
          options: row.options,
          size: row.size,
          priceKs: parsed.ok ? parsed.value : null,
          expectedVersion: row.version,
        };
      })
      .filter((change) => change.priceKs !== null);
    if (!changes.length) {
      setMessage("Nothing new to save.");
      return;
    }
    if (!product) return;
    let applied = 0;
    let conflicts = 0;
    updateAdminData((current) => {
      const result = saveVariantChanges(current, product.id, changes, actor(), new Date().toISOString());
      applied = result.applied;
      conflicts = result.conflicts.length;
      return result.data;
    });
    setPending({});
    setMessage(conflicts
      ? `${applied} price${applied === 1 ? "" : "s"} saved. ${conflicts} row${conflicts === 1 ? " was" : "s were"} changed by someone else — reload before saving those.`
      : `${applied} price${applied === 1 ? "" : "s"} saved.`);
  }

  function setStatuses(targets: VariantRow[], next: "Active" | "Disabled") {
    if (!product || !targets.length) return;
    updateAdminData((current) => saveVariantChanges(
      current,
      product.id,
      targets.map((row) => ({ options: row.options, size: row.size, priceKs: null, status: next, expectedVersion: row.version })),
      actor(),
      new Date().toISOString(),
    ).data);
    setMessage(`${targets.length} variant${targets.length === 1 ? "" : "s"} ${next === "Active" ? "enabled" : "disabled"}.`);
  }

  function duplicateVariant(row: VariantRow) {
    if (!product) return;
    const target = attributes
      .filter((attribute) => attribute.key !== "size")
      .flatMap((attribute) => attribute.options.map((option) => ({ attribute, option })))
      .find(({ attribute, option }) => row.options[attribute.key] !== option && attribute.options.length > 1);
    if (!target || row.priceKs === null) {
      setMessage("There is no other option to duplicate this variant onto.");
      return;
    }
    const options = { ...row.options, [target.attribute.key]: target.option };
    updateAdminData((current) => saveVariantChanges(
      current,
      product.id,
      [{ options, size: row.size, priceKs: row.priceKs, expectedVersion: 0 }],
      actor(),
      new Date().toISOString(),
    ).data);
    setMessage(`Copied ${formatKs(row.priceKs)} onto ${target.attribute.label} ${target.option}.`);
  }

  function deleteVariant(row: VariantRow) {
    if (!product) return;
    if (!window.confirm(`Remove the ${row.size} variant from ${product.name}? Its price history stays.`)) return;
    updateAdminData((current) => ({
      ...current,
      productPrices: current.productPrices.filter((entry) => !(entry.productId === product.id && entry.size === row.size && JSON.stringify(entry.options ?? {}) === JSON.stringify(row.options))),
    }));
    setMessage("Variant removed. Its price history stays.");
  }

  function toggleAttribute(key: string, on: boolean) {
    if (!product) return;
    const keys = productAttributeKeys(data, product);
    const next = on ? [...keys, key] : keys.filter((entry) => entry !== key);
    updateAdminData((current) => setProductAttributes(current, product.id, next));
    setPending({});
    setMessage(on ? `${key} added to ${product.name} — new variants start Incomplete.` : `${key} removed from ${product.name}.`);
  }

  function addSize() {
    if (!product) return;
    const size = newSize.trim();
    if (!size || product.sizes.includes(size)) {
      setMessage("Enter a size the product does not stock yet.");
      return;
    }
    updateAdminData((current) => setProductSizes(current, product.id, [...product.sizes, size]));
    setNewSize("");
    setMessage(`Size ${size} added — price it in the matrix.`);
  }

  function removeSize(size: string) {
    if (!product) return;
    if (!window.confirm(`Remove size ${size} from ${product.name}?`)) return;
    updateAdminData((current) => setProductSizes(current, product.id, product.sizes.filter((entry) => entry !== size)));
    setMessage(`Size ${size} removed.`);
  }

  function copyToSizes() {
    const parsed = parsePriceInput(bulkPrice);
    if (!parsed.ok) {
      setMessage(parsed.error);
      return;
    }
    setPending((current) => {
      const next = { ...current };
      for (const row of matrix) next[row.key] = formatPriceInput(parsed.value);
      return next;
    });
    setMessage(`${matrix.length} size${matrix.length === 1 ? "" : "s"} staged at ${formatKs(parsed.value)} — save to apply.`);
  }

  function exportCsv() {
    const csv = buildVariantCsv(attributes, filteredRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mhfashion-variants-${product?.id ?? "all"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function patchAttribute(key: string, patch: { label?: string; options?: string[]; enabled?: boolean }) {
    let issues: string[] = [];
    updateAdminData((current) => {
      const result = applyChainPatch(current, key as never, patch);
      issues = result.issues;
      return result.data;
    });
    setMessage(issues.length ? issues.join(" ") : "Attribute updated.");
  }

  function addOption(key: string) {
    const value = (newOption[key] ?? "").trim();
    if (!value) return;
    const attribute = attributeChain(data).find((entry) => entry.key === key);
    if (!attribute) return;
    if (attribute.options.includes(value)) {
      setMessage(`"${value}" is already an option.`);
      return;
    }
    patchAttribute(key, { options: [...attribute.options, value] });
    setNewOption((current) => ({ ...current, [key]: "" }));
  }

  function removeOption(key: string, option: string) {
    const attribute = attributeChain(data).find((entry) => entry.key === key);
    if (!attribute) return;
    patchAttribute(key, { options: attribute.options.filter((entry) => entry !== option) });
  }

  function addAttribute() {
    const label = newAttribute.label.trim();
    const options = newAttribute.options.split(",").map((entry) => entry.trim()).filter(Boolean);
    if (!label || !options.length) {
      setMessage("Give the attribute a label and at least one option.");
      return;
    }
    const key = `custom-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || Date.now()}`;
    updateAdminData((current) => ({
      ...current,
      attributeChain: [...attributeChain(current), { key: key as never, label, options, enabled: true }],
    }));
    setNewAttribute({ label: "", options: "" });
    setMessage(`"${label}" added — switch it on for a product in Product Pricing.`);
  }

  if (!data.products.length) {
    return (
      <AdminShell active="pricing" title="Pricing Management" description="Price every variant in one place.">
        <AdminEmpty title="No products yet" description="Post a product first; its pricing appears here." />
      </AdminShell>
    );
  }

  return (
    <AdminShell
      active="pricing"
      title="Pricing Management"
      description="Manual pricing for every product: each specification combination is a variant with its own price."
      search={(
        <label className="flex h-10 w-full max-w-[420px] items-center gap-2.5 rounded-full border border-[#e6e9ed] bg-[#f8f9fb] px-3.5 text-[#8c95a1] focus-within:border-[#a5d972] focus-within:bg-white">
          <Search size={16} className="shrink-0" />
          <input
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(0); }}
            aria-label="Search products and prices"
            placeholder="Search product, spec or price..."
            className="min-w-0 flex-1 bg-transparent text-[11px] text-[#252c37] outline-none placeholder:text-[#9da5af]"
          />
        </label>
      )}
    >
      <div className="space-y-3">
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-[#eaedf1] bg-white p-1" role="tablist" aria-label="Pricing management">
          {TABS.map((entry) => {
            const active = tab === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={active}
                data-pricing-tab={entry.id}
                onClick={() => { setTab(entry.id); setMessage(""); }}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors ${active ? "bg-[#eef8e6] text-[#3f8c22]" : "text-[#6c7683] hover:bg-[#f7f9fb]"}`}
              >
                {entry.label}
              </button>
            );
          })}
        </div>

        {message ? <p role="status" data-pricing-message className="rounded-lg bg-[#f7fbf3] px-3 py-2 text-[10px] font-semibold text-[#4a6b33]">{message}</p> : null}

        {tab === "overview" ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <AdminStat label="Products" value={`${overview.productsPriced}/${overview.products}`} hint="priced / total" />
              <AdminStat label="Variants" value={String(overview.variants)} hint="spec + size rows" />
              <AdminStat label="Priced" value={String(overview.priced)} hint="ready to sell" />
              <AdminStat label="Incomplete" value={String(overview.incomplete)} hint="no price yet" />
            </div>
            <AdminCard className="overflow-hidden">
              <AdminCardHeader title="Recent price changes" description="Newest first — every save is recorded." />
              {overview.recent.length ? (
                <ul className="divide-y divide-[#f0f2f4]">
                  {overview.recent.map((entry) => (
                    <li key={entry.id} className="flex items-center justify-between gap-3 px-4 py-2 text-[10px] sm:px-5">
                      <span className="min-w-0 truncate font-bold text-[#333c49]">
                        {data.products.find((item) => item.id === entry.scopeId)?.name ?? entry.scopeId}
                        <span className="ml-1 font-semibold text-[#87909b]">
                          {Object.values(entry.options ?? {}).join(" · ")}
                        </span>
                      </span>
                      <span className="shrink-0 tabular-nums text-[#6c7683]">
                        {entry.oldPriceKs === null ? "—" : formatKs(entry.oldPriceKs)} → <span className="font-bold text-[#3f8c22]">{formatKs(entry.newPriceKs)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : <p className="px-4 py-6 text-center text-[10px] text-[#87909b] sm:px-5">No price changes yet.</p>}
            </AdminCard>
          </div>
        ) : null}

        {tab === "product" ? (
          <div className="space-y-3">
            <AdminCard className="overflow-hidden">
              <div className="flex flex-wrap items-center gap-1.5 px-4 py-2.5 sm:px-5">
                <AdminSelect aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value as typeof category)} className="!h-8 !w-[9.5rem] shrink-0 text-[10px]">
                  <option value="all">All categories</option>
                  {[...new Set(data.products.map((entry) => entry.category))].map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </AdminSelect>
                <AdminSelect aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="!h-8 !w-[8.5rem] shrink-0 text-[10px]">
                  <option value="all">All statuses</option>
                  <option value="Active">Active</option>
                  <option value="Draft">Draft</option>
                </AdminSelect>
                <span className="text-[10px] font-semibold text-[#87909b]">{products.length} products</span>
                <div className="ml-auto flex items-center gap-1.5">
                  <div className="flex rounded-lg border border-[#eaedf1] p-0.5" role="group" aria-label="Pricing view">
                    {([["table", "Table", Table2], ["matrix", "Matrix", Grid3x3]] as const).map(([id, label, Icon]) => (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={view === id}
                        onClick={() => { setView(id); setPending({}); }}
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold ${view === id ? "bg-[#eef8e6] text-[#3f8c22]" : "text-[#6c7683]"}`}
                      >
                        <Icon size={12} /> {label}
                      </button>
                    ))}
                  </div>
                  <AdminButton variant="ghost" className="shrink-0 whitespace-nowrap" onClick={exportCsv}><Download size={12} /> CSV</AdminButton>
                  <AdminButton
                    className="shrink-0 whitespace-nowrap"
                    data-pricing-add
                    onClick={() => {
                      setTab("product");
                      const unpriced = data.products.find((entry) => !data.productPrices.some((row) => row.productId === entry.id));
                      setProductId((unpriced ?? data.products[0]).id);
                      setView("table");
                      setMessage("Pick the specifications to price this product by, then set every variant's price.");
                    }}
                  >
                    <Plus size={12} /> Add product pricing
                  </AdminButton>
                </div>
              </div>
              <div className="flex gap-1.5 overflow-x-auto border-t border-[#f0f2f4] px-4 py-2 sm:px-5">
                {products.map((entry) => {
                  const priced = data.productPrices.filter((row) => row.productId === entry.id).length;
                  const active = product?.id === entry.id;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      aria-pressed={active}
                      data-pricing-product={entry.id}
                      onClick={() => { setProductId(entry.id); setPending({}); setSelected(new Set()); setPage(0); setMatrixKey(null); }}
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${active ? "border-[#4cae22] bg-[#eef8e6] text-[#3f8c22]" : "border-[#e4e8ed] bg-white text-[#6c7683]"}`}
                    >
                      {entry.name} <span className="opacity-70">{priced}</span>
                    </button>
                  );
                })}
              </div>
            </AdminCard>

            {product ? (
              <AdminCard className="overflow-hidden">
                <AdminCardHeader
                  title={product.name}
                  description={`${product.category} · ${attributes.map((attribute) => attribute.label).join(" → ")}`}
                  actions={(
                    <div className="flex items-center gap-1.5">
                      <AdminButton variant="ghost" onClick={() => setPending({})} disabled={!dirty.length}><RotateCcw size={12} /> Discard</AdminButton>
                      <AdminButton onClick={() => savePrices(view === "matrix" ? matrix : filteredRows)} disabled={!dirty.length}>
                        <Save size={12} /> Save{dirty.length ? ` (${dirty.length})` : ""}
                      </AdminButton>
                    </div>
                  )}
                />
                <div className="flex flex-wrap items-center gap-1.5 border-b border-[#f0f2f4] px-4 py-2 sm:px-5">
                  <span className="text-[9px] font-bold uppercase tracking-wide text-[#a4acb6]">Specifications</span>
                  {pricingAttributes(data).map((attribute) => {
                    const on = productAttributeKeys(data, product).includes(attribute.key);
                    return (
                      <label key={attribute.key} className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-bold ${on ? "border-[#4cae22] bg-[#eef8e6] text-[#3f8c22]" : "border-[#e4e8ed] bg-white text-[#6c7683]"}`}>
                        <input
                          type="checkbox"
                          className="h-3 w-3"
                          checked={on}
                          disabled={attribute.key === "size"}
                          data-pricing-attribute={attribute.key}
                          onChange={(event) => toggleAttribute(attribute.key, event.target.checked)}
                        />
                        {attribute.label}
                      </label>
                    );
                  })}
                </div>

                {view === "table" ? (
                  <div data-pricing-table-view className="overflow-x-auto">
                    <table className="w-full min-w-[720px] border-collapse text-[10px]">
                      <thead className="sticky top-0 bg-[#f8f9fb] text-[9px] uppercase tracking-wide text-[#87909b]">
                        <tr>
                          <th className="w-8 px-2 py-2 text-left"> </th>
                          {columns.map((column) => <th key={column.key} className="px-2 py-2 text-left font-bold">{column.label}</th>)}
                          <th className="px-2 py-2 text-left font-bold">Price</th>
                          <th className="px-2 py-2 text-left font-bold">Status</th>
                          <th className="px-2 py-2 text-right font-bold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paged.map((row) => {
                          const tone = statusTone(row);
                          const isSelected = selected.has(row.key);
                          return (
                            <tr key={row.key} data-pricing-variant-row={row.key} className="border-t border-[#f2f4f6]">
                              <td className="px-2 py-1.5">
                                <input
                                  type="checkbox"
                                  aria-label={`Select ${row.key}`}
                                  checked={isSelected}
                                  onChange={() => setSelected((current) => {
                                    const next = new Set(current);
                                    if (next.has(row.key)) next.delete(row.key);
                                    else next.add(row.key);
                                    return next;
                                  })}
                                />
                              </td>
                              {columns.map((column) => (
                                <td key={column.key} className="px-2 py-1.5 font-semibold text-[#3c4553]">{row.options[column.key] ?? "—"}</td>
                              ))}
                              <td className="px-2 py-1.5">
                                <input
                                  aria-label={`Price ${row.key}`}
                                  data-pricing-price={row.key}
                                  inputMode="numeric"
                                  placeholder="—"
                                  value={priceText(row)}
                                  onChange={(event) => editPrice(row, event.target.value)}
                                  className="h-8 w-24 rounded-md border border-[#e6e9ed] bg-white px-2 text-right text-[10px] font-bold tabular-nums outline-none focus:border-[#a5d972]"
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${tone.className}`}>{tone.label}</span>
                              </td>
                              <td className="px-2 py-1.5 text-right">
                                <button type="button" aria-label={`Duplicate ${row.key}`} onClick={() => duplicateVariant(row)} className="rounded p-1 text-[#6c7683] hover:bg-[#f3f5f7]"><CopyPlus size={12} /></button>
                                <button type="button" aria-label={`${row.status === "Disabled" ? "Enable" : "Disable"} ${row.key}`} onClick={() => setStatuses([row], row.status === "Disabled" ? "Active" : "Disabled")} className="rounded p-1 text-[#6c7683] hover:bg-[#f3f5f7]"><Check size={12} /></button>
                                <button type="button" aria-label={`Delete ${row.key}`} onClick={() => deleteVariant(row)} className="rounded p-1 text-[#b4463c] hover:bg-[#fdf1f1]"><Trash2 size={12} /></button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {!filteredRows.length ? <p className="px-4 py-6 text-center text-[10px] text-[#87909b]">No variant matches the filters.</p> : null}
                  </div>
                ) : (
                  <div data-pricing-matrix className="px-4 py-3 sm:px-5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <AdminSelect
                        aria-label="Choose a specification"
                        value={matrixSpec?.key ?? ""}
                        onChange={(event) => setMatrixKey(event.target.value)}
                        className="!h-8 !w-[15rem] shrink-0 text-[10px]"
                      >
                        {groups.map((group) => <option key={group.key} value={group.key}>{group.label}</option>)}
                      </AdminSelect>
                      <AdminInput value={bulkPrice} onChange={(event) => setBulkPrice(event.target.value)} aria-label="Price for every size" placeholder="Price for every size" className="h-8 w-40 text-[10px]" />
                      <AdminButton variant="ghost" onClick={copyToSizes}>Copy to sizes</AdminButton>
                      <AdminInput value={newSize} onChange={(event) => setNewSize(event.target.value)} aria-label="New size" placeholder="New size" className="h-8 w-24 text-[10px]" />
                      <AdminButton variant="ghost" onClick={addSize}><Plus size={12} /> Add size</AdminButton>
                    </div>
                    <table className="mt-2 w-full border-collapse text-[10px]">
                      <thead className="text-[9px] uppercase tracking-wide text-[#87909b]">
                        <tr>
                          <th className="px-2 py-1.5 text-left font-bold">Size</th>
                          <th className="px-2 py-1.5 text-left font-bold">Price (Ks)</th>
                          <th className="px-2 py-1.5 text-left font-bold">Status</th>
                          <th className="px-2 py-1.5 text-right font-bold"> </th>
                        </tr>
                      </thead>
                      <tbody>
                        {matrix.map((row) => {
                          const tone = statusTone(row);
                          return (
                            <tr key={row.key} data-pricing-matrix-row={row.key} className="border-t border-[#f2f4f6]">
                              <td className="px-2 py-1.5 font-bold text-[#333c49]">{row.size}</td>
                              <td className="px-2 py-1.5">
                                <input
                                  aria-label={`Price ${row.size}`}
                                  data-pricing-matrix-price={row.key}
                                  inputMode="numeric"
                                  placeholder="—"
                                  value={priceText(row)}
                                  onChange={(event) => editPrice(row, event.target.value)}
                                  className="h-8 w-28 rounded-md border border-[#e6e9ed] bg-white px-2 text-right text-[10px] font-bold tabular-nums outline-none focus:border-[#a5d972]"
                                />
                              </td>
                              <td className="px-2 py-1.5"><span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${tone.className}`}>{tone.label}</span></td>
                              <td className="px-2 py-1.5 text-right">
                                <button type="button" aria-label={`${row.status === "Disabled" ? "Enable" : "Disable"} ${row.size}`} onClick={() => setStatuses([row], row.status === "Disabled" ? "Active" : "Disabled")} className="rounded p-1 text-[#6c7683] hover:bg-[#f3f5f7]"><Check size={12} /></button>
                                <button type="button" aria-label={`Remove ${row.size}`} onClick={() => removeSize(row.size)} className="rounded p-1 text-[#b4463c] hover:bg-[#fdf1f1]"><Trash2 size={12} /></button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {!matrix.length ? <p className="px-2 py-4 text-center text-[10px] text-[#87909b]">No size for this specification.</p> : null}
                  </div>
                )}

                {selected.size ? (
                  <div className="flex flex-wrap items-center gap-1.5 border-t border-[#f0f2f4] px-4 py-2 sm:px-5">
                    <span className="text-[10px] font-bold text-[#3c4553]">{selected.size} selected</span>
                    <AdminButton variant="ghost" onClick={() => setStatuses(filteredRows.filter((row) => selected.has(row.key)), "Active")}>Enable</AdminButton>
                    <AdminButton variant="ghost" onClick={() => setStatuses(filteredRows.filter((row) => selected.has(row.key)), "Disabled")}>Disable</AdminButton>
                    <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-[10px] font-bold text-[#6c7683]"><X size={12} className="inline" /> Clear</button>
                  </div>
                ) : null}

                <div className="flex items-center justify-between border-t border-[#f0f2f4] px-4 py-2 text-[10px] text-[#87909b] sm:px-5">
                  <span>{filteredRows.length} variants · page {currentPage + 1} of {pageCount}</span>
                  <span className="flex items-center gap-1">
                    <AdminButton variant="ghost" onClick={() => setPage(Math.max(0, currentPage - 1))} disabled={currentPage === 0}>Previous</AdminButton>
                    <AdminButton variant="ghost" onClick={() => setPage(Math.min(pageCount - 1, currentPage + 1))} disabled={currentPage >= pageCount - 1}>Next</AdminButton>
                  </span>
                </div>
              </AdminCard>
            ) : <AdminEmpty title="No product matches" description="Clear the filters to pick a product." />}
          </div>
        ) : null}

        {tab === "table" ? (
          <AdminCard className="overflow-hidden">
            <AdminCardHeader
              title="Price Table"
              description="Prices are set once per specification, then every product made to that specification reads it."
              actions={<Link href="/admin/price-table" className="inline-flex items-center gap-1 text-[10px] font-bold text-[#3f8c22] hover:underline">Open the table →</Link>}
            />
            <ul className="divide-y divide-[#f0f2f4]">
              {pricingAttributes(data).map((attribute) => (
                <li key={attribute.key} className="flex items-start justify-between gap-3 px-4 py-2 text-[10px] sm:px-5">
                  <span className="font-bold text-[#333c49]">{attribute.label}</span>
                  <span className="text-right font-semibold text-[#6c7683]">{attribute.options.join(", ")}</span>
                </li>
              ))}
            </ul>
            <p className="px-4 py-2 text-[10px] text-[#87909b] sm:px-5">
              The per-specification prices live on{" "}
              <Link href="/admin/price-table" className="font-bold text-[#3f8c22] hover:underline">Admin → Price Table</Link>,
              so a post is priced without typing anything.
            </p>
          </AdminCard>
        ) : null}

        {tab === "history" ? (
          <AdminCard className="overflow-hidden">
            <AdminCardHeader title="Price History" description="Every price change, newest first. Nothing is deleted." />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-[10px]">
                <thead className="bg-[#f8f9fb] text-[9px] uppercase tracking-wide text-[#87909b]">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold">Product</th>
                    <th className="px-3 py-2 text-left font-bold">Variant</th>
                    <th className="px-3 py-2 text-right font-bold">Previous</th>
                    <th className="px-3 py-2 text-right font-bold">New</th>
                    <th className="px-3 py-2 text-left font-bold">By</th>
                    <th className="px-3 py-2 text-left font-bold">When</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((entry) => (
                    <tr key={entry.id} data-pricing-history-row={entry.id} className="border-t border-[#f2f4f6]">
                      <td className="px-3 py-1.5 font-bold text-[#333c49]">{data.products.find((item) => item.id === entry.scopeId)?.name ?? entry.scopeId}</td>
                      <td className="px-3 py-1.5 font-semibold text-[#6c7683]">{Object.values(entry.options ?? {}).join(" · ")}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-[#6c7683]">{entry.oldPriceKs === null ? "—" : formatKs(entry.oldPriceKs)}</td>
                      <td className="px-3 py-1.5 text-right font-bold tabular-nums text-[#3f8c22]">{formatKs(entry.newPriceKs)}</td>
                      <td className="px-3 py-1.5 text-[#6c7683]">{entry.actor}</td>
                      <td className="px-3 py-1.5 text-[#87909b]">{new Date(entry.at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!history.length ? <p className="px-4 py-6 text-center text-[10px] text-[#87909b]">No price change matches “{search}”.</p> : null}
            </div>
          </AdminCard>
        ) : null}

        {tab === "attributes" ? (
          <div className="space-y-3">
            <AdminCard className="overflow-hidden">
              <AdminCardHeader title="Attribute Management" description="Add options, rename, switch off or reorder. A change reaches every product's grid at once." />
              <ul className="divide-y divide-[#f0f2f4]">
                {attributeChain(data).map((attribute, index) => (
                  <li key={attribute.key} data-pricing-attribute-row={attribute.key} className="px-4 py-2.5 sm:px-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        aria-label={`Rename ${attribute.label}`}
                        defaultValue={attribute.label}
                        onBlur={(event) => {
                          const label = event.target.value.trim();
                          if (label && label !== attribute.label) patchAttribute(attribute.key, { label });
                        }}
                        className="h-8 w-40 rounded-md border border-[#e6e9ed] px-2 text-[10px] font-bold text-[#333c49]"
                      />
                      <label className="inline-flex items-center gap-1 text-[9px] font-bold text-[#6c7683]">
                        <input
                          type="checkbox"
                          checked={attribute.enabled}
                          onChange={(event) => patchAttribute(attribute.key, { enabled: event.target.checked })}
                        /> Enabled
                      </label>
                      <div className="ml-auto flex items-center gap-1">
                        <button type="button" aria-label={`Move ${attribute.label} up`} onClick={() => updateAdminData((current) => moveAttribute(current, attribute.key, -1))} disabled={index === 0} className="rounded p-1 text-[#6c7683] hover:bg-[#f3f5f7] disabled:opacity-30"><ArrowUp size={12} /></button>
                        <button type="button" aria-label={`Move ${attribute.label} down`} onClick={() => updateAdminData((current) => moveAttribute(current, attribute.key, 1))} disabled={index === attributeChain(data).length - 1} className="rounded p-1 text-[#6c7683] hover:bg-[#f3f5f7] disabled:opacity-30"><ArrowDown size={12} /></button>
                      </div>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      {attribute.options.map((option) => (
                        <span key={option} className="inline-flex items-center gap-1 rounded-full bg-[#f3f5f7] px-2 py-0.5 text-[9px] font-bold text-[#4a5361]">
                          {option}
                          <button type="button" aria-label={`Delete ${option}`} onClick={() => removeOption(attribute.key, option)} className="text-[#87909b] hover:text-[#b4463c]"><X size={9} /></button>
                        </span>
                      ))}
                      <input
                        value={newOption[attribute.key] ?? ""}
                        onChange={(event) => setNewOption((current) => ({ ...current, [attribute.key]: event.target.value }))}
                        onKeyDown={(event) => { if (event.key === "Enter") addOption(attribute.key); }}
                        aria-label={`Add ${attribute.label} option`}
                        placeholder="+ option"
                        className="h-6 w-24 rounded-full border border-dashed border-[#d8dde3] px-2 text-[9px] font-semibold outline-none focus:border-[#a5d972]"
                      />
                      <button type="button" onClick={() => addOption(attribute.key)} className="text-[9px] font-bold text-[#3f8c22]">Add</button>
                    </div>
                  </li>
                ))}
              </ul>
            </AdminCard>
            <AdminCard className="overflow-hidden">
              <AdminCardHeader title="Add an attribute" description="It appears in every product's specification list, off until you switch it on." />
              <div className="flex flex-wrap items-center gap-1.5 px-4 py-3 sm:px-5">
                <AdminInput value={newAttribute.label} onChange={(event) => setNewAttribute((current) => ({ ...current, label: event.target.value }))} aria-label="New attribute label" placeholder="Label (e.g. Pattern)" className="h-8 w-40 text-[10px]" />
                <AdminInput value={newAttribute.options} onChange={(event) => setNewAttribute((current) => ({ ...current, options: event.target.value }))} aria-label="New attribute options" placeholder="Options, comma separated" className="h-8 w-56 text-[10px]" />
                <AdminButton onClick={addAttribute}><Plus size={12} /> Add attribute</AdminButton>
                <Link href="/admin/attributes" className="ml-auto text-[10px] font-bold text-[#3f8c22] hover:underline">Full attribute editor →</Link>
              </div>
            </AdminCard>
            <AdminCard className="overflow-hidden">
              <AdminCardHeader
                title="Combination pricing"
                description="The post-level grid keeps its per-combination editor."
                actions={<Link href="/admin/pricing/combinations" className="text-[10px] font-bold text-[#3f8c22] hover:underline">Open the grid →</Link>}
              />
              <p className="px-4 py-2 text-[10px] text-[#87909b] sm:px-5">
                Every price here is manual: an attribute never changes the number the owner typed, and a variant
                without a price is shown as Incomplete, never sold.
              </p>
            </AdminCard>
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}
