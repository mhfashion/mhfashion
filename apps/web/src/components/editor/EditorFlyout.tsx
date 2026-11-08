"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Plus, Search, X } from "lucide-react";
import type { TextCombination, TextFormatting } from "@/lib/editorTypography";
import type { PanelId } from "./EditorLeftRail";
import type { CanvasMark, ShapeType } from "./InteractiveCanvas";
import TextLibrary from "./TextLibrary";
import { EDITOR_ELEMENTS, ELEMENT_CATEGORIES } from "@/lib/editorElements";

const TITLES: Record<PanelId, string> = {
  upload: "Upload",
  elements: "Elements",
  text: "Text",
  effects: "Effects",
  ai: "AI",
};
const COLORS = ["#111827", "#d4ff3f", "#ef4444", "#3b82f6", "#a855f7", "#ffffff"];
const EFFECT_OPTIONS = ["shadow", "stroke", "glow", "blur", "sharpen"];
const RECENT_KEY = "mhfashion-editor-element-recent-v1";
const SHAPES: { id: ShapeType; label: string }[] = [
  { id: "rectangle", label: "Rectangle" },
  { id: "circle", label: "Circle" },
  { id: "triangle", label: "Triangle" },
  { id: "star", label: "Star" },
];

type Props = {
  panel: PanelId;
  onUploadImage: (file: File) => Promise<void>;
  onAddText: (text: string, formatting: TextFormatting) => void;
  onAddTextCombination: (combination: TextCombination) => void;
  selectedText: CanvasMark | null;
  onUpdateSelectedText: (patch: Partial<TextFormatting>) => void;
  onAddShape: (shape: ShapeType, color: string) => void;
  onAddElement: (elementId: string, color: string, x?: number, y?: number) => Promise<void>;
  selectedEffects: string[];
  onToggleEffect: (effect: string) => void;
};

function readRecentIds() {
  if (typeof window === "undefined") return [];
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? "[]");
    if (!Array.isArray(saved)) return [];
    return saved.filter((id): id is string => typeof id === "string" && EDITOR_ELEMENTS.some((element) => element.id === id)).slice(0, 10);
  } catch {
    return [];
  }
}

