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
  FolderPlus,
  Link2,
  LockKeyhole,
  MoreHorizontal,
  Move,
  Plus,
  Sparkles,
  SlidersHorizontal,
  Square,
  SquareDashed,
  Trash2,
  UnlockKeyhole,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import EditorLayerPreview, { EDITOR_ARTWORK_VIEWBOX } from "@/components/EditorLayerPreview";
import { eraserDabPoints, resolveEditorShapeStyle, type ArtworkStroke, type EditorArtworkLayer, type EditorLayerBlendMode, type LayerEditTarget } from "@/lib/editor-layers";

const PANEL_WIDTH = "min(16rem, 86vw)";
const TINY_ICON = "flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-text-secondary outline-none hover:bg-[#d1d1d1] hover:text-[#111] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-1 focus-visible:ring-[#438bc4] dark:hover:bg-[#494949] dark:hover:text-white [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)_and_(max-height:500px)]:h-8 [@media(pointer:coarse)_and_(max-height:500px)]:w-8";
const BLEND_MODES: { value: EditorLayerBlendMode; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "multiply", label: "Multiply" },
  { value: "screen", label: "Screen" },
  { value: "overlay", label: "Overlay" },
];

type LayerUpdate = Partial<Pick<EditorArtworkLayer, "opacity" | "fillOpacity" | "blendMode">>;

