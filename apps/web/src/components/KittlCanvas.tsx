"use client";

import {
  Circle as CircleIcon,
  Hand,
  Image as ImageIcon,
  Layers,
  Minus,
  MousePointer2,
  Plus,
  Redo2,
  Save,
  Shirt,
  Square,
  Trash2,
  Type,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Canvas as FabricCanvas, FabricObject, Textbox as FabricTextbox } from "fabric";
import {
  EDITOR_ARTBOARD_ID,
  EDITOR_CANVAS_SPEC,
  calculateEditorViewport,
  clampEditorZoom,
  createEditorHistory,
  migrateLegacyEditorDocument,
  pushEditorSnapshot,
  stepEditorHistory,
  type EditorHistory,
} from "@/lib/editor-state";

type MockupSide = "front" | "back";
type Tool = "select" | "pan";
type Panel = "layers" | "mockup" | "shapes" | null;
type SideDocuments = Record<MockupSide, Record<string, unknown>>;
type EditorDraft = {
  version: 1 | 2;
  canvasSpec?: typeof EDITOR_CANVAS_SPEC;
  activeSide: MockupSide;
  documents: SideDocuments;
  savedAt: string;
};
type LayerItem = { id: string; label: string; object: FabricObject };
type PanStart = { pointerId: number; startX: number; startY: number; panX: number; panY: number };

type KittlCanvasProps = {
  availableMockupSides?: readonly MockupSide[];
};

const DRAFT_KEY = "mh-fashion-editor-draft-v2";
const LEGACY_DRAFT_KEY = "mh-fashion-editor-draft-v1";
const LEGACY_SCALE = EDITOR_CANVAS_SPEC.width / 500;
const ARTBOARD_WIDTH = EDITOR_CANVAS_SPEC.width;
const ARTBOARD_HEIGHT = EDITOR_CANVAS_SPEC.height;
const ARTBOARD_ID = EDITOR_ARTBOARD_ID;
const SIDE_LABELS: Record<MockupSide, string> = { front: "Front", back: "Back" };

function objectId(object: FabricObject): string | undefined {
  return (object as FabricObject & { editorId?: string }).editorId;
}

function isTextObject(object: FabricObject | null): object is FabricTextbox {
  return !!object && (object.type === "textbox" || object.type === "i-text" || object.type === "text");
}

function getObjectLabel(object: FabricObject, index: number): string {
  if (objectId(object) === ARTBOARD_ID) return "Print area";
  if (isTextObject(object)) return object.text?.trim().slice(0, 24) || "Text";
  if (object.type === "rect") return `Rectangle ${index + 1}`;
  if (object.type === "circle") return `Circle ${index + 1}`;
  if (object.type === "image") return `Image ${index + 1}`;
  return `${object.type || "Object"} ${index + 1}`;
}

function asHexColor(value: unknown): string {
  if (typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)) return value;
  if (typeof value === "string") {
    const rgb = value.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (rgb) {
      return `#${rgb.slice(1, 4).map((part) => Number(part).toString(16).padStart(2, "0")).join("")}`;
    }
  }
  return "#252525";
}

function isDraft(value: unknown): value is EditorDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<EditorDraft>;
  const docs = draft.documents as Partial<SideDocuments> | undefined;
  return (draft.version === 1 || draft.version === 2) &&
    (draft.activeSide === "front" || draft.activeSide === "back") &&
    !!docs && typeof docs.front === "object" && typeof docs.back === "object" &&
    Array.isArray((docs.front as { objects?: unknown }).objects) &&
    Array.isArray((docs.back as { objects?: unknown }).objects);
}

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (
    target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName)
  );
}

