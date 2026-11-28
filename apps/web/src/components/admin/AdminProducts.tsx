"use client";

import { useMemo, useState } from "react";
import { Archive, Check, Package, Pencil, Plus, Search, Trash2 } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import {
  AdminBadge, AdminButton, AdminCard, AdminDrawer, AdminEmpty, AdminField,
  AdminInput, AdminSelect, type AdminTone,
} from "@/components/admin/AdminUi";
import { updateAdminData, useAdminDemoData } from "@/lib/admin-demo-store";
import { matchesSearchQuery } from "@/lib/search-text";
import {
  APPAREL_CATEGORIES, APPAREL_SIZES, ONE_SIZE, PRODUCT_TAG_LIMIT, formatKs, parseProductTags, productDraftFrom,
  productFromDraft, removeProduct, upsertProduct, validateProductDraft,
  type AdminProduct, type AdminProductCategory, type AdminProductDraft, type AdminProductStatus,
} from "@/lib/admin-demo-data";
import { draftWithTablePrice, templatePrices, type ProductSheetPrice } from "@/lib/price-table";
import {
  SIZE_CHART_MEASURES, SIZE_CHART_MEASURE_LABEL, normalizeSizeChart, setSizeChartCell, type ProductSizeChart,
} from "@/lib/size-chart";

const CATEGORIES: AdminProductCategory[] = ["T-Shirt", "Hoodie", "Polo", "Jersey", "Cap", "Accessory"];
const STATUSES: AdminProductStatus[] = ["Active", "Draft", "Archived"];

const STATUS_TONES: Record<AdminProductStatus, AdminTone> = {
  Active: "green",
  Draft: "amber",
  Archived: "slate",
};

/**
 * The prices this product inherits, read from the Price Table — nothing is typed here. A new product
 * copies the sheet of the first priced product in its category; the owner can reprice it afterwards.
 */
