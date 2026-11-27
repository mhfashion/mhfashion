"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, FileUp, Newspaper, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import {
  AdminBadge, AdminButton, AdminCard, AdminDrawer, AdminEmpty, AdminField,
  AdminInput, AdminSelect, AdminTextarea, type AdminTone,
} from "@/components/admin/AdminUi";
import { updateAdminData, useAdminDemoData } from "@/lib/admin-demo-store";
import {
  emptyTshirtPriceRow, formatAdminDate, formatKs, reconcileTshirtPriceRows,
  removeTshirtPost, tshirtCombinationLabel, tshirtDraftAttributes, tshirtPostDraftFrom,
  tshirtPostFromDraft, tshirtPostFromPriceKs, upsertTshirtPost, validateTshirtPostDraft,
  type AdminPostStatus, type AdminTshirtPost, type AdminTshirtPostAttributeKey,
  type AdminTshirtPostDraft,
} from "@/lib/admin-demo-data";
import { chainAsPostAttributes } from "@/lib/admin-attributes";
import { GUIDE_STARTER_CATALOG } from "@/lib/guide-starter";
import { guideProductLinkSummary } from "@/lib/guide-products";
import { storePostSvg } from "@/lib/post-assets";
import { matchesSearchQuery } from "@/lib/search-text";

type PostTab = "guide" | "tshirt" | "nyein";

const TABS: { id: PostTab; label: string }[] = [
  { id: "guide", label: "Guide posts" },
  { id: "tshirt", label: "T-shirt posts" },
  { id: "nyein", label: "Nyein posts" },
];

function isPostTab(value: string | null): value is PostTab {
  return value === "guide" || value === "tshirt" || value === "nyein";
}

const STATUSES: AdminPostStatus[] = ["Draft", "Published"];

const STATUS_TONES: Record<AdminPostStatus, AdminTone> = {
  Draft: "amber",
  Published: "green",
};

