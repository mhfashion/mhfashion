"use client";

import { ImagePlus, MousePointer2, PanelLeft, Plus, Square, Type, ZoomIn, ZoomOut } from "lucide-react";
import { useRef, useState } from "react";

type CanvasNode = {
  id: string;
  kind: "text" | "shape";
  label: string;
  x: number;
  y: number;
};

const INITIAL_NODES: CanvasNode[] = [];

export default function KittlCanvas() {
  const [nodes, setNodes] = useState<CanvasNode[]>(INITIAL_NODES);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [grid, setGrid] = useState(false);
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  function addNode(kind: CanvasNode["kind"]) {
    const id = `${kind}-${Date.now()}`;
    const node: CanvasNode = { id, kind, label: kind === "text" ? "Your text" : "Shape", x: 50, y: 50 };
    setNodes((current) => [...current, node]);
    setSelectedId(id);
  }

  function pointerPosition(event: React.PointerEvent<HTMLElement>) {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100 };
  }

  function beginDrag(event: React.PointerEvent<HTMLButtonElement>, node: CanvasNode) {
    const position = pointerPosition(event);
    if (!position) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(node.id);
    setDragging({ id: node.id, offsetX: position.x - node.x, offsetY: position.y - node.y });
  }

  function moveNode(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    const position = pointerPosition(event);
    if (!position) return;
    setNodes((current) => current.map((node) => node.id === dragging.id ? { ...node, x: Math.max(4, Math.min(96, position.x - dragging.offsetX)), y: Math.max(5, Math.min(95, position.y - dragging.offsetY)) } : node));
  }

  return (
    <div className="flex h-[calc(100dvh-4rem)] min-h-[560px] flex-col overflow-hidden bg-[#181a1b] text-slate-900">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-white/10 bg-[#202324] px-3 text-white">
        <div className="flex items-center gap-2"><span className="rounded bg-lime-300 px-1.5 py-0.5 text-[9px] font-black text-slate-900">CREATE</span><span className="text-[10px] font-medium text-white/70">Untitled design</span></div>
        <div className="flex items-center gap-1 text-[10px] text-white/60"><span>{nodes.length} elements</span><span className="mx-1 h-3 w-px bg-white/15" /><span>Saved locally</span></div>
      </div>

      <div className="flex min-h-0 flex-1 gap-2 p-2">
        <aside className="flex w-12 shrink-0 flex-col items-center gap-2 rounded-xl border border-white/10 bg-[#202324] py-2 sm:w-14">
          <button type="button" title="Select" className="flex h-9 w-9 items-center justify-center rounded-lg bg-lime-300 text-slate-900 shadow-sm"><MousePointer2 size={16} /></button>
          <button type="button" title="Add text" onClick={() => addNode("text")} className="flex h-9 w-9 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"><Type size={16} /></button>
          <button type="button" title="Add shape" onClick={() => addNode("shape")} className="flex h-9 w-9 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"><Square size={16} /></button>
          <button type="button" title="Upload image" className="flex h-9 w-9 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"><ImagePlus size={16} /></button>
          <span className="my-1 h-px w-7 bg-white/10" />
          <button type="button" title="Toggle grid" aria-pressed={grid} onClick={() => setGrid((value) => !value)} className={`flex h-9 w-9 items-center justify-center rounded-lg text-[9px] font-bold ${grid ? "bg-white text-slate-900" : "text-white/60 hover:bg-white/10 hover:text-white"}`}>Grid</button>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-black/10 bg-[#d9dbd8]">
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-black/5 bg-[#f8f9f6] px-3 text-[10px] text-slate-600">
            <div className="flex items-center gap-1.5"><button type="button" className="rounded-md bg-white px-2 py-1 font-semibold shadow-sm">Front</button><button type="button" className="rounded-md px-2 py-1 text-slate-400 hover:bg-white">Back</button><span className="ml-1 text-slate-400">·</span><span>Artboard</span></div>
            <div className="flex items-center gap-1"><button type="button" aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(50, value - 10))} className="rounded p-1 hover:bg-white"><ZoomOut size={13} /></button><span className="w-9 text-center font-semibold">{zoom}%</span><button type="button" aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(160, value + 10))} className="rounded p-1 hover:bg-white"><ZoomIn size={13} /></button><button type="button" title="Fit artboard" onClick={() => setZoom(100)} className="ml-1 rounded border border-black/10 px-1.5 py-0.5 text-[9px] hover:bg-white">Fit</button></div>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto p-7 sm:p-12" onPointerMove={moveNode} onPointerUp={() => setDragging(null)}>
            <div className="relative aspect-[4/3] w-[min(82vw,760px)] min-w-[290px] max-w-full shrink-0">
              <div className="pointer-events-none absolute -top-5 left-0 right-0 flex justify-between px-1 text-[8px] font-medium text-slate-500"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
              <div className="pointer-events-none absolute -left-5 top-0 bottom-0 flex flex-col justify-between py-1 text-[8px] font-medium text-slate-500"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
              <div ref={stageRef} className={`relative h-full w-full overflow-hidden rounded-[2px] border border-black/10 bg-white shadow-[0_20px_50px_rgba(30,34,31,0.24)] ${grid ? "bg-[linear-gradient(45deg,#eef0ed_25%,transparent_25%),linear-gradient(-45deg,#eef0ed_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#eef0ed_75%),linear-gradient(-45deg,transparent_75%,#eef0ed_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0]" : ""}`}>
                {!nodes.length && <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"><div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-lime-400/70 bg-lime-50 text-lime-600"><Plus size={20} /></div><p className="text-xs font-semibold text-slate-600">Start designing</p><p className="mt-1 text-[10px] text-slate-400">Choose Text or Shape from the toolbar</p></div>}
                {nodes.map((node) => <button key={node.id} type="button" onPointerDown={(event) => beginDrag(event, node)} onClick={() => setSelectedId(node.id)} style={{ left: `${node.x}%`, top: `${node.y}%` }} className={`absolute -translate-x-1/2 -translate-y-1/2 ${node.kind === "text" ? "px-4 py-2 text-xl font-bold" : "h-24 w-24 rounded-2xl bg-lime-300"} ${selectedId === node.id ? "ring-2 ring-lime-500 ring-offset-2" : ""}`}>{node.kind === "text" ? node.label : ""}</button>)}
              </div>
              <span className="pointer-events-none absolute -bottom-5 left-0 text-[8px] font-medium text-slate-500">Front artboard</span>
            </div>
            <div className="pointer-events-none absolute bottom-2 right-3 rounded bg-white/80 px-2 py-1 text-[8px] text-slate-500 shadow-sm">{zoom}%</div>
          </div>
        </main>

        <aside className="hidden w-52 shrink-0 flex-col rounded-xl border border-border bg-[#fbfcfa] md:flex">
          <div className="border-b border-border px-3 py-3"><p className="text-[10px] font-bold">Design</p><p className="mt-1 text-[9px] leading-relaxed text-slate-400">Select an element to edit its position and style.</p></div>
          <div className="flex-1 p-3 text-[9px] text-slate-400">{selectedId ? "Selected element · drag it on the artboard" : "No selection"}</div>
          <div className="border-t border-border p-2"><button type="button" className="flex w-full items-center justify-center gap-1 rounded-lg border border-border py-2 text-[9px] text-slate-500"><PanelLeft size={12} /> Layers coming next</button></div>
        </aside>
      </div>
    </div>
  );
}
