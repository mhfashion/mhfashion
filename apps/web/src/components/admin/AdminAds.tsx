"use client";

import { useMemo, useRef, useState } from "react";
import { Film, Image as ImageIcon, Megaphone, Pencil, Plus, Search, Trash2 } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import {
  AdminBadge, AdminButton, AdminCard, AdminDrawer, AdminEmpty, AdminField,
  AdminInput, AdminSelect, AdminStat, type AdminTone,
} from "@/components/admin/AdminUi";
import { updateAdminData, useAdminDemoData } from "@/lib/admin-demo-store";
import { matchesSearchQuery } from "@/lib/search-text";
import {
  ADS_ROTATION_CHOICES, formatAdminDate, normalizeAdsRotationSeconds,
  type AdminAd, type AdFit, type AdMediaType, type AdSlotId,
} from "@/lib/admin-demo-data";
import {
  AD_FITS, AD_SLOTS, MAX_IMAGE_BYTES, adDraftFrom, adFromDraft, adMediaKind, adSlotLabel, adsForSlot,
  adSlotPage, adStatus, looksAnimatedMedia, readImageFile, removeAd, toggleAd, upsertAd, validateAdDraft,
  type AdminAdDraft, type AdminAdStatus,
} from "@/lib/admin-ads";

const STATUS_TONES: Record<AdminAdStatus, AdminTone> = {
  Live: "green",
  Scheduled: "blue",
  Expired: "slate",
  Disabled: "amber",
};

function fitClass(fit: AdFit | undefined): string {
  return fit === "contain" ? "object-contain" : "object-cover";
}

