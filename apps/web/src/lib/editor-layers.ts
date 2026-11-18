import type { EditorPenPath } from "./editor-pen-path";

export type ArtworkPoint = { x: number; y: number };
export type EditorBrushShape = "round" | "square";
export type ArtworkStroke = {
  points: ArtworkPoint[];
  tool?: "pen" | "brush";
  color?: string;
  /** Brush/pencil nib size in 1000 x 1200 artwork units. */
  width?: number;
  /** Brush/pencil ink opacity, 0 to 1. */
  opacity?: number;
  shape?: EditorBrushShape;
  /** Edge softness, 0 (hard) to 100 (fully feathered). */
  softness?: number;
};
export type EditorBrushSettings = {
  shape: EditorBrushShape;
  size: number;
  opacity: number;
  softness: number;
  feather: number;
};
export type EditorPenSettings = { width: number; cap: "round" | "butt" | "square" };
export type EditorEraserSettings = { size: number };
export type EditorToolOptions = {
  brush: EditorBrushSettings;
  pencil: EditorBrushSettings;
  eraser: EditorEraserSettings;
  pen: EditorPenSettings;
};
export const EDITOR_BRUSH_SHAPES: EditorBrushShape[] = ["round", "square"];
export const EDITOR_TOOL_OPTIONS_DEFAULT: EditorToolOptions = {
  brush: { shape: "round", size: 52, opacity: 0.68, softness: 0, feather: 0 },
  pencil: { shape: "round", size: 24, opacity: 1, softness: 0, feather: 0 },
  eraser: { size: 180 },
  pen: { width: 5, cap: "round" },
};

const clamp = (value: number, min: number, max: number) => Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : min;

export function normalizeEditorBrush(input: Partial<EditorBrushSettings> | undefined, fallback: EditorBrushSettings): EditorBrushSettings {
  return {
    shape: input?.shape === "square" ? "square" : "round",
    size: clamp(input?.size ?? fallback.size, 1, 400),
    opacity: clamp(input?.opacity ?? fallback.opacity, 0.01, 1),
    softness: clamp(input?.softness ?? fallback.softness, 0, 100),
    feather: clamp(input?.feather ?? fallback.feather, 0, 100),
  };
}

/** Clamp every tool option so the stored values always render safely. */
export function normalizeEditorToolOptions(input: Partial<EditorToolOptions> | undefined): EditorToolOptions {
  return {
    brush: normalizeEditorBrush(input?.brush, EDITOR_TOOL_OPTIONS_DEFAULT.brush),
    pencil: normalizeEditorBrush(input?.pencil, EDITOR_TOOL_OPTIONS_DEFAULT.pencil),
    eraser: { size: clamp(input?.eraser?.size ?? EDITOR_TOOL_OPTIONS_DEFAULT.eraser.size, 10, 600) },
    pen: {
      width: clamp(input?.pen?.width ?? EDITOR_TOOL_OPTIONS_DEFAULT.pen.width, 1, 60),
      cap: input?.pen?.cap === "butt" || input?.pen?.cap === "square" ? input.pen.cap : "round",
    },
  };
}
export type MaskBrushMode = "hide" | "reveal";
export type LayerEditTarget = "artwork" | "mask";
export type EditorLayerBlendMode = "normal" | "multiply" | "screen" | "overlay";
export type LayerMaskStroke = ArtworkStroke & { mode: MaskBrushMode };
export type EditorLayerKind = "artwork" | "text" | "shape" | "image";
export type EditorTextEffectKind = "shadow" | "outline" | "glow" | "offset" | "echo" | "extrude" | "stripe";
export type EditorTextEffect = {
  id: string;
  kind: EditorTextEffectKind;
  color: string;
  enabled?: boolean;
  offsetX?: number;
  offsetY?: number;
  blur?: number;
  width?: number;
  count?: number;
  distance?: number;
  angle?: number;
  opacity?: number;
};
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
  effects?: EditorTextEffect[];
};
export type EditorShapePath = {
  d: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  penPath?: EditorPenPath;
};
export type EditorShapeBuilderMode = "select" | "merge" | "subtract" | "intersect";
export type EditorShapeContent = { paths: EditorShapePath[]; builderMode?: EditorShapeBuilderMode };
export const EDITOR_SHAPE_PRESETS = ["rectangle", "rounded-rectangle", "ellipse", "triangle", "diamond", "line", "arrow", "star", "hexagon"] as const;
export type EditorShapePreset = typeof EDITOR_SHAPE_PRESETS[number];
export const EDITOR_SHAPE_LABELS: Record<EditorShapePreset, string> = {
  rectangle: "Rectangle",
  "rounded-rectangle": "Rounded rectangle",
  ellipse: "Ellipse",
  triangle: "Triangle",
  diamond: "Diamond",
  line: "Line",
  arrow: "Arrow",
  star: "Star",
  hexagon: "Hexagon",
};

