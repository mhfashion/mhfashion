"use client";

import { useEffect, useRef, useState } from "react";
import type { Canvas as FabricCanvas, FabricObject } from "fabric";
import type { ToolId } from "./EditorLeftRail";
import type { EditorLayer } from "./LayersPanel";
import type { CanvasMark } from "./InteractiveCanvas";

type Props = {
  activeTool: ToolId;
  marks: CanvasMark[];
  layers: EditorLayer[];
  selectedLayerId: string | null;
  zoom: number;
  onSelectLayer: (id: string | null) => void;
  onAddMark: (mark: CanvasMark) => void;
  onRemoveMark: (id: string) => void;
  onMarksChange: (marks: CanvasMark[]) => void;
  onStatus: (message: string) => void;
};

const BASE_WIDTH = 700;
const BASE_HEIGHT = 525;
const COMPOSITE: Record<string, GlobalCompositeOperation> = {
  normal: "source-over",
  multiply: "multiply",
  screen: "screen",
  overlay: "overlay",
  darken: "darken",
  lighten: "lighten",
};

type DataObject = FabricObject & { data?: CanvasMark };

function findLayer(layers: EditorLayer[], id: string | undefined) {
  if (!id) return undefined;
  return layers.find((layer) => layer.id === id);
}

function syncStacking(canvas: FabricCanvas, layers: EditorLayer[]) {
  let stackingIndex = 0;
  const roots = layers.filter((layer) => !layer.parentId);
  const orderedLayers = roots.flatMap((root) => root.isGroup ? layers.filter((layer) => layer.parentId === root.id) : [root]);
  for (const layer of orderedLayers) {
    const object = canvas.getObjects().find((item) => (item as DataObject).data?.id === layer.id);
    if (object) canvas.moveObjectTo(object, stackingIndex++);
  }
}

function effectShadow(effects: string[], fabric: typeof import("fabric")) {
  if (effects.includes("glow")) return new fabric.Shadow({ color: "#d4ff3f", blur: 14, offsetX: 0, offsetY: 0 });
  if (effects.includes("shadow")) return new fabric.Shadow({ color: "rgba(0,0,0,0.42)", blur: 8, offsetX: 3, offsetY: 4 });
  return undefined;
}

function applyLayerStyle(object: FabricObject, layer: EditorLayer | undefined, parent: EditorLayer | undefined, fabric: typeof import("fabric")) {
  const opacity = ((layer?.opacity ?? 100) / 100) * ((layer?.flow ?? 100) / 100) * ((layer?.hasMask ? layer.maskAmount ?? 100 : 100) / 100) * ((parent?.opacity ?? 100) / 100) * ((parent?.hasMask ? parent.maskAmount ?? 100 : 100) / 100);
  const locked = Boolean(layer?.locked || parent?.locked);
  const effects = [...(parent?.effects ?? []), ...(layer?.effects ?? [])];
  const shadow = effectShadow(effects, fabric);
  object.set({
    visible: (layer?.visible ?? true) && (parent?.visible ?? true),
    opacity,
    selectable: !locked,
    evented: true,
    globalCompositeOperation: COMPOSITE[layer?.blendMode ?? parent?.blendMode ?? "normal"] ?? "source-over",
    shadow,
    stroke: effects.includes("stroke") ? "#d4ff3f" : undefined,
    strokeWidth: effects.includes("stroke") ? 2 : 0,
  });
  const image = object as FabricObject & { filters?: unknown[]; applyFilters?: () => void };
  if ((object as DataObject).data?.imageSrc && image.filters && image.applyFilters) {
    image.filters = [
      ...(effects.includes("blur") ? [new fabric.filters.Blur({ blur: 0.08 })] : []),
      ...(effects.includes("sharpen") ? [new fabric.filters.Convolute({ matrix: [0, -1, 0, -1, 5, -1, 0, -1, 0] })] : []),
    ];
    image.applyFilters();
  }
  if (layer?.clipping) {
    const clip = new fabric.Rect({
      width: Math.max(1, (object.width ?? 1) * 0.9),
      height: Math.max(1, (object.height ?? 1) * 0.9),
      originX: "center",
      originY: "center",
    });
    object.set("clipPath", clip);
  } else {
    object.set("clipPath", undefined);
  }
}

