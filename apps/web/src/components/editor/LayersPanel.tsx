"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown, ArrowUp, Box, ChevronDown, ChevronRight, Eye, EyeOff,
  FolderClosed, FolderOpen, Image as ImageIcon, Layers2, Lock, LockOpen,
  PenTool, Plus, Copy, Scissors, Square, SquareStack, Trash2,
} from "lucide-react";
import type { CanvasMark } from "./InteractiveCanvas";
import { FONT_LIBRARY } from "@/lib/editorTypography";

export type BlendMode = "pass-through" | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "color" | "luminosity" | "lighter";
export type EditorLayer = {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  isGroup: boolean;
  parentId?: string;
  childIds?: string[];
  opacity?: number;
  fillOpacity?: number;
  flow?: number;
  blendMode?: BlendMode;
  hasMask?: boolean;
  maskAmount?: number;
  clipping?: boolean;
  effects?: string[];
  isSmartObject?: boolean;
  smartObjectSource?: CanvasMark;
};
export type LayerDropPosition = "before" | "after" | "inside";

type ModeOption = { value: BlendMode; label: string };
const LAYER_BLEND_MODES: ModeOption[] = [
  { value: "normal", label: "Normal" }, { value: "multiply", label: "Multiply" },
  { value: "screen", label: "Screen" }, { value: "overlay", label: "Overlay" },
  { value: "darken", label: "Darken" }, { value: "lighten", label: "Lighten" },
  { value: "color-dodge", label: "Color Dodge" }, { value: "color-burn", label: "Color Burn" },
  { value: "hard-light", label: "Hard Light" }, { value: "soft-light", label: "Soft Light" },
  { value: "difference", label: "Difference" }, { value: "exclusion", label: "Exclusion" },
  { value: "hue", label: "Hue" }, { value: "saturation", label: "Saturation" },
  { value: "color", label: "Color" }, { value: "luminosity", label: "Luminosity" },
  { value: "lighter", label: "Linear Dodge (Add)" },
];
const GROUP_BLEND_MODES: ModeOption[] = [
  { value: "pass-through", label: "Pass Through" }, ...LAYER_BLEND_MODES,
];
const EFFECTS = ["shadow", "stroke", "glow", "blur", "sharpen"];
const fieldClass = "min-w-0 rounded border border-border bg-bg-surface px-1.5 py-1 text-[10px] text-text-primary outline-none focus:border-accent";

function displayName(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function PanelPercentControl({ label, value, onChange, disabled = false }: { label: string; value: number; onChange: (value: number) => void; disabled?: boolean }) {
  const [sliderOpen, setSliderOpen] = useState(false);
  return <div className="relative flex h-6 shrink-0 items-center rounded border border-border bg-bg-surface" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSliderOpen(false); }}>
    <input aria-label={`${label} percentage`} type="number" min="0" max="100" disabled={disabled} value={value} onChange={(event) => { if (event.target.value !== "") onChange(Math.max(0, Math.min(100, Number(event.target.value)))); }} className="h-full w-9 bg-transparent px-1 text-right text-[10px] text-text-primary outline-none disabled:cursor-not-allowed disabled:opacity-50" />
    <span className="pr-0.5 text-[9px] text-text-muted">%</span>
    <button type="button" disabled={disabled} aria-label={`Adjust ${label.toLowerCase()} with slider`} aria-expanded={!disabled && sliderOpen} onClick={() => setSliderOpen((open) => !open)} className="flex h-full items-center border-l border-border px-1 text-text-muted hover:bg-bg disabled:cursor-not-allowed disabled:opacity-40"><ChevronDown size={11} /></button>
    {sliderOpen && !disabled && <div className="absolute right-0 top-[calc(100%+4px)] z-30 w-36 rounded-md border border-border bg-bg-surface p-2 shadow-xl">
      <div className="mb-1 flex justify-between text-[9px] text-text-muted"><span>{label}</span><span>{value}%</span></div>
      <input aria-label={`${label} slider`} type="range" min="0" max="100" disabled={disabled} value={value} onChange={(event) => onChange(Number(event.target.value))} className="block h-3 w-full accent-lime-400" />
    </div>}
  </div>;
}

