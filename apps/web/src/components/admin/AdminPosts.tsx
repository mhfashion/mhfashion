"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, FileUp, Newspaper, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import {
  AdminBadge, AdminButton, AdminCard, AdminDrawer, AdminEmpty, AdminField,
  AdminInput, AdminSelect, AdminTextarea, type AdminTone,
} from "@/components/admin/AdminUi";
import { updateAdminData, useAdminDemoData } from "@/lib/admin-demo-store";
import {
  TSHIRT_POST_COLORS, TSHIRT_POST_SIZES, formatKs, formatAdminDate,
  removeTshirtPost, tshirtPostDraftFrom, tshirtPostFromDraft, tshirtPostFromPriceKs,
  upsertTshirtPost, validateTshirtPostDraft,
  type AdminPostStatus, type AdminTshirtPost, type AdminTshirtPostDraft,
} from "@/lib/admin-demo-data";
import { GUIDE_STARTER_CATALOG } from "@/lib/guide-starter";
import { storePostSvg } from "@/lib/post-assets";

type PostTab = "guide" | "tshirt" | "nyein";

const TABS: { id: PostTab; label: string }[] = [
  { id: "guide", label: "Guide posts" },
  { id: "tshirt", label: "T-shirt posts" },
  { id: "nyein", label: "Nyein posts" },
];

const STATUSES: AdminPostStatus[] = ["Draft", "Published"];

const STATUS_TONES: Record<AdminPostStatus, AdminTone> = {
  Draft: "amber",
  Published: "green",
};

