"use client";

import { Grid2X2, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PRINT_CANVAS_SPEC } from "@/lib/editor-canvas-spec";

type PanStart = { pointerId: number; startX: number; startY: number; panX: number; panY: number };
type MockupSide = "Front Mockup" | "Back Mockup";
type WorkspaceNode = "Print canvas" | MockupSide;
type Point = { x: number; y: number };
type ActiveNodeDrag = { node: WorkspaceNode; pointerId: number; startX: number; startY: number; origin: Point };
type Connector = { side: MockupSide; path: string; start: Point; end: Point };

export default function KittlCanvas() {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [mockups, setMockups] = useState<MockupSide[]>([]);
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
    const handleWindowBlur = () => setSpaceHeld(false);

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

      for (const side of mockups) {
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
    [workspace, canvas, ...mockups.map((side) => mockupSurfaceRefs.current[side]).filter(Boolean)].forEach((element) => {
      if (element) observer?.observe(element);
    });
    window.addEventListener("resize", updateConnectors);
    return () => {
      window.cancelAnimationFrame(initialFrame);
      observer?.disconnect();
      window.removeEventListener("resize", updateConnectors);
    };
  }, [mockups, nodePositions, pan, zoom]);

  function startPan(event: React.PointerEvent<HTMLDivElement>) {
    const middleButtonPan = event.button === 1;
    if (!middleButtonPan && (!spaceHeld || event.button !== 0)) return;
    if (event.target instanceof Element && event.target.closest("button, input, textarea, select")) return;
    event.preventDefault();
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
    setPan({
      x: start.panX + event.clientX - start.startX,
      y: start.panY + event.clientY - start.startY,
    });
  }

  function endPan(event: React.PointerEvent<HTMLDivElement>) {
    if (panStartRef.current?.pointerId !== event.pointerId) return;
    panStartRef.current = null;
    setIsPanning(false);
    window.setTimeout(() => {
      panGestureRef.current = false;
    }, 0);
  }

  function startNodeDrag(node: WorkspaceNode, event: React.PointerEvent<HTMLElement>) {
    if (event.button !== 0 || !event.isPrimary) return;
    if (event.target instanceof Element && event.target.closest("button, input, textarea, select")) return;
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
    setMockups((current) => {
      const sides = new Set([...current, side]);
      return (["Front Mockup", "Back Mockup"] as const).filter((item) => sides.has(item));
    });
  }

  function removeMockup(side: MockupSide) {
    setMockups((current) => current.filter((item) => item !== side));
  }

  return (
    <main className="h-full min-h-0 overflow-hidden bg-[#f1f2f5]">
      <div
        ref={viewportRef}
        onPointerDown={startPan}
        onPointerMove={movePan}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        onAuxClick={(event) => {
          if (event.button === 1) event.preventDefault();
        }}
        className={`flex h-full w-full flex-col items-center justify-start overflow-auto p-5 md:justify-center md:overflow-hidden sm:p-8 ${isPanning ? "cursor-grabbing" : spaceHeld ? "cursor-grab" : "cursor-default"}`}
      >
        <div
          ref={workspaceRef}
          className="relative my-auto flex max-w-full shrink-0 flex-col items-center gap-8 md:flex-row md:gap-12"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
          }}
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
                className="block w-full border border-[#36a0e5] shadow-[0_5px_18px_rgba(30,60,90,0.08)]"
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
              <div ref={menuRef} className="absolute -right-5 top-1/2 z-20 -translate-y-1/2">
                <button
                  type="button"
                  aria-label="Canvas options"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((open) => !open)}
                  className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#a58be8] shadow-sm outline-none ring-offset-2 hover:bg-[#8f72d4] focus-visible:ring-2 focus-visible:ring-[#8f72d4]"
                >
                  <span className="h-1 w-1 rounded-full bg-white" />
                </button>
                {menuOpen && (
                  <div
                    role="menu"
                    aria-label="Canvas options"
                    className="absolute right-0 top-[calc(100%+8px)] z-30 min-w-44 rounded-md border border-[#d8dce2] bg-white p-1.5 shadow-lg md:left-full md:right-auto md:top-1/2 md:ml-3 md:-translate-y-1/2"
                  >
                    <button
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={showGrid}
                      onClick={() => {
                        setShowGrid((visible) => !visible);
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-[#3e4650] outline-none hover:bg-[#f2f3f6] focus-visible:ring-2 focus-visible:ring-[#8f72d4]"
                    >
                      <Grid2X2 size={15} aria-hidden="true" />
                      <span>Show Grid</span>
                      <span className={`ml-auto h-3.5 w-3.5 rounded-sm border ${showGrid ? "border-[#8f72d4] bg-[#8f72d4]" : "border-[#bfc5cd]"}`} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      aria-label="Add Mockup"
                      onClick={() => {
                        addMockup("Front Mockup");
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-[#3e4650] outline-none hover:bg-[#f2f3f6] focus-visible:ring-2 focus-visible:ring-[#8f72d4]"
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
              onPointerDown={(event) => startNodeDrag(side, event)}
              onPointerMove={moveNodeDrag}
              onPointerUp={endNodeDrag}
              onPointerCancel={endNodeDrag}
              onLostPointerCapture={endNodeDrag}
              className={`relative z-10 w-[min(18.25rem,78vw)] shrink-0 touch-none select-none ${draggingNode === side ? "cursor-grabbing" : "cursor-grab"}`}
              style={{ transform: `translate(${nodePositions[side].x}px, ${nodePositions[side].y}px)` }}
            >
              <div className="mb-2 flex h-7 items-center gap-2 text-xs font-medium text-[#53606a]">
                <span>{side}</span>
                <button
                  type="button"
                  aria-label={`Close ${side}`}
                  onClick={() => removeMockup(side)}
                  className="ml-auto flex h-5 w-5 items-center justify-center rounded-full text-[#7c838d] outline-none hover:bg-[#e7e9ed] hover:text-[#343b45] focus-visible:ring-2 focus-visible:ring-[#8f72d4]"
                >
                  <X size={13} aria-hidden="true" />
                </button>
              </div>
              <div
                ref={(element) => {
                  if (element) mockupSurfaceRefs.current[side] = element;
                  else delete mockupSurfaceRefs.current[side];
                }}
                className="relative aspect-square w-full border border-[#a58be8] bg-[#e6e7e9] shadow-[0_5px_18px_rgba(50,35,90,0.08)]"
              >
                {side === "Front Mockup" && (
                  <button
                    type="button"
                    aria-label="Add Back Mockup"
                    title="Add Back Mockup"
                    onClick={() => addMockup("Back Mockup")}
                    className="absolute -left-5 top-1/2 z-20 flex h-3.5 w-3.5 -translate-y-1/2 items-center justify-center rounded-full bg-[#a58be8] text-white shadow-sm outline-none hover:bg-[#8f72d4] focus-visible:ring-2 focus-visible:ring-[#8f72d4]"
                  >
                    <Plus size={8} aria-hidden="true" />
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
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
