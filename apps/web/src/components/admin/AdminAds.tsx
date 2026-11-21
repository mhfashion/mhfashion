"use client";

import { useMemo, useRef, useState } from "react";
import { Film, Image as ImageIcon, Megaphone, Pencil, Plus, Search, Trash2 } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import {
  AdminBadge, AdminButton, AdminCard, AdminDrawer, AdminEmpty, AdminField,
  AdminInput, AdminSelect, AdminStat, type AdminTone,
} from "@/components/admin/AdminUi";
import { updateAdminData, useAdminDemoData } from "@/lib/admin-demo-store";
import { formatAdminDate, type AdminAd, type AdMediaType, type AdSlotId } from "@/lib/admin-demo-data";
import {
  AD_SLOTS, MAX_IMAGE_BYTES, adDraftFrom, adFromDraft, adSlotLabel, adStatus, readImageFile,
  removeAd, toggleAd, upsertAd, validateAdDraft, type AdminAdDraft, type AdminAdStatus,
} from "@/lib/admin-ads";

const STATUS_TONES: Record<AdminAdStatus, AdminTone> = {
  Live: "green",
  Scheduled: "blue",
  Expired: "slate",
  Disabled: "amber",
};

function MediaPreview({ draft }: { draft: AdminAdDraft }) {
  const slot = AD_SLOTS.find((entry) => entry.id === draft.slot);
  return (
    <div data-ad-preview className="rounded-xl border border-[#edf0f3] bg-[#fafbfc] p-3">
      <p className="text-[9px] font-bold uppercase tracking-wide text-[#828c99]">
        {slot?.label ?? "Ad"} preview · {slot?.size} · {draft.mediaType === "video" ? "looping video" : "photo"}
      </p>
      <div className={`mt-2 overflow-hidden rounded-lg bg-[#eef1f3] ${draft.slot === "home-hero" ? "aspect-[16/6]" : "aspect-[16/3]"}`}>
        {draft.mediaUrl ? (
          draft.mediaType === "video" ? (
            <video data-ad-preview-video src={draft.mediaUrl} poster={draft.posterUrl || undefined} autoPlay muted loop playsInline className="h-full w-full object-cover" />
          ) : (
            <img data-ad-preview-image src={draft.mediaUrl} alt="" className="h-full w-full object-cover" />
          )
        ) : (
          <div className="flex h-full items-center justify-center text-[9px] font-semibold text-[#87909b]">
            {draft.mediaType === "video" ? "Paste the animation video URL" : "Paste a photo URL or pick a file"}
          </div>
        )}
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
  const posterInput = useRef<HTMLInputElement>(null);

  const query = search.trim().toLowerCase();
  const editing = editingId ? data.ads.find((ad) => ad.id === editingId) ?? null : null;
  const visible = useMemo(() => data.ads.filter((ad) => (
    `${ad.name} ${ad.alt} ${adSlotLabel(ad.slot)} ${ad.mediaType} ${adStatus(ad)}`.toLowerCase().includes(query)
  )), [data.ads, query]);

  const live = data.ads.filter((ad) => adStatus(ad) === "Live");
  const scheduled = data.ads.filter((ad) => adStatus(ad) === "Scheduled");
  const videos = data.ads.filter((ad) => ad.mediaType === "video");
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

  async function pickFile(file: File | undefined, target: "mediaUrl" | "posterUrl") {
    if (!file || !draft) return;
    try {
      const dataUrl = await readImageFile(file);
      setDraft({ ...draft, [target]: dataUrl });
      setErrors([]);
    } catch (error) {
      setErrors([(error as Error).message]);
    }
  }

  return (
    <AdminShell
      active="ads"
      title="Ads"
      description="One banner photo or one looping animation per slot, with the window it runs. A slot shows the newest live ad."
      actions={<AdminButton onClick={startCreate} aria-label="Create an ad"><Plus size={14} /> New ad</AdminButton>}
      search={(
        <label className="flex h-10 w-full max-w-[420px] items-center gap-2.5 rounded-full border border-[#e6e9ed] bg-[#f8f9fb] px-3.5 text-[#8c95a1] focus-within:border-[#a5d972] focus-within:bg-white">
          <Search size={16} className="shrink-0" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search ads" placeholder="Search ad, slot or type..." className="min-w-0 flex-1 bg-transparent text-[11px] text-[#252c37] outline-none placeholder:text-[#9da5af]" />
        </label>
      )}
    >
      <section aria-label="Ad metrics" className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Live now" value={String(live.length)} hint="Enabled and inside the window" icon={<Megaphone size={21} />} />
        <AdminStat label="Scheduled" value={String(scheduled.length)} hint="Start in the future" icon={<Megaphone size={21} />} />
        <AdminStat label="Slots filled" value={`${coveredSlots.size}/${AD_SLOTS.length}`} hint="Slots with a live ad" icon={<Megaphone size={21} />} />
        <AdminStat label="Videos" value={String(videos.length)} hint="The rest are still photos" icon={<Film size={21} />} />
      </section>

      <AdminCard className="mt-3 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-[10px]">
            <thead className="bg-[#fafbfc] text-[9px] font-semibold text-[#828c99]">
              <tr>
                <th className="px-4 py-2.5 font-semibold sm:px-5">Ad</th>
                <th className="px-3 py-2.5 font-semibold">Slot</th>
                <th className="px-3 py-2.5 font-semibold">Media</th>
                <th className="px-3 py-2.5 font-semibold">Window</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 text-right font-semibold sm:px-5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f2f4]">
              {visible.length ? visible.map((ad) => {
                const status = adStatus(ad);
                return (
                  <tr key={ad.id} data-admin-ad={ad.id} data-ad-status={status} data-ad-media={ad.mediaType} className="hover:bg-[#fafbfc]">
                    <td className="px-4 py-2.5 sm:px-5">
                      <span className="block font-bold text-[#303844]">{ad.name}</span>
                      <span className="mt-0.5 block text-[9px] text-[#919aa6]">{ad.href ? `→ ${ad.href}` : "No link"}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[#505a68]">{adSlotLabel(ad.slot)}</td>
                    <td className="px-3 py-2.5">
                      <span className="flex items-center gap-2">
                        <span className="flex h-8 w-12 shrink-0 items-center justify-center overflow-hidden rounded border border-[#e6e9ed] bg-[#f4f6f8]">
                          {ad.mediaType === "video"
                            ? <video src={ad.mediaUrl} muted playsInline className="h-full w-full object-cover" />
                            : <img src={ad.mediaUrl} alt="" className="h-full w-full object-cover" />}
                        </span>
                        <span className="text-[9px] text-[#6c7683]">{ad.mediaType === "video" ? "Video" : "Photo"}<span className="mt-0.5 block max-w-[130px] truncate text-[#9aa3ae]">{ad.alt}</span></span>
                      </span>
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
              }) : <tr><td colSpan={6}><AdminEmpty title="No ads yet" description="Create one with a banner photo or a looping video, then it appears on the home page while it is live." /></td></tr>}
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
          <p className="mt-2 text-[9px] text-[#87909b]">
            A photo can be picked from this computer (up to {Math.round(MAX_IMAGE_BYTES / 1024)} KB) or referenced by path; a video needs a
            URL — uploads land in R2, which is not connected yet, so use /ads/… once the file is in the repo or an https:// link.
          </p>
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
              <AdminField label="Ad name">
                <AdminInput value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Songkran hero" aria-label="Ad name" />
              </AdminField>
            </div>

            <fieldset className="rounded-xl border border-[#edf0f3] bg-[#fafbfc] p-3">
              <legend className="px-1 text-[10px] font-bold text-[#5b6674]">Media</legend>
              <div role="radiogroup" aria-label="Ad media type" className="flex gap-1.5">
                {(["image", "video"] as AdMediaType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    role="radio"
                    aria-checked={draft.mediaType === type}
                    data-ad-media-type={type}
                    onClick={() => setDraft({ ...draft, mediaType: type, posterUrl: type === "video" ? draft.posterUrl : "" })}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold ${draft.mediaType === type ? "border-[#4cae22] bg-[#eef8e6] text-[#3f8c22]" : "border-[#e4e8ed] bg-white text-[#6c7683]"}`}
                  >
                    {type === "video" ? <Film size={12} /> : <ImageIcon size={12} />} {type === "video" ? "Animation video" : "Banner photo"}
                  </button>
                ))}
              </div>

              <div className="mt-3">
                <AdminField label={draft.mediaType === "video" ? "Video URL (.mp4 / .webm)" : "Photo URL"}>
                  <AdminInput value={draft.mediaUrl.startsWith("data:") ? "" : draft.mediaUrl} onChange={(event) => setDraft({ ...draft, mediaUrl: event.target.value })} placeholder={draft.mediaType === "video" ? "/ads/hero.mp4" : "/ads/hero.jpg"} aria-label="Ad media URL" />
                </AdminField>
                {draft.mediaType === "image" ? (
                  <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-[9px] font-bold text-[#3f8c22]">
                    <ImageIcon size={12} /> Pick a photo from this computer
                    <input
                      type="file"
                      accept="image/*"
                      aria-label="Pick an ad photo"
                      data-ad-file
                      className="sr-only"
                      onChange={(event) => pickFile(event.target.files?.[0], "mediaUrl")}
                    />
                  </label>
                ) : null}
                {draft.mediaUrl.startsWith("data:") ? (
                  <p className="mt-1 text-[9px] font-semibold text-[#3f8c22]">A picked photo is stored with this ad.</p>
                ) : null}
              </div>

              {draft.mediaType === "video" ? (
                <div className="mt-3">
                  <AdminField label="Poster photo (optional)" hint="Shown while the video loads.">
                    <AdminInput value={draft.posterUrl.startsWith("data:") ? "" : draft.posterUrl} onChange={(event) => setDraft({ ...draft, posterUrl: event.target.value })} placeholder="/ads/hero-poster.jpg" aria-label="Ad poster URL" />
                  </AdminField>
                  <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-[9px] font-bold text-[#3f8c22]">
                    <ImageIcon size={12} /> Pick a poster from this computer
                    <input
                      ref={posterInput}
                      type="file"
                      accept="image/*"
                      aria-label="Pick a poster photo"
                      className="sr-only"
                      onChange={(event) => pickFile(event.target.files?.[0], "posterUrl")}
                    />
                  </label>
                </div>
              ) : null}
            </fieldset>

            <AdminField label="Description" hint="Read by screen readers and search engines.">
              <AdminInput value={draft.alt} onChange={(event) => setDraft({ ...draft, alt: event.target.value })} placeholder="Two models in MH Signature tees" aria-label="Ad description" />
            </AdminField>
            <AdminField label="Link (optional)" hint="Leave empty when the banner is not clickable.">
              <AdminInput value={draft.href} onChange={(event) => setDraft({ ...draft, href: event.target.value })} placeholder="/new" aria-label="Ad link" />
            </AdminField>
            <div className="grid grid-cols-2 gap-3">
              <AdminField label="Starts">
                <AdminInput type="date" value={draft.startsAt} onChange={(event) => setDraft({ ...draft, startsAt: event.target.value })} aria-label="Ad start date" />
              </AdminField>
              <AdminField label="Ends">
                <AdminInput type="date" value={draft.endsAt} onChange={(event) => setDraft({ ...draft, endsAt: event.target.value })} aria-label="Ad end date" />
              </AdminField>
            </div>
            <MediaPreview draft={draft} />
          </div>
        ) : null}
      </AdminDrawer>
    </AdminShell>
  );
}
