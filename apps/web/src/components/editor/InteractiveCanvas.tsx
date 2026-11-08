"use client";

import { useEffect, useState } from "react";
import { AlignCenter, AlignLeft, AlignRight, Bold, Copy, Grid3X3, ImagePlus, Italic, Monitor, MousePointer2, Trash2, Underline, ZoomIn, ZoomOut } from "lucide-react";
import type { ToolId } from "./EditorLeftRail";
import type { EditorLayer } from "./LayersPanel";
import FabricDesignCanvas from "./FabricDesignCanvas";
import { DEFAULT_FONT, FONT_LIBRARY } from "@/lib/editorTypography";

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
  fontStyle?: "normal" | "italic";
  underline?: boolean;
  textAlign?: "left" | "center" | "right" | "justify";
  charSpacing?: number;
  lineHeight?: number;
  strokeWidth?: number;
  shapeWidth?: number;
  shapeHeight?: number;
  gradient?: { startColor: string; endColor: string; angle: number };
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
  marquee: "Drag a rectangle to select multiple objects",
  lasso: "Draw around object centers to make a freeform selection",
  "magic-wand": "Click a color to select matching vector objects",
  eyedropper: "Click visible artwork to sample its rendered color",
  shape: "Drag to draw the selected editable shape",
  pen: "Draw freehand vector strokes on the canvas",
  "path-select": "Click and move a whole Pen path; anchor editing is not available",
  "clone-stamp": "Select or click an object, then click to stamp a copy",
  gradient: "Drag on empty canvas for a gradient shape or drag across text/vector artwork to fill it",
  eraser: "Erase the object but keep its layer available for drawing again",
  ruler: "Drag to measure canvas-pixel distance and angle",
  "rotate-view": "Drag to rotate the canvas view without changing artwork",
  hand: "Drag to pan the canvas view",
  zoom: "Click the canvas to zoom in; Shift-click to zoom out",
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
  onUpdateMark: (id: string, patch: Partial<CanvasMark>) => void;
  onDuplicateMark: (mark: CanvasMark) => void;
  onMarksChange: (marks: CanvasMark[]) => void;
  onClear: () => void;
  toolColor: string;
  onToolColorChange: (color: string) => void;
};

