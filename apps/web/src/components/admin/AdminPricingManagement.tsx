"use client";

// Advanced Price Table (owner spec 2026-11-21, part 2). One screen for every product: each variant —
// one specification combination, size included — carries an MMK price, a USD price, an availability
// state separate from its status, and optional stock. The Table and Matrix views read and write the
// same rows, and switching an attribute on adds columns without a schema change.
//
// Views: All prices · Table · Matrix · Missing prices · Out of stock · Disabled variants · Price history.

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown, ArrowUp, Check, Columns3, CopyPlus, Download, Pencil, Plus, RotateCcw, Save,
  Search, Trash2, Upload, X,
} from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import AdminPriceTable from "@/components/admin/AdminPriceTable";
import { AdminButton, AdminCard, AdminCardHeader, AdminEmpty, AdminInput, AdminSelect, AdminStat } from "@/components/admin/AdminUi";
import { getDemoAdminSession } from "@/lib/admin-demo-auth";
import { updateAdminData, useAdminDemoData } from "@/lib/admin-demo-store";
import { formatKs, type AdminAvailability, type AdminProductCategory } from "@/lib/admin-demo-data";
import { applyChainPatch, attributeChain, moveAttribute } from "@/lib/admin-attributes";
import { formatPriceInput, parsePriceInput } from "@/lib/pricing-combinations";
import {
  AVAILABILITY_STATES, buildVariantCsv, filterVariants, formatUsdInput, hasFullPrice,
  parseUsdInput, pricingAttributes, pricingHistory, pricingOverview, productAttributeKeys,
  productPricingAttributes, saveVariantChanges, setOptionAvailability, setProductAttributes,
  setProductAvailability, setProductSizes, setStockTracking, sortVariants, specificationGroups,
  stockTrackingOn, variantColumns, variantRows, variantSearchText,
  type VariantRow, type VariantSort,
} from "@/lib/pricing-variants";
import { matchesSearchQuery } from "@/lib/search-text";

type Tab = "overview" | "product" | "table" | "history" | "attributes";
type View = "all" | "table" | "matrix" | "missing" | "out" | "disabled";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "product", label: "Product Pricing" },
  { id: "table", label: "Price Table" },
  { id: "history", label: "Price History" },
  { id: "attributes", label: "Attribute Management" },
];

const VIEWS: { id: View; label: string }[] = [
  { id: "all", label: "All prices" },
  { id: "table", label: "Table" },
  { id: "matrix", label: "Matrix" },
  { id: "missing", label: "Missing prices" },
  { id: "out", label: "Out of stock" },
  { id: "disabled", label: "Disabled variants" },
];

const PAGE_SIZE = 25;

const availabilityTone = (state: AdminAvailability) => {
  if (state === "Available") return "bg-[#eef8e6] text-[#3f8c22]";
  if (state === "Out of Stock") return "bg-[#fdeceb] text-[#b4463c]";
  if (state === "Temporarily Unavailable") return "bg-[#fff4e0] text-[#8a6a00]";
  return "bg-[#f1f3f5] text-[#6c7683]";
};

type Cell = { ks: string; usd: string };

