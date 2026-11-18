import type { EditorPenPath } from "./editor-pen-path";

export type ArtworkPoint = { x: number; y: number };
export type EditorBrushShape = "round" | "square";
/** How brush dabs composite against each other inside one stroke. */
export type EditorBrushBlend = "normal" | "multiply" | "screen";
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
  /** Distance between dabs as a percentage of the nib diameter, 1 to 100. */
  spacing?: number;
  /** Per-dab strength, 1 to 100. Overlapping dabs build up like Photoshop flow. */
  flow?: number;
  /** Dabs drawn per pointer sample, 1 to 10, smoothing a fast drag into a continuous line. */
  smoothing?: number;
  /** Size jitter as a percentage, 0 to 100. */
  sizeJitter?: number;
  /** Opacity jitter as a percentage, 0 to 100. */
  opacityJitter?: number;
  /** Random size/opacity jitter stops at this nib size percentage, 0 to 100. */
  jitterMinimum?: number;
  /** Tip rotation in degrees for a square nib, -180 to 180. */
  angle?: number;
  /** Corner roundness of a square nib, 0 (sharp) to 100 (fully round). */
  roundness?: number;
  /** Dab scatter as a percentage of the nib diameter, 0 to 100. */
  scatter?: number;
  /** Per-dab tip rotation jitter as a percentage, 0 to 100. */
  angleJitter?: number;
  /** Per-dab corner roundness jitter as a percentage, 0 to 100. */
  roundnessJitter?: number;
  /** Whether the stroke fades to transparent at its end. */
  fadeOut?: boolean;
  /** Dab compositing inside the stroke. */
  blend?: EditorBrushBlend;
};
export type EditorBrushSettings = {
  shape: EditorBrushShape;
  size: number;
  opacity: number;
  softness: number;
  feather: number;
  spacing: number;
  flow: number;
  smoothing: number;
  sizeJitter: number;
  opacityJitter: number;
  jitterMinimum: number;
  angle: number;
  roundness: number;
  scatter: number;
  angleJitter: number;
  roundnessJitter: number;
  fadeOut: boolean;
  blend: EditorBrushBlend;
};
export type EditorPenSettings = { width: number; cap: "round" | "butt" | "square" };
/** Photoshop-style eraser: a brush-style soft erase or a whole-stroke erase. */
export type EditorEraserMode = "brush" | "stroke";
export type EditorEraserSettings = {
  mode: EditorEraserMode;
  /** Nib tip. Round uses a soft radial falloff; square uses a rotated rounded rectangle. */
  shape: EditorBrushShape;
  /** Nib diameter in 1000 x 1200 artwork units. */
  size: number;
  /** Edge hardness, 0 (fully feathered) to 100 (crisp edge). */
  hardness: number;
  /** Maximum erase strength of one pass, 1 to 100. */
  opacity: number;
  /** Per-dab erase strength, 1 to 100. Overlapping dabs build up like Photoshop flow. */
  flow: number;
  /** Distance between dabs as a percentage of the nib diameter, 1 to 100. */
  spacing: number;
  /** Tip rotation in degrees for a square nib, -180 to 180. */
  angle: number;
  /** Corner roundness of a square nib, 0 (sharp) to 100 (fully round). */
  roundness: number;
};
/** One recorded eraser pass. A brush erasure keeps its own look so passes can differ. */
export type EditorErasure = ArtworkStroke & {
  hardness: number;
  flow: number;
  spacing: number;
  angle: number;
  roundness: number;
};
export type EditorToolOptions = {
  brush: EditorBrushSettings;
  pencil: EditorBrushSettings;
  eraser: EditorEraserSettings;
  pen: EditorPenSettings;
};
export const EDITOR_BRUSH_SHAPES: EditorBrushShape[] = ["round", "square"];
export const EDITOR_BRUSH_BLENDS: EditorBrushBlend[] = ["normal", "multiply", "screen"];

export const EDITOR_ERASER_MODES: EditorEraserMode[] = ["brush", "stroke"];
export const EDITOR_TOOL_OPTIONS_DEFAULT: EditorToolOptions = {
  brush: { shape: "round", size: 52, opacity: 0.68, softness: 0, feather: 0, spacing: 8, flow: 100, smoothing: 3, sizeJitter: 0, opacityJitter: 0, jitterMinimum: 20, angle: 0, roundness: 100, scatter: 0, angleJitter: 0, roundnessJitter: 0, fadeOut: false, blend: "normal" },
  pencil: { shape: "round", size: 24, opacity: 1, softness: 0, feather: 0, spacing: 6, flow: 100, smoothing: 2, sizeJitter: 0, opacityJitter: 0, jitterMinimum: 20, angle: 0, roundness: 100, scatter: 0, angleJitter: 0, roundnessJitter: 0, fadeOut: false, blend: "normal" },
  eraser: { mode: "brush", shape: "round", size: 120, hardness: 60, opacity: 100, flow: 100, spacing: 12, angle: 0, roundness: 100 },
  pen: { width: 5, cap: "round" },
};

