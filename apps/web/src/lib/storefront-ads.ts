"use client";

import { useEffect, useState } from "react";
import type { AdminAd, AdSlotId } from "@/lib/admin-demo-data";
import { activeAdFor } from "@/lib/admin-ads";

export const ADMIN_DATA_KEY = "mh-fashion-admin-demo-data-v1";

/** Reads only the ads the admin saved; the storefront never seeds the demo store on its own. */
export function readStorefrontAds(): AdminAd[] {
  try {
    const raw = window.localStorage.getItem(ADMIN_DATA_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { ads?: unknown };
    if (!Array.isArray(parsed.ads)) return [];
    return (parsed.ads as AdminAd[]).filter((ad) => ad?.mediaType === "image" || ad?.mediaType === "video");
  } catch {
    return [];
  }
}

/** The ad a slot should show right now, kept in sync when the admin pauses or replaces it. */
export function useStorefrontAd(slot: AdSlotId): AdminAd | null {
  const [ad, setAd] = useState<AdminAd | null>(null);

  useEffect(() => {
    const sync = () => setAd(activeAdFor(readStorefrontAds(), slot));
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [slot]);

  return ad;
}