async function createObject(mark: CanvasMark, fabric: typeof import("fabric")) {
  const left = (mark.x / 100) * BASE_WIDTH;
  const top = (mark.y / 100) * BASE_HEIGHT;
  const common = {
    left,
    top,
    originX: mark.originX ?? "center",
    originY: mark.originY ?? "center",
    angle: mark.angle ?? 0,
    scaleX: mark.scaleX ?? 1,
    scaleY: mark.scaleY ?? 1,
    data: mark,
    objectCaching: false,
  };

  if (mark.imageSrc) {
    const image = await fabric.FabricImage.fromURL(mark.imageSrc);
    const targetWidth = BASE_WIDTH * ((mark.width ?? 34) / 100);
    image.set({ ...common, scaleX: targetWidth / (image.width || targetWidth), scaleY: targetWidth / (image.width || targetWidth) });
    return image;
  }

  if (mark.kind === "Pen" && mark.pathData?.length) {
    return new fabric.Path(mark.pathData as never, {
      ...common,
      fill: "",
      stroke: mark.color ?? "#d4ff3f",
      strokeWidth: mark.strokeWidth ?? 6,
      strokeLineCap: "round",
      strokeLineJoin: "round",
    });
  }

  if (mark.kind === "Text" || (mark.kind === "Clone" && mark.text)) {
    return new fabric.IText(mark.text ?? "Text", {
      ...common,
      fill: mark.color ?? "#111827",
      fontSize: mark.fontSize ?? 32,
      fontFamily: mark.fontFamily ?? "Arial",
      fontWeight: mark.fontWeight ?? "bold",
      editable: true,
      splitByGrapheme: false,
    });
  }

  if (mark.kind === "Shape" || (mark.kind === "Clone" && mark.shapeType)) {
    const fill = mark.color ?? "#d4ff3f";
    if (mark.shapeType === "circle") return new fabric.Circle({ ...common, radius: 30, fill });
    if (mark.shapeType === "triangle") return new fabric.Triangle({ ...common, width: 60, height: 48, fill });
    if (mark.shapeType === "star") {
      const points = Array.from({ length: 10 }, (_, index) => {
        const radius = index % 2 === 0 ? 30 : 13;
        const angle = (Math.PI * index) / 5 - Math.PI / 2;
        return { x: 30 + Math.cos(angle) * radius, y: 30 + Math.sin(angle) * radius };
      });
      return new fabric.Polygon(points, { ...common, fill });
    }
    return new fabric.Rect({ ...common, width: 60, height: 40, rx: 4, ry: 4, fill });
  }

  return new fabric.Rect({ ...common, width: 60, height: 40, fill: mark.color ?? "#d4ff3f" });
}

