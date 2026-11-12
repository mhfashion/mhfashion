"use client";

import { Plus, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";

export default function KittlCanvas() {
  const [zoom, setZoom] = useState(100);
  const [side, setSide] = useState<"Front" | "Back">("Front");

  return (
    <div className="flex h-[calc(100dvh-4rem)] min-h-[420px] flex-col overflow-hidden bg-[#d9dbd8] text-slate-900">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-black/10 bg-[#f8f9f6] px-3 text-[10px] text-slate-600">
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => setSide("Front")} className={`rounded-md px-3 py-1 font-semibold ${side === "Front" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:bg-white/70"}`}>Front</button>
          <button type="button" onClick={() => setSide("Back")} className={`rounded-md px-3 py-1 font-semibold ${side === "Back" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:bg-white/70"}`}>Back</button>
          <span className="text-slate-300">·</span>
          <span>Artboard</span>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(50, value - 10))} className="rounded p-1 hover:bg-white"><ZoomOut size={13} /></button>
          <span className="w-9 text-center font-semibold">{zoom}%</span>
          <button type="button" aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(160, value + 10))} className="rounded p-1 hover:bg-white"><ZoomIn size={13} /></button>
          <button type="button" onClick={() => setZoom(100)} className="ml-1 rounded border border-black/10 px-1.5 py-0.5 text-[9px] hover:bg-white">Fit</button>
        </div>
      </div>

      <main className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto p-7 sm:p-12">
        <div className="relative aspect-[4/3] w-[min(82vw,760px)] min-w-[290px] max-w-full shrink-0">
          <div className="pointer-events-none absolute -top-5 left-0 right-0 flex justify-between px-1 text-[8px] font-medium text-slate-500"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
          <div className="pointer-events-none absolute -left-5 top-0 bottom-0 flex flex-col justify-between py-1 text-[8px] font-medium text-slate-500"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
          <div className="relative h-full w-full overflow-hidden rounded-[2px] border border-black/10 bg-white shadow-[0_20px_50px_rgba(30,34,31,0.24)]">
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-lime-400/70 bg-lime-50 text-lime-600"><Plus size={20} /></div>
              <p className="text-xs font-semibold text-slate-600">Start designing</p>
            </div>
          </div>
          <span className="pointer-events-none absolute -bottom-5 left-0 text-[8px] font-medium text-slate-500">{side} artboard</span>
        </div>
        <div className="pointer-events-none absolute bottom-2 right-3 rounded bg-white/80 px-2 py-1 text-[8px] text-slate-500 shadow-sm">{zoom}%</div>
      </main>
    </div>
  );
}
