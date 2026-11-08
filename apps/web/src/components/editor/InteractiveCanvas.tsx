"use client";

import { useEffect, useState } from "react";
import { Eye, Grid3X3, Hand, ImagePlus, Monitor, MousePointer2, Ruler, Undo2, ZoomIn, ZoomOut } from "lucide-react";
import type { ToolId } from "./EditorLeftRail";
import type { EditorLayer } from "./LayersPanel";
import FabricDesignCanvas from "./FabricDesignCanvas";

type Side = "Front" | "Back";
export type ShapeType = "rectangle" | "circle" | "triangle" | "star";
export type CanvasMark = {
  id: string;
  kind: "Text" | "Shape" | "Pen" | "Clone" | "Image";
  x: number;
  y: number;
  imageSrc?: string;
  elementName?: string;
  width?: number;
  text?: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  strokeWidth?: number;
  pathData?: Array<Array<string | number>>;
  originX?: "left" | "center" | "right";
  originY?: "top" | "center" | "bottom";
  shapeType?: ShapeType;
  angle?: number;
  scaleX?: number;
  scaleY?: number;
};

const toolMessages: Partial<Record<ToolId, string>> = {
  move: "Select and drag objects; use corner handles to resize or rotate",
  marquee: "Drag over objects to select a group",
  lasso: "Lasso selection is not available yet",
  "magic-wand": "Magic Wand is not available yet",
  eyedropper: "Eyedropper is not available yet",
  shape: "Click an empty canvas area to add a rectangle",
  pen: "Draw freehand vector strokes on the canvas",
  "path-select": "Path selection is not available yet",
  "clone-stamp": "Click an empty area to duplicate the latest object",
  gradient: "Gradient tool is not available yet",
  eraser: "Click an object to remove it",
  ruler: "Ruler tool is not available yet",
  "rotate-view": "Rotate the selected object with its rotation handle",
  hand: "Hand-pan mode",
  zoom: "Use the zoom controls above the canvas",
};

type Props = {
  activeTool: ToolId;
  activeSide: Side;
  onSideChange: (side: Side) => void;
  mockupName?: string | null;
  marks: CanvasMark[];
  layers: EditorLayer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onAddMark: (mark: CanvasMark) => void;
  onAddElement: (elementId: string, color: string, x: number, y: number) => Promise<void>;
  onRemoveMark: (id: string) => void;
  onMarksChange: (marks: CanvasMark[]) => void;
  onClear: () => void;
};

