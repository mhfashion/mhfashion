"use client";

import { useEffect, useState } from "react";
import { DEFAULT_ADS_ROTATION_SECONDS, normalizeAdsRotationSeconds, type AdminAd, type AdSlotId } from "@/lib/admin-demo-data";
import { adForMoment } from "@/lib/admin-ads";

export const ADMIN_DATA_KEY = "mh-fashion-admin-demo-data-v1";

type AdStore = { ads: AdminAd[]; rotationSeconds: number };

const EMPTY: AdStore = { ads: [], rotationSeconds: DEFAULT_ADS_ROTATION_SECONDS };

/** Reads only the ads the admin saved; the storefront never seeds the demo store on its own. */
export function readStorefrontAds(): AdStore {
  try {
    const raw = window.localStorage.getItem(ADMIN_DATA_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as { ads?: unknown; adsRotationSeconds?: unknown };
    const ads = Array.isArray(parsed.ads)
      ? (parsed.ads as AdminAd[]).filter((ad) => ad?.mediaType === "image" || ad?.mediaType === "video")
      : [];
    return { ads, rotationSeconds: normalizeAdsRotationSeconds(parsed.adsRotationSeconds) };
  } catch {
    return EMPTY;
  }
}

/**
 * The banner a place shows right now. When a place holds several live banners they take turns; the
 * component only re-renders when the turn actually changes, and the choice comes from the clock, so a
 * reload never restarts the cycle.
 */
export function useStorefrontAd(slot: AdSlotId): AdminAd | null {
  const [store, setStore] = useState<AdStore>(EMPTY);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const sync = () => {
      setStore(readStorefrontAds());
      setNow(Date.now());
    };
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [slot]);

  const liveCount = store.ads.filter((ad) => ad.slot === slot).length;
  const period = store.rotationSeconds * 1000;

  useEffect(() => {
    if (liveCount < 2) return;
    // Wake up on the next turn boundary rather than every second.
    const tick = () => {
      setNow(Date.now());
      timer = window.setTimeout(tick, period - (Date.now() % period) + 50);
    };
    let timer = window.setTimeout(tick, period - (Date.now() % period) + 50);
    return () => window.clearTimeout(timer);
  }, [liveCount, period]);

  if (now === null) return null;
  return adForMoment(store.ads, slot, now, store.rotationSeconds);
}
