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
  /** Per-dab strength, 1 to 100. Overlapping dabs build up with the flow value. */
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
/** Eraser: a brush-style soft erase or a whole-stroke erase. */
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
  /** Per-dab erase strength, 1 to 100. Overlapping dabs build up with the flow value. */
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
  gradient: EditorGradientToolSettings;
  text: EditorTextToolSettings;
};
export const EDITOR_BRUSH_SHAPES: EditorBrushShape[] = ["round", "square"];
export const EDITOR_BRUSH_BLENDS: EditorBrushBlend[] = ["normal", "multiply", "screen"];

export const EDITOR_ERASER_MODES: EditorEraserMode[] = ["brush", "stroke"];

export const EDITOR_TEXT_FONT_FAMILY = "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";

/** Defaults for the Text tool, so a new text layer starts in the chosen style. */
export type EditorTextToolSettings = {
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  textAlign: "left" | "center" | "right";
  /** null follows the toolbar foreground colour. */
  color: string | null;
  letterSpacing: number;
};
export const EDITOR_TOOL_OPTIONS_DEFAULT: EditorToolOptions = {
  brush: { shape: "round", size: 52, opacity: 0.68, softness: 0, feather: 0, spacing: 8, flow: 100, smoothing: 3, sizeJitter: 0, opacityJitter: 0, jitterMinimum: 20, angle: 0, roundness: 100, scatter: 0, angleJitter: 0, roundnessJitter: 0, fadeOut: false, blend: "normal" },
  pencil: { shape: "round", size: 24, opacity: 1, softness: 0, feather: 0, spacing: 6, flow: 100, smoothing: 2, sizeJitter: 0, opacityJitter: 0, jitterMinimum: 20, angle: 0, roundness: 100, scatter: 0, angleJitter: 0, roundnessJitter: 0, fadeOut: false, blend: "normal" },
  eraser: { mode: "brush", shape: "round", size: 120, hardness: 60, opacity: 100, flow: 100, spacing: 12, angle: 0, roundness: 100 },
  pen: { width: 5, cap: "round" },
  gradient: { type: "linear", presetId: "black-white", reverse: false },
  text: { fontSize: 110, fontFamily: EDITOR_TEXT_FONT_FAMILY, fontWeight: 700, textAlign: "center", color: null, letterSpacing: 0 },
};

/** Ready-made eraser nibs; each is a settings patch. */
export const EDITOR_ERASER_PRESETS: { id: string; label: string; settings: Partial<EditorEraserSettings> }[] = [
  { id: "soft", label: "Soft", settings: { shape: "round", size: 180, hardness: 10, opacity: 60, flow: 55, spacing: 8 } },
  { id: "hard", label: "Hard", settings: { shape: "round", size: 90, hardness: 100, opacity: 100, flow: 100, spacing: 10 } },
  { id: "block", label: "Block", settings: { shape: "square", size: 160, hardness: 100, opacity: 100, flow: 100, spacing: 12, roundness: 0 } },
  { id: "fine", label: "Fine", settings: { shape: "round", size: 28, hardness: 80, opacity: 100, flow: 100, spacing: 6 } },
];

/** Ready-made brush presets; each is a full brush settings patch. */
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
    gradient: normalizeEditorGradientToolSettings(input?.gradient),
    text: normalizeEditorTextToolSettings(input?.text),
  };
}

/** The Gradient tool holds the shape and preset a new gradient layer starts from. */
export type EditorGradientToolSettings = {
  type: EditorGradientType;
  presetId: string;
  /** Flip the ramp, so the last colour sits at the start of the axis. */
  reverse: boolean;
};

export function normalizeEditorGradientToolSettings(input: Partial<EditorGradientToolSettings> | undefined): EditorGradientToolSettings {
  const type = EDITOR_GRADIENT_TYPES.includes(input?.type as EditorGradientType) ? input!.type as EditorGradientType : EDITOR_TOOL_OPTIONS_DEFAULT.gradient.type;
  const presetId = EDITOR_GRADIENT_PRESETS.some((preset) => preset.id === input?.presetId) ? input!.presetId! : EDITOR_TOOL_OPTIONS_DEFAULT.gradient.presetId;
  return { type, presetId, reverse: input?.reverse ?? EDITOR_TOOL_OPTIONS_DEFAULT.gradient.reverse };
}

export function normalizeEditorTextToolSettings(input: Partial<EditorTextToolSettings> | undefined): EditorTextToolSettings {
  const align = input?.textAlign;
  return {
    fontSize: clamp(input?.fontSize ?? EDITOR_TOOL_OPTIONS_DEFAULT.text.fontSize, 20, 400),
    fontFamily: typeof input?.fontFamily === "string" && input.fontFamily.trim() ? input.fontFamily : EDITOR_TOOL_OPTIONS_DEFAULT.text.fontFamily,
    fontWeight: clamp(Math.round(input?.fontWeight ?? EDITOR_TOOL_OPTIONS_DEFAULT.text.fontWeight), 100, 900),
    textAlign: align === "left" || align === "right" ? align : "center",
    color: typeof input?.color === "string" && /^#[0-9a-f]{3,8}$/i.test(input.color) ? input.color : null,
    letterSpacing: clamp(input?.letterSpacing ?? EDITOR_TOOL_OPTIONS_DEFAULT.text.letterSpacing, 0, 40),
  };
}
export type MaskBrushMode = "hide" | "reveal";
export type LayerEditTarget = "artwork" | "mask";
export type EditorLayerBlendMode = "normal" | "multiply" | "screen" | "overlay";
export type LayerMaskStroke = ArtworkStroke & { mode: MaskBrushMode };
export type EditorLayerKind = "artwork" | "text" | "shape" | "image" | "gradient";
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
  /** Width in artwork units that long lines wrap at. Omitted means no wrapping. */
  wrapWidth?: number;
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

