"use client";

import { ArrowDown, ArrowRight, Shirt } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type MockupSide = "front" | "back";
type KittlCanvasProps = {
  availableMockupSides?: readonly MockupSide[];
};
type PanStart = { pointerId: number; startX: number; startY: number; panX: number; panY: number };

const DEFAULT_MOCKUP_SIDES: readonly MockupSide[] = ["front", "back"];
const SIDE_LABELS: Record<MockupSide, string> = { front: "Front", back: "Back" };

export default function KittlCanvas({
  availableMockupSides = DEFAULT_MOCKUP_SIDES,
}: KittlCanvasProps) {
  const [mockupVisible, setMockupVisible] = useState(true);
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
        className={`flex h-full w-full items-center justify-center overflow-hidden p-5 sm:p-8 ${isPanning ? "cursor-grabbing" : spaceHeld ? "cursor-grab" : "cursor-default"}`}
      >
        <div
          className="flex max-w-full flex-col items-center md:flex-row"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
          }}
        >
          <section className="w-[min(18.25rem,78vw)] shrink-0">
            <div className="mb-1 flex h-5 items-center gap-1.5 text-[12px] font-medium text-[#53606a]">
              <span className="inline-flex h-3 w-3 items-center justify-center rounded-[2px] border border-[#5b9dd1] text-[8px] text-[#5b9dd1]">T</span>
              <span>T-Shirt</span>
            </div>
            <div
              role="application"
              aria-label="T-Shirt design area"
              className="aspect-[0.875] w-full border border-[#36a0e5] bg-white shadow-[0_5px_18px_rgba(30,60,90,0.08)]"
              onClick={(event) => {
                if (spaceHeld || panGestureRef.current) event.preventDefault();
              }}
            />
          </section>

          <div className="relative flex h-12 w-14 shrink-0 items-center justify-center md:h-auto md:w-[8.75rem]">
            <span className="absolute left-1/2 top-0 h-full border-l border-[#b9a7e8] md:left-0 md:top-1/2 md:h-0 md:w-full md:border-l-0 md:border-t" />
            <button
              type="button"
              aria-label={mockupVisible ? "Hide mockup preview" : "Show mockup preview"}
              aria-expanded={mockupVisible}
              onClick={() => setMockupVisible((visible) => !visible)}
              className="relative z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[#a58be8] shadow-sm outline-none ring-offset-2 hover:bg-[#8f72d4] focus-visible:ring-2 focus-visible:ring-[#8f72d4]"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
            </button>
            {mockupVisible && <ArrowRight size={13} className="absolute right-0 top-1/2 hidden -translate-y-1/2 text-[#a58be8] md:block" aria-hidden="true" />}
            {mockupVisible && <ArrowDown size={13} className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[#a58be8] md:hidden" aria-hidden="true" />}
          </div>

          {mockupVisible && (
            <section className="w-[min(20.75rem,84vw)] shrink-0">
              <div className="mb-1 flex h-5 items-center gap-1.5 text-[12px] font-semibold text-[#967add]">
                <Shirt size={12} aria-hidden="true" />
                <span>Mockup</span>
              </div>
              <div className="relative aspect-square w-full border-2 border-[#a58be8] bg-[#e6e7e9] p-2.5 shadow-[0_5px_18px_rgba(50,35,90,0.08)]">
                <span className="absolute -left-1 -top-1 h-2 w-2 border border-[#a58be8] bg-white" />
                <span className="absolute -right-1 -top-1 h-2 w-2 border border-[#a58be8] bg-white" />
                <span className="absolute -bottom-1 -left-1 h-2 w-2 border border-[#a58be8] bg-white" />
                <span className="absolute -bottom-1 -right-1 h-2 w-2 border border-[#a58be8] bg-white" />
                <div className={`grid h-full w-full gap-2 ${availableMockupSides.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                  {availableMockupSides.map((side) => (
                    <div key={side} className="relative min-h-0 overflow-hidden rounded-[2px] bg-[#e1e2e4]">
                      <div className="absolute inset-x-1 top-1 bottom-6 flex items-center justify-center">
                        <Shirt
                          size={availableMockupSides.length > 1 ? 76 : 128}
                          strokeWidth={0.8}
                          className="h-auto max-h-full max-w-full text-[#fafafa] drop-shadow-[0_1px_1px_rgba(80,80,80,0.16)]"
                          aria-hidden="true"
                        />
                        <span className="absolute left-1/2 top-[52%] h-[32%] w-[38%] -translate-x-1/2 -translate-y-1/2 border border-[#4aa4e8] bg-white/10" />
                      </div>
                      <div className="absolute inset-x-0 bottom-0 flex h-6 items-center justify-center border-t border-[#d3d4d7] bg-white/70 text-[10px] font-medium text-[#626a75]">
                        {SIDE_LABELS[side]} · R2 image placeholder
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