export default function EditorFlyout({
  panel,
  onUploadImage,
  onAddText,
  onAddTextCombination,
  selectedText,
  onUpdateSelectedText,
  onAddShape,
  onAddElement,
  selectedEffects,
  onToggleEffect,
}: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [shapeColor, setShapeColor] = useState(COLORS[1]);
  const [elementColor, setElementColor] = useState(COLORS[1]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [recentLoaded, setRecentLoaded] = useState(false);
  const [elementError, setElementError] = useState("");

  useEffect(() => {
    setRecentIds(readRecentIds());
    setRecentLoaded(true);
  }, []);

  useEffect(() => {
    if (!recentLoaded) return;
    try {
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(recentIds));
    } catch {
      // The catalog remains usable when browser storage is unavailable.
    }
  }, [recentIds, recentLoaded]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      await onUploadImage(file);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Could not add this image.");
    } finally {
      setUploading(false);
    }
  }

  async function addElement(elementId: string, x?: number, y?: number) {
    setElementError("");
    try {
      await onAddElement(elementId, elementColor, x, y);
      setRecentIds((current) => [elementId, ...current.filter((id) => id !== elementId)].slice(0, 10));
    } catch (error) {
      setElementError(error instanceof Error ? error.message : "Could not add this element.");
    }
  }

  function beginElementDrag(event: React.DragEvent<HTMLButtonElement>, elementId: string) {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/x-mh-fashion-element", JSON.stringify({ id: elementId, color: elementColor }));
  }

  const categoryTabs = ["All", ...(recentIds.length ? ["Recent"] : []), ...ELEMENT_CATEGORIES];
  const query = search.trim().toLocaleLowerCase();
  const visibleElements = EDITOR_ELEMENTS.filter((element) => {
    const inCategory = activeCategory === "All"
      || (activeCategory === "Recent" ? recentIds.includes(element.id) : element.category === activeCategory);
    const matchesSearch = !query || [element.name, element.category, ...element.tags].some((value) => value.toLocaleLowerCase().includes(query));
    return inCategory && matchesSearch;
  });
  const width = panel === "text" ? "w-80" : panel === "elements" ? "w-72" : "w-52";

  return (
    <div className={`${width} flex-shrink-0 overflow-y-auto border-r border-border bg-bg-surface p-3`}>
      <p className="mb-2.5 text-xs font-semibold">{TITLES[panel]}</p>

      {panel === "upload" && <div className="space-y-2">
        <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileChange} className="sr-only" aria-label="Choose an image to upload" />
        <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading} className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-border-light py-6 text-[10px] text-text-muted hover:border-accent hover:text-accent disabled:opacity-50">
          <ImagePlus size={20} />{uploading ? "Preparing image…" : "Choose an image"}
        </button>
        <p className="text-[9px] leading-relaxed text-text-faint">PNG, JPG or WebP · up to 10 MB. The image is resized for the editor and kept in this browser draft.</p>
        {uploadError && <p role="alert" className="text-[9px] leading-relaxed text-red-500">{uploadError}</p>}
        <p className="text-[9px] leading-relaxed text-text-faint">Click the image to select it, then choose Eraser and click the canvas to remove it. Remove Background and Upscale are not connected yet.</p>
      </div>}

      {panel === "text" && <TextLibrary selectedText={selectedText} onAddText={onAddText} onAddCombination={onAddTextCombination} onUpdateSelectedText={onUpdateSelectedText} />}

      {panel === "elements" && <div className="space-y-3">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search elements" aria-label="Search elements" className="h-9 w-full rounded-md border border-border bg-bg py-1 pl-8 pr-8 text-[10px] text-text-primary outline-none placeholder:text-text-faint focus:border-accent" />
          {search && <button type="button" title="Clear search" aria-label="Clear search" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-faint hover:text-text-primary"><X size={13} /></button>}
        </div>
        <div role="tablist" aria-label="Element categories" className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1">
          {categoryTabs.map((category) => <button key={category} type="button" role="tab" aria-selected={activeCategory === category} onClick={() => setActiveCategory(category)} className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] ${activeCategory === category ? "border-accent bg-accent/10 font-semibold text-accent" : "border-border text-text-muted hover:border-accent/50"}`}>{category}</button>)}
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between"><p className="text-[9px] font-semibold text-text-muted">Element color</p><span className="text-[8px] text-text-faint">{visibleElements.length} items</span></div>
          <div className="flex gap-1.5">{COLORS.map((color) => <button key={color} type="button" aria-label={`Element color ${color}`} aria-pressed={elementColor === color} onClick={() => setElementColor(color)} style={{ backgroundColor: color }} className={`h-5 w-5 rounded-full border border-border ${elementColor === color ? "ring-2 ring-accent ring-offset-1 ring-offset-bg-surface" : ""}`} />)}</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {visibleElements.map((element) => <button key={element.id} type="button" draggable onDragStart={(event) => beginElementDrag(event, element.id)} onClick={() => void addElement(element.id)} title={`${element.name} · click to add or drag to place`} aria-label={`Add ${element.name} to canvas, or drag to position`} className="group min-w-0 overflow-hidden rounded-md border border-border bg-bg text-left transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <span className="relative block aspect-square overflow-hidden bg-[#202020] p-3"><img src={element.assetPath} alt="" draggable={false} className="h-full w-full object-contain transition-transform group-hover:scale-105" /><span aria-hidden="true" className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-bg/90 text-text-primary opacity-0 shadow-sm transition-opacity group-hover:opacity-100"><Plus size={12} /></span></span>
            <span className="block truncate px-2 py-1.5 text-[9px] text-text-secondary">{element.name}</span>
          </button>)}
        </div>
        {!visibleElements.length && <div className="rounded-md border border-dashed border-border px-3 py-5 text-center text-[9px] leading-relaxed text-text-faint">No matching elements. Try another keyword or category.</div>}
        {elementError && <p role="alert" className="text-[9px] leading-relaxed text-red-500">{elementError}</p>}
        <p className="text-[9px] leading-relaxed text-text-faint">Click to add at the center. Drag a graphic onto the canvas to place it. Added graphics become separate editable layers.</p>
      </div>}

      {panel === "effects" && <div className="space-y-1.5 text-[10px]">
        {EFFECT_OPTIONS.map((effect) => <button key={effect} type="button" aria-pressed={selectedEffects.includes(effect)} onClick={() => onToggleEffect(effect)} className={`w-full rounded-md border px-2 py-1.5 text-left ${selectedEffects.includes(effect) ? "border-accent bg-accent/10 text-accent" : "border-border bg-bg"}`}>{effect.charAt(0).toUpperCase() + effect.slice(1)} {selectedEffects.includes(effect) ? "· On" : "· Add"}</button>)}
        <p className="pt-1 text-[9px] text-text-faint">Effects apply to the selected layer. Select a layer first to toggle them.</p>
      </div>}

      {panel === "ai" && <div className="space-y-2">
        <div className="rounded-md border border-border bg-bg p-2"><p className="mb-1 text-[10px] font-medium">Generate image</p><textarea rows={3} placeholder="Describe what you want…" className="w-full resize-none bg-transparent text-[10px] outline-none placeholder:text-text-faint" /><button type="button" className="mt-1 w-full rounded bg-accent py-1 text-[10px] font-semibold text-accent-foreground">Generate · 100 pts</button></div>
        <p className="text-[9px] text-text-faint">300 points are granted daily. Unused daily points expire; points earned from purchases don&apos;t.</p>
      </div>}
    </div>
  );
}
