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
  fontFamily?: string;
  fontWeight?: number;
  fontStyle?: "normal" | "italic";
  textAlign?: "left" | "center" | "right";
  underline?: boolean;
  letterSpacing?: number;
  lineHeight?: number;
  textTransform?: "none" | "arch" | "wave" | "circle";
  textEffect?: "none" | "shadow" | "outline";
  effectColor?: string;
  effectOffset?: number;
  effectBlur?: number;
  outlineWidth?: number;
  textDecoration?: "none" | "line" | "cut" | "oblique";
  decorationColor?: string;
  decorationWidth?: number;
};
export type EditorShapePath = {
  d: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
};
export type EditorShapeBuilderMode = "select" | "merge" | "subtract" | "intersect";
export type EditorShapeContent = { paths: EditorShapePath[]; builderMode?: EditorShapeBuilderMode };
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
  fillOpacity: number;
  blendMode: EditorLayerBlendMode;
  groupId: string | null;
  linkId: string | null;
  strokes: ArtworkStroke[];
  mask: LayerMaskStroke[] | null;
  text: EditorTextContent | null;
  shape: EditorShapeContent | null;
  image: EditorImageContent | null;
};

export type EditorLayerAppearance = Partial<
  Pick<EditorArtworkLayer, "visible" | "locked" | "opacity" | "fillOpacity" | "blendMode">
>;

export function createEditorArtworkLayer(id: string, name: string): EditorArtworkLayer {
  return {
    id,
    name,
    kind: "artwork",
    visible: true,
    locked: false,
    opacity: 100,
    fillOpacity: 100,
    blendMode: "normal",
    groupId: null,
    linkId: null,
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
    shape: { paths: shape.paths.map((path) => ({ ...path })), builderMode: shape.builderMode ?? "select" },
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

export function updateEditorLayerTextStyle(
  layers: EditorArtworkLayer[],
  layerId: string,
  update: Partial<Pick<EditorTextContent, "fontSize" | "color" | "fontFamily" | "fontWeight" | "fontStyle" | "textAlign" | "underline" | "letterSpacing" | "lineHeight" | "textTransform" | "textEffect" | "effectColor" | "effectOffset" | "effectBlur" | "outlineWidth" | "textDecoration" | "decorationColor" | "decorationWidth">>,
): EditorArtworkLayer[] {
  return layers.map((layer) => {
    if (layer.id !== layerId || !layer.text) return layer;
    return {
      ...layer,
      text: {
        ...layer.text,
        ...update,
        fontSize: update.fontSize === undefined ? layer.text.fontSize : Math.max(24, Math.min(260, update.fontSize)),
        letterSpacing: update.letterSpacing === undefined ? layer.text.letterSpacing : Math.max(-20, Math.min(80, update.letterSpacing)),
        lineHeight: update.lineHeight === undefined ? layer.text.lineHeight : Math.max(0.7, Math.min(3, update.lineHeight)),
      },
    };
  });
}

export function updateEditorShapeBuilderMode(
  layers: EditorArtworkLayer[],
  layerId: string,
  builderMode: EditorShapeBuilderMode,
): EditorArtworkLayer[] {
  return layers.map((layer) => layer.id === layerId && layer.shape ? { ...layer, shape: { ...layer.shape, builderMode } } : layer);
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
    if (typeof update.opacity === "number") next.opacity = Number.isFinite(update.opacity) ? Math.max(0, Math.min(100, update.opacity)) : layer.opacity;
    if (typeof update.fillOpacity === "number") next.fillOpacity = Number.isFinite(update.fillOpacity) ? Math.max(0, Math.min(100, update.fillOpacity)) : layer.fillOpacity;
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

export function moveEditorLayerToIndex(
  layers: EditorArtworkLayer[],
  layerId: string,
  targetIndex: number,
): EditorArtworkLayer[] {
  const currentIndex = layers.findIndex((layer) => layer.id === layerId);
  if (currentIndex < 0) return layers;
  const groupId = layers[currentIndex].groupId;
  const block = groupId === null
    ? [layers[currentIndex]]
    : layers.filter((layer) => layer.groupId === groupId);
  const blockIds = new Set(block.map((layer) => layer.id));
  const remaining = layers.filter((layer) => !blockIds.has(layer.id));
  const targetLayer = targetIndex >= layers.length ? undefined : layers[Math.max(0, targetIndex)];
  const targetBlockId = targetLayer?.groupId;
  const targetRemainingIndex = targetLayer === undefined
    ? remaining.length
    : targetBlockId === null || targetBlockId === undefined
    ? remaining.findIndex((layer) => layer.id === targetLayer?.id)
    : remaining.findIndex((layer) => layer.groupId === targetBlockId);
  const clampedIndex = targetRemainingIndex < 0 ? remaining.length : targetRemainingIndex;
  const next = [...remaining];
  next.splice(clampedIndex, 0, ...block);
  return next;
}

export function groupEditorLayers(
  layers: EditorArtworkLayer[],
  layerIds: string[],
  groupId: string,
): EditorArtworkLayer[] {
  const ids = new Set(layerIds);
  const selected = layers.filter((layer) => ids.has(layer.id));
  const rest = layers.filter((layer) => !ids.has(layer.id));
  const firstIndex = Math.min(...layerIds.map((id) => layers.findIndex((layer) => layer.id === id)).filter((index) => index >= 0));
  const grouped = selected.map((layer) => ({ ...layer, groupId }));
  rest.splice(Math.max(0, Math.min(rest.length, firstIndex < 0 ? rest.length : firstIndex)), 0, ...grouped);
  return rest;
}

export function ungroupEditorLayers(
  layers: EditorArtworkLayer[],
  layerIds: string[],
): EditorArtworkLayer[] {
  const ids = new Set(layerIds);
  return layers.map((layer) => (ids.has(layer.id) ? { ...layer, groupId: null } : layer));
}

export function linkEditorLayers(
  layers: EditorArtworkLayer[],
  layerIds: string[],
  linkId: string,
): EditorArtworkLayer[] {
  const ids = new Set(layerIds);
  return layers.map((layer) => (ids.has(layer.id) ? { ...layer, linkId } : layer));
}

export function unlinkEditorLayers(
  layers: EditorArtworkLayer[],
  layerIds: string[],
): EditorArtworkLayer[] {
  const ids = new Set(layerIds);
  return layers.map((layer) => (ids.has(layer.id) ? { ...layer, linkId: null } : layer));
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
    linkId: null,
    strokes: source.strokes.map(copyStroke),
    mask: source.mask?.map((stroke) => ({ ...copyStroke(stroke), mode: stroke.mode })) ?? null,
    text: source.text ? { ...source.text } : null,
    shape: source.shape ? { paths: source.shape.paths.map((path) => ({ ...path })), builderMode: source.shape.builderMode } : null,
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
