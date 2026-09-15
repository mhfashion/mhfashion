"use client";

import {
  Eye,
  EyeOff,
  Lock,
  LockOpen,
  SquarePlus,
  Copy,
  Layers2,
  SquareStack,
  Trash2,
} from "lucide-react";

export type EditorLayer = {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  /** Nested layers (groups) support recolor; flat layers are move-only. */
  isGroup: boolean;
};

const BLEND_MODES = [
  "Normal",
  "Multiply",
  "Screen",
  "Overlay",
  "Darken",
  "Lighten",
];

export default function LayersPanel({
  side,
  layers,
  selectedLayerId,
  onSelectLayer,
  onToggleVisible,
  onToggleLock,
}: {
  side: "Front" | "Back";
  layers: EditorLayer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string) => void;
  onToggleVisible: (id: string) => void;
  onToggleLock: (id: string) => void;
}) {
  return (
    <div className="w-52 flex-shrink-0 border-l border-border flex flex-col">
      <div className="p-2.5 flex-1 overflow-y-auto">
        {/* Layer Box is scoped to whichever canvas is focused */}
        <p className="text-[10px] text-text-muted mb-2">Layers · {side}</p>

        {/* Blend mode + opacity + flow, all on a single row */}
        <div className="flex gap-1.5 mb-2.5 text-[9px]">
          <select className="flex-[1.4] bg-bg-surface rounded-md px-1.5 py-1 outline-none">
            {BLEND_MODES.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <div className="flex-1 bg-bg-surface rounded-md px-1.5 py-1 text-center">
            Op 100%
          </div>
          <div className="flex-1 bg-bg-surface rounded-md px-1.5 py-1 text-center">
            Fl 100%
          </div>
        </div>

        <div className="flex flex-col gap-0.5">
          {layers.length === 0 && (
            <p className="text-[10px] text-text-faint text-center py-6">
              No layers yet
            </p>
          )}
          {layers.map((layer) => (
            <div
              key={layer.id}
              onClick={() => onSelectLayer(layer.id)}
              className={`flex items-center justify-between px-1.5 py-1.5 rounded-md cursor-pointer text-[11px] ${
                selectedLayerId === layer.id ? "bg-bg-surface" : ""
              }`}
            >
              <span className="flex items-center gap-1.5 truncate">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVisible(layer.id);
                  }}
                  aria-label="Toggle visibility"
                >
                  {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>
                <span className="truncate">{layer.name}</span>
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLock(layer.id);
                }}
                aria-label="Toggle lock"
              >
                {layer.locked ? <Lock size={12} /> : <LockOpen size={12} />}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border px-2.5 py-2 flex gap-2.5 text-text-secondary">
        <button title="New layer"><SquarePlus size={14} /></button>
        <button title="Duplicate"><Copy size={14} /></button>
        <button title="Merge"><Layers2 size={14} /></button>
        <button title="Clipping mask"><SquareStack size={14} /></button>
        <button title="Delete"><Trash2 size={14} /></button>
      </div>
    </div>
  );
}
