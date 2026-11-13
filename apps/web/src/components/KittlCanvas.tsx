"use client";

import { MoreVertical, Shirt, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type MockupSide = "front" | "back";
type KittlCanvasProps = {
  availableMockupSides?: readonly MockupSide[];
};
type PanStart = { pointerId: number; startX: number; startY: number; panX: number; panY: number };

const ARTBOARD_SIZE = { width: 720, height: 540 };
const DEFAULT_MOCKUP_SIDES: readonly MockupSide[] = ["front", "back"];
const SIDE_LABELS: Record<MockupSide, string> = { front: "Front", back: "Back" };

export default function KittlCanvas({
  availableMockupSides = DEFAULT_MOCKUP_SIDES,
}: KittlCanvasProps) {
  const [mockupPanelOpen, setMockupPanelOpen] = useState(false);
  const [attachedSides, setAttachedSides] = useState<MockupSide[]>([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
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

  function toggleAttachedSide(side: MockupSide) {
    setAttachedSides((current) =>
      current.includes(side) ? current.filter((item) => item !== side) : [...current, side],
    );
  }

  return (
    <main className="relative h-full min-h-0 overflow-hidden bg-[#eef0f5]">
      <div
        ref={viewportRef}
        onPointerDown={startPan}
        onPointerMove={movePan}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        onAuxClick={(event) => {
          if (event.button === 1) event.preventDefault();
        }}
        className={`flex h-full w-full items-center justify-center overflow-hidden p-6 sm:p-12 ${isPanning ? "cursor-grabbing" : spaceHeld ? "cursor-grab" : "cursor-default"}`}
      >
        <div
          style={{
            width: `${ARTBOARD_SIZE.width * zoom}px`,
            height: `${ARTBOARD_SIZE.height * zoom}px`,
            transform: `translate(${pan.x}px, ${pan.y}px)`,
          }}
          className="relative shrink-0"
        >
          <div
            role="application"
            aria-label="Design canvas"
            className="h-full w-full bg-white shadow-[0_14px_45px_rgba(28,31,38,0.14)]"
            style={{
              width: `${ARTBOARD_SIZE.width}px`,
              height: `${ARTBOARD_SIZE.height}px`,
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
            }}
            onClick={(event) => {
              if (spaceHeld || panGestureRef.current) event.preventDefault();
            }}
          />
        </div>
      </div>

      <button
        type="button"
        aria-label={mockupPanelOpen ? "Close mockup panel" : "Open mockup panel"}
        aria-expanded={mockupPanelOpen}
        onClick={() => setMockupPanelOpen((open) => !open)}
        className="absolute right-3 top-1/2 z-30 flex h-10 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#dfe2e8] bg-white text-[#59616d] shadow-md transition hover:bg-[#f7f8fa] focus:outline-none focus:ring-2 focus:ring-[#7790bf]"
      >
        <MoreVertical size={18} aria-hidden="true" />
      </button>

      {mockupPanelOpen && (
        <aside
          aria-label="Mockup views"
          className="absolute right-14 top-1/2 z-30 max-h-[min(80vh,38rem)] w-[min(18rem,calc(100vw-5rem))] -translate-y-1/2 overflow-y-auto rounded-xl border border-[#e1e4e9] bg-white p-3 shadow-[0_16px_48px_rgba(25,31,42,0.18)]"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[#252a32]">Mockups</h2>
              <p className="mt-0.5 text-[11px] text-[#7d8490]">Choose a product view</p>
            </div>
            <button
              type="button"
              aria-label="Close mockup panel"
              onClick={() => setMockupPanelOpen(false)}
              className="rounded-md p-1 text-[#727985] hover:bg-[#f1f2f5]"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-2">
            {availableMockupSides.map((side) => {
              const attached = attachedSides.includes(side);
              return (
                <article key={side} className="rounded-lg border border-[#e7e9ed] p-2">
                  <div className="flex h-24 items-center justify-center rounded-md bg-[#f5f6f8]">
                    <div className="flex flex-col items-center gap-1 text-[#747c88]">
                      <Shirt size={42} strokeWidth={1.2} aria-hidden="true" />
                      <span className="text-[10px] font-medium uppercase tracking-[0.12em]">
                        {SIDE_LABELS[side]}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-[#333943]">{SIDE_LABELS[side]}</span>
                    <button
                      type="button"
                      aria-pressed={attached}
                      onClick={() => toggleAttachedSide(side)}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${attached ? "bg-[#eef2e9] text-[#4b6c2e]" : "bg-[#20242b] text-white hover:bg-[#353a43]"}`}
                    >
                      {attached ? "Attached" : "Attach"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </aside>
      )}
    </main>
  );
}
