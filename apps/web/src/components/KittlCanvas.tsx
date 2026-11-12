"use client";

import { Shirt } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const ARTBOARD_SIZE = { width: 720, height: 540 };
type PanStart = { pointerId: number; startX: number; startY: number; panX: number; panY: number };

export default function KittlCanvas() {
  const [selected, setSelected] = useState(false);
  const [mockupAttached, setMockupAttached] = useState(false);
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
    <main className="h-full min-h-0 overflow-hidden bg-[#eef0f5]">
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
        <div style={{ width: `${ARTBOARD_SIZE.width * zoom}px`, height: `${ARTBOARD_SIZE.height * zoom}px`, transform: `translate(${pan.x}px, ${pan.y}px)` }} className="relative shrink-0">
          <div
            role="application"
            aria-label="Design canvas"
            onClick={(event) => {
              if (spaceHeld || panGestureRef.current) {
                event.preventDefault();
                return;
              }
              setSelected(true);
            }}
            className={`relative h-full w-full shrink-0 bg-white shadow-[0_14px_45px_rgba(28,31,38,0.14)] ${selected ? "ring-1 ring-[#8f96a3]" : ""}`}
            style={{ width: `${ARTBOARD_SIZE.width}px`, height: `${ARTBOARD_SIZE.height}px`, transform: `scale(${zoom})`, transformOrigin: "top left" }}
          >
          {mockupAttached && <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
            <div className="relative h-[82%] w-[48%] min-w-[190px] rounded-[46%_46%_10%_10%] border border-[#d8dbe1] bg-[#f7f8fa] shadow-inner">
              <div className="absolute left-1/2 top-[8%] h-8 w-20 -translate-x-1/2 rounded-b-full border-b border-[#d8dbe1]" />
              <div className="absolute left-1/2 top-[37%] flex h-[30%] w-[58%] -translate-x-1/2 items-center justify-center border border-dashed border-[#bfc4ce] bg-white/70 text-[10px] font-medium text-[#a4a9b3]">Design print area</div>
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] text-[#a4a9b3]">Linked apparel mockup</span>
            </div>
          </div>}

          {selected && <div className="absolute -top-11 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-[#dfe1e6] bg-white p-1 shadow-[0_5px_18px_rgba(30,33,40,0.14)]" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setMockupAttached((value) => !value)} className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium ${mockupAttached ? "bg-[#eef0f4] text-[#30343a]" : "text-[#626872] hover:bg-[#f4f5f7]"}`}><Shirt size={13} />{mockupAttached ? "Remove mockup" : "Attach mockup"}</button>
            <span className="h-4 w-px bg-[#e5e6e9]" />
            <span className="px-1 text-[9px] text-[#8b909a]">{ARTBOARD_SIZE.width} × {ARTBOARD_SIZE.height}</span>
          </div>}

          </div>
        </div>
      </div>
    </main>
  );
}