type ShapePoint = { x: number; y: number };
function shapePath(points: ShapePoint[], close = true): string {
  const coordinate = (value: number) => Number(value.toFixed(2));
  return `${points.map((point, index) => `${index === 0 ? "M" : "L"} ${coordinate(point.x)} ${coordinate(point.y)}`).join(" ")}${close ? " Z" : ""}`;
}

/** Return vector paths for a shape dragged between two points in 1000 x 1200 artwork units. */
export function createEditorShapePaths(
  preset: EditorShapePreset,
  start: ShapePoint,
  end: ShapePoint,
  color: string,
): EditorShapePath[] {
  if (preset === "line" || preset === "arrow") {
    const paths: EditorShapePath[] = [{ d: shapePath([start, end], false), fill: "none", stroke: color, strokeWidth: 18 }];
    if (preset === "arrow") {
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      const headLength = Math.min(48, Math.max(8, length * 0.22));
      const unitX = dx / length;
      const unitY = dy / length;
      const base = { x: end.x - unitX * headLength, y: end.y - unitY * headLength };
      const wing = headLength * 0.48;
      paths.push(
        { d: shapePath([end, { x: base.x - unitY * wing, y: base.y + unitX * wing }], false), fill: "none", stroke: color, strokeWidth: 18 },
        { d: shapePath([end, { x: base.x + unitY * wing, y: base.y - unitX * wing }], false), fill: "none", stroke: color, strokeWidth: 18 },
      );
    }
    return paths;
  }

  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const width = Math.max(1, Math.abs(end.x - start.x));
  const height = Math.max(1, Math.abs(end.y - start.y));
  const right = left + width;
  const bottom = top + height;
  const centerX = left + width / 2;
  const centerY = top + height / 2;
  let points: ShapePoint[];
  if (preset === "rectangle") {
    points = [{ x: left, y: top }, { x: right, y: top }, { x: right, y: bottom }, { x: left, y: bottom }];
  } else if (preset === "rounded-rectangle") {
    const radius = Math.min(width, height) * 0.16;
    const corners = [
      { x: right - radius, y: top + radius, startAngle: -90 },
      { x: right - radius, y: bottom - radius, startAngle: 0 },
      { x: left + radius, y: bottom - radius, startAngle: 90 },
      { x: left + radius, y: top + radius, startAngle: 180 },
    ];
    points = corners.flatMap((corner) => Array.from({ length: 7 }, (_, index) => {
      const angle = (corner.startAngle + index * 15) * Math.PI / 180;
      return { x: corner.x + Math.cos(angle) * radius, y: corner.y + Math.sin(angle) * radius };
    }));
  } else if (preset === "ellipse") {
    points = Array.from({ length: 48 }, (_, index) => {
      const angle = (index / 48) * Math.PI * 2;
      return { x: centerX + Math.cos(angle) * width / 2, y: centerY + Math.sin(angle) * height / 2 };
    });
  } else if (preset === "triangle") {
    points = [{ x: centerX, y: top }, { x: right, y: bottom }, { x: left, y: bottom }];
  } else if (preset === "diamond") {
    points = [{ x: centerX, y: top }, { x: right, y: centerY }, { x: centerX, y: bottom }, { x: left, y: centerY }];
  } else if (preset === "star") {
    points = Array.from({ length: 10 }, (_, index) => {
      const angle = -Math.PI / 2 + index * Math.PI / 5;
      const radius = index % 2 === 0 ? 1 : 0.44;
      return { x: centerX + Math.cos(angle) * width / 2 * radius, y: centerY + Math.sin(angle) * height / 2 * radius };
    });
  } else {
    points = Array.from({ length: 6 }, (_, index) => {
      const angle = -Math.PI / 2 + index * Math.PI / 3;
      return { x: centerX + Math.cos(angle) * width / 2, y: centerY + Math.sin(angle) * height / 2 };
    });
  }
  return [{ d: shapePath(points), fill: color, stroke: "none", strokeWidth: 0 }];
}

function cloneEditorPenPath(penPath: EditorPenPath): EditorPenPath {
  return {
    ...penPath,
    anchors: penPath.anchors.map((anchor) => ({
      ...anchor,
      ...(anchor.handleIn ? { handleIn: { ...anchor.handleIn } } : {}),
      ...(anchor.handleOut ? { handleOut: { ...anchor.handleOut } } : {}),
    })),
  };
}