/** Effects actually painted for a layer: the explicit list, else the legacy preset. */
export function editorTextEffects(text: EditorTextContent): EditorTextEffect[] {
  if (text.effects) return text.effects;
  if (text.textEffect === "shadow") return [{ id: "legacy-shadow", kind: "shadow", color: text.effectColor ?? "#000000", offsetX: text.effectOffset ?? 12, offsetY: text.effectOffset ?? 12, blur: text.effectBlur ?? 0 }];
  if (text.textEffect === "outline") return [{ id: "legacy-outline", kind: "outline", color: text.effectColor ?? "#000000", width: text.outlineWidth ?? 6 }];
  return [];
}

/**
 * Painted decoration geometry in layer units, in the same frame the renderer draws in:
 * absolute coordinates, where `text.x` is the anchor and `text.y` the first baseline.
 * The renderer draws from this and the Free Transform box measures it, so a decoration
 * cannot paint outside its box.
 */
export type EditorTextDecorationGeometry =
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number; width: number }
  | { kind: "cut"; x: number; y: number; width: number; height: number }
  | { kind: "oblique"; x1: number; y1: number; x2: number; y2: number; width: number };

export function editorTextDecoration(text: EditorTextContent): EditorTextDecorationGeometry | null {
  const decoration = text.textDecoration ?? "none";
  if (decoration === "none") return null;
  const size = text.fontSize;
  const width = text.decorationWidth ?? 4;
  if (decoration === "line") {
    const y = text.y + (editorTextLines(text).length - 1) * editorTextLineHeight(text) + size * 0.28;
    return { kind: "line", x1: text.x - size * 2.2, y1: y, x2: text.x + size * 2.2, y2: y, width };
  }
  if (decoration === "cut") {
    return { kind: "cut", x: text.x - size * 2.2, y: text.y - size * 0.34, width: size * 4.4, height: width };
  }
  return { kind: "oblique", x1: text.x - size * 2.1, y1: text.y + size * 0.2, x2: text.x - size * 1.5, y2: text.y - size * 0.1, width };
}

/**
 * How far the painted decoration reaches past the glyph ink, as `{ left, top, right, bottom }`.
 * The decoration is laid out from the anchor, not from the ink edge, so it is measured against
 * the ink box rather than added to it: padding the ink by a guessed `fontSize` multiple (what
 * this used to do) put the box ~50px past a strike-through rule that the glyphs never reach.
 */
function editorTextDecorationPadding(text: EditorTextContent, ink: { left: number; top: number; right: number; bottom: number }) {
  const geometry = editorTextDecoration(text);
  if (!geometry) return { left: 0, top: 0, right: 0, bottom: 0 };
  let box: { left: number; top: number; right: number; bottom: number };
  if (geometry.kind === "cut") {
    box = { left: geometry.x, top: geometry.y, right: geometry.x + geometry.width, bottom: geometry.y + geometry.height };
  } else {
    // Round and butt caps both stay inside the stroke's half-width halo.
    const half = geometry.width / 2;
    box = {
      left: Math.min(geometry.x1, geometry.x2) - half,
      top: Math.min(geometry.y1, geometry.y2) - half,
      right: Math.max(geometry.x1, geometry.x2) + half,
      bottom: Math.max(geometry.y1, geometry.y2) + half,
    };
  }
  // Geometry is absolute; the ink box is relative to the anchor.
  return {
    left: Math.max(0, ink.left - (box.left - text.x)),
    top: Math.max(0, ink.top - (box.top - text.y)),
    right: Math.max(0, box.right - text.x - ink.right),
    bottom: Math.max(0, box.bottom - text.y - ink.bottom),
  };
}

/**
 * How far each painted effect reaches past the glyph ink, as `{ left, top, right, bottom }`.
 * One copy of the text is painted per effect and each is offset or stroked, so the outline
 * must cover those copies too; a box that stopped at the base glyphs cut straight through an
 * outline, a drop shadow, a glow or an extrusion.
 */
export function editorTextPaintPadding(text: EditorTextContent): { left: number; top: number; right: number; bottom: number } {
  const pad = { left: 0, top: 0, right: 0, bottom: 0 };
  const grow = (x: number, y: number, spread = 0) => {
    pad.left = Math.max(pad.left, spread - x);
    pad.right = Math.max(pad.right, x + spread);
    pad.top = Math.max(pad.top, spread - y);
    pad.bottom = Math.max(pad.bottom, y + spread);
  };
  for (const effect of editorTextEffects(text)) {
    if (effect.enabled === false || effect.kind === "stripe") continue;
    const offsetX = effect.offsetX ?? 10;
    const offsetY = effect.offsetY ?? 10;
    const stroke = (effect.kind === "outline" ? effect.width ?? 6 : effect.kind === "glow" ? (effect.width ?? 12) * 1.5 : 0) / 2;
    // Blurred effects bleed roughly three standard deviations past the shape they blur.
    const blur = effect.blur ?? (effect.kind === "glow" ? 4 : 1);
    const spread = stroke + (effect.kind === "shadow" || effect.kind === "glow" ? blur * 3 : 0);
    if (effect.kind === "shadow" || effect.kind === "offset") grow(offsetX, offsetY, spread);
    else if (effect.kind === "outline" || effect.kind === "glow") grow(0, 0, spread);
    else if (effect.kind === "extrude") {
      const reach = effect.distance ?? 18;
      const angle = (effect.angle ?? 45) * Math.PI / 180;
      grow(Math.cos(angle) * reach, Math.sin(angle) * reach, spread);
    } else if (effect.kind === "echo") {
      grow(offsetX, offsetY, spread);
    }
  }
  const metrics = editorTextMetrics(text);
  const decoration = editorTextDecorationPadding(text, {
    left: metrics.inkLeft,
    top: metrics.inkTop,
    right: metrics.inkLeft + metrics.inkWidth,
    bottom: metrics.inkBottom,
  });
  pad.left = Math.max(pad.left, decoration.left);
  pad.top = Math.max(pad.top, decoration.top);
  pad.right = Math.max(pad.right, decoration.right);
  pad.bottom = Math.max(pad.bottom, decoration.bottom);
  return pad;
}