export default function InteractiveCanvas({ activeTool, activeSide, onSideChange, mockupName, marks, layers, selectedLayerId, onSelectLayer, onAddMark, onAddElement, onRemoveMark, onMarksChange, onClear }: Props) {
  const [zoom, setZoom] = useState(100);
  const [grid, setGrid] = useState(true);
  const [status, setStatus] = useState(toolMessages.move ?? "Ready");

  useEffect(() => setStatus(toolMessages[activeTool] ?? "Ready"), [activeTool]);

  function handleElementDrop(event: React.DragEvent<HTMLDivElement>) {
    const payload = event.dataTransfer.getData("application/x-mh-fashion-element");
    if (!payload) return;
    event.preventDefault();
    try {
      const parsed = JSON.parse(payload) as { id?: unknown; color?: unknown };
      if (typeof parsed.id !== "string" || typeof parsed.color !== "string") return;
      const bounds = event.currentTarget.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100));
      const y = Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100));
      setStatus("Adding element to canvas…");
      void onAddElement(parsed.id, parsed.color, x, y).then(() => setStatus("Element added to canvas"), () => setStatus("Could not add this element"));
    } catch {
      setStatus("Could not add this element");
    }
  }

  return (
    <>
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-bg px-3 py-1.5">
        <div className="flex items-center gap-1 rounded bg-bg-surface p-0.5">
          {(["Front", "Back"] as const).map((side) => <button key={side} type="button" onClick={() => { onSideChange(side); onSelectLayer(null); }} className={`rounded px-3 py-1 text-[10px] font-semibold ${activeSide === side ? "bg-accent text-accent-foreground" : "text-text-muted"}`}>{side}</button>)}
        </div>
        <div className="flex items-center gap-2 text-text-muted">
          <button type="button" title="Toggle grid" aria-pressed={grid} onClick={() => setGrid((value) => !value)}><Grid3X3 size={14} /></button>
          <button type="button" title="Zoom out" onClick={() => setZoom((value) => Math.max(value - 10, 40))}><ZoomOut size={14} /></button>
          <span className="w-9 text-center text-[10px]">{zoom}%</span>
          <button type="button" title="Zoom in" onClick={() => setZoom((value) => Math.min(value + 10, 180))}><ZoomIn size={14} /></button>
          <button type="button" title="Deselect objects" onClick={() => onSelectLayer(null)}><Monitor size={14} /></button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-auto p-3 sm:p-5">
        <div className="flex w-full max-w-[700px] items-center justify-between rounded-md border border-border bg-bg-surface px-3 py-2 text-[10px] text-text-muted">
          <span className="flex items-center gap-1.5 font-semibold capitalize text-text-primary"><MousePointer2 size={12} /> {activeTool.replace("-", " ")}</span>
          <span aria-live="polite">{status || toolMessages[activeTool]}</span>
          <span className="hidden items-center gap-1 sm:flex"><Eye size={12} /> Selection on</span>
        </div>
        <div
          className={`relative aspect-[4/3] w-full max-w-[700px] overflow-hidden rounded-lg border border-border ${grid ? "bg-[linear-gradient(45deg,#e7e7e3_25%,transparent_25%),linear-gradient(-45deg,#e7e7e3_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e7e7e3_75%),linear-gradient(-45deg,transparent_75%,#e7e7e3_75%)] bg-[length:22px_22px] bg-[position:0_0,0_11px,11px_-11px,-11px_0px] dark:bg-[#202020] dark:bg-none" : "bg-[#f3f3f0] dark:bg-[#202020]"}`}
          onDragOver={(event) => {
            if (Array.from(event.dataTransfer.types).includes("application/x-mh-fashion-element")) {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
            }
          }}
          onDrop={handleElementDrop}
        >
          <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
            <div className="relative flex h-[72%] w-[43%] min-w-[150px] items-center justify-center rounded-[45%_45%_9%_9%] border border-dashed border-text-muted/30 bg-white/35 dark:bg-white/5">
              <div className="absolute top-[9%] h-5 w-14 rounded-b-full border-b border-dashed border-text-muted/40" />
              <span className="absolute bottom-3 text-[8px] text-text-faint">{mockupName ? `${mockupName} · ` : "Transparent canvas · "}{activeSide}</span>
              {!mockupName && <span className="flex h-20 w-20 items-center justify-center rounded border border-dashed border-accent/40 text-center text-[9px] font-semibold text-accent/80"><ImagePlus size={14} className="mr-1" /> Mockup</span>}
            </div>
          </div>
          <FabricDesignCanvas
            activeTool={activeTool}
            marks={marks}
            layers={layers}
            selectedLayerId={selectedLayerId}
            zoom={zoom}
            onSelectLayer={onSelectLayer}
            onAddMark={onAddMark}
            onRemoveMark={onRemoveMark}
            onMarksChange={onMarksChange}
            onStatus={setStatus}
          />
        </div>
        <div className="flex items-center gap-2 rounded-md border border-border bg-bg px-2 py-1.5 text-[10px] text-text-secondary">
          <Hand size={12} /><span>Fabric.js canvas</span><span className="mx-1 h-4 w-px bg-border" /><span>{marks.length} object{marks.length === 1 ? "" : "s"}</span>
          <button type="button" disabled={!marks.length} onClick={() => { onClear(); onSelectLayer(null); }} className="ml-2 flex items-center gap-1 text-accent disabled:opacity-40"><Undo2 size={11} /> Clear</button>
          <Ruler size={12} className="ml-1" />
        </div>
      </div>
    </>
  );
}