function cloneEditorShapePath(path: EditorShapePath): EditorShapePath {
  return path.penPath ? { ...path, penPath: cloneEditorPenPath(path.penPath) } : { ...path };
}

export type EditorImageContent = {
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  byteSize: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  blur?: number;
  temperature?: number;
  tint?: number;
  exposure?: number;
  highlights?: number;
  shadows?: number;
  whites?: number;
  blacks?: number;
  texture?: number;
  clarity?: number;
  dehaze?: number;
  vibrance?: number;
  vignette?: number;
  grain?: number;
  grainSize?: number;
  sharpen?: number;
  noiseReduction?: number;
  hue?: number;
  red?: number;
  green?: number;
  blue?: number;
  levelsBlack?: number;
  levelsWhite?: number;
  levelsGamma?: number;
  curves?: number[];
  selectiveCyan?: number;
  selectiveMagenta?: number;
  selectiveYellow?: number;
  selectiveBlack?: number;
  hslHue?: number;
  hslSaturation?: number;
  hslLightness?: number;
  splitHighlightHue?: number;
  splitHighlightSat?: number;
  splitMidHue?: number;
  splitMidSat?: number;
  splitShadowHue?: number;
  splitShadowSat?: number;
  splitBalance?: number;
  aiEnhanced?: boolean;
  smartFilter?: "none" | "clarity" | "cinematic" | "vintage" | "bw" | "warm" | "cool";
  smartFilterIntensity?: number;
  backgroundRemoved?: boolean;
  upscaled?: boolean;
};

export type PhotoAdjustmentKey =
  | "brightness" | "contrast" | "saturation" | "blur"
  | "temperature" | "tint" | "exposure" | "highlights" | "shadows"
  | "whites" | "blacks" | "texture" | "clarity" | "dehaze"
  | "vibrance" | "hue" | "vignette" | "grain" | "grainSize"
  | "sharpen" | "noiseReduction"
  | "red" | "green" | "blue"
  | "levelsBlack" | "levelsWhite" | "levelsGamma" | "curves"
  | "selectiveCyan" | "selectiveMagenta" | "selectiveYellow" | "selectiveBlack"
  | "hslHue" | "hslSaturation" | "hslLightness"
  | "splitHighlightHue" | "splitHighlightSat"
  | "splitMidHue" | "splitMidSat"
  | "splitShadowHue" | "splitShadowSat" | "splitBalance"
  | "aiEnhanced" | "smartFilter" | "smartFilterIntensity"
  | "backgroundRemoved" | "upscaled";

export type PhotoAdjustmentUpdate = Partial<Pick<EditorImageContent, PhotoAdjustmentKey>>;

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
  return { ...createEditorArtworkLayer(id, name), kind: "text", text: { ...text, effects: text.effects?.map((effect) => ({ ...effect })) } };
}

export function createEditorShapeLayer(
  id: string,
  name: string,
  shape: EditorShapeContent,
): EditorArtworkLayer {
  return {
    ...createEditorArtworkLayer(id, name),
    kind: "shape",
    shape: { paths: shape.paths.map(cloneEditorShapePath), builderMode: shape.builderMode ?? "select" },
  };
}

export function appendEditorShapePaths(
  layers: EditorArtworkLayer[],
  layerId: string,
  paths: EditorShapePath[],
): EditorArtworkLayer[] {
  if (paths.length === 0) return layers;
  return layers.map((layer) => {
    if (layer.id !== layerId || layer.locked) return layer;
    return {
      ...layer,
      kind: layer.kind === "artwork" ? "shape" : layer.kind,
      shape: {
        paths: [...(layer.shape?.paths ?? []).map(cloneEditorShapePath), ...paths.map(cloneEditorShapePath)],
        builderMode: layer.shape?.builderMode ?? "select",
      },
    };
  });
}

export function updateEditorPenPath(
  layers: EditorArtworkLayer[],
  layerId: string,
  penPath: EditorPenPath,
  pathData: string,
  pathIndex = 0,
): EditorArtworkLayer[] {
  return layers.map((layer) => {
    if (layer.id !== layerId || !layer.shape || !layer.shape.paths[pathIndex]) return layer;
    const clonedPath = cloneEditorPenPath(penPath);
    return {
      ...layer,
      shape: {
        ...layer.shape,
        paths: layer.shape.paths.map((path, index) => index === pathIndex
          ? { ...path, d: pathData, penPath: clonedPath }
          : path),
      },
    };
  });
}

