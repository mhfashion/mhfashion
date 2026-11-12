"use client";

import {
  ChevronDown, CircleHelp, Grid3X3, ImagePlus, Layers3, LayoutTemplate,
  MessageCircle, MousePointer2, Palette, PlaySquare, Plus, RotateCcw,
  RotateCw, Shirt, Sparkles, Type, Undo2, Redo2, ZoomIn, ZoomOut,
} from "lucide-react";
import { useState } from "react";

const leftTools = [
  { label: "Templates", Icon: LayoutTemplate },
  { label: "Text", Icon: Type },
  { label: "Illustrations", Icon: Grid3X3 },
  { label: "AI Gallery", Icon: Sparkles },
  { label: "Mockups", Icon: Shirt },
];

const lowerTools = [
  { label: "More", Icon: Grid3X3 },
  { label: "Learn", Icon: PlaySquare },
  { label: "Layers", Icon: Layers3 },
  { label: "Help", Icon: CircleHelp },
];

export default function KittlCanvas() {
  const [zoom, setZoom] = useState(1);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [activeTool, setActiveTool] = useState("Select");

  return (
    <div className="relative flex h-[calc(100dvh-4rem)] min-h-[520px] overflow-hidden border-t-2 border-fuchsia-700 bg-[#eef0f5] text-[#202124]">
      <aside className="z-20 flex w-[62px] shrink-0 flex-col items-center border-r border-[#e2e4e9] bg-white py-2">
        <div className="mb-3 flex h-9 w-full items-center justify-center text-3xl font-black italic text-[#111]">K</div>
        <button type="button" aria-label="Open navigation" className="mb-3 rounded-lg p-2 text-[#737780] hover:bg-[#f1f2f5]"><MessageCircle size={17} /></button>
        <nav className="flex w-full flex-1 flex-col items-center gap-1">
          {leftTools.map(({ label, Icon }) => <button key={label} type="button" onClick={() => setActiveTool(label)} className={`flex w-full flex-col items-center gap-1 px-1 py-2 text-[9px] leading-3 ${activeTool === label ? "text-[#111]" : "text-[#777b84] hover:bg-[#f6f7f9]"}`}><Icon size={19} strokeWidth={1.7} /><span className="max-w-[58px] truncate text-center">{label}</span></button>)}
          <button type="button" className="my-1 flex h-7 w-7 items-center justify-center rounded-full border border-[#e0e2e6] text-[#777b84]"><ChevronDown size={14} /></button>
          <div className="my-1 h-px w-7 bg-[#e8e9ed]" />
          {lowerTools.map(({ label, Icon }) => <button key={label} type="button" onClick={() => setActiveTool(label)} className={`flex w-full flex-col items-center gap-1 px-1 py-2 text-[9px] leading-3 ${activeTool === label ? "text-[#111]" : "text-[#777b84] hover:bg-[#f6f7f9]"}`}><Icon size={18} strokeWidth={1.7} /><span>{label}</span></button>)}
        </nav>
      </aside>

      <main className="relative min-w-0 flex-1 overflow-hidden bg-[#eef0f5]">
        <div className="absolute inset-0 flex items-center justify-center overflow-auto pb-28">
          <div className="relative aspect-[4/3] w-[min(52vw,620px)] min-w-[300px] bg-white shadow-[0_14px_45px_rgba(28,31,38,0.15)]">
            <div className="absolute inset-0 flex items-center justify-center text-center text-[#c6c9d0]">
              <div><Plus className="mx-auto mb-2 rounded-full border border-dashed border-[#cfd2d8] p-2" size={44} strokeWidth={1.2} /><p className="text-xs">Your canvas</p></div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-4 left-1/2 flex w-[min(720px,calc(100%-24px))] -translate-x-1/2 flex-col gap-2">
          <div className="flex h-12 items-center rounded-xl border border-[#dfe1e6] bg-white px-4 shadow-[0_5px_20px_rgba(30,33,40,0.12)]"><Sparkles size={16} className="mr-2 text-[#8a8f99]" /><span className="text-xs text-[#8a8f99]">Describe what you want to create</span></div>
          <div className="flex items-center justify-center gap-1.5">
            <div className="flex items-center gap-1 rounded-xl border border-[#dfe1e6] bg-white p-1 shadow-[0_4px_16px_rgba(30,33,40,0.10)]"><button type="button" className="rounded-lg bg-[#f0f2f5] p-2 text-[#222]" title="Select"><MousePointer2 size={16} /></button><button type="button" className="rounded-lg p-2 text-[#777b84] hover:bg-[#f0f2f5]" title="Add text"><Type size={16} /></button><button type="button" className="rounded-lg p-2 text-[#777b84] hover:bg-[#f0f2f5]" title="Add image"><ImagePlus size={16} /></button><button type="button" className="rounded-lg p-2 text-[#777b84] hover:bg-[#f0f2f5]" title="Add shape"><Palette size={16} /></button></div>
            <div className="flex items-center gap-1 rounded-xl border border-[#dfe1e6] bg-white p-1 shadow-[0_4px_16px_rgba(30,33,40,0.10)]"><button type="button" className="rounded-lg p-2 text-[#777b84] hover:bg-[#f0f2f5]" title="Undo"><Undo2 size={16} /></button><button type="button" className="rounded-lg p-2 text-[#777b84] hover:bg-[#f0f2f5]" title="Redo"><Redo2 size={16} /></button><span className="mx-1 h-5 w-px bg-[#e4e5e8]" /><button type="button" onClick={() => setZoom((value) => Math.max(0.5, value - 0.1))} className="rounded-lg p-2 text-[#777b84] hover:bg-[#f0f2f5]" title="Zoom out"><ZoomOut size={15} /></button><span className="w-9 text-center text-[10px] font-semibold text-[#545860]">{Math.round(zoom * 100)}%</span><button type="button" onClick={() => setZoom((value) => Math.min(1.6, value + 0.1))} className="rounded-lg p-2 text-[#777b84] hover:bg-[#f0f2f5]" title="Zoom in"><ZoomIn size={15} /></button></div>
            <button type="button" onClick={() => setRightPanelOpen((value) => !value)} className="hidden items-center gap-1 rounded-xl border border-[#dfe1e6] bg-white px-3 py-2 text-[10px] text-[#656a73] shadow-[0_4px_16px_rgba(30,33,40,0.10)] md:flex"><Layers3 size={14} /> Panel</button>
          </div>
        </div>
      </main>

      {rightPanelOpen && <aside className="hidden w-[245px] shrink-0 border-l border-[#e2e4e9] bg-white md:block">
        <div className="flex items-center justify-between border-b border-[#e7e8ec] px-3 py-3"><div className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#087aca] text-[10px] font-bold text-white">M</span><button type="button" className="rounded-md border border-[#e0e2e6] px-3 py-1 text-[10px] font-semibold">Share</button><button type="button" className="rounded-md bg-[#17191b] px-3 py-1 text-[10px] font-semibold text-white">Export</button></div><RotateCcw size={16} className="text-[#777b84]" /></div>
        <div className="border-b border-[#e7e8ec] px-3 py-4"><div className="flex items-center justify-between"><p className="text-[11px] font-semibold">Untitled Project</p><span className="text-[9px] text-[#969aa2]">Saved</span></div></div>
        <section className="border-b border-[#e7e8ec] px-3 py-4"><h2 className="mb-3 text-[11px] font-bold">Project Colors</h2><div className="space-y-2"><div className="flex items-center gap-2 text-[10px]"><span className="h-4 w-4 border border-[#e1e3e7] bg-white" />FFFFFF <span className="text-[#858991]">100%</span></div><div className="flex items-center gap-2 text-[10px]"><span className="h-4 w-4 bg-black" />000000 <span className="text-[#858991]">100%</span></div><div className="flex items-center gap-2 text-[10px]"><span className="h-4 w-4 bg-fuchsia-500" />FF00FF <span className="text-[#858991]">100%</span></div></div><button type="button" className="mt-3 w-full rounded-lg border border-[#dfe1e6] py-2 text-[10px] font-semibold text-[#44484f]">Browse Color Palettes</button></section>
        <section className="px-3 py-4"><h2 className="mb-3 text-[11px] font-bold">Tools</h2><div className="space-y-2"><button type="button" className="flex w-full items-center gap-2 rounded-lg border border-[#e0e2e6] px-2.5 py-2 text-left text-[10px] text-[#777b84]"><Sparkles size={14} />AI Image Board</button><button type="button" className="flex w-full items-center gap-2 rounded-lg border border-[#e0e2e6] px-2.5 py-2 text-left text-[10px] text-[#777b84]"><PlaySquare size={14} />AI Video Board</button><button type="button" className="flex w-full items-center gap-2 rounded-lg border border-[#e0e2e6] px-2.5 py-2 text-left text-[10px] text-[#777b84]"><Shirt size={14} />Mockup</button></div></section>
      </aside>}
    </div>
  );
}
