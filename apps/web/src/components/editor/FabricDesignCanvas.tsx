"use client";

import { useEffect, useRef, useState } from "react";
import type { Canvas as FabricCanvas, FabricObject } from "fabric";
import type { ToolId } from "./EditorLeftRail";
import type { EditorLayer } from "./LayersPanel";
import type { CanvasMark, ShapeType } from "./InteractiveCanvas";

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
  toolColor: string;
  shapeType: ShapeType;
  penWidth: number;
  gradientEndColor: string;
  magicWandTolerance: number;
  onColorSampled: (color: string) => void;
  onZoomChange: (zoom: number) => void;
  resetViewToken: number;
};

type CanvasPoint = { x: number; y: number };
type ToolGesture = {
  kind: "shape" | "gradient" | "lasso" | "ruler" | "rotate-view";
  start: CanvasPoint;
  current: CanvasPoint;
  points?: CanvasPoint[];
  targetId?: string;
  pointerAngle?: number;
  startViewAngle?: number;
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
  "color-dodge": "color-dodge",
  "color-burn": "color-burn",
  "hard-light": "hard-light",
  "soft-light": "soft-light",
  difference: "difference",
  exclusion: "exclusion",
  hue: "hue",
  saturation: "saturation",
  color: "color",
  luminosity: "luminosity",
  lighter: "lighter",
};

type DataObject = FabricObject & { data?: CanvasMark };

function findLayer(layers: EditorLayer[], id: string | undefined) {
  if (!id) return undefined;
  return layers.find((layer) => layer.id === id);
}

function layerIsLocked(layers: EditorLayer[], id: string | undefined) {
  let layer = findLayer(layers, id);
  while (layer) {
    if (layer.locked) return true;
    layer = layer.parentId ? findLayer(layers, layer.parentId) : undefined;
  }
  return false;
}

function clearTransientObjects(canvas: FabricCanvas, objects: FabricObject[]) {
  for (const object of objects) canvas.remove(object);
  objects.length = 0;
}