/** One variant, editable before it is saved. */
function VariantEditor({
  row,
  productName,
  stockOn,
  onClose,
  onSave,
}: {
  row: VariantRow;
  productName: string;
  stockOn: boolean;
  onClose: () => void;
  onSave: (values: { priceKs: number | null; priceUsd: number | null; sku: string; note: string; availability: AdminAvailability; stockQuantity: number | null; lowThreshold: number | null; disableReason: string }) => void;
}) {
  const [ks, setKs] = useState(formatPriceInput(row.priceKs));
  const [usd, setUsd] = useState(formatUsdInput(row.priceUsd));
  const [sku, setSku] = useState(row.sku ?? "");
  const [note, setNote] = useState(row.note ?? "");
  const [availability, setAvailability] = useState<AdminAvailability>(row.availability);
  const [quantity, setQuantity] = useState(row.stock ? String(row.stock.quantity) : "");
  const [low, setLow] = useState(row.stock ? String(row.stock.lowThreshold) : "");
  const [reason, setReason] = useState("");
  const ksParsed = ks.trim() ? parsePriceInput(ks) : null;
  const usdParsed = usd.trim() ? parseUsdInput(usd) : null;
  const invalid = (ksParsed && !ksParsed.ok) || (usdParsed && !usdParsed.ok);

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Edit variant">
      <button type="button" aria-label="Close" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-[#111820]/45" />
      <div data-pricing-editor className="relative max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-[13px] font-bold text-[#202733]">{productName}</h2>
            <p className="text-[10px] text-[#87909b]">{Object.entries(row.options).map(([key, value]) => `${key}: ${value}`).join(" · ")}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close editor" className="rounded-lg p-1.5 text-[#87909c] hover:bg-[#f3f5f7]"><X size={16} /></button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-[9px] font-bold uppercase tracking-wide text-[#87909b]">
            MMK price
            <AdminInput aria-label="Edit MMK price" value={ks} onChange={(event) => setKs(event.target.value)} inputMode="numeric" placeholder="8,000" className="mt-1 h-9 text-[11px]" />
          </label>
          <label className="text-[9px] font-bold uppercase tracking-wide text-[#87909b]">
            USD price
            <AdminInput aria-label="Edit USD price" value={usd} onChange={(event) => setUsd(event.target.value)} inputMode="decimal" placeholder="3.80" className="mt-1 h-9 text-[11px]" />
          </label>
          <label className="text-[9px] font-bold uppercase tracking-wide text-[#87909b]">
            Variant SKU
            <AdminInput aria-label="Variant SKU" value={sku} onChange={(event) => setSku(event.target.value)} placeholder="MF-TS-BLK-M" className="mt-1 h-9 text-[11px]" />
          </label>
          <label className="text-[9px] font-bold uppercase tracking-wide text-[#87909b]">
            Availability
            <AdminSelect aria-label="Availability" value={availability} onChange={(event) => setAvailability(event.target.value as AdminAvailability)} className="mt-1 !h-9 text-[11px]">
              {AVAILABILITY_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
            </AdminSelect>
          </label>
        </div>

        {availability === "Disabled" ? (
          <label className="mt-2 block text-[9px] font-bold uppercase tracking-wide text-[#87909b]">
            Disable reason
            <AdminInput aria-label="Disable reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Why is it off sale?" className="mt-1 h-9 text-[11px]" />
          </label>
        ) : null}

        {stockOn ? (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="text-[9px] font-bold uppercase tracking-wide text-[#87909b]">
              Stock quantity
              <AdminInput aria-label="Stock quantity" value={quantity} onChange={(event) => setQuantity(event.target.value)} inputMode="numeric" placeholder="0" className="mt-1 h-9 text-[11px]" />
            </label>
            <label className="text-[9px] font-bold uppercase tracking-wide text-[#87909b]">
              Low stock threshold
              <AdminInput aria-label="Low stock threshold" value={low} onChange={(event) => setLow(event.target.value)} inputMode="numeric" placeholder="5" className="mt-1 h-9 text-[11px]" />
            </label>
          </div>
        ) : null}

        <label className="mt-2 block text-[9px] font-bold uppercase tracking-wide text-[#87909b]">
          Admin note
          <AdminInput aria-label="Admin note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Internal note" className="mt-1 h-9 text-[11px]" />
        </label>

        {invalid ? <p className="mt-2 text-[10px] font-bold text-[#b4463c]">Prices are whole Ks above 0, and USD takes at most two decimals.</p> : null}

        <div className="mt-3 flex justify-end gap-1.5">
          <AdminButton variant="ghost" onClick={onClose}>Cancel</AdminButton>
          <AdminButton
            onClick={() => onSave({
              priceKs: ksParsed && ksParsed.ok ? ksParsed.value : null,
              priceUsd: usdParsed && usdParsed.ok ? usdParsed.value : null,
              sku: sku.trim(),
              note: note.trim(),
              availability,
              stockQuantity: quantity.trim() ? Number(quantity) : null,
              lowThreshold: low.trim() ? Number(low) : null,
              disableReason: reason.trim(),
            })}
            disabled={Boolean(invalid)}
          >
            <Save size={12} /> Save variant
          </AdminButton>
        </div>
      </div>
    </div>
  );
}

export default function AdminPricingManagement() {
  const data = useAdminDemoData();
  const [tab, setTab] = useState<Tab>("overview");
  const [view, setView] = useState<View>("table");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | AdminProductCategory>("all");
  const [status, setStatus] = useState<"all" | "Active" | "Draft">("all");
  const [productId, setProductId] = useState<string | null>(data.products[0]?.id ?? null);
  const [sort, setSort] = useState<VariantSort>("default");
  const [availabilityFilter, setAvailabilityFilter] = useState<AdminAvailability | "all">("all");
  const [missingOnly, setMissingOnly] = useState(false);
  const [minKs, setMinKs] = useState("");
  const [maxUsd, setMaxUsd] = useState("");
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [pending, setPending] = useState<Record<string, Cell>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [message, setMessage] = useState("");
  const [matrixSpecKey, setMatrixSpecKey] = useState<string | null>(null);
  const [matrixRowKey, setMatrixRowKey] = useState<string | null>(null);
  const [bulkKs, setBulkKs] = useState("");
  const [bulkUsd, setBulkUsd] = useState("");
  const [newSize, setNewSize] = useState("");
  const [newOption, setNewOption] = useState<Record<string, string>>({});
  const [newAttribute, setNewAttribute] = useState({ label: "", options: "" });
  const [editing, setEditing] = useState<VariantRow | null>(null);

  const products = useMemo(() => data.products.filter((product) => {
    if (category !== "all" && product.category !== category) return false;
    if (status !== "all" && product.status !== status) return false;
    return matchesSearchQuery(`${product.name} ${product.category} ${product.fabric} ${product.designName}`, search);
  }), [data.products, category, status, search]);

  const product = data.products.find((entry) => entry.id === productId) ?? products[0] ?? null;
  const attributes = useMemo(() => (product ? productPricingAttributes(data, product) : []), [data, product]);
  const rows = useMemo(() => (product ? variantRows(data, product) : []), [data, product]);
  const columns = variantColumns(attributes).filter((column) => !hiddenColumns.includes(column.key));
  const overview = useMemo(() => pricingOverview(data), [data]);
  const history = useMemo(() => pricingHistory(data, { search }), [data, search]);
  const groups = useMemo(() => (product ? specificationGroups(data, product) : []), [data, product]);
  const columnAttributes = attributes.filter((attribute) => attribute.key !== "size");
  const rowAttribute = columnAttributes.find((attribute) => attribute.key === matrixRowKey) ?? columnAttributes[0] ?? null;
  const matrixSpec = groups.find((group) => group.key === matrixSpecKey) ?? groups[0] ?? null;
  // The matrix shows one specification: every value of the row attribute across the product's sizes.
  const matrixFixed = Object.fromEntries(
    Object.entries(matrixSpec?.options ?? {}).filter(([key]) => key !== rowAttribute?.key),
  );
  const matrix = product && matrixSpec
    ? rows.filter((row) => Object.entries(matrixFixed).every(([key, value]) => row.options[key] === value))
    : [];
  const matrixRowOptions = rowAttribute
    ? [...new Set(matrix.map((row) => row.options[rowAttribute.key]).filter(Boolean))]
    : [];
  const matrixSizes = product?.sizes ?? [];

  const filteredRows = useMemo(() => {
    const inView = (row: VariantRow) => {
      if (view === "missing") return !hasFullPrice(row);
      if (view === "out") return row.effectiveAvailability === "Out of Stock";
      if (view === "disabled") return row.effectiveAvailability === "Disabled";
      return true;
    };
    return sortVariants(
      filterVariants(
        rows.filter(inView).filter((row) => matchesSearchQuery(variantSearchText(attributes, row), search)),
        {
          availability: availabilityFilter,
          missingPrice: missingOnly,
          minKs: minKs.trim() ? Number(minKs.replace(/[^\d]/g, "")) : null,
          maxUsd: maxUsd.trim() ? Number(maxUsd) : null,
        },
      ),
      sort,
    );
  }, [rows, search, attributes, availabilityFilter, missingOnly, minKs, maxUsd, sort, view]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const paged = filteredRows.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const dirty = Object.entries(pending).filter(([key, cell]) => {
    const row = rows.find((entry) => entry.key === key);
    if (!row) return false;
    return cell.ks !== formatPriceInput(row.priceKs) || cell.usd !== formatUsdInput(row.priceUsd);
  });
  const dirtyKeys = dirty.map(([key]) => key);
  const invalidKeys = dirtyKeys.filter((key) => {
    const cell = pending[key];
    return (cell.ks.trim() !== "" && !parsePriceInput(cell.ks).ok) || (cell.usd.trim() !== "" && !parseUsdInput(cell.usd).ok);
  });

  const cellValue = (row: VariantRow): Cell => pending[row.key] ?? { ks: formatPriceInput(row.priceKs), usd: formatUsdInput(row.priceUsd) };

  function editCell(row: VariantRow, patch: Partial<Cell>) {
    setPending((current) => {
      const base = current[row.key] ?? { ks: formatPriceInput(row.priceKs), usd: formatUsdInput(row.priceUsd) };
      return { ...current, [row.key]: { ...base, ...patch } };
    });
  }

  function actor() {
    return getDemoAdminSession()?.name ?? "Admin";
  }

  function savePrices(source: VariantRow[]) {
    if (invalidKeys.length) {
      setMessage(`${invalidKeys.length} price${invalidKeys.length === 1 ? "" : "s"} need fixing before saving.`);
      return;
    }
    const changes = source
      .filter((row) => row.key in pending)
      .map((row) => {
        const cell = pending[row.key];
        const ks = cell.ks.trim() ? parsePriceInput(cell.ks) : null;
        const usd = cell.usd.trim() ? parseUsdInput(cell.usd) : null;
        return {
          options: row.options,
          size: row.size,
          priceKs: ks && ks.ok ? ks.value : null,
          priceUsd: usd && usd.ok ? usd.value : null,
          expectedVersion: row.version,
        };
      })
      .filter((change) => change.priceKs !== null || change.priceUsd !== null);
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

  function setAvailability(targets: VariantRow[], state: AdminAvailability) {
    if (!product || !targets.length) return;
    updateAdminData((current) => saveVariantChanges(
      current,
      product.id,
      targets.map((row) => ({ options: row.options, size: row.size, availability: state, expectedVersion: row.version })),
      actor(),
      new Date().toISOString(),
    ).data);
    setMessage(`${targets.length} variant${targets.length === 1 ? "" : "s"} set to ${state}.`);
  }

  function duplicateVariant(row: VariantRow) {
    if (!product) return;
    const target = attributes
      .filter((attribute) => attribute.key !== "size")
      .flatMap((attribute) => attribute.options.map((option) => ({ attribute, option })))
      .find(({ attribute, option }) => row.options[attribute.key] !== option && attribute.options.length > 1);
    if (!target || !hasFullPrice(row)) {
      setMessage("Pick a fully priced variant that has another option to duplicate onto.");
      return;
    }
    const options = { ...row.options, [target.attribute.key]: target.option };
    updateAdminData((current) => saveVariantChanges(
      current,
      product.id,
      [{ options, size: row.size, priceKs: row.priceKs, priceUsd: row.priceUsd, expectedVersion: 0 }],
      actor(),
      new Date().toISOString(),
    ).data);
    setMessage(`Copied ${formatKs(row.priceKs ?? 0)} / $${(row.priceUsd ?? 0).toFixed(2)} onto ${target.attribute.label} ${target.option}.`);
  }

  function deleteVariant(row: VariantRow) {
    if (!product) return;
    if (!window.confirm(`Remove the ${row.size} variant from ${product.name}? Its price history stays.`)) return;
    updateAdminData((current) => ({
      ...current,
      productPrices: current.productPrices.filter((entry) => !(entry.productId === product.id
        && entry.size === row.size
        && JSON.stringify(entry.options ?? {}) === JSON.stringify(row.options))),
    }));
    setMessage("Variant removed. Its price history stays.");
  }

  function saveEditor(values: { priceKs: number | null; priceUsd: number | null; sku: string; note: string; availability: AdminAvailability; stockQuantity: number | null; lowThreshold: number | null; disableReason: string }) {
    if (!product || !editing) return;
    const tracked = stockTrackingOn(data, product.id);
    const stock = values.stockQuantity === null && !tracked
      ? null
      : {
        tracking: tracked,
        quantity: values.stockQuantity ?? editing.stock?.quantity ?? 0,
        lowThreshold: values.lowThreshold ?? editing.stock?.lowThreshold ?? 5,
        restockQuantity: editing.stock?.restockQuantity ?? 20,
      };
    updateAdminData((current) => saveVariantChanges(
      current,
      product.id,
      [{
        options: editing.options,
        size: editing.size,
        priceKs: values.priceKs,
        priceUsd: values.priceUsd,
        sku: values.sku,
        note: values.note,
        availability: values.availability,
        stock,
        disableReason: values.disableReason,
        expectedVersion: editing.version,
      }],
      actor(),
      new Date().toISOString(),
    ).data);
    setEditing(null);
    setPending({});
    setMessage("Variant saved.");
  }

  function toggleAttribute(key: string, on: boolean) {
    if (!product) return;
    const keys = productAttributeKeys(data, product);
    const next = on ? [...keys, key] : keys.filter((entry) => entry !== key);
    updateAdminData((current) => setProductAttributes(current, product.id, next));
    setPending({});
    setMessage(on ? `${key} added to ${product.name} — new variants show Missing Price until priced.` : `${key} removed from ${product.name}.`);
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
    const ks = bulkKs.trim() ? parsePriceInput(bulkKs) : null;
    const usd = bulkUsd.trim() ? parseUsdInput(bulkUsd) : null;
    if ((ks && !ks.ok) || (usd && !usd.ok) || (!ks && !usd)) {
      setMessage("Type a Ks price, a USD price, or both before copying.");
      return;
    }
    setPending((current) => {
      const next = { ...current };
      for (const row of matrix) {
        next[row.key] = {
          ks: ks && ks.ok ? formatPriceInput(ks.value) : formatPriceInput(row.priceKs),
          usd: usd && usd.ok ? formatUsdInput(usd.value) : formatUsdInput(row.priceUsd),
        };
      }
      return next;
    });
    setMessage(`${matrix.length} cell${matrix.length === 1 ? "" : "s"} staged — save to apply.`);
  }

  function exportCsv() {
    const csv = buildVariantCsv(attributes, filteredRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mhfashion-prices-${product?.id ?? "all"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function importCsv(file: File | null) {
    if (!file) return;
    file.text().then((text) => {
      const lines = text.split(/\r?\n/).filter(Boolean);
      const header = lines.shift()?.split(",").map((entry) => entry.trim().toLowerCase()) ?? [];
      const at = (name: string) => header.indexOf(name);
      const sizeAt = at("size");
      const ksAt = at("mmk price") >= 0 ? at("mmk price") : at("price (ks)");
      const usdAt = at("usd price");
      if (sizeAt === -1 || (ksAt === -1 && usdAt === -1)) {
        setMessage("The CSV needs a Size column and an MMK Price or USD Price column.");
        return;
      }
      let staged = 0;
      setPending((current) => {
        const next = { ...current };
        for (const line of lines) {
          const cells = line.split(",");
          const size = cells[sizeAt]?.trim();
          const row = size ? rows.find((entry) => entry.size === size) : null;
          if (!row) continue;
          next[row.key] = {
            ks: ksAt >= 0 && cells[ksAt]?.trim() ? cells[ksAt].trim() : formatPriceInput(row.priceKs),
            usd: usdAt >= 0 && cells[usdAt]?.trim() ? cells[usdAt].trim() : formatUsdInput(row.priceUsd),
          };
          staged += 1;
        }
        return next;
      });
      setMessage(`${staged} row${staged === 1 ? "" : "s"} staged from the file — review, then save.`);
    });
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
      <AdminShell active="pricing" title="Price Table" description="Price every variant in one place.">
        <AdminEmpty title="No products yet" description="Post a product first; its pricing appears here." />
      </AdminShell>
    );
  }

  const selectedRows = filteredRows.filter((row) => selected.has(row.key));

  return (
    <AdminShell
      active="pricing"
      title="Price Table"
      description="Every product, every specification: MMK and USD prices, availability and stock in one place."
      search={(
        <label className="flex h-10 w-full max-w-[420px] items-center gap-2.5 rounded-full border border-[#e6e9ed] bg-[#f8f9fb] px-3.5 text-[#8c95a1] focus-within:border-[#a5d972] focus-within:bg-white">
          <Search size={16} className="shrink-0" />
          <input
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(0); }}
            aria-label="Search products, variants and SKUs"
            placeholder="Search product, SKU, spec or price..."
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
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
              <AdminStat label="Products" value={`${overview.productsPriced}/${overview.products}`} hint="fully priced / total" />
              <AdminStat label="Variants" value={String(overview.variants)} hint="spec + size rows" />
              <AdminStat label="Missing price" value={String(overview.incomplete)} hint="MMK or USD not set" />
              <AdminStat label="Out of stock" value={String(overview.outOfStock)} hint="not buyable now" />
              <AdminStat label="Disabled" value={String(overview.disabled)} hint="not offered" />
            </div>
            <AdminCard className="overflow-hidden">
              <AdminCardHeader title="Recent price and availability changes" description="Newest first — every save is recorded." />
              {overview.recent.length ? (
                <ul className="divide-y divide-[#f0f2f4]">
                  {overview.recent.map((entry) => (
                    <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-[10px] sm:px-5">
                      <span className="min-w-0 truncate font-bold text-[#333c49]">
                        {data.products.find((item) => item.id === entry.scopeId)?.name ?? entry.scopeId}
                        <span className="ml-1 font-semibold text-[#87909b]">{Object.values(entry.options ?? {}).join(" · ")}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-[#6c7683]">
                        {entry.oldPriceKs === null ? "—" : formatKs(entry.oldPriceKs)} → <span className="font-bold text-[#3f8c22]">{formatKs(entry.newPriceKs)}</span>
                        {entry.newPriceUsd !== undefined && entry.newPriceUsd !== null ? <span className="ml-1">/ ${entry.newPriceUsd.toFixed(2)}</span> : null}
                        {entry.newAvailability ? <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${availabilityTone(entry.newAvailability)}`}>{entry.newAvailability}</span> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : <p className="px-4 py-6 text-center text-[10px] text-[#87909b] sm:px-5">No change yet.</p>}
            </AdminCard>
          </div>
        ) : null}

        {tab === "product" ? (
          <div className="space-y-3">
            <AdminCard className="overflow-hidden">
              <div className="flex flex-wrap items-center gap-1.5 px-4 py-2.5 sm:px-5">
                <AdminSelect aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value as typeof category)} className="!h-8 !w-[9.5rem] shrink-0 text-[10px]">
                  <option value="all">All categories</option>
                  {[...new Set(data.products.map((entry) => entry.category))].map((value) => <option key={value} value={value}>{value}</option>)}
                </AdminSelect>
                <AdminSelect aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="!h-8 !w-[8.5rem] shrink-0 text-[10px]">
                  <option value="all">All statuses</option>
                  <option value="Active">Active</option>
                  <option value="Draft">Draft</option>
                </AdminSelect>
                <span className="text-[10px] font-semibold text-[#87909b]">{products.length} products</span>
                <div className="ml-auto flex flex-wrap items-center gap-1.5">
                  <AdminButton variant="ghost" className="shrink-0 whitespace-nowrap" onClick={exportCsv}><Download size={12} /> CSV</AdminButton>
                  <label className="inline-flex shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1 text-[10px] font-bold text-[#6c7683] hover:bg-[#f7f9fb]">
                    <Upload size={12} /> Import
                    <input type="file" accept=".csv,text/csv" aria-label="Import prices CSV" className="hidden" onChange={(event) => importCsv(event.target.files?.[0] ?? null)} />
                  </label>
                  <AdminButton
                    className="shrink-0 whitespace-nowrap"
                    data-pricing-add
                    onClick={() => {
                      setTab("product");
                      const unpriced = data.products.find((entry) => !data.productPrices.some((row) => row.productId === entry.id));
                      setProductId((unpriced ?? data.products[0]).id);
                      setView("table");
                      setMessage("Pick the specifications this product is priced by, then set every variant's MMK and USD price.");
                    }}
                  >
                    <Plus size={12} /> Add product pricing
                  </AdminButton>
                </div>
              </div>
              <div className="flex gap-1.5 overflow-x-auto border-t border-[#f0f2f4] px-4 py-2 sm:px-5">
                {products.map((entry) => {
                  const priced = data.productPrices.filter((row) => row.productId === entry.id && row.priceUsd).length;
                  const active = product?.id === entry.id;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      aria-pressed={active}
                      data-pricing-product={entry.id}
                      onClick={() => { setProductId(entry.id); setPending({}); setSelected(new Set()); setPage(0); setMatrixSpecKey(null); setEditing(null); }}
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
                  <span className="ml-auto flex items-center gap-1.5">
                    <label className="inline-flex items-center gap-1 text-[9px] font-bold text-[#6c7683]">
                      <input
                        type="checkbox"
                        checked={stockTrackingOn(data, product.id)}
                        data-pricing-stock-tracking
                        onChange={(event) => {
                          updateAdminData((current) => setStockTracking(current, product.id, event.target.checked));
                          setMessage(event.target.checked ? "Stock tracking on — zero quantity reads as Out of Stock." : "Stock tracking off — availability is manual again.");
                        }}
                      /> Stock tracking
                    </label>
                    <AdminSelect
                      aria-label="Product availability"
                      value={data.productAvailability?.[product.id] ?? "Available"}
                      onChange={(event) => {
                        updateAdminData((current) => setProductAvailability(current, product.id, event.target.value as AdminAvailability));
                        setMessage(`Whole product set to ${event.target.value}.`);
                      }}
                      className="!h-7 !w-[10.5rem] text-[9px]"
                    >
                      {AVAILABILITY_STATES.map((state) => <option key={state} value={state}>Product: {state}</option>)}
                    </AdminSelect>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 border-b border-[#f0f2f4] px-4 py-2 sm:px-5">
                  <div className="flex gap-1 overflow-x-auto" role="group" aria-label="Price table view">
                    {VIEWS.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        aria-pressed={view === entry.id}
                        data-pricing-view={entry.id}
                        onClick={() => { setView(entry.id); setPending({}); setPage(0); }}
                        className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-bold ${view === entry.id ? "border-[#4cae22] bg-[#eef8e6] text-[#3f8c22]" : "border-[#e4e8ed] bg-white text-[#6c7683]"}`}
                      >
                        {entry.label}
                      </button>
                    ))}
                  </div>
                  <span className="ml-auto flex flex-wrap items-center gap-1.5">
                    <AdminSelect aria-label="Sort variants" value={sort} onChange={(event) => setSort(event.target.value as VariantSort)} className="!h-7 !w-[10.5rem] text-[9px]">
                      <option value="default">Sort: default</option>
                      <option value="mmk-asc">MMK: low → high</option>
                      <option value="mmk-desc">MMK: high → low</option>
                      <option value="usd-asc">USD: low → high</option>
                      <option value="usd-desc">USD: high → low</option>
                      <option value="updated">Recently updated</option>
                    </AdminSelect>
                    <AdminSelect aria-label="Filter by availability" value={availabilityFilter} onChange={(event) => setAvailabilityFilter(event.target.value as typeof availabilityFilter)} className="!h-7 !w-[11rem] text-[9px]">
                      <option value="all">Any availability</option>
                      {AVAILABILITY_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
                    </AdminSelect>
                    <AdminInput value={minKs} onChange={(event) => setMinKs(event.target.value)} aria-label="Minimum MMK" placeholder="Min MMK" className="!h-7 !w-24 text-[9px]" />
                    <AdminInput value={maxUsd} onChange={(event) => setMaxUsd(event.target.value)} aria-label="Maximum USD" placeholder="Max USD" className="!h-7 !w-24 text-[9px]" />
                    <label className="inline-flex items-center gap-1 text-[9px] font-bold text-[#6c7683]">
                      <input type="checkbox" checked={missingOnly} onChange={(event) => setMissingOnly(event.target.checked)} /> Missing price
                    </label>
                    <details className="relative">
                      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-lg px-2 py-1 text-[9px] font-bold text-[#6c7683] hover:bg-[#f7f9fb]"><Columns3 size={12} /> Columns</summary>
                      <div className="absolute right-0 top-7 z-30 w-44 rounded-xl border border-[#e4e8ed] bg-white p-2 shadow-xl">
                        {variantColumns(attributes).map((column) => (
                          <label key={column.key} className="flex cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 text-[9px] font-semibold text-[#3c4553]">
                            <input
                              type="checkbox"
                              checked={!hiddenColumns.includes(column.key)}
                              onChange={() => setHiddenColumns((current) => current.includes(column.key) ? current.filter((key) => key !== column.key) : [...current, column.key])}
                            />
                            {column.label}
                          </label>
                        ))}
                      </div>
                    </details>
                  </span>
                </div>

                {view === "matrix" ? (
                  <div data-pricing-matrix className="px-4 py-3 sm:px-5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <AdminSelect aria-label="Choose a specification" value={matrixSpec?.key ?? ""} onChange={(event) => setMatrixSpecKey(event.target.value)} className="!h-8 !w-[15rem] shrink-0 text-[10px]">
                        {groups.map((group) => <option key={group.key} value={group.key}>{group.label}</option>)}
                      </AdminSelect>
                      <AdminSelect aria-label="Matrix rows" value={rowAttribute?.key ?? ""} onChange={(event) => setMatrixRowKey(event.target.value)} className="!h-8 !w-[10rem] shrink-0 text-[10px]">
                        {columnAttributes.map((attribute) => <option key={attribute.key} value={attribute.key}>Rows: {attribute.label}</option>)}
                      </AdminSelect>
                      <AdminInput value={bulkKs} onChange={(event) => setBulkKs(event.target.value)} aria-label="MMK for every cell" placeholder="MMK" className="!h-8 !w-24 text-[10px]" />
                      <AdminInput value={bulkUsd} onChange={(event) => setBulkUsd(event.target.value)} aria-label="USD for every cell" placeholder="USD" className="!h-8 !w-24 text-[10px]" />
                      <AdminButton variant="ghost" onClick={copyToSizes}>Copy to cells</AdminButton>
                      <AdminInput value={newSize} onChange={(event) => setNewSize(event.target.value)} aria-label="New size" placeholder="New size" className="!h-8 !w-24 text-[10px]" />
                      <AdminButton variant="ghost" onClick={addSize}><Plus size={12} /> Add size</AdminButton>
                      <AdminSelect
                        aria-label="Remove a size"
                        value=""
                        onChange={(event) => { if (event.target.value) removeSize(event.target.value); }}
                        className="!h-8 !w-[9.5rem] text-[10px]"
                      >
                        <option value="">Remove size…</option>
                        {matrixSizes.map((size) => <option key={size} value={size}>{size}</option>)}
                      </AdminSelect>
                    </div>
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full min-w-[560px] border-collapse text-[10px]">
                        <thead className="text-[9px] uppercase tracking-wide text-[#87909b]">
                          <tr>
                            <th className="px-2 py-1.5 text-left font-bold">{rowAttribute?.label ?? "Specification"}</th>
                            {matrixSizes.map((size) => <th key={size} className="px-2 py-1.5 text-left font-bold">{size}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {matrixRowOptions.map((option) => {
                            const cells = matrixSizes.map((size) => matrix.find((row) => row.options[rowAttribute!.key] === option && row.size === size) ?? null);
                            return (
                              <tr key={option} data-pricing-matrix-row={option} className="border-t border-[#f2f4f6]">
                                <td className="px-2 py-1.5 font-bold text-[#333c49]">{option}</td>
                                {cells.map((row, index) => (
                                  <td key={`${option}-${matrixSizes[index]}`} className="px-1 py-1">
                                    {row ? (
                                      <div className="space-y-1">
                                        <input
                                          aria-label={`MMK ${option} ${row.size}`}
                                          data-pricing-matrix-kmk={row.key}
                                          inputMode="numeric"
                                          placeholder="—"
                                          value={cellValue(row).ks}
                                          onChange={(event) => editCell(row, { ks: event.target.value })}
                                          className={`h-7 w-24 rounded-md border bg-white px-1.5 text-right text-[9px] font-bold tabular-nums outline-none focus:border-[#a5d972] ${hasFullPrice(row) ? "border-[#e6e9ed] text-[#252c37]" : "border-[#e05252] text-[#a53232]"}`}
                                        />
                                        <input
                                          aria-label={`USD ${option} ${row.size}`}
                                          data-pricing-matrix-usd={row.key}
                                          inputMode="decimal"
                                          placeholder="$—"
                                          value={cellValue(row).usd}
                                          onChange={(event) => editCell(row, { usd: event.target.value })}
                                          className={`h-7 w-24 rounded-md border bg-white px-1.5 text-right text-[9px] font-bold tabular-nums outline-none focus:border-[#a5d972] ${row.priceUsd === null ? "border-[#e05252] text-[#a53232]" : "border-[#e6e9ed] text-[#252c37]"}`}
                                        />
                                      </div>
                                    ) : <span className="text-[9px] text-[#c3c9d0]">—</span>}
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {!matrix.length ? <p className="px-2 py-4 text-center text-[10px] text-[#87909b]">No size for this specification.</p> : null}
                    <p className="mt-1 text-[9px] text-[#87909b]">Each cell holds both currencies; a red border is a missing price. Changes stay staged until you save.</p>
                  </div>
                ) : (
                  <div data-pricing-table-view className="overflow-x-auto">
                    <table className="w-full min-w-[980px] border-collapse text-[10px]">
                      <thead className="sticky top-0 z-10 bg-[#f8f9fb] text-[9px] uppercase tracking-wide text-[#87909b]">
                        <tr>
                          <th className="w-8 px-2 py-2 text-left"> </th>
                          {columns.map((column) => <th key={column.key} className="px-2 py-2 text-left font-bold">{column.label}</th>)}
                          <th className="px-2 py-2 text-left font-bold">MMK</th>
                          <th className="px-2 py-2 text-left font-bold">USD</th>
                          <th className="px-2 py-2 text-left font-bold">Availability</th>
                          <th className="px-2 py-2 text-left font-bold">Status</th>
                          <th className="px-2 py-2 text-left font-bold">Updated</th>
                          <th className="px-2 py-2 text-right font-bold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paged.map((row) => {
                          const cell = cellValue(row);
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
                                  aria-label={`MMK ${row.key}`}
                                  data-pricing-price={row.key}
                                  inputMode="numeric"
                                  placeholder="—"
                                  value={cell.ks}
                                  onChange={(event) => editCell(row, { ks: event.target.value })}
                                  className={`h-8 w-24 rounded-md border bg-white px-2 text-right text-[10px] font-bold tabular-nums outline-none focus:border-[#a5d972] ${row.priceKs === null ? "border-[#e05252] text-[#a53232]" : "border-[#e6e9ed] text-[#252c37]"}`}
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <input
                                  aria-label={`USD ${row.key}`}
                                  data-pricing-usd={row.key}
                                  inputMode="decimal"
                                  placeholder="$—"
                                  value={cell.usd}
                                  onChange={(event) => editCell(row, { usd: event.target.value })}
                                  className={`h-8 w-20 rounded-md border bg-white px-2 text-right text-[10px] font-bold tabular-nums outline-none focus:border-[#a5d972] ${row.priceUsd === null ? "border-[#e05252] text-[#a53232]" : "border-[#e6e9ed] text-[#252c37]"}`}
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <select
                                  aria-label={`Availability ${row.key}`}
                                  data-pricing-availability={row.key}
                                  value={row.availability}
                                  onChange={(event) => setAvailability([row], event.target.value as AdminAvailability)}
                                  className={`h-7 rounded-md border border-[#e6e9ed] bg-white px-1 text-[9px] font-bold ${availabilityTone(row.effectiveAvailability)}`}
                                >
                                  {AVAILABILITY_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
                                </select>
                              </td>
                              <td className="px-2 py-1.5">
                                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${row.status === "Disabled" ? "bg-[#f1f3f5] text-[#6c7683]" : !hasFullPrice(row) ? "bg-[#fff4e0] text-[#8a6a00]" : "bg-[#eef8e6] text-[#3f8c22]"}`}>
                                  {row.status === "Disabled" ? "Disabled" : hasFullPrice(row) ? "Active" : "Missing price"}
                                </span>
                              </td>
                              <td className="px-2 py-1.5 text-[9px] text-[#87909b]">{row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : "—"}</td>
                              <td className="px-2 py-1.5 text-right">
                                <button type="button" aria-label={`Edit ${row.key}`} onClick={() => setEditing(row)} className="rounded p-1 text-[#6c7683] hover:bg-[#f3f5f7]"><Pencil size={12} /></button>
                                <button type="button" aria-label={`Duplicate ${row.key}`} onClick={() => duplicateVariant(row)} className="rounded p-1 text-[#6c7683] hover:bg-[#f3f5f7]"><CopyPlus size={12} /></button>
                                <button type="button" aria-label={`${row.status === "Disabled" ? "Enable" : "Disable"} ${row.key}`} onClick={() => setAvailability([row], row.status === "Disabled" ? "Available" : "Disabled")} className="rounded p-1 text-[#6c7683] hover:bg-[#f3f5f7]"><Check size={12} /></button>
                                <button type="button" aria-label={`Delete ${row.key}`} onClick={() => deleteVariant(row)} className="rounded p-1 text-[#b4463c] hover:bg-[#fdf1f1]"><Trash2 size={12} /></button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {!filteredRows.length ? <p className="px-4 py-6 text-center text-[10px] text-[#87909b]">No variant matches this view.</p> : null}
                  </div>
                )}

                {selected.size ? (
                  <div className="flex flex-wrap items-center gap-1.5 border-t border-[#f0f2f4] px-4 py-2 sm:px-5">
                    <span className="text-[10px] font-bold text-[#3c4553]">{selected.size} selected</span>
                    {(["Available", "Out of Stock", "Temporarily Unavailable", "Disabled"] as AdminAvailability[]).map((state) => (
                      <AdminButton key={state} variant="ghost" onClick={() => setAvailability(selectedRows, state)}>{state}</AdminButton>
                    ))}
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
          <div data-pricing-spec-sheet>
            <AdminPriceTable embedded />
          </div>
        ) : null}

        {tab === "history" ? (
          <AdminCard className="overflow-hidden">
            <AdminCardHeader title="Price History" description="Every price and availability change, newest first. Nothing is deleted." />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-[10px]">
                <thead className="sticky top-0 bg-[#f8f9fb] text-[9px] uppercase tracking-wide text-[#87909b]">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold">Product</th>
                    <th className="px-3 py-2 text-left font-bold">Variant</th>
                    <th className="px-3 py-2 text-right font-bold">Old MMK</th>
                    <th className="px-3 py-2 text-right font-bold">New MMK</th>
                    <th className="px-3 py-2 text-right font-bold">Old USD</th>
                    <th className="px-3 py-2 text-right font-bold">New USD</th>
                    <th className="px-3 py-2 text-left font-bold">Availability</th>
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
                      <td className="px-3 py-1.5 text-right tabular-nums text-[#6c7683]">{entry.oldPriceUsd === null || entry.oldPriceUsd === undefined ? "—" : `$${entry.oldPriceUsd.toFixed(2)}`}</td>
                      <td className="px-3 py-1.5 text-right font-bold tabular-nums text-[#3f8c22]">{entry.newPriceUsd === null || entry.newPriceUsd === undefined ? "—" : `$${entry.newPriceUsd.toFixed(2)}`}</td>
                      <td className="px-3 py-1.5">
                        {entry.newAvailability ? <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${availabilityTone(entry.newAvailability)}`}>{entry.newAvailability}</span> : "—"}
                      </td>
                      <td className="px-3 py-1.5 text-[#6c7683]">{entry.actor}</td>
                      <td className="px-3 py-1.5 text-[#87909b]">{new Date(entry.at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!history.length ? <p className="px-4 py-6 text-center text-[10px] text-[#87909b]">No change matches “{search}”.</p> : null}
            </div>
          </AdminCard>
        ) : null}

        {tab === "attributes" ? (
          <div className="space-y-3">
            <AdminCard className="overflow-hidden">
              <AdminCardHeader title="Attribute Management" description="Add options, rename, switch off or reorder. A change reaches every product's table at once." />
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
                        className="h-8 w-40 rounded-md border border-[#e6e9ed] bg-white px-2 text-[10px] font-bold text-[#333c49]"
                      />
                      <label className="inline-flex items-center gap-1 text-[9px] font-bold text-[#6c7683]">
                        <input type="checkbox" checked={attribute.enabled} onChange={(event) => patchAttribute(attribute.key, { enabled: event.target.checked })} /> Enabled
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
                        className="h-6 w-24 rounded-full border border-dashed border-[#d8dde3] bg-white px-2 text-[9px] font-semibold outline-none focus:border-[#a5d972]"
                      />
                      <button type="button" onClick={() => addOption(attribute.key)} className="text-[9px] font-bold text-[#3f8c22]">Add</button>
                    </div>
                  </li>
                ))}
              </ul>
            </AdminCard>
            <AdminCard className="overflow-hidden">
              <AdminCardHeader title="Per-product option availability" description="Stop selling one option (a colour, a size) without disabling its variants one by one." />
              <ul className="divide-y divide-[#f0f2f4]">
                {attributes.filter((attribute) => attribute.key !== "size").map((attribute) => (
                  <li key={attribute.key} className="px-4 py-2 sm:px-5">
                    <p className="text-[10px] font-bold text-[#333c49]">{attribute.label}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {attribute.options.map((option) => {
                        const state = data.optionAvailability?.[product?.id ?? ""]?.[attribute.key]?.[option] ?? "Available";
                        return (
                          <label key={option} className="inline-flex items-center gap-1 rounded-full border border-[#e4e8ed] bg-white px-1.5 py-0.5 text-[9px] font-bold text-[#6c7683]">
                            {option}
                            <select
                              aria-label={`Availability of ${option}`}
                              value={state}
                              onChange={(event) => {
                                if (!product) return;
                                updateAdminData((current) => setOptionAvailability(current, product.id, attribute.key, option, event.target.value as AdminAvailability));
                                setMessage(`${attribute.label} ${option} set to ${event.target.value}.`);
                              }}
                              className={`rounded border-0 bg-transparent text-[9px] font-bold ${availabilityTone(state)}`}
                            >
                              {AVAILABILITY_STATES.map((value) => <option key={value} value={value}>{value}</option>)}
                            </select>
                          </label>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ul>
              {!product ? null : <p className="px-4 pb-2 text-[9px] text-[#87909b] sm:px-5">Showing options for {product.name}.</p>}
            </AdminCard>
            <AdminCard className="overflow-hidden">
              <AdminCardHeader title="Add an attribute" description="It appears in every product's specification list, off until you switch it on." />
              <div className="flex flex-wrap items-center gap-1.5 px-4 py-3 sm:px-5">
                <AdminInput value={newAttribute.label} onChange={(event) => setNewAttribute((current) => ({ ...current, label: event.target.value }))} aria-label="New attribute label" placeholder="Label (e.g. Pattern)" className="!h-8 !w-40 text-[10px]" />
                <AdminInput value={newAttribute.options} onChange={(event) => setNewAttribute((current) => ({ ...current, options: event.target.value }))} aria-label="New attribute options" placeholder="Options, comma separated" className="!h-8 !w-56 text-[10px]" />
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
                Every price is manual — an attribute never changes the number the owner typed — and a variant
                without both currencies is Missing Price, never sold.
              </p>
            </AdminCard>
          </div>
        ) : null}
      </div>

      {editing ? (
        <VariantEditor
          row={editing}
          productName={product?.name ?? ""}
          stockOn={product ? stockTrackingOn(data, product.id) : false}
          onClose={() => setEditing(null)}
          onSave={saveEditor}
        />
      ) : null}
    </AdminShell>
  );
}