export const EDITOR_TEXT_DEFAULT_LINE_HEIGHT = 1.2;

/**
 * Lines actually painted, after soft-wrapping each hard line to `wrapWidth`.
 * Typing ran off the side of the canvas because a long line was painted as one
 * unbroken run: the glyphs continued past the print area instead of flowing
 * downward. Words break at spaces; a single word wider than the limit is split
 * by character so it can never overflow either.
 */
export function editorTextLines(text: EditorTextContent): string[] {
  const limit = text.wrapWidth ?? 0;
  const hardLines = text.value.split("\n");
  if (!(limit > 0)) return hardLines;
  const wrapped: string[] = [];
  for (const hardLine of hardLines) {
    if (!hardLine) {
      wrapped.push("");
      continue;
    }
    // Fit on the layout advance, not the ink width: the browser wraps a textarea on the
    // advance, so matching it keeps the editor's line breaks on the same words the artwork
    // paints. The two differ only when letter spacing adds a trailing gap.
    const fits = (candidate: string) => editorTextLineMetrics(text, candidate).advance <= limit;
    let current = "";
    for (const word of hardLine.split(" ")) {
      const candidate = current ? `${current} ${word}` : word;
      if (fits(candidate)) {
        current = candidate;
        continue;
      }
      if (current) wrapped.push(current);
      // A single word longer than the limit is broken by character.
      let piece = "";
      for (const char of word) {
        if (piece && !fits(piece + char)) {
          wrapped.push(piece);
          piece = char;
        } else {
          piece += char;
        }
      }
      current = piece;
    }
    wrapped.push(current);
  }
  return wrapped;
}

export function editorTextLineHeight(text: EditorTextContent): number {
  return text.fontSize * (text.lineHeight ?? EDITOR_TEXT_DEFAULT_LINE_HEIGHT);
}

export type EditorTextLineMetrics = {
  /** Painted ink width: the advance minus the trailing letter-space SVG adds after the last glyph. */
  width: number;
  /** Layout advance: what `text-anchor` centres or ends on, including that trailing letter-space. */
  advance: number;
  /** Font line-box ascent: baseline up to the top of the em box. Lays out the inline editor. */
  ascent: number;
  /** Font line-box descent: baseline down to the bottom of the em box. */
  descent: number;
  /** Ink ascent: baseline up to the top of the glyphs actually painted on this line. */
  inkAscent: number;
  /** Ink descent: baseline down to the bottom of the painted glyphs (descenders). */
  inkDescent: number;
  /** Ink left edge relative to the layout origin; negative when the glyphs lean left of it (italic). */
  inkLeft: number;
  /** Ink right edge relative to the layout origin; a trailing letter-space adds no ink. */
  inkRight: number;
};

