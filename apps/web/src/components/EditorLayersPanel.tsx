"use client";

import {
  ArrowDown,
  ArrowUp,
  Blend,
  Circle,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  FolderPlus,
  Image as ImageIcon,
  Link2,
  LockKeyhole,
  Menu,
  MoreHorizontal,
  Move,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Square,
  SquareDashed,
  Trash2,
  Type,
  UnlockKeyhole,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type {
  ArtworkStroke,
  EditorArtworkLayer,
  EditorLayerBlendMode,
  LayerEditTarget,
  MaskBrushMode,
} from "@/lib/editor-layers";

const PANEL_WIDTH = "min(16rem, 86vw)";
const TINY_ICON = "flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-text-secondary outline-none hover:bg-[#d1d1d1] hover:text-[#111] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-1 focus-visible:ring-[#438bc4] dark:hover:bg-[#494949] dark:hover:text-white [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)_and_(max-height:500px)]:h-8 [@media(pointer:coarse)_and_(max-height:500px)]:w-8";
const BLEND_MODES: { value: EditorLayerBlendMode; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "multiply", label: "Multiply" },
  { value: "screen", label: "Screen" },
  { value: "overlay", label: "Overlay" },
];

type LayerUpdate = Partial<Pick<EditorArtworkLayer, "opacity" | "blendMode">>;

