export type ArtworkPoint = { x: number; y: number };
export type ArtworkStroke = { points: ArtworkPoint[] };
export type MaskBrushMode = "hide" | "reveal";
export type LayerEditTarget = "artwork" | "mask";
export type EditorLayerBlendMode = "normal" | "multiply" | "screen" | "overlay";
export type LayerMaskStroke = ArtworkStroke & { mode: MaskBrushMode };

export type EditorArtworkLayer = {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: EditorLayerBlendMode;
  strokes: ArtworkStroke[];
  mask: LayerMaskStroke[] | null;
};

export type EditorLayerAppearance = Partial<
  Pick<EditorArtworkLayer, "visible" | "locked" | "opacity" | "blendMode">
>;

export function createEditorArtworkLayer(id: string, name: string): EditorArtworkLayer {
  return {
    id,
    name,
    visible: true,
    locked: false,
    opacity: 100,
    blendMode: "normal",
    strokes: [],
    mask: null,
  };
}

function copyStroke(stroke: ArtworkStroke): ArtworkStroke {
  return { points: stroke.points.map((point) => ({ ...point })) };
}

export function appendLayerStroke(
  layers: EditorArtworkLayer[],
  layerId: string,
  target: LayerEditTarget,
  stroke: ArtworkStroke,
  maskBrushMode: MaskBrushMode,
): EditorArtworkLayer[] {
  return layers.map((layer) => {
    if (layer.id !== layerId || layer.locked) return layer;
    if (target === "mask") {
      if (layer.mask === null) return layer;
      return {
        ...layer,
        mask: [...layer.mask, { ...copyStroke(stroke), mode: maskBrushMode }],
      };
    }
    return { ...layer, strokes: [...layer.strokes, copyStroke(stroke)] };
  });
}

export function updateLayerLastStroke(
  layers: EditorArtworkLayer[],
  layerId: string,
  target: LayerEditTarget,
  stroke: ArtworkStroke,
  maskBrushMode: MaskBrushMode,
): EditorArtworkLayer[] {
  return layers.map((layer) => {
    if (layer.id !== layerId || layer.locked) return layer;
    if (target === "mask") {
      if (!layer.mask?.length) return layer;
      return {
        ...layer,
        mask: [...layer.mask.slice(0, -1), { ...copyStroke(stroke), mode: maskBrushMode }],
      };
    }
    if (!layer.strokes.length) return layer;
    return { ...layer, strokes: [...layer.strokes.slice(0, -1), copyStroke(stroke)] };
  });
}

export function addLayerMask(layers: EditorArtworkLayer[], layerId: string): EditorArtworkLayer[] {
  return layers.map((layer) =>
    layer.id === layerId && layer.mask === null ? { ...layer, mask: [] } : layer,
  );
}

export function removeLayerMask(layers: EditorArtworkLayer[], layerId: string): EditorArtworkLayer[] {
  return layers.map((layer) => (layer.id === layerId ? { ...layer, mask: null } : layer));
}

export function updateEditorLayer(
  layers: EditorArtworkLayer[],
  layerId: string,
  update: Partial<EditorArtworkLayer>,
): EditorArtworkLayer[] {
  return layers.map((layer) => {
    if (layer.id !== layerId) return layer;
    const next = { ...layer, ...update, id: layer.id };
    if (typeof update.opacity === "number") next.opacity = Math.max(0, Math.min(100, update.opacity));
    if (typeof update.name === "string") next.name = update.name.trim() || layer.name;
    return next;
  });
}

export function reorderEditorLayer(
  layers: EditorArtworkLayer[],
  layerId: string,
  direction: -1 | 1,
): EditorArtworkLayer[] {
  const index = layers.findIndex((layer) => layer.id === layerId);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= layers.length) return layers;
  const next = [...layers];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next;
}

export function duplicateEditorLayer(
  layers: EditorArtworkLayer[],
  layerId: string,
  newId: string,
): EditorArtworkLayer[] {
  const index = layers.findIndex((layer) => layer.id === layerId);
  if (index < 0) return layers;
  const source = layers[index];
  const duplicate: EditorArtworkLayer = {
    ...source,
    id: newId,
    name: `${source.name} copy`,
    locked: false,
    strokes: source.strokes.map(copyStroke),
    mask: source.mask?.map((stroke) => ({ ...copyStroke(stroke), mode: stroke.mode })) ?? null,
  };
  const next = [...layers];
  next.splice(index, 0, duplicate);
  return next;
}

export function deleteEditorLayer(
  layers: EditorArtworkLayer[],
  layerId: string,
): EditorArtworkLayer[] {
  return layers.filter((layer) => layer.id !== layerId);
}
