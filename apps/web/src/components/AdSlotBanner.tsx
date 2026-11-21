"use client";

import type { ReactNode } from "react";
import type { AdminAd, AdSlotId } from "@/lib/admin-demo-data";
import { useStorefrontAd } from "@/lib/storefront-ads";

function AdMedia({ ad }: { ad: AdminAd }) {
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
        className="h-full w-full object-cover"
      />
    );
  }
  return <img data-ad-image src={ad.mediaUrl} alt={ad.alt} className="h-full w-full object-cover" />;
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

  const media = <AdMedia ad={ad} />;
  const content = ad.href
    ? <a href={ad.href} className="block h-full w-full" aria-label={ad.alt}>{media}</a>
    : media;

  if (variant === "hero") {
    return (
      <section data-ad-slot-banner={slot} className="relative isolate min-h-[155px] overflow-hidden rounded-2xl bg-bg-surface sm:min-h-[250px] lg:min-h-[300px]">
        <div className="absolute inset-0">{content}</div>
      </section>
    );
  }

  return (
    <section data-ad-slot-banner={slot} className="mb-6 overflow-hidden rounded-2xl bg-bg-surface">
      <div className="aspect-[16/7] sm:aspect-[20/3]">{content}</div>
    </section>
  );
}
