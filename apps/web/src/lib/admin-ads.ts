// Storefront ads (Plan §10): the admin owns the banner copy, the link and the run window.
// An ad is shown only while it is enabled and inside its window — nothing else decides visibility.

import type { AdSlotId, AdminAd } from "@/lib/admin-demo-data";

const DAY_MS = 24 * 60 * 60 * 1000;

export type AdminAdStatus = "Live" | "Scheduled" | "Expired" | "Disabled";

export type AdminAdDraft = {
  slot: AdSlotId;
  name: string;
  headline: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string;
  startsAt: string;
  endsAt: string;
};

export const AD_SLOTS: { id: AdSlotId; label: string; where: string; size: string }[] = [
  { id: "home-hero", label: "Home hero", where: "Home page, above the first product row", size: "1200 x 400" },
  { id: "home-strip", label: "Home strip", where: "Home page, between the category row and Popular", size: "1200 x 160" },
  { id: "category-banner", label: "Category banner", where: "Category and collection pages, under the heading", size: "1200 x 220" },
  { id: "guide-rail", label: "Guide rail", where: "Guide pages, under the category menu", size: "220 x 300" },
  { id: "checkout-aside", label: "Checkout aside", where: "Checkout, under the order summary", size: "360 x 180" },
];

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

/** The ad a slot should render right now: the first live one wins, newest window first. */
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
    headline: ad?.headline ?? "",
    body: ad?.body ?? "",
    ctaLabel: ad?.ctaLabel ?? "Shop now",
    ctaHref: ad?.ctaHref ?? "/products",
    imageUrl: ad?.imageUrl ?? "",
    startsAt: (ad?.startsAt ?? new Date(now).toISOString()).slice(0, 10),
    endsAt: (ad?.endsAt ?? new Date(now + 30 * DAY_MS).toISOString()).slice(0, 10),
  };
}

export function validateAdDraft(draft: AdminAdDraft): string[] {
  const issues: string[] = [];
  if (!draft.name.trim()) issues.push("Give the campaign a name the team recognises.");
  if (!draft.headline.trim()) issues.push("The headline is what the banner shows — it cannot be empty.");
  else if (draft.headline.trim().length > 60) issues.push("Keep the headline under 60 characters so it fits the banner.");
  if (draft.body.trim().length > 160) issues.push("Keep the body under 160 characters.");
  const href = draft.ctaHref.trim();
  if (!href) issues.push("Add a link for the button.");
  else if (!/^\/|^https?:\/\//.test(href)) issues.push("The link must start with / or https://.");
  const image = draft.imageUrl.trim();
  if (image && !/^\/|^https?:\/\//.test(image)) issues.push("The image must be a path starting with / or an https:// URL.");
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
    headline: draft.headline.trim(),
    body: draft.body.trim(),
    ctaLabel: draft.ctaLabel.trim(),
    ctaHref: draft.ctaHref.trim(),
    imageUrl: draft.imageUrl.trim(),
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