export default function AdminPosts() {
  const data = useAdminDemoData();
  const [tab, setTab] = useState<PostTab>("tshirt");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdminPostStatus | "All">("All");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AdminTshirtPostDraft | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [svgError, setSvgError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const query = search.trim().toLowerCase();
  const editing = editingId ? data.tshirtPosts.find((post) => post.id === editingId) ?? null : null;
  const filtered = useMemo(() => data.tshirtPosts.filter((post) => (
    (statusFilter === "All" || post.status === statusFilter)
    && `${post.title} ${post.description}`.toLowerCase().includes(query)
  )), [data.tshirtPosts, statusFilter, query]);
  const guidePosts = GUIDE_STARTER_CATALOG.posts;

  function startCreate() {
    setEditingId("new");
    setDraft(tshirtPostDraftFrom());
    setErrors([]);
    setSvgError(null);
  }

  function startEdit(post: AdminTshirtPost) {
    setEditingId(post.id);
    setDraft(tshirtPostDraftFrom(post));
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

  function toggleColor(name: string) {
    if (!draft) return;
    const palette = TSHIRT_POST_COLORS.find((color) => color.name === name);
    if (!palette) return;
    const ticked = draft.colors.some((color) => color.name === name);
    setDraft({
      ...draft,
      colors: ticked
        ? draft.colors.filter((color) => color.name !== name)
        : [...draft.colors, { name: palette.name, hex: palette.hex, priceKs: "" }],
    });
  }

  function setColorPrice(name: string, priceKs: string) {
    if (!draft) return;
    setDraft({ ...draft, colors: draft.colors.map((color) => (color.name === name ? { ...color, priceKs } : color)) });
  }

  function toggleSize(size: string) {
    if (!draft) return;
    const ticked = draft.sizes.some((entry) => entry.size === size);
    setDraft({
      ...draft,
      sizes: ticked ? draft.sizes.filter((entry) => entry.size !== size) : [...draft.sizes, { size, priceKs: "" }],
    });
  }

  function setSizePrice(size: string, priceKs: string) {
    if (!draft) return;
    setDraft({ ...draft, sizes: draft.sizes.map((entry) => (entry.size === size ? { ...entry, priceKs } : entry)) });
  }

  return (
    <AdminShell
      active="posts"
      title="Posts"
      description="Guide articles, T-shirt drops and the Nyein collection, published from one place."
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
          const count = entry.id === "guide" ? guidePosts.length : entry.id === "tshirt" ? data.tshirtPosts.length : 0;
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
              <table className="w-full min-w-[820px] text-left text-[10px]">
                <thead className="bg-[#fafbfc] text-[9px] font-semibold text-[#828c99]">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold sm:px-5">Post</th>
                    <th className="px-3 py-2.5 font-semibold">SVG</th>
                    <th className="px-3 py-2.5 font-semibold">Colours</th>
                    <th className="px-3 py-2.5 font-semibold">Sizes &amp; prices</th>
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
                        <span className="flex flex-wrap items-center gap-1">
                          {post.colors.map((color) => (
                            <span key={color.name} title={color.priceKs ? `${color.name} +${formatKs(color.priceKs)}` : color.name} className="flex items-center gap-1 rounded-full border border-[#e6e9ed] bg-white px-1.5 py-0.5 text-[8px] font-semibold text-[#4a5462]">
                              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full border border-black/10" style={{ background: color.hex }} />
                              {color.name}
                              {color.priceKs ? <span className="text-[#87909b]">+{formatKs(color.priceKs)}</span> : null}
                            </span>
                          ))}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="flex flex-wrap gap-1">
                          {post.sizes.map((size) => (
                            <span key={size.size} className="rounded-md bg-[#f2f5f8] px-1.5 py-0.5 text-[8px] font-semibold text-[#4a5462]">{size.size} · {formatKs(size.priceKs)}</span>
                          ))}
                        </span>
                        <span className="mt-1 block text-[8px] text-[#919aa6]">from {formatKs(tshirtPostFromPriceKs(post))}</span>
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
        description="Attach the print SVG, tick the colours and sizes you sell, then price each size by hand."
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

            <AdminField label="SVG file" hint="Stored per post; R2 upload replaces the local copy once the bucket is live.">
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

            <AdminField label="Colours" hint="Tick every colour this post is sold in. The extra price is optional.">
              <div className="grid grid-cols-2 gap-1.5" data-post-colors>
                {TSHIRT_POST_COLORS.map((color) => {
                  const ticked = draft.colors.find((entry) => entry.name === color.name);
                  return (
                    <div key={color.name} className={`rounded-lg border p-1.5 ${ticked ? "border-[#a5d972] bg-[#f6fbf1]" : "border-[#e6e9ed] bg-white"}`}>
                      <label className="flex items-center gap-2 text-[10px] font-semibold text-[#3b4552]">
                        <input type="checkbox" checked={Boolean(ticked)} onChange={() => toggleColor(color.name)} aria-label={`${color.name} colour`} data-post-color={color.name} className="h-3.5 w-3.5 accent-[#4cae22]" />
                        <span aria-hidden="true" className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ background: color.hex }} />
                        {color.name}
                      </label>
                      {ticked ? (
                        <input
                          value={ticked.priceKs}
                          onChange={(event) => setColorPrice(color.name, event.target.value)}
                          inputMode="numeric"
                          placeholder="Extra Ks (optional)"
                          aria-label={`${color.name} colour price`}
                          className="mt-1.5 h-7 w-full rounded border border-[#e6e9ed] bg-white px-2 text-[9px] text-[#252c37] outline-none focus:border-[#a5d972]"
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </AdminField>

            <AdminField label="Sizes and prices" hint="Each ticked size keeps its own price. No base price is derived.">
              <div className="space-y-1.5" data-post-sizes>
                {TSHIRT_POST_SIZES.map((size) => {
                  const ticked = draft.sizes.find((entry) => entry.size === size);
                  return (
                    <div key={size} className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${ticked ? "border-[#a5d972] bg-[#f6fbf1]" : "border-[#e6e9ed] bg-white"}`}>
                      <label className="flex w-16 shrink-0 items-center gap-2 text-[10px] font-bold text-[#3b4552]">
                        <input type="checkbox" checked={Boolean(ticked)} onChange={() => toggleSize(size)} aria-label={`${size} size`} data-post-size={size} className="h-3.5 w-3.5 accent-[#4cae22]" />
                        {size}
                      </label>
                      <input
                        value={ticked?.priceKs ?? ""}
                        onChange={(event) => setSizePrice(size, event.target.value)}
                        disabled={!ticked}
                        inputMode="numeric"
                        placeholder="Price in Ks"
                        aria-label={`${size} size price`}
                        className="h-7 min-w-0 flex-1 rounded border border-[#e6e9ed] bg-white px-2 text-[9px] text-[#252c37] outline-none focus:border-[#a5d972] disabled:bg-[#f7f9fb] disabled:text-[#a2aab4]"
                      />
                    </div>
                  );
                })}
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
