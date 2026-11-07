"use client";

import { useState } from "react";
import { Eye, Grid3X3, Hand, ImagePlus, Monitor, MousePointer2, Ruler, Type, Undo2, ZoomIn } from "lucide-react";
import type { ToolId } from "./EditorLeftRail";

type Side = "Front" | "Back";
type Mark = { id: string; kind: "Text" | "Shape" | "Pen" | "Clone"; x: number; y: number };

const toolMessages: Partial<Record<ToolId, string>> = {
  move: "Click a design element to select and move it",
  marquee: "Drag a selection area on the canvas",
  lasso: "Draw a freeform selection",
  "magic-wand": "Select matching color pixels",
  eyedropper: "Pick a color from the canvas",
  shape: "Click to place a shape",
  pen: "Click to add a pen point",
  "path-select": "Select a vector path",
  "clone-stamp": "Click to clone the latest element",
  gradient: "Click to apply a gradient",
  eraser: "Click to erase the selected element",
  ruler: "Click and drag to measure",
  "rotate-view": "Canvas rotation is ready",
  hand: "Drag to pan the canvas",
  zoom: "Click to zoom in",
};

export default function InteractiveCanvas({ activeTool, activeSide, onAddLayer, onRemoveLayer }: { activeTool: ToolId; activeSide: Side; onAddLayer: (name: string, id: string) => void; onRemoveLayer: (id: string) => void }) {
  const [marks, setMarks] = useState<Mark[]>([]);
  const [zoom, setZoom] = useState(100);
  const [status, setStatus] = useState(toolMessages.move);
  const [selected, setSelected] = useState<string | null>(null);

  function handleCanvasClick(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    const id = `${activeSide.toLowerCase()}-${Date.now()}`;
    if (["shape", "pen"].includes(activeTool)) {
      const kind = activeTool === "shape" ? "Shape" : "Pen";
      setMarks((current) => [...current, { id, kind, x, y }]);
      setSelected(id);
      onAddLayer(`${kind} element`, id);
      setStatus(`${kind} added · drag to reposition`);
    } else if (activeTool === "eraser" && selected) {
      setMarks((current) => current.filter((mark) => mark.id !== selected));
      onRemoveLayer(selected);
      setSelected(null);
      setStatus("Selected element erased");
    } else if (activeTool === "clone-stamp" && marks.length) {
      const source = marks[marks.length - 1];
      const cloneId = `${activeSide.toLowerCase()}-clone-${Date.now()}`;
      setMarks((current) => [...current, { ...source, id: cloneId, kind: "Clone", x: Math.min(source.x + 8, 88), y: Math.min(source.y + 8, 88) }]);
      onAddLayer("Cloned element", cloneId);
      setStatus("Element cloned");
    } else if (activeTool === "zoom") {
      setZoom((value) => Math.min(value + 10, 180));
      setStatus(`Zoom ${Math.min(zoom + 10, 180)}%`);
    } else if (activeTool === "eyedropper") setStatus("Color sampled from canvas");
    else if (activeTool === "gradient") setStatus("Gradient applied to selected area");
    else if (activeTool === "ruler") setStatus("Measurement: 4.2 in");
    else if (["marquee", "lasso", "magic-wand", "path-select"].includes(activeTool)) setStatus("Selection created");
    else if (activeTool === "hand") setStatus("Canvas panned");
    else if (activeTool === "rotate-view") setStatus("Canvas rotated 15°");
    else setStatus(toolMessages[activeTool] ?? "Tool ready");
  }

  return (
    <>
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-bg px-3 py-1.5"><div className="flex items-center gap-1 rounded bg-bg-surface p-0.5"><button className="rounded bg-accent px-3 py-1 text-[10px] font-semibold text-accent-foreground">{activeSide}</button><button className="rounded px-2 py-1 text-[10px] text-text-muted">Other side</button></div><div className="flex items-center gap-2 text-text-muted"><button title="Grid"><Grid3X3 size={14} /></button><span className="text-[10px]">{zoom}%</span><button title="Zoom"><ZoomIn size={14} onClick={() => setZoom((value) => Math.min(value + 10, 180))} /></button><button title="Preview"><Monitor size={14} /></button></div></div>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-auto p-3 sm:p-5">
        <div className="flex w-full max-w-[700px] items-center justify-between rounded-md border border-border bg-bg-surface px-3 py-2 text-[10px] text-text-muted"><span className="flex items-center gap-1.5 font-semibold capitalize text-text-primary"><MousePointer2 size={12} /> {activeTool.replace("-", " ")}</span><span>{status}</span><span className="hidden items-center gap-1 sm:flex"><Eye size={12} /> Safe zone on</span></div>
        <div onClick={handleCanvasClick} className="relative flex aspect-[4/3] w-full max-w-[700px] cursor-crosshair items-center justify-center overflow-hidden rounded-lg border border-border bg-[linear-gradient(45deg,#e7e7e3_25%,transparent_25%),linear-gradient(-45deg,#e7e7e3_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e7e7e3_75%),linear-gradient(-45deg,transparent_75%,#e7e7e3_75%)] bg-[length:22px_22px] bg-[position:0_0,0_11px,11px_-11px,-11px_0px] dark:bg-[#202020] dark:bg-none">
          <div className="relative flex h-[72%] w-[43%] min-w-[150px] items-center justify-center rounded-[45%_45%_9%_9%] border border-dashed border-text-muted/40 bg-white/50 shadow-sm dark:bg-white/5"><div className="absolute top-[9%] h-5 w-14 rounded-b-full border-b border-dashed border-text-muted/50" /><div className="flex h-24 w-24 items-center justify-center rounded border border-dashed border-accent/60 bg-accent/5 text-center text-[10px] font-semibold text-accent"><ImagePlus size={16} className="mr-1" /> Your design</div><span className="absolute bottom-3 text-[8px] text-text-faint">Transparent canvas · {activeSide}</span></div>
          {marks.map((mark) => <button key={mark.id} onClick={(event) => { event.stopPropagation(); setSelected(mark.id); setStatus(`${mark.kind} selected`); }} style={{ left: `${mark.x}%`, top: `${mark.y}%` }} className={`absolute flex h-9 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded border text-[9px] font-bold ${selected === mark.id ? "border-accent bg-accent/20 text-accent" : "border-border bg-bg-surface/90 text-text-primary"}`}>{mark.kind === "Text" ? <Type size={12} /> : mark.kind}</button>)}
          <span className="absolute bottom-2 left-2 rounded bg-bg-surface/90 px-2 py-1 text-[9px] text-text-muted">Click canvas to use {activeTool}</span>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-border bg-bg px-2 py-1.5 text-[10px] text-text-secondary"><Hand size={12} /><span>Interactive canvas</span><span className="mx-1 h-4 w-px bg-border" /><span>{marks.length} element{marks.length === 1 ? "" : "s"}</span><button onClick={() => { setMarks([]); setSelected(null); }} className="ml-2 flex items-center gap-1 text-accent"><Undo2 size={11} /> Clear</button><Ruler size={12} className="ml-1" /></div>
      </div>
    </>
  );
}