export default function AdminPosts() {
  const data = useAdminDemoData();
  const requestedTab = useSearchParams().get("tab");
  const [tab, setTab] = useState<PostTab>(isPostTab(requestedTab) ? requestedTab : "tshirt");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdminPostStatus | "All">("All");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AdminTshirtPostDraft | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [svgError, setSvgError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const query = search;
  const editing = editingId ? data.tshirtPosts.find((post) => post.id === editingId) ?? null : null;
  const filtered = useMemo(() => data.tshirtPosts.filter((post) => (
    (statusFilter === "All" || post.status === statusFilter)
    && matchesSearchQuery(`${post.title} ${post.description}`, query)
  )), [data.tshirtPosts, statusFilter, query]);
  const guidePosts = GUIDE_STARTER_CATALOG.posts;
  const activeAttributes = draft ? tshirtDraftAttributes(draft) : [];

  function startCreate() {
    setEditingId("new");
    setDraft(tshirtPostDraftFrom(undefined, chainAsPostAttributes(data)));
    setErrors([]);
    setSvgError(null);
  }

  function startEdit(post: AdminTshirtPost) {
    setEditingId(post.id);
    setDraft(tshirtPostDraftFrom(post, chainAsPostAttributes(data)));
    setErrors([]);
    setSvgError(null);
  }

  function closeEditor() {
    setEditingId(null);
    setDraft(null);
    setErrors([]);
    setSvgError(null);
  }

  function save() {
    if (!draft) return;
    const found = validateTshirtPostDraft(draft);
    if (found.length) {
      setErrors(found);
      return;
    }
    const post = tshirtPostFromDraft(draft, editing ?? undefined);
    updateAdminData((current) => upsertTshirtPost(current, post));
    closeEditor();
  }

  function remove(post: AdminTshirtPost) {
    if (confirmId !== post.id) {
      setConfirmId(post.id);
      return;
    }
    updateAdminData((current) => removeTshirtPost(current, post.id));
    setConfirmId(null);
  }

  async function attachSvg(file: File | undefined) {
    if (!file || !draft) return;
    try {
      const stored = await storePostSvg(file);
      setSvgError(null);
      setDraft((current) => (current ? { ...current, svg: stored } : current));
    } catch (error) {
      setSvgError(error instanceof Error ? error.message : "That file could not be read.");
    }
  }

  // Every attribute or option change re-checks the price rows, so a row never keeps a value
  // that is no longer offered and each combination stays complete.
  function updateAttributes(next: AdminTshirtPostDraft["attributes"]) {
    if (!draft) return;
    const attributes = next.filter((attribute) => attribute.enabled && attribute.options.length > 0);
    setDraft({ ...draft, attributes: next, prices: reconcileTshirtPriceRows(attributes, draft.prices) });
  }

  function toggleAttribute(key: AdminTshirtPostAttributeKey) {
    if (!draft) return;
    updateAttributes(draft.attributes.map((attribute) => (
      attribute.key === key ? { ...attribute, enabled: !attribute.enabled } : attribute
    )));
  }

  function toggleOption(key: AdminTshirtPostAttributeKey, option: string) {
    if (!draft) return;
    updateAttributes(draft.attributes.map((attribute) => {
      if (attribute.key !== key) return attribute;
      const ticked = attribute.options.includes(option);
      const options = ticked ? attribute.options.filter((entry) => entry !== option) : [...attribute.options, option];
      return { ...attribute, options: options.length ? options : attribute.options };
    }));
  }

  function setRowOption(rowId: string, key: AdminTshirtPostAttributeKey, value: string) {
    if (!draft) return;
    setDraft({
      ...draft,
      prices: draft.prices.map((row) => (row.id === rowId ? { ...row, options: { ...row.options, [key]: value } } : row)),
    });
  }

  function setRowPrice(rowId: string, priceKs: string) {
    if (!draft) return;
    setDraft({ ...draft, prices: draft.prices.map((row) => (row.id === rowId ? { ...row, priceKs } : row)) });
  }

  function addRow() {
    if (!draft || !activeAttributes.length) return;
    setDraft({ ...draft, prices: [...draft.prices, emptyTshirtPriceRow(activeAttributes)] });
  }

  function removeRow(rowId: string) {
    if (!draft) return;
    setDraft({ ...draft, prices: draft.prices.filter((row) => row.id !== rowId) });
  }

  return (
    <AdminShell
      active="posts"
      title="Posts"
      description="Guide articles, T-shirt drops and the Nyein collection, from one place."
      actions={tab === "tshirt" ? <AdminButton onClick={startCreate}><Plus size={14} /> New T-shirt post</AdminButton> : undefined}
      search={tab === "tshirt" ? (
        <label className="flex h-10 w-full max-w-[420px] items-center gap-2.5 rounded-full border border-[#e6e9ed] bg-[#f8f9fb] px-3.5 text-[#8c95a1] focus-within:border-[#a5d972] focus-within:bg-white">
          <Search size={16} className="shrink-0" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search posts" placeholder="Search T-shirt posts..." className="min-w-0 flex-1 bg-transparent text-[11px] text-[#252c37] outline-none placeholder:text-[#9da5af]" />
        </label>
      ) : undefined}
    >
      <div role="tablist" aria-label="Post types" className="flex flex-wrap gap-1.5">
        {TABS.map((entry) => {
          const count = entry.id === "guide"
            ? guidePosts.length
            : entry.id === "tshirt"
              ? data.tshirtPosts.length
              : 0;
          const selected = tab === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={selected}
              data-post-tab={entry.id}
              onClick={() => setTab(entry.id)}
              className={`rounded-full border px-3 py-1.5 text-[10px] font-bold transition-colors ${selected ? "border-[#4cae22] bg-[#eef8e6] text-[#3f8c22]" : "border-[#e4e8ed] bg-white text-[#6c7683] hover:bg-[#f7f9fb]"}`}
            >
              {entry.label} <span className="ml-1 text-[8px] opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {tab === "guide" ? (
        <AdminCard className="mt-3 overflow-hidden">
          <ul className="divide-y divide-[#f0f2f4]">
            {guidePosts.map((post) => (
              <li key={post.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#eef1f5]"><Newspaper size={16} className="text-[#5e6b77]" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-bold text-[#303844]">{post.title}</span>
                  <span className="mt-0.5 block truncate text-[9px] text-[#919aa6]">{post.excerpt}</span>
                  <span className="mt-0.5 block truncate text-[9px] font-semibold text-[#6c7683]" data-guide-products>{guideProductLinkSummary(post.productLinks)}</span>
                </span>
                <span className="text-[9px] text-[#87909b]">{post.publishedAt ? formatAdminDate(post.publishedAt) : "Unpublished"}</span>
                <AdminBadge tone={post.featured ? "green" : "slate"}>{post.featured ? "Featured" : "Guide"}</AdminBadge>
                <Link href={`/guide/${post.slug}`} className="inline-flex items-center gap-1 text-[9px] font-bold text-[#3f8c22] hover:underline">
                  Read <ArrowUpRight size={11} />
                </Link>
              </li>
            ))}
          </ul>
        </AdminCard>
      ) : null}

      {tab === "tshirt" ? (
        <>
          <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter T-shirt posts by status">
            {(["All", ...STATUSES] as (AdminPostStatus | "All")[]).map((status) => {
              const count = status === "All" ? data.tshirtPosts.length : data.tshirtPosts.filter((post) => post.status === status).length;
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
              <table className="w-full min-w-[860px] text-left text-[10px]">
                <thead className="bg-[#fafbfc] text-[9px] font-semibold text-[#828c99]">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold sm:px-5">Post</th>
                    <th className="px-3 py-2.5 font-semibold">SVG</th>
                    <th className="px-3 py-2.5 font-semibold">Attributes</th>
                    <th className="px-3 py-2.5 font-semibold">Price combinations</th>
                    <th className="px-3 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 text-right font-semibold sm:px-5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f2f4]">
                  {filtered.length ? filtered.map((post) => (
                    <tr key={post.id} className="hover:bg-[#fafbfc]">
                      <td className="px-4 py-2.5 sm:px-5">
                        <span className="block font-bold text-[#303844]">{post.title}</span>
                        <span className="mt-0.5 block max-w-[240px] truncate text-[8px] text-[#919aa6]">{post.description || post.id}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        {post.svg ? (
                          <span className="flex items-center gap-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={post.svg.url} alt="" className="h-8 w-8 shrink-0 rounded border border-[#e6e9ed] bg-white object-contain" />
                            <span className="min-w-0">
                              <span className="block max-w-[120px] truncate text-[9px] font-semibold text-[#4a5462]">{post.svg.fileName}</span>
                              <span className="block text-[8px] text-[#919aa6]">{Math.max(1, Math.round(post.svg.sizeBytes / 1024))} KB</span>
                            </span>
                          </span>
                        ) : <span className="text-[9px] text-[#a2aab4]">No file</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="flex max-w-[260px] flex-wrap gap-1">
                          {post.attributes.filter((attribute) => attribute.options.length).map((attribute) => (
                            <span key={attribute.key} title={`${attribute.label}: ${attribute.options.join(", ")}`} className="rounded-full border border-[#e6e9ed] bg-white px-1.5 py-0.5 text-[8px] font-semibold text-[#4a5462]">
                              {attribute.label}: {attribute.options.join(", ")}
                            </span>
                          ))}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="block text-[9px] font-semibold text-[#4a5462]">{post.prices.length} combination{post.prices.length === 1 ? "" : "s"}</span>
                        <span className="mt-0.5 block text-[8px] text-[#919aa6]">from {formatKs(tshirtPostFromPriceKs(post))}</span>
                      </td>
                      <td className="px-3 py-2.5"><AdminBadge tone={STATUS_TONES[post.status]}>{post.status}</AdminBadge></td>
                      <td className="px-4 py-2.5 text-right sm:px-5">
                        <div className="flex items-center justify-end gap-1">
                          <AdminButton compact variant="secondary" onClick={() => startEdit(post)} aria-label={`Edit ${post.title}`}><Pencil size={12} /> Edit</AdminButton>
                          <AdminButton compact variant="danger" onClick={() => remove(post)} aria-label={`Delete ${post.title}`}><Trash2 size={12} /> {confirmId === post.id ? "Confirm" : "Delete"}</AdminButton>
                        </div>
                      </td>
                    </tr>
                  )) : <tr><td colSpan={6}><AdminEmpty title="No T-shirt posts match this filter" description="Try another search or create the first drop." /></td></tr>}
                </tbody>
              </table>
            </div>
          </AdminCard>
        </>
      ) : null}

      {tab === "nyein" ? (
        <AdminCard className="mt-3">
          <AdminEmpty title="Nyein posts" description="The Nyein post fields will be added once the Nyein brief is ready." />
        </AdminCard>
      ) : null}

      <AdminDrawer
        open={Boolean(editingId && draft)}
        title={editingId === "new" ? "New T-shirt post" : `Edit ${editing?.title ?? "T-shirt post"}`}
        description="Attach the print SVG, tick the attributes you sell, then price each combination by hand."
        onClose={closeEditor}
        footer={(
          <div className="flex items-center justify-end gap-2">
            <AdminButton variant="secondary" onClick={closeEditor}>Cancel</AdminButton>
            <AdminButton onClick={save}>{editingId === "new" ? "Create post" : "Save changes"}</AdminButton>
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

            <AdminField label="Post title">
              <AdminInput value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Peacock Line Tee" aria-label="Post title" />
            </AdminField>

            <AdminField label="Description">
              <AdminTextarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} rows={3} placeholder="Single-colour line art on combed cotton." aria-label="Post description" />
            </AdminField>

            <AdminField label="SVG file" hint="Stored per post; the R2 upload replaces the local copy once the bucket is live.">
              <div className="space-y-2">
                <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[#cfd6dd] bg-[#f8f9fb] px-3 text-[10px] font-semibold text-[#4a5462] hover:border-[#a5d972] hover:bg-white">
                  <FileUp size={14} />
                  {draft.svg ? "Replace SVG" : "Choose SVG"}
                  <input
                    type="file"
                    accept=".svg,image/svg+xml"
                    aria-label="T-shirt post SVG file"
                    className="sr-only"
                    onChange={(event) => {
                      void attachSvg(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                </label>
                {svgError ? <p className="text-[9px] font-semibold text-[#c9424a]">{svgError}</p> : null}
                {draft.svg ? (
                  <div className="flex items-center gap-3 rounded-lg border border-[#e6e9ed] bg-white p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={draft.svg.url} alt="" className="h-12 w-12 shrink-0 rounded border border-[#eef1f4] bg-white object-contain" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[10px] font-bold text-[#303844]">{draft.svg.fileName}</span>
                      <span className="block text-[8px] text-[#919aa6]">{Math.max(1, Math.round(draft.svg.sizeBytes / 1024))} KB</span>
                    </span>
                    <button type="button" aria-label="Remove SVG" onClick={() => setDraft({ ...draft, svg: null })} className="rounded p-1 text-[#87909b] hover:bg-[#f2f5f8] hover:text-[#c9424a]"><X size={13} /></button>
                  </div>
                ) : null}
              </div>
            </AdminField>

            <AdminField label="Attributes" hint="Tick the attributes and options this drop is sold in. Untick what does not vary.">
              <div className="space-y-1.5" data-post-attributes>
                {draft.attributes.map((attribute) => (
                  <div key={attribute.key} className={`rounded-lg border p-1.5 ${attribute.enabled ? "border-[#a5d972] bg-[#f6fbf1]" : "border-[#e6e9ed] bg-white"}`}>
                    <label className="flex items-center gap-2 text-[10px] font-bold text-[#3b4552]">
                      <input
                        type="checkbox"
                        checked={attribute.enabled}
                        onChange={() => toggleAttribute(attribute.key)}
                        aria-label={`Use ${attribute.label}`}
                        data-post-attribute={attribute.key}
                        className="h-3.5 w-3.5 accent-[#4cae22]"
                      />
                      {attribute.label}
                      <span className="ml-auto text-[8px] font-semibold text-[#919aa6]">{attribute.options.length} option{attribute.options.length === 1 ? "" : "s"}</span>
                    </label>
                    {attribute.enabled ? (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {attribute.options.map((option) => (
                          <button
                            key={option}
                            type="button"
                            data-post-option={`${attribute.key}:${option}`}
                            onClick={() => toggleOption(attribute.key, option)}
                            className="rounded-full border border-[#cfe3bd] bg-white px-1.5 py-0.5 text-[8px] font-semibold text-[#3f8c22] hover:border-[#c9424a] hover:text-[#c9424a]"
                            title={`Remove ${option}`}
                          >
                            {option} ×
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </AdminField>

            <AdminField
              label="Price combinations"
              hint="Each row is one full combination with its own price. Combinations without a row are not sold."
            >
              <div className="space-y-1.5" data-post-prices>
                {draft.prices.length ? draft.prices.map((row, index) => (
                  <div key={row.id} data-post-price-row={row.id} className="rounded-lg border border-[#e6e9ed] bg-white p-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[8px] font-bold text-[#919aa6]">#{index + 1}</span>
                      <button type="button" aria-label={`Remove combination ${index + 1}`} onClick={() => removeRow(row.id)} className="ml-auto rounded p-0.5 text-[#87909b] hover:bg-[#f2f5f8] hover:text-[#c9424a]"><X size={12} /></button>
                    </div>
                    <div className="mt-1 grid grid-cols-2 gap-1">
                      {activeAttributes.map((attribute) => (
                        <label key={attribute.key} className="min-w-0">
                          <span className="block text-[7px] font-bold uppercase tracking-wide text-[#9aa3ad]">{attribute.label}</span>
                          <select
                            value={row.options[attribute.key] ?? attribute.options[0]}
                            onChange={(event) => setRowOption(row.id, attribute.key, event.target.value)}
                            aria-label={`Row ${index + 1} ${attribute.label}`}
                            className="h-7 w-full min-w-0 rounded border border-[#e6e9ed] bg-white px-1 text-[9px] text-[#252c37] outline-none focus:border-[#a5d972]"
                          >
                            {attribute.options.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                        </label>
                      ))}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <input
                        value={row.priceKs}
                        onChange={(event) => setRowPrice(row.id, event.target.value)}
                        inputMode="numeric"
                        placeholder="Price in Ks"
                        aria-label={`Row ${index + 1} price`}
                        className="h-7 min-w-0 flex-1 rounded border border-[#e6e9ed] bg-white px-2 text-[9px] text-[#252c37] outline-none focus:border-[#a5d972]"
                      />
                      <span className="shrink-0 text-[8px] text-[#919aa6]">{row.priceKs ? formatKs(Number(row.priceKs) || 0) : "—"}</span>
                    </div>
                    <p className="mt-1 truncate text-[8px] text-[#87909b]">{tshirtCombinationLabel(activeAttributes, row.options)}</p>
                  </div>
                )) : <p className="rounded-lg bg-[#f7f9fb] px-2.5 py-2 text-[9px] text-[#87909b]">No combinations yet.</p>}
                <AdminButton compact variant="secondary" onClick={addRow} aria-label="Add combination"><Plus size={12} /> Add combination</AdminButton>
              </div>
            </AdminField>

            <AdminField label="Status">
              <AdminSelect value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as AdminPostStatus })} aria-label="Post status">
                {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
              </AdminSelect>
            </AdminField>
          </div>
        ) : null}
      </AdminDrawer>
    </AdminShell>
  );
}