/** Kittl-style ready-made brush presets; each is a full brush settings patch. */
export const EDITOR_BRUSH_PRESETS: { id: string; label: string; settings: EditorBrushSettings }[] = [
  { id: "hard-round", label: "Hard round", settings: { ...EDITOR_TOOL_OPTIONS_DEFAULT.brush } },
  { id: "soft-round", label: "Soft round", settings: { ...EDITOR_TOOL_OPTIONS_DEFAULT.brush, softness: 60, feather: 40, opacity: 0.55, flow: 70 } },
  { id: "spray", label: "Spray", settings: { ...EDITOR_TOOL_OPTIONS_DEFAULT.brush, spacing: 4, flow: 25, sizeJitter: 55, opacityJitter: 70, jitterMinimum: 15, scatter: 45 } },
  { id: "chalk", label: "Chalk", settings: { ...EDITOR_TOOL_OPTIONS_DEFAULT.brush, shape: "square", spacing: 12, flow: 60, angle: 24, roundness: 35, angleJitter: 60, roundnessJitter: 55, scatter: 12 } },
  { id: "marker", label: "Marker", settings: { ...EDITOR_TOOL_OPTIONS_DEFAULT.brush, shape: "square", size: 70, opacity: 0.85, flow: 100, spacing: 6, roundness: 20, blend: "multiply" } },
  { id: "ink", label: "Ink", settings: { ...EDITOR_TOOL_OPTIONS_DEFAULT.brush, size: 34, opacity: 1, flow: 100, spacing: 5, smoothing: 6, fadeOut: true } },
  { id: "airbrush", label: "Airbrush", settings: { ...EDITOR_TOOL_OPTIONS_DEFAULT.brush, softness: 100, feather: 100, opacity: 0.3, flow: 15, spacing: 3, scatter: 20 } },
];

const clamp = (value: number, min: number, max: number) => Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : min;

export function normalizeEditorBrush(input: Partial<EditorBrushSettings> | undefined, fallback: EditorBrushSettings): EditorBrushSettings {
  const blend: EditorBrushBlend = input?.blend === "multiply" || input?.blend === "screen" ? input.blend : "normal";
  return {
    shape: input?.shape === "square" ? "square" : "round",
    size: clamp(input?.size ?? fallback.size, 1, 400),
    opacity: clamp(input?.opacity ?? fallback.opacity, 0.01, 1),
    softness: clamp(input?.softness ?? fallback.softness, 0, 100),
    feather: clamp(input?.feather ?? fallback.feather, 0, 100),
    spacing: clamp(input?.spacing ?? fallback.spacing, 1, 100),
    flow: clamp(input?.flow ?? fallback.flow, 1, 100),
    smoothing: clamp(input?.smoothing ?? fallback.smoothing, 1, 10),
    sizeJitter: clamp(input?.sizeJitter ?? fallback.sizeJitter, 0, 100),
    opacityJitter: clamp(input?.opacityJitter ?? fallback.opacityJitter, 0, 100),
    jitterMinimum: clamp(input?.jitterMinimum ?? fallback.jitterMinimum, 0, 100),
    angle: clamp(input?.angle ?? fallback.angle, -180, 180),
    roundness: clamp(input?.roundness ?? fallback.roundness, 0, 100),
    scatter: clamp(input?.scatter ?? fallback.scatter, 0, 100),
    angleJitter: clamp(input?.angleJitter ?? fallback.angleJitter, 0, 100),
    roundnessJitter: clamp(input?.roundnessJitter ?? fallback.roundnessJitter, 0, 100),
    fadeOut: input?.fadeOut ?? fallback.fadeOut,
    blend,
  };
}