function PriceFromTable({ prices, category }: { prices: ProductSheetPrice[]; category: AdminProductCategory }) {
  const priced = prices.filter((cell) => cell.priceKs !== null);
  const lowest = priced.length ? Math.min(...priced.map((cell) => cell.priceKs ?? 0)) : null;
  return (
    <div data-product-price-from-table={category}>
      {priced.length ? (
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[#e6e9ed] bg-white px-2.5 py-2">
          {priced.map((cell) => (
            <span key={cell.size} className="inline-flex items-center gap-1 rounded-full bg-[#f1f8e9] px-2 py-1 text-[10px] font-bold text-[#3f8c22]">
              {cell.size} <span className="tabular-nums">{formatKs(cell.priceKs ?? 0)}</span>
            </span>
          ))}
        </div>
      ) : (
        <p data-product-price-missing className="rounded-xl border border-[#f2d58a] bg-[#fff9e6] px-2.5 py-2 text-[10px] font-semibold text-[#8a6a00]">
          No {category} product is priced yet.{" "}
          <a href="/admin/price-table" className="font-bold underline">Fill the Price Table</a> first, then post this product.
        </p>
      )}
      <p className="mt-1 text-[9px] leading-4 text-[#87909b]">
        Copied from <a href="/admin/price-table" className="font-semibold text-[#3f8c22] hover:underline">Admin → Price Table</a>
        {lowest === null ? "" : `; the product is listed from ${formatKs(lowest)}`} and every size sells at its own sheet price. Reprice it on its own sheet afterwards.
      </p>
    </div>
  );
}

export default function AdminProducts() {
  const data = useAdminDemoData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdminProductStatus | "All">("All");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AdminProductDraft | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [chart, setChart] = useState<ProductSizeChart>({});

  const query = search;
  const editing = editingId ? data.products.find((product) => product.id === editingId) ?? null : null;
  const filtered = useMemo(() => data.products.filter((product) => (
    (statusFilter === "All" || product.status === statusFilter)
    && matchesSearchQuery(`${product.name} ${product.category} ${product.fabric} ${product.tags.join(" ")}`, query)
  )), [data.products, statusFilter, query]);

  function startCreate() {
    setEditingId("new");
    setDraft(productDraftFrom());
    setChart({});
    setErrors([]);
  }

  function startEdit(product: AdminProduct) {
    setEditingId(product.id);
    setDraft(productDraftFrom(product));
    setChart(product.sizeChart ?? {});
    setErrors([]);
  }

  function closeEditor() {
    setEditingId(null);
    setDraft(null);
    setChart({});
    setErrors([]);
  }

  function save() {
    if (!draft) return;
    // Posting never types a price: the Price Table decides it (the category template's lowest price).
    const priced = draftWithTablePrice(draft, data);
    const found = validateProductDraft(priced);
    if (found.length) {
      setErrors(found);
      return;
    }
    const product = { ...productFromDraft(priced, editing ?? undefined), sizeChart: normalizeSizeChart(chart) };
    // The new product's own sheet starts from the template, so the Price Table can reprice it alone.
    const template = templatePrices(data, draft.category);
    const seed = (current: typeof data, saved: AdminProduct) => {
      const kept = current.productPrices.filter((row) => row.productId !== saved.id);
      const rows = saved.sizes.map((size) => ({
        productId: saved.id,
        size,
        priceKs: template.find((cell) => cell.size === size)?.priceKs ?? saved.priceKs,
        version: 1,
        updatedBy: "Owner",
        updatedAt: new Date().toISOString(),
      }));
      return [...kept, ...rows];
    };
    updateAdminData((current) => {
      const next = upsertProduct(current, product);
      const created = editing === null;
      return created ? { ...next, productPrices: seed(next, product) } : next;
    });
    closeEditor();
  }

  function setStatus(product: AdminProduct, status: AdminProductStatus) {
    updateAdminData((current) => upsertProduct(current, { ...product, status }));
  }

  function remove(product: AdminProduct) {
    if (confirmId !== product.id) {
      setConfirmId(product.id);
      return;
    }
    updateAdminData((current) => removeProduct(current, product.id));
    setConfirmId(null);
  }

  return (
    <AdminShell
      active="products"
      title="Products"
      description="Create, price and publish the print-on-demand catalog. Prices are stored in Ks."
      actions={<AdminButton onClick={startCreate}><Plus size={14} /> New product</AdminButton>}
      search={(
        <label className="flex h-10 w-full max-w-[420px] items-center gap-2.5 rounded-full border border-[#e6e9ed] bg-[#f8f9fb] px-3.5 text-[#8c95a1] focus-within:border-[#a5d972] focus-within:bg-white">
          <Search size={16} className="shrink-0" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search products" placeholder="Search product, category or fabric..." className="min-w-0 flex-1 bg-transparent text-[11px] text-[#252c37] outline-none placeholder:text-[#9da5af]" />
        </label>
      )}
    >
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter products by status">
        {(["All", ...STATUSES] as (AdminProductStatus | "All")[]).map((status) => {
          const count = status === "All" ? data.products.length : data.products.filter((product) => product.status === status).length;
          return (
            <button
              key={status}
              type="button"
              aria-pressed={statusFilter === status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-full border px-2.5 py-1 text-[9px] font-bold transition-colors ${statusFilter === status ? "border-[#4cae22] bg-[#eef8e6] text-[#3f8c22]" : "border-[#e4e8ed] bg-white text-[#6c7683] hover:bg-[#f7f9fb]"}`}
            >
              {status} <span className="ml-1 text-[8px] opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      <AdminCard className="mt-3 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[10px]">
            <thead className="bg-[#fafbfc] text-[9px] font-semibold text-[#828c99]">
              <tr>
                <th className="px-4 py-2.5 font-semibold sm:px-5">Product</th>
                <th className="px-3 py-2.5 font-semibold">Category</th>
                <th className="px-3 py-2.5 font-semibold">Fabric</th>
                <th className="px-3 py-2.5 font-semibold">GSM</th>
                <th className="px-3 py-2.5 font-semibold">Sizes</th>
                <th className="px-3 py-2.5 font-semibold">Price</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 text-right font-semibold sm:px-5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f2f4]">
              {filtered.length ? filtered.map((product) => (
                <tr key={product.id} className="hover:bg-[#fafbfc]">
                  <td className="px-4 py-2.5 sm:px-5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#eef1f5]"><Package size={17} className="text-[#5e6b77]" /></span>
                      <span className="min-w-0">
                        <span className="block font-bold text-[#303844]">{product.name}</span>
                        <span className="mt-0.5 block text-[8px] text-[#7b8492]">{product.designName}</span>
                        <span className="mt-0.5 block text-[8px] text-[#919aa6]">{product.id}</span>
                        {product.tags.length ? <span data-product-tags className="mt-0.5 block text-[8px] text-[#4cae22]">{product.tags.join(" · ")}</span> : null}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[#727d8a]">{product.category}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[#727d8a]">{product.fabric}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[#727d8a]">{product.gsm ? `${product.gsm} GSM` : "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[#727d8a]">{product.sizes.join(" · ")}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-[#394250]">{formatKs(product.priceKs)}</td>
                  <td className="px-3 py-2.5"><AdminBadge tone={STATUS_TONES[product.status]}>{product.status}</AdminBadge></td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right sm:px-5">
                    <div className="inline-flex items-center gap-1.5">
                      <AdminButton compact variant="secondary" onClick={() => startEdit(product)} aria-label={`Edit ${product.name}`}><Pencil size={12} /> Edit</AdminButton>
                      {product.status === "Archived" ? (
                        <AdminButton compact variant="ghost" onClick={() => setStatus(product, "Active")} aria-label={`Restore ${product.name}`}><Check size={12} /> Restore</AdminButton>
                      ) : (
                        <AdminButton compact variant="ghost" onClick={() => setStatus(product, "Archived")} aria-label={`Archive ${product.name}`}><Archive size={12} /> Archive</AdminButton>
                      )}
                      <AdminButton compact variant="danger" onClick={() => remove(product)} aria-label={`Delete ${product.name}`}><Trash2 size={12} /> {confirmId === product.id ? "Confirm" : "Delete"}</AdminButton>
                    </div>
                  </td>
                </tr>
              )) : <tr><td colSpan={8}><AdminEmpty title="No products match this filter" description="Try a different search or status." /></td></tr>}
            </tbody>
          </table>
        </div>
      </AdminCard>

      <AdminDrawer
        open={Boolean(editingId && draft)}
        title={editingId === "new" ? "New product" : `Edit ${editing?.name ?? "product"}`}
        description="Catalog entries drive the editor product picker and the storefront cards."
        onClose={closeEditor}
        footer={(
          <div className="flex items-center justify-end gap-2">
            <AdminButton variant="secondary" onClick={closeEditor}>Cancel</AdminButton>
            <AdminButton onClick={save}>{editingId === "new" ? "Create product" : "Save changes"}</AdminButton>
          </div>
        )}
      >
        {draft ? (
          <div className="space-y-4">
            {errors.length ? (
              <ul className="space-y-1 rounded-xl border border-[#f3d2d4] bg-[#fff6f6] px-3 py-2 text-[9px] font-semibold text-[#c9424a]">
                {errors.map((error) => <li key={error}>{error}</li>)}
              </ul>
            ) : null}
            <AdminField label="Product name">
              <AdminInput value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Classic T-shirt" aria-label="Product name" />
            </AdminField>
            <div className="rounded-xl border border-[#eef1f5] bg-[#fbfcfd] p-3" data-product-design>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#7b8492]">Design</p>
              <p className="mb-2 mt-0.5 text-[9px] leading-4 text-[#87909b]">
                The artwork is posted together with the product, so there is no separate design post.
              </p>
              <div className="space-y-2">
                <AdminField label="Design name">
                  <AdminInput value={draft.designName} onChange={(event) => setDraft({ ...draft, designName: event.target.value })} placeholder="Street Vibes" aria-label="Design name" />
                </AdminField>
                <AdminField label="Artwork file URL" hint="Optional. The mockup prints this SVG; a product without one shows the plain garment.">
                  <AdminInput value={draft.designSvgUrl} onChange={(event) => setDraft({ ...draft, designSvgUrl: event.target.value })} placeholder="https://…/art.svg" aria-label="Artwork file URL" />
                </AdminField>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <AdminField label="Category">
                <AdminSelect value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as AdminProductCategory })} aria-label="Category">
                  {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                </AdminSelect>
              </AdminField>
              <AdminField label="Status">
                <AdminSelect value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as AdminProductStatus })} aria-label="Status">
                  {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                </AdminSelect>
              </AdminField>
            </div>
            <AdminField label="Tags" hint={`Up to ${PRODUCT_TAG_LIMIT}, comma separated. The shop search matches them.`}>
              <AdminInput value={draft.tags} onChange={(event) => setDraft({ ...draft, tags: event.target.value })} placeholder="unisex, summer, streetwear" aria-label="Tags" />
            </AdminField>
            {parseProductTags(draft.tags).length ? (
              <div data-product-tag-preview className="flex flex-wrap gap-1.5">
                {parseProductTags(draft.tags).map((tag) => <span key={tag} className="rounded-full bg-[#eef8e6] px-2 py-0.5 text-[9px] font-bold text-[#3f8c22]">{tag}</span>)}
              </div>
            ) : null}
            <AdminField label="Fabric">
              <AdminInput value={draft.fabric} onChange={(event) => setDraft({ ...draft, fabric: event.target.value })} placeholder="Combed Cotton" aria-label="Fabric" />
            </AdminField>
            <div className="grid grid-cols-2 gap-3">
              <AdminField label="GSM" hint={APPAREL_CATEGORIES.includes(draft.category) ? "Required for apparel" : "Not used for this category"}>
                <AdminInput value={draft.gsm} onChange={(event) => setDraft({ ...draft, gsm: event.target.value })} inputMode="numeric" placeholder="180" aria-label="GSM" disabled={!APPAREL_CATEGORIES.includes(draft.category)} />
              </AdminField>
              <AdminField label="Price (Ks)">
                <PriceFromTable prices={templatePrices(data, draft.category)} category={draft.category} />
              </AdminField>
            </div>
            <p className="rounded-xl bg-[#f7f9fb] px-3 py-2 text-[9px] leading-4 text-[#87909b]">
              Apparel gets the standard size run (S–2XL); caps and accessories use a single size. Stock per size is managed in Inventory.
            </p>
            <div data-size-chart-editor>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#7b8492]">Size chart (cm)</p>
              <p className="mb-2 mt-0.5 text-[9px] leading-4 text-[#87909b]">
                Measure the finished garment flat. Leave a cell blank if it does not apply; the product page shows only what is filled.
              </p>
              <table className="w-full text-left text-[10px]">
                <thead className="text-[9px] text-[#828c99]">
                  <tr>
                    <th className="pb-1 pr-2 font-semibold">Size</th>
                    {SIZE_CHART_MEASURES.map((measure) => <th key={measure} className="pb-1 pr-2 font-semibold">{SIZE_CHART_MEASURE_LABEL[measure]}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {(APPAREL_CATEGORIES.includes(draft.category) ? APPAREL_SIZES : ONE_SIZE).map((size) => (
                    <tr key={size}>
                      <td className="py-1 pr-2 font-bold text-[#394250]">{size}</td>
                      {SIZE_CHART_MEASURES.map((measure) => (
                        <td key={measure} className="py-1 pr-2">
                          <AdminInput
                            value={chart[size]?.[measure] === undefined ? "" : String(chart[size][measure])}
                            onChange={(event) => {
                              const raw = event.target.value.trim();
                              setChart((current) => setSizeChartCell(current, size, measure, raw === "" ? null : Number(raw)));
                            }}
                            inputMode="decimal"
                            placeholder="—"
                            aria-label={`${size} ${SIZE_CHART_MEASURE_LABEL[measure]} in cm`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-1 text-[9px] text-[#87909b]">
                {Object.keys(chart).length ? `${Object.keys(chart).length} size${Object.keys(chart).length === 1 ? "" : "s"} measured` : "No measurements yet — the product page says so instead of guessing."}
              </p>
            </div>
          </div>
        ) : null}
      </AdminDrawer>
    </AdminShell>
  );
}
