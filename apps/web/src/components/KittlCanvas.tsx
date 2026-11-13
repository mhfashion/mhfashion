"use client";

import { Grid2X2, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PRINT_CANVAS_SPEC } from "@/lib/editor-canvas-spec";

type PanStart = { pointerId: number; startX: number; startY: number; panX: number; panY: number };
type MockupSide = "Front Mockup" | "Back Mockup";

export default function KittlCanvas() {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [mockups, setMockups] = useState<MockupSide[]>([]);
  const viewportRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef<PanStart | null>(null);
  const panGestureRef = useRef(false);

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
          className="my-auto flex max-w-full shrink-0 flex-col items-center gap-8 md:flex-row md:gap-12"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
          }}
        >
          <section className="w-[min(18.25rem,78vw)] shrink-0" aria-label="Print canvas">
            <div className="relative">
              <canvas
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
            <section key={side} aria-label={side} className="w-[min(18.25rem,78vw)] shrink-0">
              <div className="mb-2 flex h-7 items-center gap-2 text-xs font-medium text-[#53606a]">
                <span>{side}</span>
                {side === "Front Mockup" && (
                  <button
                    type="button"
                    aria-label="Add Back Mockup"
                    onClick={() => addMockup("Back Mockup")}
                    className="flex h-5 w-5 items-center justify-center rounded-full border border-[#a58be8] bg-white text-[#8f72d4] shadow-sm outline-none hover:bg-[#f5f1ff] focus-visible:ring-2 focus-visible:ring-[#8f72d4]"
                  >
                    <Plus size={12} aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`Close ${side}`}
                  onClick={() => removeMockup(side)}
                  className="ml-auto flex h-5 w-5 items-center justify-center rounded-full text-[#7c838d] outline-none hover:bg-[#e7e9ed] hover:text-[#343b45] focus-visible:ring-2 focus-visible:ring-[#8f72d4]"
                >
                  <X size={13} aria-hidden="true" />
                </button>
              </div>
              <div className="relative aspect-square w-full border border-[#a58be8] bg-[#e6e7e9] shadow-[0_5px_18px_rgba(50,35,90,0.08)]">
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