function MediaPreview({ draft }: { draft: AdminAdDraft }) {
  const slot = AD_SLOTS.find((entry) => entry.id === draft.slot);
  return (
    <div data-ad-preview className="rounded-xl border border-[#edf0f3] bg-[#fafbfc] p-3">
      <p className="text-[9px] font-bold uppercase tracking-wide text-[#828c99]">
        {slot?.label ?? "Ad"} preview · {slot?.size} · {draft.mediaType === "video" ? "looping video" : looksAnimatedMedia(draft.mediaUrl) ? "animated photo" : "photo"} · {draft.fit === "contain" ? "whole banner" : "filled"}
      </p>
      <div className={`mt-2 overflow-hidden rounded-lg bg-[#eef1f3] aspect-[16/6]`}>
        {draft.mediaUrl ? (
          draft.mediaType === "video" ? (
            <video data-ad-preview-video src={draft.mediaUrl} poster={draft.posterUrl || undefined} autoPlay muted loop playsInline className={`h-full w-full ${fitClass(draft.fit)}`} />
          ) : (
            <img data-ad-preview-image src={draft.mediaUrl} alt="" className={`h-full w-full ${fitClass(draft.fit)}`} />
          )
        ) : (
          <div className="flex h-full items-center justify-center text-[9px] font-semibold text-[#87909b]">
            {draft.mediaType === "video" ? "Paste the animation video URL" : "Paste a photo URL or pick a file"}
          </div>
        )}
      </div>
      <p className="mt-2 text-[9px] text-[#87909b]">Where: {slot?.page} · {slot?.where}</p>
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

  const query = search;
  const editing = editingId && editingId !== "new" ? data.ads.find((ad) => ad.id === editingId) ?? null : null;

  // One row per place, and every banner filed under that place inside it — a place can hold many.
  const board = useMemo(() => AD_SLOTS.map((slot) => ({ slot, banners: adsForSlot(data.ads, slot.id) })), [data.ads]);
  const visible = board.filter(({ slot, banners }) =>
    matchesSearchQuery(
      `${slot.label} ${slot.page} ${slot.where} ${banners.map((ad) => ad.name).join(" ")} ${banners.map((ad) => adStatus(ad)).join(" ")}`,
      query,
    ),
  );
  const liveBanners = data.ads.filter((ad) => adStatus(ad) === "Live").length;
  const scheduled = data.ads.filter((ad) => adStatus(ad) === "Scheduled").length;
  const emptyPlaces = board.filter(({ banners }) => banners.length === 0).length;
  const livePlaces = board.filter(({ banners }) => banners.some((ad) => adStatus(ad) === "Live")).length;
  const rotationSeconds = data.adsRotationSeconds;

  function startCreate(slot: AdSlotId) {
    setEditingId("new");
    setDraft(adDraftFrom(undefined, Date.now(), slot));
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

  function clear(ad: AdminAd) {
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
      description="Every banner place on the site, one row each — put a photo or a looping animation in any of them."
      actions={<AdminButton onClick={() => startCreate("home-hero")} aria-label="Create an ad"><Plus size={14} /> New banner</AdminButton>}
      search={(
        <label className="flex h-10 w-full max-w-[420px] items-center gap-2.5 rounded-full border border-[#e6e9ed] bg-[#f8f9fb] px-3.5 text-[#8c95a1] focus-within:border-[#a5d972] focus-within:bg-white">
          <Search size={16} className="shrink-0" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search slots" placeholder="Search slot, page or banner..." className="min-w-0 flex-1 bg-transparent text-[11px] text-[#252c37] outline-none placeholder:text-[#9da5af]" />
        </label>
      )}
    >
      <section aria-label="Ad metrics" className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Banners" value={String(data.ads.length)} hint={`Across ${AD_SLOTS.length} places`} icon={<Megaphone size={21} />} />
        <AdminStat label="Live now" value={String(liveBanners)} hint={`Showing in ${livePlaces} place${livePlaces === 1 ? "" : "s"}`} icon={<ImageIcon size={21} />} />
        <AdminStat label="Scheduled" value={String(scheduled)} hint="Start in the future" icon={<Film size={21} />} />
        <AdminStat label="Empty places" value={String(emptyPlaces)} hint="Nothing filed there yet" icon={<ImageIcon size={21} />} />
      </section>

      <AdminCard className="mt-3 overflow-hidden">
        <ul className="divide-y divide-[#f0f2f4]">
          {visible.length ? visible.map(({ slot, banners }) => {
            const live = banners.filter((ad) => adStatus(ad) === "Live").length;
            return (
              <li key={slot.id} data-ad-slot-row={slot.id} data-ad-count={banners.length} data-ad-live={live} className="px-4 py-3 sm:px-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-[#303844]">{slot.label}</p>
                    <p className="mt-0.5 text-[9px] text-[#87909b]"><span className="font-bold text-[#6c7683]">{slot.page}</span> · {slot.where}</p>
                    <p className="mt-0.5 text-[9px] text-[#a3abb5]">{slot.size}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-semibold text-[#919aa6]">
                      {banners.length ? `${banners.length} banner${banners.length === 1 ? "" : "s"} · ${live} live` : "No banners yet"}
                      {live > 1 ? ` · changes every ${rotationSeconds}s` : ""}
                    </span>
                    <AdminButton compact variant="secondary" onClick={() => startCreate(slot.id)} aria-label={`Add a banner to ${slot.label}`}><Plus size={12} /> Add banner</AdminButton>
                  </div>
                </div>

                {banners.length ? (
                  <ul className="mt-2 space-y-1.5">
                    {banners.map((ad) => {
                      const status = adStatus(ad);
                      return (
                        <li
                          key={ad.id}
                          data-ad-banner={ad.id}
                          data-ad-status={status}
                          data-ad-media={ad.mediaType}
                          className="flex flex-col gap-2 rounded-lg border border-[#eef1f3] bg-[#fafbfc] px-2.5 py-2 sm:flex-row sm:items-center sm:gap-3"
                        >
                          <span className="flex h-10 w-16 shrink-0 items-center justify-center overflow-hidden rounded border border-[#e6e9ed] bg-[#f4f6f8]">
                            {ad.mediaType === "video"
                              ? <video src={ad.mediaUrl} muted playsInline className="h-full w-full object-cover" />
                              : <img src={ad.mediaUrl} alt="" className="h-full w-full object-cover" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-1.5">
                              <span className="truncate text-[10px] font-bold text-[#394250]">{ad.name}</span>
                              <AdminBadge tone={STATUS_TONES[status]}>{status}</AdminBadge>
                              <span className="text-[9px] font-semibold text-[#919aa6]">{adMediaKind(ad)}</span>
                            </span>
                            <span className="mt-0.5 block truncate text-[9px] text-[#919aa6]">
                              {formatAdminDate(ad.startsAt)} → {formatAdminDate(ad.endsAt)} · {ad.href || "no link"}
                            </span>
                          </span>
                          <span className="flex shrink-0 flex-wrap items-center gap-1.5">
                            <AdminButton compact variant="secondary" onClick={() => startEdit(ad)} aria-label={`Edit ${ad.name}`}><Pencil size={12} /> Edit</AdminButton>
                            <AdminButton compact variant="ghost" onClick={() => updateAdminData((current) => toggleAd(current, ad.id))} aria-label={`${ad.enabled ? "Pause" : "Enable"} ${ad.name}`}>{ad.enabled ? "Pause" : "Enable"}</AdminButton>
                            <AdminButton compact variant="danger" onClick={() => clear(ad)} aria-label={`Clear ${ad.name}`}><Trash2 size={12} /> {confirmId === ad.id ? "Confirm" : "Delete"}</AdminButton>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-2 rounded-lg border border-dashed border-[#e6e9ed] px-2.5 py-3 text-[9px] font-semibold text-[#a3abb5]">
                    Empty — nothing shows in this place until a banner is added.
                  </p>
                )}
              </li>
            );
          }) : <li><AdminEmpty title="No places match this search" description="Try the page name, e.g. /new or /guide, or a banner name." /></li>}
        </ul>
      </AdminCard>

      <AdminCard className="mt-3">
        <div className="px-4 py-3">
          <h2 className="text-[11px] font-bold text-[#303844]">How slots work</h2>
          <ul className="mt-1 space-y-1 text-[10px] text-[#4b5563]">
            <li>Each row is one place on the site. A place can hold <span className="font-bold">as many banners as you like</span>.</li>
            <li>With one live banner it stays up. With several, they <span className="font-bold">take turns</span> at the speed below; banners outside their dates wait their turn.</li>
            <li><span className="font-bold">Edit</span> changes a banner, <span className="font-bold">Pause</span> hides it without losing it, <span className="font-bold">Delete</span> removes it.</li>
            <li>New places are added in code (<code>AD_SLOTS</code>) and mounted with <code>{'<AdSlotBanner slot="…" />'}</code> — they then appear on this board automatically.</li>
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-[#eef1f3] bg-[#fafbfc] px-2.5 py-2">
            <span className="text-[10px] font-bold text-[#394250]">Change banner every</span>
            <select
              aria-label="Seconds between banners"
              value={rotationSeconds}
              onChange={(event) => updateAdminData((current) => ({ ...current, adsRotationSeconds: normalizeAdsRotationSeconds(event.target.value) }))}
              className="rounded-md border border-[#e0e4e8] bg-white px-2 py-1 text-[10px] font-semibold text-[#394250] outline-none focus:border-[#4f9d16]"
            >
              {[...new Set<number>([...ADS_ROTATION_CHOICES, rotationSeconds])].sort((a, b) => a - b)
                .map((seconds) => <option key={seconds} value={seconds}>{seconds} seconds</option>)}
            </select>
            <span className="text-[9px] text-[#919aa6]">Applies wherever a place has more than one live banner.</span>
          </div>
        </div>
      </AdminCard>

      <AdminDrawer
        open={Boolean(editingId && draft)}
        title={editingId === "new" ? `New banner · ${adSlotLabel(draft?.slot ?? "home-hero")}` : `Edit ${editing?.name ?? "banner"}`}
        description="The banner shows while it is enabled and inside its window; pause it any time."
        onClose={closeEditor}
        footer={(
          <div className="flex items-center justify-end gap-2">
            <AdminButton variant="secondary" onClick={closeEditor}>Cancel</AdminButton>
            <AdminButton onClick={save}>{editingId === "new" ? "Create banner" : "Save changes"}</AdminButton>
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
              <AdminField label="Where it sits">
                <AdminSelect value={draft.slot} onChange={(event) => setDraft({ ...draft, slot: event.target.value as AdSlotId })} aria-label="Ad slot">
                  {AD_SLOTS.map((slot) => <option key={slot.id} value={slot.id}>{slot.page} · {slot.label}</option>)}
                </AdminSelect>
              </AdminField>
              <AdminField label="Banner name">
                <AdminInput value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Songkran hero" aria-label="Ad name" />
              </AdminField>
            </div>

            <fieldset className="rounded-xl border border-[#edf0f3] bg-[#fafbfc] p-3">
              <legend className="px-1 text-[9px] font-bold uppercase tracking-wide text-[#828c99]">Media</legend>
              <div className="flex flex-wrap gap-2">
                {([
                  { id: "image" as AdMediaType, label: "Banner photo", icon: <ImageIcon size={13} /> },
                  { id: "video" as AdMediaType, label: "Animation video", icon: <Film size={13} /> },
                ]).map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setDraft({ ...draft, mediaType: option.id })}
                    aria-pressed={draft.mediaType === option.id}
                    data-media-option={option.id}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[9px] font-bold ${draft.mediaType === option.id ? "border-[#7ac943] bg-[#f2fbe6] text-[#3f8c22]" : "border-[#e6e9ed] bg-white text-[#6c7683]"}`}
                  >
                    {option.icon} {option.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[9px] leading-snug text-[#87909b]">
                A few frames is enough: an animated GIF or WebP picked as a photo loops on its own, and a 6-frame
                1600x600 banner is about 20 KB — no video upload needed.
              </p>

              <div className="mt-3">
                <AdminField label="How it fits the box">
                  <AdminSelect value={draft.fit} onChange={(event) => setDraft({ ...draft, fit: event.target.value as AdFit })} aria-label="Ad fit">
                    {AD_FITS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                  </AdminSelect>
                </AdminField>
                <p className="mt-1 text-[9px] text-[#87909b]">{AD_FITS.find((option) => option.id === draft.fit)?.hint}</p>
              </div>

              <div className="mt-3">
                <AdminField label={draft.mediaType === "video" ? "Video URL (.mp4 / .webm)" : "Photo URL"}>
                  <AdminInput value={draft.mediaUrl} onChange={(event) => setDraft({ ...draft, mediaUrl: event.target.value })} placeholder={draft.mediaType === "video" ? "https://cdn.mhfashion.com/hero.mp4" : "/ads/hero.jpg"} aria-label="Ad media URL" />
                </AdminField>
                {draft.mediaType === "image" ? (
                  <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-[9px] font-bold text-[#3f8c22]">
                    <ImageIcon size={12} /> Pick a photo or an animated GIF
                    <input type="file" accept="image/*" aria-label="Pick an ad photo" className="hidden" onChange={(event) => { void pickFile(event.target.files?.[0], "mediaUrl"); event.target.value = ""; }} />
                  </label>
                ) : (
                  <p className="mt-2 text-[9px] text-[#87909b]">Uploads land in R2 once it is connected; until then a URL or a file in <code>public/ads/</code> works.</p>
                )}
              </div>

              {draft.mediaType === "video" ? (
                <div className="mt-3">
                  <AdminField label="Poster photo (first frame)">
                    <AdminInput value={draft.posterUrl} onChange={(event) => setDraft({ ...draft, posterUrl: event.target.value })} placeholder="/ads/hero-poster.jpg" aria-label="Ad poster URL" />
                  </AdminField>
                  <button type="button" onClick={() => posterInput.current?.click()} className="mt-2 inline-flex items-center gap-1.5 text-[9px] font-bold text-[#3f8c22]">
                    <ImageIcon size={12} /> Pick a poster from this computer
                  </button>
                  <input ref={posterInput} type="file" accept="image/*" aria-label="Pick an ad poster" className="hidden" onChange={(event) => { void pickFile(event.target.files?.[0], "posterUrl"); event.target.value = ""; }} />
                </div>
              ) : null}
            </fieldset>

            <MediaPreview draft={draft} />

            <AdminField label="Description" hint="Read by screen readers and search engines.">
              <AdminInput value={draft.alt} onChange={(event) => setDraft({ ...draft, alt: event.target.value })} placeholder="Songkran sale — 25% off all tees" aria-label="Ad description" />
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
          </div>
        ) : null}
      </AdminDrawer>
    </AdminShell>
  );
}
