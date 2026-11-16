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
import {
  addLayerMask,
  appendLayerStroke,
  createEditorArtworkLayer,
  createEditorImageLayer,
  createEditorShapeLayer,
  createEditorTextLayer,
  deleteEditorLayer,
  duplicateEditorLayer,
  groupEditorLayers,
  linkEditorLayers,
  moveEditorLayerToIndex,
  removeLayerMask,
  reorderEditorLayer,
  setEditorLayerText,
  ungroupEditorLayers,
  unlinkEditorLayers,
  updateEditorLayerTextStyle,
  updateEditorPenPath,
  updateEditorShapeBuilderMode,
  applyEditorShapeBuilderOperation,
  updateEditorLayer,
  updateLayerLastStroke,
} from "@/lib/editor-layers";
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
  EditorTextContent,
  LayerEditTarget,
  MaskBrushMode,
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

type PanStart = { pointerId: number; startX: number; startY: number; panX: number; panY: number };
type MockupSide = "Front Mockup" | "Back Mockup";
type WorkspaceNode = "Print canvas" | MockupSide;
type Point = { x: number; y: number };
type PenAnchorDrag = { pointerId: number; index: number; point: Point };
type PenEditDrag = { pointerId: number; layerId: string; index: number; kind: "anchor" | "handle-in" | "handle-out"; start: Point; origin: EditorPenAnchor };
type CanvasBounds = { x: number; y: number; width: number; height: number };
type CanvasArtworkDrag = { pointerId: number; start: Point; origin: Record<string, Point> };
type CanvasLayerResizeDrag = { pointerId: number; start: Point; origin: Record<string, number>; handle: string };
type CanvasLayerRotateDrag = { pointerId: number; center: Point; startAngle: number; origin: Record<string, number> };
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
};

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
  layerScales,
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
  layerScales: Record<string, number>;
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
  const editingTextLayerId = editingTextLayer?.text ? editingTextLayer.id : null;
  const resizeHandles = [
    { key: "top-left", x: selectionBounds?.x ?? 0, y: selectionBounds?.y ?? 0 },
    { key: "top-center", x: (selectionBounds?.x ?? 0) + (selectionBounds?.width ?? 0) / 2, y: selectionBounds?.y ?? 0 },
    { key: "top-right", x: (selectionBounds?.x ?? 0) + (selectionBounds?.width ?? 0), y: selectionBounds?.y ?? 0 },
    { key: "middle-left", x: selectionBounds?.x ?? 0, y: (selectionBounds?.y ?? 0) + (selectionBounds?.height ?? 0) / 2 },
    { key: "middle-right", x: (selectionBounds?.x ?? 0) + (selectionBounds?.width ?? 0), y: (selectionBounds?.y ?? 0) + (selectionBounds?.height ?? 0) / 2 },
    { key: "bottom-left", x: selectionBounds?.x ?? 0, y: (selectionBounds?.y ?? 0) + (selectionBounds?.height ?? 0) },
    { key: "bottom-center", x: (selectionBounds?.x ?? 0) + (selectionBounds?.width ?? 0) / 2, y: (selectionBounds?.y ?? 0) + (selectionBounds?.height ?? 0) },
    { key: "bottom-right", x: (selectionBounds?.x ?? 0) + (selectionBounds?.width ?? 0), y: (selectionBounds?.y ?? 0) + (selectionBounds?.height ?? 0) },
  ];
  return (
    <svg viewBox="0 0 1000 1200" preserveAspectRatio="xMidYMid meet" onPointerMove={(event) => { onMove(event); onResize(event); onRotate(event); }} onPointerUp={(event) => { onMoveEnd(event); onResizeEnd(event); onRotateEnd(event); }} onPointerCancel={(event) => { onMoveEnd(event); onResizeEnd(event); onRotateEnd(event); }} onLostPointerCapture={(event) => { onMoveEnd(event); onResizeEnd(event); onRotateEnd(event); }} className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible">
      <g transform={`translate(${500 + transform.x} ${600 + transform.y}) translate(-500 -600)`}>
        <EditorArtworkLayers
          layers={layers}
          layerOffsets={layerOffsets}
          selectedMaskLayerId={selectedMaskLayerId}
          maskBrushMode={maskBrushMode}
          hiddenTextLayerId={editingTextLayerId}
          layerScales={layerScales}
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
      {selectedLayerIds.length > 0 && selectionBounds && !editingText && (
        <g pointerEvents="none" data-editor-transform-controls="true">
          <rect x={selectionBounds.x} y={selectionBounds.y} width={selectionBounds.width} height={selectionBounds.height} fill="none" stroke="#4c9d16" strokeDasharray="10 8" strokeWidth="4" />
          {resizeHandles.map((handle) => (
            <circle key={handle.key} cx={handle.x} cy={handle.y} r="18" fill="#4c9d16" stroke="white" strokeWidth="5" pointerEvents="auto" data-resize-handle={handle.key} onPointerDown={onResizeStart} aria-label={`Resize selected layer ${handle.key}`} />
          ))}
          <line x1={(selectionBounds.x + selectionBounds.width / 2)} y1={selectionBounds.y + selectionBounds.height} x2={(selectionBounds.x + selectionBounds.width / 2)} y2={selectionBounds.y + selectionBounds.height + 48} stroke="#4c9d16" strokeWidth="4" />
          <circle cx={selectionBounds.x + selectionBounds.width / 2} cy={selectionBounds.y + selectionBounds.height + 70} r="18" fill="#4c9d16" stroke="white" strokeWidth="5" pointerEvents="auto" onPointerDown={onRotateStart} aria-label="Rotate selected layer" />
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
  const [toolNotice, setToolNotice] = useState("");
  const [foregroundColor, setForegroundColor] = useState("#202124");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [penAnchors, setPenAnchors] = useState<EditorPenAnchor[]>([]);
  const [penHoverPoint, setPenHoverPoint] = useState<Point | null>(null);
  const [penHoverCloseTarget, setPenHoverCloseTarget] = useState(false);
  const [editingPenPathLayerId, setEditingPenPathLayerId] = useState<string | null>(null);
  const [selectedPenAnchorIndex, setSelectedPenAnchorIndex] = useState<number | null>(null);
  const [undoStack, setUndoStack] = useState<EditorArtworkLayer[][]>([]);
  const [redoStack, setRedoStack] = useState<EditorArtworkLayer[][]>([]);
  const [canvasLayerTransforms, setCanvasLayerTransforms] = useState<Record<string, Point>>({});
  const [canvasLayerScales, setCanvasLayerScales] = useState<Record<string, number>>({});
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
  const selectionBounds = useMemo(() => {
    const bounds = selectedLayerIds.flatMap((id) => {
      const layer = layers.find((item) => item.id === id);
      const base = layer ? layerCanvasBounds(layer) : null;
      if (!base) return [];
      const scale = canvasLayerScales[id] ?? 1;
      const offset = canvasLayerTransforms[id] ?? { x: 0, y: 0 };
      return [{
        x: 500 + offset.x + (base.x - 500) * scale,
        y: 600 + offset.y + (base.y - 600) * scale,
        width: base.width * scale,
        height: base.height * scale,
      }];
    });
    return unionCanvasBounds(bounds);
  }, [canvasLayerScales, canvasLayerTransforms, layers, selectedLayerIds]);
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
  const penAnchorDragRef = useRef<PenAnchorDrag | null>(null);
  const penEditDragRef = useRef<PenEditDrag | null>(null);
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
    const handToolPan = (activeTool === "hand" || activeTool === "pan") && event.button === 0;
    const touchPan = (touchPanEnabled || activeTool === "hand" || activeTool === "pan") && event.pointerType === "touch" && event.isPrimary;
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
    const radiusPx = 180;
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
    setCanvasLayerTransforms(() => Object.fromEntries(Object.entries(drag.origin).map(([id, origin]) => [id, {
      x: Math.max(-420, Math.min(420, origin.x + delta.x)),
      y: Math.max(-520, Math.min(520, origin.y + delta.y)),
    }])));
  }
  function endCanvasArtworkMove(event: React.PointerEvent<SVGSVGElement>) {
    if (canvasArtworkDragRef.current?.pointerId === event.pointerId) canvasArtworkDragRef.current = null;
  }

  function startCanvasLayerResize(event: React.PointerEvent<SVGCircleElement>) {
    if (event.button !== 0 || !event.isPrimary || selectedLayerIds.length === 0) return;
    event.preventDefault();
    event.stopPropagation();
    const ids = resolveLinkedLayerIds(selectedLayerIds).filter((id) => !layers.find((layer) => layer.id === id)?.locked);
    if (!ids.length) return;
    const start = toCanvasPoint(event.clientX, event.clientY);
    event.currentTarget.parentElement?.setPointerCapture(event.pointerId);
    canvasLayerResizeRef.current = {
      pointerId: event.pointerId,
      start,
      origin: Object.fromEntries(ids.map((id) => [id, canvasLayerScales[id] ?? 1])),
      handle: event.currentTarget.getAttribute("data-resize-handle") ?? "bottom-right",
    };
  }

  function resizeCanvasLayer(event: React.PointerEvent<SVGSVGElement>) {
    const drag = canvasLayerResizeRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const point = toCanvasPoint(event.clientX, event.clientY);
    const horizontalDelta = point.x - drag.start.x;
    const verticalDelta = point.y - drag.start.y;
    const axisDelta = drag.handle.includes("left") || drag.handle.includes("right") ? horizontalDelta : verticalDelta;
    const direction = drag.handle.includes("left") || drag.handle.includes("top") ? -1 : 1;
    const delta = axisDelta * direction * 1000;
    const factor = Math.max(0.25, Math.min(3, 1 + delta / 500));
    setCanvasLayerScales(Object.fromEntries(Object.entries(drag.origin).map(([id, scale]) => [id, Math.max(0.25, Math.min(3, scale * factor))])));
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
    const start = toCanvasPoint(event.clientX, event.clientY);
    event.currentTarget.parentElement?.setPointerCapture(event.pointerId);
    canvasLayerRotateRef.current = {
      pointerId: event.pointerId,
      center,
      startAngle: Math.atan2(start.y * 1200 - center.y, start.x * 1000 - center.x) * (180 / Math.PI),
      origin: Object.fromEntries(ids.map((id) => [id, canvasLayerRotations[id] ?? 0])),
    };
  }

  function rotateCanvasLayer(event: React.PointerEvent<SVGSVGElement>) {
    const drag = canvasLayerRotateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const point = toCanvasPoint(event.clientX, event.clientY);
    const angle = Math.atan2(point.y * 1200 - drag.center.y, point.x * 1000 - drag.center.x) * (180 / Math.PI);
    const delta = angle - drag.startAngle;
    setCanvasLayerRotations(Object.fromEntries(Object.entries(drag.origin).map(([id, rotation]) => [id, rotation + delta])));
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
    const penPath: EditorPenPath = { anchors: penAnchors, closed: close };
    const pathData = editorPenPathData(penPath);
    const id = claimLayerId();
    rememberLayerSnapshot();
    const shapeLayer = createEditorShapeLayer(id, `Pen path ${nextLayerIdRef.current - 1}`, {
      paths: [{ d: pathData, fill: close ? foregroundColor : "none", stroke: foregroundColor, strokeWidth: 18, penPath }],
    });
    setLayers((current) => [shapeLayer, ...current]);
    setSelectedLayerId(id);
    setSelectedLayerIds([id]);
    setSelectedTarget("artwork");
    setPenAnchors([]);
    setPenHoverPoint(null);
    setPenHoverCloseTarget(false);
    setActiveTool("move");
    setToolNotice("Pen path added. Double-click it to edit points.");
    revealLayersStack();
  }

  function addPenAnchor(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.button !== 0 || !event.isPrimary || isCanvasEdgeGesture(event.clientX, event.clientY)) return;
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

  function penPathForLayer(layerId: string): EditorPenPath | null {
    const layer = layers.find((item) => item.id === layerId);
    return layer?.shape?.paths[0]?.penPath ?? null;
  }

  function penLayerTransform(layerId: string) {
    const offset = canvasLayerTransforms[layerId] ?? { x: 0, y: 0 };
    const scale = canvasLayerScales[layerId] ?? 1;
    const rotation = canvasLayerRotations[layerId] ?? 0;
    return `translate(${offset.x} ${offset.y}) translate(500 600) rotate(${rotation}) scale(${scale}) translate(-500 -600)`;
  }

  function toPenLayerPoint(clientX: number, clientY: number, layerId: string): Point {
    const point = toCanvasPoint(clientX, clientY);
    const canvasX = point.x * 1000;
    const canvasY = point.y * 1200;
    const offset = canvasLayerTransforms[layerId] ?? { x: 0, y: 0 };
    const scale = Math.max(0.001, canvasLayerScales[layerId] ?? 1);
    const rotation = (canvasLayerRotations[layerId] ?? 0) * Math.PI / 180;
    const translatedX = (canvasX - offset.x - 500) / scale;
    const translatedY = (canvasY - offset.y - 600) / scale;
    return {
      x: (500 + translatedX * Math.cos(rotation) + translatedY * Math.sin(rotation)) / 1000,
      y: (600 - translatedX * Math.sin(rotation) + translatedY * Math.cos(rotation)) / 1200,
    };
  }

  function updatePenLayer(layerId: string, penPath: EditorPenPath) {
    setLayers((current) => updateEditorPenPath(current, layerId, penPath, editorPenPathData(penPath)));
  }

  function startPenEditDrag(
    layerId: string,
    index: number,
    kind: PenEditDrag["kind"],
    event: React.PointerEvent<SVGCircleElement>,
  ) {
    if (event.button !== 0 || !event.isPrimary) return;
    event.preventDefault();
    event.stopPropagation();
    const path = penPathForLayer(layerId);
    const origin = path?.anchors[index];
    if (!path || !origin) return;
    if (kind === "anchor" && event.altKey) {
      const next = removeEditorPenAnchor(path, index);
      if (next) {
        rememberLayerSnapshot();
        updatePenLayer(layerId, next);
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
      index,
      kind,
      start: toPenLayerPoint(event.clientX, event.clientY, layerId),
      origin: { ...origin },
    };
    event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId);
  }

  function movePenEditNode(event: React.PointerEvent<SVGSVGElement>) {
    const drag = penEditDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const path = penPathForLayer(drag.layerId);
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
    updatePenLayer(drag.layerId, { ...path, anchors });
  }

  function endPenEditDrag(event: React.PointerEvent<SVGSVGElement>) {
    if (penEditDragRef.current?.pointerId === event.pointerId) penEditDragRef.current = null;
  }

  function addPenNodeOnPath(layerId: string, event: React.PointerEvent<SVGPathElement>) {
    if (event.button !== 0 || !event.isPrimary) return;
    event.preventDefault();
    event.stopPropagation();
    const path = penPathForLayer(layerId);
    if (!path) return;
    const point = toPenLayerPoint(event.clientX, event.clientY, layerId);
    const next = insertEditorPenAnchor(path, point);
    if (!next) return;
    rememberLayerSnapshot();
    updatePenLayer(layerId, next);
    setSelectedPenAnchorIndex(null);
  }

  function removePenNode(layerId: string, index: number) {
    const path = penPathForLayer(layerId);
    const next = path ? removeEditorPenAnchor(path, index) : null;
    if (!next) {
      setToolNotice(path?.closed ? "A closed path needs at least three points." : "An open path needs at least two points.");
      return;
    }
    rememberLayerSnapshot();
    updatePenLayer(layerId, next);
    setSelectedPenAnchorIndex(null);
  }

  function removeSelectedPenNode() {
    if (!editingPenPathLayerId || selectedPenAnchorIndex === null) return;
    removePenNode(editingPenPathLayerId, selectedPenAnchorIndex);
  }

  function startArtworkStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    if (activeArtworkStrokeRef.current || event.button !== 0 || !event.isPrimary || isCanvasEdgeGesture(event.clientX, event.clientY)) return;
    if (activeTool === "move" || activeTool === "hand" || activeTool === "pan") return;
    if (activeTool === "pen") {
      addPenAnchor(event);
      return;
    }
    if (["remove-bg", "shape", "gradient"].includes(activeTool)) {
      event.preventDefault();
      event.stopPropagation();
      setToolNotice(activeTool === "shape"
        ? "Shape Tool is ready for the upcoming vector-shape pipeline."
        : activeTool === "gradient"
          ? "Gradient Tool is ready for the upcoming gradient-fill pipeline."
          : "Remove BG needs an uploaded image; background removal is not connected yet.");
      return;
    }
    const point = toCanvasPoint(event.clientX, event.clientY);
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
    };
    activeArtworkStrokeRef.current = activeStroke;
    rememberLayerSnapshot();
    setLayers((current) => appendLayerStroke(
      current,
      activeStroke.layerId,
      activeStroke.target,
      { points: [point], tool, color: foregroundColor },
      activeStroke.maskBrushMode,
    ));
  }

  function moveArtworkStroke(event: React.PointerEvent<HTMLCanvasElement>) {
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
      { points: [...active.points], tool: active.tool, color: active.color },
      active.maskBrushMode,
    ));
  }

  function endArtworkStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    if (penAnchorDragRef.current?.pointerId === event.pointerId) penAnchorDragRef.current = null;
    if (activeEraserRef.current?.pointerId === event.pointerId) activeEraserRef.current = null;
    if (activeArtworkStrokeRef.current?.pointerId !== event.pointerId) return;
    activeArtworkStrokeRef.current = null;
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
    if (editingPenPathLayerId) {
      setEditingPenPathLayerId(null);
      setSelectedPenAnchorIndex(null);
      if (tool === "move") return;
    }
    if (tool !== "pen" && penAnchors.length > 0) {
      setPenAnchors([]);
      setPenHoverPoint(null);
      setPenHoverCloseTarget(false);
    }
    setActiveTool(tool);
    setToolNotice(tool === "remove-bg"
      ? "Remove BG needs an uploaded image; background removal is not connected yet."
      : tool === "shape"
        ? "Shape Tool is ready for the upcoming vector-shape pipeline."
        : tool === "gradient"
          ? "Gradient Tool is ready for the upcoming gradient-fill pipeline."
          : "");
  }

  function startNodeDrag(node: WorkspaceNode, event: React.PointerEvent<HTMLElement>) {
    if (activeNodeDragRef.current || event.button !== 0 || !event.isPrimary) return;
    if (activeTool === "hand" || activeTool === "pan") return;
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

  function resetView() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    viewportRef.current?.scrollTo({ top: 0, left: 0 });
  }

  const selectedPenLayer = layers.find((layer) => layer.id === selectedLayerId && !layer.locked && layer.shape?.paths[0]?.penPath);
  const selectedPenPath = selectedPenLayer?.shape?.paths[0]?.penPath ?? null;
  const editingPenLayer = layers.find((layer) => layer.id === editingPenPathLayerId && !layer.locked && layer.shape?.paths[0]?.penPath);
  const editingPenPath = editingPenLayer?.shape?.paths[0]?.penPath ?? null;

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
          data-pan-mode={(touchPanEnabled || activeTool === "hand" || activeTool === "pan") ? "hand" : "scroll"}
          className={`absolute inset-0 flex flex-col items-center justify-start overflow-auto overscroll-contain p-5 md:justify-center md:overflow-hidden sm:p-8 [@media(pointer:coarse)]:justify-start [@media(pointer:coarse)]:overflow-auto ${(touchPanEnabled || activeTool === "hand" || activeTool === "pan") ? "touch-none" : "touch-pan-y"} ${isPanning ? "cursor-grabbing" : (spaceHeld || touchPanEnabled || activeTool === "hand" || activeTool === "pan") ? "cursor-grab" : "cursor-default"}`}
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
              className={`relative ${menuOpen ? "z-30" : "z-10"} w-[min(18.25rem,78vw)] shrink-0 touch-none select-none ${draggingNode === "Print canvas" ? "cursor-grabbing" : "cursor-grab"}`}
              style={{ transform: `translate(${nodePositions["Print canvas"].x}px, ${nodePositions["Print canvas"].y}px)` }}
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
                  className="block w-full touch-none border border-[#36a0e5] shadow-[0_5px_18px_rgba(30,60,90,0.08)]"
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
                  layerScales={canvasLayerScales}
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
                {selectedPenLayer && selectedPenPath && activeTool === "move" && !editingPenPath && (
                  <svg viewBox="0 0 1000 1200" preserveAspectRatio="none" aria-label="Selected Pen path" className="pointer-events-none absolute inset-0 z-30 h-full w-full" style={{ touchAction: "none" }} onPointerMove={moveCanvasArtwork} onPointerUp={endCanvasArtworkMove} onPointerCancel={endCanvasArtworkMove} onLostPointerCapture={endCanvasArtworkMove}>
                    <g transform={penLayerTransform(selectedPenLayer.id)}>
                      <path
                        d={editorPenPathData(selectedPenPath)}
                        fill={selectedPenPath.closed ? "#000000" : "none"}
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
                          setSelectedPenAnchorIndex(null);
                        }}
                      />
                    </g>
                  </svg>
                )}
                {editingPenLayer && editingPenPath && (
                  <>
                    <svg viewBox="0 0 1000 1200" preserveAspectRatio="none" aria-label="Pen path point controls" className="pointer-events-none absolute inset-0 z-30 h-full w-full" style={{ touchAction: "none" }} onPointerMove={movePenEditNode} onPointerUp={endPenEditDrag} onPointerCancel={endPenEditDrag} onLostPointerCapture={endPenEditDrag}>
                      <g transform={penLayerTransform(editingPenLayer.id)}>
                        <path d={editorPenPathData(editingPenPath)} fill="none" stroke="#000000" strokeOpacity="0.001" strokeWidth="34" pointerEvents="stroke" onPointerDown={(event) => addPenNodeOnPath(editingPenLayer.id, event)} className="cursor-crosshair" />
                        {editingPenPath.anchors.map((anchor, index) => {
                          const x = anchor.x * 1000;
                          const y = anchor.y * 1200;
                          const selected = selectedPenAnchorIndex === index;
                          return (
                            <g key={`pen-anchor-${index}`}>
                              {anchor.handleIn && <>
                                <line x1={x} y1={y} x2={x + anchor.handleIn.x * 1000} y2={y + anchor.handleIn.y * 1200} stroke="#557c31" strokeWidth="3" />
                                <circle cx={x + anchor.handleIn.x * 1000} cy={y + anchor.handleIn.y * 1200} r="34" fill="transparent" stroke="transparent" pointerEvents="all" className="cursor-crosshair" aria-label={`Point ${index + 1} incoming curve handle`} onPointerDown={(event) => startPenEditDrag(editingPenLayer.id, index, "handle-in", event)} />
                                <circle cx={x + anchor.handleIn.x * 1000} cy={y + anchor.handleIn.y * 1200} r="9" fill="white" stroke="#557c31" strokeWidth="4" pointerEvents="none" aria-hidden="true" />
                              </>}
                              {anchor.handleOut && <>
                                <line x1={x} y1={y} x2={x + anchor.handleOut.x * 1000} y2={y + anchor.handleOut.y * 1200} stroke="#557c31" strokeWidth="3" />
                                <circle cx={x + anchor.handleOut.x * 1000} cy={y + anchor.handleOut.y * 1200} r="34" fill="transparent" stroke="transparent" pointerEvents="all" className="cursor-crosshair" aria-label={`Point ${index + 1} outgoing curve handle`} onPointerDown={(event) => startPenEditDrag(editingPenLayer.id, index, "handle-out", event)} />
                                <circle cx={x + anchor.handleOut.x * 1000} cy={y + anchor.handleOut.y * 1200} r="9" fill="white" stroke="#557c31" strokeWidth="4" pointerEvents="none" aria-hidden="true" />
                              </>}
                              <circle cx={x} cy={y} r="38" fill="transparent" stroke="transparent" pointerEvents="all" className="cursor-move" role="button" tabIndex={0} aria-label={`Pen point ${index + 1}; Alt-click or press Delete to remove`} onFocus={() => setSelectedPenAnchorIndex(index)} onKeyDown={(event) => {
                                if (event.key === "Delete" || event.key === "Backspace") {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  removePenNode(editingPenLayer.id, index);
                                }
                              }} onPointerDown={(event) => startPenEditDrag(editingPenLayer.id, index, "anchor", event)} />
                              <circle cx={x} cy={y} r={selected ? "15" : "12"} fill={selected ? "#d4ff3f" : "white"} stroke="#557c31" strokeWidth="5" pointerEvents="none" aria-hidden="true" />
                            </g>
                          );
                        })}
                      </g>
                    </svg>
                    <div aria-label="Pen path editing controls" className="absolute left-1/2 top-2 z-40 flex max-w-[calc(100%-16px)] -translate-x-1/2 items-center gap-2 rounded-xl border border-border bg-bg-surface/95 px-2 py-1 text-[10px] text-text-primary shadow-lg">
                      <span className="hidden sm:inline">Drag points/handles · click path to add · Alt-click point to remove</span>
                      <button type="button" onClick={removeSelectedPenNode} disabled={selectedPenAnchorIndex === null} className="rounded-lg border border-border px-2 py-1 disabled:opacity-40">Delete point</button>
                      <button type="button" onClick={() => { setEditingPenPathLayerId(null); setSelectedPenAnchorIndex(null); }} className="rounded-lg bg-accent px-2 py-1 text-accent-foreground">Done</button>
                    </div>
                  </>
                )}
                {activeTool === "pen" && penAnchors.length > 0 && (
                  <svg aria-label="Pen path preview" viewBox="0 0 1000 1200" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible">
                    <path d={editorPenPathData({ anchors: penAnchors, closed: false }, penHoverPoint)} fill="none" stroke={foregroundColor} strokeWidth="10" strokeDasharray="16 10" vectorEffect="non-scaling-stroke" />
                    {penAnchors.map((point, index) => <g key={`${point.x}-${point.y}-${index}`}>
                      {point.handleIn && <line x1={point.x * 1000} y1={point.y * 1200} x2={(point.x + point.handleIn.x) * 1000} y2={(point.y + point.handleIn.y) * 1200} stroke={foregroundColor} strokeWidth="5" vectorEffect="non-scaling-stroke" />}
                      {point.handleOut && <line x1={point.x * 1000} y1={point.y * 1200} x2={(point.x + point.handleOut.x) * 1000} y2={(point.y + point.handleOut.y) * 1200} stroke={foregroundColor} strokeWidth="5" vectorEffect="non-scaling-stroke" />}
                      <circle cx={point.x * 1000} cy={point.y * 1200} r={index === 0 ? (penHoverCloseTarget ? 16 : 13) : 10} fill={index === 0 ? (penHoverCloseTarget ? "#d4ff3f" : "#ffffff") : foregroundColor} stroke={foregroundColor} strokeWidth="6" vectorEffect="non-scaling-stroke" data-pen-close-target={index === 0 && penHoverCloseTarget ? "true" : undefined} />
                    </g>)}
                  </svg>
                )}
                {activeTool === "pen" && (
                  <div aria-label="Pen tool actions" className="absolute left-1/2 top-2 z-40 flex max-w-[calc(100%-16px)] -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-xl border border-border bg-bg-surface/95 px-2 py-1 text-[10px] text-text-primary shadow-lg">
                    <span className="hidden sm:inline">Click: corner · drag: curve · Shift: snap · click start: close</span>
                    {penAnchors.length > 0 && <>
                      <button type="button" onClick={() => finishPenPath(false)} disabled={penAnchors.length < 2} className="rounded-lg border border-border px-2 py-1 disabled:opacity-40">Finish</button>
                      <button type="button" onClick={() => finishPenPath(true)} disabled={penAnchors.length < 3} className="rounded-lg border border-border px-2 py-1 disabled:opacity-40">Close path</button>
                      <button type="button" onClick={() => { setPenAnchors([]); setPenHoverPoint(null); setPenHoverCloseTarget(false); penAnchorDragRef.current = null; }} className="rounded-lg border border-border px-2 py-1">Cancel</button>
                    </>}
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
          selectedLayer={layers.find((layer) => layer.id === selectedLayerId) ?? null}
          onUpdateLayer={updateLayer}
          onUpdateText={updateSelectedText}
          onUpdateTextStyle={updateSelectedTextStyle}
          onUpdateShapeBuilder={updateSelectedShapeBuilder}
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
        onSelect={chooseTool}
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
