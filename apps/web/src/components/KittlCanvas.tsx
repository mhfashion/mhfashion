"use client";

import { Grid2X2, Hand, Minus, Plus, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MockupArtwork from "@/components/MockupArtwork";
import EditorArtworkLayers from "@/components/EditorArtworkLayers";
import { EDITOR_TEXT_FONT_FAMILY } from "@/components/EditorLayerPreview";
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
import { getFreeTransformResizeAnchor, getFreeTransformResizeFactors, rotateTransformPoint, snapEditorRotationDelta } from "@/lib/editor-transform";
import type { TransformHandle } from "@/lib/editor-transform";
import {
  addLayerMask,
  appendEditorShapePaths,
  appendLayerStroke,
  createEditorArtworkLayer,
  createEditorImageLayer,
  createEditorShapePaths,
  EDITOR_SHAPE_LABELS,
  createEditorTextLayer,
  deleteEditorLayer,
  duplicateEditorLayer,
  groupEditorLayers,
  linkEditorLayers,
  moveEditorLayerToIndex,
  normalizeEditorToolOptions,
  removeLayerMask,
  reorderEditorLayer,
  setEditorLayerText,
  EDITOR_TOOL_OPTIONS_DEFAULT,
  ungroupEditorLayers,
  unlinkEditorLayers,
  updateEditorLayerTextStyle,
  updateEditorImageAdjustments,
  updateEditorPenPath,
  updateEditorShapeBuilderMode,
  applyEditorShapeBuilderOperation,
  updateEditorLayer,
  updateLayerLastStroke,
} from "@/lib/editor-layers";
import type { EditorBrushShape, EditorToolOptions } from "@/lib/editor-layers";
import {
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

// The shared artwork space is 1000 x 1200 units; new text starts centred on it.
const CANVAS_ARTWORK_CENTER = { x: 500, y: 600 };
const DEFAULT_TEXT_FONT_SIZE = 110;
const TEXT_EDIT_BOX_WIDTH = 900;

// Tools that paint onto a layer. A photo layer is edited only through the Photo
// Adjustments panel, so these are disabled while a photo layer is selected.
const DRAWING_TOOLS: EditorTool[] = ["brush", "pencil", "pen", "shape", "gradient", "eraser"];

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
  const hotspot = tool === "pen" ? "12 14" : "2 2";
  const fallbackCursor = tool === "pen" ? "crosshair" : "auto";
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hotspot}, ${fallbackCursor}`;
}

type PanStart = { pointerId: number; startX: number; startY: number; panX: number; panY: number };
type MockupSide = "Front Mockup" | "Back Mockup";
type WorkspaceNode = "Print canvas" | MockupSide;
type Point = { x: number; y: number };
type PenAnchorDrag = { pointerId: number; index: number; point: Point };
type PenEditDrag = { pointerId: number; layerId: string; pathIndex: number; index: number; kind: "anchor" | "handle-in" | "handle-out"; start: Point; origin: EditorPenAnchor };
type CanvasBounds = { x: number; y: number; width: number; height: number };
type CanvasArtworkDrag = { pointerId: number; start: Point; origin: Record<string, Point> };
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
};
type ActiveShapeDrag = { pointerId: number; layerId: string; preset: EditorShapePreset; start: Point; current: Point; color: string };

function layerCanvasBounds(layer: EditorArtworkLayer): CanvasBounds | null {
  const points = [
    ...layer.strokes.flatMap((stroke) => stroke.points.map((point) => ({ x: point.x * 1000, y: point.y * 1200 }))),
    ...(layer.text ? [{ x: layer.text.x - Math.max(layer.text.fontSize, layer.text.value.length * layer.text.fontSize * 0.58) / 2, y: layer.text.y - layer.text.fontSize }, { x: layer.text.x + Math.max(layer.text.fontSize, layer.text.value.length * layer.text.fontSize * 0.58) / 2, y: layer.text.y + layer.text.fontSize * 0.25 }] : []),
    ...(layer.image ? [{ x: layer.image.x, y: layer.image.y }, { x: layer.image.x + layer.image.width, y: layer.image.y + layer.image.height }] : []),
    ...((layer.shape?.paths ?? []).flatMap((path) => {
      const values = path.d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
      return Array.from({ length: Math.floor(values.length / 2) }, (_, index) => ({ x: values[index * 2], y: values[index * 2 + 1] }));
    })),
  ];
  if (!points.length) return null;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.max(0, Math.min(...xs) - 18);
  const minY = Math.max(0, Math.min(...ys) - 18);
  const maxX = Math.min(1000, Math.max(...xs) + 18);
  const maxY = Math.min(1200, Math.max(...ys) + 18);
  return { x: minX, y: minY, width: Math.max(24, maxX - minX), height: Math.max(24, maxY - minY) };
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
  layerScales,
  layerOrigins,
  onMoveStart,
  onMove,
  onMoveEnd,
  onEditingTextChange,
  onEditingTextCommit,
  onEditingTextStyle,
  onResizeStart,
  onResize,
  onResizeEnd,
  layerRotations,
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
  layerScales: Record<string, Point>;
  layerOrigins: Record<string, Point>;
  onMoveStart: (event: React.PointerEvent<SVGRectElement>) => void;
  onMove: (event: React.PointerEvent<SVGSVGElement>) => void;
  onMoveEnd: (event: React.PointerEvent<SVGSVGElement>) => void;
  onEditingTextChange?: (value: string) => void;
  onEditingTextCommit?: () => void;
  onEditingTextStyle?: (update: Partial<Pick<EditorTextContent, "fontSize" | "color" | "fontFamily" | "fontWeight" | "fontStyle" | "textAlign" | "underline" | "letterSpacing" | "lineHeight" | "textTransform" | "textEffect" | "effectColor" | "effectOffset" | "effectBlur" | "outlineWidth" | "textDecoration" | "decorationColor" | "decorationWidth">>) => void;
  onResizeStart: (event: React.PointerEvent<SVGCircleElement>) => void;
  onResize: (event: React.PointerEvent<SVGSVGElement>) => void;
  onResizeEnd: (event: React.PointerEvent<SVGSVGElement>) => void;
  layerRotations: Record<string, number>;
  onRotateStart: (event: React.PointerEvent<SVGCircleElement>) => void;
  onRotate: (event: React.PointerEvent<SVGSVGElement>) => void;
  onRotateEnd: (event: React.PointerEvent<SVGSVGElement>) => void;
}) {
  const editingText = editingTextLayer?.text ?? null;
  const [hoveredHandle, setHoveredHandle] = useState<string | null>(null);
  // Free-transform handles keep a constant on-screen size (like Kittl/Photoshop) even though
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
  const handleHitRadius = 15 / unitScale;
  const handleBoxScale = 10 / unitScale / 12;
  const rotateHitRadius = 17 / unitScale;
  const rotateBoxScale = 11 / unitScale / 20;
  const editingTextLayerId = editingTextLayer?.text ? editingTextLayer.id : null;
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
        {editingText && (
          // Typing goes straight onto the print canvas: the focused field shares the
          // layer's font size and centre, so the caret sits where the text is drawn.
          <foreignObject
            x={editingText.x - TEXT_EDIT_BOX_WIDTH / 2}
            y={editingText.y - editingText.fontSize - 72}
            width={TEXT_EDIT_BOX_WIDTH}
            height={editingText.fontSize * 1.32 + 72}
            pointerEvents="auto"
            data-editor-text-editor="true"
          >
            <div className="flex h-full flex-col items-center gap-2">
              <div className="flex h-10 items-center gap-2 rounded-md bg-white/95 px-2 shadow-md">
                <label className="text-[11px] text-[#202124]">Font size
                  <input type="number" min="24" max="260" value={editingText.fontSize} aria-label="Text font size" onChange={(event) => onEditingTextStyle?.({ fontSize: Number(event.target.value) })} onPointerDown={(event) => event.stopPropagation()} className="ml-1 w-14 rounded border border-[#b8b8b8] px-1 py-1 text-[11px]" />
                </label>
                <label className="flex items-center gap-1 text-[11px] text-[#202124]">Color
                  <input type="color" value={editingText.color} aria-label="Text color" onChange={(event) => onEditingTextStyle?.({ color: event.target.value })} onPointerDown={(event) => event.stopPropagation()} className="h-6 w-7" />
                </label>
              </div>
              <input
                autoFocus
                value={editingText.value}
                aria-label="Type text on the canvas"
                placeholder="Type your text"
                onChange={(event) => onEditingTextChange?.(event.target.value)}
                onBlur={() => onEditingTextCommit?.()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === "Escape") event.currentTarget.blur();
                }}
                onPointerDown={(event) => event.stopPropagation()}
                className="w-full border-0 bg-transparent leading-none outline-none placeholder:text-[#9aa0a6]"
                style={{
                  height: `${editingText.fontSize * 1.32}px`,
                  lineHeight: `${editingText.fontSize * (editingText.lineHeight ?? 1.2)}px`,
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
        )}
      </g>
      {moveEnabled && <rect x="0" y="0" width="1000" height="1200" fill="transparent" onPointerDown={onMoveStart} className="pointer-events-auto cursor-move touch-none" aria-label="Move canvas artwork" />}
      {selectedLayerIds.length > 0 && selectionBounds && !editingText && !drawingStroke && (
        <g pointerEvents="none" data-editor-transform-controls="true" transform={`rotate(${transformRotation} ${selectionBounds.x + selectionBounds.width / 2} ${selectionBounds.y + selectionBounds.height / 2})`}>
          <rect x={selectionBounds.x} y={selectionBounds.y} width={selectionBounds.width} height={selectionBounds.height} fill="none" stroke="#4c9dff" strokeWidth="1.25" vectorEffect="non-scaling-stroke" data-transform-outline="true" />
          {resizeHandles.map((handle) => (
            <g
              key={handle.key}
              data-resize-handle={handle.key}
              className={handle.cursor}
              onPointerEnter={() => setHoveredHandle(handle.key)}
              onPointerLeave={() => setHoveredHandle((current) => (current === handle.key ? null : current))}
            >
              <circle cx={handle.x} cy={handle.y} r={handleHitRadius} fill="transparent" pointerEvents="auto" onPointerDown={onResizeStart} aria-label={`Resize selected layer ${handle.key}`} aria-description="Drag to resize. Hold Shift to stretch freely; hold Alt or Option to scale from the center." />
              <g transform={`translate(${handle.x} ${handle.y}) rotate(${handle.angle}) scale(${handleBoxScale})`} pointerEvents="none">
                <rect x="-6" y="-6" width="12" height="12" rx="2.5" fill="#ffffff" stroke="#4c9dff" strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
                {hoveredHandle === handle.key && (
                  <path d={resizeHandleGlyphPath(handle.angle)} fill="none" stroke="#202124" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" data-resize-glyph="true" />
                )}
              </g>
            </g>
          ))}
          <circle cx={selectionBounds.x + selectionBounds.width / 2} cy={selectionBounds.y + selectionBounds.height + 58} r={rotateHitRadius} fill="transparent" pointerEvents="auto" onPointerDown={onRotateStart} className="cursor-grab" aria-label="Rotate selected layer" aria-description="Drag to rotate. Hold Shift to snap to 15-degree increments." />
          <g transform={`translate(${selectionBounds.x + selectionBounds.width / 2} ${selectionBounds.y + selectionBounds.height + 58}) scale(${rotateBoxScale})`} pointerEvents="none" data-rotate-handle="true">
            <circle r="10" fill="#ffffff" stroke="#4c9dff" strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
            <path d="M2-5a5 5 0 1 0 3 7M2-5v3m0-3h3" fill="none" stroke="#202124" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" data-rotate-glyph="true" />
          </g>
          <g transform={`translate(${selectionBounds.x + selectionBounds.width / 2 - 22} ${selectionBounds.y + selectionBounds.height + 78})`} data-rotation-angle="true">
            <rect width="44" height="18" rx="9" fill="#ffffff" fillOpacity="0.94" stroke="#4c9dff" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <text x="22" y="12" textAnchor="middle" fontSize="10" fontFamily="ui-sans-serif, system-ui" fill="#202124">{displayRotation}°</text>
          </g>
        </g>
      )}
    </svg>
  );
}

export default function KittlCanvas({ product }: { product: EditorProduct }) {
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
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>(["layer-1"]);
  const [mockups, setMockups] = useState<MockupSide[]>([]);
  const [layers, setLayers] = useState<EditorArtworkLayer[]>(() => [createEditorArtworkLayer("layer-1", "Layer 1")]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>("layer-1");
  const [selectedTarget, setSelectedTarget] = useState<LayerEditTarget>("artwork");
  const [maskBrushMode, setMaskBrushMode] = useState<MaskBrushMode>("hide");
  const [nextGroupId, setNextGroupId] = useState(1);
  const [nextLinkId, setNextLinkId] = useState(1);
  const nextLayerIdRef = useRef(2);
  const nextTextLayerLabelRef = useRef(1);
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
  const visibleMockups = useMemo(
    () => product === "Phone" ? mockups.filter((side) => side === "Front Mockup") : mockups,
    [mockups, product],
  );
  const canvasLayerOrigins = useMemo(() => Object.fromEntries(layers.flatMap((layer) => {
    const bounds = layerCanvasBounds(layer);
    return bounds ? [[layer.id, { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }]] : [];
  })), [layers]);
  const selectionBounds = useMemo(() => {
    const bounds = selectedLayerIds.flatMap((id) => {
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
        return selectedLayerIds.length === 1 ? scaled : rotateTransformPoint(scaled, { x: pivot.x + offset.x, y: pivot.y + offset.y }, rotation);
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
  }, [canvasLayerRotations, canvasLayerScales, canvasLayerTransforms, canvasLayerOrigins, layers, selectedLayerIds]);
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
  const workspaceRef = useRef<HTMLDivElement>(null);
  const canvasNodeRef = useRef<HTMLCanvasElement>(null);
  const mockupSurfaceRefs = useRef<Partial<Record<MockupSide, HTMLDivElement>>>({});
  const menuRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef<PanStart | null>(null);
  const panGestureRef = useRef(false);
  const activeNodeDragRef = useRef<ActiveNodeDrag | null>(null);
  const activeArtworkStrokeRef = useRef<ActiveArtworkStroke | null>(null);
  const activeShapeDragRef = useRef<ActiveShapeDrag | null>(null);
  const penAnchorDragRef = useRef<PenAnchorDrag | null>(null);
  const penEditDragRef = useRef<PenEditDrag | null>(null);
  const penEditWindowHandlersRef = useRef<{ move: (event: PointerEvent) => void; end: (event: PointerEvent) => void } | null>(null);
  const activeEraserRef = useRef<{ pointerId: number; layerId: string; target: LayerEditTarget } | null>(null);
  const canvasArtworkDragRef = useRef<CanvasArtworkDrag | null>(null);
  const canvasLayerResizeRef = useRef<CanvasLayerResizeDrag | null>(null);
  const canvasLayerRotateRef = useRef<CanvasLayerRotateDrag | null>(null);
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

  function toCanvasPoint(clientX: number, clientY: number): Point {
    const rect = canvasNodeRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    };
  }

  function rememberLayerSnapshot() {
    setUndoStack((current) => [...current.slice(-29), layers]);
    setRedoStack([]);
  }

  function eraseArtworkAt(point: Point, layerId: string, target: LayerEditTarget) {
    const radiusPx = toolOptions.eraser.size;
    const isTouched = (stroke: { points: Point[] }) => stroke.points.some((strokePoint) =>
      Math.hypot(
        (strokePoint.x - point.x) * PRINT_CANVAS_SPEC.widthPx,
        (strokePoint.y - point.y) * PRINT_CANVAS_SPEC.heightPx,
      ) <= radiusPx,
    );
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

  function resolveLinkedLayerIds(ids: string[]) {
    const resolved = new Set(ids);
    ids.forEach((id) => {
      const linkId = layers.find((layer) => layer.id === id)?.linkId;
      if (linkId) layers.filter((layer) => layer.linkId === linkId).forEach((layer) => resolved.add(layer.id));
    });
    return [...resolved];
  }

  function startCanvasArtworkMove(event: React.PointerEvent<SVGElement>) {
    if (event.button !== 0 || !event.isPrimary) return;
    event.preventDefault();
    event.stopPropagation();
    const movableIds = resolveLinkedLayerIds(selectedLayerIds).filter((id) => {
      const layer = layers.find((item) => item.id === id);
      return !!layer && !layer.locked;
    });
    if (movableIds.length === 0) return;
    const start = toCanvasPoint(event.clientX, event.clientY);
    (event.currentTarget.ownerSVGElement ?? event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId);
    const origin = Object.fromEntries(movableIds.map((id) => [id, canvasLayerTransforms[id] ?? { x: 0, y: 0 }]));
    canvasArtworkDragRef.current = { pointerId: event.pointerId, start, origin };
  }
  function moveCanvasArtwork(event: React.PointerEvent<SVGSVGElement>) {
    const drag = canvasArtworkDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const point = toCanvasPoint(event.clientX, event.clientY);
    const delta = { x: (point.x - drag.start.x) * 1000, y: (point.y - drag.start.y) * 1200 };
    setCanvasLayerTransforms((current) => ({ ...current, ...Object.fromEntries(Object.entries(drag.origin).map(([id, origin]) => [id, {
      x: Math.max(-420, Math.min(420, origin.x + delta.x)),
      y: Math.max(-520, Math.min(520, origin.y + delta.y)),
    }])) }));
  }
  function endCanvasArtworkMove(event: React.PointerEvent<SVGSVGElement>) {
    if (canvasArtworkDragRef.current?.pointerId === event.pointerId) canvasArtworkDragRef.current = null;
  }

  function startCanvasLayerResize(event: React.PointerEvent<SVGCircleElement>) {
    if (event.button !== 0 || !event.isPrimary || selectedLayerIds.length === 0) return;
    event.preventDefault();
    event.stopPropagation();
    const ids = resolveLinkedLayerIds(selectedLayerIds).filter((id) => !layers.find((layer) => layer.id === id)?.locked);
    if (!ids.length || !selectionBounds) return;
    const startNormalized = toCanvasPoint(event.clientX, event.clientY);
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
    const normalized = toCanvasPoint(event.clientX, event.clientY);
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
    if (canvasLayerResizeRef.current?.pointerId === event.pointerId) canvasLayerResizeRef.current = null;
  }

  function startCanvasLayerRotate(event: React.PointerEvent<SVGCircleElement>) {
    if (event.button !== 0 || !event.isPrimary || !selectionBounds || selectedLayerIds.length === 0) return;
    event.preventDefault();
    event.stopPropagation();
    const ids = resolveLinkedLayerIds(selectedLayerIds).filter((id) => !layers.find((layer) => layer.id === id)?.locked);
    if (!ids.length) return;
    const center = { x: selectionBounds.x + selectionBounds.width / 2, y: selectionBounds.y + selectionBounds.height / 2 };
    const normalized = toCanvasPoint(event.clientX, event.clientY);
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
    const normalized = toCanvasPoint(event.clientX, event.clientY);
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

  function finishPenPath(close = false) {
    if (penAnchors.length < 2) {
      setPenAnchors([]);
      setPenHoverPoint(null);
      setPenHoverCloseTarget(false);
      return;
    }
    const selectedLayer = layers.find((layer) => layer.id === selectedLayerId);
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

  function addPenAnchor(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.button !== 0 || !event.isPrimary || isCanvasEdgeGesture(event.clientX, event.clientY)) return;
    const selectedLayer = layers.find((layer) => layer.id === selectedLayerId);
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
    const previous = penAnchors[penAnchors.length - 1];
    const point = event.shiftKey && previous ? snapEditorPenPoint(rawPoint, previous) : rawPoint;
    const index = penAnchors.length;
    setPenAnchors((current) => [...current, point]);
    setPenHoverPoint(point);
    setPenHoverCloseTarget(false);
    event.currentTarget.setPointerCapture(event.pointerId);
    penAnchorDragRef.current = { pointerId: event.pointerId, index, point };
  }

  function startShapeDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    if (activeShapeDragRef.current || event.button !== 0 || !event.isPrimary || isCanvasEdgeGesture(event.clientX, event.clientY)) return;
    const selectedLayer = layers.find((layer) => layer.id === selectedLayerId);
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

  function startArtworkStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    if (activeArtworkStrokeRef.current || event.button !== 0 || !event.isPrimary || isCanvasEdgeGesture(event.clientX, event.clientY)) return;
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
    if (["remove-bg", "shape", "gradient"].includes(activeTool)) {
      event.preventDefault();
      event.stopPropagation();
      setToolNotice(activeTool === "gradient"
          ? "Gradient Tool is ready for the upcoming gradient-fill pipeline."
          : "Remove BG needs an uploaded image; background removal is not connected yet.");
      return;
    }
    const point = toCanvasPoint(event.clientX, event.clientY);
    if (activeTool === "text") {
      event.preventDefault();
      event.stopPropagation();
      const selected = layers.find((layer) => layer.id === selectedLayerId);
      // Photoshop rule: typing on an existing text layer edits that layer in place
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
    if (!selectedLayer || selectedLayer.locked || (selectedTarget === "mask" && selectedLayer.mask === null)) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    if (activeTool === "eraser") {
      rememberLayerSnapshot();
      activeEraserRef.current = { pointerId: event.pointerId, layerId: selectedLayer.id, target: selectedTarget };
      eraseArtworkAt(point, selectedLayer.id, selectedTarget);
      return;
    }
    const tool = activeTool === "brush" ? "brush" : "pen";
    const brushSettings = activeTool === "brush" ? toolOptions.brush : toolOptions.pencil;
    const effectiveMaskBrushMode: MaskBrushMode = selectedTarget === "mask" && foregroundColor.toLowerCase() === "#ffffff" ? "reveal" : "hide";
    if (selectedTarget === "mask") setMaskBrushMode(effectiveMaskBrushMode);
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
      },
      activeStroke.maskBrushMode,
    ));
  }

  function moveArtworkStroke(event: React.PointerEvent<HTMLCanvasElement>) {
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
            ? draggedEditorPenAnchor(drag.point, point)
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
      eraseArtworkAt(toCanvasPoint(event.clientX, event.clientY), eraser.layerId, eraser.target);
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
      },
      active.maskBrushMode,
    ));
  }

  function endArtworkStroke(event: React.PointerEvent<HTMLCanvasElement>) {
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
    if (activeEraserRef.current?.pointerId === event.pointerId) activeEraserRef.current = null;
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
    if (tool === "pen" || tool === "shape") setSelectedTarget("artwork");
    setToolNotice(tool === "remove-bg"
      ? "Remove BG needs an uploaded image; background removal is not connected yet."
      : tool === "gradient"
          ? "Gradient Tool is ready for the upcoming gradient-fill pipeline."
          : "");
  }

  function startNodeDrag(node: WorkspaceNode, event: React.PointerEvent<HTMLElement>) {
    if (activeNodeDragRef.current || event.button !== 0 || !event.isPrimary) return;
    if (activeTool === "hand") return;
    if (event.target instanceof Element && event.target.closest("button, input, textarea, select")) return;
    if (node === "Print canvas" && event.target instanceof HTMLCanvasElement && !isCanvasEdgeGesture(event.clientX, event.clientY) && activeTool !== "move") return;
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
    const content: EditorTextContent = {
      value: source?.value ?? "",
      x: position?.x ?? source?.x ?? CANVAS_ARTWORK_CENTER.x,
      y: position?.y ?? source?.y ?? CANVAS_ARTWORK_CENTER.y,
      fontSize: source?.fontSize ?? DEFAULT_TEXT_FONT_SIZE,
      color: source?.color ?? foregroundColor,
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
  }) {
    setToolOptions((current) => normalizeEditorToolOptions({
      brush: { ...current.brush, ...patch.brush },
      pencil: { ...current.pencil, ...patch.pencil },
      eraser: { ...current.eraser, ...patch.eraser },
      pen: { ...current.pen, ...patch.pen },
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
          className={`absolute inset-0 flex flex-col items-center justify-start overflow-auto overscroll-contain p-5 md:justify-center md:overflow-hidden sm:p-8 [@media(pointer:coarse)]:justify-start [@media(pointer:coarse)]:overflow-auto ${(touchPanEnabled || activeTool === "hand") ? "touch-none" : "touch-pan-y"} ${isPanning ? "cursor-grabbing" : (spaceHeld || touchPanEnabled || activeTool === "hand") ? "cursor-grab" : activeToolCursor}`}
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
                  onPointerDown={startArtworkStroke}
                  onPointerMove={moveArtworkStroke}
                  onPointerUp={endArtworkStroke}
                  onPointerCancel={endArtworkStroke}
                  onLostPointerCapture={endArtworkStroke}
                  onDoubleClick={() => activeTool === "pen" && finishPenPath(false)}
                  className={`block w-full touch-none border border-[#36a0e5] shadow-[0_5px_18px_rgba(30,60,90,0.08)] ${activeTool === "shape" ? "cursor-crosshair" : ""}`}
                  style={{
                    backgroundColor: "#ffffff",
                    backgroundImage: "linear-gradient(45deg,#e4e7e3 25%,transparent 25%),linear-gradient(-45deg,#e4e7e3 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e4e7e3 75%),linear-gradient(-45deg,transparent 75%,#e4e7e3 75%)",
                    backgroundSize: "32px 32px",
                    backgroundPosition: "0 0, 0 16px, 16px -16px, -16px 0",
                  }}
                />
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
                  layerScales={canvasLayerScales}
                  layerOrigins={canvasLayerOrigins}
                  layerRotations={canvasLayerRotations}
                  onMoveStart={startCanvasArtworkMove}
                  onMove={moveCanvasArtwork}
                  onMoveEnd={endCanvasArtworkMove}
                  onEditingTextChange={updateEditingText}
                  onEditingTextCommit={commitEditingText}
                  onEditingTextStyle={updateEditingTextStyle}
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
                {shapeDrawing && (
                  <svg aria-label="Shape preview" data-editor-shape-preview={shapeDrawing.preset} viewBox="0 0 1000 1200" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible">
                    {createEditorShapePaths(shapeDrawing.preset, shapeDrawing.start, shapeDrawing.current, shapeDrawing.color).map((path, index) => <path key={index} d={path.d} fill={path.fill ?? "none"} stroke={path.stroke ?? "none"} strokeWidth={path.strokeWidth ?? 0} strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />)}
                  </svg>
                )}
                {activeTool === "pen" && penAnchors.length > 0 && (
                  <div aria-label="Pen tool actions" className="absolute left-1/2 top-2 z-40 flex max-w-[calc(100%-16px)] -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-xl border border-border bg-bg-surface/95 px-2 py-1 text-[10px] text-text-primary shadow-lg">
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
                    layers={layers}
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
          onUpdateImage={updateSelectedImage}
          onAddMask={createLayerMask}
          onRemoveMask={deleteLayerMask}
          onSelectMask={() => setSelectedTarget("mask")}
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
