// Banner ads are media only (owner request 2026-11-21): one photo or one looping animation per slot.
// An ad shows only while it is enabled and inside its window — nothing else decides visibility.

import type { AdminAd, AdMediaType, AdSlotId } from "@/lib/admin-demo-data";

const DAY_MS = 24 * 60 * 60 * 1000;

export type AdminAdStatus = "Live" | "Scheduled" | "Expired" | "Disabled";

export type AdminAdDraft = {
  slot: AdSlotId;
  name: string;
  mediaType: AdMediaType;
  mediaUrl: string;
  posterUrl: string;
  alt: string;
  href: string;
  startsAt: string;
  endsAt: string;
};

export const AD_SLOTS: { id: AdSlotId; label: string; where: string; size: string }[] = [
  // Both banners crop to fill: keep the artwork's subject centred so phones (which crop the sides) still read.
  { id: "home-hero", label: "Home hero", where: "Home page, replaces the green hero while it is live", size: "1600 x 600, centred" },
  { id: "home-strip", label: "Home strip", where: "Home page, under the category row", size: "1600 x 240, centred" },
];

export const MAX_IMAGE_BYTES = 900 * 1024;

/** A few frames are enough: an animated GIF or WebP loops in an <img>, so it needs no video at all. */
export function looksAnimatedMedia(url: string): boolean {
  return /\.(gif|webp)([?#].*)?$/i.test(url) || /^data:image\/(gif|webp)/i.test(url);
}

export function adMediaKind(ad: Pick<AdminAd, "mediaType" | "mediaUrl">): "Video" | "GIF" | "Photo" {
  if (ad.mediaType === "video") return "Video";
  return looksAnimatedMedia(ad.mediaUrl) ? "GIF" : "Photo";
}

export function adSlotLabel(slot: AdSlotId): string {
  return AD_SLOTS.find((entry) => entry.id === slot)?.label ?? slot;
}

export function adStatus(ad: AdminAd, now = Date.now()): AdminAdStatus {
  if (!ad.enabled) return "Disabled";
  const starts = Date.parse(ad.startsAt);
  const ends = Date.parse(ad.endsAt);
  if (!Number.isNaN(starts) && starts > now) return "Scheduled";
  if (!Number.isNaN(ends) && ends < now) return "Expired";
  return "Live";
}

export function adIsLive(ad: AdminAd, now = Date.now()): boolean {
  return adStatus(ad, now) === "Live";
}

/** What a slot renders right now: the newest live ad, otherwise nothing. */
export function activeAdFor(ads: readonly AdminAd[], slot: AdSlotId, now = Date.now()): AdminAd | null {
  return ads
    .filter((ad) => ad.slot === slot && adIsLive(ad, now))
    .slice()
    .sort((left, right) => Date.parse(right.startsAt) - Date.parse(left.startsAt))[0] ?? null;
}

export function makeAdId(now = Date.now()): string {
  return `ad_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function adDraftFrom(ad?: AdminAd, now = Date.now()): AdminAdDraft {
  return {
    slot: ad?.slot ?? "home-hero",
    name: ad?.name ?? "",
    mediaType: ad?.mediaType ?? "image",
    mediaUrl: ad?.mediaUrl ?? "",
    posterUrl: ad?.posterUrl ?? "",
    alt: ad?.alt ?? "",
    href: ad?.href ?? "",
    startsAt: (ad?.startsAt ?? new Date(now).toISOString()).slice(0, 10),
    endsAt: (ad?.endsAt ?? new Date(now + 30 * DAY_MS).toISOString()).slice(0, 10),
  };
}

function isMediaUrl(value: string, type: AdMediaType): boolean {
  if (/^https?:\/\//.test(value)) return true;
  if (value.startsWith("/")) return true;
  // A picked picture is stored inline; a video is far too large for that.
  return type === "image" && /^data:image\//.test(value);
}

export function validateAdDraft(draft: AdminAdDraft): string[] {
  const issues: string[] = [];
  if (!draft.name.trim()) issues.push("Give the ad a name the team recognises.");
  const media = draft.mediaUrl.trim();
  if (!media) issues.push(draft.mediaType === "video" ? "Add the animation video URL." : "Add the banner photo.");
  else if (!isMediaUrl(media, draft.mediaType)) {
    issues.push(draft.mediaType === "video"
      ? "The video must be a path starting with / or an https:// URL."
      : "The photo must be a path starting with /, an https:// URL or a picked image.");
  }
  const poster = draft.posterUrl.trim();
  if (poster && !/^https?:\/\//.test(poster) && !poster.startsWith("/") && !/^data:image\//.test(poster)) {
    issues.push("The poster must be a path starting with /, an https:// URL or a picked image.");
  }
  if (!draft.alt.trim()) issues.push("Describe what the banner shows — screen readers read this.");
  else if (draft.alt.trim().length > 120) issues.push("Keep the description under 120 characters.");
  const href = draft.href.trim();
  if (href && !href.startsWith("/") && !/^https?:\/\//.test(href)) issues.push("The link must start with / or https://.");
  const starts = Date.parse(draft.startsAt);
  const ends = Date.parse(draft.endsAt);
  if (Number.isNaN(starts)) issues.push("Pick a start date.");
  if (Number.isNaN(ends)) issues.push("Pick an end date.");
  if (!Number.isNaN(starts) && !Number.isNaN(ends) && ends <= starts) issues.push("The end date has to be after the start date.");
  return issues;
}

export function adFromDraft(draft: AdminAdDraft, existing?: AdminAd, now = Date.now()): AdminAd {
  return {
    id: existing?.id ?? makeAdId(now),
    slot: draft.slot,
    name: draft.name.trim(),
    mediaType: draft.mediaType,
    mediaUrl: draft.mediaUrl.trim(),
    posterUrl: draft.mediaType === "video" ? draft.posterUrl.trim() : "",
    alt: draft.alt.trim(),
    href: draft.href.trim(),
    enabled: existing?.enabled ?? true,
    startsAt: new Date(`${draft.startsAt}T00:00:00.000Z`).toISOString(),
    endsAt: new Date(`${draft.endsAt}T23:59:59.999Z`).toISOString(),
  };
}

type AdStore = { ads: AdminAd[] };

export function upsertAd<T extends AdStore>(data: T, ad: AdminAd): T {
  const found = data.ads.some((entry) => entry.id === ad.id);
  return { ...data, ads: found ? data.ads.map((entry) => (entry.id === ad.id ? ad : entry)) : [ad, ...data.ads] };
}

export function removeAd<T extends AdStore>(data: T, id: string): T {
  return { ...data, ads: data.ads.filter((entry) => entry.id !== id) };
}

export function toggleAd<T extends AdStore>(data: T, id: string): T {
  return { ...data, ads: data.ads.map((entry) => (entry.id === id ? { ...entry, enabled: !entry.enabled } : entry)) };
}

/** Reads a picked picture into a data URL, so a photo can be used before R2 is connected. */
export function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Pick a picture file (PNG, JPG, WebP or GIF)."));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      reject(new Error(`Keep the picture under ${Math.round(MAX_IMAGE_BYTES / 1024)} KB — larger files belong in R2.`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("That file could not be read."));
    reader.readAsDataURL(file);
  });
}
