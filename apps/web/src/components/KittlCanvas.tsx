"use client";

import { Grid2X2, Hand, Minus, Plus, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MockupArtwork from "@/components/MockupArtwork";
import EditorArtworkLayers from "@/components/EditorArtworkLayers";
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
  deleteEditorLayer,
  duplicateEditorLayer,
  removeLayerMask,
  reorderEditorLayer,
  updateEditorLayer,
  updateLayerLastStroke,
} from "@/lib/editor-layers";
import type { EditorArtworkLayer, EditorLayerAppearance, LayerEditTarget, MaskBrushMode } from "@/lib/editor-layers";
import type { EditorProduct } from "@/lib/editor-product";

type PanStart = { pointerId: number; startX: number; startY: number; panX: number; panY: number };
type MockupSide = "Front Mockup" | "Back Mockup";
type WorkspaceNode = "Print canvas" | MockupSide;
type Point = { x: number; y: number };
type ActiveNodeDrag = { node: WorkspaceNode; pointerId: number; startX: number; startY: number; origin: Point };
type Connector = { side: MockupSide; path: string; start: Point; end: Point };
type ActiveArtworkStroke = {
  pointerId: number;
  layerId: string;
  target: LayerEditTarget;
  maskBrushMode: MaskBrushMode;
  points: Point[];
};