export function createEditorImageLayer(
  id: string,
  name: string,
  image: EditorImageContent,
): EditorArtworkLayer {
  return { ...createEditorArtworkLayer(id, name), kind: "image", image: { ...image } };
}

export function updateEditorImageAdjustments(
  layers: EditorArtworkLayer[],
  layerId: string,
  update: PhotoAdjustmentUpdate,
): EditorArtworkLayer[] {
  return layers.map((layer) => layer.id === layerId && layer.image
    ? { ...layer, image: { ...layer.image, ...update } }
    : layer);
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
  update: Partial<Pick<EditorTextContent, "fontSize" | "color" | "fontFamily" | "fontWeight" | "fontStyle" | "textAlign" | "underline" | "letterSpacing" | "lineHeight" | "textTransform" | "textEffect" | "effectColor" | "effectOffset" | "effectBlur" | "outlineWidth" | "textDecoration" | "decorationColor" | "decorationWidth" | "effects">>,
): EditorArtworkLayer[] {
  return layers.map((layer) => {
    if (layer.id !== layerId || !layer.text) return layer;
    return {
      ...layer,
      text: {
        ...layer.text,
        ...update,
        effects: update.effects === undefined ? layer.text.effects : update.effects.map((effect) => ({ ...effect })),
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

type EditorRect = { x: number; y: number; width: number; height: number };
function parseAxisAlignedRect(d: string): EditorRect | null {
  const match = d.match(/^\s*M\s*(-?[\d.]+)\s+(-?[\d.]+)\s+H\s*(-?[\d.]+)\s+V\s*(-?[\d.]+)\s+H\s*(-?[\d.]+)\s+Z\s*$/i);
  if (!match) return null;
  const [, x, y, right, bottom] = match;
  return { x: Number(x), y: Number(y), width: Number(right) - Number(x), height: Number(bottom) - Number(y) };
}
function rectPath(rect: EditorRect, source: EditorShapePath): EditorShapePath {
  return { ...source, d: `M ${rect.x} ${rect.y} H ${rect.x + rect.width} V ${rect.y + rect.height} H ${rect.x} Z` };
}

/** Applies the supported deterministic Shape Builder operation to the first two closed rectangles. */
export function applyEditorShapeBuilderOperation(
  layers: EditorArtworkLayer[],
  layerId: string,
  builderMode: EditorShapeBuilderMode,
): EditorArtworkLayer[] {
  return layers.map((layer) => {
    if (layer.id !== layerId || !layer.shape || layer.shape.paths.length < 2 || builderMode === "select") {
      return layer.id === layerId && layer.shape ? { ...layer, shape: { ...layer.shape, builderMode } } : layer;
    }
    const [firstPath, secondPath] = layer.shape.paths;
    const first = parseAxisAlignedRect(firstPath.d);
    const second = parseAxisAlignedRect(secondPath.d);
    if (!first || !second) return { ...layer, shape: { ...layer.shape, builderMode } };
    const left = Math.max(first.x, second.x);
    const top = Math.max(first.y, second.y);
    const right = Math.min(first.x + first.width, second.x + second.width);
    const bottom = Math.min(first.y + first.height, second.y + second.height);
    if (builderMode === "merge") return { ...layer, shape: { paths: [{ ...firstPath, d: `${firstPath.d} ${secondPath.d}` }], builderMode } };
    if (right <= left || bottom <= top) return { ...layer, shape: { paths: [firstPath], builderMode } };
    if (builderMode === "intersect") return { ...layer, shape: { paths: [rectPath({ x: left, y: top, width: right - left, height: bottom - top }, firstPath)], builderMode } };
    const pieces: EditorShapePath[] = [];
    if (left > first.x) pieces.push(rectPath({ x: first.x, y: first.y, width: left - first.x, height: first.height }, firstPath));
    if (right < first.x + first.width) pieces.push(rectPath({ x: right, y: first.y, width: first.x + first.width - right, height: first.height }, firstPath));
    if (top > first.y) pieces.push(rectPath({ x: left, y: first.y, width: right - left, height: top - first.y }, firstPath));
    if (bottom < first.y + first.height) pieces.push(rectPath({ x: left, y: bottom, width: right - left, height: first.y + first.height - bottom }, firstPath));
    return { ...layer, shape: { paths: pieces, builderMode } };
  });
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
    text: source.text ? { ...source.text, effects: source.text.effects?.map((effect) => ({ ...effect })) } : null,
    shape: source.shape ? { paths: source.shape.paths.map(cloneEditorShapePath), builderMode: source.shape.builderMode } : null,
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
