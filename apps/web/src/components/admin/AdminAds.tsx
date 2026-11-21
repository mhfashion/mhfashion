"use client";

import { useMemo, useState } from "react";
import { Image as ImageIcon, Megaphone, Pencil, Plus, Search, Trash2 } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import {
  AdminBadge, AdminButton, AdminCard, AdminDrawer, AdminEmpty, AdminField,
  AdminInput, AdminSelect, AdminStat, AdminTextarea, type AdminTone,
} from "@/components/admin/AdminUi";
import { updateAdminData, useAdminDemoData } from "@/lib/admin-demo-store";
import { formatAdminDate, type AdminAd, type AdSlotId } from "@/lib/admin-demo-data";
import {
  AD_SLOTS, adDraftFrom, adFromDraft, adSlotLabel, adStatus, removeAd, toggleAd,
  upsertAd, validateAdDraft, type AdminAdDraft, type AdminAdStatus,
} from "@/lib/admin-ads";

const STATUS_TONES: Record<AdminAdStatus, AdminTone> = {
  Live: "green",
  Scheduled: "blue",
  Expired: "slate",
  Disabled: "amber",
};

function AdPreview({ draft }: { draft: AdminAdDraft }) {
  const slot = AD_SLOTS.find((entry) => entry.id === draft.slot);
  return (
    <div data-ad-preview className="rounded-xl border border-[#edf0f3] bg-[#fafbfc] p-3">
      <p className="text-[9px] font-bold uppercase tracking-wide text-[#828c99]">{slot?.label ?? "Ad"} preview · {slot?.size}</p>
      <div className="mt-2 overflow-hidden rounded-lg bg-gradient-to-r from-[#efffdc] via-[#dbf6bb] to-[#b9ea7d] p-3 text-[#21361a]">
        {draft.imageUrl ? (
          <div className="mb-2 flex items-center gap-1 rounded-md bg-white/60 px-2 py-1 text-[9px] font-semibold text-[#4b6a3a]">
            <ImageIcon size={11} /> {draft.imageUrl}
          </div>
        ) : null}
        <p className="text-[13px] font-black leading-tight">{draft.headline || "Headline goes here"}</p>
        <p className="mt-1 text-[10px] leading-snug text-[#355128]">{draft.body || "One or two lines about the offer."}</p>
        <span className="mt-2 inline-flex rounded-full bg-[#4cae22] px-2.5 py-1 text-[9px] font-bold text-white">{draft.ctaLabel || "Shop now"}</span>
      </div>
      <p className="mt-2 text-[9px] text-[#87909b]">Where: {slot?.where}</p>
    </div>
  );
}