function LayerThumbnail({ layer, mark }: { layer: EditorLayer; mark?: CanvasMark }) {
  if (layer.isGroup) return <span className="flex h-7 w-9 shrink-0 items-center justify-center rounded border border-border bg-bg-surface text-accent"><FolderOpen size={14} /></span>;
  if (mark?.imageSrc) return <span className="h-7 w-9 shrink-0 overflow-hidden rounded border border-border bg-bg-surface"><img src={mark.imageSrc} alt="" className="h-full w-full object-contain" /></span>;
  if (mark?.kind === "Text") return <span className="flex h-7 w-9 shrink-0 items-center justify-center rounded border border-border bg-bg-surface text-[12px] font-bold" style={{ color: mark.color ?? "#111827", fontFamily: mark.fontFamily ?? "Arial" }}>Aa</span>;
  if (mark?.kind === "Pen") return <span className="flex h-7 w-9 shrink-0 items-center justify-center rounded border border-border bg-bg-surface"><PenTool size={14} style={{ color: mark.color ?? "#d4ff3f" }} /></span>;
  if (mark?.kind === "Shape") return <span className="flex h-7 w-9 shrink-0 items-center justify-center rounded border border-border bg-bg-surface"><Square size={14} style={{ color: mark.color ?? "#d4ff3f", fill: mark.color ?? "#d4ff3f" }} /></span>;
  return <span className="flex h-7 w-9 shrink-0 items-center justify-center rounded border border-border bg-bg-surface text-text-muted"><ImageIcon size={14} /></span>;
}

