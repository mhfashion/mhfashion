"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  FolderClosed,
  FolderOpen,
  Image as ImageIcon,
  Layers2,
  Lock,
  LockOpen,
  PenTool,
  Plus,
  Copy,
  Scissors,
  Square,
  SquareStack,
  Trash2,
  Type,
} from "lucide-react";
import type { CanvasMark } from "./InteractiveCanvas";

type BlendMode = "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten";
export type EditorLayer = {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  isGroup: boolean;
  parentId?: string;
  childIds?: string[];
  opacity?: number;
  flow?: number;
  blendMode?: BlendMode;
  hasMask?: boolean;
  maskAmount?: number;
  clipping?: boolean;
  effects?: string[];
};
export type LayerDropPosition = "before" | "after" | "inside";

const BLEND_MODES: { value: BlendMode; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "multiply", label: "Multiply" },
  { value: "screen", label: "Screen" },
  { value: "overlay", label: "Overlay" },
  { value: "darken", label: "Darken" },
  { value: "lighten", label: "Lighten" },
];
const EFFECTS = ["shadow", "stroke", "glow", "blur", "sharpen"];

function displayName(effect: string) {
  return effect.charAt(0).toUpperCase() + effect.slice(1);
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
  side,
  layers,
  marks,
  selectedLayerId,
  onSelectLayer,
  onUpdateLayer,
  onAddLayer,
  onAddGroup,
  onDuplicate,
  onMergeDown,
  onDelete,
  onMove,
  onRenameLayer,
  onDropLayer,
  selectedMark,
  onUpdateMark,
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
}) {
  const [effectToAdd, setEffectToAdd] = useState(EFFECTS[0]);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropHint, setDropHint] = useState<{ id: string; position: LayerDropPosition } | null>(null);
  const selected = layers.find((layer) => layer.id === selectedLayerId) ?? null;
  const selectedIndex = selected ? layers.findIndex((layer) => layer.id === selected.id) : -1;
  const canMergeDown = Boolean(selected && !selected.isGroup && !selected.parentId && layers.slice(0, selectedIndex).some((layer) => !layer.parentId && !layer.isGroup));
  const visibleLayers = useMemo(() => {
    const children = new Map<string, EditorLayer[]>();
    for (const layer of layers) {
      if (layer.parentId) children.set(layer.parentId, [...(children.get(layer.parentId) ?? []), layer]);
    }
    return [...layers].filter((layer) => !layer.parentId).reverse().flatMap((layer) => {
      if (!layer.isGroup || collapsedGroups.has(layer.id)) return [layer];
      return [layer, ...(children.get(layer.id) ?? []).reverse()];
    });
  }, [layers, collapsedGroups]);
  const effects = selected?.effects ?? [];

  function beginRename(layer: EditorLayer) {
    setRenamingId(layer.id);
    setDraftName(layer.name);
  }

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
      ? "inside"
      : relativeY < 0.5 ? "before" : "after";
    setDropHint({ id: layer.id, position });
  }

  function dropOnLayer(event: React.DragEvent<HTMLDivElement>, layer: EditorLayer) {
    event.preventDefault();
    if (draggedId && dropHint?.id === layer.id) onDropLayer(draggedId, layer.id, dropHint.position);
    setDraggedId(null);
    setDropHint(null);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
        <p className="mb-2 text-[10px] text-text-muted">Layers · {side}</p>

        {selected && (
          <div className="mb-3 space-y-2 rounded-md border border-border bg-bg p-2">
            <p className="text-[9px] font-semibold text-text-muted">Selected · {selected.name}</p>
            {selectedMark?.kind === "Text" && <div className="space-y-2 border-b border-border pb-2">
              <label className="block text-[9px] text-text-muted">Font family
                <select aria-label="Text font family" value={selectedMark.fontFamily ?? "Arial"} onChange={(event) => onUpdateMark(selectedMark.id, { fontFamily: event.target.value })} className="mt-1 w-full rounded bg-bg-surface px-1.5 py-1 text-[10px] text-text-primary">
                  {["Arial", "Georgia", "Times New Roman", "Courier New", "Trebuchet MS", "Impact"].map((family) => <option key={family} value={family}>{family}</option>)}
                </select>
              </label>
              <label className="block text-[9px] text-text-muted">Font size · {selectedMark.fontSize ?? 32} px
                <input aria-label="Text font size" type="range" min="12" max="120" value={selectedMark.fontSize ?? 32} onChange={(event) => onUpdateMark(selectedMark.id, { fontSize: Number(event.target.value) })} className="mt-1 w-full accent-lime-400" />
              </label>
              <label className="flex items-center justify-between text-[9px] text-text-muted">Text color
                <input aria-label="Text color" type="color" value={selectedMark.color ?? "#111827"} onChange={(event) => onUpdateMark(selectedMark.id, { color: event.target.value })} className="h-6 w-9 cursor-pointer rounded border border-border bg-transparent" />
              </label>
              <label className="flex items-center gap-2 text-[9px] text-text-muted"><input type="checkbox" checked={(selectedMark.fontWeight ?? "bold") === "bold"} onChange={(event) => onUpdateMark(selectedMark.id, { fontWeight: event.target.checked ? "bold" : "normal" })} className="accent-lime-400" /> Bold</label>
            </div>}
            {selectedMark?.kind === "Pen" && <div className="space-y-2 border-b border-border pb-2">
              <label className="flex items-center justify-between text-[9px] text-text-muted">Stroke color
                <input aria-label="Stroke color" type="color" value={selectedMark.color ?? "#d4ff3f"} onChange={(event) => onUpdateMark(selectedMark.id, { color: event.target.value })} className="h-6 w-9 cursor-pointer rounded border border-border bg-transparent" />
              </label>
              <label className="block text-[9px] text-text-muted">Stroke width · {selectedMark.strokeWidth ?? 6} px
                <input aria-label="Stroke width" type="range" min="1" max="32" value={selectedMark.strokeWidth ?? 6} onChange={(event) => onUpdateMark(selectedMark.id, { strokeWidth: Number(event.target.value) })} className="mt-1 w-full accent-lime-400" />
              </label>
            </div>}
            <label className="block text-[9px] text-text-muted">Blend mode
              <select aria-label="Layer blend mode" value={selected.blendMode ?? "normal"} onChange={(event) => onUpdateLayer(selected.id, { blendMode: event.target.value as BlendMode })} className="mt-1 w-full rounded bg-bg-surface px-1.5 py-1 text-[10px] text-text-primary outline-none">
                {BLEND_MODES.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
              </select>
            </label>
            <label className="block text-[9px] text-text-muted">Opacity · {selected.opacity ?? 100}%
              <input aria-label="Layer opacity" type="range" min="0" max="100" value={selected.opacity ?? 100} onChange={(event) => onUpdateLayer(selected.id, { opacity: Number(event.target.value) })} className="mt-1 w-full accent-lime-400" />
            </label>
            <label className="block text-[9px] text-text-muted">Flow · {selected.flow ?? 100}%
              <input aria-label="Layer flow" type="range" min="0" max="100" value={selected.flow ?? 100} onChange={(event) => onUpdateLayer(selected.id, { flow: Number(event.target.value) })} className="mt-1 w-full accent-lime-400" />
            </label>
            <div className="grid grid-cols-2 gap-1">
              <button type="button" onClick={() => onUpdateLayer(selected.id, { hasMask: !selected.hasMask, maskAmount: selected.hasMask ? undefined : 100 })} className={`rounded border px-1.5 py-1 text-[9px] ${selected.hasMask ? "border-accent text-accent" : "border-border text-text-secondary"}`}>{selected.hasMask ? "Remove mask" : "Add mask"}</button>
              <button type="button" onClick={() => onUpdateLayer(selected.id, { clipping: !selected.clipping })} className={`rounded border px-1.5 py-1 text-[9px] ${selected.clipping ? "border-accent text-accent" : "border-border text-text-secondary"}`}>{selected.clipping ? "Unclip" : "Clip"}</button>
            </div>
            {selected.hasMask && <label className="block text-[9px] text-text-muted">Mask strength · {selected.maskAmount ?? 100}%
              <input aria-label="Layer mask strength" type="range" min="0" max="100" value={selected.maskAmount ?? 100} onChange={(event) => onUpdateLayer(selected.id, { maskAmount: Number(event.target.value) })} className="mt-1 w-full accent-lime-400" />
            </label>}
            <div className="space-y-1 border-t border-border pt-2">
              <div className="flex gap-1">
                <select aria-label="Choose layer effect" value={effectToAdd} onChange={(event) => setEffectToAdd(event.target.value)} className="min-w-0 flex-1 rounded bg-bg-surface px-1 py-1 text-[9px]">
                  {EFFECTS.map((effect) => <option key={effect} value={effect}>{displayName(effect)}</option>)}
                </select>
                <button type="button" onClick={() => onUpdateLayer(selected.id, { effects: effects.includes(effectToAdd) ? effects : [...effects, effectToAdd] })} className="rounded bg-bg-surface px-2 text-[9px]">Add</button>
              </div>
              {effects.length > 0 && <div className="flex flex-wrap gap-1">{effects.map((effect) => <button type="button" key={effect} onClick={() => onUpdateLayer(selected.id, { effects: effects.filter((item) => item !== effect) })} title="Remove effect" className="rounded bg-accent/10 px-1.5 py-0.5 text-[8px] text-accent">{displayName(effect)} ×</button>)}</div>}
            </div>
          </div>
        )}

        {!visibleLayers.length && <p className="py-6 text-center text-[10px] text-text-faint">No layers yet. Add a layer or upload an image.</p>}
        <div className="flex flex-col gap-0.5">
          {visibleLayers.map((layer) => {
            const nested = Boolean(layer.parentId);
            const mark = marks.find((item) => item.id === layer.id);
            const isDropTarget = dropHint?.id === layer.id;
            const dropStyle = isDropTarget ? dropHint.position === "inside" ? "bg-accent/15 ring-1 ring-accent" : dropHint.position === "before" ? "border-t-2 border-accent" : "border-b-2 border-accent" : "";
            return (
              <div
                key={layer.id}
                draggable={renamingId !== layer.id}
                onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", layer.id); setDraggedId(layer.id); }}
                onDragEnd={() => { setDraggedId(null); setDropHint(null); }}
                onDragOver={(event) => handleDragOver(event, layer)}
                onDrop={(event) => dropOnLayer(event, layer)}
                className={`flex min-h-10 items-center gap-1 rounded px-1 py-1 ${selectedLayerId === layer.id ? "bg-bg-surface" : "hover:bg-bg"} ${nested ? "ml-4" : ""} ${dropStyle} ${draggedId === layer.id ? "opacity-40" : ""}`}
              >
                {layer.isGroup ? <button type="button" title={collapsedGroups.has(layer.id) ? "Expand group" : "Collapse group"} aria-label={collapsedGroups.has(layer.id) ? "Expand group" : "Collapse group"} onClick={() => setCollapsedGroups((current) => { const next = new Set(current); next.has(layer.id) ? next.delete(layer.id) : next.add(layer.id); return next; })} className="shrink-0 text-text-muted">{collapsedGroups.has(layer.id) ? <ChevronRight size={12} /> : <ChevronDown size={12} />}</button> : <span className="w-3 shrink-0" />}
                {renamingId === layer.id ? <div className="flex min-w-0 flex-1 items-center gap-1.5"><LayerThumbnail layer={layer} mark={mark} /><input autoFocus value={draftName} onChange={(event) => setDraftName(event.target.value)} onBlur={() => finishRename(layer)} onKeyDown={(event) => { if (event.key === "Enter") finishRename(layer); if (event.key === "Escape") setRenamingId(null); }} className="min-w-0 flex-1 rounded border border-accent bg-bg px-1 py-0.5 text-[10px] outline-none" /></div> : <button type="button" aria-pressed={selectedLayerId === layer.id} onClick={() => onSelectLayer(layer.id)} onDoubleClick={() => beginRename(layer)} className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-[10px]"><LayerThumbnail layer={layer} mark={mark} /><span className="min-w-0 flex-1 truncate" title={`${layer.name} · double-click to rename`}>{layer.name}{layer.hasMask ? " · mask" : ""}{layer.clipping ? " · clip" : ""}</span></button>}
                <button type="button" title={layer.visible ? "Hide layer" : "Show layer"} aria-label={layer.visible ? "Hide layer" : "Show layer"} onClick={() => onUpdateLayer(layer.id, { visible: !layer.visible })} className="shrink-0 text-text-muted">{layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}</button>
                <button type="button" title={layer.locked ? "Unlock layer" : "Lock layer"} aria-label={layer.locked ? "Unlock layer" : "Lock layer"} onClick={() => onUpdateLayer(layer.id, { locked: !layer.locked })} className="shrink-0 text-text-muted">{layer.locked ? <Lock size={12} /> : <LockOpen size={12} />}</button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1 border-t border-border p-2 text-text-secondary">
        <button type="button" title="New layer" aria-label="New layer" onClick={onAddLayer} className="rounded p-1.5 hover:bg-bg"><Plus size={14} className="mx-auto" /></button>
        <button type="button" title="New group" aria-label="New group" onClick={onAddGroup} className="rounded p-1.5 hover:bg-bg"><FolderClosed size={14} className="mx-auto" /></button>
        <button type="button" title="Duplicate selected layer" aria-label="Duplicate selected layer" disabled={!selected} onClick={onDuplicate} className="rounded p-1.5 hover:bg-bg disabled:opacity-30"><Copy size={14} className="mx-auto" /></button>
        <button type="button" title="Group selected layer with the layer below" aria-label="Group selected layer with the layer below" disabled={!canMergeDown} onClick={onMergeDown} className="rounded p-1.5 hover:bg-bg disabled:opacity-30"><Layers2 size={14} className="mx-auto" /></button>
        <button type="button" title="Move layer up" aria-label="Move layer up" disabled={!selected} onClick={() => onMove(-1)} className="rounded p-1.5 hover:bg-bg disabled:opacity-30"><ArrowUp size={14} className="mx-auto" /></button>
        <button type="button" title="Move layer down" aria-label="Move layer down" disabled={!selected} onClick={() => onMove(1)} className="rounded p-1.5 hover:bg-bg disabled:opacity-30"><ArrowDown size={14} className="mx-auto" /></button>
        <button type="button" title="Toggle clipping mask" aria-label="Toggle clipping mask" disabled={!selected} onClick={() => selected && onUpdateLayer(selected.id, { clipping: !selected.clipping })} className={`rounded p-1.5 hover:bg-bg disabled:opacity-30 ${selected?.clipping ? "text-accent" : ""}`}><SquareStack size={14} className="mx-auto" /></button>
        <button type="button" title="Delete selected layer" aria-label="Delete selected layer" disabled={!selected} onClick={onDelete} className="rounded p-1.5 text-red-500 hover:bg-bg disabled:opacity-30"><Trash2 size={14} className="mx-auto" /></button>
        <button type="button" title="Add or remove layer mask" aria-label="Add or remove layer mask" disabled={!selected} onClick={() => selected && onUpdateLayer(selected.id, { hasMask: !selected.hasMask, maskAmount: selected.hasMask ? undefined : 100 })} className={`col-span-4 flex items-center justify-center gap-1 rounded border border-border px-2 py-1 text-[9px] hover:bg-bg disabled:opacity-30 ${selected?.hasMask ? "text-accent" : ""}`}><Scissors size={12} /> {selected?.hasMask ? "Remove layer mask" : "Add layer mask"}</button>
      </div>
    </div>
  );
}
