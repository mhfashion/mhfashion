import type {
  ArtworkPoint,
  ArtworkStroke,
  EditorArtworkLayer,
  EditorErasure,
  EditorLayerKind,
  EditorShapePath,
  EditorTextContent,
  LayerMaskStroke,
} from "@/lib/editor-layers";

// The product page shows the design that is open in the editor, and the editor has no
// publish step yet, so the draft artwork is kept in the browser between the two routes.
export const DESIGN_DRAFT_KEY = "mh-fashion-design-draft-v1";

export type DesignOverlay =
  | { kind: "svg"; url: string }
  | { kind: "layers"; layers: EditorArtworkLayer[] };

export function designLayersHaveArtwork(layers: EditorArtworkLayer[] | null | undefined): boolean {
  if (!Array.isArray(layers)) return false;
  return layers.some((layer) => (
    layer != null
    && ((layer.strokes?.length ?? 0) > 0
      || Boolean(layer.text)
      || Boolean(layer.image)
      || (layer.shape?.paths?.length ?? 0) > 0)
  ));
}

const DRAFT_LAYER_KINDS: readonly EditorLayerKind[] = ["artwork", "text", "shape", "image", "gradient"];

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readPoints(raw: unknown): ArtworkPoint[] {
  if (!Array.isArray(raw)) return [];
  const points: ArtworkPoint[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const point = entry as Record<string, unknown>;
    const x = finiteNumber(point.x, NaN);
    const y = finiteNumber(point.y, NaN);
    if (Number.isFinite(x) && Number.isFinite(y)) points.push({ x, y });
  }
  return points;
}

/** A stroke needs points the renderer can walk: `points.map` on anything else throws and blanks the page. */
function readStrokes<T extends ArtworkStroke>(raw: unknown): T[] {
  if (!Array.isArray(raw)) return [];
  const strokes: T[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const stroke = entry as Record<string, unknown>;
    const points = readPoints(stroke.points);
    if (points.length < 2) continue;
    strokes.push({ ...stroke, points } as unknown as T);
  }
  return strokes;
}

function readShapePaths(raw: unknown): EditorShapePath[] {
  if (!Array.isArray(raw)) return [];
  const paths: EditorShapePath[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const path = entry as Record<string, unknown>;
    const points = readPoints(path.points);
    if (points.length < 2) continue;
    paths.push({ ...path, points } as unknown as EditorShapePath);
  }
  return paths;
}

function readText(raw: unknown): EditorTextContent | null {
  if (!raw || typeof raw !== "object") return null;
  const text = raw as Record<string, unknown>;
  if (typeof text.value !== "string") return null;
  const fontSize = finiteNumber(text.fontSize, NaN);
  if (!(fontSize > 0)) return null;
  return {
    ...text,
    value: text.value,
    x: finiteNumber(text.x, 0),
    y: finiteNumber(text.y, 0),
    fontSize,
    color: typeof text.color === "string" && text.color ? text.color : "#202124",
  } as EditorTextContent;
}

/**
 * A layer kept in `localStorage` can be stale, hand-edited or half-written by a crashed tab. Reading
 * it back unchecked put `undefined` in front of the renderer, which threw while painting and left the
 * editor on "This page couldn't load" until the visitor cleared storage. A layer that cannot be
 * repaired is skipped, the way a bad font or brush entry is.
 */
function readDraftLayer(raw: unknown): EditorArtworkLayer | null {
  if (!raw || typeof raw !== "object") return null;
  const layer = raw as Record<string, unknown>;
  const id = typeof layer.id === "string" ? layer.id.trim() : "";
  if (!id) return null;
  // A draft written by an older build can name a kind this build does not know. The kind only picks
  // which content the layer is checked against, so an unknown one is treated as plain artwork.
  const kind = (DRAFT_LAYER_KINDS.includes(layer.kind as EditorLayerKind) ? layer.kind : "artwork") as EditorLayerKind;

  const text = readText(layer.text);
  if (kind === "text" && !text) return null;
  const shape = layer.shape && typeof layer.shape === "object" ? layer.shape as Record<string, unknown> : null;
  const paths = readShapePaths(shape?.paths);
  if (kind === "shape" && paths.length === 0) return null;
  const image = layer.image && typeof layer.image === "object" ? layer.image : null;
  if (kind === "image" && !image) return null;

  return {
    ...(layer as unknown as EditorArtworkLayer),
    id,
    name: typeof layer.name === "string" && layer.name.trim() ? layer.name : "Layer",
    kind,
    visible: layer.visible !== false,
    locked: layer.locked === true,
    opacity: Math.min(100, Math.max(0, finiteNumber(layer.opacity, 100))),
    fillOpacity: Math.min(100, Math.max(0, finiteNumber(layer.fillOpacity, 100))),
    groupId: typeof layer.groupId === "string" ? layer.groupId : null,
    linkId: typeof layer.linkId === "string" ? layer.linkId : null,
    strokes: readStrokes<ArtworkStroke>(layer.strokes),
    erasures: readStrokes<EditorErasure>(layer.erasures),
    mask: Array.isArray(layer.mask) ? readStrokes<LayerMaskStroke>(layer.mask) : null,
    text,
    shape: shape ? ({ ...shape, paths } as unknown as EditorArtworkLayer["shape"]) : null,
    image: image as EditorArtworkLayer["image"],
    gradient: (layer.gradient && typeof layer.gradient === "object" ? layer.gradient : null) as EditorArtworkLayer["gradient"],
  };
}

export function sanitizeDesignDraftLayers(raw: unknown): EditorArtworkLayer[] {
  if (!Array.isArray(raw)) return [];
  const layers: EditorArtworkLayer[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    const layer = readDraftLayer(entry);
    if (!layer || seen.has(layer.id)) continue;
    seen.add(layer.id);
    layers.push(layer);
  }
  return layers;
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
    const parsed = JSON.parse(raw) as { layers?: unknown; placement?: unknown };
    if (!Array.isArray(parsed.layers)) return null;
    return { layers: sanitizeDesignDraftLayers(parsed.layers), placement: readPlacement(parsed.placement) };
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