function strokePath(stroke: ArtworkStroke) {
  return stroke.points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function ArtworkThumbnail({ layer }: { layer: EditorArtworkLayer }) {
  return (
    <span
      aria-hidden="true"
      className="relative block h-7 w-10 shrink-0 overflow-hidden border border-[#858585] bg-white"
      style={{ backgroundImage: "linear-gradient(45deg,#d2d2d2 25%,transparent 25%),linear-gradient(-45deg,#d2d2d2 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#d2d2d2 75%),linear-gradient(-45deg,transparent 75%,#d2d2d2 75%)", backgroundSize: "8px 8px", backgroundPosition: "0 0,0 4px,4px -4px,-4px 0" }}
    >
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 1200" preserveAspectRatio="xMidYMid meet">
        {layer.strokes.map((stroke, index) => (
          <path key={index} d={strokePath(stroke)} fill="none" stroke="#242424" strokeWidth="46" strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </svg>
    </span>
  );
}

function MaskThumbnail({ layer }: { layer: EditorArtworkLayer }) {
  return (
    <span aria-hidden="true" className="relative block h-7 w-9 shrink-0 overflow-hidden border border-[#858585] bg-white">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 1200" preserveAspectRatio="xMidYMid meet">
        {layer.mask?.map((stroke, index) => (
          <path key={index} d={strokePath(stroke)} fill="none" stroke={stroke.mode === "hide" ? "#181818" : "#ffffff"} strokeWidth="54" strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </svg>
    </span>
  );
}

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
  const [menuLayerId, setMenuLayerId] = useState<string | null>(null);
  const [panelMenuOpen, setPanelMenuOpen] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const selectedLayer = layers.find((layer) => layer.id === selectedLayerId) ?? null;

  useEffect(() => {
    if (renamingLayerId) renameInputRef.current?.focus();
  }, [renamingLayerId]);

  function beginRename(layer: EditorArtworkLayer) {
    setRenameValue(layer.name);
    setRenamingLayerId(layer.id);
    setMenuLayerId(null);
  }

  function finishRename() {
    if (renamingLayerId) onRenameLayer(renamingLayerId, renameValue);
    setRenamingLayerId(null);
  }

  function addOrSelectMask() {
    if (!selectedLayer) return;
    if (selectedLayer.mask === null) onAddMask(selectedLayer.id);
    else onSelectLayer(selectedLayer.id, selectedTarget === "mask" ? "artwork" : "mask");
  }

  return (
    <>
      {open && (
        <aside
          aria-label="Layers panel"
          data-dock-side="right"
          className="absolute inset-y-0 right-0 z-30 flex min-h-0 flex-col overflow-hidden border-l border-[#b7b7b7] bg-[#e8e8e8] text-[#202020] shadow-xl dark:border-[#1b1b1b] dark:bg-[#303030] dark:text-[#dedede] dark:shadow-black/60"
          style={{ width: PANEL_WIDTH }}
        >
          <div role="tablist" aria-label="Panel tabs" className="flex h-8 shrink-0 items-stretch border-b border-[#b7b7b7] bg-[#d3d3d3] px-1 dark:border-[#202020] dark:bg-[#242424] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)_and_(max-height:500px)]:h-8">
            <button role="tab" aria-selected="true" className="relative min-w-0 border-r border-[#b7b7b7] bg-[#e8e8e8] px-2.5 text-[11px] font-semibold text-[#202020] dark:border-[#202020] dark:bg-[#303030] dark:text-white [@media(pointer:coarse)]:px-3">
              <span role="heading" aria-level={2} className="text-[11px] font-semibold">Layers</span>
              <span className="absolute inset-x-0 bottom-0 h-[2px] bg-[#78b7e8]" />
            </button>
            <button role="tab" aria-selected="false" aria-disabled="true" disabled className="border-r border-[#b7b7b7] px-2 text-[11px] text-[#505050] disabled:opacity-70 dark:border-[#202020] dark:text-[#b5b5b5] [@media(pointer:coarse)]:px-3">Channels</button>
            <button role="tab" aria-selected="false" aria-disabled="true" disabled className="px-2 text-[11px] text-[#505050] disabled:opacity-70 dark:text-[#b5b5b5] [@media(pointer:coarse)]:px-3">Paths</button>
            <span aria-label="Layer count" className="sr-only">{layers.length}</span>
            <button type="button" aria-label="Layers panel menu" aria-expanded={panelMenuOpen} onClick={() => setPanelMenuOpen((value) => !value)} className={`${TINY_ICON} ml-auto`}>
              <Menu size={15} aria-hidden="true" />
            </button>
            {panelMenuOpen && (
              <div role="menu" aria-label="Layers panel menu" className="absolute right-1 top-8 z-50 min-w-36 border border-[#999] bg-[#e8e8e8] py-1 text-[11px] text-[#202020] shadow-xl dark:border-[#1f1f1f] dark:bg-[#242424] dark:text-white">
                <button type="button" role="menuitem" aria-label="Add layer" onClick={() => { onAddLayer(); setPanelMenuOpen(false); }} className="flex min-h-7 w-full items-center gap-2 px-2 text-left hover:bg-[#d4d4d4] dark:hover:bg-[#464646] [@media(pointer:coarse)]:min-h-11">
                  <Plus size={13} aria-hidden="true" /> New Layer
                </button>
              </div>
            )}
          </div>

          <div aria-label="Layer kind filters" className="flex h-8 shrink-0 items-center gap-1 border-b border-[#b7b7b7] bg-[#dedede] px-1.5 dark:border-[#242424] dark:bg-[#2c2c2c] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)_and_(max-height:500px)]:hidden">
            <button type="button" disabled aria-label="Layer kind filter" title="Layer-kind filtering is not available yet" className="flex h-6 min-w-0 flex-1 cursor-not-allowed items-center gap-1 border border-[#a0a0a0] bg-[#f3f3f3] px-1.5 text-[11px] text-[#666] opacity-60 dark:border-[#1d1d1d] dark:bg-[#202020] dark:text-[#b0b0b0] [@media(pointer:coarse)]:h-9 [@media(pointer:coarse)_and_(max-height:500px)]:h-6">
              <ImageIcon size={12} aria-hidden="true" />
              <span className="flex-1">Kind</span>
              <ChevronRight size={12} aria-hidden="true" className="rotate-90" />
            </button>
            {[ImageIcon, Circle, Type, Square, Move].map((Icon, index) => (
              <button key={index} type="button" disabled aria-label={`Layer kind filter ${index + 1}`} title="Layer-kind filtering is not available yet" className={`${TINY_ICON} [@media(pointer:coarse)]:hidden`}>
                <Icon size={13} aria-hidden="true" />
              </button>
            ))}
          </div>

          <div className="flex h-8 shrink-0 items-center gap-1 border-b border-[#b7b7b7] px-1.5 dark:border-[#242424] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)_and_(max-height:500px)]:h-8">
            <select
              id="editor-layer-blend-mode"
              aria-label={selectedLayer ? `Blend mode for ${selectedLayer.name}` : "Blend mode"}
              value={selectedLayer?.blendMode ?? "normal"}
              disabled={!selectedLayer || selectedLayer.locked}
              onChange={(event) => selectedLayer && onUpdateLayer(selectedLayer.id, { blendMode: event.target.value as EditorLayerBlendMode })}
              className="h-6 min-w-0 flex-1 border border-[#a0a0a0] bg-[#f7f7f7] px-1 text-[11px] text-[#202020] outline-none focus-visible:ring-1 focus-visible:ring-[#69aee2] disabled:opacity-60 dark:border-[#1d1d1d] dark:bg-[#202020] dark:text-white [@media(pointer:coarse)]:h-9 [@media(pointer:coarse)_and_(max-height:500px)]:h-6"
            >
              {BLEND_MODES.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
            </select>
            <label htmlFor="editor-layer-opacity" className="text-[10px] text-[#343434] dark:text-[#d0d0d0]">Opacity:</label>
            <div className="flex h-6 w-[4.5rem] shrink-0 items-center border border-[#a0a0a0] bg-[#f7f7f7] px-1 dark:border-[#1d1d1d] dark:bg-[#202020] [@media(pointer:coarse)]:h-9 [@media(pointer:coarse)_and_(max-height:500px)]:h-6">
              <input
                id="editor-layer-opacity"
                aria-label={selectedLayer ? `Opacity for ${selectedLayer.name}` : "Opacity"}
                type="number"
                min="0"
                max="100"
                step="1"
                value={selectedLayer?.opacity ?? 100}
                disabled={!selectedLayer || selectedLayer.locked}
                onChange={(event) => selectedLayer && onUpdateLayer(selectedLayer.id, { opacity: Number(event.target.value) })}
                className="min-w-0 w-full appearance-none bg-transparent text-[11px] text-[#202020] outline-none disabled:opacity-60 dark:text-white"
              />
              <span className="text-[10px] text-[#555] dark:text-[#bdbdbd]">%</span>
            </div>
          </div>

          <div className="flex h-8 shrink-0 items-center gap-1 border-b border-[#b7b7b7] bg-[#dedede] px-1.5 dark:border-[#242424] dark:bg-[#2c2c2c] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)_and_(max-height:500px)]:h-8">
            <span className="mr-0.5 text-[10px] text-[#343434] dark:text-[#d0d0d0]">Lock:</span>
            <button type="button" aria-label={selectedLayer ? `${selectedLayer.locked ? "Unlock" : "Lock"} ${selectedLayer.name}` : "Lock layer"} aria-pressed={selectedLayer?.locked ?? false} disabled={!selectedLayer} onClick={() => selectedLayer && onToggleLock(selectedLayer.id)} className={TINY_ICON}>
              {selectedLayer?.locked ? <LockKeyhole size={13} aria-hidden="true" /> : <UnlockKeyhole size={13} aria-hidden="true" />}
            </button>
            <button type="button" disabled aria-label="Lock transparent pixels" title="Pixel transparency lock is not available yet" className={`${TINY_ICON} [@media(pointer:coarse)]:hidden`}><Square size={13} aria-hidden="true" /></button>
            <button type="button" disabled aria-label="Lock image pixels" title="Pixel lock is not available yet" className={`${TINY_ICON} [@media(pointer:coarse)]:hidden`}><Blend size={13} aria-hidden="true" /></button>
            <button type="button" disabled aria-label="Lock layer position" title="Position lock is not available yet" className={`${TINY_ICON} [@media(pointer:coarse)]:hidden`}><Move size={13} aria-hidden="true" /></button>
            <span className="ml-auto text-[10px] text-[#343434] dark:text-[#d0d0d0]">Fill:</span>
            <button type="button" disabled aria-label="Fill 100 percent" title="Fill adjustment is not available yet" className="flex h-6 w-12 cursor-not-allowed items-center border border-[#a0a0a0] bg-[#f7f7f7] px-1 text-[10px] text-[#666] opacity-60 dark:border-[#1d1d1d] dark:bg-[#202020] dark:text-[#a0a0a0] [@media(pointer:coarse)]:h-9 [@media(pointer:coarse)_and_(max-height:500px)]:h-6">100% <ChevronRight size={10} aria-hidden="true" className="ml-auto rotate-90" /></button>
          </div>

          <div aria-label="Layer list" role="list" className="min-h-0 flex-1 overflow-y-auto bg-[#f1f1f1] dark:bg-[#333333]">
            {layers.length === 0 ? (
              <div className="flex min-h-20 items-center justify-center px-3 text-center text-[11px] text-[#b9b9b9]">No layers yet. Use the new-layer button below.</div>
            ) : layers.map((layer, index) => {
              const isSelected = layer.id === selectedLayerId;
              const isMaskSelected = isSelected && selectedTarget === "mask";
                const rowClass = `relative flex min-h-9 items-center gap-1 border-b border-[#c9c9c9] px-1 dark:border-[#292929] ${isSelected ? "bg-[#d2e5f8] dark:bg-[#4b5661]" : "bg-[#f1f1f1] hover:bg-[#e5e5e5] dark:bg-[#353535] dark:hover:bg-[#404040]"} [@media(pointer:coarse)]:min-h-11`;
              return (
                <div key={layer.id} role="listitem" data-layer-id={layer.id} className={rowClass}>
                  <button type="button" aria-label={`${layer.visible ? "Hide" : "Show"} ${layer.name}`} aria-pressed={layer.visible} onClick={() => onToggleVisibility(layer.id)} className={`${TINY_ICON} h-7 w-7 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)_and_(max-height:500px)]:h-8 [@media(pointer:coarse)_and_(max-height:500px)]:w-8`}>
                    {layer.visible ? <Eye size={13} aria-hidden="true" /> : <EyeOff size={13} aria-hidden="true" />}
                  </button>
                  <button type="button" aria-label={`Select ${layer.name}`} aria-pressed={isSelected && selectedTarget === "artwork"} onClick={() => onSelectLayer(layer.id, "artwork")} onDoubleClick={() => beginRename(layer)} className={`flex h-8 w-11 shrink-0 items-center justify-center border ${isSelected && selectedTarget === "artwork" ? "border-[#91c7f0]" : "border-[#777]"} [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)_and_(max-height:500px)]:h-8 [@media(pointer:coarse)_and_(max-height:500px)]:w-11`}>
                    <ArtworkThumbnail layer={layer} />
                  </button>
                  {layer.mask !== null && (
                    <>
                      <Link2 size={10} aria-hidden="true" className="shrink-0 text-[#bdbdbd]" />
                      <button type="button" aria-label={`${isMaskSelected ? "Stop editing" : "Select"} ${layer.name} mask`} aria-pressed={isMaskSelected} onClick={() => onSelectLayer(layer.id, isMaskSelected ? "artwork" : "mask")} className={`flex h-8 w-10 shrink-0 items-center justify-center border [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)_and_(max-height:500px)]:h-8 [@media(pointer:coarse)_and_(max-height:500px)]:w-11 ${isMaskSelected ? "border-[#91c7f0] ring-1 ring-[#91c7f0]" : "border-[#777]"}`}>
                        <MaskThumbnail layer={layer} />
                      </button>
                    </>
                  )}
                  {renamingLayerId === layer.id ? (
                    <input ref={renameInputRef} aria-label={`Rename ${layer.name}`} value={renameValue} onChange={(event) => setRenameValue(event.target.value)} onBlur={finishRename} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") setRenamingLayerId(null); }} className="min-w-0 flex-1 bg-[#232323] px-1 py-1 text-[11px] text-white outline-none" />
                  ) : (
                    <button type="button" aria-label={`Select ${layer.name} artwork`} aria-pressed={isSelected && selectedTarget === "artwork"} onClick={() => onSelectLayer(layer.id, "artwork")} onDoubleClick={() => beginRename(layer)} className="min-w-0 flex-1 truncate px-0.5 text-left text-[11px] text-[#202020] dark:text-[#eeeeee]">
                      {layer.name}
                    </button>
                  )}
                  {layer.locked && <LockKeyhole size={12} aria-label={`${layer.name} locked`} className="shrink-0 text-[#d1d1d1]" />}
                  <button type="button" aria-label={`Layer options for ${layer.name}`} aria-haspopup="menu" aria-expanded={menuLayerId === layer.id} onClick={() => setMenuLayerId((current) => current === layer.id ? null : layer.id)} className={`${TINY_ICON} h-7 w-6 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)_and_(max-height:500px)]:h-8 [@media(pointer:coarse)_and_(max-height:500px)]:w-8`}>
                    <MoreHorizontal size={14} aria-hidden="true" />
                  </button>
                  {menuLayerId === layer.id && (
                    <div role="menu" aria-label={`Layer menu for ${layer.name}`} className="absolute right-1 top-8 z-40 min-w-36 border border-[#999] bg-[#e8e8e8] py-1 text-[11px] text-[#202020] shadow-xl dark:border-[#1f1f1f] dark:bg-[#242424] dark:text-white">
                      <button type="button" role="menuitem" aria-label={`Rename ${layer.name}`} onClick={() => beginRename(layer)} className="flex min-h-7 w-full items-center gap-2 px-2 text-left hover:bg-[#d1d1d1] dark:hover:bg-[#464646] [@media(pointer:coarse)]:min-h-11">Rename</button>
                      <button type="button" role="menuitem" aria-label={`Move ${layer.name} up`} disabled={index === 0} onClick={() => { onMoveLayer(layer.id, -1); setMenuLayerId(null); }} className="flex min-h-7 w-full items-center gap-2 px-2 text-left hover:bg-[#d1d1d1] disabled:opacity-40 dark:hover:bg-[#464646] [@media(pointer:coarse)]:min-h-11"><ArrowUp size={12} aria-hidden="true" /> Move Up</button>
                      <button type="button" role="menuitem" aria-label={`Move ${layer.name} down`} disabled={index === layers.length - 1} onClick={() => { onMoveLayer(layer.id, 1); setMenuLayerId(null); }} className="flex min-h-7 w-full items-center gap-2 px-2 text-left hover:bg-[#d1d1d1] disabled:opacity-40 dark:hover:bg-[#464646] [@media(pointer:coarse)]:min-h-11"><ArrowDown size={12} aria-hidden="true" /> Move Down</button>
                      <button type="button" role="menuitem" aria-label={`Duplicate ${layer.name}`} onClick={() => { onDuplicateLayer(layer.id); setMenuLayerId(null); }} className="flex min-h-7 w-full items-center gap-2 px-2 text-left hover:bg-[#d1d1d1] dark:hover:bg-[#464646] [@media(pointer:coarse)]:min-h-11"><Copy size={12} aria-hidden="true" /> Duplicate</button>
                      <button type="button" role="menuitem" aria-label={layer.mask === null ? `Add mask to ${layer.name}` : `Delete ${layer.name} mask`} onClick={() => { if (layer.mask === null) onAddMask(layer.id); else onRemoveMask(layer.id); setMenuLayerId(null); }} className="flex min-h-7 w-full items-center gap-2 px-2 text-left hover:bg-[#d1d1d1] dark:hover:bg-[#464646] [@media(pointer:coarse)]:min-h-11"><SquareDashed size={12} aria-hidden="true" /> {layer.mask === null ? "Add Layer Mask" : "Delete Layer Mask"}</button>
                      <button type="button" role="menuitem" aria-label={`Delete ${layer.name}`} onClick={() => { onDeleteLayer(layer.id); setMenuLayerId(null); }} className="flex min-h-7 w-full items-center gap-2 px-2 text-left text-red-700 hover:bg-[#d1d1d1] dark:text-red-300 dark:hover:bg-[#464646] [@media(pointer:coarse)]:min-h-11"><Trash2 size={12} aria-hidden="true" /> Delete</button>
                    </div>
                  )}
                </div>
              );
            })}
            {selectedLayer && selectedTarget === "mask" && selectedLayer.mask !== null && (
              <div aria-label="Layer mask painting controls" className="border-t border-[#b7b7b7] bg-[#dedede] p-1.5 dark:border-[#242424] dark:bg-[#303030]">
                <div className="mb-1 text-[10px] text-[#444] dark:text-[#c6c6c6]">Mask: black hides · white reveals</div>
                <div className="flex gap-1">
                  <button type="button" aria-label="Hide artwork with mask" aria-pressed={maskBrushMode === "hide"} onClick={() => onMaskBrushModeChange("hide")} className={`min-h-7 flex-1 border px-1 text-[10px] [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)_and_(max-height:500px)]:min-h-7 ${maskBrushMode === "hide" ? "border-[#79b7e6] bg-[#4e6374] text-white" : "border-[#999] text-[#333] dark:border-[#555] dark:text-[#ddd]"}`}>Hide (black)</button>
                  <button type="button" aria-label="Reveal artwork with mask" aria-pressed={maskBrushMode === "reveal"} onClick={() => onMaskBrushModeChange("reveal")} className={`min-h-7 flex-1 border px-1 text-[10px] [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)_and_(max-height:500px)]:min-h-7 ${maskBrushMode === "reveal" ? "border-[#79b7e6] bg-[#4e6374] text-white" : "border-[#999] text-[#333] dark:border-[#555] dark:text-[#ddd]"}`}>Reveal (white)</button>
                </div>
              </div>
            )}
          </div>

          {selectedLayer && (
            <div className="sr-only" aria-label={`Properties for ${selectedLayer.name}`}>
              {selectedLayer.blendMode} {selectedLayer.opacity}%
            </div>
          )}

          <div aria-label="Layer actions" className="flex h-8 shrink-0 items-center justify-around border-t border-[#b7b7b7] bg-[#dedede] px-0.5 dark:border-[#1e1e1e] dark:bg-[#292929] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)_and_(max-height:500px)]:h-8">
            <button type="button" disabled aria-label="Link layers" title="Link layers is not available yet" className={`${TINY_ICON} [@media(pointer:coarse)]:hidden`}><Link2 size={13} aria-hidden="true" /></button>
            <button type="button" disabled aria-label="Layer effects" title="Layer effects are not available yet" className={`${TINY_ICON} [@media(pointer:coarse)]:hidden`}><Sparkles size={13} aria-hidden="true" /></button>
            <button type="button" aria-label={selectedLayer ? (selectedLayer.mask === null ? `Add mask to ${selectedLayer.name}` : `Select ${selectedLayer.name} mask`) : "Add layer mask"} title="Add or select layer mask" disabled={!selectedLayer} onClick={addOrSelectMask} className={TINY_ICON}><SquareDashed size={13} aria-hidden="true" /></button>
            <button type="button" disabled aria-label="Create adjustment layer" title="Adjustment layers are not available yet" className={`${TINY_ICON} [@media(pointer:coarse)]:hidden`}><SlidersHorizontal size={13} aria-hidden="true" /></button>
            <button type="button" disabled aria-label="New group" title="Layer groups are not available yet" className={`${TINY_ICON} [@media(pointer:coarse)]:hidden`}><FolderPlus size={13} aria-hidden="true" /></button>
            <button type="button" aria-label="Add layer" title="Create new layer" onClick={onAddLayer} className={TINY_ICON}><Plus size={14} aria-hidden="true" /></button>
            <button type="button" aria-label="Delete selected layer" title="Delete selected layer" disabled={!selectedLayer} onClick={() => selectedLayer && onDeleteLayer(selectedLayer.id)} className={TINY_ICON}><Trash2 size={13} aria-hidden="true" /></button>
          </div>
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