function pointInPolygon(point: CanvasPoint, polygon: CanvasPoint[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const crosses = (a.y > point.y) !== (b.y > point.y)
      && point.x < ((b.x - a.x) * (point.y - a.y)) / ((b.y - a.y) || Number.EPSILON) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function sampleCanvasColor(canvas: FabricCanvas, event: Event) {
  const point = event as MouseEvent;
  const rect = canvas.lowerCanvasEl.getBoundingClientRect();
  const x = Math.floor((point.clientX - rect.left) * canvas.lowerCanvasEl.width / rect.width);
  const y = Math.floor((point.clientY - rect.top) * canvas.lowerCanvasEl.height / rect.height);
  if (x < 0 || y < 0 || x >= canvas.lowerCanvasEl.width || y >= canvas.lowerCanvasEl.height) return null;
  const context = canvas.lowerCanvasEl.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  try {
    const [red, green, blue, alpha] = context.getImageData(x, y, 1, 1).data;
    if (alpha < 24) return null;
    return `#${[red, green, blue].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
  } catch {
    return null;
  }
}

function colorDistance(first: string, second: string, fabric: typeof import("fabric")) {
  try {
    const a = new fabric.Color(first).getSource();
    const b = new fabric.Color(second).getSource();
    return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function createGradientFill(object: FabricObject, gradient: NonNullable<CanvasMark["gradient"]>, opacity: number, fabric: typeof import("fabric")) {
  const width = Math.max(1, object.width ?? 100);
  const height = Math.max(1, object.height ?? 100);
  const radians = (gradient.angle * Math.PI) / 180;
  const dx = Math.cos(radians) * width / 2;
  const dy = Math.sin(radians) * height / 2;
  const alphaColor = (color: string) => new fabric.Color(color).setAlpha(opacity).toRgba();
  return new fabric.Gradient({
    type: "linear",
    gradientUnits: "pixels",
    coords: { x1: width / 2 - dx, y1: height / 2 - dy, x2: width / 2 + dx, y2: height / 2 + dy },
    colorStops: [
      { offset: 0, color: alphaColor(gradient.startColor) },
      { offset: 1, color: alphaColor(gradient.endColor) },
    ],
  });
}

function rotateViewportBy(canvas: FabricCanvas, delta: number) {
  if (Math.abs(delta) < 0.0001) return;
  const [a, b, c, d, e, f] = canvas.viewportTransform;
  const cosine = Math.cos(delta);
  const sine = Math.sin(delta);
  const centerX = canvas.getWidth() / 2;
  const centerY = canvas.getHeight() / 2;
  const next = [
    cosine * a - sine * b,
    sine * a + cosine * b,
    cosine * c - sine * d,
    sine * c + cosine * d,
    cosine * e - sine * f + centerX - cosine * centerX + sine * centerY,
    sine * e + cosine * f + centerY - sine * centerX - cosine * centerY,
  ];
  canvas.setViewportTransform(next as typeof canvas.viewportTransform);
}

async function syncClippingMasks(canvas: FabricCanvas, layers: EditorLayer[]) {
  const objects = canvas.getObjects();
  for (const object of objects) {
    const layer = findLayer(layers, (object as DataObject).data?.id);
    if (!layer?.clipping || layer.isGroup) {
      object.set("clipPath", undefined);
      continue;
    }
    const siblings = layers.filter((candidate) => candidate.parentId === layer.parentId && !candidate.isGroup);
    const index = siblings.findIndex((candidate) => candidate.id === layer.id);
    const base = siblings.slice(0, index).reverse().find((candidate) => !candidate.clipping);
    const baseObject = base && objects.find((candidate) => (candidate as DataObject).data?.id === base.id);
    if (!baseObject) {
      object.set("clipPath", undefined);
      continue;
    }
    const clipPath = await baseObject.clone();
    clipPath.set({ absolutePositioned: true, shadow: undefined, opacity: 1, globalCompositeOperation: "source-over" });
    object.set({
      opacity: (object.opacity ?? 1) * ((base.opacity ?? 100) / 100),
      globalCompositeOperation: baseObject.globalCompositeOperation ?? "source-over",
    });
    object.set("clipPath", clipPath);
  }
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

function installGroupCompositor(canvas: FabricCanvas, getLayers: () => EditorLayer[]) {
  const originalRenderObjects = canvas._renderObjects.bind(canvas);
  const buffers = new Map<string, { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D }>();
  canvas._renderObjects = (ctx: CanvasRenderingContext2D, objects: FabricObject[]) => {
    const layers = getLayers();
    if (!layers.some((layer) => layer.isGroup && !layer.parentId)) {
      originalRenderObjects(ctx, objects);
      return;
    }
    const renderedGroups = new Set<string>();
    for (const object of objects) {
      const layer = findLayer(layers, (object as DataObject).data?.id);
      const group = layer?.parentId ? findLayer(layers, layer.parentId) : layer?.isGroup ? layer : undefined;
      if (!group) {
        if (!layer?.parentId) object.render(ctx);
        continue;
      }
      if ((group.blendMode ?? "pass-through") === "pass-through") {
        if (layer?.parentId) object.render(ctx);
        continue;
      }
      if (renderedGroups.has(group.id)) continue;
      renderedGroups.add(group.id);
      const children = objects.filter((candidate) => findLayer(layers, (candidate as DataObject).data?.id)?.parentId === group.id);
      if (!group.visible || !children.length) continue;
      let buffer = buffers.get(group.id);
      if (!buffer) {
        const offscreen = document.createElement("canvas");
        offscreen.width = BASE_WIDTH;
        offscreen.height = BASE_HEIGHT;
        const offscreenContext = offscreen.getContext("2d");
        if (!offscreenContext) continue;
        buffer = { canvas: offscreen, context: offscreenContext };
        buffers.set(group.id, buffer);
      }
      const { canvas: offscreen, context: offscreenContext } = buffer;
      offscreenContext.clearRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
      for (const child of children) child.render(offscreenContext);
      ctx.save();
      ctx.globalAlpha *= ((group.opacity ?? 100) / 100) * ((group.flow ?? 100) / 100) * ((group.hasMask ? group.maskAmount ?? 100 : 100) / 100);
      ctx.globalCompositeOperation = COMPOSITE[group.blendMode ?? "normal"] ?? "source-over";
      ctx.drawImage(offscreen, 0, 0);
      ctx.restore();
    }
  };
}

function effectShadow(effects: string[], fabric: typeof import("fabric")) {
  if (effects.includes("glow")) return new fabric.Shadow({ color: "#d4ff3f", blur: 14, offsetX: 0, offsetY: 0 });
  if (effects.includes("shadow")) return new fabric.Shadow({ color: "rgba(0,0,0,0.42)", blur: 8, offsetX: 3, offsetY: 4 });
  return undefined;
}

function applyLayerStyle(object: FabricObject, layer: EditorLayer | undefined, parent: EditorLayer | undefined, fabric: typeof import("fabric")) {
  const passThroughParent = parent && (parent.blendMode ?? "pass-through") === "pass-through";
  const opacity = ((layer?.opacity ?? 100) / 100) * ((layer?.flow ?? 100) / 100) * ((layer?.hasMask ? layer.maskAmount ?? 100 : 100) / 100) * (passThroughParent ? ((parent.opacity ?? 100) / 100) * ((parent.flow ?? 100) / 100) * ((parent.hasMask ? parent.maskAmount ?? 100 : 100) / 100) : 1);
  const locked = Boolean(layer?.locked || parent?.locked);
  const effects = [...(parent?.effects ?? []), ...(layer?.effects ?? [])];
  const shadow = effectShadow(effects, fabric);
  const mark = (object as DataObject).data;
  const fill = Math.max(0, Math.min(100, layer?.fillOpacity ?? 100)) / 100;
  const contentColor = (color: string | undefined) => color ? new fabric.Color(color).setAlpha(fill).toRgba() : undefined;
  object.set({
    visible: (layer?.visible ?? true) && (parent?.visible ?? true),
    opacity,
    selectable: !locked,
    evented: true,
    globalCompositeOperation: parent && !passThroughParent ? "source-over" : COMPOSITE[layer?.blendMode ?? "normal"] ?? "source-over",
    shadow,
    stroke: effects.includes("stroke") ? "#d4ff3f" : undefined,
    strokeWidth: effects.includes("stroke") ? 2 : 0,
  });
  const image = object as FabricObject & { filters?: unknown[]; applyFilters?: () => void };
  if (mark?.imageSrc && image.filters && image.applyFilters) {
    image.filters = [
      ...(effects.includes("blur") ? [new fabric.filters.Blur({ blur: 0.08 })] : []),
      ...(effects.includes("sharpen") ? [new fabric.filters.Convolute({ matrix: [0, -1, 0, -1, 5, -1, 0, -1, 0] })] : []),
      ...(fill < 1 ? [new fabric.filters.ColorMatrix({ matrix: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, fill, 0], colorsOnly: false })] : []),
    ];
    image.applyFilters();
  } else if (mark?.kind === "Text" || (mark?.kind === "Clone" && mark.text)) {
    object.set("fill", mark.gradient ? createGradientFill(object, mark.gradient, fill, fabric) : contentColor(mark.color ?? "#111827"));
  } else if (mark?.kind === "Pen") {
    object.set("stroke", contentColor(mark.color ?? "#d4ff3f"));
  } else if (mark?.kind === "Shape" || (mark?.kind === "Clone" && mark.shapeType)) {
    object.set("fill", mark.gradient ? createGradientFill(object, mark.gradient, fill, fabric) : contentColor(mark.color ?? "#d4ff3f"));
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
      fontStyle: mark.fontStyle ?? "normal",
      underline: mark.underline ?? false,
      textAlign: mark.textAlign ?? "center",
      charSpacing: mark.charSpacing ?? 0,
      lineHeight: mark.lineHeight ?? 1.16,
      editable: true,
      splitByGrapheme: false,
    });
  }

  if (mark.kind === "Shape" || (mark.kind === "Clone" && mark.shapeType)) {
    const fill = mark.color ?? "#d4ff3f";
    const width = Math.max(8, mark.shapeWidth ?? 60);
    const height = Math.max(8, mark.shapeHeight ?? 40);
    if (mark.shapeType === "circle") return new fabric.Circle({ ...common, radius: Math.min(width, height) / 2, fill });
    if (mark.shapeType === "triangle") return new fabric.Triangle({ ...common, width, height, fill });
    if (mark.shapeType === "star") {
      const points = Array.from({ length: 10 }, (_, index) => {
        const radius = index % 2 === 0 ? 0.48 : 0.21;
        const angle = (Math.PI * index) / 5 - Math.PI / 2;
        return { x: width / 2 + Math.cos(angle) * width * radius, y: height / 2 + Math.sin(angle) * height * radius };
      });
      return new fabric.Polygon(points, { ...common, fill });
    }
    return new fabric.Rect({ ...common, width, height, rx: 4, ry: 4, fill });
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
    const textObject = object as FabricObject & { text?: string; fontFamily?: string; fontWeight?: string; fontStyle?: string; underline?: boolean; textAlign?: CanvasMark["textAlign"]; charSpacing?: number; lineHeight?: number; fontSize?: number; fill?: string };
    next.text = String(textObject.text ?? mark.text ?? "");
    next.fontFamily = textObject.fontFamily ?? mark.fontFamily ?? "Arial";
    next.fontWeight = textObject.fontWeight ?? mark.fontWeight ?? "bold";
    next.fontStyle = textObject.fontStyle === "italic" ? "italic" : mark.fontStyle ?? "normal";
    next.underline = textObject.underline ?? mark.underline ?? false;
    next.textAlign = textObject.textAlign ?? mark.textAlign ?? "center";
    next.charSpacing = textObject.charSpacing ?? mark.charSpacing ?? 0;
    next.lineHeight = textObject.lineHeight ?? mark.lineHeight ?? 1.16;
    next.fontSize = textObject.fontSize ?? mark.fontSize ?? 32;
    next.color = typeof textObject.fill === "string" ? textObject.fill : mark.color;
  }
  if (mark.kind === "Pen") {
    const pathObject = object as FabricObject & { path?: Array<Array<string | number>>; stroke?: string; strokeWidth?: number };
    next.pathData = pathObject.path ?? mark.pathData;
    next.color = typeof pathObject.stroke === "string" ? pathObject.stroke : mark.color;
    next.strokeWidth = pathObject.strokeWidth ?? mark.strokeWidth;
  }
  return next;
}

export default function FabricDesignCanvas({ activeTool, marks, layers, selectedLayerId, zoom, onSelectLayer, onAddMark, onRemoveMark, onMarksChange, onStatus, toolColor, shapeType, penWidth, gradientEndColor, magicWandTolerance, onColorSampled, onZoomChange, resetViewToken }: Props) {
  const elementRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<FabricCanvas | null>(null);
  const callbacksRef = useRef({ onSelectLayer, onAddMark, onRemoveMark, onMarksChange, onStatus, onColorSampled, onZoomChange, activeTool, marks, layers, selectedLayerId, toolColor, shapeType, penWidth, gradientEndColor, magicWandTolerance, zoom });
  const localSignatureRef = useRef<string | null>(null);
  const suppressSelectionEventsRef = useRef(false);
  const panRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
  const gestureRef = useRef<ToolGesture | null>(null);
  const transientObjectsRef = useRef<FabricObject[]>([]);
  const viewAngleRef = useRef(0);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);

  callbacksRef.current = { onSelectLayer, onAddMark, onRemoveMark, onMarksChange, onStatus, onColorSampled, onZoomChange, activeTool, marks, layers, selectedLayerId, toolColor, shapeType, penWidth, gradientEndColor, magicWandTolerance, zoom };

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
      installGroupCompositor(canvas, () => callbacksRef.current.layers);
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

      const clearToolOverlays = () => clearTransientObjects(canvas!, transientObjectsRef.current);
      const addToolOverlay = (object: FabricObject) => {
        object.set({ selectable: false, evented: false, excludeFromExport: true, objectCaching: false });
        canvas!.add(object);
        transientObjectsRef.current.push(object);
      };
      const selectToolObjects = (objects: FabricObject[]) => {
        const candidates = objects.filter((object) => {
          const id = (object as DataObject).data?.id;
          return Boolean(id) && !layerIsLocked(callbacksRef.current.layers, id);
        });
        suppressSelectionEventsRef.current = true;
        canvas!.discardActiveObject();
        if (candidates.length === 1) canvas!.setActiveObject(candidates[0]);
        else if (candidates.length > 1) canvas!.setActiveObject(new fabric.ActiveSelection(candidates, { canvas: canvas! }));
        suppressSelectionEventsRef.current = false;
        callbacksRef.current.onSelectLayer((candidates[0] as DataObject | undefined)?.data?.id ?? null);
        canvas!.requestRenderAll();
        return candidates.length;
      };
      const drawMeasure = (start: CanvasPoint, end: CanvasPoint) => {
        clearToolOverlays();
        const distance = Math.hypot(end.x - start.x, end.y - start.y);
        const angle = (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI;
        addToolOverlay(new fabric.Line([start.x, start.y, end.x, end.y], { stroke: "#d4ff3f", strokeWidth: 1, strokeDashArray: [7, 4] }));
        addToolOverlay(new fabric.IText(`${distance.toFixed(1)} px · ${angle.toFixed(1)}°`, {
          left: (start.x + end.x) / 2,
          top: (start.y + end.y) / 2,
          originX: "center",
          originY: "center",
          fontFamily: "Arial",
          fontSize: 12,
          fontWeight: "bold",
          fill: "#d4ff3f",
          backgroundColor: "rgba(17,24,39,0.86)",
          padding: 4,
        }));
        callbacksRef.current.onStatus(`Measured ${distance.toFixed(1)} canvas px at ${angle.toFixed(1)}°`);
      };
      const drawLasso = (points: CanvasPoint[]) => {
        clearToolOverlays();
        if (points.length < 2) return;
        const path = points.map((point, index) => [index ? "L" : "M", point.x, point.y] as Array<string | number>);
        path.push(["Z"]);
        addToolOverlay(new fabric.Path(path as never, { fill: "rgba(212,255,63,0.08)", stroke: "#d4ff3f", strokeWidth: 1, strokeDashArray: [5, 3] }));
      };
      const drawDragPreview = (gesture: ToolGesture) => {
        clearToolOverlays();
        const left = Math.min(gesture.start.x, gesture.current.x);
        const top = Math.min(gesture.start.y, gesture.current.y);
        const width = Math.max(2, Math.abs(gesture.current.x - gesture.start.x));
        const height = Math.max(2, Math.abs(gesture.current.y - gesture.start.y));
        if (gesture.kind === "shape") {
          addToolOverlay(new fabric.Rect({ left, top, width, height, fill: "rgba(212,255,63,0.12)", stroke: "#d4ff3f", strokeWidth: 1, strokeDashArray: [5, 3] }));
        } else if (gesture.kind === "gradient") {
          const preview = new fabric.Rect({ left, top, width, height, stroke: "#d4ff3f", strokeWidth: 1, strokeDashArray: [5, 3] });
          const angle = (Math.atan2(gesture.current.y - gesture.start.y, gesture.current.x - gesture.start.x) * 180) / Math.PI;
          preview.set("fill", createGradientFill(preview, { startColor: callbacksRef.current.toolColor, endColor: callbacksRef.current.gradientEndColor, angle }, 0.78, fabric));
          addToolOverlay(preview);
        } else if (gesture.kind === "ruler") {
          drawMeasure(gesture.start, gesture.current);
        } else if (gesture.kind === "lasso") {
          drawLasso(gesture.points ?? [gesture.start, gesture.current]);
        }
        canvas!.requestRenderAll();
      };

      canvas.on("object:modified", persist);
      canvas.on("text:changed", persist);
      canvas.on("path:created", (event) => {
        const path = (event as unknown as { path?: DataObject & { path?: Array<Array<string | number>>; left?: number; top?: number; originX?: CanvasMark["originX"]; originY?: CanvasMark["originY"]; stroke?: string; strokeWidth?: number } }).path;
        if (!path?.path?.length) return;
        const mark: CanvasMark = {
          id: `pen-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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
        const nativeEvent = event.e as MouseEvent;
        const target = event.target as DataObject | undefined;
        const targetMark = target?.data;

        if (tool === "hand") {
          panRef.current = { x: nativeEvent.clientX, y: nativeEvent.clientY, active: true };
          canvas.defaultCursor = "grabbing";
          return;
        }
        if (tool === "rotate-view") {
          const rect = canvas.upperCanvasEl.getBoundingClientRect();
          const localX = (nativeEvent.clientX - rect.left) * canvas.getWidth() / rect.width;
          const localY = (nativeEvent.clientY - rect.top) * canvas.getHeight() / rect.height;
          gestureRef.current = {
            kind: "rotate-view",
            start: pointer,
            current: pointer,
            pointerAngle: Math.atan2(localY - canvas.getHeight() / 2, localX - canvas.getWidth() / 2),
            startViewAngle: viewAngleRef.current,
          };
          canvas.defaultCursor = "grabbing";
          return;
        }
        if (tool === "zoom") {
          const direction = nativeEvent.shiftKey || nativeEvent.altKey ? -1 : 1;
          const nextZoom = Math.max(40, Math.min(180, callbacksRef.current.zoom + direction * 20));
          callbacksRef.current.onZoomChange(nextZoom);
          callbacksRef.current.onStatus(`Zoom ${nextZoom}% · ${direction > 0 ? "in" : "out"}`);
          return;
        }
        if (tool === "shape" || tool === "gradient" || tool === "lasso" || tool === "ruler") {
          clearToolOverlays();
          const kind: ToolGesture["kind"] = tool === "shape" ? "shape" : tool;
          gestureRef.current = {
            kind,
            start: pointer,
            current: pointer,
            points: kind === "lasso" ? [pointer] : undefined,
            targetId: kind === "gradient" ? targetMark?.id ?? callbacksRef.current.selectedLayerId ?? undefined : undefined,
          };
          callbacksRef.current.onStatus(kind === "gradient" ? "Drag to set the gradient direction" : `Drawing ${kind} gesture…`);
          return;
        }
        if (tool === "eyedropper") {
          const sampled = sampleCanvasColor(canvas, event.e) ?? targetMark?.gradient?.startColor ?? targetMark?.color;
          if (!sampled) {
            callbacksRef.current.onStatus("No visible artwork at this point to sample");
            return;
          }
          callbacksRef.current.onColorSampled(sampled);
          callbacksRef.current.onStatus(`Sampled ${sampled.toUpperCase()} as the current tool color`);
          return;
        }
        if (tool === "magic-wand") {
          if (targetMark?.imageSrc) {
            const count = target ? selectToolObjects([target]) : 0;
            callbacksRef.current.onStatus(count ? "Raster image selected as one object; pixel-level Magic Wand selection is not included" : "This raster layer is locked");
            return;
          }
          const sampled = sampleCanvasColor(canvas, event.e);
          const targetColor = targetMark?.gradient?.startColor ?? targetMark?.color ?? sampled;
          if (!targetColor) {
            callbacksRef.current.onStatus("Click a visible colored object to select matching fills");
            return;
          }
          const candidates = canvas.getObjects().filter((object) => {
            const mark = (object as DataObject).data;
            if (!mark || layerIsLocked(callbacksRef.current.layers, mark.id)) return false;
            if (mark.imageSrc) return object === target;
            const colors = mark.gradient ? [mark.gradient.startColor, mark.gradient.endColor] : [mark.color];
            return colors.some((color) => Boolean(color) && colorDistance(color!, targetColor, fabric) <= callbacksRef.current.magicWandTolerance);
          });
          const count = selectToolObjects(candidates);
          callbacksRef.current.onStatus(count ? `Magic Wand selected ${count} object${count === 1 ? "" : "s"} within color tolerance ${callbacksRef.current.magicWandTolerance}` : "No matching vector/text fills found");
          return;
        }
        if (tool === "path-select") {
          if (target && (targetMark?.kind === "Pen" || Boolean(targetMark?.pathData))) {
            const count = selectToolObjects([target]);
            callbacksRef.current.onStatus(count ? "Vector path selected · drag to move or use its handles to transform" : "This path is locked");
          } else {
            callbacksRef.current.onStatus("Path Select works on whole Pen paths; anchor-point editing is not included");
          }
          return;
        }
        if (tool === "eraser") {
          const id = targetMark?.id;
          if (id && !layerIsLocked(callbacksRef.current.layers, id)) {
            callbacksRef.current.onRemoveMark(id);
            callbacksRef.current.onStatus("Artwork erased; the layer remains empty and reusable");
          }
          else if (id) callbacksRef.current.onStatus("This layer is locked");
          else callbacksRef.current.onStatus("Click artwork to erase the object and keep its layer; pixel erasing is not included");
          return;
        }
        if (tool === "clone-stamp") {
          const sourceMark = targetMark ?? callbacksRef.current.marks.find((mark) => mark.id === callbacksRef.current.selectedLayerId);
          if (!sourceMark) {
            callbacksRef.current.onStatus("Select or click a source object before using Clone Stamp");
            return;
          }
          if (layerIsLocked(callbacksRef.current.layers, sourceMark.id)) {
            callbacksRef.current.onStatus("Clone Stamp cannot copy a locked source layer");
            return;
          }
          const clone: CanvasMark = {
            ...sourceMark,
            id: `clone-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            x: (pointer.x / BASE_WIDTH) * 100,
            y: (pointer.y / BASE_HEIGHT) * 100,
            originX: "center",
            originY: "center",
          };
          callbacksRef.current.onAddMark(clone);
          callbacksRef.current.onStatus("Object stamped as a new editable layer · Undo to remove");
        }
      });
      canvas.on("mouse:move", (event) => {
        if (!canvas) return;
        const nativeEvent = event.e as MouseEvent;
        if (panRef.current.active) {
          const transform = [...canvas.viewportTransform] as typeof canvas.viewportTransform;
          transform[4] += nativeEvent.clientX - panRef.current.x;
          transform[5] += nativeEvent.clientY - panRef.current.y;
          panRef.current = { x: nativeEvent.clientX, y: nativeEvent.clientY, active: true };
          canvas.setViewportTransform(transform);
          return;
        }
        const gesture = gestureRef.current;
        if (gesture?.kind === "rotate-view") {
          const rect = canvas.upperCanvasEl.getBoundingClientRect();
          const localX = (nativeEvent.clientX - rect.left) * canvas.getWidth() / rect.width;
          const localY = (nativeEvent.clientY - rect.top) * canvas.getHeight() / rect.height;
          const currentPointerAngle = Math.atan2(localY - canvas.getHeight() / 2, localX - canvas.getWidth() / 2);
          let pointerDelta = currentPointerAngle - (gesture.pointerAngle ?? currentPointerAngle);
          if (pointerDelta > Math.PI) pointerDelta -= Math.PI * 2;
          if (pointerDelta < -Math.PI) pointerDelta += Math.PI * 2;
          const targetAngle = (gesture.startViewAngle ?? 0) + pointerDelta;
          rotateViewportBy(canvas, targetAngle - viewAngleRef.current);
          viewAngleRef.current = targetAngle;
          const degrees = Math.round((targetAngle * 180) / Math.PI);
          callbacksRef.current.onStatus(`Canvas view rotated ${degrees}° · artwork unchanged`);
          return;
        }
        if (!gesture) return;
        const current = canvas.getPointer(event.e);
        gesture.current = current;
        if (gesture.kind === "lasso") {
          const points = gesture.points ?? [gesture.start];
          const previous = points[points.length - 1];
          if (Math.hypot(current.x - previous.x, current.y - previous.y) >= 3) points.push(current);
          gesture.points = points;
        }
        if (gesture.kind === "shape" || gesture.kind === "gradient" || gesture.kind === "lasso" || gesture.kind === "ruler") {
          drawDragPreview(gesture);
        }
      });
      canvas.on("mouse:up", () => {
        if (!canvas) return;
        panRef.current.active = false;
        const gesture = gestureRef.current;
        gestureRef.current = null;
        if (gesture && gesture.kind !== "ruler") clearToolOverlays();
        if (gesture?.kind === "shape") {
          const rawWidth = Math.abs(gesture.current.x - gesture.start.x);
          const rawHeight = Math.abs(gesture.current.y - gesture.start.y);
          let shapeWidth = rawWidth < 4 ? 60 : Math.max(8, rawWidth);
          let shapeHeight = rawHeight < 4 ? 40 : Math.max(8, rawHeight);
          if (callbacksRef.current.shapeType === "circle") {
            const size = Math.max(shapeWidth, shapeHeight);
            shapeWidth = size;
            shapeHeight = size;
          }
          callbacksRef.current.onAddMark({
            id: `shape-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            kind: "Shape",
            shapeType: callbacksRef.current.shapeType,
            color: callbacksRef.current.toolColor,
            x: ((gesture.start.x + gesture.current.x) / 2 / BASE_WIDTH) * 100,
            y: ((gesture.start.y + gesture.current.y) / 2 / BASE_HEIGHT) * 100,
            shapeWidth,
            shapeHeight,
          });
          callbacksRef.current.onStatus(`${callbacksRef.current.shapeType} added as an editable shape layer`);
        } else if (gesture?.kind === "lasso") {
          const polygon = gesture.points ?? [];
          if (polygon.length >= 3) {
            const contained = canvas.getObjects().filter((object) => {
              const id = (object as DataObject).data?.id;
              return Boolean(id) && !layerIsLocked(callbacksRef.current.layers, id) && pointInPolygon(object.getCenterPoint(), polygon);
            });
            const count = selectToolObjects(contained);
            callbacksRef.current.onStatus(count ? `Lasso selected ${count} object${count === 1 ? "" : "s"} by center point` : "No object centers fell inside the lasso");
          } else callbacksRef.current.onStatus("Draw a larger lasso loop around object centers");
        } else if (gesture?.kind === "gradient") {
          const angle = (Math.atan2(gesture.current.y - gesture.start.y, gesture.current.x - gesture.start.x) * 180) / Math.PI;
          const gradient = { startColor: callbacksRef.current.toolColor, endColor: callbacksRef.current.gradientEndColor, angle: Number.isFinite(angle) ? angle : 0 };
          const targetId = gesture.targetId;
          const sourceMark = targetId && callbacksRef.current.marks.find((mark) => mark.id === targetId);
          if (sourceMark) {
            if (sourceMark.imageSrc || sourceMark.kind === "Pen") {
              callbacksRef.current.onStatus("Gradient fill currently supports text and filled vector shapes, not raster images or strokes");
            } else {
              callbacksRef.current.onMarksChange(callbacksRef.current.marks.map((mark) => mark.id === targetId ? { ...mark, gradient } : mark));
              callbacksRef.current.onStatus("Editable linear gradient applied to the selected vector/text layer");
            }
          } else {
            const width = Math.max(40, Math.abs(gesture.current.x - gesture.start.x));
            const height = Math.max(28, Math.abs(gesture.current.y - gesture.start.y));
            callbacksRef.current.onAddMark({
              id: `gradient-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              kind: "Shape",
              shapeType: "rectangle",
              color: callbacksRef.current.toolColor,
              gradient,
              x: ((gesture.start.x + gesture.current.x) / 2 / BASE_WIDTH) * 100,
              y: ((gesture.start.y + gesture.current.y) / 2 / BASE_HEIGHT) * 100,
              shapeWidth: width,
              shapeHeight: height,
            });
            callbacksRef.current.onStatus("Editable gradient rectangle added as a new layer");
          }
        } else if (gesture?.kind === "rotate-view") {
          callbacksRef.current.onStatus("Canvas view rotation finished · artwork unchanged");
        }
        if (canvas) {
          const tool = callbacksRef.current.activeTool;
          const crosshairTools: ToolId[] = ["shape", "pen", "lasso", "magic-wand", "eyedropper", "gradient", "eraser", "ruler", "clone-stamp"];
          canvas.defaultCursor = tool === "hand" || tool === "rotate-view" ? "grab" : tool === "zoom" ? "zoom-in" : crosshairTools.includes(tool) ? "crosshair" : "default";
          canvas.requestRenderAll();
        }
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
      await syncClippingMasks(targetCanvas, layers);
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
    void fabric.then(async (module) => {
      for (const object of fabricCanvas.getObjects()) {
        const id = (object as DataObject).data?.id;
        const layer = findLayer(layers, id);
        const parent = layer?.parentId ? findLayer(layers, layer.parentId) : undefined;
        applyLayerStyle(object, layer, parent, module);
      }
      await syncClippingMasks(fabricCanvas, layers);
      syncStacking(fabricCanvas, layers);
      fabricCanvas.requestRenderAll();
    });
  }, [fabricCanvas, layers]);

  useEffect(() => {
    if (!fabricCanvas) return;
    fabricCanvas.isDrawingMode = activeTool === "pen";
    fabricCanvas.selection = activeTool === "move" || activeTool === "marquee";
    clearTransientObjects(fabricCanvas, transientObjectsRef.current);
    if (!["move", "marquee", "path-select", "magic-wand"].includes(activeTool)) {
      suppressSelectionEventsRef.current = true;
      fabricCanvas.discardActiveObject();
      suppressSelectionEventsRef.current = false;
    }
    if (activeTool === "move" || activeTool === "marquee") {
      const selected = fabricCanvas.getObjects().find((object) => (object as DataObject).data?.id === callbacksRef.current.selectedLayerId);
      if (selected?.selectable) fabricCanvas.setActiveObject(selected);
    }
    void import("fabric").then(async (fabric) => {
      if (callbacksRef.current.activeTool !== activeTool) return;
      if (activeTool === "pen") {
        const brush = new fabric.PencilBrush(fabricCanvas);
        brush.color = callbacksRef.current.toolColor;
        brush.width = callbacksRef.current.penWidth;
        fabricCanvas.freeDrawingBrush = brush;
      }
      for (const object of fabricCanvas.getObjects()) {
        const id = (object as DataObject).data?.id;
        const mark = (object as DataObject).data;
        const layer = findLayer(layers, id);
        const parent = layer?.parentId ? findLayer(layers, layer.parentId) : undefined;
        applyLayerStyle(object, layer, parent, fabric);
        const locked = layerIsLocked(layers, id);
        const pathObject = mark?.kind === "Pen" || Boolean(mark?.pathData);
        const selectable = !locked && (
          activeTool === "move" || activeTool === "marquee" || activeTool === "magic-wand"
          || (activeTool === "path-select" && pathObject)
        );
        const eventedTools: ToolId[] = ["move", "marquee", "path-select", "clone-stamp", "gradient", "eraser", "magic-wand", "eyedropper"];
        const evented = !locked && eventedTools.includes(activeTool) && (activeTool !== "path-select" || pathObject);
        object.set({ selectable, evented });
      }
      const cursors: Record<ToolId, string> = {
        move: "default", marquee: "crosshair", lasso: "crosshair", eyedropper: "crosshair",
        shape: "crosshair", pen: "crosshair", "path-select": "default", "magic-wand": "crosshair",
        "clone-stamp": "crosshair", gradient: "crosshair", eraser: "crosshair", ruler: "crosshair",
        "rotate-view": "grab", hand: "grab", zoom: "zoom-in",
      };
      fabricCanvas.defaultCursor = cursors[activeTool];
      await syncClippingMasks(fabricCanvas, layers);
      fabricCanvas.requestRenderAll();
    });
    fabricCanvas.requestRenderAll();
  }, [activeTool, fabricCanvas, layers, toolColor, penWidth]);

  useEffect(() => {
    if (!fabricCanvas) return;
    const active = fabricCanvas.getActiveObject() as (FabricObject & { getObjects?: () => FabricObject[] }) | undefined;
    if (active?.type?.toLowerCase().includes("selection") && active.getObjects?.().some((object) => (object as DataObject).data?.id === selectedLayerId)) {
      fabricCanvas.requestRenderAll();
      return;
    }
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
    rotateViewportBy(fabricCanvas, viewAngleRef.current);
    fabricCanvas.requestRenderAll();
  }, [fabricCanvas, zoom]);

  useEffect(() => {
    if (!fabricCanvas) return;
    viewAngleRef.current = 0;
    fabricCanvas.setViewportTransform([zoom / 100, 0, 0, zoom / 100, 0, 0]);
    fabricCanvas.requestRenderAll();
  }, [fabricCanvas, resetViewToken]);

  return <canvas ref={elementRef} className="absolute inset-0 h-full w-full" aria-label="Design canvas. Select and drag objects; use corner controls to resize and rotate." />;
}
