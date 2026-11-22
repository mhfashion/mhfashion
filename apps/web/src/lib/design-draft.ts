import type { EditorArtworkLayer } from "@/lib/editor-layers";

// The product page shows the design that is open in the editor, and the editor has no
// publish step yet, so the draft artwork is kept in the browser between the two routes.
export const DESIGN_DRAFT_KEY = "mh-fashion-design-draft-v1";

export type DesignOverlay =
  | { kind: "svg"; url: string }
  | { kind: "layers"; layers: EditorArtworkLayer[] };

export function designLayersHaveArtwork(layers: EditorArtworkLayer[] | null | undefined): boolean {
  if (!Array.isArray(layers)) return false;
  return layers.some((layer) => (
    (layer.strokes?.length ?? 0) > 0
    || Boolean(layer.text)
    || Boolean(layer.image)
    || (layer.shape?.paths?.length ?? 0) > 0
  ));
}

/**
 * Where a layer sits on the canvas. Move, resize and rotate are held beside the layer model, so a
 * draft that stored only `layers` put every restored layer back at its untransformed anchor.
 */
export type DesignPlacement = { offset: { x: number; y: number }; scale: { x: number; y: number }; rotation: number };

export type DesignDraftSnapshot = {
  layers: EditorArtworkLayer[];
  placement: Record<string, DesignPlacement>;
};

/** `false` means the browser refused the write (quota, private mode, storage disabled). */
export function saveDesignDraft(layers: EditorArtworkLayer[], placement?: Record<string, DesignPlacement>): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(DESIGN_DRAFT_KEY, JSON.stringify({ layers, placement: placement ?? {}, updatedAt: Date.now() }));
    return true;
  } catch {
    // A full quota or a private-mode browser must not break editing.
    return false;
  }
}

export function readDesignDraft(): EditorArtworkLayer[] | null {
  return readDesignDraftSnapshot()?.layers ?? null;
}

function readPlacement(value: unknown): Record<string, DesignPlacement> {
  if (!value || typeof value !== "object") return {};
  const placement: Record<string, DesignPlacement> = {};
  for (const [id, entry] of Object.entries(value as Record<string, unknown>)) {
    const candidate = entry as Partial<DesignPlacement> | null;
    if (!candidate) continue;
    const x = Number(candidate.offset?.x);
    const y = Number(candidate.offset?.y);
    const scaleX = Number(candidate.scale?.x);
    const scaleY = Number(candidate.scale?.y);
    const rotation = Number(candidate.rotation);
    placement[id] = {
      offset: { x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : 0 },
      scale: { x: Number.isFinite(scaleX) && scaleX > 0 ? scaleX : 1, y: Number.isFinite(scaleY) && scaleY > 0 ? scaleY : 1 },
      rotation: Number.isFinite(rotation) ? rotation : 0,
    };
  }
  return placement;
}

/** The whole draft, including where each layer was left on the canvas. */
export function readDesignDraftSnapshot(): DesignDraftSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DESIGN_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { layers?: EditorArtworkLayer[]; placement?: unknown };
    if (!Array.isArray(parsed.layers)) return null;
    return { layers: parsed.layers, placement: readPlacement(parsed.placement) };
  } catch {
    return null;
  }
}

export function clearDesignDraft(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DESIGN_DRAFT_KEY);
}

// An explicit SVG (the product's own artwork, or `?design=` from a share link) beats the
// draft, and an empty draft is no overlay at all.
export function resolveDesignOverlay(input: {
  svgUrl?: string | null;
  draft?: EditorArtworkLayer[] | null;
}): DesignOverlay | null {
  const url = (input.svgUrl ?? "").trim();
  if (url) return { kind: "svg", url };
  if (designLayersHaveArtwork(input.draft)) return { kind: "layers", layers: input.draft as EditorArtworkLayer[] };
  return null;
}