export default function InteractiveCanvas({ activeTool, activeSide, onSideChange, mockupName, marks, layers, selectedLayerId, onSelectLayer, onAddMark, onAddElement, onRemoveMark, onUpdateMark, onDuplicateMark, onMarksChange, onClear, toolColor, onToolColorChange }: Props) {
  const [zoom, setZoom] = useState(100);
  const [grid, setGrid] = useState(false);
  const [shapeType, setShapeType] = useState<ShapeType>("rectangle");
  const [penWidth, setPenWidth] = useState(6);
  const [gradientEndColor, setGradientEndColor] = useState("#111827");
  const [magicWandTolerance, setMagicWandTolerance] = useState(48);
  const [resetViewToken, setResetViewToken] = useState(0);
  const [status, setStatus] = useState(toolMessages.move ?? "Ready");
  const selectedMark = marks.find((mark) => mark.id === selectedLayerId) ?? null;

  useEffect(() => setStatus(toolMessages[activeTool] ?? "Ready"), [activeTool]);

  function updateSelectedMark(patch: Partial<CanvasMark>) {
    if (selectedMark) onUpdateMark(selectedMark.id, patch);
  }

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
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 py-1.5 text-slate-700">
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5">
          {(["Front", "Back"] as const).map((side) => <button key={side} type="button" onClick={() => { onSideChange(side); onSelectLayer(null); }} className={`rounded-md px-3 py-1 text-[10px] font-semibold ${activeSide === side ? "bg-accent text-accent-foreground shadow-sm" : "text-slate-600"}`}>{side}</button>)}
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 overflow-x-auto px-2 text-[9px] text-slate-600">
          {activeTool === "shape" && <>
            <select aria-label="Shape type" value={shapeType} onChange={(event) => setShapeType(event.target.value as ShapeType)} className="max-w-24 rounded border border-slate-200 bg-white px-1.5 py-1 text-slate-700">
              <option value="rectangle">Rectangle</option><option value="circle">Circle</option><option value="triangle">Triangle</option><option value="star">Star</option>
            </select>
            <input aria-label="Shape color" title="Shape color" type="color" value={toolColor} onChange={(event) => onToolColorChange(event.target.value)} className="h-6 w-6 cursor-pointer rounded border border-slate-200 bg-white p-0.5" />
          </>}
          {activeTool === "pen" && <>
            <input aria-label="Pen color" title="Pen color" type="color" value={toolColor} onChange={(event) => onToolColorChange(event.target.value)} className="h-6 w-6 cursor-pointer rounded border border-slate-200 bg-white p-0.5" />
            <label className="flex items-center gap-1">Width <input aria-label="Pen width" type="range" min="1" max="32" value={penWidth} onChange={(event) => setPenWidth(Number(event.target.value))} className="w-16" /><span>{penWidth}</span></label>
          </>}
          {activeTool === "gradient" && <>
            <label className="flex items-center gap-1">From <input aria-label="Gradient start color" type="color" value={toolColor} onChange={(event) => onToolColorChange(event.target.value)} className="h-6 w-6 cursor-pointer rounded border border-slate-200 bg-white p-0.5" /></label>
            <label className="flex items-center gap-1">To <input aria-label="Gradient end color" type="color" value={gradientEndColor} onChange={(event) => setGradientEndColor(event.target.value)} className="h-6 w-6 cursor-pointer rounded border border-slate-200 bg-white p-0.5" /></label>
          </>}
          {activeTool === "magic-wand" && <label className="flex items-center gap-1">Tolerance <input aria-label="Magic Wand color tolerance" type="range" min="0" max="180" value={magicWandTolerance} onChange={(event) => setMagicWandTolerance(Number(event.target.value))} className="w-16" /><span>{magicWandTolerance}</span></label>}
          {activeTool === "ruler" && <span>Drag to measure in canvas pixels</span>}
          {activeTool === "rotate-view" && <button type="button" onClick={() => { setZoom(100); setResetViewToken((value) => value + 1); }} className="rounded border border-slate-200 px-2 py-1 text-slate-700">Reset view</button>}
          {activeTool === "zoom" && <span>Click: zoom in · Shift-click: zoom out</span>}
          {activeTool === "clone-stamp" && <span>Select or click a source layer</span>}
          {activeTool === "eraser" && <span>Removes the clicked artwork; keeps the layer empty and reusable</span>}
          {activeTool === "lasso" && <span>Freeform select by object center</span>}
          {activeTool === "path-select" && <span>Selects whole vector paths</span>}
          {activeTool === "eyedropper" && <span>Sample a color from visible artwork</span>}
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <button type="button" title="Toggle grid" aria-pressed={grid} onClick={() => setGrid((value) => !value)}><Grid3X3 size={14} /></button>
          <button type="button" title="Zoom out" onClick={() => setZoom((value) => Math.max(value - 10, 40))}><ZoomOut size={14} /></button>
          <span className="w-9 text-center text-[10px]">{zoom}%</span>
          <button type="button" title="Zoom in" onClick={() => setZoom((value) => Math.min(value + 10, 180))}><ZoomIn size={14} /></button>
          <button type="button" title="Deselect objects" onClick={() => onSelectLayer(null)}><Monitor size={14} /></button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-auto p-3 sm:p-5">
        <div className="flex w-full max-w-[700px] items-center gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] text-slate-700 shadow-sm">
          <span className="flex shrink-0 items-center gap-1.5 font-semibold capitalize text-slate-900">
            {selectedMark ? selectedMark.kind : <><MousePointer2 size={13} /> {activeTool.replace("-", " ")}</>}
          </span>
          <span className="h-6 w-px shrink-0 bg-slate-200" />
          {selectedMark?.kind === "Text" && <>
            <select aria-label="Selected text font" value={selectedMark.fontFamily ?? DEFAULT_FONT.family} onChange={(event) => updateSelectedMark({ fontFamily: event.target.value })} className="h-7 max-w-32 shrink-0 rounded-md border border-slate-200 bg-white px-2 text-[10px] text-slate-700">
              {FONT_LIBRARY.map((font) => <option key={font.id} value={font.family}>{font.name}</option>)}
            </select>
            <input aria-label="Selected text font size" type="number" min="8" max="160" value={selectedMark.fontSize ?? 32} onChange={(event) => updateSelectedMark({ fontSize: Math.max(8, Math.min(160, Number(event.target.value) || 8)) })} className="h-7 w-14 shrink-0 rounded-md border border-slate-200 bg-white px-1.5 text-center text-[10px] text-slate-700" />
            <label className="flex h-7 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200" title="Text color">
              <input aria-label="Selected text color" type="color" value={selectedMark.color ?? "#111827"} onChange={(event) => updateSelectedMark({ color: event.target.value })} className="h-9 w-10 cursor-pointer border-0 bg-transparent" />
            </label>
            <div className="flex shrink-0 items-center gap-1">
              <button type="button" title="Bold" aria-label="Toggle selected text bold" aria-pressed={selectedMark.fontWeight === "bold"} onClick={() => updateSelectedMark({ fontWeight: selectedMark.fontWeight === "bold" ? "normal" : "bold" })} className={`rounded-md border p-1.5 ${selectedMark.fontWeight === "bold" ? "border-lime-500 bg-lime-50 text-slate-900" : "border-slate-200 text-slate-600"}`}><Bold size={13} /></button>
              <button type="button" title="Italic" aria-label="Toggle selected text italic" aria-pressed={selectedMark.fontStyle === "italic"} onClick={() => updateSelectedMark({ fontStyle: selectedMark.fontStyle === "italic" ? "normal" : "italic" })} className={`rounded-md border p-1.5 ${selectedMark.fontStyle === "italic" ? "border-lime-500 bg-lime-50 text-slate-900" : "border-slate-200 text-slate-600"}`}><Italic size={13} /></button>
              <button type="button" title="Underline" aria-label="Toggle selected text underline" aria-pressed={selectedMark.underline ?? false} onClick={() => updateSelectedMark({ underline: !(selectedMark.underline ?? false) })} className={`rounded-md border p-1.5 ${selectedMark.underline ? "border-lime-500 bg-lime-50 text-slate-900" : "border-slate-200 text-slate-600"}`}><Underline size={13} /></button>
            </div>
            <div className="flex shrink-0 items-center gap-0.5 border-l border-slate-200 pl-1">
              {([{ value: "left", Icon: AlignLeft }, { value: "center", Icon: AlignCenter }, { value: "right", Icon: AlignRight }] as const).map(({ value, Icon }) => <button key={value} type="button" title={`Align ${value}`} aria-label={`Align selected text ${value}`} aria-pressed={(selectedMark.textAlign ?? "left") === value} onClick={() => updateSelectedMark({ textAlign: value })} className={`rounded-md p-1.5 ${(selectedMark.textAlign ?? "left") === value ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50"}`}><Icon size={13} /></button>)}
            </div>
          </>}
          {selectedMark?.kind === "Shape" && <>
            <select aria-label="Selected shape type" value={selectedMark.shapeType ?? "rectangle"} onChange={(event) => updateSelectedMark({ shapeType: event.target.value as ShapeType })} className="h-7 max-w-28 shrink-0 rounded-md border border-slate-200 bg-white px-2 text-[10px] text-slate-700">
              <option value="rectangle">Rectangle</option><option value="circle">Circle</option><option value="triangle">Triangle</option><option value="star">Star</option>
            </select>
            <label className="flex h-7 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200" title="Shape fill color">
              <input aria-label="Selected shape fill color" type="color" value={selectedMark.color ?? "#d4ff3f"} onChange={(event) => updateSelectedMark({ color: event.target.value })} className="h-9 w-10 cursor-pointer border-0 bg-transparent" />
            </label>
          </>}
          {!selectedMark && <span className="min-w-0 flex-1 truncate text-slate-500" aria-live="polite">{status || toolMessages[activeTool]}</span>}
          {selectedMark && <span className="hidden shrink-0 text-slate-400 xl:inline">Changes apply instantly</span>}
          <div className="ml-auto flex shrink-0 items-center gap-1 border-l border-slate-200 pl-2">
            {selectedMark && <>
              <button type="button" title="Duplicate selected object" aria-label="Duplicate selected object" onClick={() => onDuplicateMark(selectedMark)} className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"><Copy size={14} /></button>
              <button type="button" title="Delete selected object" aria-label="Delete selected object" onClick={() => onRemoveMark(selectedMark.id)} className="rounded-md p-1.5 text-slate-600 hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
            </>}
            <span className="hidden max-w-28 truncate text-[9px] text-slate-400 sm:inline" aria-live="polite">{status}</span>
          </div>
        </div>
        <div
          className={`relative aspect-[4/3] w-full max-w-[700px] overflow-hidden rounded-xl border border-slate-200 shadow-sm ${grid ? "bg-[linear-gradient(45deg,#e7e7e3_25%,transparent_25%),linear-gradient(-45deg,#e7e7e3_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e7e7e3_75%),linear-gradient(-45deg,transparent_75%,#e7e7e3_75%)] bg-[length:22px_22px] bg-[position:0_0,0_11px,11px_-11px,-11px_0px]" : "bg-white"}`}
          onDragOver={(event) => {
            if (Array.from(event.dataTransfer.types).includes("application/x-mh-fashion-element")) {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
            }
          }}
          onDrop={handleElementDrop}
        >
          <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
            <div className="relative flex h-[72%] w-[43%] min-w-[150px] items-center justify-center rounded-[45%_45%_9%_9%] border border-dashed border-slate-300 bg-white/70">
              <div className="absolute top-[9%] h-5 w-14 rounded-b-full border-b border-dashed border-slate-300" />
              <span className="absolute bottom-3 text-[8px] text-slate-500">{mockupName ? `${mockupName} · ` : "Transparent canvas · "}{activeSide}</span>
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
            toolColor={toolColor}
            shapeType={shapeType}
            penWidth={penWidth}
            gradientEndColor={gradientEndColor}
            magicWandTolerance={magicWandTolerance}
            onColorSampled={onToolColorChange}
            onZoomChange={(nextZoom) => setZoom(Math.max(40, Math.min(180, nextZoom)))}
            resetViewToken={resetViewToken}
          />
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] text-slate-600 shadow-sm">
          <span>{marks.length} object{marks.length === 1 ? "" : "s"}</span>
          <button type="button" disabled={!marks.length} onClick={() => { onClear(); onSelectLayer(null); }} className="ml-1 flex items-center gap-1 text-slate-500 hover:text-red-600 disabled:opacity-40"><Trash2 size={11} /> Clear canvas</button>
        </div>
      </div>
    </>
  );
}