function objectToMark(object: FabricObject): CanvasMark | null {
  const mark = (object as DataObject).data;
  if (!mark) return null;
  const next: CanvasMark = {
    ...mark,
    x: ((object.left ?? 0) / BASE_WIDTH) * 100,
    y: ((object.top ?? 0) / BASE_HEIGHT) * 100,
    angle: object.angle ?? 0,
    scaleX: object.scaleX ?? 1,
    scaleY: object.scaleY ?? 1,
    originX: object.originX as CanvasMark["originX"],
    originY: object.originY as CanvasMark["originY"],
  };
  if ((mark.kind === "Text" || (mark.kind === "Clone" && mark.text)) && "text" in object) {
    const textObject = object as FabricObject & { text?: string; fontFamily?: string; fontWeight?: string; fontSize?: number; fill?: string };
    next.text = String(textObject.text ?? mark.text ?? "");
    next.fontFamily = textObject.fontFamily ?? mark.fontFamily ?? "Arial";
    next.fontWeight = textObject.fontWeight ?? mark.fontWeight ?? "bold";
    next.fontSize = textObject.fontSize ?? mark.fontSize ?? 32;
    next.color = typeof textObject.fill === "string" ? textObject.fill : mark.color;
  }
  if (mark.kind === "Pen") {
    const pathObject = object as FabricObject & { path?: Array<Array<string | number>>; stroke?: string; strokeWidth?: number };
    next.pathData = pathObject.path ?? mark.pathData;
    next.color = typeof pathObject.stroke === "string" ? pathObject.stroke : mark.color;
    next.strokeWidth = pathObject.strokeWidth ?? mark.strokeWidth;
  }
  if (mark.imageSrc) next.width = (object.getScaledWidth() / BASE_WIDTH) * 100;
  return next;
}