export default function LayersPanel({
  side, layers, marks, selectedLayerId, onSelectLayer, onUpdateLayer,
  onAddLayer, onAddGroup, onDuplicate, onMergeDown, onDelete, onMove,
  onRenameLayer, onDropLayer, selectedMark, onUpdateMark,
  onReplaceSmartObject,
}: {
  side: "Front" | "Back";
  layers: EditorLayer[];
  marks: CanvasMark[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string) => void;
  onUpdateLayer: (id: string, update: Partial<EditorLayer>) => void;
  onAddLayer: () => void;
  onAddGroup: () => void;
  onDuplicate: () => void;
  onMergeDown: () => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
  onRenameLayer: (id: string, name: string) => void;
  onDropLayer: (sourceId: string, targetId: string, position: LayerDropPosition) => void;
  selectedMark: CanvasMark | null;
  onUpdateMark: (id: string, update: Partial<CanvasMark>) => void;
  onReplaceSmartObject: (id: string, file: File) => Promise<void>;
}) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropHint, setDropHint] = useState<{ id: string; position: LayerDropPosition } | null>(null);
  const [showProperties, setShowProperties] = useState(false);
  const [effectToAdd, setEffectToAdd] = useState(EFFECTS[0]);
  const selected = layers.find((layer) => layer.id === selectedLayerId) ?? null;
  const selectedIndex = selected ? layers.findIndex((layer) => layer.id === selected.id) : -1;
  const selectedSiblings = selected ? layers.filter((layer) => layer.parentId === selected.parentId && !layer.isGroup) : [];
  const selectedSiblingIndex = selected ? selectedSiblings.findIndex((layer) => layer.id === selected.id) : -1;
  const canToggleClipping = Boolean(selected && selectedMark && !selected.isGroup && (selected.clipping || selectedSiblings.slice(0, selectedSiblingIndex).some((layer) => !layer.clipping)));
  const canMergeDown = Boolean(selected && !selected.isGroup && !selected.parentId && layers.slice(0, selectedIndex).some((layer) => !layer.parentId && !layer.isGroup));
  const children = useMemo(() => {
    const map = new Map<string, EditorLayer[]>();
    for (const layer of layers) if (layer.parentId) map.set(layer.parentId, [...(map.get(layer.parentId) ?? []), layer]);
    return map;
  }, [layers]);
  const visibleLayers = useMemo(() => [...layers].filter((layer) => !layer.parentId).reverse().flatMap((layer) => {
    if (!layer.isGroup || collapsedGroups.has(layer.id)) return [layer];
    return [layer, ...(children.get(layer.id) ?? []).reverse()];
  }), [layers, collapsedGroups, children]);
  const effects = selected?.effects ?? [];
  const selectedMode = selected ? (selected.blendMode ?? (selected.isGroup ? "pass-through" : "normal")) : "normal";

  function finishRename(layer: EditorLayer) {
    const value = draftName.trim();
    if (value && value !== layer.name) onRenameLayer(layer.id, value.slice(0, 60));
    setRenamingId(null);
  }
  function handleDragOver(event: React.DragEvent<HTMLDivElement>, layer: EditorLayer) {
    if (!draggedId || draggedId === layer.id) return;
    event.preventDefault();
    const source = layers.find((item) => item.id === draggedId);
    const rect = event.currentTarget.getBoundingClientRect();
    const relativeY = (event.clientY - rect.top) / rect.height;
    const position: LayerDropPosition = layer.isGroup && !source?.isGroup && relativeY > 0.25 && relativeY < 0.75
      ? "inside" : relativeY < 0.5 ? "before" : "after";
    setDropHint({ id: layer.id, position });
  }
  function dropOnLayer(event: React.DragEvent<HTMLDivElement>, layer: EditorLayer) {
    event.preventDefault();
    if (draggedId && dropHint?.id === layer.id) onDropLayer(draggedId, layer.id, dropHint.position);
    setDraggedId(null);
    setDropHint(null);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-border">
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-border px-2.5">
        <p className="text-[10px] font-semibold text-text-secondary">Layers · {side}</p>
        <span className="text-[9px] text-text-faint">{layers.length} items</span>
      </div>

      <div className="relative z-10 shrink-0 space-y-1 border-b border-border bg-bg px-2.5 py-1.5">
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="layer-blend-mode">Blend mode</label>
          <select id="layer-blend-mode" aria-label="Layer blend mode" disabled={!selected} value={selectedMode} onChange={(event) => { if (selected) onUpdateLayer(selected.id, { blendMode: event.target.value as BlendMode }); }} className={`${fieldClass} h-6 flex-1 text-[10px] disabled:cursor-not-allowed disabled:opacity-50`}>
            {(selected?.isGroup ? GROUP_BLEND_MODES : LAYER_BLEND_MODES).map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
          </select>
          <div className="flex shrink-0 items-center gap-1 text-[9px] text-text-muted"><span>Opacity</span><PanelPercentControl key={`${selected?.id ?? "none"}-opacity`} label="Opacity" value={selected?.opacity ?? 100} disabled={!selected} onChange={(value) => { if (selected) onUpdateLayer(selected.id, { opacity: value }); }} /></div>
        </div>
        <div className="flex items-center gap-1.5 border-t border-border/70 pt-1">
          <span className="text-[9px] text-text-muted">Lock</span>
          <button type="button" disabled={!selected} title={selected?.locked ? "Unlock layer" : "Lock layer"} aria-label={selected?.locked ? "Unlock selected layer" : "Lock selected layer"} onClick={() => { if (selected) onUpdateLayer(selected.id, { locked: !selected.locked }); }} className={`rounded p-1 hover:bg-bg-surface disabled:cursor-not-allowed disabled:opacity-40 ${selected?.locked ? "text-accent" : "text-text-secondary"}`}>{selected?.locked ? <Lock size={13} /> : <LockOpen size={13} />}</button>
          <div className="ml-auto flex items-center gap-1 text-[9px] text-text-muted"><span>Fill</span><PanelPercentControl key={`${selected?.id ?? "none"}-fill`} label="Fill" value={selected?.fillOpacity ?? 100} disabled={!selected || selected.isGroup} onChange={(value) => { if (selected && !selected.isGroup) onUpdateLayer(selected.id, { fillOpacity: value }); }} /></div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {!visibleLayers.length && <p className="px-2 py-6 text-center text-[10px] text-text-faint">No layers yet. Add a layer or upload an image.</p>}
        <div className="flex flex-col gap-px">
          {visibleLayers.map((layer) => {
            const nested = Boolean(layer.parentId);
            const mark = marks.find((item) => item.id === layer.id);
            const isDropTarget = dropHint?.id === layer.id;
            const dropStyle = isDropTarget ? dropHint.position === "inside" ? "bg-accent/15 ring-1 ring-accent" : dropHint.position === "before" ? "border-t-2 border-accent" : "border-b-2 border-accent" : "";
            const collapsed = collapsedGroups.has(layer.id);
            return <div key={layer.id} draggable={renamingId !== layer.id}
              onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", layer.id); setDraggedId(layer.id); }}
              onDragEnd={() => { setDraggedId(null); setDropHint(null); }}
              onDragOver={(event) => handleDragOver(event, layer)} onDrop={(event) => dropOnLayer(event, layer)}
              className={`flex min-h-9 items-center gap-1 rounded px-1 ${selectedLayerId === layer.id ? "bg-accent/10 ring-1 ring-accent/40" : "hover:bg-bg-surface"} ${nested ? "ml-4" : ""} ${dropStyle} ${draggedId === layer.id ? "opacity-40" : ""}`}>
              {layer.isGroup ? <button type="button" title={collapsed ? "Expand group" : "Collapse group"} aria-label={collapsed ? "Expand group" : "Collapse group"} onClick={() => setCollapsedGroups((current) => { const next = new Set(current); next.has(layer.id) ? next.delete(layer.id) : next.add(layer.id); return next; })} className="shrink-0 text-text-muted">{collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}</button> : <span className="w-[13px] shrink-0" />}
              <button type="button" title={layer.visible ? "Hide layer" : "Show layer"} aria-label={layer.visible ? "Hide layer" : "Show layer"} onClick={() => onUpdateLayer(layer.id, { visible: !layer.visible })} className="shrink-0 text-text-muted hover:text-text-primary">{layer.visible ? <Eye size={13} /> : <EyeOff size={13} />}</button>
              {renamingId === layer.id ? <div className="flex min-w-0 flex-1 items-center gap-1.5"><LayerThumbnail layer={layer} mark={mark} /><input autoFocus value={draftName} onChange={(event) => setDraftName(event.target.value)} onBlur={() => finishRename(layer)} onKeyDown={(event) => { if (event.key === "Enter") finishRename(layer); if (event.key === "Escape") setRenamingId(null); }} className="min-w-0 flex-1 rounded border border-accent bg-bg px-1 py-0.5 text-[10px] outline-none" /></div> : <button type="button" aria-pressed={selectedLayerId === layer.id} onClick={() => onSelectLayer(layer.id)} onDoubleClick={() => { setRenamingId(layer.id); setDraftName(layer.name); }} className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-[10px]">
                <LayerThumbnail layer={layer} mark={mark} /><span className="min-w-0 flex-1 truncate" title={`${layer.name} · double-click to rename`}>{layer.name}</span>{layer.isSmartObject && <span title="Embedded Smart Object"><Box size={11} className="shrink-0 text-accent" /></span>}{layer.clipping && <span title="Clipped to base layer below"><SquareStack size={11} className="shrink-0 text-accent" /></span>}{layer.hasMask && <Scissors size={11} className="shrink-0 text-text-muted" />}{(layer.effects?.length ?? 0) > 0 && <span className="shrink-0 text-[9px] font-semibold text-text-muted">fx</span>}
              </button>}
              {layer.locked && <button type="button" title="Unlock layer" aria-label="Unlock layer" onClick={() => onUpdateLayer(layer.id, { locked: false })} className="shrink-0 text-accent"><Lock size={12} /></button>}
            </div>;
          })}
        </div>

        <details open={showProperties} onToggle={(event) => setShowProperties(event.currentTarget.open)} className="mt-2 border-t border-border pt-1.5">
          <summary className="cursor-pointer select-none px-1 py-1 text-[9px] font-semibold text-text-muted">Layer properties</summary>
          {selected ? <div className="space-y-2 px-1 py-1.5">
            {selectedMark?.kind === "Text" && <div className="space-y-2 border-b border-border pb-2">
              <label className="block text-[9px] text-text-muted">Font family<select aria-label="Text font family" value={selectedMark.fontFamily ?? "Arial"} onChange={(event) => onUpdateMark(selectedMark.id, { fontFamily: event.target.value })} className={`${fieldClass} mt-1 w-full`}>{FONT_LIBRARY.map((font) => <option key={font.id} value={font.family}>{font.name}</option>)}</select></label>
              <label className="block text-[9px] text-text-muted">Font size · {selectedMark.fontSize ?? 32} px<input aria-label="Text font size" type="range" min="12" max="120" value={selectedMark.fontSize ?? 32} onChange={(event) => onUpdateMark(selectedMark.id, { fontSize: Number(event.target.value) })} className="mt-1 w-full accent-lime-400" /></label>
              <label className="flex items-center justify-between text-[9px] text-text-muted">Text color<input aria-label="Text color" type="color" value={selectedMark.color ?? "#111827"} onChange={(event) => onUpdateMark(selectedMark.id, { color: event.target.value })} className="h-6 w-9 cursor-pointer rounded border border-border bg-transparent" /></label>
              <label className="flex items-center gap-2 text-[9px] text-text-muted"><input type="checkbox" checked={(selectedMark.fontWeight ?? "bold") === "bold"} onChange={(event) => onUpdateMark(selectedMark.id, { fontWeight: event.target.checked ? "bold" : "normal" })} className="accent-lime-400" /> Bold</label>
            </div>}
            {selectedMark?.kind === "Pen" && <div className="space-y-2 border-b border-border pb-2">
              <label className="flex items-center justify-between text-[9px] text-text-muted">Stroke color<input aria-label="Stroke color" type="color" value={selectedMark.color ?? "#d4ff3f"} onChange={(event) => onUpdateMark(selectedMark.id, { color: event.target.value })} className="h-6 w-9 cursor-pointer rounded border border-border bg-transparent" /></label>
              <label className="block text-[9px] text-text-muted">Stroke width · {selectedMark.strokeWidth ?? 6} px<input aria-label="Stroke width" type="range" min="1" max="32" value={selectedMark.strokeWidth ?? 6} onChange={(event) => onUpdateMark(selectedMark.id, { strokeWidth: Number(event.target.value) })} className="mt-1 w-full accent-lime-400" /></label>
            </div>}
            {selectedMark?.imageSrc && <div className="space-y-1.5 border-b border-border pb-2">
              {!selected.isSmartObject ? <button type="button" onClick={() => onUpdateLayer(selected.id, { isSmartObject: true, smartObjectSource: { id: selectedMark.id, kind: "Image", x: selectedMark.x, y: selectedMark.y, width: selectedMark.width, angle: selectedMark.angle, scaleX: selectedMark.scaleX, scaleY: selectedMark.scaleY } })} className="w-full rounded border border-border px-2 py-1.5 text-[9px] text-text-secondary hover:bg-bg-surface">Convert to Smart Object</button> : <>
                <div className="text-[9px] font-medium text-accent">Embedded Smart Object · source preserved</div>
                <label className="block cursor-pointer rounded border border-border px-2 py-1.5 text-center text-[9px] text-text-secondary hover:bg-bg-surface">Replace Contents<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void onReplaceSmartObject(selected.id, file); event.currentTarget.value = ""; }} /></label>
                <button type="button" disabled={!selected.smartObjectSource} onClick={() => selected.smartObjectSource && onUpdateMark(selected.id, { x: selected.smartObjectSource.x, y: selected.smartObjectSource.y, angle: selected.smartObjectSource.angle, scaleX: selected.smartObjectSource.scaleX, scaleY: selected.smartObjectSource.scaleY, width: selected.smartObjectSource.width })} className="w-full rounded border border-border px-2 py-1.5 text-[9px] text-text-secondary hover:bg-bg-surface disabled:opacity-40">Reset Transform</button>
                <button type="button" onClick={() => onUpdateLayer(selected.id, { isSmartObject: false, smartObjectSource: undefined })} className="w-full rounded border border-border px-2 py-1.5 text-[9px] text-text-muted hover:bg-bg-surface">Rasterize Smart Object</button>
              </>}
            </div>}
            {!selected.isGroup && <label className="block text-[9px] text-text-muted">Flow · {selected.flow ?? 100}%<input aria-label="Layer flow" type="range" min="0" max="100" value={selected.flow ?? 100} onChange={(event) => onUpdateLayer(selected.id, { flow: Number(event.target.value) })} className="mt-1 w-full accent-lime-400" /></label>}
            <div className="flex flex-wrap gap-1"><button type="button" disabled={!canToggleClipping} onClick={() => onUpdateLayer(selected.id, { clipping: !selected.clipping })} title="Use the nearest unclipped layer below as the alpha base" className={`rounded border px-1.5 py-1 text-[9px] disabled:opacity-40 ${selected.clipping ? "border-accent text-accent" : "border-border text-text-secondary"}`}>{selected.clipping ? "Release clipping mask" : "Create clipping mask"}</button>{selected.hasMask && <label className="block w-full text-[9px] text-text-muted">Mask density · {selected.maskAmount ?? 100}%<input aria-label="Layer mask density" type="range" min="0" max="100" value={selected.maskAmount ?? 100} onChange={(event) => onUpdateLayer(selected.id, { maskAmount: Number(event.target.value) })} className="mt-1 w-full accent-lime-400" /></label>}</div>
            <div className="space-y-1 border-t border-border pt-2"><div className="flex gap-1"><select aria-label="Choose layer effect" value={effectToAdd} onChange={(event) => setEffectToAdd(event.target.value)} className={`${fieldClass} flex-1`}>{EFFECTS.map((effect) => <option key={effect} value={effect}>{displayName(effect)}</option>)}</select><button type="button" onClick={() => onUpdateLayer(selected.id, { effects: effects.includes(effectToAdd) ? effects : [...effects, effectToAdd] })} className="rounded bg-bg-surface px-2 text-[9px]">Add</button></div>{effects.length > 0 && <div className="flex flex-wrap gap-1">{effects.map((effect) => <button type="button" key={effect} onClick={() => onUpdateLayer(selected.id, { effects: effects.filter((item) => item !== effect) })} title="Remove effect" className="rounded bg-accent/10 px-1.5 py-0.5 text-[8px] text-accent">{displayName(effect)} ×</button>)}</div>}</div>
          </div> : <p className="px-1 py-2 text-[9px] text-text-faint">Select a layer to view its advanced properties.</p>}
        </details>
      </div>

      <div className="flex shrink-0 items-center justify-around border-t border-border p-1.5 text-text-secondary">
        <button type="button" title="Create new layer" aria-label="Create new layer" onClick={onAddLayer} className="rounded p-1.5 hover:bg-bg"><Plus size={14} /></button>
        <button type="button" title="Create new group" aria-label="Create new group" onClick={onAddGroup} className="rounded p-1.5 hover:bg-bg"><FolderClosed size={14} /></button>
        <button type="button" title="Duplicate selected layer" aria-label="Duplicate selected layer" disabled={!selected} onClick={onDuplicate} className="rounded p-1.5 hover:bg-bg disabled:opacity-30"><Copy size={14} /></button>
        <button type="button" title="Group selected layer with layer below" aria-label="Group selected layer with layer below" disabled={!canMergeDown} onClick={onMergeDown} className="rounded p-1.5 hover:bg-bg disabled:opacity-30"><Layers2 size={14} /></button>
        <button type="button" title="Move layer up" aria-label="Move layer up" disabled={!selected} onClick={() => onMove(-1)} className="rounded p-1.5 hover:bg-bg disabled:opacity-30"><ArrowUp size={14} /></button>
        <button type="button" title="Move layer down" aria-label="Move layer down" disabled={!selected} onClick={() => onMove(1)} className="rounded p-1.5 hover:bg-bg disabled:opacity-30"><ArrowDown size={14} /></button>
        <button type="button" title="Delete selected layer" aria-label="Delete selected layer" disabled={!selected} onClick={onDelete} className="rounded p-1.5 text-red-500 hover:bg-bg disabled:opacity-30"><Trash2 size={14} /></button>
      </div>
    </div>
  );
}