// Character advance varies a lot with the glyph (a bold "M" is ~0.99em, a lowercase
// run ~0.58em), so a fixed per-character estimate makes the transform box cut through
// the text. The browser measures the real font; Node (tests, SSR) keeps the estimate.
function fallbackTextLineMetrics(text: EditorTextContent, line: string): EditorTextLineMetrics {
  const glyphs = Math.max(1, line.length);
  const hasInk = line.trim().length > 0;
  const spacing = text.letterSpacing ?? 0;
  const width = glyphs * text.fontSize * 0.58 + Math.max(0, glyphs - 1) * spacing;
  return {
    width,
    advance: glyphs * text.fontSize * 0.58 + glyphs * spacing,
    ascent: text.fontSize * 0.9,
    descent: text.fontSize * 0.24,
    inkAscent: hasInk ? text.fontSize * 0.72 : 0,
    inkDescent: hasInk ? text.fontSize * 0.2 : 0,
    inkLeft: 0,
    inkRight: width,
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

// Tests swap `document` to stub the canvas metrics, so they need to drop the cached context.
export function resetEditorTextMeasurementCache() {
  measurementContext = null;
}

export function editorTextLineMetrics(text: EditorTextContent, line: string): EditorTextLineMetrics {
  const fallback = fallbackTextLineMetrics(text, line);
  const context = editorTextMeasurementContext();
  if (!context) return fallback;
  context.font = `${text.fontStyle ?? "normal"} ${text.fontWeight ?? 700} ${text.fontSize}px ${text.fontFamily ?? EDITOR_TEXT_FONT_FAMILY}`;
  const measured = context.measureText(line);
  // SVG `letter-spacing` adds the gap after *every* glyph, including the last one, so a line
  // lays out `n * spacing` wide while its painted ink stops at `(n - 1) * spacing`. The
  // anchor centres/ends that advance, which leaves the ink offset half/full spacing from
  // `text.x`. Track both numbers so the transform box can follow the ink.
  const spacing = text.letterSpacing ?? 0;
  const width = Math.max(0, measured.width + Math.max(0, line.length - 1) * spacing);
  const advance = measured.width + line.length * spacing;
  // Two different vertical boxes are needed. The font line box (fontBoundingBox) positions
  // the inline editor so its caret sits on the drawn baseline, while the glyph ink box
  // (actualBoundingBox) is what the Free Transform outline must hug. Using the line box for
  // the outline left large empty gaps above and below all-caps text.
  const ascent = measured.fontBoundingBoxAscent > 0
    ? measured.fontBoundingBoxAscent
    : measured.actualBoundingBoxAscent > 0
      ? measured.actualBoundingBoxAscent
      : fallback.ascent;
  const descent = measured.fontBoundingBoxDescent > 0
    ? measured.fontBoundingBoxDescent
    : measured.actualBoundingBoxDescent > 0
      ? measured.actualBoundingBoxDescent
      : fallback.descent;
  // An empty line paints no ink, so it must not stretch the box above or below the glyphs.
  // Caps-only text has no descender, so Chrome reports an ink descent of exactly 0. That is
  // a real measurement, not a missing one: falling back to the 0.2em estimate would leave a
  // band of empty space under every all-caps line. The font line box only reports non-zero
  // values on browsers that support the metrics API, so it is the support signal.
  const hasInk = line.trim().length > 0;
  const supportsFontMetrics = measured.fontBoundingBoxAscent > 0 || measured.fontBoundingBoxDescent > 0;
  const inkAscent = hasInk ? (supportsFontMetrics ? measured.actualBoundingBoxAscent : fallback.inkAscent) : 0;
  const inkDescent = hasInk ? (supportsFontMetrics ? measured.actualBoundingBoxDescent : fallback.inkDescent) : 0;
  // Italic glyphs lean past the advance box, so the painted ink can start left of the layout
  // origin (`actualBoundingBoxLeft` is positive there). The advance width alone therefore
  // cropped the outline on italic text. Keep the true ink edges so the box follows the paint.
  // SVG adds `letter-spacing` after every glyph, which shifts the last glyph's ink right.
  const hasInkExtents = hasInk && Number.isFinite(measured.actualBoundingBoxLeft) && Number.isFinite(measured.actualBoundingBoxRight) && measured.actualBoundingBoxRight > 0;
  const trailingSpacing = Math.max(0, line.length - 1) * spacing;
  return {
    width: Number.isFinite(width) && width > 0 ? width : fallback.width,
    advance: Number.isFinite(advance) && advance > 0 ? advance : fallback.advance,
    ascent,
    descent,
    inkAscent,
    inkDescent,
    inkLeft: hasInkExtents ? Math.min(0, -measured.actualBoundingBoxLeft) : 0,
    inkRight: hasInkExtents ? measured.actualBoundingBoxRight + trailingSpacing : Math.max(0, width),
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
  // Each line is anchored on its own advance, so the ink can start left of `text.x` (centred)
  // or end exactly on it (right-aligned). Only lines with ink matter for the outline.
  const align = text.textAlign ?? "center";
  // The line's layout origin: where its advance starts, relative to `text.x`.
  const lineOrigins = lineMetrics.map((metrics) => (align === "left" ? 0 : align === "right" ? -metrics.advance : -metrics.advance / 2));
  // Ink is measured from that origin, not from the advance: italic glyphs lean past it.
  const inkLefts = lineMetrics.map((metrics, index) => lineOrigins[index] + metrics.inkLeft);
  const inkRights = lineMetrics.map((metrics, index) => lineOrigins[index] + metrics.inkRight);
  const ascent = Math.max(...lineMetrics.map((metrics) => metrics.ascent));
  const descent = Math.max(...lineMetrics.map((metrics) => metrics.descent));
  // The transform box must hug the painted glyphs, so union each line's ink box around its
  // own baseline (line i sits i line-heights below the first baseline). A blank line paints
  // nothing, so it is skipped: counting its baseline offset as ink would stretch the box
  // down to the last empty line instead of stopping at the last glyph.
  const inked = lineMetrics
    .map((metrics, index) => ({ metrics, index }))
    .filter(({ metrics }) => metrics.inkAscent > 0 || metrics.inkDescent > 0);
  const inkTops = inked.map(({ metrics, index }) => index * lineHeight - metrics.inkAscent);
  const inkBottoms = inked.map(({ metrics, index }) => index * lineHeight + metrics.inkDescent);
  // A leading blank line must not pull the top of the box up to the first baseline, so the
  // extent comes from the inked lines alone; text with no ink at all collapses to zero.
  const inkTop = inkTops.length ? Math.min(...inkTops) : 0;
  const inkBottom = inkBottoms.length ? Math.max(...inkBottoms) : 0;
  // Blank lines paint nothing, so they must not widen the box either.
  const inkedIndices = inked.map(({ index }) => index);
  const left = inkedIndices.length ? Math.min(...inkedIndices.map((index) => inkLefts[index])) : 0;
  const right = inkedIndices.length ? Math.max(...inkedIndices.map((index) => inkRights[index])) : Math.max(1, ...widths);
  return {
    lines,
    lineHeight,
    widths,
    ascent,
    descent,
    inkTop,
    inkBottom,
    inkLeft: left,
    inkWidth: Math.max(1, right - left),
    width: Math.max(1, ...widths),
    height: inkBottom - inkTop,
  };
}

/** Affine matrix in SVG order: `[a, b, c, d, e, f]`. */
export type EditorTextMatrix = [number, number, number, number, number, number];

/**
 * The preset transform the renderer applies to a text layer. Both the renderer and the
 * Free Transform box read it from here, so the outline can never drift from the glyphs.
 * `arch` tilts the line; `wave` shears it. Both pivot on the layer's own anchor point
 * (`text.x`, `text.y`) so a preset bends the text in place instead of throwing it across
 * the artwork, which is what an origin-pivoted `skewX` used to do.
 */
export function editorTextPresetMatrix(text: EditorTextContent): EditorTextMatrix {
  const preset = text.textTransform ?? "none";
  if (preset !== "arch" && preset !== "wave") return [1, 0, 0, 1, 0, 0];
  const angle = (preset === "arch" ? -6 : -4) * Math.PI / 180;
  const a = 1;
  const b = 0;
  const c = preset === "arch" ? -Math.sin(angle) : Math.tan(angle);
  const d = preset === "arch" ? Math.cos(angle) : 1;
  // Pivot the matrix on the anchor: T(anchor) * M * T(-anchor).
  return [
    a,
    b,
    c,
    d,
    text.x - (a * text.x + c * text.y),
    text.y - (b * text.x + d * text.y),
  ];
}

/** The preset transform as an SVG `matrix(...)` string, or `undefined` for no preset. */
export function editorTextPresetTransform(text: EditorTextContent): string | undefined {
  if ((text.textTransform ?? "none") === "none" || (text.textTransform ?? "none") === "circle") return undefined;
  return `matrix(${editorTextPresetMatrix(text).map((value) => Number(value.toFixed(6))).join(" ")})`;
}

/**
 * The Free Transform box for a text layer, hugging the painted glyphs: `x` follows the
 * alignment, `y` is the top of the ink (highest glyph above the first baseline) and
 * `height` reaches the lowest ink below the last line. The canvas adds its uniform selection
 * margin, so the outline sits evenly around the glyphs instead of the taller font line box.
 *
 * A preset (`arch`, `wave`) moves the painted glyphs, so the ink box is pushed through the
 * same matrix and re-squared; without that the outline stayed on the untilted text.
 */
export function editorTextCanvasBounds(text: EditorTextContent): { x: number; y: number; width: number; height: number } {
  const { inkTop, inkBottom, inkLeft, inkWidth } = editorTextMetrics(text);
  const paint = editorTextPaintPadding(text);
  const x = text.x + inkLeft - paint.left;
  const y = text.y + inkTop - paint.top;
  const width = inkWidth + paint.left + paint.right;
  const height = Math.max(1, inkBottom - inkTop + paint.top + paint.bottom);
  const [a, b, c, d, e, f] = editorTextPresetMatrix(text);
  if (a === 1 && b === 0 && c === 0 && d === 1 && e === 0 && f === 0) return { x, y, width, height };
  const corners = [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ].map((point) => ({ x: a * point.x + c * point.y + e, y: b * point.x + d * point.y + f }));
  const xs = corners.map((point) => point.x);
  const ys = corners.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { x: minX, y: minY, width: Math.max(1, Math.max(...xs) - minX), height: Math.max(1, Math.max(...ys) - minY) };
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
/** Vector appearance with independent Fill and Stroke channels plus effects. */
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
  /** Design frame: rounded corners and a border drawn inside the image box. */
  cornerRadius?: number;
  borderWidth?: number;
  borderColor?: string;
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
  | "cornerRadius" | "borderWidth" | "borderColor"
  | "aiEnhanced" | "smartFilter" | "smartFilterIntensity"
  | "backgroundRemoved" | "upscaled";

export type PhotoAdjustmentUpdate = Partial<Pick<EditorImageContent, PhotoAdjustmentKey>>;

/** Gradient shapes. Linear and reflected run along the drag axis; radial,
 * angle (conic), and diamond grow outward from the drag start point. */
export type EditorGradientType = "linear" | "radial" | "angle" | "reflected" | "diamond";
export const EDITOR_GRADIENT_TYPES: EditorGradientType[] = ["linear", "radial", "angle", "reflected", "diamond"];
export const EDITOR_GRADIENT_LABELS: Record<EditorGradientType, string> = {
  linear: "Linear",
  radial: "Radial",
  angle: "Angle",
  reflected: "Reflected",
  diamond: "Diamond",
};
export type EditorGradientStop = {
  id: string;
  /** Position along the gradient, 0 to 100. */
  offset: number;
  color: string;
  /** Stop opacity, 0 to 1. */
  opacity: number;
};
export type EditorGradient = {
  type: EditorGradientType;
  /** Drag start in 1000 x 1200 artwork units; the axis origin for every type. */
  x1: number;
  y1: number;
  /** Drag end. Its distance from the start sets the gradient length. */
  x2: number;
  y2: number;
  stops: EditorGradientStop[];
};
/** Eight stops cover the editor without an unwieldy handle row. */
export const EDITOR_GRADIENT_STOP_LIMIT = 8;

export const EDITOR_GRADIENT_PRESETS: { id: string; label: string; stops: { offset: number; color: string; opacity: number }[] }[] = [
  { id: "black-white", label: "Black → White", stops: [{ offset: 0, color: "#000000", opacity: 1 }, { offset: 100, color: "#ffffff", opacity: 1 }] },
  { id: "white-black", label: "White → Black", stops: [{ offset: 0, color: "#ffffff", opacity: 1 }, { offset: 100, color: "#000000", opacity: 1 }] },
  { id: "transparent", label: "Transparent", stops: [{ offset: 0, color: "#000000", opacity: 1 }, { offset: 100, color: "#000000", opacity: 0 }] },
  { id: "accent-fade", label: "Accent fade", stops: [{ offset: 0, color: "#d4ff3f", opacity: 1 }, { offset: 100, color: "#d4ff3f", opacity: 0 }] },
  { id: "sunset", label: "Sunset", stops: [{ offset: 0, color: "#ff7a18", opacity: 1 }, { offset: 55, color: "#af002d", opacity: 1 }, { offset: 100, color: "#320b6b", opacity: 1 }] },
  { id: "ocean", label: "Ocean", stops: [{ offset: 0, color: "#00c6ff", opacity: 1 }, { offset: 100, color: "#0072ff", opacity: 1 }] },
  { id: "gold", label: "Gold", stops: [{ offset: 0, color: "#f7971e", opacity: 1 }, { offset: 100, color: "#ffd200", opacity: 1 }] },
  { id: "rainbow", label: "Rainbow", stops: [{ offset: 0, color: "#ff0000", opacity: 1 }, { offset: 17, color: "#ff8a00", opacity: 1 }, { offset: 34, color: "#ffe600", opacity: 1 }, { offset: 50, color: "#3ddc4a", opacity: 1 }, { offset: 67, color: "#2f7bff", opacity: 1 }, { offset: 84, color: "#7a2ffb", opacity: 1 }, { offset: 100, color: "#ff2fd0", opacity: 1 }] },
];

let gradientStopSeq = 0;
export function nextEditorGradientStopId(): string {
  gradientStopSeq += 1;
  return `grad-stop-${gradientStopSeq}`;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const clampStopOffset = (value: number): number => Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
const isGradientColor = (value: unknown): value is string => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);

function mixHex(a: string, b: string, t: number): string {
  const channel = (hex: string, index: number) => parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16);
  const blend = (index: number) => Math.round(channel(a, index) + (channel(b, index) - channel(a, index)) * t);
  return `#${[0, 1, 2].map((index) => blend(index).toString(16).padStart(2, "0")).join("")}`;
}

export function defaultEditorGradient(): EditorGradient {
  return {
    type: "linear",
    x1: 250,
    y1: 600,
    x2: 750,
    y2: 600,
    stops: [
      { id: "grad-default-1", offset: 0, color: "#000000", opacity: 1 },
      { id: "grad-default-2", offset: 100, color: "#ffffff", opacity: 1 },
    ],
  };
}

export function sortEditorGradientStops(stops: EditorGradientStop[]): EditorGradientStop[] {
  return [...stops].sort((a, b) => a.offset - b.offset);
}

export function normalizeEditorGradient(input: Partial<EditorGradient> | undefined, fallback: EditorGradient = defaultEditorGradient()): EditorGradient {
  const type = EDITOR_GRADIENT_TYPES.includes(input?.type as EditorGradientType) ? input!.type as EditorGradientType : fallback.type;
  const rawStops = Array.isArray(input?.stops) && input!.stops.length >= 2 ? input!.stops : fallback.stops;
  const stops = sortEditorGradientStops(rawStops.slice(0, EDITOR_GRADIENT_STOP_LIMIT).map((stop) => ({
    id: stop.id || nextEditorGradientStopId(),
    offset: clampStopOffset(stop.offset),
    color: isGradientColor(stop.color) ? stop.color : "#000000",
    opacity: clamp01(Number.isFinite(stop.opacity) ? stop.opacity : 1),
  })));
  const axis = (value: unknown, fallbackValue: number) => Number.isFinite(value) ? value as number : fallbackValue;
  return {
    type,
    x1: axis(input?.x1, fallback.x1),
    y1: axis(input?.y1, fallback.y1),
    x2: axis(input?.x2, fallback.x2),
    y2: axis(input?.y2, fallback.y2),
    stops,
  };
}

/** Sample the ramp at a 0-1 position, blending the two surrounding stops. Used for
 * conic and diamond shapes, which sample the ramp per wedge/facet. */
export function sampleEditorGradient(stops: EditorGradientStop[], t: number): { color: string; opacity: number } {
  const sorted = sortEditorGradientStops(stops);
  if (sorted.length === 0) return { color: "#000000", opacity: 1 };
  const position = clamp01(t) * 100;
  if (position <= sorted[0].offset) return { color: sorted[0].color, opacity: sorted[0].opacity };
  const last = sorted[sorted.length - 1];
  if (position >= last.offset) return { color: last.color, opacity: last.opacity };
  for (let index = 1; index < sorted.length; index += 1) {
    const prev = sorted[index - 1];
    const next = sorted[index];
    if (position <= next.offset) {
      const span = next.offset - prev.offset || 1;
      const local = (position - prev.offset) / span;
      return { color: mixHex(prev.color, next.color, local), opacity: prev.opacity + (next.opacity - prev.opacity) * local };
    }
  }
  return { color: last.color, opacity: last.opacity };
}

/** The gradient's origin and radius. The drag length sets the radius; conic and
 * diamond shapes read it from the same 3-4-5 distance the linear axis uses. */
export function editorGradientGeometry(gradient: EditorGradient): { cx: number; cy: number; radius: number } {
  return { cx: gradient.x1, cy: gradient.y1, radius: Math.hypot(gradient.x2 - gradient.x1, gradient.y2 - gradient.y1) };
}

/** A conic ("angle") gradient as flat wedges: SVG has no native conic paint, so the
 * ramp is sampled once per segment and drawn as a pie wedge. */
export function editorGradientConicWedges(gradient: EditorGradient, segments = 120): { d: string; color: string; opacity: number }[] {
  const { cx, cy } = editorGradientGeometry(gradient);
  const outer = Math.hypot(1000, 1200);
  const startAngle = Math.atan2(gradient.y2 - gradient.y1, gradient.x2 - gradient.x1);
  const step = (Math.PI * 2) / segments;
  const wedges: { d: string; color: string; opacity: number }[] = [];
  for (let index = 0; index < segments; index += 1) {
    const a0 = startAngle + index * step;
    const a1 = a0 + step;
    const x0 = cx + Math.cos(a0) * outer;
    const y0 = cy + Math.sin(a0) * outer;
    const x1 = cx + Math.cos(a1) * outer;
    const y1 = cy + Math.sin(a1) * outer;
    const sample = sampleEditorGradient(gradient.stops, index / segments);
    wedges.push({
      d: `M ${cx.toFixed(2)} ${cy.toFixed(2)} L ${x0.toFixed(2)} ${y0.toFixed(2)} L ${x1.toFixed(2)} ${y1.toFixed(2)} Z`,
      color: sample.color,
      opacity: sample.opacity,
    });
  }
  return wedges;
}

/** A diamond gradient as four triangular facets, each ramping out from the origin. */
export function editorGradientDiamondFacets(gradient: EditorGradient): { d: string; from: { x: number; y: number }; to: { x: number; y: number } }[] {
  const { cx, cy, radius } = editorGradientGeometry(gradient);
  const corners = [
    { x: cx, y: cy - radius },
    { x: cx + radius, y: cy },
    { x: cx, y: cy + radius },
    { x: cx - radius, y: cy },
  ];
  return corners.map((corner, index) => {
    const next = corners[(index + 1) % corners.length];
    return {
      d: `M ${cx.toFixed(2)} ${cy.toFixed(2)} L ${corner.x.toFixed(2)} ${corner.y.toFixed(2)} L ${next.x.toFixed(2)} ${next.y.toFixed(2)} Z`,
      from: { x: cx, y: cy },
      to: { x: (corner.x + next.x) / 2, y: (corner.y + next.y) / 2 },
    };
  });
}

/** Build a gradient layer's starting content from the Gradient tool's shape/preset. */
export function editorGradientFromToolSettings(settings: EditorGradientToolSettings | undefined): EditorGradient {
  const normalized = normalizeEditorGradientToolSettings(settings);
  const preset = EDITOR_GRADIENT_PRESETS.find((item) => item.id === normalized.presetId) ?? EDITOR_GRADIENT_PRESETS[0];
  return normalizeEditorGradient({
    ...defaultEditorGradient(),
    type: normalized.type,
    stops: preset.stops.map((stop) => ({
      id: nextEditorGradientStopId(),
      ...stop,
      offset: normalized.reverse ? 100 - stop.offset : stop.offset,
    })),
  });
}

export function createEditorGradientLayer(
  id: string,
  name: string,
  gradient: EditorGradient,
): EditorArtworkLayer {
  return { ...createEditorArtworkLayer(id, name), kind: "gradient", gradient: normalizeEditorGradient(gradient) };
}

export function setEditorLayerGradient(
  layers: EditorArtworkLayer[],
  layerId: string,
  gradient: EditorGradient,
): EditorArtworkLayer[] {
  return layers.map((layer) => layer.id === layerId && layer.gradient
    ? { ...layer, gradient: normalizeEditorGradient(gradient, layer.gradient) }
    : layer);
}

export function updateEditorGradientSettings(
  layers: EditorArtworkLayer[],
  layerId: string,
  update: Partial<EditorGradient>,
): EditorArtworkLayer[] {
  return layers.map((layer) => layer.id === layerId && layer.gradient
    ? { ...layer, gradient: normalizeEditorGradient({ ...layer.gradient, ...update }, layer.gradient) }
    : layer);
}

export function setEditorGradientStops(
  layers: EditorArtworkLayer[],
  layerId: string,
  stops: EditorGradientStop[],
): EditorArtworkLayer[] {
  return layers.map((layer) => layer.id === layerId && layer.gradient
    ? { ...layer, gradient: normalizeEditorGradient({ ...layer.gradient, stops }, layer.gradient) }
    : layer);
}

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
  gradient: EditorGradient | null;
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
    gradient: null,
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
    gradient: source.gradient ? { ...source.gradient, stops: source.gradient.stops.map((stop) => ({ ...stop })) } : null,
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

/** The board every layer is arranged against, in artwork units (the 1000 x 1200 print area). */
export const EDITOR_ARTBOARD = { width: 1000, height: 1200 } as const;

/** How the canvas places a layer: a canvas offset, then scale and rotation about its own pivot. */
export type EditorLayerPlacement = {
  offset: ArtworkPoint;
  scale: ArtworkPoint;
  origin: ArtworkPoint;
  rotation: number;
};

export type EditorLayerBox = { x: number; y: number; width: number; height: number };

export type EditorArrangeAction =
  | "left" | "center-h" | "right" | "top" | "middle" | "bottom" | "center"
  | "flip-h" | "flip-v" | "rotate-90" | "rotate-180" | "reset-rotation" | "reset-scale" | "duplicate";

export const EDITOR_ARRANGE_ALIGNMENTS: EditorArrangeAction[] = ["left", "center-h", "right", "top", "middle", "bottom"];

export const EDITOR_ARRANGE_LABELS: Record<EditorArrangeAction, string> = {
  left: "Left", "center-h": "Centre", right: "Right",
  top: "Top", middle: "Middle", bottom: "Bottom",
  center: "Centre on canvas", "flip-h": "Flip across", "flip-v": "Flip down",
  "rotate-90": "Rotate 90°", "rotate-180": "Rotate 180°",
  "reset-rotation": "Reset rotation", "reset-scale": "Reset size", duplicate: "Duplicate",
};

/** The axis-aligned box a layer paints once its offset, scale and rotation are applied. */
export function placedLayerBounds(bounds: EditorLayerBox, placement: EditorLayerPlacement): EditorLayerBox {
  const radians = (placement.rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const corners = [
    [bounds.x, bounds.y],
    [bounds.x + bounds.width, bounds.y],
    [bounds.x, bounds.y + bounds.height],
    [bounds.x + bounds.width, bounds.y + bounds.height],
  ];
  const points = corners.map(([x, y]) => {
    const dx = (x - placement.origin.x) * placement.scale.x;
    const dy = (y - placement.origin.y) * placement.scale.y;
    return {
      x: placement.origin.x + dx * cos - dy * sin + placement.offset.x,
      y: placement.origin.y + dx * sin + dy * cos + placement.offset.y,
    };
  });
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
}

/** The offset that snaps a layer to an artboard edge, the centre, or both. */
export function arrangeLayerOffset(
  bounds: EditorLayerBox,
  placement: EditorLayerPlacement,
  action: EditorArrangeAction,
): ArtworkPoint {
  const placed = placedLayerBounds(bounds, placement);
  let dx = 0;
  let dy = 0;
  if (action === "left") dx = -placed.x;
  if (action === "center-h" || action === "center") dx = (EDITOR_ARTBOARD.width - placed.width) / 2 - placed.x;
  if (action === "right") dx = EDITOR_ARTBOARD.width - placed.width - placed.x;
  if (action === "top") dy = -placed.y;
  if (action === "middle" || action === "center") dy = (EDITOR_ARTBOARD.height - placed.height) / 2 - placed.y;
  if (action === "bottom") dy = EDITOR_ARTBOARD.height - placed.height - placed.y;
  return { x: placement.offset.x + dx, y: placement.offset.y + dy };
}

/** One-click looks for a text layer; each is only an effect stack, so the text stays editable. */
export type EditorTextStylePreset = {
  id: string;
  label: string;
  hint: string;
  effects: Omit<EditorTextEffect, "id">[];
};

export const EDITOR_TEXT_STYLES: EditorTextStylePreset[] = [
  { id: "neon", label: "Neon", hint: "Glowing tube", effects: [{ kind: "glow", color: "#37d7ff", width: 20, blur: 14, opacity: 0.9 }, { kind: "glow", color: "#d4ff3f", width: 9, blur: 6, opacity: 0.8 }] },
  { id: "sticker", label: "Sticker", hint: "White cut edge", effects: [{ kind: "outline", color: "#ffffff", width: 12 }, { kind: "shadow", color: "#111827", offsetX: 6, offsetY: 8, blur: 3 }] },
  { id: "retro", label: "Retro", hint: "Deep 3D block", effects: [{ kind: "extrude", color: "#ff5b8a", distance: 9, count: 7 }, { kind: "outline", color: "#111827", width: 4 }] },
  { id: "chrome", label: "Chrome", hint: "Layered metal", effects: [{ kind: "offset", color: "#c7d2fe", offsetX: 4, offsetY: 5 }, { kind: "outline", color: "#0f172a", width: 5 }, { kind: "glow", color: "#ffffff", width: 7, blur: 5, opacity: 0.7 }] },
  { id: "outline", label: "Outline", hint: "Colour edge", effects: [{ kind: "outline", color: "#d4ff3f", width: 7 }] },
  { id: "shadow", label: "Shadow", hint: "Soft drop", effects: [{ kind: "shadow", color: "#111827", offsetX: 8, offsetY: 10, blur: 6 }] },
  { id: "echo", label: "Echo", hint: "Rhythm trails", effects: [{ kind: "echo", color: "#37d7ff", count: 4, offsetX: 12, offsetY: 12 }] },
  { id: "stripe", label: "Striped", hint: "Barber bars", effects: [{ kind: "stripe", color: "#f97316", width: 6, distance: 14, angle: -30 }] },
];

/** Turns a preset into effects with unique ids, so the stack editor can reorder and tune them. */
export function textStyleEffects(preset: EditorTextStylePreset, seed: number | string = Date.now()): EditorTextEffect[] {
  return preset.effects.map((effect, index) => ({ ...effect, id: `${preset.id}-${seed}-${index}`, enabled: true }));
}

/** Quick colours for text, fill and stroke, so a design stays on brand without a colour wheel. */
export const EDITOR_DESIGN_SWATCHES: { name: string; value: string }[] = [
  { name: "Ink", value: "#111827" },
  { name: "Paper", value: "#ffffff" },
  { name: "Lime", value: "#d4ff3f" },
  { name: "Leaf", value: "#4f9d16" },
  { name: "Sky", value: "#37d7ff" },
  { name: "Berry", value: "#ff5b8a" },
  { name: "Grape", value: "#7c3aed" },
  { name: "Tangerine", value: "#f97316" },
  { name: "Gold", value: "#f4c430" },
  { name: "Slate", value: "#64748b" },
  { name: "Mint", value: "#a7f3d0" },
  { name: "Sand", value: "#f5e6ca" },
];
