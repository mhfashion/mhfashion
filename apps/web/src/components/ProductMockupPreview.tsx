"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, X } from "lucide-react";
import EditorArtworkLayers from "@/components/EditorArtworkLayers";
import type { DesignOverlay } from "@/lib/design-draft";
import {
  PRODUCT_PRINT_AREA, mockupCandidates, selectionLabel, type ProductSelection,
} from "@/lib/product-mockup";

type Colour = { name: string; className?: string };

type Props = {
  slug: string;
  name: string;
  imageUrl?: string;
  selection: ProductSelection;
  design: DesignOverlay | null;
  colours?: Colour[];
  onSelectColour?: (name: string) => void;
  className?: string;
};

const ZOOM_SCALE = 2.4;

// The mockup chain 404s whenever a look has no photo in the bucket, and an <img> that fails
// before hydration never fires onError, so the settled image is checked once it is on screen.
function useFallbackImage(candidates: string[]) {
  const key = candidates.join("|");
  const [cursor, setCursor] = useState({ key, index: 0 });
  const index = cursor.key === key ? cursor.index : 0;
  const imgRef = useRef<HTMLImageElement | null>(null);

  const advance = useCallback(() => {
    setCursor((current) => {
      const base = current.key === key ? current.index : 0;
      return { key, index: Math.min(base + 1, candidates.length) };
    });
  }, [key, candidates.length]);

  const src = index < candidates.length ? candidates[index] : null;
  useEffect(() => {
    const image = imgRef.current;
    if (image && image.complete && image.naturalWidth === 0) advance();
  }, [src, advance]);

  return { src, advance, imgRef };
}

function Artwork({
  src, design, alt, imageRef, onError,
}: {
  src: string;
  design: DesignOverlay | null;
  alt: string;
  imageRef?: React.Ref<HTMLImageElement>;
  onError?: () => void;
}) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        data-product-mockup={src}
        onError={onError}
        className="h-full w-full object-contain"
      />
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
    </>
  );
}

