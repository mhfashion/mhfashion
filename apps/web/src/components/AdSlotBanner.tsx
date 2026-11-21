"use client";

import type { ReactNode } from "react";
import type { AdminAd, AdSlotId } from "@/lib/admin-demo-data";
import { useStorefrontAd } from "@/lib/storefront-ads";

/** "contain" keeps the artwork's own shape, so a 728x90 leaderboard is never cropped or padded. */
function AdMedia({ ad }: { ad: AdminAd }) {
  const fit = ad.fit === "contain" ? "block h-auto w-full" : "h-full w-full object-cover";

  if (ad.mediaType === "video") {
    return (
      <video
        data-ad-video
        src={ad.mediaUrl}
        poster={ad.posterUrl || undefined}
        autoPlay
        muted
        loop
        playsInline
        aria-label={ad.alt}
        className={fit}
      />
    );
  }
  return <img data-ad-image src={ad.mediaUrl} alt={ad.alt} className={fit} />;
}

/**
 * Renders the live ad for a slot, or the fallback markup when the slot is empty.
 * Hero ads replace the home hero; strip ads sit under the category row.
 */
export default function AdSlotBanner({
  slot,
  variant = "strip",
  children,
}: {
  slot: AdSlotId;
  variant?: "hero" | "strip";
  children?: ReactNode;
}) {
  const ad = useStorefrontAd(slot);
  if (!ad) return <>{children ?? null}</>;

  const contained = ad.fit === "contain";
  const media = <AdMedia ad={ad} />;
  const content = ad.href
    ? <a href={ad.href} className="block h-full w-full" aria-label={ad.alt}>{media}</a>
    : media;

  if (variant === "hero") {
    return (
      <section
        data-ad-slot-banner={slot}
        data-ad-fit={ad.fit ?? "cover"}
        className={`relative isolate overflow-hidden rounded-2xl bg-bg-surface ${contained ? "" : "min-h-[155px] sm:min-h-[250px] lg:min-h-[300px]"}`}
      >
        {contained ? content : <div className="absolute inset-0">{content}</div>}
      </section>
    );
  }

  return (
    <section data-ad-slot-banner={slot} data-ad-fit={ad.fit ?? "cover"} className="mb-6 overflow-hidden rounded-2xl bg-bg-surface">
      {contained ? content : <div className="aspect-[16/7] sm:aspect-[20/3]">{content}</div>}
    </section>
  );
}