function strokePath(stroke: ArtworkStroke) {
  return stroke.points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x * 1000} ${point.y * 1200}`).join(" ");
}

function ArtworkThumbnail({ layer }: { layer: EditorArtworkLayer }) {
  return (
    <span
      aria-hidden="true"
      className="relative block h-7 w-10 shrink-0 overflow-hidden border border-[#858585] bg-white"
      style={{ backgroundImage: "linear-gradient(45deg,#d2d2d2 25%,transparent 25%),linear-gradient(-45deg,#d2d2d2 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#d2d2d2 75%),linear-gradient(-45deg,transparent 75%,#d2d2d2 75%)", backgroundSize: "8px 8px", backgroundPosition: "0 0,0 4px,4px -4px,-4px 0" }}
    >
      <svg className="absolute inset-0 h-full w-full" viewBox={EDITOR_ARTWORK_VIEWBOX} preserveAspectRatio="xMidYMid meet">
        {layer.erasures.length > 0 && (
          <defs>
            <mask id={`thumb-erase-${layer.id.replace(/[^a-zA-Z0-9_-]/g, "")}`} x="0" y="0" width="1000" height="1200" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse">
              <rect x="0" y="0" width="1000" height="1200" fill="white" />
              {layer.erasures.map((erasure, index) => {
                const width = erasure.width ?? 120;
                const radius = width / 2;
                return eraserDabPoints(erasure).map((dab, dabIndex) => (
                  <circle key={`${index}-${dabIndex}`} cx={dab.x * 1000} cy={dab.y * 1200} r={radius} fill="#000" fillOpacity={(erasure.flow ?? 100) / 100} />
                ));
              })}
            </mask>
          </defs>
        )}
        <g mask={layer.erasures.length > 0 ? `url(#thumb-erase-${layer.id.replace(/[^a-zA-Z0-9_-]/g, "")})` : undefined}>
          {layer.strokes.map((stroke, index) => (
            <path key={index} d={strokePath(stroke)} fill="none" stroke="#242424" strokeWidth="46" strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {(layer.shape !== null || layer.text !== null || layer.image !== null) && (
            <EditorLayerPreview paths={layer.shape?.paths} shapeStyle={layer.shape ? resolveEditorShapeStyle(layer.shape) : null} text={layer.text} image={layer.image} />
          )}
        </g>
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
  selectedLayerIds,
  selectedTarget,
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
  onMoveLayerToIndex,
  onUpdateLayer,
  onGroupSelected,
  onUngroupSelected,
  onLinkSelected,
  onSelectGroup,
  onOpenAdjustments,
}: {
  open: boolean;
  onToggle: () => void;
  layers: EditorArtworkLayer[];
  selectedLayerId: string | null;
  selectedLayerIds: string[];
  selectedTarget: LayerEditTarget;
  onSelectLayer: (id: string, target: LayerEditTarget, multi?: boolean) => void;
  onAddLayer: () => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onAddMask: (id: string) => void;
  onRemoveMask: (id: string) => void;
  onRenameLayer: (id: string, name: string) => void;
  onDuplicateLayer: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onMoveLayer: (id: string, direction: -1 | 1) => void;
  onMoveLayerToIndex: (id: string, targetIndex: number) => void;
  onUpdateLayer: (id: string, update: LayerUpdate) => void;
  onGroupSelected: () => void;
  onUngroupSelected: () => void;
  onLinkSelected: () => void;
  onSelectGroup: (groupId: string) => void;
  onOpenAdjustments: () => void;
}) {
  const [renamingLayerId, setRenamingLayerId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [menuLayerId, setMenuLayerId] = useState<string | null>(null);
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
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
          <div aria-label="Layers panel title" className="relative flex h-8 shrink-0 items-center border-b border-[#b7b7b7] bg-[#d3d3d3] px-1 dark:border-[#202020] dark:bg-[#242424] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)_and_(max-height:500px)]:h-8">
            <span role="heading" aria-level={2} className="relative flex h-full items-center border-r border-[#b7b7b7] px-2.5 text-[11px] font-semibold text-[#202020] dark:border-[#202020] dark:text-white [@media(pointer:coarse)]:px-3">
              Layers
              <span className="absolute inset-x-0 bottom-0 h-[2px] bg-accent" />
            </span>
            <span aria-label="Layer count" className="sr-only">{layers.length}</span>
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
            <label htmlFor="editor-layer-fill" className="ml-auto text-[10px] text-[#343434] dark:text-[#d0d0d0]">Fill:</label>
            <div className="flex h-6 w-[4.5rem] shrink-0 items-center border border-[#a0a0a0] bg-[#f7f7f7] px-1 dark:border-[#1d1d1d] dark:bg-[#202020] [@media(pointer:coarse)]:h-9 [@media(pointer:coarse)_and_(max-height:500px)]:h-6">
              <input id="editor-layer-fill" aria-label={selectedLayer ? `Fill for ${selectedLayer.name}` : "Fill"} type="number" min="0" max="100" value={selectedLayer?.fillOpacity ?? 100} disabled={!selectedLayer || selectedLayer.locked} onChange={(event) => selectedLayer && onUpdateLayer(selectedLayer.id, { fillOpacity: Number(event.target.value) })} className="min-w-0 w-full bg-transparent text-[11px] text-[#202020] outline-none disabled:opacity-60 dark:text-white" />
              <span className="text-[10px] text-[#555] dark:text-[#bdbdbd]">%</span>
            </div>
          </div>

          <div aria-label="Layer list" role="list" className="min-h-0 flex-1 overflow-y-auto bg-[#f1f1f1] dark:bg-[#333333]">
            {layers.length === 0 ? (
              <div className="flex min-h-20 items-center justify-center px-3 text-center text-[11px] text-[#b9b9b9]">No layers yet. Use the new-layer button below.</div>
            ) : layers.map((layer, index) => {
              const firstGroupIndex = layer.groupId ? layers.findIndex((item) => item.groupId === layer.groupId) : -1;
              const isGroupHeader = layer.groupId !== null && firstGroupIndex === index;
              const isGroupCollapsed = layer.groupId ? collapsedGroups.has(layer.groupId) : false;
              if (isGroupCollapsed) return isGroupHeader ? (
                <div key={`group-${layer.groupId}`} role="listitem" className="flex min-h-8 items-center gap-1 border-b border-[#c9c9c9] bg-[#dedede] px-2 text-[10px] font-semibold dark:border-[#292929] dark:bg-[#2c2c2c] dark:text-white">
                  <button type="button" aria-label={`Expand group ${layer.groupId}`} onClick={() => setCollapsedGroups((current) => { const next = new Set(current); next.delete(layer.groupId!); return next; })} className={TINY_ICON}><ChevronRight size={13} /></button>
                  <button type="button" aria-label={`Select group ${layer.groupId}`} onClick={() => onSelectGroup(layer.groupId!)} className="flex min-w-0 flex-1 items-center gap-1 truncate text-left"><FolderPlus size={13} aria-hidden="true" /> Group</button>
                </div>
              ) : null;
              const isSelected = selectedLayerIds.includes(layer.id);
              const isMaskSelected = isSelected && selectedTarget === "mask";
                const rowClass = `relative flex min-h-9 items-center gap-1 border-b border-[#c9c9c9] px-1 dark:border-[#292929] ${isSelected ? "bg-[#d2e5f8] dark:bg-[#4b5661]" : "bg-[#f1f1f1] hover:bg-[#e5e5e5] dark:bg-[#353535] dark:hover:bg-[#404040]"} [@media(pointer:coarse)]:min-h-11`;
              return (
                <div key={layer.id} className="relative">
                  {isGroupHeader && (
                    <div className="flex h-7 items-center gap-1 border-b border-[#b7b7b7] bg-[#dedede] px-2 text-[10px] font-semibold dark:border-[#242424] dark:bg-[#2c2c2c] dark:text-white">
                      <button type="button" aria-label={`Collapse group ${layer.groupId}`} onClick={() => setCollapsedGroups((current) => new Set(current).add(layer.groupId!))} className={TINY_ICON}><ChevronLeft size={13} className="-rotate-90" /></button>
                      <button type="button" aria-label={`Select group ${layer.groupId}`} onClick={() => onSelectGroup(layer.groupId!)} className="flex min-w-0 flex-1 items-center gap-1 truncate text-left"><FolderPlus size={13} aria-hidden="true" /> Group</button>
                    </div>
                  )}
                  <div role="listitem" data-layer-id={layer.id} className={rowClass} draggable onDragStart={() => setDraggedLayerId(layer.id)} onDragEnd={() => setDraggedLayerId(null)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedLayerId && draggedLayerId !== layer.id) onMoveLayerToIndex(draggedLayerId, index); setDraggedLayerId(null); }}>
                  <button type="button" aria-label={`${layer.visible ? "Hide" : "Show"} ${layer.name}`} aria-pressed={layer.visible} onClick={() => onToggleVisibility(layer.id)} className={`${TINY_ICON} h-7 w-7 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)_and_(max-height:500px)]:h-8 [@media(pointer:coarse)_and_(max-height:500px)]:w-8`}>
                    {layer.visible ? <Eye size={13} aria-hidden="true" /> : <EyeOff size={13} aria-hidden="true" />}
                  </button>
                  <button type="button" aria-label={`Select ${layer.name}`} aria-pressed={isSelected && selectedTarget === "artwork"} onClick={(event) => onSelectLayer(layer.id, "artwork", event.shiftKey || event.ctrlKey || event.metaKey)} onDoubleClick={() => beginRename(layer)} className={`flex h-8 w-11 shrink-0 items-center justify-center border ${isSelected && selectedTarget === "artwork" ? "border-[#91c7f0]" : "border-[#777]"} [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)_and_(max-height:500px)]:h-8 [@media(pointer:coarse)_and_(max-height:500px)]:w-11`}>
                    <ArtworkThumbnail layer={layer} />
                  </button>
                  {layer.mask !== null && (
                    <>
                      <Link2 size={10} aria-hidden="true" className="shrink-0 text-[#bdbdbd]" />
                      <button type="button" aria-label={`${isMaskSelected ? "Stop editing" : "Select"} ${layer.name} mask`} aria-pressed={isMaskSelected} onClick={(event) => onSelectLayer(layer.id, isMaskSelected ? "artwork" : "mask", event.shiftKey || event.ctrlKey || event.metaKey)} className={`flex h-8 w-10 shrink-0 items-center justify-center border [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)_and_(max-height:500px)]:h-8 [@media(pointer:coarse)_and_(max-height:500px)]:w-11 ${isMaskSelected ? "border-[#91c7f0] ring-1 ring-[#91c7f0]" : "border-[#777]"}`}>
                        <MaskThumbnail layer={layer} />
                      </button>
                    </>
                  )}
                  {renamingLayerId === layer.id ? (
                    <input ref={renameInputRef} aria-label={`Rename ${layer.name}`} value={renameValue} onChange={(event) => setRenameValue(event.target.value)} onBlur={finishRename} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") setRenamingLayerId(null); }} className="min-w-0 flex-1 bg-[#232323] px-1 py-1 text-[11px] text-white outline-none" />
                  ) : (
                    <button type="button" aria-label={`Select ${layer.name} artwork`} aria-pressed={isSelected && selectedTarget === "artwork"} onClick={(event) => onSelectLayer(layer.id, "artwork", event.shiftKey || event.ctrlKey || event.metaKey)} onDoubleClick={() => beginRename(layer)} className="min-w-0 flex-1 truncate px-0.5 text-left text-[11px] text-[#202020] dark:text-[#eeeeee]">
                      {layer.groupId && <span className="mr-1 text-[9px] text-[#438bc4]">Group</span>}
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
                </div>
              );
            })}
          </div>

          {selectedLayer && (
            <div className="sr-only" aria-label={`Properties for ${selectedLayer.name}`}>
              {selectedLayer.blendMode} {selectedLayer.opacity}%
            </div>
          )}

          <div aria-label="Layer actions" className="flex h-8 shrink-0 items-center justify-around border-t border-[#b7b7b7] bg-[#dedede] px-0.5 dark:border-[#1e1e1e] dark:bg-[#292929] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)_and_(max-height:500px)]:h-8">
            <button type="button" aria-label="Open Adjustments panel" title="Open Adjustments" onClick={onOpenAdjustments} className={TINY_ICON}><SlidersHorizontal size={13} aria-hidden="true" /></button>
            <button type="button" disabled aria-label="Layer effects" title="Layer effects are not available yet" className={`${TINY_ICON} [@media(pointer:coarse)]:hidden`}><Sparkles size={13} aria-hidden="true" /></button>
            <button type="button" aria-label={selectedLayer ? (selectedLayer.mask === null ? `Add mask to ${selectedLayer.name}` : `Select ${selectedLayer.name} mask`) : "Add layer mask"} title="Add or select layer mask" disabled={!selectedLayer} onClick={addOrSelectMask} className={TINY_ICON}><SquareDashed size={13} aria-hidden="true" /></button>
            <button type="button" aria-label="Link layers" title="Link or unlink selected layers" disabled={selectedLayerIds.length < 2} onClick={onLinkSelected} className={`${TINY_ICON} [@media(pointer:coarse)]:hidden`}><Link2 size={13} aria-hidden="true" /></button>
            <button type="button" aria-label="Group selected layers" title="Group selected layers" disabled={selectedLayerIds.length < 2} onClick={onGroupSelected} className={`${TINY_ICON} [@media(pointer:coarse)]:hidden`}><FolderPlus size={13} aria-hidden="true" /></button>
            <button type="button" aria-label="Ungroup selected layers" title="Ungroup selected layers" disabled={!selectedLayerIds.some((id) => layers.find((layer) => layer.id === id)?.groupId)} onClick={onUngroupSelected} className={`${TINY_ICON} [@media(pointer:coarse)]:hidden`}><FolderPlus size={13} aria-hidden="true" className="rotate-180" /></button>
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
        className="absolute top-2 z-40 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-md outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11"
        style={{ right: open ? PANEL_WIDTH : 0 }}
      >
        {open ? <ChevronRight size={17} aria-hidden="true" /> : <ChevronLeft size={17} aria-hidden="true" />}
      </button>
    </>
  );
}
