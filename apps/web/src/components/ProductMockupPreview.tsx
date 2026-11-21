"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EditorArtworkLayers from "@/components/EditorArtworkLayers";
import type { DesignOverlay } from "@/lib/design-draft";
import {
  PRODUCT_PRINT_AREA, mockupCandidates, selectionLabel, type ProductSelection,
} from "@/lib/product-mockup";

type Props = {
  slug: string;
  name: string;
  imageUrl?: string;
  selection: ProductSelection;
  design: DesignOverlay | null;
  className?: string;
};

export default function ProductMockupPreview({ slug, name, imageUrl, selection, design, className = "" }: Props) {
  const { color, fit, sleeve } = selection;
  const candidates = useMemo(
    () => mockupCandidates(slug, { color, fit, sleeve }, { fallback: imageUrl ?? null }),
    [slug, color, fit, sleeve, imageUrl],
  );
  const candidateKey = candidates.join("|");
  // A new selection restarts the fallback chain, so the cursor carries the candidate list
  // it belongs to and a stale index can never point past the new one.
  const [cursor, setCursor] = useState({ key: candidateKey, index: 0 });
  const index = cursor.key === candidateKey ? cursor.index : 0;
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Past the last candidate the preview falls back to the placeholder instead of a
  // broken image.
  const src = index < candidates.length ? candidates[index] : null;
  const status = !src ? "empty" : src === imageUrl ? "catalog" : "mockup";

  const advance = useCallback(() => {
    setCursor((current) => {
      const base = current.key === candidateKey ? current.index : 0;
      return { key: candidateKey, index: Math.min(base + 1, candidates.length) };
    });
  }, [candidateKey, candidates.length]);

  // A mockup that 404s during the first paint fails before React can attach onError, so
  // the already-settled image is checked once it is on screen.
  useEffect(() => {
    const image = imgRef.current;
    if (image && image.complete && image.naturalWidth === 0) advance();
  }, [src, advance]);
  const label = selectionLabel({ color, fit, sleeve });

  return (
    <div
      data-product-preview
      data-mockup-status={status}
      className={`relative aspect-square overflow-hidden rounded-2xl border border-border/70 bg-bg ${className}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          ref={imgRef}
          src={src}
          alt={label ? `${name} — ${label}` : name}
          data-product-mockup={src}
          onError={advance}
          className="h-full w-full object-contain"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-text-muted">Product preview</div>
      )}

      {design ? (
        <div
          data-design-overlay={design.kind}
          className="pointer-events-none absolute"
          style={{
            left: `${PRODUCT_PRINT_AREA.left * 100}%`,
            top: `${PRODUCT_PRINT_AREA.top * 100}%`,
            width: `${PRODUCT_PRINT_AREA.width * 100}%`,
            height: `${PRODUCT_PRINT_AREA.height * 100}%`,
          }}
        >
          {design.kind === "svg" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={design.url} alt="" className="h-full w-full object-contain" />
          ) : (
            <svg viewBox="0 0 1000 1200" preserveAspectRatio="xMidYMid meet" className="h-full w-full">
              <EditorArtworkLayers layers={design.layers} />
            </svg>
          )}
        </div>
      ) : null}
    </div>
  );
}
