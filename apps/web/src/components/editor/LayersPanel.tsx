"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  FolderPlus,
  Image as ImageIcon,
  Layers2,
  Lock,
  LockOpen,
  Plus,
  Copy,
  Scissors,
  SquareStack,
  Trash2,
} from "lucide-react";

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

export default function LayersPanel({
  side,
  layers,
  selectedLayerId,
  onSelectLayer,
  onUpdateLayer,
  onAddLayer,
  onAddGroup,
  onDuplicate,
  onMergeDown,
  onDelete,
  onMove,
}: {
  side: "Front" | "Back";
  layers: EditorLayer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string) => void;
  onUpdateLayer: (id: string, update: Partial<EditorLayer>) => void;
  onAddLayer: () => void;
  onAddGroup: () => void;
  onDuplicate: () => void;
  onMergeDown: () => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const [effectToAdd, setEffectToAdd] = useState(EFFECTS[0]);
  const selected = layers.find((layer) => layer.id === selectedLayerId) ?? null;
  const selectedIndex = selected ? layers.findIndex((layer) => layer.id === selected.id) : -1;
  const canMergeDown = Boolean(selected && !selected.isGroup && !selected.parentId && layers.slice(0, selectedIndex).some((layer) => !layer.parentId && !layer.isGroup));
  const visibleLayers = useMemo(() => {
    const children = new Map<string, EditorLayer[]>();
    for (const layer of layers) {
      if (layer.parentId) children.set(layer.parentId, [...(children.get(layer.parentId) ?? []), layer]);
    }
    return [...layers].filter((layer) => !layer.parentId).reverse().flatMap((layer) => [layer, ...(children.get(layer.id) ?? []).reverse()]);
  }, [layers]);
  const effects = selected?.effects ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
        <p className="mb-2 text-[10px] text-text-muted">Layers · {side}</p>

        {selected && (
          <div className="mb-3 space-y-2 rounded-md border border-border bg-bg p-2">
            <p className="text-[9px] font-semibold text-text-muted">Selected · {selected.name}</p>
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
            return (
              <div key={layer.id} role="button" tabIndex={0} onClick={() => onSelectLayer(layer.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelectLayer(layer.id); }} className={`flex items-center gap-1 rounded-md px-1.5 py-1.5 text-[10px] ${selectedLayerId === layer.id ? "bg-bg-surface" : "hover:bg-bg"} ${nested ? "ml-4" : ""}`}>
                <button type="button" title={layer.visible ? "Hide layer" : "Show layer"} aria-label={layer.visible ? "Hide layer" : "Show layer"} onClick={(event) => { event.stopPropagation(); onUpdateLayer(layer.id, { visible: !layer.visible }); }} className="shrink-0 text-text-muted">{layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}</button>
                {layer.isGroup ? <FolderPlus size={12} className="shrink-0 text-accent" /> : <ImageIcon size={12} className="shrink-0 text-text-muted" />}
                <span className="min-w-0 flex-1 truncate" title={layer.name}>{layer.name}{layer.hasMask ? " · mask" : ""}{layer.clipping ? " · clip" : ""}</span>
                <button type="button" title={layer.locked ? "Unlock layer" : "Lock layer"} aria-label={layer.locked ? "Unlock layer" : "Lock layer"} onClick={(event) => { event.stopPropagation(); onUpdateLayer(layer.id, { locked: !layer.locked }); }} className="shrink-0 text-text-muted">{layer.locked ? <Lock size={12} /> : <LockOpen size={12} />}</button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1 border-t border-border p-2 text-text-secondary">
        <button type="button" title="New layer" aria-label="New layer" onClick={onAddLayer} className="rounded p-1.5 hover:bg-bg"><Plus size={14} className="mx-auto" /></button>
        <button type="button" title="New group" aria-label="New group" onClick={onAddGroup} className="rounded p-1.5 hover:bg-bg"><FolderPlus size={14} className="mx-auto" /></button>
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
