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

export function saveDesignDraft(layers: EditorArtworkLayer[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DESIGN_DRAFT_KEY, JSON.stringify({ layers, updatedAt: Date.now() }));
  } catch {
    // A full quota or a private-mode browser must not break editing.
  }
}

export function readDesignDraft(): EditorArtworkLayer[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DESIGN_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { layers?: EditorArtworkLayer[] };
    return Array.isArray(parsed.layers) ? parsed.layers : null;
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
