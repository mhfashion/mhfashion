"use client";

import { Maximize2, Shirt } from "lucide-react";
import { useRef, useState } from "react";

type Size = { width: number; height: number };

type ResizeState = { startX: number; startY: number; width: number; height: number };

export default function KittlCanvas() {
  const [size, setSize] = useState<Size>({ width: 720, height: 540 });
  const [selected, setSelected] = useState(false);
  const [mockupAttached, setMockupAttached] = useState(false);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [zoom, setZoom] = useState(1);
  const viewportRef = useRef<HTMLDivElement>(null);

  function handleCanvasWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (!event.ctrlKey) return;
    event.preventDefault();
    setZoom((current) => Math.max(0.25, Math.min(3, current - event.deltaY * 0.002)));
  }

  function startResize(event: React.PointerEvent<HTMLButtonElement>) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setResizeState({ startX: event.clientX, startY: event.clientY, width: size.width, height: size.height });
  }

  function resize(event: React.PointerEvent<HTMLDivElement>) {
    if (!resizeState) return;
    setSize({
      width: Math.max(320, Math.min(1400, resizeState.width + event.clientX - resizeState.startX)),
      height: Math.max(240, Math.min(1100, resizeState.height + event.clientY - resizeState.startY)),
    });
  }

  function endResize() {
    setResizeState(null);
  }

  return (
    <main className="h-full min-h-0 overflow-hidden bg-[#eef0f5]" onPointerMove={resize} onPointerUp={endResize}>
      <div ref={viewportRef} onWheel={handleCanvasWheel} className="flex h-full w-full items-center justify-center overflow-auto p-6 sm:p-12">
        <div style={{ width: `${size.width * zoom}px`, height: `${size.height * zoom}px` }} className="relative shrink-0">
          <div
          role="application"
          aria-label="Design canvas"
          onClick={() => setSelected(true)}
          className={`relative shrink-0 bg-white shadow-[0_14px_45px_rgba(28,31,38,0.14)] transition-[width,height] duration-75 ${selected ? "ring-1 ring-[#8f96a3]" : ""}`}
          style={{ width: `${size.width}px`, height: `${size.height}px`, transform: `scale(${zoom})`, transformOrigin: "top left" }}
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
            <span className="px-1 text-[9px] text-[#8b909a]">{size.width} × {size.height}</span>
          </div>}

          {selected && <button type="button" aria-label="Resize canvas" title="Drag to resize canvas" onPointerDown={startResize} className="absolute -bottom-1.5 -right-1.5 z-10 flex h-4 w-4 cursor-se-resize items-center justify-center rounded-full border border-white bg-[#68707d] text-white shadow-sm"><Maximize2 size={9} /></button>}
          </div>
        </div>
      </div>
    </main>
  );
}
