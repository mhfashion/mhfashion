"use client";

import {
  ArrowDown,
  ArrowUp,
  Blend,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  Layers,
  LockKeyhole,
  Plus,
  SquareDashed,
  Trash2,
  UnlockKeyhole,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type {
  EditorArtworkLayer,
  EditorLayerBlendMode,
  LayerEditTarget,
  MaskBrushMode,
} from "@/lib/editor-layers";

const PANEL_WIDTH = "min(17rem, 86vw)";
const iconButtonClass = "flex h-9 w-9 shrink-0 items-center justify-center rounded text-text-secondary outline-none hover:bg-[#d8d8d8] hover:text-[#111] disabled:cursor-not-allowed disabled:opacity-35 focus-visible:ring-2 focus-visible:ring-[#3986c6] dark:hover:bg-[#414141] dark:hover:text-white [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11";
const BLEND_MODES: { value: EditorLayerBlendMode; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "multiply", label: "Multiply" },
  { value: "screen", label: "Screen" },
  { value: "overlay", label: "Overlay" },
];

type LayerUpdate = Partial<Pick<EditorArtworkLayer, "opacity" | "blendMode">>;

export default function EditorLayersPanel({
  open,
  onToggle,
  layers,
  selectedLayerId,
  selectedTarget,
  maskBrushMode,
  onSelectLayer,
  onAddLayer,
  onToggleVisibility,
  onToggleLock,
  onAddMask,
  onRemoveMask,
  onRenameLayer,
  onDuplicateLayer,
  onDeleteLayer,
  onMoveLayer,
  onUpdateLayer,
  onMaskBrushModeChange,
}: {
  open: boolean;
  onToggle: () => void;
  layers: EditorArtworkLayer[];
  selectedLayerId: string | null;
  selectedTarget: LayerEditTarget;
  maskBrushMode: MaskBrushMode;
  onSelectLayer: (id: string, target: LayerEditTarget) => void;
  onAddLayer: () => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onAddMask: (id: string) => void;
  onRemoveMask: (id: string) => void;
  onRenameLayer: (id: string, name: string) => void;
  onDuplicateLayer: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onMoveLayer: (id: string, direction: -1 | 1) => void;
  onUpdateLayer: (id: string, update: LayerUpdate) => void;
  onMaskBrushModeChange: (mode: MaskBrushMode) => void;
}) {
  const [renamingLayerId, setRenamingLayerId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const selectedLayer = layers.find((layer) => layer.id === selectedLayerId) ?? null;

  useEffect(() => {
    if (renamingLayerId) renameInputRef.current?.focus();
  }, [renamingLayerId]);

  function beginRename(layer: EditorArtworkLayer) {
    setRenameValue(layer.name);
    setRenamingLayerId(layer.id);
  }

  function finishRename() {
    if (renamingLayerId) onRenameLayer(renamingLayerId, renameValue);
    setRenamingLayerId(null);
  }

  return (
    <>
      {open && (
        <aside
          aria-label="Layers panel"
          data-dock-side="right"
          className="absolute inset-y-0 right-0 z-30 flex min-h-0 flex-col overflow-y-auto overscroll-contain border-l border-[#bcbcbc] bg-[#e8e8e8] text-[#202020] shadow-xl dark:border-[#171717] dark:bg-[#2b2b2b] dark:text-[#dedede] dark:shadow-black/60"
          style={{ width: PANEL_WIDTH }}
        >
          <div className="sticky top-0 z-10 flex h-11 shrink-0 items-center gap-2 border-b border-[#bcbcbc] bg-[#dedede] px-3 dark:border-[#171717] dark:bg-[#343434]">
            <Layers size={15} aria-hidden="true" className="text-text-secondary" />
            <h2 className="text-sm font-semibold">Layers</h2>
            <span aria-label="Layer count" className="text-xs text-text-muted">{layers.length}</span>
            <button
              type="button"
              aria-label="Add layer"
              title="Add layer"
              onClick={onAddLayer}
              className={`${iconButtonClass} ml-auto text-accent`}
            >
              <Plus size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="shrink-0 p-2">
            {layers.length === 0 ? (
              <div className="flex min-h-28 flex-col items-center justify-center gap-2 text-center text-xs text-text-muted">
                <Layers size={20} aria-hidden="true" />
                <p>No layers yet. Add a layer to start drawing.</p>
              </div>
            ) : (
              <div aria-label="Layer list" role="list" className="space-y-1">
                {layers.map((layer, index) => {
                  const isSelected = layer.id === selectedLayerId;
                  const isMaskSelected = isSelected && selectedTarget === "mask";
                  return (
                    <div
                      key={layer.id}
                      role="listitem"
                      data-layer-id={layer.id}
                      className={`rounded-sm border p-1 ${isSelected ? "border-[#488ccc] bg-[#d2e5f8] dark:border-[#71afe5] dark:bg-[#3f5b73]" : "border-transparent hover:border-[#bbbbbb] dark:hover:border-[#595959]"}`}
                    >
                      <div className="flex min-w-0 items-center gap-0.5">
                        <button
                          type="button"
                          aria-label={`${layer.visible ? "Hide" : "Show"} ${layer.name}`}
                          aria-pressed={layer.visible}
                          title={`${layer.visible ? "Hide" : "Show"} layer`}
                          onClick={() => onToggleVisibility(layer.id)}
                          className={iconButtonClass}
                        >
                          {layer.visible ? <Eye size={15} aria-hidden="true" /> : <EyeOff size={15} aria-hidden="true" />}
                        </button>
                        <div className="flex min-w-0 flex-1 items-center gap-1">
                          <button
                            type="button"
                            aria-label={`Select ${layer.name}`}
                            aria-pressed={isSelected && selectedTarget === "artwork"}
                            onClick={() => onSelectLayer(layer.id, "artwork")}
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded outline-none focus-visible:ring-2 focus-visible:ring-[#3986c6] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 ${isSelected && selectedTarget === "artwork" ? "text-[#2474b5] dark:text-[#86c5ff]" : "text-text-secondary"}`}
                          >
                          <span
                            aria-hidden="true"
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-border-light bg-white text-[10px] font-semibold text-slate-700"
                            style={{ backgroundImage: "linear-gradient(45deg,#e5e7eb 25%,transparent 25%),linear-gradient(-45deg,#e5e7eb 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e5e7eb 75%),linear-gradient(-45deg,transparent 75%,#e5e7eb 75%)", backgroundSize: "8px 8px", backgroundPosition: "0 0,0 4px,4px -4px,-4px 0" }}
                          >
                            <SquareDashed size={14} aria-hidden="true" />
                          </span>
                          </button>
                          {renamingLayerId === layer.id ? (
                            <input
                              ref={renameInputRef}
                              aria-label={`Rename ${layer.name}`}
                              value={renameValue}
                              onChange={(event) => setRenameValue(event.target.value)}
                              onBlur={finishRename}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") event.currentTarget.blur();
                                if (event.key === "Escape") setRenamingLayerId(null);
                              }}
                              className="min-w-0 w-full rounded border border-border bg-bg px-1.5 py-1 text-xs text-text-primary outline-none focus:border-accent"
                            />
                          ) : (
                            <button
                              type="button"
                              aria-label={`Select ${layer.name} artwork`}
                              aria-pressed={isSelected && selectedTarget === "artwork"}
                              onClick={() => onSelectLayer(layer.id, "artwork")}
                              onDoubleClick={() => beginRename(layer)}
                            className={`h-9 min-w-0 flex-1 truncate rounded px-1 text-left text-xs outline-none focus-visible:ring-2 focus-visible:ring-[#3986c6] [@media(pointer:coarse)]:h-11 ${isSelected && selectedTarget === "artwork" ? "font-semibold text-[#171717] dark:text-white" : "text-text-secondary"}`}
                            >
                              {layer.name}
                            </button>
                          )}
                        </div>
                        {layer.mask !== null && (
                          <button
                            type="button"
                            aria-label={`${isMaskSelected ? "Stop editing" : "Select"} ${layer.name} mask`}
                            aria-pressed={isMaskSelected}
                            title="Select layer mask for editing"
                            onClick={() => onSelectLayer(layer.id, isMaskSelected ? "artwork" : "mask")}
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded border text-[10px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 ${isMaskSelected ? "border-accent bg-accent/10 text-accent" : "border-border-light bg-white text-slate-700"}`}
                          >
                            M
                          </button>
                        )}
                        <button
                          type="button"
                          aria-label={`${layer.locked ? "Unlock" : "Lock"} ${layer.name}`}
                          aria-pressed={layer.locked}
                          title={`${layer.locked ? "Unlock" : "Lock"} layer drawing`}
                          onClick={() => onToggleLock(layer.id)}
                          className={iconButtonClass}
                        >
                          {layer.locked ? <LockKeyhole size={14} aria-hidden="true" /> : <UnlockKeyhole size={14} aria-hidden="true" />}
                        </button>
                      </div>

                      <div className="mt-0.5 flex flex-wrap items-center justify-end gap-0.5">
                        <button type="button" aria-label={`Move ${layer.name} up`} title="Move layer up" disabled={index === 0} onClick={() => onMoveLayer(layer.id, -1)} className={iconButtonClass}>
                          <ArrowUp size={14} aria-hidden="true" />
                        </button>
                        <button type="button" aria-label={`Move ${layer.name} down`} title="Move layer down" disabled={index === layers.length - 1} onClick={() => onMoveLayer(layer.id, 1)} className={iconButtonClass}>
                          <ArrowDown size={14} aria-hidden="true" />
                        </button>
                        <button type="button" aria-label={`Rename ${layer.name}`} title="Rename layer" onClick={() => beginRename(layer)} className={iconButtonClass}>
                          <span aria-hidden="true" className="text-xs font-semibold">Aa</span>
                        </button>
                        <button type="button" aria-label={`Duplicate ${layer.name}`} title="Duplicate layer" onClick={() => onDuplicateLayer(layer.id)} className={iconButtonClass}>
                          <Copy size={14} aria-hidden="true" />
                        </button>
                        <button type="button" aria-label={layer.mask === null ? `Add mask to ${layer.name}` : `Delete ${layer.name} mask`} title={layer.mask === null ? "Add layer mask" : "Delete layer mask"} onClick={() => layer.mask === null ? onAddMask(layer.id) : onRemoveMask(layer.id)} className={iconButtonClass}>
                          {layer.mask === null ? <span aria-hidden="true" className="text-[10px] font-bold">M+</span> : <span aria-hidden="true" className="text-[10px] font-bold">M−</span>}
                        </button>
                        <button type="button" aria-label={`Delete ${layer.name}`} title="Delete layer" onClick={() => onDeleteLayer(layer.id)} className={`${iconButtonClass} hover:text-red-500`}>
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {selectedLayer && (
            <section aria-label={`Properties for ${selectedLayer.name}`} className="shrink-0 border-t border-border px-3 py-3">
              <div className="mb-3 flex items-center gap-2">
                <Blend size={14} aria-hidden="true" className="text-text-muted" />
                <label htmlFor="editor-layer-blend-mode" className="min-w-0 flex-1 text-xs text-text-secondary">Blend mode</label>
                <select
                  id="editor-layer-blend-mode"
                  aria-label={`Blend mode for ${selectedLayer.name}`}
                  value={selectedLayer.blendMode}
                  disabled={selectedLayer.locked}
                  onChange={(event) => onUpdateLayer(selectedLayer.id, { blendMode: event.target.value as EditorLayerBlendMode })}
                  className="h-9 max-w-28 rounded border border-border bg-bg px-2 text-xs text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-11"
                >
                  {BLEND_MODES.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
                </select>
              </div>
              <label htmlFor="editor-layer-opacity" className="mb-1 flex items-center justify-between text-xs text-text-secondary">
                <span>Opacity</span><span>{selectedLayer.opacity}%</span>
              </label>
              <input
                id="editor-layer-opacity"
                aria-label={`Opacity for ${selectedLayer.name}`}
                type="range"
                min="0"
                max="100"
                step="1"
                value={selectedLayer.opacity}
                disabled={selectedLayer.locked}
                onChange={(event) => onUpdateLayer(selectedLayer.id, { opacity: Number(event.target.value) })}
                className="h-8 w-full accent-accent [@media(pointer:coarse)]:h-11"
              />
              {selectedTarget === "mask" && selectedLayer.mask !== null && (
                <div aria-label="Layer mask painting controls" className="mt-2 border-t border-border pt-2">
                  <p className="mb-2 text-[11px] font-medium text-text-secondary">Painting on layer mask</p>
                  <div className="flex gap-2">
                    <button type="button" aria-label="Hide artwork with mask" aria-pressed={maskBrushMode === "hide"} onClick={() => onMaskBrushModeChange("hide")} className={`min-h-11 flex-1 rounded border px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-accent ${maskBrushMode === "hide" ? "border-accent bg-accent/10 text-accent" : "border-border text-text-secondary"}`}>Hide (black)</button>
                    <button type="button" aria-label="Reveal artwork with mask" aria-pressed={maskBrushMode === "reveal"} onClick={() => onMaskBrushModeChange("reveal")} className={`min-h-11 flex-1 rounded border px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-accent ${maskBrushMode === "reveal" ? "border-accent bg-accent/10 text-accent" : "border-border text-text-secondary"}`}>Reveal (white)</button>
                  </div>
                  <p className="mt-2 text-[11px] leading-4 text-text-muted">Draw on the print canvas to hide or restore this layer without deleting its artwork.</p>
                </div>
              )}
              <p className="mt-2 text-[10px] leading-4 text-text-muted">Layer changes update the print artwork and its Front/Back previews. Masks currently edit vector artwork, not pixel selections.</p>
            </section>
          )}
        </aside>
      )}
      <button
        type="button"
        aria-label={open ? "Collapse Layers panel" : "Expand Layers panel"}
        aria-expanded={open}
        onClick={onToggle}
        className="absolute top-2 z-40 flex h-11 w-10 items-center justify-center rounded-l-md border border-border border-r-0 bg-bg-surface text-text-secondary shadow-md outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent"
        style={{ right: open ? PANEL_WIDTH : 0 }}
      >
        {open ? <ChevronRight size={17} aria-hidden="true" /> : <ChevronLeft size={17} aria-hidden="true" />}
      </button>
    </>
  );
}