function makeId(prefix: string, counter: number): string {
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`;
}

export default function KittlCanvas({
  availableMockupSides = ["front", "back"],
}: KittlCanvasProps) {
  const canvasElementRef = useRef<HTMLCanvasElement>(null);
  const canvasViewportRef = useRef<HTMLDivElement>(null);
  const transparencyGridRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<FabricCanvas | null>(null);
  const fabricApiRef = useRef<typeof import("fabric") | null>(null);
  const documentsRef = useRef<SideDocuments>({ front: { objects: [] }, back: { objects: [] } });
  const activeSideRef = useRef<MockupSide>("front");
  const historyRef = useRef<Record<MockupSide, EditorHistory>>({
    front: createEditorHistory("{}"),
    back: createEditorHistory("{}"),
  });
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressHistoryRef = useRef(false);
  const idCounterRef = useRef(0);
  const panStartRef = useRef<PanStart | null>(null);
  const viewRef = useRef({ zoom: 1, panX: 0, panY: 0 });
  const refreshUiRef = useRef<() => void>(() => {});
  const scheduleHistoryRef = useRef<() => void>(() => {});

  const [activeSide, setActiveSide] = useState<MockupSide>("front");
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [panel, setPanel] = useState<Panel>(null);
  const [desktopPanel, setDesktopPanel] = useState<"layers" | "properties" | "mockup">("properties");
  const [mockupVisible, setMockupVisible] = useState(true);
  const [ready, setReady] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [layers, setLayers] = useState<LayerItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [selectedColor, setSelectedColor] = useState("#252525");
  const [selectedFontSize, setSelectedFontSize] = useState(360);
  const [selectedAngle, setSelectedAngle] = useState(0);
  const [isTextSelected, setIsTextSelected] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Add text, a shape, or an image to begin.");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const applyViewport = useCallback(() => {
    const canvas = canvasRef.current;
    const viewport = canvasViewportRef.current;
    if (!canvas || !viewport) return;
    const bounds = viewport.getBoundingClientRect();
    if (bounds.width < 1 || bounds.height < 1) return;
    const transform = calculateEditorViewport(
      bounds.width,
      bounds.height,
      viewRef.current.zoom,
      viewRef.current.panX,
      viewRef.current.panY,
      ARTBOARD_WIDTH,
      ARTBOARD_HEIGHT,
    );
    canvas.setViewportTransform(transform);
    if (transparencyGridRef.current) {
      transparencyGridRef.current.style.transform = `matrix(${transform.join(",")})`;
    }
    canvas.requestRenderAll();
  }, []);

  const refreshEditorUi = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const objects = canvas.getObjects().filter((object) => objectId(object) !== ARTBOARD_ID);
    const list = objects.map((object, index) => {
      let id = objectId(object);
      if (!id) {
        id = makeId("layer", ++idCounterRef.current);
        (object as FabricObject & { editorId?: string }).editorId = id;
      }
      return { id, label: getObjectLabel(object, index), object };
    }).reverse();
    setLayers(list);

    const selected = canvas.getActiveObject() ?? null;
    const selectedObjectId = selected ? objectId(selected) ?? null : null;
    setSelectedId(selectedObjectId);
    setIsTextSelected(isTextObject(selected));
    if (isTextObject(selected)) {
      setSelectedText(selected.text ?? "");
      setSelectedFontSize(Math.round(selected.fontSize || 40));
    } else {
      setSelectedText("");
    }
    if (selected) {
      setSelectedColor(asHexColor(selected.fill));
      setSelectedAngle(Math.round(selected.angle || 0));
    }
    const history = historyRef.current[activeSideRef.current];
    setCanUndo(history.index > 0);
    setCanRedo(history.index < history.snapshots.length - 1);
  }, []);
  refreshUiRef.current = refreshEditorUi;

  const scheduleHistory = useCallback(() => {
    if (suppressHistoryRef.current || !canvasRef.current) return;
    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    historyTimerRef.current = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas || suppressHistoryRef.current) return;
      const side = activeSideRef.current;
      const snapshot = JSON.stringify(canvas.toObject(["editorId"]));
      historyRef.current[side] = pushEditorSnapshot(historyRef.current[side], snapshot);
      documentsRef.current[side] = canvas.toObject(["editorId"]);
      refreshUiRef.current();
    }, 180);
  }, []);
  scheduleHistoryRef.current = scheduleHistory;

  useEffect(() => {
    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;
    const eventCleanups: Array<() => void> = [];
    let canvas: FabricCanvas | null = null;

    async function initialize() {
      try {
        const fabric = await import("fabric");
        if (disposed || !canvasElementRef.current) return;
        fabricApiRef.current = fabric;
        canvas = new fabric.Canvas(canvasElementRef.current, {
          width: ARTBOARD_WIDTH,
          height: ARTBOARD_HEIGHT,
          preserveObjectStacking: true,
          selection: true,
          stopContextMenu: true,
          targetFindTolerance: 18,
        });
        canvasRef.current = canvas;
        canvas.upperCanvasEl.style.touchAction = "none";
        const wrapper = canvas.getElement().parentElement;
        if (wrapper) {
          wrapper.style.position = "absolute";
          wrapper.style.inset = "0";
        }

        const refresh = () => refreshUiRef.current();
        const historyEvents = ["object:added", "object:modified", "object:removed", "text:changed"] as const;
        for (const eventName of historyEvents) {
          const disposer = canvas.on(eventName, () => {
            refreshUiRef.current();
            scheduleHistoryRef.current();
          });
          eventCleanups.push(disposer);
        }
        for (const eventName of ["selection:created", "selection:updated", "selection:cleared"] as const) {
          eventCleanups.push(canvas.on(eventName, refresh));
        }

        const resize = () => {
          const bounds = canvasViewportRef.current?.getBoundingClientRect();
          if (!bounds || !canvas) return;
          canvas.setDimensions({ width: Math.max(1, bounds.width), height: Math.max(1, bounds.height) });
          applyViewport();
        };
        resizeObserver = new ResizeObserver(resize);
        if (canvasViewportRef.current) resizeObserver.observe(canvasViewportRef.current);

        const empty = canvas.toObject(["editorId"]);
        let documents: SideDocuments = { front: empty, back: empty };
        let restoredSide: MockupSide = "front";
        try {
          const raw = window.localStorage.getItem(DRAFT_KEY) ?? window.localStorage.getItem(LEGACY_DRAFT_KEY);
          if (raw) {
            const parsed: unknown = JSON.parse(raw);
            if (isDraft(parsed)) {
              documents = parsed.version === 1
                ? {
                    front: migrateLegacyEditorDocument(parsed.documents.front),
                    back: migrateLegacyEditorDocument(parsed.documents.back),
                  }
                : parsed.documents;
              restoredSide = parsed.activeSide;
              setStatusMessage(parsed.version === 1
                ? "Migrated your saved design to the fixed 4500 × 5400 px, 300-DPI canvas."
                : "Restored your saved design from this device.");
            }
          }
        } catch {
          setStatusMessage("A saved design could not be read. Start a new design or save a fresh draft.");
        }
        documentsRef.current = documents;
        activeSideRef.current = restoredSide;
        setActiveSide(restoredSide);
        suppressHistoryRef.current = true;
        await canvas.loadFromJSON(documents[restoredSide]);
        if (disposed) return;
        ensureArtboard(canvas, fabric.Rect);
        canvas.backgroundColor = "";
        canvas.requestRenderAll();
        const frontSnapshot = JSON.stringify(documents.front);
        const backSnapshot = JSON.stringify(documents.back);
        historyRef.current = {
          front: createEditorHistory(frontSnapshot),
          back: createEditorHistory(backSnapshot),
        };
        historyRef.current[restoredSide] = createEditorHistory(JSON.stringify(canvas.toObject(["editorId"])));
        suppressHistoryRef.current = false;
        setReady(true);
        refreshUiRef.current();
        resize();
      } catch (error) {
        console.error("Editor initialization failed", error);
        setStatusMessage("The editor could not start. Refresh the page and try again.");
      }
    }

    void initialize();
    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      eventCleanups.forEach((dispose) => dispose());
      if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
      canvasRef.current = null;
      if (canvas) void canvas.dispose();
    };
  }, [applyViewport]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const panOnly = activeTool === "pan" || spaceHeld;
    canvas.skipTargetFind = panOnly;
    canvas.selection = !panOnly;
    canvas.defaultCursor = panOnly ? "grab" : "default";
    canvas.hoverCursor = "move";
  }, [activeTool, spaceHeld, ready]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      if (event.code === "Space") {
        event.preventDefault();
        setSpaceHeld(true);
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelection();
      } else if (event.key.toLowerCase() === "v") {
        setActiveTool("select");
      } else if (event.key.toLowerCase() === "h") {
        setActiveTool("pan");
      } else if (event.key === "Escape") {
        setPanel(null);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") setSpaceHeld(false);
    };
    const onBlur = () => {
      setSpaceHeld(false);
      panStartRef.current = null;
      setIsPanning(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  });

  useEffect(() => {
    if (!panel) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanel(null);
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [panel]);

  function updateZoom(nextZoom: number) {
    viewRef.current.zoom = clampEditorZoom(nextZoom);
    setZoom(viewRef.current.zoom);
    applyViewport();
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      updateZoom(viewRef.current.zoom - event.deltaY * 0.002);
      return;
    }
    viewRef.current.panX -= event.deltaX;
    viewRef.current.panY -= event.deltaY;
    applyViewport();
  }

  function startPan(event: React.PointerEvent<HTMLDivElement>) {
    const shouldPan = activeTool === "pan" || event.button === 1 || (spaceHeld && event.button === 0);
    if (!shouldPan) return;
    if (event.target instanceof Element && event.target.closest("button, input, textarea, select")) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    panStartRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panX: viewRef.current.panX,
      panY: viewRef.current.panY,
    };
    setIsPanning(true);
  }

  function movePan(event: React.PointerEvent<HTMLDivElement>) {
    const start = panStartRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    event.preventDefault();
    viewRef.current.panX = start.panX + event.clientX - start.startX;
    viewRef.current.panY = start.panY + event.clientY - start.startY;
    applyViewport();
  }

  function endPan(event: React.PointerEvent<HTMLDivElement>) {
    if (panStartRef.current?.pointerId !== event.pointerId) return;
    panStartRef.current = null;
    setIsPanning(false);
  }

  function addObject(object: FabricObject, label: string) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    (object as FabricObject & { editorId?: string }).editorId = makeId("layer", ++idCounterRef.current);
    object.set({
      cornerSize: 16,
      touchCornerSize: 28,
      transparentCorners: false,
      cornerColor: "#8fc63d",
      borderColor: "#5b9dd1",
      padding: 4,
    });
    canvas.add(object);
    canvas.setActiveObject(object);
    canvas.requestRenderAll();
    setActiveTool("select");
    setPanel(null);
    setStatusMessage(`${label} added. Drag to move; use the handles to resize or rotate.`);
    refreshEditorUi();
    scheduleHistory();
  }

  function addText() {
    const Textbox = fabricApiRef.current?.Textbox;
    if (!Textbox) return;
    const textObject = new Textbox("", {
      left: ARTBOARD_WIDTH / 2,
      top: ARTBOARD_HEIGHT / 2,
      width: ARTBOARD_WIDTH * 0.52,
      fontSize: 44 * LEGACY_SCALE,
      fontFamily: "Arial",
      fontWeight: "bold",
      fill: "#252525",
      textAlign: "center",
      editable: true,
    });
    addObject(textObject, "Text");
    textObject.enterEditing();
    canvasRef.current?.requestRenderAll();
    setStatusMessage("Type your own text. New canvases start with no text.");
    setDesktopPanel("properties");
    setPanel("layers");
  }

  function addRectangle() {
    const Rect = fabricApiRef.current?.Rect;
    if (!Rect) return;
    addObject(new Rect({
      left: 150 * LEGACY_SCALE,
      top: 220 * LEGACY_SCALE,
      width: 200 * LEGACY_SCALE,
      height: 130 * LEGACY_SCALE,
      rx: 8 * LEGACY_SCALE,
      ry: 8 * LEGACY_SCALE,
      fill: "#d9f2b2",
      stroke: "#6d9e2a",
      strokeWidth: 2 * LEGACY_SCALE,
    }), "Rectangle");
  }

  function addCircle() {
    const Circle = fabricApiRef.current?.Circle;
    if (!Circle) return;
    addObject(new Circle({
      left: 190 * LEGACY_SCALE,
      top: 230 * LEGACY_SCALE,
      radius: 70 * LEGACY_SCALE,
      fill: "#d8ecff",
      stroke: "#4b92c7",
      strokeWidth: 2 * LEGACY_SCALE,
    }), "Circle");
  }

  function openImagePicker() {
    fileInputRef.current?.click();
  }

  async function addImage(file: File) {
    const FabricImage = fabricApiRef.current?.FabricImage;
    if (!FabricImage) return;
    if (file.size > 5 * 1024 * 1024) {
      setStatusMessage("Choose an image smaller than 5 MB so it can be saved on this device.");
      return;
    }
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Image could not be read"));
        reader.onerror = () => reject(new Error("Image could not be read"));
        reader.readAsDataURL(file);
      });
      const image = await FabricImage.fromURL(dataUrl);
      image.scaleToWidth(Math.min(220 * LEGACY_SCALE, image.width || 220 * LEGACY_SCALE));
      image.set({ left: 140 * LEGACY_SCALE, top: 180 * LEGACY_SCALE });
      addObject(image, "Image");
    } catch {
      setStatusMessage("That image could not be opened. Try a JPG, PNG, or WebP image.");
    }
  }

  function updateSelected(patch: Record<string, unknown>) {
    const canvas = canvasRef.current;
    const selected = canvas?.getActiveObject();
    if (!canvas || !selected) return;
    selected.set(patch);
    canvas.requestRenderAll();
    refreshEditorUi();
    scheduleHistory();
  }

  function deleteSelection() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const selected = canvas.getActiveObjects().filter((object) => objectId(object) !== ARTBOARD_ID);
    if (!selected.length) return;
    canvas.remove(...selected);
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    refreshEditorUi();
    scheduleHistory();
    setStatusMessage(`${selected.length === 1 ? "Object" : "Objects"} deleted. Use Undo to restore.`);
  }

  async function applySnapshot(side: MockupSide, snapshot: string) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      suppressHistoryRef.current = true;
      await canvas.loadFromJSON(JSON.parse(snapshot));
      ensureArtboard(canvas, fabricApiRef.current?.Rect);
      canvas.backgroundColor = "";
      canvas.discardActiveObject();
      canvas.requestRenderAll();
      documentsRef.current[side] = canvas.toObject(["editorId"]);
      refreshEditorUi();
    } finally {
      suppressHistoryRef.current = false;
    }
  }

  async function undo() {
    const side = activeSideRef.current;
    const result = stepEditorHistory(historyRef.current[side], "undo");
    if (!result.snapshot) return;
    historyRef.current[side] = result.history;
    await applySnapshot(side, result.snapshot);
    setStatusMessage("Undid the last change.");
  }

  async function redo() {
    const side = activeSideRef.current;
    const result = stepEditorHistory(historyRef.current[side], "redo");
    if (!result.snapshot) return;
    historyRef.current[side] = result.history;
    await applySnapshot(side, result.snapshot);
    setStatusMessage("Redid the last change.");
  }

  async function switchSide(side: MockupSide) {
    if (side === activeSideRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (historyTimerRef.current) {
      clearTimeout(historyTimerRef.current);
      historyTimerRef.current = null;
    }
    const currentSide = activeSideRef.current;
    documentsRef.current[currentSide] = canvas.toObject(["editorId"]);
    activeSideRef.current = side;
    setActiveSide(side);
    suppressHistoryRef.current = true;
    await canvas.loadFromJSON(documentsRef.current[side]);
    ensureArtboard(canvas, fabricApiRef.current?.Rect);
    canvas.backgroundColor = "";
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    if (historyRef.current[side].snapshots[0] === "{}") {
      historyRef.current[side] = createEditorHistory(JSON.stringify(canvas.toObject(["editorId"])));
    }
    suppressHistoryRef.current = false;
    refreshEditorUi();
    setStatusMessage(`${SIDE_LABELS[side]} artboard selected.`);
  }

  function saveDraft() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    documentsRef.current[activeSideRef.current] = canvas.toObject(["editorId"]);
    const draft: EditorDraft = {
      version: 2,
      canvasSpec: EDITOR_CANVAS_SPEC,
      activeSide: activeSideRef.current,
      documents: documentsRef.current,
      savedAt: new Date().toISOString(),
    };
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setStatusMessage("Design saved on this device. It is not uploaded to an account.");
    } catch {
      setStatusMessage("This design is too large for browser storage. Remove large images and try Save again.");
    }
  }

  function selectLayer(object: FabricObject) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setActiveObject(object);
    canvas.requestRenderAll();
    refreshEditorUi();
    setDesktopPanel("properties");
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file) void addImage(file);
  }

  function closePanel() {
    setPanel(null);
  }

  const renderProperties = () => (
    <div className="space-y-3 p-3">
      {!selectedId ? (
        <p className="rounded-lg bg-[#f4f5f2] p-3 text-xs leading-5 text-[#69716a]">Select an object on the artboard or in Layers to edit its properties.</p>
      ) : (
        <>
          {isTextSelected && (
            <label className="block text-xs font-semibold text-[#576057]">
              Text
              <textarea
                aria-label="Selected text"
                value={selectedText}
                onChange={(event) => updateSelected({ text: event.target.value })}
                rows={2}
                className="mt-1.5 min-h-11 w-full resize-y rounded-lg border border-[#d8ddd4] bg-white px-3 py-2 text-sm font-normal text-[#20251f] outline-none focus:border-[#83b834] focus:ring-2 focus:ring-[#83b834]/20"
              />
            </label>
          )}
          <label className="flex min-h-11 items-center justify-between gap-3 text-xs font-semibold text-[#576057]">
            Fill color
            <input
              aria-label="Selected object fill color"
              type="color"
              value={selectedColor}
              onChange={(event) => updateSelected({ fill: event.target.value })}
              className="h-11 w-14 cursor-pointer rounded-md border border-[#d8ddd4] bg-white p-1"
            />
          </label>
          {isTextSelected && (
            <label className="block text-xs font-semibold text-[#576057]">
              Font size
              <input
                aria-label="Selected text font size"
                type="number"
                min={12}
                max={1080}
                value={selectedFontSize}
                onChange={(event) => {
                  const value = Math.max(12, Math.min(120, Number(event.target.value) || 12));
                  setSelectedFontSize(value);
                  updateSelected({ fontSize: value });
                }}
                className="mt-1.5 h-11 w-full rounded-lg border border-[#d8ddd4] bg-white px-3 text-sm font-normal text-[#20251f] outline-none focus:border-[#83b834] focus:ring-2 focus:ring-[#83b834]/20"
              />
            </label>
          )}
          <label className="block text-xs font-semibold text-[#576057]">
            Rotate · {selectedAngle}°
            <input
              aria-label="Selected object rotation"
              type="range"
              min={-180}
              max={180}
              value={selectedAngle}
              onChange={(event) => {
                const angle = Number(event.target.value);
                setSelectedAngle(angle);
                updateSelected({ angle });
              }}
              className="mt-2 block h-11 w-full accent-[#83b834]"
            />
          </label>
          <button
            type="button"
            onClick={deleteSelection}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#f0c8c5] text-sm font-semibold text-[#aa3e36] hover:bg-[#fff1f0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#aa3e36]"
          >
            <Trash2 size={16} aria-hidden="true" /> Delete selected object
          </button>
        </>
      )}
    </div>
  );

  const renderLayers = () => (
    <div className="space-y-1 p-2">
      {layers.length === 0 ? (
        <p className="rounded-lg bg-[#f4f5f2] p-3 text-xs leading-5 text-[#69716a]">Your layers will appear here. Add text, a shape, or an image to start.</p>
      ) : layers.map((layer) => (
        <button
          type="button"
          key={layer.id}
          aria-pressed={layer.id === selectedId}
          onClick={() => selectLayer(layer.object)}
          className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#83b834] ${layer.id === selectedId ? "bg-[#eef7df] font-semibold text-[#365719]" : "text-[#30362f] hover:bg-[#f4f5f2]"}`}
        >
          {layer.object.type === "image" ? <ImageIcon size={16} aria-hidden="true" /> : isTextObject(layer.object) ? <Type size={16} aria-hidden="true" /> : <Square size={16} aria-hidden="true" />}
          <span className="min-w-0 flex-1 truncate">{layer.label}</span>
        </button>
      ))}
    </div>
  );

  const renderMockup = () => (
    <div className="space-y-3 p-3">
      <p className="text-xs leading-5 text-[#69716a]">Garment images are placeholders until product mockups are connected. Your artwork stays on its own artboard.</p>
      <div className={`grid gap-2 ${availableMockupSides.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
        {availableMockupSides.map((side) => (
          <div key={side} className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed border-[#c8cfc3] bg-[#f4f5f2] p-2 text-center">
            <Shirt size={52} strokeWidth={1} className="text-[#9aa294]" aria-hidden="true" />
            <span className="mt-2 text-xs font-semibold text-[#576057]">{SIDE_LABELS[side]}</span>
            <span className="mt-0.5 text-[10px] text-[#899087]">Preview placeholder</span>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setMockupVisible((visible) => !visible)}
        aria-pressed={mockupVisible}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#d8ddd4] text-sm font-semibold text-[#46513f] hover:bg-[#f4f5f2]"
      >
        {mockupVisible ? <Minus size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
        {mockupVisible ? "Hide mockup panel" : "Show mockup panel"}
      </button>
    </div>
  );

  const renderShapes = () => (
    <div className="grid grid-cols-2 gap-2 p-3">
      <button type="button" onClick={addRectangle} className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#d8ddd4] bg-white text-sm font-semibold text-[#30362f] hover:bg-[#f4f5f2]">
        <Square size={18} aria-hidden="true" /> Rectangle
      </button>
      <button type="button" onClick={addCircle} className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#d8ddd4] bg-white text-sm font-semibold text-[#30362f] hover:bg-[#f4f5f2]">
        <CircleIcon size={18} aria-hidden="true" /> Circle
      </button>
    </div>
  );

  const renderPanel = (target: Exclude<Panel, null>) => {
    if (target === "layers") return <>{renderLayers()}<div className="border-t border-[#e4e7e1]"><h3 className="px-3 pt-3 text-xs font-bold uppercase tracking-wide text-[#788073]">Properties</h3>{renderProperties()}</div></>;
    if (target === "mockup") return renderMockup();
    return renderShapes();
  };

  return (
    <main className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[#f1f2f5] text-[#242923]">
      <header className="z-20 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-[#dfe3dc] bg-white px-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="hidden items-center gap-1.5 text-sm font-black tracking-tight text-[#303a2c] sm:inline-flex"><Shirt size={18} className="text-[#83b834]" aria-hidden="true" /> MH Studio</span>
          <div role="group" aria-label="Garment side" className="flex h-10 shrink-0 items-center rounded-lg bg-[#f1f3ef] p-1">
            {(["front", "back"] as const).filter((side) => availableMockupSides.includes(side)).map((side) => (
              <button
                type="button"
                key={side}
                onClick={() => void switchSide(side)}
                aria-pressed={activeSide === side}
                className={`min-h-8 min-w-12 rounded-md px-2 text-xs font-semibold ${activeSide === side ? "bg-white text-[#35551a] shadow-sm" : "text-[#687064] hover:text-[#303a2c]"}`}
              >
                {SIDE_LABELS[side]}
              </button>
            ))}
          </div>
          <span className="hidden whitespace-nowrap rounded-md bg-[#f4f5f2] px-2 py-1 text-[10px] font-semibold text-[#596251] xl:inline-flex" title="Fixed print canvas; no text is prefilled">4500 × 5400 px · 300 DPI · Transparent PNG</span>
          <span className="hidden max-w-40 truncate text-[10px] text-[#7b8378] lg:inline" aria-live="polite">{statusMessage}</span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => void undo()} disabled={!canUndo} aria-label="Undo" title="Undo (Ctrl/⌘+Z)" className="flex h-11 w-10 items-center justify-center rounded-lg text-[#46513f] hover:bg-[#f1f3ef] disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#83b834]"><Undo2 size={18} /></button>
          <button type="button" onClick={() => void redo()} disabled={!canRedo} aria-label="Redo" title="Redo (Ctrl/⌘+Shift+Z)" className="flex h-11 w-10 items-center justify-center rounded-lg text-[#46513f] hover:bg-[#f1f3ef] disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#83b834]"><Redo2 size={18} /></button>
          <div className="hidden items-center gap-1 md:flex xl:hidden">
            <button type="button" onClick={() => setPanel(panel === "layers" ? null : "layers")} className="flex h-11 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-[#46513f] hover:bg-[#f1f3ef]"><Layers size={15} /> Layers</button>
            <button type="button" onClick={() => setPanel(panel === "mockup" ? null : "mockup")} className="flex h-11 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-[#46513f] hover:bg-[#f1f3ef]"><Shirt size={15} /> Mockup</button>
          </div>
          <div className="hidden items-center gap-1 sm:flex" aria-label={`Zoom ${Math.round(zoom * 100)} percent`}>
            <button type="button" onClick={() => updateZoom(zoom - 0.1)} aria-label="Zoom out" className="flex h-11 w-9 items-center justify-center rounded-lg text-[#46513f] hover:bg-[#f1f3ef]"><ZoomOut size={17} /></button>
            <span className="w-10 text-center text-[10px] font-semibold text-[#69716a]">{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => updateZoom(zoom + 0.1)} aria-label="Zoom in" className="flex h-11 w-9 items-center justify-center rounded-lg text-[#46513f] hover:bg-[#f1f3ef]"><ZoomIn size={17} /></button>
          </div>
          <button type="button" onClick={saveDraft} disabled={!ready} className="flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg bg-[#83b834] px-2.5 text-xs font-bold text-white hover:bg-[#709d2b] disabled:opacity-50 sm:px-3" aria-label="Save design on this device" title="Save to this device"><Save size={16} aria-hidden="true" /><span className="hidden sm:inline">Save</span></button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside aria-label="Editor tools" className="hidden w-16 shrink-0 flex-col items-center gap-1 border-r border-[#dfe3dc] bg-white py-2 md:flex">
          <ToolButton label="Select" active={activeTool === "select"} onClick={() => setActiveTool("select")}><MousePointer2 size={18} /></ToolButton>
          <ToolButton label="Pan" active={activeTool === "pan"} onClick={() => setActiveTool("pan")}><Hand size={18} /></ToolButton>
          <div className="my-1 h-px w-9 bg-[#e5e8e2]" />
          <ToolButton label="Add text" onClick={addText}><Type size={18} /></ToolButton>
          <ToolButton label="Add rectangle" onClick={addRectangle}><Square size={18} /></ToolButton>
          <ToolButton label="Add circle" onClick={addCircle}><CircleIcon size={18} /></ToolButton>
          <ToolButton label="Add image" onClick={openImagePicker}><ImageIcon size={18} /></ToolButton>
          <div className="mt-auto px-1 pb-1 text-center text-[9px] leading-4 text-[#8a9186]">{spaceHeld ? "Pan" : "V / H"}</div>
        </aside>

        <div className="relative flex min-w-0 flex-1">
          <div
            ref={canvasViewportRef}
            onWheel={handleWheel}
            onPointerDown={startPan}
            onPointerMove={movePan}
            onPointerUp={endPan}
            onPointerCancel={endPan}
            onAuxClick={(event) => { if (event.button === 1) event.preventDefault(); }}
            className={`relative min-h-0 min-w-0 flex-1 touch-none overflow-hidden bg-[#eef0ed] ${isPanning ? "cursor-grabbing" : activeTool === "pan" || spaceHeld ? "cursor-grab" : "cursor-default"}`}
            aria-label="Design workspace"
          >
            <div
              ref={transparencyGridRef}
              aria-hidden="true"
              className="pointer-events-none absolute left-0 top-0 z-0 box-border"
              style={{
                width: ARTBOARD_WIDTH,
                height: ARTBOARD_HEIGHT,
                transform: "matrix(1,0,0,1,0,0)",
                transformOrigin: "0 0",
                border: "1px solid #c7cec3",
                backgroundColor: "#ffffff",
                backgroundImage: "linear-gradient(45deg,#e4e7e3 25%,transparent 25%),linear-gradient(-45deg,#e4e7e3 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e4e7e3 75%),linear-gradient(-45deg,transparent 75%,#e4e7e3 75%)",
                backgroundSize: "180px 180px",
                backgroundPosition: "0 0, 0 90px, 90px -90px, -90px 0",
              }}
            />
            <canvas ref={canvasElementRef} aria-label={`${SIDE_LABELS[activeSide]} transparent 4500 by 5400 pixel canvas, 300 DPI`} />
            {!ready && <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#eef0ed]/90 text-sm font-medium text-[#66705e]">Loading editor…</div>}
            <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1 rounded-xl border border-[#d9ded5] bg-white/95 p-1 shadow-sm sm:hidden">
              <button type="button" onClick={() => updateZoom(zoom - 0.1)} aria-label="Zoom out" className="flex h-11 w-11 items-center justify-center rounded-lg text-[#43513a] hover:bg-[#f2f5ee]"><ZoomOut size={18} /></button>
              <span className="w-9 text-center text-[10px] font-semibold text-[#596251]">{Math.round(zoom * 100)}%</span>
              <button type="button" onClick={() => updateZoom(zoom + 0.1)} aria-label="Zoom in" className="flex h-11 w-11 items-center justify-center rounded-lg text-[#43513a] hover:bg-[#f2f5ee]"><ZoomIn size={18} /></button>
            </div>
          </div>

          <aside aria-label="Layers and properties" className="hidden w-[19rem] shrink-0 flex-col border-l border-[#dfe3dc] bg-white xl:flex">
            <div role="tablist" aria-label="Editor side panel" className="grid h-11 shrink-0 grid-cols-3 border-b border-[#e4e7e1] p-1">
              {(["properties", "layers", "mockup"] as const).map((tab) => (
                <button type="button" role="tab" aria-selected={desktopPanel === tab} key={tab} onClick={() => setDesktopPanel(tab)} className={`rounded-md text-[11px] font-semibold capitalize ${desktopPanel === tab ? "bg-[#eef7df] text-[#3e5c24]" : "text-[#778071] hover:bg-[#f5f6f3]"}`}>{tab}</button>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {desktopPanel === "properties" && renderProperties()}
              {desktopPanel === "layers" && renderLayers()}
              {desktopPanel === "mockup" && renderMockup()}
            </div>
          </aside>
        </div>
      </div>

      <nav aria-label="Phone editor tools" className="z-20 grid shrink-0 grid-cols-7 border-t border-[#dfe3dc] bg-white px-1 pb-[env(safe-area-inset-bottom)] pt-1 md:hidden">
        <DockButton label="Select" active={activeTool === "select"} onClick={() => setActiveTool("select")}><MousePointer2 size={18} /></DockButton>
        <DockButton label="Pan" active={activeTool === "pan"} onClick={() => setActiveTool("pan")}><Hand size={18} /></DockButton>
        <DockButton label="Text" onClick={addText}><Type size={18} /></DockButton>
        <DockButton label="Shapes" active={panel === "shapes"} onClick={() => setPanel(panel === "shapes" ? null : "shapes")}><Square size={18} /></DockButton>
        <DockButton label="Image" onClick={openImagePicker}><ImageIcon size={18} /></DockButton>
        <DockButton label="Layers" active={panel === "layers"} onClick={() => setPanel(panel === "layers" ? null : "layers")}><Layers size={18} /></DockButton>
        <DockButton label="Mockup" active={panel === "mockup"} onClick={() => setPanel(panel === "mockup" ? null : "mockup")}><Shirt size={18} /></DockButton>
      </nav>

      {panel && (
        <>
          <button type="button" aria-label="Close editor panel" onClick={closePanel} className="fixed inset-0 z-30 bg-black/20 md:hidden" />
          <button type="button" aria-label="Close editor panel" onClick={closePanel} className="fixed inset-0 z-30 hidden bg-black/20 md:block xl:hidden" />
          <div className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 mx-auto max-h-[58dvh] w-full overflow-hidden rounded-t-2xl border border-[#dfe3dc] bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.18)] md:hidden">
            <PanelHeader title={panel === "layers" ? "Layers & Properties" : panel === "mockup" ? "Mockup preview" : "Add a shape"} onClose={closePanel} />
            <div className="max-h-[calc(58dvh-3.5rem)] overflow-y-auto overscroll-contain">{renderPanel(panel)}</div>
          </div>
          <div className="fixed inset-y-0 right-0 z-40 hidden w-80 max-w-[85vw] flex-col border-l border-[#dfe3dc] bg-white shadow-2xl md:flex xl:hidden">
            <PanelHeader title={panel === "layers" ? "Layers & Properties" : panel === "mockup" ? "Mockup preview" : "Add a shape"} onClose={closePanel} />
            <div className="min-h-0 flex-1 overflow-y-auto">{renderPanel(panel)}</div>
          </div>
        </>
      )}

      <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="Choose an image to add to the design" onChange={handleImageChange} />
      <p className="sr-only" aria-live="polite">{statusMessage}</p>
    </main>
  );
}

function ensureArtboard(canvas: FabricCanvas, Rect?: typeof import("fabric").Rect) {
  if (!Rect) return;
  const existing = canvas.getObjects().find((object) => objectId(object) === ARTBOARD_ID);
  if (existing) {
    existing.set({
      left: 0,
      top: 0,
      originX: "left",
      originY: "top",
      width: ARTBOARD_WIDTH,
      height: ARTBOARD_HEIGHT,
      scaleX: 1,
      scaleY: 1,
      fill: "rgba(0,0,0,0)",
      stroke: "rgba(0,0,0,0)",
      strokeWidth: 0,
      opacity: 0,
    });
    existing.setCoords();
    canvas.sendObjectToBack(existing);
    return;
  }
  const artboard = new Rect({
    left: 0,
    top: 0,
    originX: "left",
    originY: "top",
    width: ARTBOARD_WIDTH,
    height: ARTBOARD_HEIGHT,
    fill: "rgba(0,0,0,0)",
    stroke: "rgba(0,0,0,0)",
    strokeWidth: 0,
    opacity: 0,
    selectable: false,
    evented: false,
    hasControls: false,
    hasBorders: false,
    hoverCursor: "default",
  });
  (artboard as FabricObject & { editorId?: string }).editorId = ARTBOARD_ID;
  canvas.add(artboard);
  canvas.sendObjectToBack(artboard);
}

function ToolButton({
  label,
  active = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
      className={`flex h-12 w-12 items-center justify-center rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#83b834] ${active ? "bg-[#eef7df] text-[#42611f]" : "text-[#596251] hover:bg-[#f2f4ef]"}`}
    >
      {children}
    </button>
  );
}

function DockButton({
  label,
  active = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 text-[9px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#83b834] ${active ? "bg-[#eef7df] text-[#42611f]" : "text-[#626b5d] hover:bg-[#f5f6f3]"}`}
    >
      {children}
      <span className="leading-3">{label}</span>
    </button>
  );
}

function PanelHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#e4e7e1] px-4">
      <div>
        <span className="mx-auto mb-1 block h-1 w-9 rounded-full bg-[#cbd1c5] md:hidden" />
        <h2 className="text-sm font-bold text-[#303a2c]">{title}</h2>
      </div>
      <button type="button" onClick={onClose} aria-label="Close panel" className="flex h-11 w-11 items-center justify-center rounded-lg text-[#596251] hover:bg-[#f2f4ef] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#83b834]"><X size={18} /></button>
    </div>
  );
}