// Each tile walks the same look chain as the main image; when no photo resolves it shows the
// colour swatch, so the strip still reads as colours before the bucket has mockups.
function ColourTile({
  name, className, candidates, selected, onSelect,
}: {
  name: string;
  className?: string;
  candidates: string[];
  selected: boolean;
  onSelect: () => void;
}) {
  const { src, advance, imgRef } = useFallbackImage(candidates);

  return (
    <button
      type="button"
      data-product-thumb={name}
      aria-label={`Show ${name}`}
      aria-pressed={selected}
      title={name}
      onClick={onSelect}
      className={`relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border-2 bg-bg sm:h-14 sm:w-14 ${selected ? "border-accent" : "border-border/60 hover:border-accent/50"}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={src}
          alt=""
          data-thumb-photo={name}
          onError={advance}
          className="h-full w-full object-contain"
        />
      ) : (
        <span data-thumb-swatch={name} className={`block h-full w-full ${className ?? "bg-bg-surface"}`} />
      )}
      <span className="absolute inset-x-0 bottom-0 truncate bg-white/85 px-1 py-0.5 text-[8px] font-bold text-text-secondary">
        {name}
      </span>
    </button>
  );
}

export default function ProductMockupPreview({
  slug, name, imageUrl, selection, design, colours = [], onSelectColour, className = "",
}: Props) {
  const { color, fit, sleeve } = selection;
  const candidates = useMemo(
    () => mockupCandidates(slug, { color, fit, sleeve }, { fallback: imageUrl ?? null }),
    [slug, color, fit, sleeve, imageUrl],
  );
  const { src, advance, imgRef } = useFallbackImage(candidates);
  const status = !src ? "empty" : src === imageUrl ? "catalog" : "mockup";
  const label = selectionLabel({ color, fit, sleeve });

  const [zoom, setZoom] = useState({ active: false, x: 50, y: 50 });
  const [lightbox, setLightbox] = useState(false);

  // Escape closes the zoom view; without it the overlay traps the phone back button.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightbox(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  function trackZoom(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return;
    const box = event.currentTarget.getBoundingClientRect();
    setZoom({
      active: true,
      x: ((event.clientX - box.left) / box.width) * 100,
      y: ((event.clientY - box.top) / box.height) * 100,
    });
  }

  // One tile per colour: its look photo when the bucket has one, its swatch otherwise, so the
  // strip never collapses to nothing while the R2 mockups are still being uploaded.
  const thumbs = colours.map((colour) => ({
    name: colour.name,
    className: colour.className,
    candidates: mockupCandidates(slug, { color: colour.name, fit, sleeve }, { includeDefault: false }),
  }));
  const activeColour = colours.find((colour) => colour.name === color) ?? null;

  // The thumbnails ride in a rail beside the photo instead of under it, so the media block costs
  // only the photo's own height. The rail is pinned to the photo's box and scrolls internally.
  const rail = thumbs.length ? (
    <div
      data-product-thumbs
      // scrollbar hidden: a classic scrollbar would narrow the rail and shrink the square tiles
      className="absolute inset-y-0 left-0 flex w-11 flex-col gap-1.5 overflow-y-auto [scrollbar-width:none] sm:w-14 sm:gap-2"
    >
      {thumbs.map((thumb) => (
        <ColourTile
          key={thumb.name}
          name={thumb.name}
          className={thumb.className}
          candidates={thumb.candidates}
          selected={color === thumb.name}
          onSelect={() => onSelectColour?.(thumb.name)}
        />
      ))}
    </div>
  ) : null;

  return (
    <div className={className}>
      <div className="relative">
        {rail}
        <div
          data-product-preview
          data-mockup-status={status}
          onPointerMove={trackZoom}
          onPointerLeave={() => setZoom((current) => ({ ...current, active: false }))}
          // Mockup photos ship on a white background, so the box is white while one is showing and the
          // letterbox bars disappear into the photo.
          className={`group relative h-[170px] overflow-hidden rounded-2xl border border-border/70 sm:aspect-[16/10] sm:h-auto ${src ? "bg-white" : "bg-bg"} ${rail ? "ml-12 sm:ml-16" : ""}`}
        >
          {src ? (
            <>
              <button
                type="button"
                aria-label="Zoom product image"
                data-product-zoom
                onClick={() => setLightbox(true)}
                className="block h-full w-full cursor-zoom-in"
              >
                <span
                  data-product-zoom-layer
                  className="relative block h-full w-full transition-transform duration-300 ease-out"
                  style={{
                    transform: zoom.active ? `scale(${ZOOM_SCALE})` : "scale(1)",
                    transformOrigin: `${zoom.x}% ${zoom.y}%`,
                  }}
                >
                  <Artwork src={src} design={design} alt={label ? `${name} — ${label}` : name} imageRef={imgRef} onError={advance} />
                </span>
              </button>
              <span className="pointer-events-none absolute bottom-2 right-2 hidden items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[9px] font-bold text-white shadow-sm group-hover:flex">
                <Maximize2 size={10} /> Zoom
              </span>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1.5 px-4 text-center">
              <span
                data-product-placeholder-swatch
                className={`h-14 w-14 rounded-full border border-border ${activeColour?.className ?? "bg-bg-surface"}`}
              />
              <span className="text-[11px] font-bold text-text-primary">{activeColour?.name ?? name}</span>
              <span className="text-[10px] text-text-muted">Mockup photo coming soon</span>
            </div>
          )}
        </div>
      </div>

      {lightbox && src ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${name} enlarged`}
          data-product-lightbox
          onClick={() => setLightbox(false)}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
        >
          <button
            type="button"
            aria-label="Close enlarged image"
            onClick={() => setLightbox(false)}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-text-primary"
          >
            <X size={16} />
          </button>
          <div className="relative aspect-square w-full max-w-[min(92vw,640px)]">
            <Artwork src={src} design={design} alt={label ? `${name} — ${label}` : name} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
