export type ArtworkPoint = { x: number; y: number };
export type ArtworkStroke = { points: ArtworkPoint[]; tool?: "pen" | "brush"; color?: string };
export type MaskBrushMode = "hide" | "reveal";
export type LayerEditTarget = "artwork" | "mask";
export type EditorLayerBlendMode = "normal" | "multiply" | "screen" | "overlay";
export type LayerMaskStroke = ArtworkStroke & { mode: MaskBrushMode };
export type EditorLayerKind = "artwork" | "text" | "shape" | "image";
export type EditorTextContent = {
  value: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
};
export type EditorShapePath = {
  d: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
};
export type EditorShapeContent = { paths: EditorShapePath[] };
export type EditorImageContent = {
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  byteSize: number;
};

export type EditorArtworkLayer = {
  id: string;
  name: string;
  kind: EditorLayerKind;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: EditorLayerBlendMode;
  strokes: ArtworkStroke[];
  mask: LayerMaskStroke[] | null;
  text: EditorTextContent | null;
  shape: EditorShapeContent | null;
  image: EditorImageContent | null;
};

export type EditorLayerAppearance = Partial<
  Pick<EditorArtworkLayer, "visible" | "locked" | "opacity" | "blendMode">
>;

export function createEditorArtworkLayer(id: string, name: string): EditorArtworkLayer {
  return {
    id,
    name,
    kind: "artwork",
    visible: true,
    locked: false,
    opacity: 100,
    blendMode: "normal",
    strokes: [],
    mask: null,
    text: null,
    shape: null,
    image: null,
  };
}

export function createEditorTextLayer(
  id: string,
  name: string,
  text: EditorTextContent,
): EditorArtworkLayer {
  return { ...createEditorArtworkLayer(id, name), kind: "text", text: { ...text } };
}

export function createEditorShapeLayer(
  id: string,
  name: string,
  shape: EditorShapeContent,
): EditorArtworkLayer {
  return {
    ...createEditorArtworkLayer(id, name),
    kind: "shape",
    shape: { paths: shape.paths.map((path) => ({ ...path })) },
  };
}

export function createEditorImageLayer(
  id: string,
  name: string,
  image: EditorImageContent,
): EditorArtworkLayer {
  return { ...createEditorArtworkLayer(id, name), kind: "image", image: { ...image } };
}

export function setEditorLayerText(
  layers: EditorArtworkLayer[],
  layerId: string,
  value: string,
): EditorArtworkLayer[] {
  return layers.map((layer) =>
    layer.id === layerId && layer.text ? { ...layer, text: { ...layer.text, value } } : layer,
  );
}

function copyStroke(stroke: ArtworkStroke): ArtworkStroke {
  return { ...stroke, points: stroke.points.map((point) => ({ ...point })) };
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
    text: source.text ? { ...source.text } : null,
    shape: source.shape ? { paths: source.shape.paths.map((path) => ({ ...path })) } : null,
    image: source.image ? { ...source.image } : null,
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