/** Clamp every tool option so the stored values always render safely. */
export function normalizeEditorToolOptions(input: Partial<EditorToolOptions> | undefined): EditorToolOptions {
  return {
    brush: normalizeEditorBrush(input?.brush, EDITOR_TOOL_OPTIONS_DEFAULT.brush),
    pencil: normalizeEditorBrush(input?.pencil, EDITOR_TOOL_OPTIONS_DEFAULT.pencil),
    eraser: {
      mode: input?.eraser?.mode === "stroke" ? "stroke" : "brush",
      shape: input?.eraser?.shape === "square" ? "square" : "round",
      size: clamp(input?.eraser?.size ?? EDITOR_TOOL_OPTIONS_DEFAULT.eraser.size, 10, 600),
      hardness: clamp(input?.eraser?.hardness ?? EDITOR_TOOL_OPTIONS_DEFAULT.eraser.hardness, 0, 100),
      opacity: clamp(input?.eraser?.opacity ?? EDITOR_TOOL_OPTIONS_DEFAULT.eraser.opacity, 1, 100),
      flow: clamp(input?.eraser?.flow ?? EDITOR_TOOL_OPTIONS_DEFAULT.eraser.flow, 1, 100),
      spacing: clamp(input?.eraser?.spacing ?? EDITOR_TOOL_OPTIONS_DEFAULT.eraser.spacing, 1, 100),
      angle: clamp(input?.eraser?.angle ?? EDITOR_TOOL_OPTIONS_DEFAULT.eraser.angle, -180, 180),
      roundness: clamp(input?.eraser?.roundness ?? EDITOR_TOOL_OPTIONS_DEFAULT.eraser.roundness, 0, 100),
    },
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

export const EDITOR_TEXT_DEFAULT_LINE_HEIGHT = 1.2;
export const EDITOR_TEXT_FONT_FAMILY = "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";

export function editorTextLines(text: EditorTextContent): string[] {
  return text.value.split("\n");
}

export function editorTextLineHeight(text: EditorTextContent): number {
  return text.fontSize * (text.lineHeight ?? EDITOR_TEXT_DEFAULT_LINE_HEIGHT);
}

export type EditorTextLineMetrics = { width: number; ascent: number; descent: number };

// Character advance varies a lot with the glyph (a bold "M" is ~0.99em, a lowercase
// run ~0.58em), so a fixed per-character estimate makes the transform box cut through
// the text. The browser measures the real font; Node (tests, SSR) keeps the estimate.
function fallbackTextLineMetrics(text: EditorTextContent, line: string): EditorTextLineMetrics {
  const glyphs = Math.max(1, line.length);
  return {
    width: glyphs * text.fontSize * 0.58 + Math.max(0, glyphs - 1) * (text.letterSpacing ?? 0),
    ascent: text.fontSize * 0.82,
    descent: text.fontSize * 0.26,
  };
}

let measurementContext: CanvasRenderingContext2D | null = null;

function editorTextMeasurementContext(): CanvasRenderingContext2D | null {
  if (measurementContext) return measurementContext;
  if (typeof document !== "undefined" && typeof document.createElement === "function") {
    measurementContext = document.createElement("canvas").getContext("2d") ?? null;
  }
  return measurementContext;
}

export function editorTextLineMetrics(text: EditorTextContent, line: string): EditorTextLineMetrics {
  const fallback = fallbackTextLineMetrics(text, line);
  const context = editorTextMeasurementContext();
  if (!context) return fallback;
  context.font = `${text.fontStyle ?? "normal"} ${text.fontWeight ?? 700} ${text.fontSize}px ${text.fontFamily ?? EDITOR_TEXT_FONT_FAMILY}`;
  const measured = context.measureText(line);
  const width = measured.width + Math.max(0, line.length - 1) * (text.letterSpacing ?? 0);
  return {
    width: Number.isFinite(width) && width > 0 ? width : fallback.width,
    ascent: measured.actualBoundingBoxAscent > 0 ? measured.actualBoundingBoxAscent : fallback.ascent,
    descent: measured.actualBoundingBoxDescent > 0 ? measured.actualBoundingBoxDescent : fallback.descent,
  };
}

export function editorTextLineWidth(text: EditorTextContent, line: string): number {
  return editorTextLineMetrics(text, line).width;
}

export function editorTextMetrics(text: EditorTextContent) {
  const lines = editorTextLines(text);
  const lineHeight = editorTextLineHeight(text);
  const lineMetrics = lines.map((line) => editorTextLineMetrics(text, line));
  const widths = lineMetrics.map((metrics) => metrics.width);
  const ascent = Math.max(text.fontSize * 0.5, ...lineMetrics.map((metrics) => metrics.ascent));
  const descent = Math.max(text.fontSize * 0.1, ...lineMetrics.map((metrics) => metrics.descent));
  return {
    lines,
    lineHeight,
    widths,
    ascent,
    descent,
    width: Math.max(text.fontSize, ...widths),
    height: (lines.length - 1) * lineHeight + ascent + descent,
  };
}

export function editorTextCanvasBounds(text: EditorTextContent): { x: number; y: number; width: number; height: number } {
  const { lines, lineHeight, width, ascent, descent } = editorTextMetrics(text);
  const align = text.textAlign ?? "center";
  const left = align === "left" ? text.x : align === "right" ? text.x - width : text.x - width / 2;
  const top = text.y - ascent;
  const bottom = text.y + (lines.length - 1) * lineHeight + descent;
  return { x: left, y: top, width, height: Math.max(text.fontSize, bottom - top) };
}

export type EditorShapePath = {
  d: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  penPath?: EditorPenPath;
};
export type EditorShapeBuilderMode = "select" | "merge" | "subtract" | "intersect";
export type EditorShapeLineStyle = "solid" | "dash" | "dot";
export type EditorShapeShadow = {
  enabled: boolean;
  color: string;
  offsetX: number;
  offsetY: number;
  blur: number;
  opacity: number;
};
export type EditorShapeGlow = {
  enabled: boolean;
  color: string;
  width: number;
  opacity: number;
};
/** Photoshop/Kittl-style vector appearance: independent Fill and Stroke channels plus effects. */
export type EditorShapeStyle = {
  fill: string;
  fillEnabled: boolean;
  fillOpacity: number;
  stroke: string;
  strokeWidth: number;
  strokeStyle: EditorShapeLineStyle;
  cornerRadius: number;
  shadow: EditorShapeShadow;
  glow: EditorShapeGlow;
};
export type EditorShapeContent = { paths: EditorShapePath[]; builderMode?: EditorShapeBuilderMode; style?: EditorShapeStyle };

export const EDITOR_SHAPE_LINE_STYLES: EditorShapeLineStyle[] = ["solid", "dash", "dot"];

const clampShape = (value: number, min: number, max: number, fallback: number) => Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;

/** Derive a starting style from a shape's per-path fill/stroke so the panel has sensible values. */
export function defaultEditorShapeStyle(paths: EditorShapePath[]): EditorShapeStyle {
  const filled = paths.find((path) => path.fill && path.fill !== "none");
  const stroked = paths.find((path) => path.stroke && path.stroke !== "none" && (path.strokeWidth ?? 0) > 0);
  return {
    fill: filled?.fill ?? "#202124",
    fillEnabled: Boolean(filled),
    fillOpacity: 100,
    stroke: stroked?.stroke ?? "#202124",
    strokeWidth: stroked?.strokeWidth ?? 0,
    strokeStyle: "solid",
    cornerRadius: 0,
    shadow: { enabled: false, color: "#000000", offsetX: 12, offsetY: 12, blur: 6, opacity: 0.45 },
    glow: { enabled: false, color: "#d4ff3f", width: 16, opacity: 0.7 },
  };
}

export function normalizeEditorShapeStyle(input: EditorShapeStyle): EditorShapeStyle {
  return {
    fill: input.fill,
    fillEnabled: input.fillEnabled !== false,
    fillOpacity: clampShape(input.fillOpacity, 0, 100, 100),
    stroke: input.stroke,
    strokeWidth: clampShape(input.strokeWidth, 0, 120, 0),
    strokeStyle: EDITOR_SHAPE_LINE_STYLES.includes(input.strokeStyle) ? input.strokeStyle : "solid",
    cornerRadius: clampShape(input.cornerRadius, 0, 400, 0),
    shadow: {
      enabled: input.shadow?.enabled === true,
      color: input.shadow?.color ?? "#000000",
      offsetX: clampShape(input.shadow?.offsetX ?? 12, -120, 120, 12),
      offsetY: clampShape(input.shadow?.offsetY ?? 12, -120, 120, 12),
      blur: clampShape(input.shadow?.blur ?? 6, 0, 60, 6),
      opacity: clampShape(input.shadow?.opacity ?? 0.45, 0, 1, 0.45),
    },
    glow: {
      enabled: input.glow?.enabled === true,
      color: input.glow?.color ?? "#d4ff3f",
      width: clampShape(input.glow?.width ?? 16, 1, 60, 16),
      opacity: clampShape(input.glow?.opacity ?? 0.7, 0, 1, 0.7),
    },
  };
}
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

/** The style a shape renders with, falling back to one derived from its own path fills/strokes. */
export function resolveEditorShapeStyle(shape: EditorShapeContent): EditorShapeStyle {
  return shape.style ?? defaultEditorShapeStyle(shape.paths);
}

/** Round the corners of a closed M/L polygon path; radius 0 or an open path returns the input. */
export function roundEditorShapePath(d: string, radius: number): string {
  if (!(radius > 0) || !/z\s*$/i.test(d.trim())) return d;
  const commands = d.trim().replace(/z\s*$/i, "").match(/[ML]\s*-?[\d.]+\s+-?[\d.]+/gi);
  if (!commands || commands.length < 3) return d;
  const points = commands.map((command) => {
    const match = command.match(/(-?[\d.]+)\s+(-?[\d.]+)/);
    return { x: Number(match?.[1] ?? 0), y: Number(match?.[2] ?? 0) };
  });
  const total = points.length;
  const parts: string[] = [];
  for (let index = 0; index < total; index += 1) {
    const current = points[index];
    const previous = points[(index - 1 + total) % total];
    const next = points[(index + 1) % total];
    const toPrevious = { x: previous.x - current.x, y: previous.y - current.y };
    const toNext = { x: next.x - current.x, y: next.y - current.y };
    const previousLength = Math.hypot(toPrevious.x, toPrevious.y);
    const nextLength = Math.hypot(toNext.x, toNext.y);
    if (previousLength === 0 || nextLength === 0) {
      parts.push(`${index === 0 ? "M" : "L"} ${current.x} ${current.y}`);
      continue;
    }
    const inset = Math.min(radius, previousLength / 2, nextLength / 2);
    const start = { x: current.x + (toPrevious.x / previousLength) * inset, y: current.y + (toPrevious.y / previousLength) * inset };
    const end = { x: current.x + (toNext.x / nextLength) * inset, y: current.y + (toNext.y / nextLength) * inset };
    parts.push(`${index === 0 ? "M" : "L"} ${start.x.toFixed(2)} ${start.y.toFixed(2)}`);
    parts.push(`Q ${current.x} ${current.y} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`);
  }
  parts.push("Z");
  return parts.join(" ");
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
  splitBlending?: number;
  /** Per-color HSL mixer, eight bands in red→orange→yellow→green→aqua→blue→purple→magenta order. */
  mixerHue?: number[];
  mixerSaturation?: number[];
  mixerLuminance?: number[];
  /** Parametric tone-curve regions: shadows, darks, lights, highlights. */
  curveShadows?: number;
  curveDarks?: number;
  curveLights?: number;
  curveHighlights?: number;
  colorNoiseReduction?: number;
  removeChromaticAberration?: boolean;
  lensCorrections?: boolean;
  redPrimaryHue?: number;
  redPrimarySaturation?: number;
  greenPrimaryHue?: number;
  greenPrimarySaturation?: number;
  bluePrimaryHue?: number;
  bluePrimarySaturation?: number;
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
  | "splitShadowHue" | "splitShadowSat" | "splitBalance" | "splitBlending"
  | "mixerHue" | "mixerSaturation" | "mixerLuminance"
  | "curveShadows" | "curveDarks" | "curveLights" | "curveHighlights"
  | "colorNoiseReduction" | "removeChromaticAberration" | "lensCorrections"
  | "redPrimaryHue" | "redPrimarySaturation"
  | "greenPrimaryHue" | "greenPrimarySaturation"
  | "bluePrimaryHue" | "bluePrimarySaturation"
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
  /** Eraser passes applied on top of the artwork, rendered as a subtractive mask. */
  erasures: EditorErasure[];
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
    erasures: [],
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
    shape: {
      paths: shape.paths.map(cloneEditorShapePath),
      builderMode: shape.builderMode ?? "select",
      ...(shape.style ? { style: normalizeEditorShapeStyle(shape.style) } : {}),
    },
  };
}

export function appendEditorShapePaths(
  layers: EditorArtworkLayer[],
  layerId: string,
  paths: EditorShapePath[],
): EditorArtworkLayer[] {
  if (paths.length === 0) return layers;
  return layers.map((layer) => {
    if (layer.id !== layerId || layer.locked || layer.kind === "text") return layer;
    const existingPaths = (layer.shape?.paths ?? []).map(cloneEditorShapePath);
    const nextPaths = [...existingPaths, ...paths.map(cloneEditorShapePath)];
    // Seed a style from the first geometry so the Shape panel always has real values.
    const style = layer.shape?.style ?? defaultEditorShapeStyle(nextPaths);
    return {
      ...layer,
      kind: layer.kind === "artwork" ? "shape" : layer.kind,
      shape: {
        paths: nextPaths,
        builderMode: layer.shape?.builderMode ?? "select",
        style,
      },
    };
  });
}

export function updateEditorShapeStyle(
  layers: EditorArtworkLayer[],
  layerId: string,
  update: Partial<EditorShapeStyle>,
): EditorArtworkLayer[] {
  return layers.map((layer) => {
    if (layer.id !== layerId || !layer.shape || layer.locked) return layer;
    const current = resolveEditorShapeStyle(layer.shape);
    return {
      ...layer,
      shape: {
        ...layer.shape,
        style: normalizeEditorShapeStyle({ ...current, ...update }),
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
    if (builderMode === "merge") return { ...layer, shape: { ...layer.shape, paths: [{ ...firstPath, d: `${firstPath.d} ${secondPath.d}` }], builderMode } };
    if (right <= left || bottom <= top) return { ...layer, shape: { ...layer.shape, paths: [firstPath], builderMode } };
    if (builderMode === "intersect") return { ...layer, shape: { ...layer.shape, paths: [rectPath({ x: left, y: top, width: right - left, height: bottom - top }, firstPath)], builderMode } };
    const pieces: EditorShapePath[] = [];
    if (left > first.x) pieces.push(rectPath({ x: first.x, y: first.y, width: left - first.x, height: first.height }, firstPath));
    if (right < first.x + first.width) pieces.push(rectPath({ x: right, y: first.y, width: first.x + first.width - right, height: first.height }, firstPath));
    if (top > first.y) pieces.push(rectPath({ x: left, y: first.y, width: right - left, height: top - first.y }, firstPath));
    if (bottom < first.y + first.height) pieces.push(rectPath({ x: left, y: bottom, width: right - left, height: first.y + first.height - bottom }, firstPath));
    return { ...layer, shape: { ...layer.shape, paths: pieces, builderMode } };
  });
}

function copyStroke(stroke: ArtworkStroke): ArtworkStroke {
  return { ...stroke, points: stroke.points.map((point) => ({ ...point })) };
}

function copyErasure(erasure: EditorErasure): EditorErasure {
  return { ...erasure, points: erasure.points.map((point) => ({ ...point })) };
}

export function appendLayerStroke(
  layers: EditorArtworkLayer[],
  layerId: string,
  target: LayerEditTarget,
  stroke: ArtworkStroke,
  maskBrushMode: MaskBrushMode,
): EditorArtworkLayer[] {
  return layers.map((layer) => {
    if (layer.id !== layerId || layer.locked || layer.kind === "text") return layer;
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
    if (layer.id !== layerId || layer.locked || layer.kind === "text") return layer;
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

/** Append one eraser pass (a brush stroke of dabs or a whole-stroke erase). */
export function appendLayerErasure(
  layers: EditorArtworkLayer[],
  layerId: string,
  erasure: EditorErasure,
): EditorArtworkLayer[] {
  return layers.map((layer) =>
    layer.id === layerId && !layer.locked
      ? { ...layer, erasures: [...layer.erasures, copyErasure(erasure)] }
      : layer,
  );
}

/** Grow the in-progress eraser pass as the pointer moves. */
export function updateLayerLastErasure(
  layers: EditorArtworkLayer[],
  layerId: string,
  erasure: EditorErasure,
): EditorArtworkLayer[] {
  return layers.map((layer) =>
    layer.id === layerId && !layer.locked && layer.erasures.length
      ? { ...layer, erasures: [...layer.erasures.slice(0, -1), copyErasure(erasure)] }
      : layer,
  );
}

/** Drop every eraser pass on one layer, or on every unlocked layer when `layerId` is omitted. */
export function clearLayerErasures(
  layers: EditorArtworkLayer[],
  layerId?: string,
): EditorArtworkLayer[] {
  return layers.map((layer) => {
    if (layerId !== undefined && layer.id !== layerId) return layer;
    if (layer.locked || layer.erasures.length === 0) return layer;
    return { ...layer, erasures: [] };
  });
}

/**
 * Gaussian blur radius for an eraser dab. Hardness 100 gives a crisp edge; lower values
 * widen the falloff. The radius is a fraction of the nib so the look scales with size.
 */
export function eraserDabBlurRadius(erasure: Pick<EditorErasure, "width" | "hardness">): number {
  const width = erasure.width ?? EDITOR_TOOL_OPTIONS_DEFAULT.eraser.size;
  const hardness = clamp(erasure.hardness ?? EDITOR_TOOL_OPTIONS_DEFAULT.eraser.hardness, 0, 100);
  return (width / 2) * (1 - hardness / 100) * 0.9;
}

/**
 * Build the dab polyline for an eraser pass: the raw pointer points resampled to the
 * pass's spacing (a percentage of the nib diameter). Spacing 1 gives a near-continuous line.
 */
export function eraserDabPoints(erasure: Pick<EditorErasure, "points" | "width" | "spacing">): ArtworkPoint[] {
  const points = erasure.points;
  if (points.length <= 1) return points.map((point) => ({ ...point }));
  const width = erasure.width ?? EDITOR_TOOL_OPTIONS_DEFAULT.eraser.size;
  const spacing = clamp(erasure.spacing ?? EDITOR_TOOL_OPTIONS_DEFAULT.eraser.spacing, 1, 100);
  const step = Math.max(1, (width * spacing) / 100);
  const dabs: ArtworkPoint[] = [{ ...points[0] }];
  let carry = 0;
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    const dx = (to.x - from.x) * 1000;
    const dy = (to.y - from.y) * 1200;
    const distance = Math.hypot(dx, dy);
    if (distance === 0) continue;
    let travelled = step - carry;
    while (travelled <= distance) {
      const t = travelled / distance;
      dabs.push({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });
      travelled += step;
    }
    carry = (distance - (travelled - step)) % step;
  }
  const last = points[points.length - 1];
  const tail = dabs[dabs.length - 1];
  if (Math.hypot((last.x - tail.x) * 1000, (last.y - tail.y) * 1200) > step * 0.5) {
    dabs.push({ ...last });
  }
  return dabs;
}

/** Fallback nib size for a stroke recorded before per-stroke brush options existed. */
const BRUSH_FALLBACK_WIDTH = 52;

/** Upper bound on dabs rendered for one stroke, so a long dense drag stays responsive. */
const MAX_BRUSH_DABS = 600;

/** Shortest distance from a point to a line segment, in the same units as the inputs. */
export function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : clamp(((px - ax) * dx + (py - ay) * dy) / lengthSq, 0, 1);
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * Shortest distance between two line segments, in the same units as the inputs. Returns zero
 * when the segments cross. Used to test whether an eraser pass actually touches a stroke,
 * which a vertex-only test misses whenever a fast drag records few samples.
 */
export function segmentDistancePx(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number): number {
  if (segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy)) return 0;
  return Math.min(
    distanceToSegment(ax, ay, cx, cy, dx, dy),
    distanceToSegment(bx, by, cx, cy, dx, dy),
    distanceToSegment(cx, cy, ax, ay, bx, by),
    distanceToSegment(dx, dy, ax, ay, bx, by),
  );
}

function orientation(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number {
  const value = (by - ay) * (cx - bx) - (bx - ax) * (cy - by);
  return Math.abs(value) < 1e-9 ? 0 : Math.sign(value);
}

function onSegment(px: number, py: number, qx: number, qy: number, rx: number, ry: number): boolean {
  return Math.min(px, qx) - 1e-9 <= rx && rx <= Math.max(px, qx) + 1e-9
    && Math.min(py, qy) - 1e-9 <= ry && ry <= Math.max(py, qy) + 1e-9;
}

function segmentsIntersect(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number): boolean {
  const o1 = orientation(ax, ay, bx, by, cx, cy);
  const o2 = orientation(ax, ay, bx, by, dx, dy);
  const o3 = orientation(cx, cy, dx, dy, ax, ay);
  const o4 = orientation(cx, cy, dx, dy, bx, by);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(ax, ay, bx, by, cx, cy)) return true;
  if (o2 === 0 && onSegment(ax, ay, bx, by, dx, dy)) return true;
  if (o3 === 0 && onSegment(cx, cy, dx, dy, ax, ay)) return true;
  if (o4 === 0 && onSegment(cx, cy, dx, dy, bx, by)) return true;
  return false;
}

export type BrushDab = {
  x: number;
  y: number;
  /** Size as a fraction of the nib diameter, 0 to 1. */
  scale: number;
  /** Dab opacity as a fraction of the brush opacity, 0 to 1. */
  alpha: number;
  /** Tip rotation in degrees for this dab, base angle plus angle jitter. */
  angle: number;
  /** Corner roundness percentage for this dab, base roundness plus roundness jitter. */
  roundness: number;
};

/**
 * Stabilize a pointer path with a centered moving average. The first and last samples are
 * kept exactly so a stroke still starts and ends under the pointer; only interior samples
 * are averaged, which removes hand tremor without adding lag at the cursor.
 */
export function smoothBrushPoints(points: ArtworkPoint[], smoothing: number): ArtworkPoint[] {
  const window = Math.round(clamp(smoothing, 1, 10)) - 1;
  if (window < 1 || points.length < 3) return points;
  return points.map((point, index) => {
    if (index === 0 || index === points.length - 1) return point;
    const from = Math.max(0, index - window);
    const to = Math.min(points.length - 1, index + window);
    let x = 0;
    let y = 0;
    for (let i = from; i <= to; i += 1) {
      x += points[i].x;
      y += points[i].y;
    }
    const count = to - from + 1;
    return { x: x / count, y: y / count };
  });
}

/**
 * Build the dab polyline for a brush pass. The raw pointer samples are resampled to the
 * brush spacing, `smoothing` dabs are added per sample segment so a fast drag still reads as
 * a continuous line, and size/opacity jitter is applied per dab. Jitter is deterministic
 * (hashed from the dab index) so re-rendering a stroke never makes it shimmer.
 */
export function brushDabPoints(stroke: ArtworkStroke): BrushDab[] {
  const points = stroke.points;
  if (points.length === 0) return [];
  const width = stroke.width ?? BRUSH_FALLBACK_WIDTH;
  const spacing = clamp(stroke.spacing ?? EDITOR_TOOL_OPTIONS_DEFAULT.brush.spacing, 1, 100);
  const smoothing = Math.round(clamp(stroke.smoothing ?? EDITOR_TOOL_OPTIONS_DEFAULT.brush.smoothing, 1, 10));
  const sizeJitter = clamp(stroke.sizeJitter ?? 0, 0, 100);
  const opacityJitter = clamp(stroke.opacityJitter ?? 0, 0, 100);
  const jitterMinimum = clamp(stroke.jitterMinimum ?? 20, 0, 100);
  const scatter = clamp(stroke.scatter ?? 0, 0, 100);
  const angleJitter = clamp(stroke.angleJitter ?? 0, 0, 100);
  const roundnessJitter = clamp(stroke.roundnessJitter ?? 0, 0, 100);
  const baseAngle = clamp(stroke.angle ?? 0, -180, 180);
  const baseRoundness = clamp(stroke.roundness ?? EDITOR_TOOL_OPTIONS_DEFAULT.brush.roundness, 0, 100);
  const flow = clamp(stroke.flow ?? 100, 1, 100) / 100;
  const run = smoothBrushPoints(points, smoothing);
  let step = Math.max(0.5, (width * spacing) / 100);
  // A very long, very dense stroke would otherwise emit tens of thousands of DOM dabs.
  // Widening the step to stay under the cap trades a little fidelity for a bounded render.
  const pathLength = run.slice(1).reduce((total, point, index) => {
    const from = run[index];
    return total + Math.hypot((point.x - from.x) * 1000, (point.y - from.y) * 1200);
  }, 0);
  if (pathLength / step > MAX_BRUSH_DABS) step = pathLength / MAX_BRUSH_DABS;
  const dab = (x: number, y: number, index: number): BrushDab => {
    // Hashes keep jitter stable across renders without a seeded RNG instance.
    const hash = Math.abs(Math.sin(index * 12.9898 + 78.233) * 43758.5453) % 1;
    const hash2 = Math.abs(Math.sin(index * 93.9898 + 67.345) * 24634.6345) % 1;
    const hash3 = Math.abs(Math.sin(index * 27.617 + 11.953) * 31415.9265) % 1;
    const hash4 = Math.abs(Math.sin(index * 55.123 + 42.007) * 13579.2468) % 1;
    const hash5 = Math.abs(Math.sin(index * 71.771 + 3.141) * 24680.1357) % 1;
    const minScale = jitterMinimum / 100;
    // Scatter displaces the dab perpendicular to the path by up to this fraction of the nib.
    let sx = x;
    let sy = y;
    if (scatter > 0) {
      const magnitude = (scatter / 100) * (width / 1000) * hash5;
      const direction = hash4 * Math.PI * 2;
      sx = x + Math.cos(direction) * magnitude;
      sy = y + Math.sin(direction) * magnitude * (1000 / 1200);
    }
    return {
      x: sx,
      y: sy,
      scale: 1 - (sizeJitter / 100) * hash * (1 - minScale),
      alpha: Math.max(0, flow * (1 - (opacityJitter / 100) * hash2)),
      angle: baseAngle + (angleJitter / 100) * 180 * (hash3 * 2 - 1),
      roundness: clamp(baseRoundness + (roundnessJitter / 100) * 100 * (hash4 * 2 - 1), 0, 100),
    };
  };
  if (run.length === 1) return [dab(run[0].x, run[0].y, 0)];
  const dabs: BrushDab[] = [dab(run[0].x, run[0].y, 0)];
  let carry = 0;
  let index = 1;
  for (let i = 1; i < run.length; i += 1) {
    const from = run[i - 1];
    const to = run[i];
    const dx = (to.x - from.x) * 1000;
    const dy = (to.y - from.y) * 1200;
    const distance = Math.hypot(dx, dy);
    if (distance === 0) continue;
    let travelled = step - carry;
    while (travelled <= distance) {
      const t = travelled / distance;
      dabs.push(dab(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, index));
      index += 1;
      travelled += step;
    }
    carry = (distance - (travelled - step)) % step;
  }
  const last = points[points.length - 1];
  const tail = dabs[dabs.length - 1];
  if (Math.hypot((last.x - tail.x) * 1000, (last.y - tail.y) * 1200) > step * 0.5) {
    dabs.push(dab(last.x, last.y, index));
  }
  return dabs;
}

/** Gaussian blur radius for a brush dab, derived from nib size and edge softness. */
export function brushDabBlurRadius(stroke: Pick<ArtworkStroke, "width" | "softness">): number {
  const width = stroke.width ?? BRUSH_FALLBACK_WIDTH;
  const softness = clamp(stroke.softness ?? 0, 0, 100);
  return (width / 2) * (softness / 100) * 0.9;
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
    erasures: source.erasures.map(copyErasure),
    mask: source.mask?.map((stroke) => ({ ...copyStroke(stroke), mode: stroke.mode })) ?? null,
    text: source.text ? { ...source.text, effects: source.text.effects?.map((effect) => ({ ...effect })) } : null,
    shape: source.shape ? { paths: source.shape.paths.map(cloneEditorShapePath), builderMode: source.shape.builderMode, ...(source.shape.style ? { style: { ...source.shape.style, shadow: { ...source.shape.style.shadow }, glow: { ...source.shape.style.glow } } } : {}) } : null,
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