export default function AdminAds() {
  const data = useAdminDemoData();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AdminAdDraft | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const query = search.trim().toLowerCase();
  const editing = editingId ? data.ads.find((ad) => ad.id === editingId) ?? null : null;
  const visible = useMemo(() => data.ads.filter((ad) => (
    `${ad.name} ${ad.headline} ${adSlotLabel(ad.slot)} ${adStatus(ad)}`.toLowerCase().includes(query)
  )), [data.ads, query]);

  const live = data.ads.filter((ad) => adStatus(ad) === "Live");
  const scheduled = data.ads.filter((ad) => adStatus(ad) === "Scheduled");
  const coveredSlots = new Set(live.map((ad) => ad.slot));

  function startCreate() {
    setEditingId("new");
    setDraft(adDraftFrom());
    setErrors([]);
  }

  function startEdit(ad: AdminAd) {
    setEditingId(ad.id);
    setDraft(adDraftFrom(ad));
    setErrors([]);
  }

  function closeEditor() {
    setEditingId(null);
    setDraft(null);
    setErrors([]);
  }

  function save() {
    if (!draft) return;
    const found = validateAdDraft(draft);
    if (found.length) {
      setErrors(found);
      return;
    }
    updateAdminData((current) => upsertAd(current, adFromDraft(draft, editing ?? undefined)));
    closeEditor();
  }

  function remove(ad: AdminAd) {
    if (confirmId !== ad.id) {
      setConfirmId(ad.id);
      return;
    }
    updateAdminData((current) => removeAd(current, ad.id));
    setConfirmId(null);
  }

  return (
    <AdminShell
      active="ads"
      title="Ads"
      description="Banner copy, links and run windows for every storefront slot. A slot shows the ad only while it is live."
      actions={<AdminButton onClick={startCreate} aria-label="Create an ad"><Plus size={14} /> New ad</AdminButton>}
      search={(
        <label className="flex h-10 w-full max-w-[420px] items-center gap-2.5 rounded-full border border-[#e6e9ed] bg-[#f8f9fb] px-3.5 text-[#8c95a1] focus-within:border-[#a5d972] focus-within:bg-white">
          <Search size={16} className="shrink-0" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search ads" placeholder="Search campaign or slot..." className="min-w-0 flex-1 bg-transparent text-[11px] text-[#252c37] outline-none placeholder:text-[#9da5af]" />
        </label>
      )}
    >
      <section aria-label="Ad metrics" className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Live now" value={String(live.length)} hint="Enabled and inside the window" icon={<Megaphone size={21} />} />
        <AdminStat label="Scheduled" value={String(scheduled.length)} hint="Start in the future" icon={<Megaphone size={21} />} />
        <AdminStat label="Slots filled" value={`${coveredSlots.size}/${AD_SLOTS.length}`} hint="Slots with a live ad" icon={<Megaphone size={21} />} />
        <AdminStat label="Campaigns" value={String(data.ads.length)} hint="Including paused and expired" icon={<Megaphone size={21} />} />
      </section>

      <AdminCard className="mt-3 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-[10px]">
            <thead className="bg-[#fafbfc] text-[9px] font-semibold text-[#828c99]">
              <tr>
                <th className="px-4 py-2.5 font-semibold sm:px-5">Campaign</th>
                <th className="px-3 py-2.5 font-semibold">Slot</th>
                <th className="px-3 py-2.5 font-semibold">Banner</th>
                <th className="px-3 py-2.5 font-semibold">Window</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 text-right font-semibold sm:px-5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f2f4]">
              {visible.length ? visible.map((ad) => {
                const status = adStatus(ad);
                return (
                  <tr key={ad.id} data-admin-ad={ad.id} data-ad-status={status} className="hover:bg-[#fafbfc]">
                    <td className="px-4 py-2.5 sm:px-5">
                      <span className="block font-bold text-[#303844]">{ad.name}</span>
                      <span className="mt-0.5 block text-[9px] text-[#919aa6]">→ {ad.ctaHref}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[#505a68]">{adSlotLabel(ad.slot)}</td>
                    <td className="max-w-[240px] px-3 py-2.5">
                      <span className="block truncate font-semibold text-[#394250]">{ad.headline}</span>
                      <span className="mt-0.5 block truncate text-[9px] text-[#919aa6]">{ad.body}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[#919aa6]">{formatAdminDate(ad.startsAt)} → {formatAdminDate(ad.endsAt)}</td>
                    <td className="px-3 py-2.5"><AdminBadge tone={STATUS_TONES[status]}>{status}</AdminBadge></td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right sm:px-5">
                      <div className="inline-flex items-center gap-1.5">
                        <AdminButton compact variant="secondary" onClick={() => startEdit(ad)} aria-label={`Edit ${ad.name}`}><Pencil size={12} /> Edit</AdminButton>
                        <AdminButton compact variant="ghost" onClick={() => updateAdminData((current) => toggleAd(current, ad.id))} aria-label={`${ad.enabled ? "Pause" : "Enable"} ${ad.name}`}>{ad.enabled ? "Pause" : "Enable"}</AdminButton>
                        <AdminButton compact variant="danger" onClick={() => remove(ad)} aria-label={`Delete ${ad.name}`}><Trash2 size={12} /> {confirmId === ad.id ? "Confirm" : "Delete"}</AdminButton>
                      </div>
                    </td>
                  </tr>
                );
              }) : <tr><td colSpan={6}><AdminEmpty title="No ads match this search" description="Create a campaign to fill a storefront slot." /></td></tr>}
            </tbody>
          </table>
        </div>
      </AdminCard>

      <AdminCard className="mt-3">
        <div className="px-4 py-3">
          <h2 className="text-[11px] font-bold text-[#303844]">Where each slot appears</h2>
          <ul className="mt-1 grid gap-1 text-[10px] text-[#4b5563] sm:grid-cols-2">
            {AD_SLOTS.map((slot) => (
              <li key={slot.id} data-ad-slot={slot.id}>
                <span className="font-bold text-[#394250]">{slot.label}</span> · {slot.where} <span className="text-[#919aa6]">({slot.size})</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[9px] text-[#87909b]">A slot shows its newest live ad; a paused or expired ad leaves the slot empty rather than showing stale copy.</p>
        </div>
      </AdminCard>

      <AdminDrawer
        open={Boolean(editingId && draft)}
        title={editingId === "new" ? "New ad" : `Edit ${editing?.name ?? "ad"}`}
        description="The banner shows while the ad is enabled and inside its window; pause it any time."
        onClose={closeEditor}
        footer={(
          <div className="flex items-center justify-end gap-2">
            <AdminButton variant="secondary" onClick={closeEditor}>Cancel</AdminButton>
            <AdminButton onClick={save}>{editingId === "new" ? "Create ad" : "Save changes"}</AdminButton>
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
            <div className="grid grid-cols-2 gap-3">
              <AdminField label="Slot">
                <AdminSelect value={draft.slot} onChange={(event) => setDraft({ ...draft, slot: event.target.value as AdSlotId })} aria-label="Ad slot">
                  {AD_SLOTS.map((slot) => <option key={slot.id} value={slot.id}>{slot.label}</option>)}
                </AdminSelect>
              </AdminField>
              <AdminField label="Campaign name">
                <AdminInput value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Songkran tee push" aria-label="Campaign name" />
              </AdminField>
            </div>
            <AdminField label="Headline">
              <AdminInput value={draft.headline} onChange={(event) => setDraft({ ...draft, headline: event.target.value })} placeholder="The Signature drop is here" aria-label="Ad headline" />
            </AdminField>
            <AdminField label="Body">
              <AdminTextarea rows={3} value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} placeholder="One or two lines about the offer." aria-label="Ad body" />
            </AdminField>
            <div className="grid grid-cols-2 gap-3">
              <AdminField label="Button label">
                <AdminInput value={draft.ctaLabel} onChange={(event) => setDraft({ ...draft, ctaLabel: event.target.value })} placeholder="Shop the drop" aria-label="Ad button label" />
              </AdminField>
              <AdminField label="Button link">
                <AdminInput value={draft.ctaHref} onChange={(event) => setDraft({ ...draft, ctaHref: event.target.value })} placeholder="/new" aria-label="Ad link" />
              </AdminField>
            </div>
            <AdminField label="Image URL" hint="Optional. Leave empty for the plain gradient banner.">
              <AdminInput value={draft.imageUrl} onChange={(event) => setDraft({ ...draft, imageUrl: event.target.value })} placeholder="/ads/signature.jpg" aria-label="Ad image" />
            </AdminField>
            <div className="grid grid-cols-2 gap-3">
              <AdminField label="Starts">
                <AdminInput type="date" value={draft.startsAt} onChange={(event) => setDraft({ ...draft, startsAt: event.target.value })} aria-label="Ad start date" />
              </AdminField>
              <AdminField label="Ends">
                <AdminInput type="date" value={draft.endsAt} onChange={(event) => setDraft({ ...draft, endsAt: event.target.value })} aria-label="Ad end date" />
              </AdminField>
            </div>
            <AdPreview draft={draft} />
          </div>
        ) : null}
      </AdminDrawer>
    </AdminShell>
  );
}