export default function FabricDesignCanvas({ activeTool, marks, layers, selectedLayerId, zoom, onSelectLayer, onAddMark, onRemoveMark, onMarksChange, onStatus }: Props) {
  const elementRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<FabricCanvas | null>(null);
  const callbacksRef = useRef({ onSelectLayer, onAddMark, onRemoveMark, onMarksChange, onStatus, activeTool, marks, layers, selectedLayerId });
  const localSignatureRef = useRef<string | null>(null);
  const suppressSelectionEventsRef = useRef(false);
  const panRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);

  callbacksRef.current = { onSelectLayer, onAddMark, onRemoveMark, onMarksChange, onStatus, activeTool, marks, layers, selectedLayerId };

  useEffect(() => {
    let disposed = false;
    let canvas: FabricCanvas | null = null;

    async function initialize() {
      const fabric = await import("fabric");
      if (disposed || !elementRef.current) return;
      canvas = new fabric.Canvas(elementRef.current, {
        width: BASE_WIDTH,
        height: BASE_HEIGHT,
        preserveObjectStacking: true,
        selection: true,
        stopContextMenu: true,
        fireRightClick: false,
        backgroundColor: "rgba(0,0,0,0)",
      });
      canvasRef.current = canvas;
      const wrapper = (canvas as FabricCanvas & { wrapperEl?: HTMLDivElement }).wrapperEl;
      if (wrapper) {
        wrapper.style.width = "100%";
        wrapper.style.height = "100%";
        wrapper.style.position = "absolute";
        wrapper.style.inset = "0";
      }
      canvas.lowerCanvasEl.style.width = "100%";
      canvas.lowerCanvasEl.style.height = "100%";
      canvas.upperCanvasEl.style.width = "100%";
      canvas.upperCanvasEl.style.height = "100%";

      const persist = () => {
        if (!canvas) return;
        const next = canvas.getObjects().map(objectToMark).filter((mark): mark is CanvasMark => Boolean(mark));
        const signature = JSON.stringify(next);
        if (signature === localSignatureRef.current) return;
        localSignatureRef.current = signature;
        callbacksRef.current.onMarksChange(next);
      };

      canvas.on("object:modified", persist);
      canvas.on("text:changed", persist);
      canvas.on("path:created", (event) => {
        const path = (event as unknown as { path?: DataObject & { path?: Array<Array<string | number>>; left?: number; top?: number; originX?: CanvasMark["originX"]; originY?: CanvasMark["originY"]; stroke?: string; strokeWidth?: number } }).path;
        if (!path?.path?.length) return;
        const mark: CanvasMark = {
          id: `pen-${Date.now()}`,
          kind: "Pen",
          x: ((path.left ?? 0) / BASE_WIDTH) * 100,
          y: ((path.top ?? 0) / BASE_HEIGHT) * 100,
          color: typeof path.stroke === "string" ? path.stroke : "#d4ff3f",
          strokeWidth: path.strokeWidth ?? 6,
          pathData: path.path,
          originX: path.originX ?? "left",
          originY: path.originY ?? "top",
        };
        path.data = mark;
        callbacksRef.current.onAddMark(mark);
        callbacksRef.current.onStatus("Pen stroke added as a vector path");
      });
      canvas.on("selection:created", (event) => {
        const data = (event.selected?.[0] as DataObject | undefined)?.data;
        if (!suppressSelectionEventsRef.current) callbacksRef.current.onSelectLayer(data?.id ?? null);
      });
      canvas.on("selection:updated", (event) => {
        const data = (event.selected?.[0] as DataObject | undefined)?.data;
        if (!suppressSelectionEventsRef.current) callbacksRef.current.onSelectLayer(data?.id ?? null);
      });
      canvas.on("selection:cleared", () => {
        if (!suppressSelectionEventsRef.current) callbacksRef.current.onSelectLayer(null);
      });
      canvas.on("mouse:down", (event) => {
        const tool = callbacksRef.current.activeTool;
        const pointer = canvas?.getPointer(event.e);
        if (!canvas || !pointer) return;
        if (tool === "hand") {
          const point = event.e as MouseEvent;
          panRef.current = { x: point.clientX, y: point.clientY, active: true };
          canvas.defaultCursor = "grabbing";
          return;
        }
        if (tool === "eraser") {
          const target = event.target as DataObject | undefined;
          const id = target?.data?.id;
          const layer = findLayer(callbacksRef.current.layers, id);
          const parent = layer?.parentId ? findLayer(callbacksRef.current.layers, layer.parentId) : undefined;
          if (id && !layer?.locked && !parent?.locked) callbacksRef.current.onRemoveMark(id);
          else if (id) callbacksRef.current.onStatus("This layer is locked");
          else callbacksRef.current.onStatus("Select an object first, then click to erase it");
          return;
        }
        if (tool === "shape" && !event.target) {
          callbacksRef.current.onAddMark({
            id: `shape-${Date.now()}`,
            kind: "Shape",
            shapeType: "rectangle",
            color: "#d4ff3f",
            x: (pointer.x / BASE_WIDTH) * 100,
            y: (pointer.y / BASE_HEIGHT) * 100,
          });
          callbacksRef.current.onStatus("Rectangle added · use the controls to resize or rotate");
        }
        if (tool === "clone-stamp" && !event.target) {
          const source = callbacksRef.current.marks.at(-1);
          if (source) callbacksRef.current.onAddMark({ ...source, id: `clone-${Date.now()}`, x: Math.min(source.x + 5, 95), y: Math.min(source.y + 5, 95) });
        }
      });
      canvas.on("mouse:move", (event) => {
        if (!canvas || !panRef.current.active) return;
        const point = event.e as MouseEvent;
        const transform = canvas.viewportTransform;
        transform[4] += point.clientX - panRef.current.x;
        transform[5] += point.clientY - panRef.current.y;
        panRef.current = { x: point.clientX, y: point.clientY, active: true };
        canvas.setViewportTransform(transform);
      });
      canvas.on("mouse:up", () => {
        panRef.current.active = false;
        if (canvas) canvas.defaultCursor = callbacksRef.current.activeTool === "hand" ? "grab" : "default";
      });
      setFabricCanvas(canvas);
    }

    void initialize();
    return () => {
      disposed = true;
      canvas?.dispose();
      canvasRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!fabricCanvas) return;
    const incoming = JSON.stringify(marks);
    const targetCanvas = fabricCanvas;
    if (localSignatureRef.current === incoming) {
      localSignatureRef.current = null;
      return;
    }
    let cancelled = false;
    async function reload() {
      const fabric = await import("fabric");
      if (cancelled) return;
      suppressSelectionEventsRef.current = true;
      targetCanvas.discardActiveObject();
      targetCanvas.clear();
      const orderedMarks = [...marks].sort((a, b) => layers.findIndex((layer) => layer.id === a.id) - layers.findIndex((layer) => layer.id === b.id));
      for (const mark of orderedMarks) {
        try {
          const object = await createObject(mark, fabric);
          if (cancelled) return;
          const layer = findLayer(layers, mark.id);
          const parent = layer?.parentId ? findLayer(layers, layer.parentId) : undefined;
          applyLayerStyle(object, layer, parent, fabric);
          targetCanvas.add(object);
        } catch {
          callbacksRef.current.onStatus("An object could not be loaded on the canvas");
        }
      }
      const selected = targetCanvas.getObjects().find((object) => (object as DataObject).data?.id === callbacksRef.current.selectedLayerId);
      if (selected?.selectable) targetCanvas.setActiveObject(selected);
      syncStacking(targetCanvas, layers);
      targetCanvas.requestRenderAll();
      suppressSelectionEventsRef.current = false;
    }
    void reload();
    return () => { cancelled = true; };
  }, [fabricCanvas, marks]);

  useEffect(() => {
    if (!fabricCanvas) return;
    const fabric = import("fabric");
    void fabric.then((module) => {
      for (const object of fabricCanvas.getObjects()) {
        const id = (object as DataObject).data?.id;
        const layer = findLayer(layers, id);
        const parent = layer?.parentId ? findLayer(layers, layer.parentId) : undefined;
        applyLayerStyle(object, layer, parent, module);
      }
      syncStacking(fabricCanvas, layers);
      fabricCanvas.requestRenderAll();
    });
  }, [fabricCanvas, layers]);

  useEffect(() => {
    if (!fabricCanvas) return;
    fabricCanvas.isDrawingMode = activeTool === "pen";
    if (activeTool === "hand") {
      fabricCanvas.selection = false;
      for (const object of fabricCanvas.getObjects()) object.set({ selectable: false, evented: false });
    } else {
      fabricCanvas.selection = activeTool === "move" || activeTool === "marquee";
      if (activeTool === "pen") {
        void import("fabric").then((module) => {
          if (callbacksRef.current.activeTool !== "pen") return;
          const brush = new module.PencilBrush(fabricCanvas);
          brush.color = "#d4ff3f";
          brush.width = 6;
          fabricCanvas.freeDrawingBrush = brush;
        });
      }
      void import("fabric").then((fabric) => {
        for (const object of fabricCanvas.getObjects()) {
          const id = (object as DataObject).data?.id;
          const layer = findLayer(layers, id);
          const parent = layer?.parentId ? findLayer(layers, layer.parentId) : undefined;
          applyLayerStyle(object, layer, parent, fabric);
        }
        fabricCanvas.requestRenderAll();
      });
    }
    fabricCanvas.defaultCursor = activeTool === "hand" ? "grab" : "default";
    fabricCanvas.requestRenderAll();
  }, [activeTool, fabricCanvas, layers]);

  useEffect(() => {
    if (!fabricCanvas) return;
    const selected = fabricCanvas.getObjects().find((object) => (object as DataObject).data?.id === selectedLayerId);
    if (selected?.selectable) {
      fabricCanvas.setActiveObject(selected);
    } else {
      suppressSelectionEventsRef.current = true;
      fabricCanvas.discardActiveObject();
      suppressSelectionEventsRef.current = false;
    }
    fabricCanvas.requestRenderAll();
  }, [fabricCanvas, selectedLayerId]);

  useEffect(() => {
    if (!fabricCanvas) return;
    fabricCanvas.setZoom(zoom / 100);
    fabricCanvas.requestRenderAll();
  }, [fabricCanvas, zoom]);

  return <canvas ref={elementRef} className="absolute inset-0 h-full w-full" aria-label="Design canvas. Select and drag objects; use corner controls to resize and rotate." />;
}
