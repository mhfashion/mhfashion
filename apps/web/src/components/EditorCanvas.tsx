"use client";

import { Grid2X2, Hand, Minus, Plus, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MockupArtwork from "@/components/MockupArtwork";
import EditorArtworkLayers from "@/components/EditorArtworkLayers";
import { GradientPreview } from "@/components/EditorLayerPreview";
import EditorToolsBar, { type EditorTool } from "@/components/EditorToolsBar";
import EditorEditSidebar from "@/components/EditorEditSidebar";
import EditorAdjustmentsPanel from "@/components/EditorAdjustmentsPanel";
import EditorLayersPanel from "@/components/EditorLayersPanel";
import {
  claimLargeArtworkTier,
  getArtworkMaxEdgePx,
  reconcileLargeArtworkTier,
  releaseLargeArtworkTier,
} from "@/lib/editor-artwork-tiers";
import { PRINT_CANVAS_SPEC } from "@/lib/editor-canvas-spec";
import { editorHistoryShortcut } from "@/lib/editor-shortcuts";
import { imagePrintQuality, imagePrintLevelRank } from "@/lib/editor-image-ppi";
import type { ImagePrintQuality } from "@/lib/editor-image-ppi";
import { flipLayerPlacement, getFreeTransformResizeAnchor, getFreeTransformResizeFactors, rotateTransformPoint, snapEditorRotationDelta } from "@/lib/editor-transform";
import type { TransformHandle } from "@/lib/editor-transform";
import {
  addLayerMask,
  appendLayerErasure,
  appendEditorShapePaths,
  appendLayerStroke,
  clearLayerErasures,
  createEditorArtworkLayer,
  createEditorGradientLayer,
  createEditorImageLayer,
  createEditorShapePaths,
  defaultEditorShapeStyle,
  roundEditorShapePath,
  EDITOR_SHAPE_LABELS,
  createEditorTextLayer,
  deleteEditorLayer,
  duplicateEditorLayer,
  editorGradientFromToolSettings,
  editorTextCanvasBounds,
  editorTextLines,
  editorTextMetrics,
  EDITOR_TEXT_FONT_FAMILY,
  groupEditorLayers,
  linkEditorLayers,
  moveEditorLayerToIndex,
  normalizeEditorToolOptions,
  removeLayerMask,
  reorderEditorLayer,
  segmentDistancePx,
  setEditorLayerGradient,
  setEditorLayerText,
  EDITOR_TOOL_OPTIONS_DEFAULT,
  ungroupEditorLayers,
  unlinkEditorLayers,
  updateEditorLayerTextStyle,
  updateEditorImageAdjustments,
  updateEditorPenPath,
  updateEditorShapeBuilderMode,
  updateEditorShapeStyle,
  applyEditorShapeBuilderOperation,
  updateEditorLayer,
  updateLayerLastErasure,
  updateLayerLastStroke,
} from "@/lib/editor-layers";
import type { ArtworkStroke, EditorBrushShape, EditorErasure, EditorGradient, EditorShapeStyle, EditorToolOptions } from "@/lib/editor-layers";
import {
  cornerEditorPenAnchor,
  draggedEditorPenAnchor,
  editorPenPathData,
  insertEditorPenAnchor,
  removeEditorPenAnchor,
  snapEditorPenPoint,
} from "@/lib/editor-pen-path";
import type { EditorPenAnchor, EditorPenPath } from "@/lib/editor-pen-path";
import type {
  EditorArtworkLayer,
  EditorLayerAppearance,
  EditorShapePreset,
  EditorTextContent,
  LayerEditTarget,
  MaskBrushMode,
  PhotoAdjustmentUpdate,
} from "@/lib/editor-layers";
import {
  designLayerToEditorLayer,
  designToEditorLayers,
} from "@/lib/editor-design-library";
import type {
  DesignLibraryEntry,
  DesignLibraryLayer,
  DesignLibraryText,
} from "@/lib/editor-design-library";
import {
  UPLOAD_MAX_BYTES,
  compressImageUpload,
  formatByteSize,
  imageLayerBox,
} from "@/lib/editor-upload";
import type { EditorProduct } from "@/lib/editor-product";
import { saveDesignDraft } from "@/lib/design-draft";

// The shared artwork space is 1000 x 1200 units; new text starts centred on it.
const CANVAS_ARTWORK_CENTER = { x: 500, y: 600 };
// How far (in artwork units) a layer may be dragged past the print area. Large enough to
// place artwork off-canvas and bring it back, small enough that it never leaves the workspace.
const CANVAS_LAYER_TRAVEL_LIMIT = 2400;
// On a touch screen the pasteboard stops this far (in local px) outside the print area. A
// viewport-wide drawing surface would swallow the scroll gesture that reaches the mockups.
const PASTEBOARD_TOUCH_RING_PX = 96;
const TEXT_EDIT_BOX_WIDTH = 900;
// New text wraps at the print area width so a long line flows downward instead of
// running past the canvas edge. Typed lines stay inside the artwork they print on.
const DEFAULT_TEXT_WRAP_WIDTH = 880;

// Tools that paint onto a layer. A photo layer is edited only through the Photo
// Adjustments panel, so these are disabled while a photo layer is selected.
const DRAWING_TOOLS: EditorTool[] = ["brush", "pencil", "pen", "shape", "gradient", "eraser"];
// Every tool that puts marks on the artwork, including text. These get a drawing surface that
// reaches past the print area, so a stroke or a text box can be placed outside the canvas
// instead of stopping dead at its border.
const CANVAS_OUTSIDE_TOOLS: EditorTool[] = [...DRAWING_TOOLS, "text"];

// Inline SVG paths for the double-headed arrows shown while hovering a resize handle.
// Each path is centred on the handle and points along that handle's own axis: corners use
// the diagonal arrow, edge handles use the straight arrow.
const RESIZE_GLYPH_PATHS = {
  diagonal: "M-3.6 -3.6 3.6 3.6M-3.6 -3.6h2.5M-3.6 -3.6v2.5M3.6 3.6h-2.5M3.6 3.6v-2.5",
  horizontal: "M-4.2 0h8.4M-4.2 0l2.3-1.7M-4.2 0l2.3 1.7M4.2 0l-2.3-1.7M4.2 0l-2.3 1.7",
  vertical: "M0 -4.2v8.4M0 -4.2l-1.7 2.3M0 -4.2l1.7 2.3M0 4.2l-1.7-2.3M0 4.2l1.7-2.3",
} as const;

function resizeHandleGlyphPath(angle: number) {
  if (angle === 90) return RESIZE_GLYPH_PATHS.vertical;
  if (angle === 0) return RESIZE_GLYPH_PATHS.horizontal;
  return RESIZE_GLYPH_PATHS.diagonal;
}

function editorToolCursor(tool: EditorTool) {
  const drawings: Record<string, string> = {
    pen: '<path d="M15.707 21.293a1 1 0 0 1-1.414 0l-1.586-1.586a1 1 0 0 1 0-1.414l5.586-5.586a1 1 0 0 1 1.414 0l1.586 1.586a1 1 0 0 1 0 1.414z"/><path d="m18 13-1.375-6.874a1 1 0 0 0-.746-.776L3.235 2.028a1 1 0 0 0-1.207 1.207L5.35 15.879a1 1 0 0 0 .776.746L13 18"/><path d="m2.3 2.3 7.286 7.286"/><circle cx="11" cy="11" r="2"/>',
    pencil: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
    brush: '<path d="m11 10 3 3"/><path d="M6.5 21A3.5 3.5 0 1 0 3 17.5a2.62 2.62 0 0 1-.708 1.792A1 1 0 0 0 3 21z"/><path d="M9.969 17.031 21.378 5.624a1 1 0 0 0-3.002-3.002L6.967 14.031"/>',
    eraser: '<circle cx="12" cy="12" r="7"/>',
    move: '<path d="M12 2v20"/><path d="m15 19-3 3-3-3"/><path d="m19 9 3 3-3 3"/><path d="M2 12h20"/><path d="m5 9-3 3 3 3"/><path d="m9 5 3-3 3 3"/>',
    hand: '<path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>',
    text: '<path d="M12 4v16"/><path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2"/><path d="M9 20h6"/>',
    shape: '<rect width="18" height="18" x="3" y="3" rx="2"/>',
    gradient: '<circle cx="15" cy="9" r="7"/><circle cx="9" cy="15" r="7"/>',
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#202124" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${drawings[tool] ?? drawings.move}</svg>`;
  // The pen icon's nib (where its slit points) is the top-left corner, so the
  // hotspot sits there — the same anchor every other tool uses. An earlier value
  // ("15 22") landed on the pen's tail, so the anchor appeared offset from the nib.
  const hotspot = "2 2";
  const fallbackCursor = tool === "pen" ? "crosshair" : "auto";
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hotspot}, ${fallbackCursor}`;
}

type PanStart = { pointerId: number; startX: number; startY: number; panX: number; panY: number };
type MockupSide = "Front Mockup" | "Back Mockup";
type WorkspaceNode = "Print canvas" | MockupSide;
type Point = { x: number; y: number };
type PenAnchorDrag = { pointerId: number; index: number; point: Point; corner: boolean };
type PenEditDrag = { pointerId: number; layerId: string; pathIndex: number; index: number; kind: "anchor" | "handle-in" | "handle-out"; start: Point; origin: EditorPenAnchor };
type CanvasBounds = { x: number; y: number; width: number; height: number };
// The pasteboard's own box, in percent of the print canvas. Percent keeps it aligned with the
// canvas at any zoom and pan without re-deriving artwork units.
type PasteboardRect = { left: number; top: number; width: number; height: number };
type CanvasArtworkDrag = { pointerId: number; start: Point; origin: Record<string, Point>; clamp: CanvasDeltaClamp | null };
type CanvasDeltaClamp = { minX: number; maxX: number; minY: number; maxY: number };
type CanvasLayerTransformSnapshot = { scale: Point; offset: Point; rotation: number; pivot: Point };
type CanvasLayerResizeDrag = { pointerId: number; pointerStart: Point; bounds: CanvasBounds; rotation: number; origin: Record<string, CanvasLayerTransformSnapshot>; handle: TransformHandle };
type CanvasLayerRotateDrag = { pointerId: number; center: Point; startAngle: number; origin: Record<string, CanvasLayerTransformSnapshot> };
type ActiveNodeDrag = { node: WorkspaceNode; pointerId: number; startX: number; startY: number; origin: Point };
type Connector = { side: MockupSide; path: string; start: Point; end: Point };
type ActiveArtworkStroke = {
  pointerId: number;
  layerId: string;
  target: LayerEditTarget;
  tool: "pen" | "brush";
  maskBrushMode: MaskBrushMode;
  points: Point[];
  color: string;
  width?: number;
  opacity?: number;
  shape?: EditorBrushShape;
  softness?: number;
  /** Brush-engine options recorded on the stroke (spacing, flow, jitter, angle, ...). */
  brush?: Partial<ArtworkStroke>;
};
type ActiveShapeDrag = { pointerId: number; layerId: string; preset: EditorShapePreset; start: Point; current: Point; color: string };
/** A Gradient drag paints a full-canvas fill. `layerId` is an existing gradient layer to
 * re-aim, or null to drop a brand-new gradient layer when the drag ends. */
type ActiveGradientDrag = { pointerId: number; layerId: string | null; start: Point; current: Point; gradient: EditorGradient };

function layerCanvasBounds(layer: EditorArtworkLayer): CanvasBounds | null {
  const textBounds = layer.text ? editorTextCanvasBounds(layer.text) : null;
  // A text-only layer should hug its measured glyph block. The safety inset used
  // by artwork/shape layers makes text transforms visibly larger than the copy.
  if (layer.kind === "text" && textBounds) return textBounds;
  // A gradient layer fills the whole artwork, so its box is the full canvas.
  if (layer.gradient) return { x: 0, y: 0, width: 1000, height: 1200 };
  const points = [
    ...layer.strokes.flatMap((stroke) => stroke.points.map((point) => ({ x: point.x * 1000, y: point.y * 1200 }))),
    ...(textBounds ? [{ x: textBounds.x, y: textBounds.y }, { x: textBounds.x + textBounds.width, y: textBounds.y + textBounds.height }] : []),
    ...(layer.image ? [{ x: layer.image.x, y: layer.image.y }, { x: layer.image.x + layer.image.width, y: layer.image.y + layer.image.height }] : []),
    ...((layer.shape?.paths ?? []).flatMap((path) => {
      const values = path.d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
      return Array.from({ length: Math.floor(values.length / 2) }, (_, index) => ({ x: values[index * 2], y: values[index * 2 + 1] }));
    })),
  ];
  if (!points.length) return null;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  // Keep true workspace coordinates. Clamping these to the artboard would make
  // a layer that is completely outside look like a tiny edge intersection and
  // would incorrectly leak it into the mockup. The box also hugs the layer wherever
  // it is, including past the print area, so the outline stays on the artwork.
  // `editorTextCanvasBounds` already stops exactly on the glyph ink, so a layer made
  // only of text gets no extra halo; strokes, shapes and images need a grab margin.
  const textOnly = textBounds !== null && layer.strokes.length === 0 && layer.image === null && (layer.shape?.paths?.length ?? 0) === 0;
  const halo = textOnly ? 0 : 18;
  const minX = Math.min(...xs) - halo;
  const minY = Math.min(...ys) - halo;
  const maxX = Math.max(...xs) + halo;
  const maxY = Math.max(...ys) + halo;
  return { x: minX, y: minY, width: Math.max(24, maxX - minX), height: Math.max(24, maxY - minY) };
}

function layerIntersectsPrintArtboard(
  layer: EditorArtworkLayer,
  scales: Record<string, Point>,
  offsets: Record<string, Point>,
  origins: Record<string, Point>,
  rotations: Record<string, number>,
) {
  const bounds = layerCanvasBounds(layer);
  if (!bounds) return false;
  const scale = scales[layer.id] ?? { x: 1, y: 1 };
  const offset = offsets[layer.id] ?? { x: 0, y: 0 };
  const pivot = origins[layer.id] ?? { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  const rotation = rotations[layer.id] ?? 0;
  const corners = [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    { x: bounds.x, y: bounds.y + bounds.height },
  ].map((point) => {
    const scaled = {
      x: pivot.x + (point.x - pivot.x) * scale.x + offset.x,
      y: pivot.y + (point.y - pivot.y) * scale.y + offset.y,
    };
    return rotateTransformPoint(scaled, { x: pivot.x + offset.x, y: pivot.y + offset.y }, rotation);
  });
  const minX = Math.min(...corners.map((point) => point.x));
  const maxX = Math.max(...corners.map((point) => point.x));
  const minY = Math.min(...corners.map((point) => point.y));
  const maxY = Math.max(...corners.map((point) => point.y));
  return maxX > 0 && minX < 1000 && maxY > 0 && minY < 1200;
}

function unionCanvasBounds(bounds: CanvasBounds[]): CanvasBounds | null {
  if (!bounds.length) return null;
  const minX = Math.min(...bounds.map((bound) => bound.x));
  const minY = Math.min(...bounds.map((bound) => bound.y));
  const maxX = Math.max(...bounds.map((bound) => bound.x + bound.width));
  const maxY = Math.max(...bounds.map((bound) => bound.y + bound.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function ArtworkOverlay({
  layers,
  selectedMaskLayerId,
  maskBrushMode,
  transform,
  layerOffsets,
  moveEnabled,
  editingTextLayer,
  selectedLayerIds,
  selectionBounds,
  drawingStroke = false,
  transformControlsHidden = false,
  layerScales,
  layerOrigins,
  onMovePick,
  onMoveBoxPress,
  onMove,
  onMoveEnd,
  onEditingTextChange,
  onEditingTextCommit,
  onEditingTextStyle,
  onResizeStart,
  onResize,
  onResizeEnd,
  layerRotations,
  hoveredBounds,
  hoveredRotation = 0,
  onHoverMove,
  onHoverEnd,
  onRotateStart,
  onRotate,
  onRotateEnd,
}: {
  layers: EditorArtworkLayer[];
  selectedMaskLayerId: string | null;
  maskBrushMode: MaskBrushMode;
  transform: Point;
  layerOffsets: Record<string, Point>;
  moveEnabled: boolean;
  editingTextLayer?: EditorArtworkLayer | null;
  selectedLayerIds: string[];
  selectionBounds: CanvasBounds | null;
  /** Hide the Free Transform box while a freehand stroke is being drawn. */
  drawingStroke?: boolean;
  /** Hide the Free Transform box entirely (e.g. while the inline text editor is open). */
  transformControlsHidden?: boolean;
  layerScales: Record<string, Point>;
  layerOrigins: Record<string, Point>;
  /** Press on the artwork: select the layer under the pointer, then drag it. */
  onMovePick: (event: React.PointerEvent<SVGRectElement>) => void;
  /** Press inside the transform box: select a different layer there, else drag the selection. */
  onMoveBoxPress: (event: React.PointerEvent<SVGRectElement>) => void;
  onMove: (event: React.PointerEvent<SVGSVGElement>) => void;
  onMoveEnd: (event: React.PointerEvent<SVGSVGElement>) => void;
  onEditingTextChange?: (value: string) => void;
  onEditingTextCommit?: () => void;
  onEditingTextStyle?: (update: Partial<Pick<EditorTextContent, "fontSize" | "color" | "fontFamily" | "fontWeight" | "fontStyle" | "textAlign" | "underline" | "letterSpacing" | "lineHeight" | "textTransform" | "textEffect" | "effectColor" | "effectOffset" | "effectBlur" | "outlineWidth" | "textDecoration" | "decorationColor" | "decorationWidth">>) => void;
  onResizeStart: (event: React.PointerEvent<SVGCircleElement>) => void;
  onResize: (event: React.PointerEvent<SVGSVGElement>) => void;
  onResizeEnd: (event: React.PointerEvent<SVGSVGElement>) => void;
  layerRotations: Record<string, number>;
  /** Box of the layer under the pointer, drawn dashed so hover never looks like a selection. */
  hoveredBounds?: CanvasBounds | null;
  hoveredRotation?: number;
  onHoverMove?: (clientX: number, clientY: number) => void;
  onHoverEnd?: () => void;
  onRotateStart: (event: React.PointerEvent<SVGCircleElement>) => void;
  onRotate: (event: React.PointerEvent<SVGSVGElement>) => void;
  onRotateEnd: (event: React.PointerEvent<SVGSVGElement>) => void;
}) {
  const editingText = editingTextLayer?.text ?? null;
  const [hoveredHandle, setHoveredHandle] = useState<string | null>(null);
  // Re-entering an existing text layer puts the caret at the end, so typing continues
  // after the last glyph (and Enter adds a line below) instead of overwriting the start.
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const editingTextLayerIdForCaret = editingTextLayer?.id ?? null;
  useEffect(() => {
    if (!editingTextLayerIdForCaret) return;
    const element = textAreaRef.current;
    if (!element) return;
    const end = element.value.length;
    element.setSelectionRange(end, end);
  }, [editingTextLayerIdForCaret]);

  // Free-transform handles keep a constant on-screen size even though
  // the artwork SVG is drawn in a 1000x1200 unit space that is scaled to fit its container.
  const svgRef = useRef<SVGSVGElement>(null);
  const [unitScale, setUnitScale] = useState(1);
  useEffect(() => {
    const element = svgRef.current;
    if (!element) return;
    const updateScale = () => {
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      setUnitScale(Math.min(rect.width / 1000, rect.height / 1200) || 1);
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  // Handle hit areas keep a constant screen size, but they must never swallow the middle of
  // a small selection: a one-line text box is ~24px tall, so a 15px radius on the top and
  // bottom edge handles covered the whole box and dragging the text resized it instead of
  // moving it. Cap the radius against the shorter side so a draggable interior always exists.
  const shortestSide = Math.min(selectionBounds?.width ?? 0, selectionBounds?.height ?? 0) * unitScale;
  const handleHitRadiusPx = Math.min(15, Math.max(5, shortestSide * 0.3));
  const handleHitRadius = handleHitRadiusPx / unitScale;
  const handleBoxScale = 10 / unitScale / 12;
  const rotateHitRadiusPx = 17;
  const rotateHitRadius = rotateHitRadiusPx / unitScale;
  const rotateBoxScale = 11 / unitScale / 20;
  // The rotate handle hangs below the box. On a one-line text box the fixed 58-unit drop
  // left its 17px hit circle overlapping the bottom-centre resize handle, so that resize
  // handle could not be grabbed. Keep a 10px screen gap between the two circles.
  const rotateOffset = Math.max(58, (handleHitRadiusPx + rotateHitRadiusPx + 10) / unitScale);
  const editingTextLayerId = editingTextLayer?.text ? editingTextLayer.id : null;
  // The artwork layers apply their own move/scale/rotate transform, so anything drawn beside
  // them (the inline text editor) has to apply the identical transform to line up.
  const editingTextLayerTransform = editingTextLayerId && editingTextLayer
    ? (() => {
        const offset = layerOffsets[editingTextLayerId] ?? { x: 0, y: 0 };
        const scale = layerScales[editingTextLayerId] ?? { x: 1, y: 1 };
        const pivot = layerOrigins[editingTextLayerId] ?? { x: 500, y: 600 };
        const rotation = layerRotations[editingTextLayerId] ?? 0;
        return `translate(${offset.x} ${offset.y}) translate(${pivot.x} ${pivot.y}) rotate(${rotation}) scale(${scale.x} ${scale.y}) translate(${-pivot.x} ${-pivot.y})`;
      })()
    : undefined;
  const transformRotation = selectedLayerIds.length === 1 ? layerRotations[selectedLayerIds[0]] ?? 0 : 0;
  const displayRotation = Math.round(((transformRotation % 360) + 360) % 360);
  const resizeHandles = [
    { key: "top-left", x: selectionBounds?.x ?? 0, y: selectionBounds?.y ?? 0, cursor: "cursor-nwse-resize", angle: 45 },
    { key: "top-center", x: (selectionBounds?.x ?? 0) + (selectionBounds?.width ?? 0) / 2, y: selectionBounds?.y ?? 0, cursor: "cursor-ns-resize", angle: 90 },
    { key: "top-right", x: (selectionBounds?.x ?? 0) + (selectionBounds?.width ?? 0), y: selectionBounds?.y ?? 0, cursor: "cursor-nesw-resize", angle: -45 },
    { key: "middle-left", x: selectionBounds?.x ?? 0, y: (selectionBounds?.y ?? 0) + (selectionBounds?.height ?? 0) / 2, cursor: "cursor-ew-resize", angle: 0 },
    { key: "middle-right", x: (selectionBounds?.x ?? 0) + (selectionBounds?.width ?? 0), y: (selectionBounds?.y ?? 0) + (selectionBounds?.height ?? 0) / 2, cursor: "cursor-ew-resize", angle: 0 },
    { key: "bottom-left", x: selectionBounds?.x ?? 0, y: (selectionBounds?.y ?? 0) + (selectionBounds?.height ?? 0), cursor: "cursor-nesw-resize", angle: -45 },
    { key: "bottom-center", x: (selectionBounds?.x ?? 0) + (selectionBounds?.width ?? 0) / 2, y: (selectionBounds?.y ?? 0) + (selectionBounds?.height ?? 0), cursor: "cursor-ns-resize", angle: 90 },
    { key: "bottom-right", x: (selectionBounds?.x ?? 0) + (selectionBounds?.width ?? 0), y: (selectionBounds?.y ?? 0) + (selectionBounds?.height ?? 0), cursor: "cursor-nwse-resize", angle: 45 },
  ];
  return (
    <svg ref={svgRef} viewBox="0 0 1000 1200" preserveAspectRatio="xMidYMid meet" onPointerMove={(event) => { onMove(event); onResize(event); onRotate(event); }} onPointerUp={(event) => { onMoveEnd(event); onResizeEnd(event); onRotateEnd(event); }} onPointerCancel={(event) => { onMoveEnd(event); onResizeEnd(event); onRotateEnd(event); }} onLostPointerCapture={(event) => { onMoveEnd(event); onResizeEnd(event); onRotateEnd(event); }} className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible">
      <g transform={`translate(${500 + transform.x} ${600 + transform.y}) translate(-500 -600)`}>
        <EditorArtworkLayers
          layers={layers}
          layerOffsets={layerOffsets}
          selectedMaskLayerId={selectedMaskLayerId}
          maskBrushMode={maskBrushMode}
          hiddenTextLayerId={editingTextLayerId}
          layerScales={layerScales}
          layerOrigins={layerOrigins}
          layerRotations={layerRotations}
        />
        {editingText && (() => {
          // Typing goes straight onto the print canvas. The textarea's line box is aligned
          // with the drawn SVG text so the caret sits exactly where the glyphs land, and its
          // height grows with every line so the caret never scrolls out of view.
          //
          // The count must be the *wrapped* line count, not the number of `\n`s: a long line
          // soft-wraps inside the textarea, and sizing the box from the newline count left the
          // wrapped lines clipped below its edge, which looked like typing had stopped.
          const paintedLines = editorTextLines(editingText);
          const lines = paintedLines.length;
          const lineHeight = editingText.fontSize * (editingText.lineHeight ?? 1.2);
          // The textarea must wrap at the same width the artwork does, or the editor breaks
          // lines in different places from the glyphs and the caret drifts off the ink.
          const editorBoxWidth = editingText.wrapWidth ?? TEXT_EDIT_BOX_WIDTH;
          const { ascent, descent } = editorTextMetrics(editingText);
          const halfLeading = (lineHeight - (ascent + descent)) / 2;
          const editorTop = editingText.y - ascent - halfLeading;
          // Matches the toolbar's `h-10` (40px) so the textarea's first baseline lands
          // exactly on the drawn text's baseline.
          const TOOLBAR_HEIGHT = 40;
          // The editor is a sibling of the artwork layers, so it must carry the layer's own
          // move/scale/rotate transform. Without it, re-opening a text layer that had been
          // moved or resized put the caret box back at the untransformed anchor, far from the
          // glyphs it was editing.
          return (
            <g transform={editingTextLayerTransform}>
              <foreignObject
                x={editingText.x - editorBoxWidth / 2}
                y={editorTop - TOOLBAR_HEIGHT}
                width={editorBoxWidth}
                height={TOOLBAR_HEIGHT + lines * lineHeight + 12}
                pointerEvents="auto"
                data-editor-text-editor="true"
              >
                <div className="flex h-full flex-col items-center">
                  <div className="flex h-10 items-center gap-2 rounded-md bg-white/95 px-2 shadow-md">
                    <label className="text-[11px] text-[#202124]">Font size
                      <input type="number" min="24" max="260" value={editingText.fontSize} aria-label="Text font size" onChange={(event) => onEditingTextStyle?.({ fontSize: Number(event.target.value) })} onPointerDown={(event) => event.stopPropagation()} className="ml-1 w-14 rounded border border-[#b8b8b8] px-1 py-1 text-[11px]" />
                    </label>
                    <label className="flex items-center gap-1 text-[11px] text-[#202124]">Color
                      <input type="color" value={editingText.color} aria-label="Text color" onChange={(event) => onEditingTextStyle?.({ color: event.target.value })} onPointerDown={(event) => event.stopPropagation()} className="h-6 w-7" />
                    </label>
                  </div>
                  <textarea
                    ref={textAreaRef}
                    autoFocus
                    value={editingText.value}
                    aria-label="Type text on the canvas"
                    placeholder="Type your text"
                    onChange={(event) => onEditingTextChange?.(event.target.value)}
                    onBlur={(event) => {
                      // Tapping the inline Font size / Color controls moves focus inside this
                      // editor, so keep it open; only a focus move outside commits.
                      const next = event.relatedTarget;
                      if (next instanceof Node && event.currentTarget.closest("[data-editor-text-editor]")?.contains(next)) return;
                      onEditingTextCommit?.();
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") event.currentTarget.blur();
                    }}
                    onPointerDown={(event) => event.stopPropagation()}
                    className="w-full resize-none border-0 bg-transparent p-0 outline-none placeholder:text-[#9aa0a6]"
                    style={{
                      height: `${lines * lineHeight + 4}px`,
                      lineHeight: `${lineHeight}px`,
                      fontSize: `${editingText.fontSize}px`,
                      color: editingText.color,
                      caretColor: editingText.color,
                      fontFamily: editingText.fontFamily ?? EDITOR_TEXT_FONT_FAMILY,
                      fontWeight: editingText.fontWeight ?? 700,
                      fontStyle: editingText.fontStyle ?? "normal",
                      textAlign: editingText.textAlign ?? "center",
                      textDecoration: editingText.underline ? "underline" : "none",
                      letterSpacing: `${editingText.letterSpacing ?? 0}px`,
                      outline: "2px dashed rgba(76, 157, 22, 0.7)",
                      outlineOffset: "6px",
                    }}
                  />
                </div>
              </foreignObject>
            </g>
          );
        })()}
      </g>
      {moveEnabled && <rect x="0" y="0" width="1000" height="1200" fill="transparent" onPointerDown={onMovePick} onPointerMove={(event) => onHoverMove?.(event.clientX, event.clientY)} onPointerLeave={() => onHoverEnd?.()} className="pointer-events-auto cursor-move touch-none" aria-label="Move canvas artwork" />}
      {hoveredBounds && (
        <g pointerEvents="none" data-editor-hover-outline="true" transform={`rotate(${hoveredRotation} ${hoveredBounds.x + hoveredBounds.width / 2} ${hoveredBounds.y + hoveredBounds.height / 2})`}>
          <rect x={hoveredBounds.x} y={hoveredBounds.y} width={hoveredBounds.width} height={hoveredBounds.height} fill="none" stroke="#9cc7ff" strokeWidth={1.25} strokeDasharray="7 5" vectorEffect="non-scaling-stroke" />
        </g>
      )}
      {selectedLayerIds.length > 0 && selectionBounds && !editingText && !drawingStroke && !transformControlsHidden && (
        <g pointerEvents="none" data-editor-transform-controls="true" transform={`rotate(${transformRotation} ${selectionBounds.x + selectionBounds.width / 2} ${selectionBounds.y + selectionBounds.height / 2})`}>
          <rect x={selectionBounds.x} y={selectionBounds.y} width={selectionBounds.width} height={selectionBounds.height} fill="none" stroke="#4c9dff" strokeWidth="1.25" vectorEffect="non-scaling-stroke" data-transform-outline="true" />
          {moveEnabled && <rect x={selectionBounds.x} y={selectionBounds.y} width={selectionBounds.width} height={selectionBounds.height} fill="transparent" pointerEvents="auto" className="cursor-move touch-none" onPointerDown={onMoveBoxPress} aria-label="Move selected layer" />}
          {resizeHandles.map((handle) => (
            <g
              key={handle.key}
              data-resize-handle={handle.key}
              className={handle.cursor}
              onPointerEnter={() => setHoveredHandle(handle.key)}
              onPointerLeave={() => setHoveredHandle((current) => (current === handle.key ? null : current))}
            >
              <circle cx={handle.x} cy={handle.y} r={handleHitRadius} fill="transparent" pointerEvents={moveEnabled ? "auto" : "none"} onPointerDown={onResizeStart} aria-label={`Resize selected layer ${handle.key}`} aria-description="Drag to resize. Hold Shift to stretch freely; hold Alt or Option to scale from the center." />
              <g transform={`translate(${handle.x} ${handle.y}) rotate(${handle.angle}) scale(${handleBoxScale})`} pointerEvents="none">
                <rect x="-6" y="-6" width="12" height="12" rx="2.5" fill="#ffffff" stroke="#4c9dff" strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
                {hoveredHandle === handle.key && (
                  <path d={resizeHandleGlyphPath(handle.angle)} fill="none" stroke="#202124" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" data-resize-glyph="true" />
                )}
              </g>
            </g>
          ))}
          <circle cx={selectionBounds.x + selectionBounds.width / 2} cy={selectionBounds.y + selectionBounds.height + rotateOffset} r={rotateHitRadius} fill="transparent" pointerEvents={moveEnabled ? "auto" : "none"} onPointerDown={onRotateStart} className="cursor-grab" aria-label="Rotate selected layer" aria-description="Drag to rotate. Hold Shift to snap to 15-degree increments." />
          <g transform={`translate(${selectionBounds.x + selectionBounds.width / 2} ${selectionBounds.y + selectionBounds.height + rotateOffset}) scale(${rotateBoxScale})`} pointerEvents="none" data-rotate-handle="true">
            <circle r="10" fill="#ffffff" stroke="#4c9dff" strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
            <path d="M2-5a5 5 0 1 0 3 7M2-5v3m0-3h3" fill="none" stroke="#202124" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" data-rotate-glyph="true" />
          </g>
          <g transform={`translate(${selectionBounds.x + selectionBounds.width / 2 - 22} ${selectionBounds.y + selectionBounds.height + rotateOffset + 20})`} data-rotation-angle="true">
            <rect width="44" height="18" rx="9" fill="#ffffff" fillOpacity="0.94" stroke="#4c9dff" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <text x="22" y="12" textAnchor="middle" fontSize="10" fontFamily="ui-sans-serif, system-ui" fill="#202124">{displayRotation}°</text>
          </g>
        </g>
      )}
    </svg>
  );
}

export default function EditorCanvas({ product }: { product: EditorProduct }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [touchPanEnabled, setTouchPanEnabled] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [adjustmentsOpen, setAdjustmentsOpen] = useState(false);
  const [editSidebarOpen, setEditSidebarOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<EditorTool>("pen");
  const [toolsCollapsed, setToolsCollapsed] = useState(false);
  const [toolOptions, setToolOptions] = useState<EditorToolOptions>(() => normalizeEditorToolOptions(EDITOR_TOOL_OPTIONS_DEFAULT));
  // True while a freehand stroke is being drawn, so the Free Transform box hides itself
  // the moment the pointer goes down and stays hidden until the stroke ends.
  const [isDrawingStroke, setIsDrawingStroke] = useState(false);
  const [toolNotice, setToolNotice] = useState("");
  const [selectedShape, setSelectedShape] = useState<EditorShapePreset>("rectangle");
  const [shapeDrawing, setShapeDrawing] = useState<ActiveShapeDrag | null>(null);
  const [gradientDrawing, setGradientDrawing] = useState<ActiveGradientDrag | null>(null);
  const [foregroundColor, setForegroundColor] = useState("#202124");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [penAnchors, setPenAnchors] = useState<EditorPenAnchor[]>([]);
  const [penHoverPoint, setPenHoverPoint] = useState<Point | null>(null);
  const [penHoverCloseTarget, setPenHoverCloseTarget] = useState(false);
  const [editingPenPathLayerId, setEditingPenPathLayerId] = useState<string | null>(null);
  const [selectedPenAnchorIndex, setSelectedPenAnchorIndex] = useState<number | null>(null);
  const [editingPenPathIndex, setEditingPenPathIndex] = useState<number | null>(null);
  const [undoStack, setUndoStack] = useState<EditorArtworkLayer[][]>([]);
  const [redoStack, setRedoStack] = useState<EditorArtworkLayer[][]>([]);
  const [canvasLayerTransforms, setCanvasLayerTransforms] = useState<Record<string, Point>>({});
  const [canvasLayerScales, setCanvasLayerScales] = useState<Record<string, Point>>({});
  const [canvasLayerRotations, setCanvasLayerRotations] = useState<Record<string, number>>({});
  // A layer under the pointer, or a row under the pointer in the Layers box. Hover only
  // draws an outline; it never changes the selection.
  const [hoveredLayerId, setHoveredLayerId] = useState<string | null>(null);
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>(["layer-1"]);
  const [mockups, setMockups] = useState<MockupSide[]>([]);
  const [layers, setLayers] = useState<EditorArtworkLayer[]>(() => [createEditorArtworkLayer("layer-1", "Layer 1")]);

  // The product page previews whatever design is open here, so the draft is kept in the
  // browser. Debounced because a brush stroke rewrites the layers on every pointer move.
  useEffect(() => {
    const timer = window.setTimeout(() => saveDesignDraft(layers), 400);
    return () => window.clearTimeout(timer);
  }, [layers]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>("layer-1");
  const [selectedTarget, setSelectedTarget] = useState<LayerEditTarget>("artwork");
  const [maskBrushMode, setMaskBrushMode] = useState<MaskBrushMode>("hide");
  const [nextGroupId, setNextGroupId] = useState(1);
  const [nextLinkId, setNextLinkId] = useState(1);
  const nextLayerIdRef = useRef(2);
  const nextTextLayerLabelRef = useRef(1);
  const nextGradientLayerLabelRef = useRef(1);
  // Set while a text layer is being typed directly on the print canvas.
  const [editingTextLayerId, setEditingTextLayerId] = useState<string | null>(null);
  const editingTextLayer = useMemo(
    () => layers.find((layer) => layer.id === editingTextLayerId) ?? null,
    [editingTextLayerId, layers],
  );
  const canvasUploadLayers = useMemo(
    () => layers.filter((layer) => layer.kind === "image"),
    [layers],
  );
  /**
   * How sharp each photo will print, from its own pixels and the box it now covers. Recomputed
   * on every scale change so a resize can say what it did to the print.
   */
  const imagePrintQualityById = useMemo(() => Object.fromEntries(
    layers
      .filter((layer) => layer.kind === "image" && layer.image)
      .map((layer) => [layer.id, imagePrintQuality(layer.image, canvasLayerScales[layer.id] ?? { x: 1, y: 1 })]),
  ) as Record<string, ImagePrintQuality | null>,
  [layers, canvasLayerScales]);
  const visibleMockups = useMemo(
    () => product === "Phone" ? mockups.filter((side) => side === "Front Mockup") : mockups,
    [mockups, product],
  );
  const canvasLayerOrigins = useMemo(() => Object.fromEntries(layers.flatMap((layer) => {
    const bounds = layerCanvasBounds(layer);
    return bounds ? [[layer.id, { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }]] : [];
  })), [layers]);
  // Arrange controls in the Adjustments panel: align to the artboard, flip, rotate, reset,
  // duplicate. Aligning adjusts the layer's canvas offset, so the artwork itself never moves
  // inside its own transform.
  /**
   * Mirror the selection about its own centre. Flipping is a sign change on the scale plus a
   * reflected offset, so the renderer, the transform box, hit-testing and the mockup all follow
   * without a separate flip flag to keep in sync.
   */
  const flipSelectedLayers = (axis: "horizontal" | "vertical") => {
    const ids = resolveLinkedLayerIds(selectedLayerIds).filter((id) => !layers.find((layer) => layer.id === id)?.locked);
    if (!ids.length) return;
    const bounds = boundsForLayerIds(ids);
    if (!bounds) return;
    const centre = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
    const placements = ids.map((id) => [id, flipLayerPlacement({
      offset: canvasLayerTransforms[id] ?? { x: 0, y: 0 },
      scale: canvasLayerScales[id] ?? { x: 1, y: 1 },
      pivot: canvasLayerOrigins[id] ?? centre,
      rotation: canvasLayerRotations[id] ?? 0,
    }, axis, centre)] as const);
    setCanvasLayerTransforms((current) => ({ ...current, ...Object.fromEntries(placements.map(([id, next]) => [id, next.offset])) }));
    setCanvasLayerScales((current) => ({ ...current, ...Object.fromEntries(placements.map(([id, next]) => [id, next.scale])) }));
    setCanvasLayerRotations((current) => ({ ...current, ...Object.fromEntries(placements.map(([id, next]) => [id, next.rotation])) }));
    setToolNotice(axis === "horizontal" ? "Flipped horizontally" : "Flipped vertically");
  };

  // Arrow-pad nudges from the Adjustments panel: offset only, so the artwork
  // never moves inside its own transform.
  const nudgeSelectedLayer = (dx: number, dy: number) => {
    const layer = selectedLayer;
    if (!layer || layer.locked) return;
    const current = canvasLayerTransforms[layer.id] ?? { x: 0, y: 0 };
    setCanvasLayerTransforms((all) => ({ ...all, [layer.id]: { x: current.x + dx, y: current.y + dy } }));
  };

  // The workspace can show layers outside the print artboard, but mockups only
  // receive layers that still intersect the artboard. This keeps off-artboard
  // workspace items editable without letting them leak into product previews.
  const mockupLayers = useMemo(
    () => layers.filter((layer) => layerIntersectsPrintArtboard(layer, canvasLayerScales, canvasLayerTransforms, canvasLayerOrigins, canvasLayerRotations)),
    [canvasLayerOrigins, canvasLayerRotations, canvasLayerScales, canvasLayerTransforms, layers],
  );
  // Measures any set of layers in artwork space, including the move/scale/rotate applied to
  // each one. Used for the transform box and for hit-testing a click on the artwork.
  const boundsForLayerIds = useCallback((ids: string[]): CanvasBounds | null => {
    const bounds = ids.flatMap((id) => {
      const layer = layers.find((item) => item.id === id);
      const base = layer ? layerCanvasBounds(layer) : null;
      if (!base) return [];
      const scale = canvasLayerScales[id] ?? { x: 1, y: 1 };
      const offset = canvasLayerTransforms[id] ?? { x: 0, y: 0 };
      const pivot = canvasLayerOrigins[id] ?? { x: 500, y: 600 };
      const rotation = canvasLayerRotations[id] ?? 0;
      const points = [
        { x: base.x, y: base.y },
        { x: base.x + base.width, y: base.y },
        { x: base.x + base.width, y: base.y + base.height },
        { x: base.x, y: base.y + base.height },
      ].map((point) => {
        const scaled = { x: pivot.x + (point.x - pivot.x) * scale.x + offset.x, y: pivot.y + (point.y - pivot.y) * scale.y + offset.y };
        return ids.length === 1 ? scaled : rotateTransformPoint(scaled, { x: pivot.x + offset.x, y: pivot.y + offset.y }, rotation);
      });
      const xs = points.map((point) => point.x);
      const ys = points.map((point) => point.y);
      return [{
        x: Math.min(...xs),
        y: Math.min(...ys),
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
      }];
    });
    return unionCanvasBounds(bounds);
  }, [canvasLayerRotations, canvasLayerScales, canvasLayerTransforms, canvasLayerOrigins, layers]);
  const selectionBounds = useMemo(() => boundsForLayerIds(selectedLayerIds), [boundsForLayerIds, selectedLayerIds]);
  // Hovering something already selected adds nothing, so the dashed box only appears for a layer
  // the user is not editing.
  const hoveredBounds = useMemo(() => (
    hoveredLayerId && !selectedLayerIds.includes(hoveredLayerId) ? boundsForLayerIds([hoveredLayerId]) : null
  ), [boundsForLayerIds, hoveredLayerId, selectedLayerIds]);
  const hoveredRotation = hoveredLayerId ? canvasLayerRotations[hoveredLayerId] ?? 0 : 0;
  const [pasteboardRect, setPasteboardRect] = useState<PasteboardRect | null>(null);
  // A layer may be parked far outside the print area, so the Move tool's pick surface has to
  // cover every visible layer, not a fixed margin around the canvas. Sized in percentages of
  // the print area, which is the same box the artwork coordinate space maps onto.
  const artworkPickSurface = useMemo(() => {
    const all = boundsForLayerIds(layers.filter((layer) => layer.visible).map((layer) => layer.id));
    const pad = 24;
    const left = all ? ((all.x - pad) / 1000) * 100 : 0;
    const top = all ? ((all.y - pad) / 1200) * 100 : 0;
    const right = all ? ((all.x + all.width + pad) / 1000) * 100 : 100;
    const bottom = all ? ((all.y + all.height + pad) / 1200) * 100 : 100;
    const minLeft = Math.min(0, left);
    const minTop = Math.min(0, top);
    return {
      left: `${minLeft}%`,
      top: `${minTop}%`,
      width: `${Math.max(100, right) - minLeft}%`,
      height: `${Math.max(100, bottom) - minTop}%`,
    };
  }, [boundsForLayerIds, layers]);
  // The surface a press lands on: Move picks among the layers, the paint tools use the measured
  // pasteboard. Before the first measurement the canvas box itself stands in.
  const pasteboardSurface = activeTool === "move"
    ? artworkPickSurface
    : pasteboardRect
      ? { left: `${pasteboardRect.left}%`, top: `${pasteboardRect.top}%`, width: `${pasteboardRect.width}%`, height: `${pasteboardRect.height}%` }
      : { left: 0, top: 0, width: "100%", height: "100%" };
  function toggleLayersPanel() {
    if (!layersOpen && window.matchMedia("(max-width: 767px)").matches) setEditSidebarOpen(false);
    setLayersOpen((open) => !open);
  }
  function openAdjustments() {
    setLayersOpen(false);
    setAdjustmentsOpen(true);
  }
  function closeAdjustments() {
    setAdjustmentsOpen(false);
    setLayersOpen(true);
  }
  function toggleEditSidebar() {
    if (!editSidebarOpen && window.matchMedia("(max-width: 767px)").matches) setLayersOpen(false);
    setEditSidebarOpen((open) => !open);
  }
  const [largeArtworkTierOwner, setLargeArtworkTierOwner] = useState<MockupSide | null>(null);
  const activeLargeArtworkTierOwner =
    product === "Phone" && largeArtworkTierOwner === "Back Mockup" ? null : largeArtworkTierOwner;
  const [nodePositions, setNodePositions] = useState<Record<WorkspaceNode, Point>>({
    "Print canvas": { x: 0, y: 0 },
    "Front Mockup": { x: 0, y: 0 },
    "Back Mockup": { x: 0, y: 0 },
  });
  const [draggingNode, setDraggingNode] = useState<WorkspaceNode | null>(null);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const viewportRef = useRef<HTMLDivElement>(null);

  // The inline text editor grows downward with every new line. Once it passes the viewport
  // edge the caret is invisible, and the desktop viewport does not scroll
  // (`md:overflow-hidden`), so typing looked like it had stopped working. Pan the workspace
  // just enough to keep the caret on screen.
  //
  // The textarea itself becomes taller than the viewport after a dozen lines, so its own box
  // cannot stand in for the caret: following the box made the pan bounce between "line is
  // below" and "box top is above". Track the caret's line instead, which stays a single
  // line-height tall no matter how much text there is.
  const editingTextValueForCaret = editingTextLayer?.text?.value;
  const caretPanFrameRef = useRef<number | null>(null);
  const keepTextCaretVisible = useCallback(() => {
    // A single keystroke can reach this from both the value effect and the caret listeners.
    // Two shifts in one frame would each measure the pre-shift layout, so the second would
    // pan again by the same amount and push the caret a whole line past the margin.
    if (caretPanFrameRef.current !== null) cancelAnimationFrame(caretPanFrameRef.current);
    caretPanFrameRef.current = requestAnimationFrame(() => {
      caretPanFrameRef.current = null;
      const viewport = viewportRef.current;
      if (!viewport) return;
      const editor = viewport.querySelector<HTMLTextAreaElement>("[data-editor-text-editor=\"true\"] textarea");
      if (!editor) return;
      const rect = editor.getBoundingClientRect();
      // The editor sits in a `foreignObject` inside the artwork SVG, which is scaled to fit the
      // viewport (about 0.3x on a phone). `lineHeight` is in the editor's own CSS pixels while
      // `rect` is already on screen, so the line offsets must be scaled too or the pan
      // overshoots by the scale factor and throws the caret far off screen.
      const cssHeight = editor.offsetHeight || rect.height;
      const screenScale = cssHeight > 0 ? rect.height / cssHeight : 1;
      const lineHeight = (Number.parseFloat(window.getComputedStyle(editor).lineHeight) || cssHeight) * screenScale;
      const caretLine = editor.value.slice(0, editor.selectionStart).split("\n").length - 1;
      const caretTop = rect.top + caretLine * lineHeight;
      const bounds = viewport.getBoundingClientRect();
      const margin = 32;
      let shift = 0;
      if (caretTop + lineHeight > bounds.bottom - margin) shift = caretTop + lineHeight - (bounds.bottom - margin);
      else if (caretTop < bounds.top + margin) shift = caretTop - (bounds.top + margin);
      if (shift) setPan((current) => ({ ...current, y: current.y - shift }));
    });
  }, []);
  useEffect(() => {
    if (editingTextValueForCaret === undefined) return;
    keepTextCaretVisible();
    return () => {
      if (caretPanFrameRef.current !== null) cancelAnimationFrame(caretPanFrameRef.current);
      caretPanFrameRef.current = null;
    };
  }, [editingTextValueForCaret, keepTextCaretVisible]);
  // Moving the caret inside existing text (click, arrow keys) has to scroll it into view too.
  useEffect(() => {
    if (editingTextValueForCaret === undefined) return;
    const viewport = viewportRef.current;
    const editor = viewport?.querySelector<HTMLTextAreaElement>("[data-editor-text-editor=\"true\"] textarea");
    if (!editor) return;
    const handler = () => requestAnimationFrame(keepTextCaretVisible);
    editor.addEventListener("keyup", handler);
    editor.addEventListener("click", handler);
    editor.addEventListener("select", handler);
    return () => {
      editor.removeEventListener("keyup", handler);
      editor.removeEventListener("click", handler);
      editor.removeEventListener("select", handler);
    };
  }, [editingTextValueForCaret, keepTextCaretVisible]);

  const workspaceRef = useRef<HTMLDivElement>(null);
  const canvasNodeRef = useRef<HTMLCanvasElement>(null);
  const mockupSurfaceRefs = useRef<Partial<Record<MockupSide, HTMLDivElement>>>({});
  const menuRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef<PanStart | null>(null);
  const panGestureRef = useRef(false);
  const activeNodeDragRef = useRef<ActiveNodeDrag | null>(null);
  const activeArtworkStrokeRef = useRef<ActiveArtworkStroke | null>(null);
  const activeShapeDragRef = useRef<ActiveShapeDrag | null>(null);
  const activeGradientDragRef = useRef<ActiveGradientDrag | null>(null);
  const penAnchorDragRef = useRef<PenAnchorDrag | null>(null);
  const penEditDragRef = useRef<PenEditDrag | null>(null);
  const penEditWindowHandlersRef = useRef<{ move: (event: PointerEvent) => void; end: (event: PointerEvent) => void } | null>(null);
  const penKeyHandlerRef = useRef<(event: KeyboardEvent) => void>(() => {});
  const historyKeyHandlerRef = useRef<(event: KeyboardEvent) => void>(() => {});
  const finishPenPathRef = useRef<(close?: boolean) => void>(() => {});
  const activeEraserRef = useRef<{ pointerId: number; layerId: string; target: LayerEditTarget; points: Point[] } | null>(null);
  const [eraserCursor, setEraserCursor] = useState<Point | null>(null);
  const canvasArtworkDragRef = useRef<CanvasArtworkDrag | null>(null);
  const canvasLayerResizeRef = useRef<CanvasLayerResizeDrag | null>(null);
  const canvasLayerRotateRef = useRef<CanvasLayerRotateDrag | null>(null);

  // The pasteboard is the artwork space around the print area, and a drawing or text tool
  // stays live on it. It used to be a fixed 96px ring, so a stroke started further out fell
  // through to the viewport and nothing happened. Measure the visible area instead and let the
  // surface reach every point the user can see; the pointer mapping is already unclamped, so a
  // mark lands exactly where it was clicked, on or off the canvas.
  //
  // Percent of the canvas box keeps the surface aligned through zoom and pan without
  // re-deriving artwork units on every move.
  useEffect(() => {
    // The surface is only rendered for the tools that paint; leaving it measured while Move is
    // active is harmless because Move uses its own pick surface.
    if (!CANVAS_OUTSIDE_TOOLS.includes(activeTool)) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const canvasRect = canvasNodeRef.current?.getBoundingClientRect();
      const viewportRect = viewportRef.current?.getBoundingClientRect();
      if (!canvasRect || !canvasRect.width || !canvasRect.height || !viewportRect) return;
      const coarse = window.matchMedia?.("(pointer: coarse)").matches === true;
      const ring = PASTEBOARD_TOUCH_RING_PX * zoom;
      const left = coarse ? canvasRect.left - ring : viewportRect.left;
      const right = coarse ? canvasRect.right + ring : viewportRect.right;
      const top = coarse ? canvasRect.top - ring : viewportRect.top;
      const bottom = coarse ? canvasRect.bottom + ring : viewportRect.bottom;
      const percentX = (value: number) => ((value - canvasRect.left) / canvasRect.width) * 100;
      const percentY = (value: number) => ((value - canvasRect.top) / canvasRect.height) * 100;
      // Nothing can be parked past the layer travel limit, so stop growing with the window.
      const limitX = CANVAS_LAYER_TRAVEL_LIMIT / 10;
      const limitY = CANVAS_LAYER_TRAVEL_LIMIT / 12;
      const clamp = (value: number, limit: number) => Math.min(limit, Math.max(-limit, value));
      const leftPercent = clamp(percentX(left), limitX);
      const rightPercent = clamp(percentX(right), limitX);
      const topPercent = clamp(percentY(top), limitY);
      const bottomPercent = clamp(percentY(bottom), limitY);
      setPasteboardRect({
        left: leftPercent,
        top: topPercent,
        width: Math.max(1, rightPercent - leftPercent),
        height: Math.max(1, bottomPercent - topPercent),
      });
    };
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };
    schedule();
    window.addEventListener("resize", schedule);
    const viewport = viewportRef.current;
    viewport?.addEventListener("scroll", schedule, { passive: true });
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    if (viewport && observer) observer.observe(viewport);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      viewport?.removeEventListener("scroll", schedule);
      observer?.disconnect();
    };
  }, [activeTool, zoom, pan, nodePositions, menuOpen, visibleMockups]);
  const handleLargeTierRequested = useCallback((side: MockupSide) => {
    setLargeArtworkTierOwner((current) => claimLargeArtworkTier(current, side));
  }, []);
  const handleArtworkDisplayedEdgeChange = useCallback((side: MockupSide, longestEdgePx: number) => {
    setLargeArtworkTierOwner((current) => reconcileLargeArtworkTier(current, side, longestEdgePx));
  }, []);

  useEffect(() => {
    const narrowViewport = window.matchMedia("(max-width: 767px)");
    const closeSidebarsBeforeTheyOverlap = (event: MediaQueryListEvent) => {
      if (!event.matches) return;
      setLayersOpen(false);
      setEditSidebarOpen(false);
    };
    narrowViewport.addEventListener("change", closeSidebarsBeforeTheyOverlap);
    return () => narrowViewport.removeEventListener("change", closeSidebarsBeforeTheyOverlap);
  }, []);

  useEffect(() => () => {
    const handlers = penEditWindowHandlersRef.current;
    if (!handlers) return;
    window.removeEventListener("pointermove", handlers.move, true);
    window.removeEventListener("pointerup", handlers.end, true);
    window.removeEventListener("pointercancel", handlers.end, true);
    penEditWindowHandlersRef.current = null;
    penEditDragRef.current = null;
  }, []);

  // Keep the latest finish handler reachable from the key listener without
  // re-subscribing the window listener on every render.
  useEffect(() => {
    finishPenPathRef.current = finishPenPath;
  });

  // Enter (or Return) commits the open path, Escape discards it.
  useEffect(() => {
    penKeyHandlerRef.current = (event: KeyboardEvent) => {
      if (activeTool !== "pen" || penAnchors.length === 0) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName))) return;
      if (event.key === "Enter") {
        event.preventDefault();
        finishPenPathRef.current(false);
      } else if (event.key === "Escape") {
        event.preventDefault();
        penAnchorDragRef.current = null;
        setPenAnchors([]);
        setPenHoverPoint(null);
        setPenHoverCloseTarget(false);
      }
    };
  }, [activeTool, penAnchors]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => penKeyHandlerRef.current(event);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // The same undo/redo as the tool-bar buttons, reachable from the keyboard whatever panel or
  // tool is open. The handler is rebuilt every render so it always sees the current stacks.
  useEffect(() => {
    historyKeyHandlerRef.current = (event) => {
      const action = editorHistoryShortcut(event);
      if (!action) return;
      event.preventDefault();
      if (action === "undo") undoCanvasAction();
      else redoCanvasAction();
    };
  });
  useEffect(() => {
    const handler = (event: KeyboardEvent) => historyKeyHandlerRef.current(event);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Arrow keys nudge the selection, which is the one way to recover a layer parked under a
  // panel: a panel opened after the drag can cover it again, and a covered layer cannot be
  // clicked. Shift moves in 10-unit steps, otherwise 1.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (activeTool !== "move" || selectedLayerIds.length === 0) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      const step = event.shiftKey ? 10 : 1;
      const delta = {
        ArrowLeft: { x: -step, y: 0 },
        ArrowRight: { x: step, y: 0 },
        ArrowUp: { x: 0, y: -step },
        ArrowDown: { x: 0, y: step },
      }[event.key];
      if (!delta) return;
      const ids = resolveLinkedLayerIds(selectedLayerIds).filter((id) => !layers.find((layer) => layer.id === id)?.locked);
      if (ids.length === 0) return;
      event.preventDefault();
      setCanvasLayerTransforms((current) => ({ ...current, ...Object.fromEntries(ids.map((id) => {
        const origin = current[id] ?? { x: 0, y: 0 };
        return [id, { x: origin.x + delta.x, y: origin.y + delta.y }];
      })) }));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool, layers, selectedLayerIds]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleViewportWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        setZoom((current) => Math.max(0.25, Math.min(3, current - event.deltaY * 0.002)));
        return;
      }
      setPan((current) => ({
        x: current.x - event.deltaX,
        y: current.y - event.deltaY,
      }));
    };

    const isTypingTarget = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName));
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || isTypingTarget(event.target)) return;
      event.preventDefault();
      setSpaceHeld(true);
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") setSpaceHeld(false);
    };
    const handleWindowBlur = () => {
      setSpaceHeld(false);
      setIsPanning(false);
      setDraggingNode(null);
      panStartRef.current = null;
      panGestureRef.current = false;
      activeNodeDragRef.current = null;
      activeArtworkStrokeRef.current = null;
    };

    viewport.addEventListener("wheel", handleViewportWheel, { passive: false });
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);
    return () => {
      viewport.removeEventListener("wheel", handleViewportWheel);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  useEffect(() => {
    const workspace = workspaceRef.current;
    const canvas = canvasNodeRef.current;
    if (!workspace || !canvas) return;

    const updateConnectors = () => {
      const workspaceRect = workspace.getBoundingClientRect();
      const scale = Math.max(zoom, 0.01);
      const toWorkspaceRect = (element: Element) => {
        const rect = element.getBoundingClientRect();
        const left = (rect.left - workspaceRect.left) / scale;
        const top = (rect.top - workspaceRect.top) / scale;
        const width = rect.width / scale;
        const height = rect.height / scale;
        return {
          left,
          right: left + width,
          top,
          bottom: top + height,
          centerX: left + width / 2,
          centerY: top + height / 2,
        };
      };
      const canvasRect = toWorkspaceRect(canvas);
      const next: Connector[] = [];

      for (const side of visibleMockups) {
        const surface = mockupSurfaceRefs.current[side];
        if (!surface) continue;
        const mockupRect = toWorkspaceRect(surface);
        const deltaX = mockupRect.centerX - canvasRect.centerX;
        const deltaY = mockupRect.centerY - canvasRect.centerY;
        let start: Point;
        let end: Point;
        let control1: Point;
        let control2: Point;

        if (Math.abs(deltaX) >= Math.abs(deltaY)) {
          const direction = deltaX >= 0 ? 1 : -1;
          start = { x: direction > 0 ? canvasRect.right : canvasRect.left, y: canvasRect.centerY };
          end = { x: direction > 0 ? mockupRect.left : mockupRect.right, y: mockupRect.centerY };
          const curve = Math.max(24, Math.abs(end.x - start.x) * 0.45);
          control1 = { x: start.x + direction * curve, y: start.y };
          control2 = { x: end.x - direction * curve, y: end.y };
        } else {
          const direction = deltaY >= 0 ? 1 : -1;
          start = { x: canvasRect.centerX, y: direction > 0 ? canvasRect.bottom : canvasRect.top };
          end = { x: mockupRect.centerX, y: direction > 0 ? mockupRect.top : mockupRect.bottom };
          const curve = Math.max(24, Math.abs(end.y - start.y) * 0.45);
          control1 = { x: start.x, y: start.y + direction * curve };
          control2 = { x: end.x, y: end.y - direction * curve };
        }

        next.push({
          side,
          start,
          end,
          path: `M ${start.x} ${start.y} C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${end.x} ${end.y}`,
        });
      }

      setConnectors((current) =>
        current.length === next.length && current.every((connector, index) => connector.path === next[index]?.path)
          ? current
          : next,
      );
    };

    const initialFrame = window.requestAnimationFrame(updateConnectors);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateConnectors);
    [workspace, canvas, ...visibleMockups.map((side) => mockupSurfaceRefs.current[side]).filter(Boolean)].forEach((element) => {
      if (element) observer?.observe(element);
    });
    window.addEventListener("resize", updateConnectors);
    return () => {
      window.cancelAnimationFrame(initialFrame);
      observer?.disconnect();
      window.removeEventListener("resize", updateConnectors);
    };
  }, [visibleMockups, nodePositions, pan, zoom]);

  function startPan(event: React.PointerEvent<HTMLDivElement>) {
    if (panStartRef.current || (event.pointerType === "touch" && !event.isPrimary)) return;
    const middleButtonPan = event.button === 1;
    const handToolPan = activeTool === "hand" && event.button === 0;
    const touchPan = (touchPanEnabled || activeTool === "hand") && event.pointerType === "touch" && event.isPrimary;
    if (!middleButtonPan && !handToolPan && !touchPan && (!spaceHeld || event.button !== 0)) return;
    if (event.target instanceof Element && event.target.closest("button, input, textarea, select")) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    panStartRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    panGestureRef.current = true;
    setIsPanning(true);
  }

  function movePan(event: React.PointerEvent<HTMLDivElement>) {
    const start = panStartRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    setPan({
      x: start.panX + event.clientX - start.startX,
      y: start.panY + event.clientY - start.startY,
    });
  }

  function endPan(event: React.PointerEvent<HTMLDivElement>) {
    if (panStartRef.current?.pointerId !== event.pointerId) return;
    panStartRef.current = null;
    event.stopPropagation();
    setIsPanning(false);
    window.setTimeout(() => {
      panGestureRef.current = false;
    }, 0);
  }

  function isCanvasEdgeGesture(clientX: number, clientY: number) {
    const canvas = canvasNodeRef.current;
    if (!canvas) return false;
    const rect = canvas.getBoundingClientRect();
    const edge = 14 * zoom;
    return clientX - rect.left <= edge || rect.right - clientX <= edge || clientY - rect.top <= edge || rect.bottom - clientY <= edge;
  }

  // Artwork space is anchored on the print canvas but is not limited to it: every tool may
  // paint on the pasteboard around the canvas, so the mapping never clamps. Values outside
  // 0..1 simply sit outside the print area.
  function toCanvasPoint(clientX: number, clientY: number): Point {
    const rect = canvasNodeRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    };
  }

  // Move/resize/rotate map the pointer without clamping to the print area, so a layer can be
  // dragged past the canvas edge (and back) instead of stalling at the border.
  function toCanvasPointUnclamped(clientX: number, clientY: number): Point {
    const rect = canvasNodeRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    };
  }

  // Panels dock over the viewport (z-30) and the tools bar floats above it (z-50), and both
  // swallow pointer events, so a layer dragged under either becomes impossible to grab again.
  // Bound the move to the unobstructed strip instead: off-canvas is allowed, hidden is not.
  function canvasDragClamp(bounds: CanvasBounds | null): CanvasDeltaClamp | null {
    if (!bounds) return null;
    const canvasRect = canvasNodeRef.current?.getBoundingClientRect();
    const viewportRect = viewportRef.current?.getBoundingClientRect();
    if (!canvasRect || !viewportRect) return null;
    let left = viewportRect.left;
    let right = viewportRect.right;
    let bottom = viewportRect.bottom;
    document.querySelectorAll<HTMLElement>("[data-dock-side]").forEach((panel) => {
      const panelRect = panel.getBoundingClientRect();
      if (!panelRect.width || !panelRect.height) return;
      if (panel.getAttribute("data-dock-side") === "left") left = Math.max(left, panelRect.right);
      else right = Math.min(right, panelRect.left);
    });
    const toolsBar = document.querySelector<HTMLElement>('[data-testid="editor-tools-positioner"]');
    if (toolsBar) {
      const toolsRect = toolsBar.getBoundingClientRect();
      if (toolsRect.height > 0) bottom = Math.min(bottom, toolsRect.top);
    }
    // A viewport narrower than its own panels leaves no free strip; fall back to all of it.
    if (left >= right) {
      left = viewportRect.left;
      right = viewportRect.right;
    }
    const toX = (clientX: number) => ((clientX - canvasRect.left) / canvasRect.width) * 1000;
    const toY = (clientY: number) => ((clientY - canvasRect.top) / canvasRect.height) * 1200;
    // The offset is a delta in artwork units, so the whole selection box stays inside the strip.
    return {
      minX: toX(left) - bounds.x,
      maxX: toX(right) - (bounds.x + bounds.width),
      minY: toY(viewportRect.top) - bounds.y,
      maxY: toY(bottom) - (bounds.y + bounds.height),
    };
  }

  function clampToCanvasDrag(delta: Point, clamp: CanvasDeltaClamp | null): Point {
    if (!clamp) return delta;
    // When the selection is larger than the free strip no offset can satisfy both edges, so
    // leave that axis alone rather than snapping the layer to a single position.
    const axis = (value: number, min: number, max: number) => min > max ? value : Math.min(Math.max(value, min), max);
    return { x: axis(delta.x, clamp.minX, clamp.maxX), y: axis(delta.y, clamp.minY, clamp.maxY) };
  }

  function rememberLayerSnapshot() {
    setUndoStack((current) => [...current.slice(-29), layers]);
    setRedoStack([]);
  }

  // A Text layer holds only text: drawing,
  // shapes and erasing never land on a text layer, so the tools are refused instead of
  // silently mixing artwork into the text.
  function textLayerRejection(layer: EditorArtworkLayer | undefined): string | null {
    if (!layer) return null;
    if (layer.kind !== "text") return null;
    return `${layer.name} is a text layer. Select or create a non-text layer before drawing.`;
  }

  /**
   * The eraser records a pass, not a one-shot delete. Brush mode lays down soft dabs that
   * build up over a drag; stroke mode clears any whole stroke whose points fall under the nib.
   */
  function buildEraserPass(points: Point[]): EditorErasure {
    const settings = toolOptions.eraser;
    return {
      points: points.map((point) => ({ ...point })),
      tool: "brush",
      width: settings.size,
      opacity: settings.opacity / 100,
      shape: settings.shape,
      hardness: settings.hardness,
      flow: settings.flow,
      spacing: settings.spacing,
      angle: settings.angle,
      roundness: settings.roundness,
    };
  }

  function eraseTouchedStrokes(path: Point[], layerId: string, target: LayerEditTarget) {
    const radiusPx = toolOptions.eraser.size;
    const segments: [Point, Point][] = [];
    for (let index = 1; index < path.length; index += 1) segments.push([path[index - 1], path[index]]);
    if (segments.length === 0) segments.push([path[0], path[0]]);
    const toPx = (point: Point): Point => ({ x: point.x * PRINT_CANVAS_SPEC.widthPx, y: point.y * PRINT_CANVAS_SPEC.heightPx });
    // A fast drag records few vertices, so testing the eraser path against each stroke
    // segment (not just its vertices) is what keeps the nib from slipping between samples.
    const isTouched = (stroke: { points: Point[] }) => {
      const points = stroke.points.map(toPx);
      const strokeSegments: [Point, Point][] = [];
      for (let index = 1; index < points.length; index += 1) strokeSegments.push([points[index - 1], points[index]]);
      if (strokeSegments.length === 0 && points.length > 0) strokeSegments.push([points[0], points[0]]);
      return strokeSegments.some(([from, to]) => segments.some(([start, end]) => {
        const a = toPx(start);
        const b = toPx(end);
        return segmentDistancePx(a.x, a.y, b.x, b.y, from.x, from.y, to.x, to.y) <= radiusPx;
      }));
    };
    setLayers((current) => current.map((layer) => {
      if (layer.id !== layerId || layer.locked) return layer;
      if (target === "mask") {
        if (layer.mask === null) return layer;
        const mask = layer.mask.filter((stroke) => !isTouched(stroke));
        return mask.length === layer.mask.length ? layer : { ...layer, mask };
      }
      const strokes = layer.strokes.filter((stroke) => !isTouched(stroke));
      return strokes.length === layer.strokes.length ? layer : { ...layer, strokes };
    }));
  }

  function beginEraserPass(pointerId: number, point: Point, layerId: string, target: LayerEditTarget) {
    rememberLayerSnapshot();
    activeEraserRef.current = { pointerId, layerId, target, points: [point] };
    if (toolOptions.eraser.mode === "stroke") {
      eraseTouchedStrokes([point], layerId, target);
      return;
    }
    setLayers((current) => appendLayerErasure(current, layerId, buildEraserPass([point])));
  }

  function extendEraserPass(point: Point) {
    const eraser = activeEraserRef.current;
    if (!eraser) return;
    eraser.points.push(point);
    if (toolOptions.eraser.mode === "stroke") {
      eraseTouchedStrokes(eraser.points, eraser.layerId, eraser.target);
      return;
    }
    setLayers((current) => updateLayerLastErasure(current, eraser.layerId, buildEraserPass(eraser.points)));
  }

  function endEraserPass() {
    activeEraserRef.current = null;
  }

  function clearErasures() {
    if (!selectedLayerId) return;
    const target = layers.find((layer) => layer.id === selectedLayerId);
    if (!target || target.locked) return;
    rememberLayerSnapshot();
    setLayers((current) => clearLayerErasures(current, selectedLayerId));
  }

  function resolveLinkedLayerIds(ids: string[]) {
    const resolved = new Set(ids);
    ids.forEach((id) => {
      const linkId = layers.find((layer) => layer.id === id)?.linkId;
      if (linkId) layers.filter((layer) => layer.linkId === linkId).forEach((layer) => resolved.add(layer.id));
    });
    return [...resolved];
  }

  /**
   * The topmost visible layer whose artwork covers an artwork-space point. `layers` is ordered
   * top-first, so the first match wins. The point is mapped back through that layer's own
   * move/scale/rotate, which keeps the test exact for a rotated layer instead of falling back
   * to its axis-aligned box.
   */
  function hoverCanvasLayer(clientX: number, clientY: number) {
    const normalized = toCanvasPointUnclamped(clientX, clientY);
    setHoveredLayerId(hitTestLayerAt({ x: normalized.x * 1000, y: normalized.y * 1200 }));
  }

  function hitTestLayerAt(point: Point): string | null {
    for (const layer of layers) {
      if (!layer.visible) continue;
      const base = layerCanvasBounds(layer);
      if (!base) continue;
      const scale = canvasLayerScales[layer.id] ?? { x: 1, y: 1 };
      const offset = canvasLayerTransforms[layer.id] ?? { x: 0, y: 0 };
      const pivot = canvasLayerOrigins[layer.id] ?? { x: 500, y: 600 };
      const rotation = canvasLayerRotations[layer.id] ?? 0;
      const unrotated = rotateTransformPoint(
        { x: point.x - offset.x - pivot.x, y: point.y - offset.y - pivot.y },
        { x: 0, y: 0 },
        -rotation,
      );
      const local = {
        x: unrotated.x / (scale.x || 1) + pivot.x,
        y: unrotated.y / (scale.y || 1) + pivot.y,
      };
      if (local.x >= base.x && local.x <= base.x + base.width && local.y >= base.y && local.y <= base.y + base.height) {
        return layer.id;
      }
    }
    return null;
  }

  /** Starts a drag of `ids`, applying the linked-layer and lock rules. */
  function beginLayerDrag(event: React.PointerEvent<Element>, ids: string[]) {
    const movableIds = resolveLinkedLayerIds(ids).filter((id) => {
      const layer = layers.find((item) => item.id === id);
      return !!layer && !layer.locked;
    });
    if (movableIds.length === 0) return;
    const start = toCanvasPointUnclamped(event.clientX, event.clientY);
    // Capture on the SVG root so a press that starts on the selection box still tracks moves
    // after the pointer leaves the box.
    const captureTarget = event.currentTarget instanceof SVGElement
      ? event.currentTarget.ownerSVGElement ?? event.currentTarget
      : event.currentTarget;
    captureTarget.setPointerCapture(event.pointerId);
    const origin = Object.fromEntries(movableIds.map((id) => [id, canvasLayerTransforms[id] ?? { x: 0, y: 0 }]));
    canvasArtworkDragRef.current = { pointerId: event.pointerId, start, origin, clamp: canvasDragClamp(boundsForLayerIds(ids)) };
  }

  function startCanvasArtworkMove(event: React.PointerEvent<Element>) {
    if (event.button !== 0 || !event.isPrimary) return;
    event.preventDefault();
    event.stopPropagation();
    beginLayerDrag(event, selectedLayerIds);
  }

  /**
   * A press on the artwork selects the layer under the pointer and starts dragging it. Without
   * this the whole canvas only ever moved the layer that was already selected, so the only way
   * to pick a different layer was the Layers panel.
   */
  function pickLayerAt(event: React.PointerEvent<Element>) {
    if (event.button !== 0 || !event.isPrimary) return false;
    const point = toCanvasPointUnclamped(event.clientX, event.clientY);
    const hitId = hitTestLayerAt({ x: point.x * 1000, y: point.y * 1200 });
    if (!hitId) return false;
    const ids = event.shiftKey ? resolveLinkedLayerIds([...selectedLayerIds, hitId]) : [hitId];
    selectLayer(hitId, "artwork", event.shiftKey);
    event.preventDefault();
    event.stopPropagation();
    beginLayerDrag(event, ids);
    return true;
  }

  /** The canvas surface: pick the layer under the pointer, else drag the current selection. */
  function startCanvasArtworkPress(event: React.PointerEvent<SVGElement>) {
    if (pickLayerAt(event)) return;
    startCanvasArtworkMove(event);
  }

  /**
   * A press on the transform box. The box is a solid rect over the whole selected layer, so
   * without a hit test here it swallowed every press inside its area and the only way to
   * select a layer that sits under the box was the Layers panel. Pressing a different layer
   * now selects it; pressing the selection itself still drags it.
   */
  function startSelectionBoxPress(event: React.PointerEvent<Element>) {
    if (event.button !== 0 || !event.isPrimary) return;
    const point = toCanvasPointUnclamped(event.clientX, event.clientY);
    const hitId = hitTestLayerAt({ x: point.x * 1000, y: point.y * 1200 });
    if (hitId && !selectedLayerIds.includes(hitId)) {
      pickLayerAt(event);
      return;
    }
    startCanvasArtworkMove(event);
  }
  function moveCanvasArtwork(event: React.PointerEvent<Element>) {
    const drag = canvasArtworkDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const point = toCanvasPointUnclamped(event.clientX, event.clientY);
    const rawDelta = { x: (point.x - drag.start.x) * 1000, y: (point.y - drag.start.y) * 1200 };
    const delta = clampToCanvasDrag(rawDelta, drag.clamp);
    // A layer may be dragged well past the print area (and back). The limit is generous, just
    // wide enough to keep a layer reachable rather than letting it be flung out of sight.
    const limit = CANVAS_LAYER_TRAVEL_LIMIT;
    setCanvasLayerTransforms((current) => ({ ...current, ...Object.fromEntries(Object.entries(drag.origin).map(([id, origin]) => [id, {
      x: Math.max(-limit, Math.min(limit, origin.x + delta.x)),
      y: Math.max(-limit, Math.min(limit, origin.y + delta.y)),
    }])) }));
  }
  function endCanvasArtworkMove(event: React.PointerEvent<Element>) {
    if (canvasArtworkDragRef.current?.pointerId === event.pointerId) canvasArtworkDragRef.current = null;
  }

  function startCanvasLayerResize(event: React.PointerEvent<SVGCircleElement>) {
    if (event.button !== 0 || !event.isPrimary || selectedLayerIds.length === 0) return;
    event.preventDefault();
    event.stopPropagation();
    const ids = resolveLinkedLayerIds(selectedLayerIds).filter((id) => !layers.find((layer) => layer.id === id)?.locked);
    if (!ids.length || !selectionBounds) return;
    const startNormalized = toCanvasPointUnclamped(event.clientX, event.clientY);
    const pointerStart = { x: startNormalized.x * 1000, y: startNormalized.y * 1200 };
    const rawHandle = event.currentTarget.parentElement?.getAttribute("data-resize-handle") ?? "bottom-right";
    const handle = rawHandle as TransformHandle;
    const rotation = selectedLayerIds.length === 1 ? canvasLayerRotations[selectedLayerIds[0]] ?? 0 : 0;
    event.currentTarget.parentElement?.setPointerCapture(event.pointerId);
    canvasLayerResizeRef.current = {
      pointerId: event.pointerId,
      pointerStart,
      bounds: selectionBounds,
      rotation,
      origin: Object.fromEntries(ids.map((id) => [id, {
        scale: canvasLayerScales[id] ?? { x: 1, y: 1 },
        offset: canvasLayerTransforms[id] ?? { x: 0, y: 0 },
        rotation: canvasLayerRotations[id] ?? 0,
        pivot: canvasLayerOrigins[id] ?? { x: 500, y: 600 },
      }])),
      handle,
    };
  }

  function resizeCanvasLayer(event: React.PointerEvent<SVGSVGElement>) {
    const drag = canvasLayerResizeRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const normalized = toCanvasPointUnclamped(event.clientX, event.clientY);
    const pointerCurrent = { x: normalized.x * 1000, y: normalized.y * 1200 };
    const factors = getFreeTransformResizeFactors({
      bounds: drag.bounds,
      handle: drag.handle,
      rotation: drag.rotation,
      pointerStart: drag.pointerStart,
      pointerCurrent,
      centered: event.altKey,
      freeScale: event.shiftKey,
    });
    const anchor = getFreeTransformResizeAnchor({ bounds: drag.bounds, handle: drag.handle, rotation: drag.rotation, centered: event.altKey });
    const centerOfSelection = { x: drag.bounds.x + drag.bounds.width / 2, y: drag.bounds.y + drag.bounds.height / 2 };
    const nextScales: Record<string, Point> = {};
    const nextOffsets: Record<string, Point> = {};
    Object.entries(drag.origin).forEach(([id, origin]) => {
      const currentCenter = { x: origin.pivot.x + origin.offset.x, y: origin.pivot.y + origin.offset.y };
      const localCenter = rotateTransformPoint(currentCenter, centerOfSelection, -drag.rotation);
      const localAnchor = rotateTransformPoint(anchor, centerOfSelection, -drag.rotation);
      const scaledCenter = {
        x: localAnchor.x + (localCenter.x - localAnchor.x) * factors.x,
        y: localAnchor.y + (localCenter.y - localAnchor.y) * factors.y,
      };
      const nextCenter = rotateTransformPoint(scaledCenter, centerOfSelection, drag.rotation);
      nextScales[id] = { x: origin.scale.x * factors.x, y: origin.scale.y * factors.y };
      nextOffsets[id] = { x: nextCenter.x - origin.pivot.x, y: nextCenter.y - origin.pivot.y };
    });
    setCanvasLayerScales((current) => ({ ...current, ...nextScales }));
    setCanvasLayerTransforms((current) => ({ ...current, ...nextOffsets }));
  }

  function endCanvasLayerResize(event: React.PointerEvent<SVGSVGElement>) {
    const drag = canvasLayerResizeRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    canvasLayerResizeRef.current = null;
    // Say it once, quietly: a photo shrunk past a print-quality step is a print decision, and
    // Save and Buy stay available either way.
    const dropped = layers
      .filter((layer) => layer.kind === "image" && layer.image)
      .map((layer) => {
        const before = imagePrintQuality(layer.image, drag.origin[layer.id]?.scale ?? { x: 1, y: 1 });
        const after = imagePrintQuality(layer.image, canvasLayerScales[layer.id] ?? { x: 1, y: 1 });
        if (!before || !after || imagePrintLevelRank(after.level) <= imagePrintLevelRank(before.level)) return null;
        return `${layer.name}: print quality dropped to ${after.ppi} ppi`;
      })
      .filter(Boolean);
    if (dropped.length) setToolNotice(dropped[0] as string);
  }

  function startCanvasLayerRotate(event: React.PointerEvent<SVGCircleElement>) {
    if (event.button !== 0 || !event.isPrimary || !selectionBounds || selectedLayerIds.length === 0) return;
    event.preventDefault();
    event.stopPropagation();
    const ids = resolveLinkedLayerIds(selectedLayerIds).filter((id) => !layers.find((layer) => layer.id === id)?.locked);
    if (!ids.length) return;
    const center = { x: selectionBounds.x + selectionBounds.width / 2, y: selectionBounds.y + selectionBounds.height / 2 };
    const normalized = toCanvasPointUnclamped(event.clientX, event.clientY);
    const start = { x: normalized.x * 1000, y: normalized.y * 1200 };
    event.currentTarget.parentElement?.setPointerCapture(event.pointerId);
    canvasLayerRotateRef.current = {
      pointerId: event.pointerId,
      center,
      startAngle: Math.atan2(start.y - center.y, start.x - center.x) * (180 / Math.PI),
      origin: Object.fromEntries(ids.map((id) => [id, {
        scale: canvasLayerScales[id] ?? { x: 1, y: 1 },
        offset: canvasLayerTransforms[id] ?? { x: 0, y: 0 },
        rotation: canvasLayerRotations[id] ?? 0,
        pivot: canvasLayerOrigins[id] ?? { x: 500, y: 600 },
      }])),
    };
  }

  function rotateCanvasLayer(event: React.PointerEvent<SVGSVGElement>) {
    const drag = canvasLayerRotateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const normalized = toCanvasPointUnclamped(event.clientX, event.clientY);
    const point = { x: normalized.x * 1000, y: normalized.y * 1200 };
    const angle = Math.atan2(point.y - drag.center.y, point.x - drag.center.x) * (180 / Math.PI);
    let delta = angle - drag.startAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    delta = snapEditorRotationDelta(delta, event.shiftKey, 15);
    const nextRotations: Record<string, number> = {};
    const nextOffsets: Record<string, Point> = {};
    Object.entries(drag.origin).forEach(([id, origin]) => {
      const currentCenter = { x: origin.pivot.x + origin.offset.x, y: origin.pivot.y + origin.offset.y };
      const rotatedCenter = rotateTransformPoint(currentCenter, drag.center, delta);
      nextRotations[id] = origin.rotation + delta;
      nextOffsets[id] = { x: rotatedCenter.x - origin.pivot.x, y: rotatedCenter.y - origin.pivot.y };
    });
    setCanvasLayerRotations((current) => ({ ...current, ...nextRotations }));
    setCanvasLayerTransforms((current) => ({ ...current, ...nextOffsets }));
  }

  function endCanvasLayerRotate(event: React.PointerEvent<SVGSVGElement>) {
    if (canvasLayerRotateRef.current?.pointerId === event.pointerId) canvasLayerRotateRef.current = null;
  }

  function isNearPenStart(clientX: number, clientY: number) {
    const first = penAnchors[0];
    const rect = canvasNodeRef.current?.getBoundingClientRect();
    if (!first || !rect) return false;
    const startX = rect.left + first.x * rect.width;
    const startY = rect.top + first.y * rect.height;
    return Math.hypot(clientX - startX, clientY - startY) <= 16;
  }

  function isNearPenEnd(clientX: number, clientY: number) {
    const last = penAnchors[penAnchors.length - 1];
    const rect = canvasNodeRef.current?.getBoundingClientRect();
    if (!last || penAnchors.length < 2 || !rect) return false;
    const endX = rect.left + last.x * rect.width;
    const endY = rect.top + last.y * rect.height;
    return Math.hypot(clientX - endX, clientY - endY) <= 16;
  }

  function finishPenPath(close = false) {
    if (penAnchors.length < 2) {
      setPenAnchors([]);
      setPenHoverPoint(null);
      setPenHoverCloseTarget(false);
      return;
    }
    const selectedLayer = layers.find((layer) => layer.id === selectedLayerId);
    const rejection = textLayerRejection(selectedLayer);
    if (rejection) {
      setToolNotice(rejection);
      setPenAnchors([]);
      setPenHoverPoint(null);
      setPenHoverCloseTarget(false);
      return;
    }
    if (!selectedLayer || selectedLayer.locked) {
      setToolNotice("Select an unlocked layer before drawing.");
      setPenAnchors([]);
      setPenHoverPoint(null);
      setPenHoverCloseTarget(false);
      return;
    }
    const penPath: EditorPenPath = { anchors: penAnchors, closed: close };
    const pathData = editorPenPathData(penPath);
    rememberLayerSnapshot();
    setLayers((current) => appendEditorShapePaths(current, selectedLayer.id, [
      { d: pathData, fill: close ? foregroundColor : "none", stroke: foregroundColor, strokeWidth: toolOptions.pen.width, penPath },
    ]));
    setSelectedLayerId(selectedLayer.id);
    setSelectedLayerIds([selectedLayer.id]);
    setSelectedTarget("artwork");
    setPenAnchors([]);
    setPenHoverPoint(null);
    setPenHoverCloseTarget(false);
    setEditingPenPathLayerId(null);
    setEditingPenPathIndex(null);
    setToolNotice(`Pen path added to ${selectedLayer.name}. Pen remains active; switch to Move and double-click a path to edit points.`);
  }

  function addPenAnchor(event: React.PointerEvent<HTMLElement>) {
    if (event.button !== 0 || !event.isPrimary) return;
    const selectedLayer = layers.find((layer) => layer.id === selectedLayerId);
    const rejection = textLayerRejection(selectedLayer);
    if (rejection) {
      event.preventDefault();
      event.stopPropagation();
      setToolNotice(rejection);
      return;
    }
    if (!selectedLayer || selectedLayer.locked) {
      setToolNotice("Select an unlocked layer before drawing.");
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const rawPoint = toCanvasPoint(event.clientX, event.clientY);
    if (penAnchors.length >= 3 && isNearPenStart(event.clientX, event.clientY)) {
      finishPenPath(true);
      return;
    }
    // Clicking the last point again ends the path as an open path.
    if (isNearPenEnd(event.clientX, event.clientY)) {
      finishPenPath(false);
      return;
    }
    const previous = penAnchors[penAnchors.length - 1];
    const point = event.shiftKey && previous ? snapEditorPenPoint(rawPoint, previous) : rawPoint;
    const index = penAnchors.length;
    setPenAnchors((current) => [...current, point]);
    setPenHoverPoint(point);
    setPenHoverCloseTarget(false);
    event.currentTarget.setPointerCapture(event.pointerId);
    penAnchorDragRef.current = { pointerId: event.pointerId, index, point, corner: event.altKey };
  }

  function startShapeDrawing(event: React.PointerEvent<HTMLElement>) {
    if (activeShapeDragRef.current || event.button !== 0 || !event.isPrimary) return;
    const selectedLayer = layers.find((layer) => layer.id === selectedLayerId);
    const rejection = textLayerRejection(selectedLayer);
    if (rejection) {
      event.preventDefault();
      event.stopPropagation();
      setToolNotice(rejection);
      return;
    }
    if (!selectedLayer || selectedLayer.locked) {
      setToolNotice("Select an unlocked layer before drawing.");
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const point = toCanvasPoint(event.clientX, event.clientY);
    const canvasPoint = { x: point.x * 1000, y: point.y * 1200 };
    const drag: ActiveShapeDrag = { pointerId: event.pointerId, layerId: selectedLayer.id, preset: selectedShape, start: canvasPoint, current: canvasPoint, color: foregroundColor };
    activeShapeDragRef.current = drag;
    setShapeDrawing(drag);
    event.currentTarget.setPointerCapture(event.pointerId);
    setToolNotice("");
  }

  // The Gradient tool paints a full-canvas fill. If a gradient layer is
  // selected the drag re-aims that layer's axis; otherwise it drops a new gradient layer.
  // A tap (or a tiny drag) still works, dropping the default axis through the point.
  function startGradientDrawing(event: React.PointerEvent<HTMLElement>) {
    if (activeGradientDragRef.current || event.button !== 0 || !event.isPrimary) return;
    const selectedLayer = layers.find((layer) => layer.id === selectedLayerId);
    const rejection = textLayerRejection(selectedLayer);
    if (rejection) {
      event.preventDefault();
      event.stopPropagation();
      setToolNotice(rejection);
      return;
    }
    const targetGradientLayer = selectedLayer?.kind === "gradient" && !selectedLayer.locked && selectedLayer.gradient ? selectedLayer : null;
    event.preventDefault();
    event.stopPropagation();
    const point = toCanvasPoint(event.clientX, event.clientY);
    const canvasPoint = { x: point.x * 1000, y: point.y * 1200 };
    const drag: ActiveGradientDrag = {
      pointerId: event.pointerId,
      layerId: targetGradientLayer?.id ?? null,
      start: canvasPoint,
      current: canvasPoint,
      // Re-aiming an existing layer keeps its stops; a fresh layer starts from the tool preset.
      gradient: targetGradientLayer?.gradient ?? editorGradientFromToolSettings(toolOptions.gradient),
    };
    activeGradientDragRef.current = drag;
    setGradientDrawing(drag);
    event.currentTarget.setPointerCapture(event.pointerId);
    setToolNotice("");
  }

  function gradientWithAxis(drag: ActiveGradientDrag, end: Point): EditorGradient {
    const dx = end.x - drag.start.x;
    const dy = end.y - drag.start.y;
    // A click (no real drag) falls back to a full-width horizontal axis through the point.
    if (Math.hypot(dx, dy) < 8) {
      return { ...drag.gradient, x1: drag.start.x - 320, y1: drag.start.y, x2: drag.start.x + 320, y2: drag.start.y };
    }
    return { ...drag.gradient, x1: drag.start.x, y1: drag.start.y, x2: end.x, y2: end.y };
  }

  function endGradientDrawing(event: React.PointerEvent<HTMLElement>) {
    const drag = activeGradientDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    activeGradientDragRef.current = null;
    setGradientDrawing(null);
    if (event.type !== "pointerup") return;
    const point = toCanvasPoint(event.clientX, event.clientY);
    const gradient = gradientWithAxis(drag, { x: point.x * 1000, y: point.y * 1200 });
    if (drag.layerId) {
      rememberLayerSnapshot();
      setLayers((current) => setEditorLayerGradient(current, drag.layerId!, gradient));
      setSelectedTarget("artwork");
      setToolNotice("Gradient direction updated.");
      return;
    }
    const id = claimLayerId();
    const label = nextGradientLayerLabelRef.current++;
    rememberLayerSnapshot();
    setLayers((current) => [createEditorGradientLayer(id, `Gradient ${label}`, gradient), ...current]);
    setSelectedLayerId(id);
    setSelectedLayerIds([id]);
    setSelectedTarget("artwork");
    setEditingTextLayerId(null);
    revealLayersStack();
    setToolNotice(`Gradient ${label} added. Drag on it to re-aim, or tune its stops in Adjustments.`);
  }

  function penPathForLayer(layerId: string, pathIndex = 0): EditorPenPath | null {
    const layer = layers.find((item) => item.id === layerId);
    return layer?.shape?.paths[pathIndex]?.penPath ?? null;
  }

  function penLayerTransform(layerId: string) {
    const offset = canvasLayerTransforms[layerId] ?? { x: 0, y: 0 };
    const scale = canvasLayerScales[layerId] ?? { x: 1, y: 1 };
    const pivot = canvasLayerOrigins[layerId] ?? { x: 500, y: 600 };
    const rotation = canvasLayerRotations[layerId] ?? 0;
    return `translate(${offset.x} ${offset.y}) translate(${pivot.x} ${pivot.y}) rotate(${rotation}) scale(${scale.x} ${scale.y}) translate(${-pivot.x} ${-pivot.y})`;
  }

  function toPenLayerPoint(clientX: number, clientY: number, layerId: string): Point {
    const point = toCanvasPoint(clientX, clientY);
    const canvasX = point.x * 1000;
    const canvasY = point.y * 1200;
    const offset = canvasLayerTransforms[layerId] ?? { x: 0, y: 0 };
    const scale = canvasLayerScales[layerId] ?? { x: 1, y: 1 };
    const pivot = canvasLayerOrigins[layerId] ?? { x: 500, y: 600 };
    const rotation = (canvasLayerRotations[layerId] ?? 0) * Math.PI / 180;
    const rotatedX = canvasX - offset.x - pivot.x;
    const rotatedY = canvasY - offset.y - pivot.y;
    const translatedX = (rotatedX * Math.cos(rotation) + rotatedY * Math.sin(rotation)) / Math.max(0.001, scale.x);
    const translatedY = (-rotatedX * Math.sin(rotation) + rotatedY * Math.cos(rotation)) / Math.max(0.001, scale.y);
    return {
      x: (pivot.x + translatedX) / 1000,
      y: (pivot.y + translatedY) / 1200,
    };
  }

  function updatePenLayer(layerId: string, pathIndex: number, penPath: EditorPenPath) {
    setLayers((current) => updateEditorPenPath(current, layerId, penPath, editorPenPathData(penPath), pathIndex));
  }

  function clearPenEditWindowHandlers() {
    const handlers = penEditWindowHandlersRef.current;
    if (!handlers) return;
    window.removeEventListener("pointermove", handlers.move, true);
    window.removeEventListener("pointerup", handlers.end, true);
    window.removeEventListener("pointercancel", handlers.end, true);
    penEditWindowHandlersRef.current = null;
  }

  function startPenEditDrag(
    layerId: string,
    pathIndex: number,
    index: number,
    kind: PenEditDrag["kind"],
    event: React.PointerEvent<SVGCircleElement>,
  ) {
    if (event.button !== 0 || !event.isPrimary) return;
    event.preventDefault();
    event.stopPropagation();
    const path = penPathForLayer(layerId, pathIndex);
    const origin = path?.anchors[index];
    if (!path || !origin) return;
    clearPenEditWindowHandlers();
    if (kind === "anchor" && event.altKey) {
      const next = removeEditorPenAnchor(path, index);
      if (next) {
        rememberLayerSnapshot();
        updatePenLayer(layerId, pathIndex, next);
        setSelectedPenAnchorIndex(null);
      } else {
        setToolNotice(path.closed ? "A closed path needs at least three points." : "An open path needs at least two points.");
      }
      return;
    }
    rememberLayerSnapshot();
    setSelectedPenAnchorIndex(index);
    penEditDragRef.current = {
      pointerId: event.pointerId,
      layerId,
      pathIndex,
      index,
      kind,
      start: toPenLayerPoint(event.clientX, event.clientY, layerId),
      origin: { ...origin },
    };
    const moveHandler = (moveEvent: PointerEvent) => {
      if (penEditDragRef.current?.pointerId === moveEvent.pointerId) movePenEditNode(moveEvent);
    };
    const endHandler = (endEvent: PointerEvent) => {
      if (penEditDragRef.current?.pointerId === endEvent.pointerId) endPenEditDrag(endEvent);
    };
    penEditWindowHandlersRef.current = { move: moveHandler, end: endHandler };
    window.addEventListener("pointermove", moveHandler, true);
    window.addEventListener("pointerup", endHandler, true);
    window.addEventListener("pointercancel", endHandler, true);
  }

  function movePenEditNode(event: PointerEvent) {
    const drag = penEditDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const path = penPathForLayer(drag.layerId, drag.pathIndex);
    const currentAnchor = path?.anchors[drag.index];
    if (!path || !currentAnchor) return;
    const point = toPenLayerPoint(event.clientX, event.clientY, drag.layerId);
    const delta = { x: point.x - drag.start.x, y: point.y - drag.start.y };
    const anchors = path.anchors.map((anchor, index) => {
      if (index !== drag.index) return anchor;
      if (drag.kind === "anchor") {
        return { ...drag.origin, x: drag.origin.x + delta.x, y: drag.origin.y + delta.y };
      }
      const handle = { x: point.x - drag.origin.x, y: point.y - drag.origin.y };
      if (drag.kind === "handle-in") {
        return { ...anchor, handleIn: handle, handleOut: event.altKey ? anchor.handleOut : { x: -handle.x, y: -handle.y } };
      }
      return { ...anchor, handleOut: handle, handleIn: event.altKey ? anchor.handleIn : { x: -handle.x, y: -handle.y } };
    });
    updatePenLayer(drag.layerId, drag.pathIndex, { ...path, anchors });
  }

  function endPenEditDrag(event: PointerEvent) {
    if (penEditDragRef.current?.pointerId !== event.pointerId) return;
    penEditDragRef.current = null;
    clearPenEditWindowHandlers();
  }

  function addPenNodeOnPath(layerId: string, pathIndex: number, event: React.PointerEvent<SVGPathElement>) {
    if (event.button !== 0 || !event.isPrimary) return;
    event.preventDefault();
    event.stopPropagation();
    const path = penPathForLayer(layerId, pathIndex);
    if (!path) return;
    const point = toPenLayerPoint(event.clientX, event.clientY, layerId);
    const next = insertEditorPenAnchor(path, point);
    if (!next) return;
    rememberLayerSnapshot();
    updatePenLayer(layerId, pathIndex, next);
    setSelectedPenAnchorIndex(null);
  }

  function removePenNode(layerId: string, pathIndex: number, index: number) {
    const path = penPathForLayer(layerId, pathIndex);
    const next = path ? removeEditorPenAnchor(path, index) : null;
    if (!next) {
      setToolNotice(path?.closed ? "A closed path needs at least three points." : "An open path needs at least two points.");
      return;
    }
    rememberLayerSnapshot();
    updatePenLayer(layerId, pathIndex, next);
    setSelectedPenAnchorIndex(null);
  }

  function removeSelectedPenNode() {
    if (!editingPenPathLayerId || selectedPenAnchorIndex === null) return;
    removePenNode(editingPenPathLayerId, editingPenPathIndex ?? 0, selectedPenAnchorIndex);
  }

  function startArtworkStroke(event: React.PointerEvent<HTMLElement>) {
    if (activeArtworkStrokeRef.current || event.button !== 0 || !event.isPrimary) return;
    if (activeTool === "move" || activeTool === "hand") return;
    const activeLayer = layers.find((layer) => layer.id === selectedLayerId);
    // Photo layers are edited through the Photo Adjustments panel only: the
    // paint, pen, shape, gradient, and eraser tools are inert on them.
    if (activeLayer?.kind === "image" && DRAWING_TOOLS.includes(activeTool)) {
      event.preventDefault();
      event.stopPropagation();
      setToolNotice("Photo layers are adjusted in the Photo Adjustments panel; drawing tools are off for photos.");
      return;
    }
    if (activeTool === "pen") {
      addPenAnchor(event);
      return;
    }
    if (activeTool === "shape") {
      startShapeDrawing(event);
      return;
    }
    if (activeTool === "gradient") {
      startGradientDrawing(event);
      return;
    }
    if (activeTool === "remove-bg") {
      event.preventDefault();
      event.stopPropagation();
      setToolNotice("Remove BG needs an uploaded image; background removal is not connected yet.");
      return;
    }
    const point = toCanvasPoint(event.clientX, event.clientY);
    if (activeTool === "text") {
      event.preventDefault();
      event.stopPropagation();
      // Clicking the ink of a text layer selects that layer, so the caret lands where the
      // pointer is instead of editing whichever layer happened to be selected before.
      const hitId = hitTestLayerAt({ x: point.x * 1000, y: point.y * 1200 });
      const hitLayer = hitId ? layers.find((layer) => layer.id === hitId) : null;
      if (hitLayer?.kind === "text") {
        if (hitLayer.locked) {
          setToolNotice("Unlock this text layer before editing its text.");
          return;
        }
        selectLayer(hitLayer.id, "artwork");
        setEditingTextLayerId(hitLayer.id);
        return;
      }
      const selected = layers.find((layer) => layer.id === selectedLayerId);
      // Typing on an existing text layer edits that layer in place
      // and never spawns another one. A new text layer is created only when the
      // selection is empty or is not a text layer.
      if (selected?.kind === "text") {
        if (selected.locked) {
          setToolNotice("Unlock this text layer before editing its text.");
          return;
        }
        setEditingTextLayerId(selected.id);
        setSelectedTarget("artwork");
        return;
      }
      addCanvasTextLayer(undefined, { x: point.x * 1000, y: point.y * 1200 });
      return;
    }
    const selectedLayer = layers.find((layer) => layer.id === selectedLayerId);
    const rejection = textLayerRejection(selectedLayer);
    if (rejection) {
      event.preventDefault();
      event.stopPropagation();
      setToolNotice(rejection);
      return;
    }
    if (!selectedLayer || selectedLayer.locked || (selectedTarget === "mask" && selectedLayer.mask === null)) return;
    event.preventDefault();
    event.stopPropagation();
    // Capture is best-effort: a phone that has already cancelled the touch throws
    // NotFoundError here, and aborting would silently drop the stroke.
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {}

    if (activeTool === "eraser") {
      beginEraserPass(event.pointerId, point, selectedLayer.id, selectedTarget);
      return;
    }
    const tool = activeTool === "brush" ? "brush" : "pen";
    const brushSettings = activeTool === "brush" ? toolOptions.brush : toolOptions.pencil;
    const effectiveMaskBrushMode: MaskBrushMode = selectedTarget === "mask" && foregroundColor.toLowerCase() === "#ffffff" ? "reveal" : "hide";
    if (selectedTarget === "mask") setMaskBrushMode(effectiveMaskBrushMode);
    const brushExtras = {
      spacing: brushSettings.spacing,
      flow: brushSettings.flow,
      smoothing: brushSettings.smoothing,
      sizeJitter: brushSettings.sizeJitter,
      opacityJitter: brushSettings.opacityJitter,
      jitterMinimum: brushSettings.jitterMinimum,
      angle: brushSettings.angle,
      roundness: brushSettings.roundness,
      scatter: brushSettings.scatter,
      angleJitter: brushSettings.angleJitter,
      roundnessJitter: brushSettings.roundnessJitter,
      fadeOut: brushSettings.fadeOut,
      blend: brushSettings.blend,
    };
    const activeStroke: ActiveArtworkStroke = {
      pointerId: event.pointerId,
      layerId: selectedLayer.id,
      target: selectedTarget,
      tool,
      maskBrushMode: selectedTarget === "mask" ? effectiveMaskBrushMode : maskBrushMode,
      points: [point],
      color: foregroundColor,
      width: brushSettings.size,
      opacity: brushSettings.opacity,
      shape: brushSettings.shape,
      softness: Math.max(brushSettings.softness, brushSettings.feather),
      brush: brushExtras,
    };
    activeArtworkStrokeRef.current = activeStroke;
    setIsDrawingStroke(true);
    rememberLayerSnapshot();
    setLayers((current) => appendLayerStroke(
      current,
      activeStroke.layerId,
      activeStroke.target,
      {
        points: [point],
        tool,
        color: foregroundColor,
        width: activeStroke.width,
        opacity: activeStroke.opacity,
        shape: activeStroke.shape,
        softness: activeStroke.softness,
        ...brushExtras,
      },
      activeStroke.maskBrushMode,
    ));
  }

  function moveArtworkStroke(event: React.PointerEvent<HTMLElement>) {
    if (activeTool === "eraser") setEraserCursor(toCanvasPoint(event.clientX, event.clientY));
    const gradientDrag = activeGradientDragRef.current;
    if (gradientDrag?.pointerId === event.pointerId) {
      event.preventDefault();
      const point = toCanvasPoint(event.clientX, event.clientY);
      const updated = { ...gradientDrag, current: { x: point.x * 1000, y: point.y * 1200 } };
      activeGradientDragRef.current = updated;
      setGradientDrawing(updated);
      return;
    }
    const shapeDrag = activeShapeDragRef.current;
    if (shapeDrag?.pointerId === event.pointerId) {
      event.preventDefault();
      const point = toCanvasPoint(event.clientX, event.clientY);
      const updated = { ...shapeDrag, current: { x: point.x * 1000, y: point.y * 1200 } };
      activeShapeDragRef.current = updated;
      setShapeDrawing(updated);
      return;
    }
    if (activeTool === "pen") {
      const rawPoint = toCanvasPoint(event.clientX, event.clientY);
      const drag = penAnchorDragRef.current;
      const closeTarget = !drag && penAnchors.length >= 3 && isNearPenStart(event.clientX, event.clientY);
      const previous = penAnchors[penAnchors.length - 1];
      const point = closeTarget ? penAnchors[0] : !drag && event.shiftKey && previous ? snapEditorPenPoint(rawPoint, previous) : rawPoint;
      if (drag?.pointerId === event.pointerId) {
        const rect = canvasNodeRef.current?.getBoundingClientRect();
        const moved = rect ? Math.hypot((point.x - drag.point.x) * rect.width, (point.y - drag.point.y) * rect.height) > 3 : false;
        if (moved) {
          setPenAnchors((current) => current.map((anchor, index) => index === drag.index
            ? (drag.corner ? cornerEditorPenAnchor(drag.point, point) : draggedEditorPenAnchor(drag.point, point))
            : anchor));
        }
      }
      setPenHoverPoint(point);
      setPenHoverCloseTarget(closeTarget);
      return;
    }
    const eraser = activeEraserRef.current;
    if (eraser?.pointerId === event.pointerId) {
      event.preventDefault();
      extendEraserPass(toCanvasPoint(event.clientX, event.clientY));
      return;
    }
    const active = activeArtworkStrokeRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    event.preventDefault();
    active.points.push(toCanvasPoint(event.clientX, event.clientY));
    setLayers((current) => updateLayerLastStroke(
      current,
      active.layerId,
      active.target,
      {
        points: [...active.points],
        tool: active.tool,
        color: active.color,
        width: active.width,
        opacity: active.opacity,
        shape: active.shape,
        softness: active.softness,
        ...active.brush,
      },
      active.maskBrushMode,
    ));
  }

  function endArtworkStroke(event: React.PointerEvent<HTMLElement>) {
    if (activeGradientDragRef.current?.pointerId === event.pointerId) {
      endGradientDrawing(event);
      return;
    }
    const shapeDrag = activeShapeDragRef.current;
    if (shapeDrag?.pointerId === event.pointerId) {
      activeShapeDragRef.current = null;
      setShapeDrawing(null);
      if (event.type !== "pointerup") return;
      const point = toCanvasPoint(event.clientX, event.clientY);
      const end = { x: point.x * 1000, y: point.y * 1200 };
      if (Math.hypot(end.x - shapeDrag.start.x, end.y - shapeDrag.start.y) < 8) return;
      const selectedLayer = layers.find((layer) => layer.id === shapeDrag.layerId);
      if (!selectedLayer || selectedLayer.locked) {
        setToolNotice("Select an unlocked layer before drawing.");
        return;
      }
      const label = EDITOR_SHAPE_LABELS[shapeDrag.preset];
      const paths = createEditorShapePaths(shapeDrag.preset, shapeDrag.start, end, shapeDrag.color);
      rememberLayerSnapshot();
      setLayers((current) => appendEditorShapePaths(current, shapeDrag.layerId, paths));
      setSelectedTarget("artwork");
      setEditingTextLayerId(null);
      setToolNotice(`${label} added to ${selectedLayer.name}.`);
      return;
    }
    if (penAnchorDragRef.current?.pointerId === event.pointerId) penAnchorDragRef.current = null;
    if (activeEraserRef.current?.pointerId === event.pointerId) endEraserPass();
    if (activeArtworkStrokeRef.current?.pointerId !== event.pointerId) return;
    activeArtworkStrokeRef.current = null;
    setIsDrawingStroke(false);
  }

  function undoCanvasAction() {
    if (undoStack.length === 0) return;
    setRedoStack((current) => [...current.slice(-29), layers]);
    setLayers(undoStack[undoStack.length - 1]);
    setUndoStack((current) => current.slice(0, -1));
    setToolNotice("");
  }

  function redoCanvasAction() {
    if (redoStack.length === 0) return;
    setUndoStack((current) => [...current.slice(-29), layers]);
    setLayers(redoStack[redoStack.length - 1]);
    setRedoStack((current) => current.slice(0, -1));
    setToolNotice("");
  }

  function chooseTool(tool: EditorTool) {
    const selected = layers.find((layer) => layer.id === selectedLayerId);
    // A photo layer has no paint target: selecting any drawing tool just keeps
    // Move active so the photo stays adjustable, never drawable.
    if (selected?.kind === "image" && DRAWING_TOOLS.includes(tool)) {
      setActiveTool("move");
      setSelectedTarget("artwork");
      setToolNotice("Photo layers are adjusted in the Photo Adjustments panel; drawing tools are off for photos.");
      return;
    }
    if (editingPenPathLayerId) {
      setEditingPenPathLayerId(null);
      setEditingPenPathIndex(null);
      setSelectedPenAnchorIndex(null);
      if (tool === "move") return;
    }
    if (tool !== "pen" && penAnchors.length > 0) {
      setPenAnchors([]);
      setPenHoverPoint(null);
      setPenHoverCloseTarget(false);
    }
    setActiveTool(tool);
    if (tool === "pen" || tool === "shape" || tool === "gradient") setSelectedTarget("artwork");
    setToolNotice(tool === "remove-bg"
      ? "Remove BG needs an uploaded image; background removal is not connected yet."
      : tool === "gradient"
          ? "Drag on the canvas to draw a gradient on a new layer. Pick its shape and preset in Adjustments."
          : "");
  }

  function startNodeDrag(node: WorkspaceNode, event: React.PointerEvent<HTMLElement>) {
    if (activeNodeDragRef.current || event.button !== 0 || !event.isPrimary) return;
    if (activeTool === "hand") return;
    if (event.target instanceof Element && event.target.closest("button, input, textarea, select")) return;
    if (node === "Print canvas" && event.target instanceof HTMLCanvasElement && !isCanvasEdgeGesture(event.clientX, event.clientY) && activeTool !== "move") return;
    // The pasteboard belongs to the active tool: a press there must not also start a node drag.
    if (node === "Print canvas" && event.target instanceof Element && event.target.closest("[data-editor-pasteboard]")) return;
    // A blank mockup swipe scrolls on phones; its header remains the explicit drag surface.
    if (event.pointerType === "touch" && node !== "Print canvas" &&
      !(event.target instanceof Element && event.target.closest("[data-node-drag-handle]"))) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    activeNodeDragRef.current = {
      node,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: nodePositions[node],
    };
    setDraggingNode(node);
  }

  function moveNodeDrag(event: React.PointerEvent<HTMLElement>) {
    const active = activeNodeDragRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    event.preventDefault();
    const scale = Math.max(zoom, 0.01);
    setNodePositions((current) => ({
      ...current,
      [active.node]: {
        x: active.origin.x + (event.clientX - active.startX) / scale,
        y: active.origin.y + (event.clientY - active.startY) / scale,
      },
    }));
  }

  function endNodeDrag(event: React.PointerEvent<HTMLElement>) {
    if (activeNodeDragRef.current?.pointerId !== event.pointerId) return;
    activeNodeDragRef.current = null;
    setDraggingNode(null);
  }

  function addMockup(side: MockupSide) {
    if (product === "Phone" && side === "Back Mockup") return;
    setMockups((current) => {
      const sides = new Set([...current, side]);
      return (["Front Mockup", "Back Mockup"] as const).filter((item) => sides.has(item));
    });
  }

  function removeMockup(side: MockupSide) {
    setMockups((current) => current.filter((item) => item !== side));
    setLargeArtworkTierOwner((current) => releaseLargeArtworkTier(current, side));
  }

  function selectLayer(id: string, target: LayerEditTarget, multi = false) {
    setSelectedLayerId(id);
    setSelectedTarget(target);
    setEditingTextLayerId(null);
    setEditingPenPathLayerId(null);
    setEditingPenPathIndex(null);
    setSelectedPenAnchorIndex(null);
    setSelectedLayerIds((current) => {
      if (!multi || target === "mask") return [id];
      return current.includes(id) ? (current.length > 1 ? current.filter((item) => item !== id) : current) : [...current, id];
    });
    if (target === "mask") setActiveTool("brush");
  }

  function claimLayerId() {
    return `layer-${nextLayerIdRef.current++}`;
  }

  // A new layer must be visible in the Layers stack. On desktop both docks can be
  // open; on phones the existing mutual-exclusion rule keeps only one dock at a time.
  function revealLayersStack() {
    if (window.matchMedia("(min-width: 768px)").matches) setLayersOpen(true);
  }

  /** Add Text: the text layer lands in the Layers stack and the canvas is ready for typing. */
  function addCanvasTextLayer(source?: DesignLibraryText | null, position?: Point) {
    const id = claimLayerId();
    const label = nextTextLayerLabelRef.current++;
    const textDefaults = toolOptions.text;
    const content: EditorTextContent = {
      value: source?.value ?? "",
      x: position?.x ?? source?.x ?? CANVAS_ARTWORK_CENTER.x,
      y: position?.y ?? source?.y ?? CANVAS_ARTWORK_CENTER.y,
      fontSize: source?.fontSize ?? textDefaults.fontSize,
      color: source?.color ?? textDefaults.color ?? foregroundColor,
      fontFamily: textDefaults.fontFamily,
      fontWeight: textDefaults.fontWeight,
      textAlign: textDefaults.textAlign,
      ...(textDefaults.letterSpacing > 0 ? { letterSpacing: textDefaults.letterSpacing } : {}),
      wrapWidth: DEFAULT_TEXT_WRAP_WIDTH,
    };
    setLayers((current) => [
      createEditorTextLayer(id, `Text ${label}`, content),
      ...current,
    ]);
    setSelectedLayerId(id);
    setSelectedLayerIds([id]);
    setSelectedTarget("artwork");
    setEditingTextLayerId(id);
    revealLayersStack();
  }

  function addCanvasElementLayer(source: DesignLibraryLayer) {
    const id = claimLayerId();
    const created = designLayerToEditorLayer(source, id);
    setLayers((current) => [created, ...current]);
    setSelectedLayerId(id);
    setSelectedLayerIds([id]);
    setSelectedTarget("artwork");
    setEditingTextLayerId(created.kind === "text" ? id : null);
    revealLayersStack();
  }

  function addCanvasDesign(design: DesignLibraryEntry) {
    const created = designToEditorLayers(design, claimLayerId);
    if (!created.length) return;
    setLayers((current) => [...created, ...current]);
    const topLevel = created[created.length - 1];
    setSelectedLayerId(topLevel.id);
    setSelectedLayerIds([topLevel.id]);
    setSelectedTarget("artwork");
    setEditingTextLayerId(null);
    revealLayersStack();
  }

  async function addCanvasUpload(file: File) {
    try {
      const compressed = await compressImageUpload(file);
      const id = claimLayerId();
      const box = imageLayerBox(compressed.width, compressed.height);
      setLayers((current) => [
        createEditorImageLayer(id, compressed.fileName || "Upload", {
          src: compressed.src,
          byteSize: compressed.byteSize,
          sourceWidth: compressed.width,
          sourceHeight: compressed.height,
          ...box,
        }),
        ...current,
      ]);
      setSelectedLayerId(id);
      setSelectedLayerIds([id]);
      setSelectedTarget("artwork");
      setEditingTextLayerId(null);
      setToolNotice(`Upload reduced to ${formatByteSize(compressed.byteSize)} and added to the canvas.`);
      revealLayersStack();
    } catch (error) {
      setToolNotice(error instanceof Error ? error.message : "That image could not be uploaded.");
    }
  }

  function updateEditingText(value: string) {
    if (!editingTextLayerId) return;
    setLayers((current) => setEditorLayerText(current, editingTextLayerId, value));
  }
  function commitEditingText() {
    setEditingTextLayerId(null);
    setActiveTool("move");
  }
  function updateEditingTextStyle(update: Partial<Pick<EditorTextContent, "fontSize" | "color" | "fontFamily" | "fontWeight" | "fontStyle" | "textAlign" | "underline" | "letterSpacing" | "lineHeight">>) {
    if (!editingTextLayerId) return;
    setLayers((current) => updateEditorLayerTextStyle(current, editingTextLayerId, update));
  }
  function updateSelectedText(value: string) {
    if (!selectedLayerId) return;
    setLayers((current) => setEditorLayerText(current, selectedLayerId, value));
  }
  function updateSelectedTextStyle(update: Partial<Pick<EditorTextContent, "fontSize" | "color" | "fontFamily" | "fontWeight" | "fontStyle" | "textAlign" | "underline" | "letterSpacing" | "lineHeight" | "textTransform" | "textEffect" | "effectColor" | "effectOffset" | "effectBlur" | "outlineWidth" | "textDecoration" | "decorationColor" | "decorationWidth" | "effects">>) {
    if (!selectedLayerId) return;
    setLayers((current) => updateEditorLayerTextStyle(current, selectedLayerId, update));
  }

  function updateSelectedImage(update: PhotoAdjustmentUpdate) {
    if (!selectedLayerId) return;
    setLayers((current) => updateEditorImageAdjustments(current, selectedLayerId, update));
  }

  function updateSelectedShapeBuilder(builderMode: "select" | "merge" | "subtract" | "intersect") {
    if (!selectedLayerId) return;
    setLayers((current) => builderMode === "select" ? updateEditorShapeBuilderMode(current, selectedLayerId, builderMode) : applyEditorShapeBuilderOperation(current, selectedLayerId, builderMode));
  }

  function updateSelectedShapeStyle(update: Partial<EditorShapeStyle>) {
    if (!selectedLayerId) return;
    setLayers((current) => updateEditorShapeStyle(current, selectedLayerId, update));
  }

  function updateSelectedGradient(gradient: EditorGradient) {
    if (!selectedLayerId) return;
    rememberLayerSnapshot();
    setLayers((current) => setEditorLayerGradient(current, selectedLayerId, gradient));
  }

  function addLayer() {
    const id = `layer-${nextLayerIdRef.current++}`;
    const number = nextLayerIdRef.current - 1;
    setLayers((current) => [createEditorArtworkLayer(id, `Layer ${number}`), ...current]);
    setSelectedLayerId(id);
    setSelectedLayerIds([id]);
    setSelectedTarget("artwork");
  }

  function toggleLayerVisibility(id: string) {
    const layer = layers.find((item) => item.id === id);
    if (layer) setLayers((current) => updateEditorLayer(current, id, { visible: !layer.visible }));
  }

  function toggleLayerLock(id: string) {
    const layer = layers.find((item) => item.id === id);
    if (layer) setLayers((current) => updateEditorLayer(current, id, { locked: !layer.locked }));
  }

  function createLayerMask(id: string) {
    setLayers((current) => addLayerMask(current, id));
    setSelectedLayerId(id);
    setSelectedLayerIds([id]);
    setSelectedTarget("mask");
    setMaskBrushMode("hide");
    setActiveTool("brush");
  }

  function deleteLayerMask(id: string) {
    setLayers((current) => removeLayerMask(current, id));
    if (selectedLayerId === id && selectedTarget === "mask") setSelectedTarget("artwork");
  }

  function duplicateLayer(id: string) {
    const newId = `layer-${nextLayerIdRef.current++}`;
    setLayers((current) => duplicateEditorLayer(current, id, newId));
    setSelectedLayerId(newId);
    setSelectedLayerIds([newId]);
    setSelectedTarget("artwork");
  }

  function deleteLayer(id: string) {
    const index = layers.findIndex((layer) => layer.id === id);
    const next = deleteEditorLayer(layers, id);
    setLayers(next);
    const remainingSelectedIds = selectedLayerIds.filter((selectedId) => selectedId !== id && next.some((layer) => layer.id === selectedId));
    setSelectedLayerIds(remainingSelectedIds);
    if (editingTextLayerId === id) setEditingTextLayerId(null);
    if (selectedLayerId === id) {
      setSelectedLayerId(remainingSelectedIds[0] ?? next[Math.min(index, next.length - 1)]?.id ?? null);
      setSelectedTarget("artwork");
    }
  }

  function renameLayer(id: string, name: string) {
    setLayers((current) => updateEditorLayer(current, id, { name }));
  }

  function moveLayer(id: string, direction: -1 | 1) {
    setLayers((current) => reorderEditorLayer(current, id, direction));
  }
  function moveLayerToIndex(id: string, targetIndex: number) {
    setLayers((current) => moveEditorLayerToIndex(current, id, targetIndex));
  }

  function groupSelectedLayers() {
    if (selectedLayerIds.length < 2) return;
    const groupId = `group-${nextGroupId}`;
    setNextGroupId((value) => value + 1);
    setLayers((current) => groupEditorLayers(current, selectedLayerIds, groupId));
  }

  function ungroupSelectedLayers() {
    setLayers((current) => ungroupEditorLayers(current, selectedLayerIds));
  }
  function selectGroup(groupId: string) {
    const ids = layers.filter((layer) => layer.groupId === groupId).map((layer) => layer.id);
    if (!ids.length) return;
    setSelectedLayerIds(ids);
    setSelectedLayerId(ids[0]);
    setSelectedTarget("artwork");
    setEditingTextLayerId(null);
  }

  function linkSelectedLayers() {
    if (selectedLayerIds.length < 2) return;
    const selectedLinkIds = selectedLayerIds.map((id) => layers.find((layer) => layer.id === id)?.linkId ?? null);
    const allLinkedToOneGroup = selectedLinkIds.every((linkId) => linkId !== null) && new Set(selectedLinkIds).size === 1;
    const hasMixedMembership = selectedLinkIds.some((linkId) => linkId !== null) && !allLinkedToOneGroup;
    if (hasMixedMembership) {
      setToolNotice("Select only unlinked layers or all layers from one link group to change Link Layers.");
      return;
    }
    if (allLinkedToOneGroup) setLayers((current) => unlinkEditorLayers(current, selectedLayerIds));
    else {
      const linkId = `link-${nextLinkId}`;
      setNextLinkId((value) => value + 1);
      setLayers((current) => linkEditorLayers(current, selectedLayerIds, linkId));
    }
  }

  function updateLayer(id: string, update: EditorLayerAppearance) {
    setLayers((current) => updateEditorLayer(current, id, update));
  }

  function updateToolOptions(patch: {
    brush?: Partial<EditorToolOptions["brush"]>;
    pencil?: Partial<EditorToolOptions["pencil"]>;
    eraser?: Partial<EditorToolOptions["eraser"]>;
    pen?: Partial<EditorToolOptions["pen"]>;
    gradient?: Partial<EditorToolOptions["gradient"]>;
    text?: Partial<EditorToolOptions["text"]>;
  }) {
    setToolOptions((current) => normalizeEditorToolOptions({
      brush: { ...current.brush, ...patch.brush },
      pencil: { ...current.pencil, ...patch.pencil },
      eraser: { ...current.eraser, ...patch.eraser },
      pen: { ...current.pen, ...patch.pen },
      gradient: { ...current.gradient, ...patch.gradient },
      text: { ...current.text, ...patch.text },
    }));
  }

  function resetView() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    viewportRef.current?.scrollTo({ top: 0, left: 0 });
  }

  const selectedLayer = layers.find((layer) => layer.id === selectedLayerId) ?? null;
  const selectedPenLayer = layers.find((layer) => layer.id === selectedLayerId && !layer.locked && layer.shape?.paths.some((path) => path.penPath));
  const selectedPenPaths = selectedPenLayer?.shape?.paths.flatMap((path, index) => path.penPath ? [{ path, index }] : []) ?? [];
  const activeEditingPenPathIndex = editingPenPathIndex ?? 0;
  const editingPenLayer = layers.find((layer) => layer.id === editingPenPathLayerId && !layer.locked && layer.shape?.paths[activeEditingPenPathIndex]?.penPath);
  const editingPenPath = editingPenLayer?.shape?.paths[activeEditingPenPathIndex]?.penPath ?? null;
  const activeToolCursor = activeTool === "pen" ? "cursor-crosshair" : activeTool === "pencil" ? "cursor-crosshair" : activeTool === "brush" ? "cursor-crosshair" : activeTool === "eraser" ? "cursor-cell" : activeTool === "shape" || activeTool === "gradient" ? "cursor-crosshair" : activeTool === "text" ? "cursor-text" : activeTool === "move" ? "cursor-move" : activeTool === "hand" ? "cursor-grab" : "cursor-default";
  const activeToolCursorStyle = editorToolCursor(activeTool);

  return (
    <main className="relative flex h-full min-h-0 flex-col overflow-hidden bg-bg text-text-primary">
      <div role="toolbar" aria-label="Touch view controls" className="z-40 hidden shrink-0 items-center justify-center gap-1 border-b border-border bg-bg px-2 py-1 [@media(pointer:coarse)]:flex">
        <button type="button" aria-label="Pan view" aria-pressed={touchPanEnabled} onClick={() => setTouchPanEnabled((enabled) => !enabled)} className={`group flex h-11 items-center gap-2 rounded-full border px-3 text-xs font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-accent ${touchPanEnabled ? "border-accent/50 bg-accent/15 text-accent shadow-[0_0_12px_rgba(212,255,63,.16)]" : "border-transparent text-text-secondary hover:border-border hover:bg-bg-surface"}`}>
          <span className={`flex h-7 w-7 items-center justify-center rounded-full ${touchPanEnabled ? "bg-accent text-accent-foreground" : "bg-bg-surface text-text-secondary group-hover:text-text-primary"}`}><Hand size={16} strokeWidth={2.1} aria-hidden="true" /></span>
          <span>Pan view</span>
        </button>
        <button type="button" aria-label="Zoom out" disabled={zoom <= 0.25} onClick={() => setZoom((current) => Math.max(0.25, current - 0.25))} className="flex h-11 w-11 items-center justify-center rounded text-text-secondary outline-none disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-accent"><Minus size={17} aria-hidden="true" /></button>
        <output aria-label="View zoom" className="min-w-10 text-center text-xs text-text-secondary">{Math.round(zoom * 100)}%</output>
        <button type="button" aria-label="Zoom in" disabled={zoom >= 3} onClick={() => setZoom((current) => Math.min(3, current + 0.25))} className="flex h-11 w-11 items-center justify-center rounded text-text-secondary outline-none disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-accent"><Plus size={17} aria-hidden="true" /></button>
        <button type="button" aria-label="Reset view" onClick={resetView} className="flex h-11 w-11 items-center justify-center rounded text-text-secondary outline-none focus-visible:ring-2 focus-visible:ring-accent"><RotateCcw size={16} aria-hidden="true" /></button>
      </div>
      <div className="relative min-h-0 flex-1">
        <div
          ref={viewportRef}
          aria-label="Editor viewport"
          onPointerDownCapture={startPan}
          onPointerMoveCapture={movePan}
          onPointerUpCapture={endPan}
          onPointerCancelCapture={endPan}
          onLostPointerCapture={endPan}
          onAuxClick={(event) => {
            if (event.button === 1) event.preventDefault();
          }}
          data-pan-mode={(touchPanEnabled || activeTool === "hand") ? "hand" : "scroll"}
          data-active-tool={activeTool}
          style={{ cursor: isPanning ? "grabbing" : (spaceHeld || touchPanEnabled || activeTool === "hand") ? "grab" : activeToolCursorStyle }}
          className={`absolute inset-0 flex flex-col items-center justify-start overflow-auto overscroll-contain p-5 md:justify-center md:overflow-visible sm:p-8 [@media(pointer:coarse)]:justify-start [@media(pointer:coarse)]:overflow-auto ${(touchPanEnabled || activeTool === "hand") ? "touch-none" : "touch-pan-y"} ${isPanning ? "cursor-grabbing" : (spaceHeld || touchPanEnabled || activeTool === "hand") ? "cursor-grab" : activeToolCursor}`}
        >
          <div
            ref={workspaceRef}
            className="relative my-auto flex max-w-full shrink-0 origin-top flex-col items-center gap-8 md:origin-center md:flex-row md:gap-12 [@media(pointer:coarse)]:origin-top [@media(pointer:coarse)]:flex-col [@media(pointer:coarse)]:gap-8"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              "--editor-inverse-zoom": 1 / zoom,
            } as React.CSSProperties}
          >
            <svg className="pointer-events-none absolute inset-0 z-0 overflow-visible text-accent" width="100%" height="100%" aria-label="Canvas and mockup connections">
              {connectors.map((connection) => (
                <g key={connection.side}>
                  <path d={connection.path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <circle cx={connection.start.x} cy={connection.start.y} r="2.5" fill="currentColor" />
                  <circle cx={connection.end.x} cy={connection.end.y} r="2.5" fill="currentColor" />
                </g>
              ))}
            </svg>
            <section
              aria-label="Print canvas"
              onPointerDown={(event) => startNodeDrag("Print canvas", event)}
              onPointerMove={moveNodeDrag}
              onPointerUp={endNodeDrag}
              onPointerCancel={endNodeDrag}
              onLostPointerCapture={endNodeDrag}
              className={`relative ${menuOpen ? "z-30" : "z-10"} w-[min(18.25rem,78vw)] shrink-0 touch-none select-none ${draggingNode === "Print canvas" ? "cursor-grabbing" : activeToolCursor}`}
              style={{ cursor: draggingNode === "Print canvas" ? "grabbing" : activeToolCursorStyle, transform: `translate(${nodePositions["Print canvas"].x}px, ${nodePositions["Print canvas"].y}px)` }}
            >
              <div className="relative">
                <canvas
                  ref={canvasNodeRef}
                  width={PRINT_CANVAS_SPEC.widthPx}
                  height={PRINT_CANVAS_SPEC.heightPx}
                  data-canvas-width={PRINT_CANVAS_SPEC.widthPx}
                  data-canvas-height={PRINT_CANVAS_SPEC.heightPx}
                  data-resolution-dpi={PRINT_CANVAS_SPEC.resolutionDpi}
                  data-background={PRINT_CANVAS_SPEC.background}
                  data-export-format={PRINT_CANVAS_SPEC.exportFormat}
                  data-size-fixed={PRINT_CANVAS_SPEC.fixedSize}
                  aria-label="Blank print canvas"
                  onDoubleClick={() => activeTool === "pen" && finishPenPath(false)}
                  className={`block w-full touch-none border border-[#36a0e5] shadow-[0_5px_18px_rgba(30,60,90,0.08)] ${activeTool === "shape" ? "cursor-crosshair" : ""}`}
                  style={{
                    backgroundColor: "#ffffff",
                    backgroundImage: "linear-gradient(45deg,#e4e7e3 25%,transparent 25%),linear-gradient(-45deg,#e4e7e3 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e4e7e3 75%),linear-gradient(-45deg,transparent 75%,#e4e7e3 75%)",
                    backgroundSize: "32px 32px",
                    backgroundPosition: "0 0, 0 16px, 16px -16px, -16px 0",
                    cursor: activeTool === "eraser" ? "none" : undefined,
                  }}
                />
                {/* The pasteboard: artwork space around the print area. A drawing or text tool
                    stays live here, so a stroke or a text box can be placed outside the canvas
                    instead of being clipped at its border. It sits under the transform controls
                    and under the mockups (later siblings), so those still take their own input. */}
                {(CANVAS_OUTSIDE_TOOLS.includes(activeTool) || activeTool === "move") && (
                  <div
                    aria-label="Artwork pasteboard"
                    data-editor-pasteboard="true"
                    onPointerDown={activeTool === "move"
                      // Move: pick the layer under the pointer so one parked off the canvas can
                      // be selected and dragged back. A press on empty pasteboard falls through
                      // to the node drag below.
                      ? (event) => { if (pickLayerAt(event)) return; }
                      : startArtworkStroke}
                    onPointerMove={activeTool === "move" ? moveCanvasArtwork : moveArtworkStroke}
                    onPointerUp={activeTool === "move" ? endCanvasArtworkMove : endArtworkStroke}
                    onPointerCancel={activeTool === "move" ? endCanvasArtworkMove : endArtworkStroke}
                    onLostPointerCapture={activeTool === "move" ? endCanvasArtworkMove : endArtworkStroke}
                    onPointerLeave={() => setEraserCursor(null)}
                    onDoubleClick={() => activeTool === "pen" && finishPenPath(false)}
                    // Drawing needs the gesture; Move must not swallow the phone's vertical
                    // scroll, and a tap still selects because pointerdown fires first.
                    className={`absolute z-10 ${activeTool === "move" ? "touch-pan-y" : "touch-none"}`}
                    style={{
                      ...pasteboardSurface,
                      cursor: activeTool === "eraser" ? "none" : activeToolCursorStyle,
                    }}
                  />
                )}
                {activeTool === "eraser" && eraserCursor && (
                  <svg viewBox="0 0 1000 1200" preserveAspectRatio="none" aria-hidden="true" className="pointer-events-none absolute inset-0 z-40 h-full w-full overflow-visible">
                    <g data-editor-eraser-cursor="true">
                      {toolOptions.eraser.shape === "square" ? (
                        <rect
                          x={eraserCursor.x * 1000 - toolOptions.eraser.size / 2}
                          y={eraserCursor.y * 1200 - toolOptions.eraser.size / 2}
                          width={toolOptions.eraser.size}
                          height={toolOptions.eraser.size}
                          rx={(toolOptions.eraser.roundness / 100) * toolOptions.eraser.size / 2}
                          transform={`rotate(${toolOptions.eraser.angle} ${eraserCursor.x * 1000} ${eraserCursor.y * 1200})`}
                          fill="rgba(255,255,255,0.16)"
                          stroke="#111827"
                          strokeWidth="1.5"
                          vectorEffect="non-scaling-stroke"
                        />
                      ) : (
                        <circle
                          cx={eraserCursor.x * 1000}
                          cy={eraserCursor.y * 1200}
                          r={toolOptions.eraser.size / 2}
                          fill="rgba(255,255,255,0.16)"
                          stroke="#111827"
                          strokeWidth="1.5"
                          vectorEffect="non-scaling-stroke"
                        />
                      )}
                    </g>
                  </svg>
                )}
                {showGrid && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-px z-10"
                    style={{
                      backgroundImage: "linear-gradient(to right, rgba(61, 132, 184, 0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(61, 132, 184, 0.4) 1px, transparent 1px)",
                      backgroundSize: "10% 10%",
                    }}
                  />
                )}
                <ArtworkOverlay
                  layers={layers}
                  selectedMaskLayerId={selectedTarget === "mask" ? selectedLayerId : null}
                  maskBrushMode={maskBrushMode}
                  transform={{ x: 0, y: 0 }}
                  layerOffsets={canvasLayerTransforms}
                  moveEnabled={activeTool === "move"}
                  editingTextLayer={editingTextLayer}
                  selectedLayerIds={selectedLayerIds}
                  selectionBounds={selectionBounds}
                  drawingStroke={isDrawingStroke}
                  transformControlsHidden={activeTool === "text"}
                  layerScales={canvasLayerScales}
                  layerOrigins={canvasLayerOrigins}
                  layerRotations={canvasLayerRotations}
                  onMovePick={startCanvasArtworkPress}
                  onMoveBoxPress={startSelectionBoxPress}
                  onMove={moveCanvasArtwork}
                  onMoveEnd={endCanvasArtworkMove}
                  onEditingTextChange={updateEditingText}
                  onEditingTextCommit={commitEditingText}
                  onEditingTextStyle={updateEditingTextStyle}
                  hoveredBounds={hoveredBounds}
                  hoveredRotation={hoveredRotation}
                  onHoverMove={hoverCanvasLayer}
                  onHoverEnd={() => setHoveredLayerId(null)}
                  onResizeStart={startCanvasLayerResize}
                  onResize={resizeCanvasLayer}
                  onResizeEnd={endCanvasLayerResize}
                  onRotateStart={startCanvasLayerRotate}
                  onRotate={rotateCanvasLayer}
                  onRotateEnd={endCanvasLayerRotate}
                />
                {selectedPenLayer && selectedPenPaths.length > 0 && activeTool === "move" && !editingPenPath && (
                  <svg viewBox="0 0 1000 1200" preserveAspectRatio="none" aria-label="Selected Pen path" className="pointer-events-none absolute inset-0 z-30 h-full w-full" style={{ touchAction: "none" }} onPointerMove={moveCanvasArtwork} onPointerUp={endCanvasArtworkMove} onPointerCancel={endCanvasArtworkMove} onLostPointerCapture={endCanvasArtworkMove}>
                    <g transform={penLayerTransform(selectedPenLayer.id)}>
                      {selectedPenPaths.map(({ path, index }) => path.penPath && <path
                        key={`pen-hit-${index}`}
                        d={editorPenPathData(path.penPath)}
                        fill={path.penPath.closed ? "#000000" : "none"}
                        fillOpacity="0.001"
                        stroke="#000000"
                        strokeOpacity="0.001"
                        strokeWidth="36"
                        pointerEvents="painted"
                        className="cursor-move"
                        onPointerDown={startCanvasArtworkMove}
                        onDoubleClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setEditingPenPathLayerId(selectedPenLayer.id);
                          setEditingPenPathIndex(index);
                          setSelectedPenAnchorIndex(null);
                        }}
                      />)}
                    </g>
                  </svg>
                )}
                {editingPenLayer && editingPenPath && (
                  <>
                    <svg viewBox="0 0 1000 1200" preserveAspectRatio="none" aria-label="Pen path point controls" className="pointer-events-none absolute inset-0 z-30 h-full w-full" style={{ touchAction: "none", cursor: activeTool === "pen" ? activeToolCursorStyle : undefined }}>
                      <g transform={penLayerTransform(editingPenLayer.id)}>
                        <path d={editorPenPathData(editingPenPath)} fill="none" stroke="#000000" strokeOpacity="0.001" strokeWidth="34" pointerEvents="stroke" onPointerDown={(event) => addPenNodeOnPath(editingPenLayer.id, activeEditingPenPathIndex, event)} className={activeTool === "pen" ? "" : "cursor-crosshair"} />
                        {editingPenPath.anchors.map((anchor, index) => {
                          const x = anchor.x * 1000;
                          const y = anchor.y * 1200;
                          const selected = selectedPenAnchorIndex === index;
                          return (
                            <g key={`pen-anchor-${index}`}>
                              {anchor.handleIn && <>
                                <line x1={x} y1={y} x2={x + anchor.handleIn.x * 1000} y2={y + anchor.handleIn.y * 1200} stroke="#557c31" strokeWidth="3" />
                                <circle cx={x + anchor.handleIn.x * 1000} cy={y + anchor.handleIn.y * 1200} r="34" fill="transparent" stroke="transparent" pointerEvents="all" className={activeTool === "pen" ? "" : "cursor-crosshair"} aria-label={`Point ${index + 1} incoming curve handle`} onPointerDown={(event) => startPenEditDrag(editingPenLayer.id, activeEditingPenPathIndex, index, "handle-in", event)} />
                                <circle cx={x + anchor.handleIn.x * 1000} cy={y + anchor.handleIn.y * 1200} r="9" fill="white" stroke="#557c31" strokeWidth="4" pointerEvents="none" aria-hidden="true" />
                              </>}
                              {anchor.handleOut && <>
                                <line x1={x} y1={y} x2={x + anchor.handleOut.x * 1000} y2={y + anchor.handleOut.y * 1200} stroke="#557c31" strokeWidth="3" />
                                <circle cx={x + anchor.handleOut.x * 1000} cy={y + anchor.handleOut.y * 1200} r="34" fill="transparent" stroke="transparent" pointerEvents="all" className={activeTool === "pen" ? "" : "cursor-crosshair"} aria-label={`Point ${index + 1} outgoing curve handle`} onPointerDown={(event) => startPenEditDrag(editingPenLayer.id, activeEditingPenPathIndex, index, "handle-out", event)} />
                                <circle cx={x + anchor.handleOut.x * 1000} cy={y + anchor.handleOut.y * 1200} r="9" fill="white" stroke="#557c31" strokeWidth="4" pointerEvents="none" aria-hidden="true" />
                              </>}
                              <circle cx={x} cy={y} r="38" fill="transparent" stroke="transparent" pointerEvents="all" className={activeTool === "pen" ? "" : "cursor-move"} role="button" tabIndex={0} aria-label={`Pen point ${index + 1}; Alt-click or press Delete to remove`} onFocus={() => setSelectedPenAnchorIndex(index)} onKeyDown={(event) => {
                                if (event.key === "Delete" || event.key === "Backspace") {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  removePenNode(editingPenLayer.id, activeEditingPenPathIndex, index);
                                }
                              }} onPointerDown={(event) => startPenEditDrag(editingPenLayer.id, activeEditingPenPathIndex, index, "anchor", event)} />
                              <circle cx={x} cy={y} r={selected ? "15" : "12"} fill={selected ? "#d4ff3f" : "white"} stroke="#557c31" strokeWidth="5" pointerEvents="none" aria-hidden="true" />
                            </g>
                          );
                        })}
                      </g>
                    </svg>
                    <div aria-label="Pen path editing controls" className="pointer-events-none absolute left-1/2 top-2 z-40 flex max-w-[calc(100%-16px)] -translate-x-1/2 items-center gap-2 rounded-xl border border-border bg-bg-surface/95 px-2 py-1 text-[10px] text-text-primary shadow-lg">
                      <span className="hidden sm:inline">Drag points/handles · click path to add · Alt-click point to remove</span>
                      <button type="button" onClick={removeSelectedPenNode} disabled={selectedPenAnchorIndex === null} className="pointer-events-auto rounded-lg border border-border px-2 py-1 disabled:opacity-40">Delete point</button>
                      <button type="button" onClick={() => { setEditingPenPathLayerId(null); setEditingPenPathIndex(null); setSelectedPenAnchorIndex(null); }} className="pointer-events-auto rounded-lg bg-accent px-2 py-1 text-accent-foreground">Done</button>
                    </div>
                  </>
                )}
                {activeTool === "pen" && penAnchors.length > 0 && (
                  <svg aria-label="Pen path preview" viewBox="0 0 1000 1200" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible">
                    <path d={editorPenPathData({ anchors: penAnchors, closed: false }, penHoverPoint)} fill="none" stroke={foregroundColor} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                    {penAnchors.map((point, index) => <g key={`${point.x}-${point.y}-${index}`}>
                      {point.handleIn && <>
                        <line x1={point.x * 1000} y1={point.y * 1200} x2={(point.x + point.handleIn.x) * 1000} y2={(point.y + point.handleIn.y) * 1200} stroke={foregroundColor} strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
                        <circle cx={(point.x + point.handleIn.x) * 1000} cy={(point.y + point.handleIn.y) * 1200} r="5" fill="#ffffff" stroke={foregroundColor} strokeWidth="1.5" vectorEffect="non-scaling-stroke" data-pen-handle-endpoint="in" aria-hidden="true" />
                      </>}
                      {point.handleOut && <>
                        <line x1={point.x * 1000} y1={point.y * 1200} x2={(point.x + point.handleOut.x) * 1000} y2={(point.y + point.handleOut.y) * 1200} stroke={foregroundColor} strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
                        <circle cx={(point.x + point.handleOut.x) * 1000} cy={(point.y + point.handleOut.y) * 1200} r="5" fill="#ffffff" stroke={foregroundColor} strokeWidth="1.5" vectorEffect="non-scaling-stroke" data-pen-handle-endpoint="out" aria-hidden="true" />
                      </>}
                      <circle cx={point.x * 1000} cy={point.y * 1200} r={index === 0 ? (penHoverCloseTarget ? 16 : 13) : 10} fill={index === 0 ? (penHoverCloseTarget ? "#d4ff3f" : "#ffffff") : foregroundColor} stroke={foregroundColor} strokeWidth="2" vectorEffect="non-scaling-stroke" data-pen-close-target={index === 0 && penHoverCloseTarget ? "true" : undefined} />
                    </g>)}
                  </svg>
                )}
                {shapeDrawing && (() => {
                  const previewPaths = createEditorShapePaths(shapeDrawing.preset, shapeDrawing.start, shapeDrawing.current, shapeDrawing.color);
                  const targetShape = layers.find((layer) => layer.id === shapeDrawing.layerId)?.shape;
                  const previewStyle = targetShape?.style ?? defaultEditorShapeStyle(previewPaths);
                  const dash = previewStyle.strokeStyle === "dash" ? `${Math.max(8, (previewStyle.strokeWidth || 8) * 2)} ${Math.max(6, previewStyle.strokeWidth || 8)}` : previewStyle.strokeStyle === "dot" ? `0.01 ${Math.max(8, (previewStyle.strokeWidth || 8) * 2)}` : undefined;
                  return (
                    <svg aria-label="Shape preview" data-editor-shape-preview={shapeDrawing.preset} viewBox="0 0 1000 1200" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible">
                      {previewPaths.map((path, index) => <path key={index} d={roundEditorShapePath(path.d, previewStyle.cornerRadius)} fill={previewStyle.fillEnabled ? previewStyle.fill : "none"} fillOpacity={previewStyle.fillOpacity / 100} stroke={previewStyle.strokeWidth > 0 ? previewStyle.stroke : "none"} strokeWidth={previewStyle.strokeWidth} strokeDasharray={dash} strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />)}
                    </svg>
                  );
                })()}
                {gradientDrawing && (() => {
                  const preview = gradientWithAxis(gradientDrawing, gradientDrawing.current);
                  return (
                    <svg aria-label="Gradient preview" data-editor-gradient-preview={preview.type} viewBox="0 0 1000 1200" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible">
                      <g opacity="0.75">
                        <GradientPreview gradient={preview} idPrefix="gradient-drag-preview" />
                      </g>
                      <line x1={preview.x1} y1={preview.y1} x2={preview.x2} y2={preview.y2} stroke="#ffffff" strokeWidth="2" strokeDasharray="8 8" vectorEffect="non-scaling-stroke" />
                      <circle cx={preview.x1} cy={preview.y1} r="6" fill="#ffffff" stroke="#202124" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                      <circle cx={preview.x2} cy={preview.y2} r="6" fill="#202124" stroke="#ffffff" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                    </svg>
                  );
                })()}
                {activeTool === "pen" && penAnchors.length > 0 && (
                  <div aria-label="Pen tool actions" className="absolute left-1/2 top-2 z-40 flex max-w-[calc(100%-16px)] -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-xl border border-border bg-bg-surface/95 px-2 py-1 text-[10px] text-text-primary shadow-lg">
                    <span className="hidden px-1 sm:inline">Click anchors · drag for curves · Alt-drag for corners · Enter finish · Esc cancel</span>
                    <button type="button" onClick={() => finishPenPath(false)} disabled={penAnchors.length < 2} className="rounded-lg border border-border px-2 py-1 disabled:opacity-40">Finish</button>
                    <button type="button" onClick={() => finishPenPath(true)} disabled={penAnchors.length < 3} className="rounded-lg border border-border px-2 py-1 disabled:opacity-40">Close path</button>
                    <button type="button" onClick={() => { setPenAnchors([]); setPenHoverPoint(null); setPenHoverCloseTarget(false); penAnchorDragRef.current = null; }} className="rounded-lg border border-border px-2 py-1">Cancel</button>
                  </div>
                )}
                <div ref={menuRef} className="absolute -right-5 top-1/2 z-20 -translate-y-1/2">
                  <button
                    type="button"
                    aria-label="Canvas options"
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen((open) => !open)}
                    className="-m-[15px] flex h-11 w-11 items-center justify-center rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-accent md:m-0 md:h-3.5 md:w-3.5 [@media(pointer:coarse)]:-m-[15px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:[transform:scale(var(--editor-inverse-zoom))]"
                  >
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent shadow-sm ring-1 ring-accent/40 hover:bg-accent/80"><span className="h-1 w-1 rounded-full bg-accent-foreground" /></span>
                  </button>
                  {menuOpen && (
                    <div
                      role="menu"
                      aria-label="Canvas options"
                      onPointerDown={(event) => event.stopPropagation()}
                    className="absolute right-0 top-[calc(100%+4px)] z-30 min-w-28 rounded border border-border bg-bg-surface p-0.5 shadow-lg md:left-full md:right-auto md:top-1/2 md:ml-1 md:-translate-y-1/2 [@media(pointer:coarse)]:origin-top-right [@media(pointer:coarse)]:[transform:scale(var(--editor-inverse-zoom))]"
                    >
                      <button
                        type="button"
                        role="menuitemcheckbox"
                        aria-checked={showGrid}
                        onClick={() => {
                          setShowGrid((visible) => !visible);
                          setMenuOpen(false);
                        }}
                        className="flex h-10 w-full items-center gap-1 rounded px-1.5 py-0.5 text-left text-[10px] text-text-primary outline-none hover:bg-bg focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:text-text-faint md:h-5 [@media(pointer:coarse)]:h-10"
                      >
                        <Grid2X2 size={11} aria-hidden="true" />
                        <span>Show Grid</span>
                        <span className={`ml-auto h-2.5 w-2.5 rounded-sm border ${showGrid ? "border-accent bg-accent" : "border-border-light"}`} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        aria-label="Add Front Mockup"
                        title={visibleMockups.includes("Front Mockup") ? "Front Mockup is already attached" : "Attach the Front Mockup box"}
                        disabled={visibleMockups.includes("Front Mockup")}
                        onClick={() => {
                          addMockup("Front Mockup");
                          setMenuOpen(false);
                        }}
                        className="flex h-10 w-full items-center gap-1 rounded px-1.5 py-0.5 text-left text-[10px] text-text-primary outline-none hover:bg-bg focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:text-text-faint md:h-5 [@media(pointer:coarse)]:h-10"
                      >
                        <Plus size={11} aria-hidden="true" />
                        <span>Front Mockup</span>
                      </button>
                      {product === "Phone" ? null : (
                        <button
                          type="button"
                          role="menuitem"
                          aria-label="Add Back Mockup"
                          title={visibleMockups.includes("Back Mockup") ? "Back Mockup is already attached" : "Attach the Back Mockup box"}
                          disabled={visibleMockups.includes("Back Mockup")}
                          onClick={() => {
                            addMockup("Back Mockup");
                            setMenuOpen(false);
                          }}
                          className="flex h-10 w-full items-center gap-1 rounded px-1.5 py-0.5 text-left text-[10px] text-text-primary outline-none hover:bg-bg focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:text-text-faint md:h-5 [@media(pointer:coarse)]:h-10"
                        >
                          <Plus size={11} aria-hidden="true" />
                          <span>Back Mockup</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>
            {mockups.map((side) => (
              <section
                key={side}
                aria-label={side}
                hidden={product === "Phone" && side === "Back Mockup"}
                onPointerDown={(event) => startNodeDrag(side, event)}
                onPointerMove={moveNodeDrag}
                onPointerUp={endNodeDrag}
                onPointerCancel={endNodeDrag}
                onLostPointerCapture={endNodeDrag}
                className={`relative z-10 w-[min(18.25rem,78vw)] shrink-0 touch-pan-y select-none md:touch-none [@media(pointer:coarse)]:touch-pan-y ${draggingNode === side ? "cursor-grabbing" : "cursor-grab"}`}
                style={{ transform: `translate(${nodePositions[side].x}px, ${nodePositions[side].y}px)` }}
              >
                <div data-node-drag-handle className="mb-2 flex h-11 touch-none items-center gap-2 text-xs font-medium text-text-secondary md:h-7 [@media(pointer:coarse)]:h-[calc(2.75rem*var(--editor-inverse-zoom))]">
                  <span className="min-w-0 flex-1 truncate [@media(pointer:coarse)]:[font-size:calc(0.75rem*var(--editor-inverse-zoom))]">{side}</span>
                  <button
                    type="button"
                    aria-label={`Close ${side}`}
                    onClick={() => removeMockup(side)}
                    className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text-muted outline-none hover:bg-bg-surface hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent md:h-5 md:w-5 [@media(pointer:coarse)]:h-[calc(2.75rem*var(--editor-inverse-zoom))] [@media(pointer:coarse)]:w-[calc(2.75rem*var(--editor-inverse-zoom))]"
                  >
                    <X size={13} aria-hidden="true" className="[@media(pointer:coarse)]:[transform:scale(var(--editor-inverse-zoom))]" />
                  </button>
                </div>
                <div
                  ref={(element) => {
                    if (element) mockupSurfaceRefs.current[side] = element;
                    else delete mockupSurfaceRefs.current[side];
                  }}
                  className="relative aspect-square w-full border border-[#a58be8] bg-[#e6e7e9] shadow-[0_5px_18px_rgba(50,35,90,0.08)]"
                >
                  {showGrid && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0"
                      style={{
                        backgroundImage: "linear-gradient(to right, rgba(61, 132, 184, 0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(61, 132, 184, 0.4) 1px, transparent 1px)",
                        backgroundSize: "10% 10%",
                      }}
                    />
                  )}
                  <MockupArtwork
                    side={side}
                    layers={mockupLayers}
                    layerOffsets={canvasLayerTransforms}
                    layerScales={canvasLayerScales}
                    layerOrigins={canvasLayerOrigins}
                    layerRotations={canvasLayerRotations}
                    selectedMaskLayerId={selectedTarget === "mask" ? selectedLayerId : null}
                    maskBrushMode={maskBrushMode}
                    maxArtworkEdgePx={getArtworkMaxEdgePx(side, activeLargeArtworkTierOwner)}
                    onLargeTierRequested={handleLargeTierRequested}
                    onArtworkDisplayedEdgeChange={handleArtworkDisplayedEdgeChange}
                    viewZoom={zoom}
                  />
                </div>
              </section>
            ))}
          </div>
        </div>
        <EditorEditSidebar
          open={editSidebarOpen}
          onToggle={toggleEditSidebar}
          uploadLimitBytes={UPLOAD_MAX_BYTES}
          uploads={canvasUploadLayers}
          onAddDesign={addCanvasDesign}
          onAddElement={addCanvasElementLayer}
          onAddText={addCanvasTextLayer}
          onUploadImage={addCanvasUpload}
        />
        {adjustmentsOpen && <EditorAdjustmentsPanel
          open={adjustmentsOpen}
          onToggle={closeAdjustments}
          selectedLayer={selectedLayer}
          activeTool={activeTool}
          toolOptions={toolOptions}
          onUpdateToolOptions={updateToolOptions}
          onUpdateLayer={updateLayer}
          onUpdateText={updateSelectedText}
          onUpdateTextStyle={updateSelectedTextStyle}
          onUpdateShapeBuilder={updateSelectedShapeBuilder}
          onUpdateShapeStyle={updateSelectedShapeStyle}
          onUpdateImage={updateSelectedImage}
          imagePrintQuality={selectedLayer ? imagePrintQualityById[selectedLayer.id] ?? null : null}
          onUpdateGradient={updateSelectedGradient}
          onAddMask={createLayerMask}
          onRemoveMask={deleteLayerMask}
          onSelectMask={() => setSelectedTarget("mask")}
          onClearErasures={clearErasures}
          placement={selectedLayer ? {
            offset: canvasLayerTransforms[selectedLayer.id] ?? { x: 0, y: 0 },
            scale: canvasLayerScales[selectedLayer.id] ?? { x: 1, y: 1 },
            origin: canvasLayerOrigins[selectedLayer.id] ?? { x: 500, y: 600 },
            rotation: canvasLayerRotations[selectedLayer.id] ?? 0,
          } : null}
          selectedShape={selectedShape}
          onSelectShape={setSelectedShape}
          onNudge={nudgeSelectedLayer}
        />}
        {!adjustmentsOpen && <EditorLayersPanel
          open={layersOpen}
          onToggle={toggleLayersPanel}
          layers={layers}
          selectedLayerId={selectedLayerId}
          selectedLayerIds={selectedLayerIds}
          selectedTarget={selectedTarget}
          onSelectLayer={selectLayer}
          onAddLayer={addLayer}
          onToggleVisibility={toggleLayerVisibility}
          onToggleLock={toggleLayerLock}
          onAddMask={createLayerMask}
          onRemoveMask={deleteLayerMask}
          onRenameLayer={renameLayer}
          onDuplicateLayer={duplicateLayer}
          onDeleteLayer={deleteLayer}
          onMoveLayer={moveLayer}
          onMoveLayerToIndex={moveLayerToIndex}
          onUpdateLayer={updateLayer}
          hoveredLayerId={hoveredLayerId}
          onHoverLayer={setHoveredLayerId}
          printQualityById={imagePrintQualityById}
          onGroupSelected={groupSelectedLayers}
          onUngroupSelected={ungroupSelectedLayers}
          onLinkSelected={linkSelectedLayers}
          onSelectGroup={selectGroup}
          onOpenAdjustments={openAdjustments}
        />}
      </div>
      <EditorToolsBar
        activeTool={activeTool}
        collapsed={toolsCollapsed}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        notice={toolNotice}
        foregroundColor={foregroundColor}
        backgroundColor={backgroundColor}
        selectedShape={selectedShape}
        drawingToolsDisabled={selectedLayer?.kind === "image"}
        onSelect={chooseTool}
        onSelectShape={setSelectedShape}
        onForegroundColorChange={setForegroundColor}
        onBackgroundColorChange={setBackgroundColor}
        onUndo={undoCanvasAction}
        onRedo={redoCanvasAction}
        canFlip={selectedLayerIds.length > 0}
        onFlip={flipSelectedLayers}
        onSwapColors={() => {
          const nextForeground = backgroundColor;
          setBackgroundColor(foregroundColor);
          setForegroundColor(nextForeground);
        }}
        onToggleCollapsed={() => setToolsCollapsed((collapsed) => !collapsed)}
        hideOnMobile={layersOpen || editSidebarOpen}
      />
    </main>
  );
}
