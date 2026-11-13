"use client";

import {
  ArrowDownToLine, Circle, Hand, ImagePlus, Layers3, Minus, MousePointer2, Plus,
  Redo2, RotateCcw, Save, Square, Type, Undo2, X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Canvas as FabricCanvas, FabricObject } from "fabric";
import Link from "next/link";
import { PRINT_CANVAS_SPEC } from "@/lib/editor-canvas-spec";

type Side = "Front" | "Back";
type SavedDocument = { version: 1; front: Record<string, unknown>; back: Record<string, unknown> };
type ToolPanel = "assets" | "layers" | "mockup" | null;
const STORAGE_KEY = "mh-fashion-editor-v1";
const SNAPSHOT_LIMIT = 40;
const docKey = (side: Side): "front" | "back" => side.toLowerCase() as "front" | "back";

function safeDocument(value: unknown): SavedDocument | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<SavedDocument>;
  if (item.version !== 1 || !item.front || !item.back || typeof item.front !== "object" || typeof item.back !== "object") return null;
  return item as SavedDocument;
}

export default function KittlCanvas() {
  const canvasElement = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const documentRef = useRef<SavedDocument | null>(null);
  const historyRef = useRef<string[]>([]);
  const historyIndex = useRef(-1);
  const applyingRef = useRef(false);
  const activeSideRef = useRef<Side>("Front");
  const panStart = useRef<{ id: number; x: number; y: number; originX: number; originY: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [side, setSide] = useState<Side>("Front");
  const [panel, setPanel] = useState<ToolPanel>("layers");
  const [layers, setLayers] = useState<FabricObject[]>([]);
  const [selected, setSelected] = useState<FabricObject | null>(null);
  const [zoom, setZoom] = useState(0.22);
  const [notice, setNotice] = useState("Ready");
  const [preview, setPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [historyState, setHistoryState] = useState({ undo: false, redo: false });
  const [panMode, setPanMode] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const readCurrent = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || !documentRef.current) return;
    documentRef.current[docKey(activeSideRef.current)] = canvas.toObject(["name", "editorId"]);
  }, []);

  const syncLayers = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const objects = canvas.getObjects();
    setLayers([...objects].reverse());
    setSelected(canvas.getActiveObject() ?? null);
    setPreviewUrl(canvas.toDataURL({ format: "png", multiplier: 0.08, enableRetinaScaling: false }));
    if (documentRef.current) {
      documentRef.current[docKey(activeSideRef.current)] = canvas.toObject(["name", "editorId"]);
    }
  }, []);

  const checkpoint = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || applyingRef.current) return;
    readCurrent();
    const snapshot = JSON.stringify(documentRef.current);
    const history = historyRef.current.slice(0, historyIndex.current + 1);
    if (history.at(-1) === snapshot) return;
    history.push(snapshot);
    if (history.length > SNAPSHOT_LIMIT) history.shift();
    historyRef.current = history;
    historyIndex.current = history.length - 1;
    setHistoryState({ undo: historyIndex.current > 0, redo: false });
    syncLayers();
  }, [readCurrent, syncLayers]);

  const restoreSnapshot = useCallback(async (snapshot: string) => {
    const canvas = fabricRef.current;
    const parsed = safeDocument(JSON.parse(snapshot));
    if (!canvas || !parsed) return;
    applyingRef.current = true;
    documentRef.current = parsed;
    await canvas.loadFromJSON(parsed[docKey(activeSideRef.current)]);
    canvas.requestRenderAll();
    applyingRef.current = false;
    setHistoryState({ undo: historyIndex.current > 0, redo: historyIndex.current < historyRef.current.length - 1 });
    syncLayers();
  }, [syncLayers]);

  useEffect(() => {
    let disposed = false;
    let canvas: FabricCanvas | null = null;
    void import("fabric").then(({ Canvas, FabricImage }) => {
      if (!canvasElement.current || disposed) return;
      const saved = (() => {
        try { return safeDocument(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")); }
        catch { return null; }
      })();
      documentRef.current = saved ?? {
        version: 1,
        front: { version: "7.4.0", objects: [], background: "" },
        back: { version: "7.4.0", objects: [], background: "" },
      };
      canvas = new Canvas(canvasElement.current, {
        width: PRINT_CANVAS_SPEC.widthPx,
        height: PRINT_CANVAS_SPEC.heightPx,
        backgroundColor: "rgba(255,255,255,0)",
        selection: true,
        preserveObjectStacking: true,
        enableRetinaScaling: false,
      });
      fabricRef.current = canvas;
      const onChanged = () => { if (!applyingRef.current) checkpoint(); };
      canvas.on("object:added", onChanged);
      canvas.on("object:modified", onChanged);
      canvas.on("object:removed", onChanged);
      canvas.on("selection:created", syncLayers);
      canvas.on("selection:updated", syncLayers);
      canvas.on("selection:cleared", syncLayers);
      void canvas.loadFromJSON(documentRef.current.front).then(() => {
        if (disposed) return;
        canvas?.requestRenderAll();
        historyRef.current = [JSON.stringify(documentRef.current)];
        historyIndex.current = 0;
        setReady(true);
        syncLayers();
        if (saved) setNotice("Restored local design");
      });
      // Keep the imported image class reachable for Fabric's image revival registry.
      void FabricImage;
    }).catch(() => setNotice("Editor could not load. Refresh the page to try again."));
    return () => {
      disposed = true;
      canvas?.dispose();
      fabricRef.current = null;
    };
  }, [checkpoint, syncLayers]);

  useEffect(() => { activeSideRef.current = side; }, [side]);

  const changeSide = async (next: Side) => {
    const canvas = fabricRef.current;
    if (!canvas || next === side || !documentRef.current) return;
    readCurrent();
    applyingRef.current = true;
    activeSideRef.current = next;
    setSide(next);
    await canvas.loadFromJSON(documentRef.current[docKey(next)]);
    canvas.requestRenderAll();
    applyingRef.current = false;
    syncLayers();
    setNotice(`${next} artwork`);
  };

  const addText = async () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const { IText } = await import("fabric");
    const text = new IText("Your text", { left: 500, top: 550, fontSize: 220, fill: "#191919", fontFamily: "Arial", name: "Text" });
    canvas.add(text);
    canvas.setActiveObject(text);
    text.enterEditing();
    text.selectAll();
    canvas.requestRenderAll();
    checkpoint();
  };

  const addShape = async (shape: "rect" | "circle") => {
    const fabric = await import("fabric");
    const object = shape === "rect"
      ? new fabric.Rect({ left: 650, top: 800, width: 900, height: 650, fill: "#d4ff3f", stroke: "#202124", strokeWidth: 10, name: "Rectangle" })
      : new fabric.Circle({ left: 750, top: 850, radius: 320, fill: "#d4ff3f", stroke: "#202124", strokeWidth: 10, name: "Circle" });
    fabricRef.current?.add(object);
    fabricRef.current?.setActiveObject(object);
    fabricRef.current?.requestRenderAll();
    checkpoint();
  };

  const addImage = async (file: File) => {
    const canvas = fabricRef.current;
    if (!canvas || !file.type.startsWith("image/")) { setNotice("Choose a PNG, JPG, GIF, or WebP image"); return; }
    if (file.size > 15 * 1024 * 1024) { setNotice("Image must be smaller than 15 MB"); return; }
    const { FabricImage } = await import("fabric");
    const url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Invalid image data"));
      reader.onerror = () => reject(new Error("Could not read image"));
      reader.readAsDataURL(file);
    });
    try {
      const image = await FabricImage.fromURL(url);
      const max = 2400;
      const scale = Math.min(1, max / Math.max(image.width ?? 1, image.height ?? 1));
      image.set({ left: 500, top: 500, scaleX: scale, scaleY: scale, name: file.name.slice(0, 80) });
      canvas.add(image);
      canvas.setActiveObject(image);
      canvas.requestRenderAll();
      checkpoint();
      setNotice("Image added to artwork");
    } catch { setNotice("Could not read that image"); }
    finally { /* The data URL is embedded in the browser-local document for restore. */ }
  };

  const historyMove = async (direction: -1 | 1) => {
    const next = historyIndex.current + direction;
    if (next < 0 || next >= historyRef.current.length) return;
    historyIndex.current = next;
    setHistoryState({ undo: next > 0, redo: next < historyRef.current.length - 1 });
    await restoreSnapshot(historyRef.current[next]);
    setNotice(direction < 0 ? "Undid last change" : "Redid change");
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault(); void historyMove(event.shiftKey ? 1 : -1);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") {
        event.preventDefault(); void historyMove(1);
      }
      if ((event.key === "Delete" || event.key === "Backspace") && fabricRef.current?.getActiveObject()) {
        event.preventDefault();
        const canvas = fabricRef.current;
        const active = canvas.getActiveObjects();
        canvas.discardActiveObject();
        active.forEach((object) => canvas.remove(object));
        checkpoint();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const saveLocal = () => {
    readCurrent();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(documentRef.current));
      setNotice("Saved in this browser");
    } catch { setNotice("Browser storage is full; remove a large image and try again"); }
  };

  const downloadPng = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL({ format: "png", multiplier: 0.2, enableRetinaScaling: false });
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `mh-fashion-${side.toLowerCase()}-preview.png`;
    anchor.click();
    setNotice("Downloaded preview PNG (reduced-size preview)");
  };

  const selectLayer = (object: FabricObject) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.setActiveObject(object);
    canvas.requestRenderAll();
    syncLayers();
  };

  const deleteSelected = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.getActiveObjects().forEach((object) => canvas.remove(object));
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    checkpoint();
  };

  const recolorSelected = (color: string) => {
    if (!selected || selected.type === "image") return;
    selected.set("fill", color);
    fabricRef.current?.requestRenderAll();
    checkpoint();
  };

  const beginPan = (event: { button: number; pointerId: number; clientX: number; clientY: number; currentTarget: HTMLElement; preventDefault(): void }) => {
    if (!panMode || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    panStart.current = { id: event.pointerId, x: event.clientX, y: event.clientY, originX: pan.x, originY: pan.y };
  };
  const movePan = (event: { pointerId: number; clientX: number; clientY: number; preventDefault(): void }) => {
    const start = panStart.current;
    if (!start || start.id !== event.pointerId) return;
    event.preventDefault();
    setPan({ x: start.originX + event.clientX - start.x, y: start.originY + event.clientY - start.y });
  };
  const endPan = (event: { pointerId: number }) => { if (panStart.current?.id === event.pointerId) panStart.current = null; };

  const zoomBy = (amount: number) => {
    const next = Math.max(0.08, Math.min(0.7, zoom + amount));
    setZoom(next);
  };

  return (
    <main className="flex h-full min-h-0 flex-col overflow-hidden bg-[#f3f4f6] text-[#222831]">
      <header className="z-20 flex min-h-12 items-center gap-2 border-b border-[#dfe2e7] bg-white px-2 sm:px-4">
        <Link href="/" className="hidden font-bold tracking-tight sm:block">MH <span className="text-[#78920e]">DESIGN STUDIO</span></Link>
        <div className="ml-auto flex items-center gap-1">
          <button aria-label="Undo" title="Undo (Ctrl/⌘ Z)" disabled={!ready || !historyState.undo} onClick={() => void historyMove(-1)} className="editor-icon"><Undo2 size={17}/></button>
          <button aria-label="Redo" title="Redo (Ctrl/⌘ Shift Z)" disabled={!ready || !historyState.redo} onClick={() => void historyMove(1)} className="editor-icon"><Redo2 size={17}/></button>
          <span className="mx-1 hidden text-xs text-gray-500 sm:inline" role="status">{notice}</span>
          <button onClick={saveLocal} disabled={!ready} className="editor-action"><Save size={15}/> <span className="hidden sm:inline">Save</span></button>
          <button onClick={downloadPng} disabled={!ready} className="editor-action"><ArrowDownToLine size={15}/> <span className="hidden sm:inline">PNG</span></button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <nav aria-label="Editor tools" className="hidden w-14 shrink-0 flex-col items-center gap-2 border-r border-[#dfe2e7] bg-white py-3 md:flex">
          <button aria-label="Select and move" title="Select and move" className="editor-tool editor-tool-active"><MousePointer2 size={19}/></button>
          <button aria-label="Text" title="Add text" onClick={() => void addText()} className="editor-tool"><Type size={19}/></button>
          <button aria-label="Rectangle" title="Add rectangle" onClick={() => void addShape("rect")} className="editor-tool"><Square size={18}/></button>
          <button aria-label="Circle" title="Add circle" onClick={() => void addShape("circle")} className="editor-tool"><Circle size={18}/></button>
          <button aria-label="Upload image" title="Upload image" onClick={() => fileInput.current?.click()} className="editor-tool"><ImagePlus size={19}/></button>
        </nav>
        <input ref={fileInput} className="hidden" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => { const file = event.target.files?.[0]; if (file) void addImage(file); event.currentTarget.value = ""; }}/>
        <section aria-label="Design workspace" className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-10 items-center gap-2 border-b border-[#e2e4e8] bg-[#f9fafb] px-3">
            <button onClick={() => void changeSide("Front")} aria-pressed={side === "Front"} className={`editor-tab ${side === "Front" ? "editor-tab-active" : ""}`}>Front</button>
            <button onClick={() => void changeSide("Back")} aria-pressed={side === "Back"} className={`editor-tab ${side === "Back" ? "editor-tab-active" : ""}`}>Back</button>
            <span className="ml-auto text-xs text-gray-500">{side} · 4500 × 5400</span>
          </div>
          <div className={`relative flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[#eceef1] p-4 pb-20 md:pb-4 ${panMode ? "cursor-grab" : ""}`} onPointerDown={beginPan} onPointerMove={movePan} onPointerUp={endPan} onPointerCancel={endPan} onWheel={(event) => { if (event.ctrlKey || event.metaKey) { event.preventDefault(); zoomBy(event.deltaY > 0 ? -0.02 : 0.02); } }}>
            <div className="editor-artboard" style={{ width: `${Math.round(4500 * zoom)}px`, maxWidth: zoom <= 0.22 ? "100%" : undefined, transform: `translate(${pan.x}px, ${pan.y}px)` }}>
              <canvas ref={canvasElement} aria-label={`${side} editable print canvas`} />
              {panMode && <div aria-label="Pan canvas" className="absolute inset-0 z-10 touch-none cursor-grab" />}
            </div>
            {!ready && <span className="absolute text-sm text-gray-500">Loading editor…</span>}
            {preview && <div aria-label={`${side} artwork preview`} className="absolute bottom-16 right-4 h-40 w-32 border border-violet-400 bg-white bg-contain bg-center bg-no-repeat shadow" style={{ backgroundImage: previewUrl ? `url(${previewUrl})` : undefined }}><span className="absolute left-1 top-1 rounded bg-white/90 px-1 text-xs">{side} preview</span></div>}
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-gray-200 bg-white p-1.5 shadow md:bottom-4">
              <button className="editor-dock-button" onClick={() => setPanel(panel === "assets" ? null : "assets")}><ImagePlus size={16}/>Assets</button>
              <button className="editor-dock-button" onClick={() => setPanel(panel === "layers" ? null : "layers")}><Layers3 size={16}/>Layers</button>
              <button className="editor-dock-button" onClick={() => { setPreview(!preview); setPanel("mockup"); }}><RotateCcw size={16}/>Mockup</button>
              <button aria-pressed={panMode} className={`editor-dock-button ${panMode ? "editor-tool-active" : ""}`} onClick={() => setPanMode(!panMode)}><Hand size={16}/>Pan</button>
              <button aria-label="Zoom out" className="editor-tool !h-9 !w-9" onClick={() => zoomBy(-0.03)}><Minus size={15}/></button>
              <span className="w-10 text-center text-xs">{Math.round(zoom * 100)}%</span>
              <button aria-label="Zoom in" className="editor-tool !h-9 !w-9" onClick={() => zoomBy(0.03)}><Plus size={15}/></button>
              <button aria-label="Reset canvas view" title="Reset view" className="editor-tool !h-9 !w-9" onClick={() => { setZoom(0.22); setPan({ x: 0, y: 0 }); }}><RotateCcw size={15}/></button>
            </div>
          </div>
        </section>
        {panel === "assets" && <div role="dialog" aria-label="Add artwork" className="fixed inset-x-2 bottom-20 z-40 mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl md:inset-auto md:bottom-4 md:left-16 md:top-16 md:mx-0 md:w-64 md:rounded-xl">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Add artwork</h2><button aria-label="Close assets" onClick={() => setPanel(null)} className="editor-tool"><X size={17}/></button></div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => void addText()} className="editor-action"><Type size={16}/>Text</button>
            <button onClick={() => void addShape("rect")} className="editor-action"><Square size={16}/>Rectangle</button>
            <button onClick={() => void addShape("circle")} className="editor-action"><Circle size={16}/>Circle</button>
            <button onClick={() => fileInput.current?.click()} className="editor-action"><ImagePlus size={16}/>Upload image</button>
          </div>
          <p className="mt-3 text-xs text-gray-500">Images up to 15 MB are embedded in this browser-local design.</p>
        </div>}
        <aside aria-label="Layers and properties" className={`${panel === "layers" ? "flex" : "hidden"} fixed inset-x-0 bottom-0 z-30 max-h-[55dvh] flex-col rounded-t-2xl border border-gray-200 bg-white shadow-2xl md:static md:z-auto md:flex md:max-h-none md:w-64 md:shrink-0 md:rounded-none md:border-y-0 md:border-r-0 md:border-l md:shadow-none`}>
          <div className="flex h-12 shrink-0 items-center justify-between border-b px-4 font-semibold"><span>Layers · {side}</span><button aria-label="Close layers" onClick={() => setPanel(null)} className="editor-tool md:hidden"><X size={17}/></button></div>
          <div className="min-h-0 flex-1 overflow-auto p-2">
            {layers.length === 0 && <p className="p-3 text-sm text-gray-500">No artwork yet. Add text, a shape, or an image.</p>}
            {layers.map((object, index) => <button key={(object as FabricObject & { editorId?: string }).editorId ?? `${index}-${String(object.type)}`} onClick={() => selectLayer(object)} aria-pressed={selected === object} className={`mb-1 flex min-h-11 w-full items-center gap-2 rounded border px-3 text-left text-sm ${selected === object ? "border-[#9ab32a] bg-[#f5f9e9]" : "border-gray-100 hover:bg-gray-50"}`}><span className="h-2 w-2 rounded-full bg-[#a5b84e]"/><span className="truncate">{String((object as FabricObject & { name?: string }).name ?? object.type ?? `Layer ${index + 1}`)}</span></button>)}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-t p-3">
            {selected && selected.type !== "image" && <label className="flex min-h-11 items-center gap-2 rounded border px-2 text-xs">Fill <input aria-label="Selected artwork color" type="color" value={typeof selected.fill === "string" && /^#[0-9a-f]{6}$/i.test(selected.fill) ? selected.fill : "#d4ff3f"} onChange={(event) => recolorSelected(event.target.value)} className="h-8 w-10 cursor-pointer border-0 bg-transparent p-0"/></label>}
            <button disabled={!selected} onClick={deleteSelected} className="editor-action">Delete selected</button>
          </div>
        </aside>
      </div>
      <div className="sr-only" role="status" aria-live="polite">{notice}</div>
    </main>
  );
}