function ArtworkOverlay({
  layers,
  selectedMaskLayerId,
  maskBrushMode,
}: {
  layers: EditorArtworkLayer[];
  selectedMaskLayerId: string | null;
  maskBrushMode: MaskBrushMode;
}) {
  return (
    <svg viewBox="0 0 1000 1200" preserveAspectRatio="xMidYMid meet" className="pointer-events-none absolute inset-0 z-20 h-full w-full">
      <EditorArtworkLayers layers={layers} selectedMaskLayerId={selectedMaskLayerId} maskBrushMode={maskBrushMode} />
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
  const [mockups, setMockups] = useState<MockupSide[]>([]);
  const [layers, setLayers] = useState<EditorArtworkLayer[]>(() => [createEditorArtworkLayer("layer-1", "Layer 1")]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>("layer-1");
  const [selectedTarget, setSelectedTarget] = useState<LayerEditTarget>("artwork");
  const [maskBrushMode, setMaskBrushMode] = useState<MaskBrushMode>("hide");
  const nextLayerIdRef = useRef(2);
  const visibleMockups = useMemo(
    () => product === "Phone" ? mockups.filter((side) => side === "Front Mockup") : mockups,
    [mockups, product],
  );
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
  const handleLargeTierRequested = useCallback((side: MockupSide) => {
    setLargeArtworkTierOwner((current) => claimLargeArtworkTier(current, side));
  }, []);
  const handleArtworkDisplayedEdgeChange = useCallback((side: MockupSide, longestEdgePx: number) => {
    setLargeArtworkTierOwner((current) => reconcileLargeArtworkTier(current, side, longestEdgePx));
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
    const touchPan = touchPanEnabled && event.pointerType === "touch" && event.isPrimary;
    if (!middleButtonPan && !touchPan && (!spaceHeld || event.button !== 0)) return;
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

  function startArtworkStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    if (activeArtworkStrokeRef.current || event.button !== 0 || !event.isPrimary || isCanvasEdgeGesture(event.clientX, event.clientY)) return;
    const selectedLayer = layers.find((layer) => layer.id === selectedLayerId);
    if (!selectedLayer || selectedLayer.locked || (selectedTarget === "mask" && selectedLayer.mask === null)) return;
    event.preventDefault();
    event.stopPropagation();
    const point = toCanvasPoint(event.clientX, event.clientY);
    const activeStroke: ActiveArtworkStroke = {
      pointerId: event.pointerId,
      layerId: selectedLayer.id,
      target: selectedTarget,
      maskBrushMode,
      points: [point],
    };
    activeArtworkStrokeRef.current = activeStroke;
    event.currentTarget.setPointerCapture(event.pointerId);
    setLayers((current) => appendLayerStroke(
      current,
      activeStroke.layerId,
      activeStroke.target,
      { points: [point] },
      activeStroke.maskBrushMode,
    ));
  }

  function moveArtworkStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    const active = activeArtworkStrokeRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    event.preventDefault();
    active.points.push(toCanvasPoint(event.clientX, event.clientY));
    setLayers((current) => updateLayerLastStroke(
      current,
      active.layerId,
      active.target,
      { points: [...active.points] },
      active.maskBrushMode,
    ));
  }

  function endArtworkStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    if (activeArtworkStrokeRef.current?.pointerId !== event.pointerId) return;
    activeArtworkStrokeRef.current = null;
  }

  function startNodeDrag(node: WorkspaceNode, event: React.PointerEvent<HTMLElement>) {
    if (activeNodeDragRef.current || event.button !== 0 || !event.isPrimary) return;
    if (event.target instanceof Element && event.target.closest("button, input, textarea, select")) return;
    if (node === "Print canvas" && event.target instanceof HTMLCanvasElement && !isCanvasEdgeGesture(event.clientX, event.clientY)) return;
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

  function addLayer() {
    const id = `layer-${nextLayerIdRef.current++}`;
    const number = nextLayerIdRef.current - 1;
    setLayers((current) => [createEditorArtworkLayer(id, `Layer ${number}`), ...current]);
    setSelectedLayerId(id);
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
    setSelectedTarget("mask");
    setMaskBrushMode("hide");
  }

  function deleteLayerMask(id: string) {
    setLayers((current) => removeLayerMask(current, id));
    if (selectedLayerId === id && selectedTarget === "mask") setSelectedTarget("artwork");
  }

  function duplicateLayer(id: string) {
    const newId = `layer-${nextLayerIdRef.current++}`;
    setLayers((current) => duplicateEditorLayer(current, id, newId));
    setSelectedLayerId(newId);
    setSelectedTarget("artwork");
  }

  function deleteLayer(id: string) {
    const index = layers.findIndex((layer) => layer.id === id);
    const next = deleteEditorLayer(layers, id);
    setLayers(next);
    if (selectedLayerId === id) {
      setSelectedLayerId(next[Math.min(index, next.length - 1)]?.id ?? null);
      setSelectedTarget("artwork");
    }
  }

  function renameLayer(id: string, name: string) {
    setLayers((current) => updateEditorLayer(current, id, { name }));
  }

  function moveLayer(id: string, direction: -1 | 1) {
    setLayers((current) => reorderEditorLayer(current, id, direction));
  }

  function updateLayer(id: string, update: EditorLayerAppearance) {
    setLayers((current) => updateEditorLayer(current, id, update));
  }

  function resetView() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    viewportRef.current?.scrollTo({ top: 0, left: 0 });
  }

  return (
    <main className="relative flex h-full min-h-0 flex-col overflow-hidden bg-bg text-text-primary">
      <div role="toolbar" aria-label="Touch view controls" className="z-40 hidden shrink-0 items-center justify-center gap-1 border-b border-border bg-bg px-2 py-1 [@media(pointer:coarse)]:flex">
        <button type="button" aria-label="Pan view" aria-pressed={touchPanEnabled} onClick={() => setTouchPanEnabled((enabled) => !enabled)} className={`flex h-11 items-center gap-1.5 rounded px-3 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-accent ${touchPanEnabled ? "bg-accent/10 text-accent" : "text-text-secondary"}`}>
          <Hand size={16} aria-hidden="true" />
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
          className={`absolute inset-0 flex flex-col items-center justify-start overflow-auto overscroll-contain p-5 md:justify-center md:overflow-hidden sm:p-8 [@media(pointer:coarse)]:justify-start [@media(pointer:coarse)]:overflow-auto ${touchPanEnabled ? "touch-none" : "touch-pan-y"} ${isPanning ? "cursor-grabbing" : spaceHeld ? "cursor-grab" : "cursor-default"}`}
        >
          <div
            ref={workspaceRef}
            className="relative my-auto flex max-w-full shrink-0 origin-top flex-col items-center gap-8 md:origin-center md:flex-row md:gap-12 [@media(pointer:coarse)]:origin-top [@media(pointer:coarse)]:flex-col [@media(pointer:coarse)]:gap-8"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              "--editor-inverse-zoom": 1 / zoom,
            } as React.CSSProperties}
          >
            <svg className="pointer-events-none absolute inset-0 z-0 overflow-visible" width="100%" height="100%" aria-label="Canvas and mockup connections">
              {connectors.map((connection) => (
                <g key={connection.side}>
                  <path d={connection.path} fill="none" stroke="#8f72d4" strokeWidth="2" strokeLinecap="round" />
                  <circle cx={connection.start.x} cy={connection.start.y} r="2.5" fill="#8f72d4" />
                  <circle cx={connection.end.x} cy={connection.end.y} r="2.5" fill="#8f72d4" />
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
              className={`relative z-10 w-[min(18.25rem,78vw)] shrink-0 touch-none select-none ${draggingNode === "Print canvas" ? "cursor-grabbing" : "cursor-grab"}`}
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
                />
                <div ref={menuRef} className="absolute -right-5 top-1/2 z-20 -translate-y-1/2">
                  <button
                    type="button"
                    aria-label="Canvas options"
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen((open) => !open)}
                    className="-m-[15px] flex h-11 w-11 items-center justify-center rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-[#8f72d4] md:m-0 md:h-3.5 md:w-3.5 [@media(pointer:coarse)]:-m-[15px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:[transform:scale(var(--editor-inverse-zoom))]"
                  >
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#a58be8] shadow-sm hover:bg-[#8f72d4]"><span className="h-1 w-1 rounded-full bg-white" /></span>
                  </button>
                  {menuOpen && (
                    <div
                      role="menu"
                      aria-label="Canvas options"
                    className="absolute right-0 top-[calc(100%+8px)] z-30 min-w-44 rounded-md border border-border bg-bg-surface p-1.5 shadow-lg md:left-full md:right-auto md:top-1/2 md:ml-3 md:-translate-y-1/2 [@media(pointer:coarse)]:origin-top-right [@media(pointer:coarse)]:[transform:scale(var(--editor-inverse-zoom))]"
                    >
                      <button
                        type="button"
                        role="menuitemcheckbox"
                        aria-checked={showGrid}
                        onClick={() => {
                          setShowGrid((visible) => !visible);
                          setMenuOpen(false);
                        }}
                        className="flex min-h-11 w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-text-primary outline-none hover:bg-bg focus-visible:ring-2 focus-visible:ring-accent md:min-h-0 [@media(pointer:coarse)]:min-h-11"
                      >
                        <Grid2X2 size={15} aria-hidden="true" />
                        <span>Show Grid</span>
                        <span className={`ml-auto h-3.5 w-3.5 rounded-sm border ${showGrid ? "border-accent bg-accent" : "border-border-light"}`} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        aria-label="Add Mockup"
                        onClick={() => {
                          addMockup("Front Mockup");
                          setMenuOpen(false);
                        }}
                        className="flex min-h-11 w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-text-primary outline-none hover:bg-bg focus-visible:ring-2 focus-visible:ring-accent md:min-h-0 [@media(pointer:coarse)]:min-h-11"
                      >
                        <Plus size={15} aria-hidden="true" />
                        <span>Add Mockup</span>
                      </button>
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
                  {product === "T-Shirt" && side === "Front Mockup" && (
                    <button
                      type="button"
                      aria-label="Add Back Mockup"
                      title="Add Back Mockup"
                      onClick={() => addMockup("Back Mockup")}
                      className="absolute -left-[35px] top-[calc(50%+1.25rem)] z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-white outline-none focus-visible:ring-2 focus-visible:ring-[#8f72d4] md:-left-5 md:h-3.5 md:w-3.5 [@media(pointer:coarse)]:-left-[35px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:[transform:scale(var(--editor-inverse-zoom))]"
                    >
                      <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#a58be8] shadow-sm hover:bg-[#8f72d4]"><Plus size={8} aria-hidden="true" /></span>
                    </button>
                  )}
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
        <EditorLayersPanel
          open={layersOpen}
          onToggle={() => setLayersOpen((open) => !open)}
          layers={layers}
          selectedLayerId={selectedLayerId}
          selectedTarget={selectedTarget}
          maskBrushMode={maskBrushMode}
          onSelectLayer={(id, target) => {
            setSelectedLayerId(id);
            setSelectedTarget(target);
          }}
          onAddLayer={addLayer}
          onToggleVisibility={toggleLayerVisibility}
          onToggleLock={toggleLayerLock}
          onAddMask={createLayerMask}
          onRemoveMask={deleteLayerMask}
          onRenameLayer={renameLayer}
          onDuplicateLayer={duplicateLayer}
          onDeleteLayer={deleteLayer}
          onMoveLayer={moveLayer}
          onUpdateLayer={updateLayer}
          onMaskBrushModeChange={setMaskBrushMode}
        />
      </div>
    </main>
  );
}
