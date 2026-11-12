"use client";

import {
  Upload,
  Shapes,
  Type,
  Wand2,
  Sparkles,
  Move,
  SquareDashed,
  Lasso,
  Pipette,
  Square,
  PenTool,
  Blend,
  Eraser,
  Hand,
  ZoomIn,
  MousePointer2,
  Stamp,
  Ruler,
  RotateCw,
} from "lucide-react";

export type PanelId = "upload" | "elements" | "text" | "effects" | "ai";
export type ToolId =
  | "move"
  | "marquee"
  | "lasso"
  | "eyedropper"
  | "shape"
  | "pen"
  | "path-select"
  | "magic-wand"
  | "clone-stamp"
  | "gradient"
  | "eraser"
  | "ruler"
  | "rotate-view"
  | "hand"
  | "zoom";

const PANELS: { id: PanelId; label: string; Icon: React.ElementType }[] = [
  { id: "upload", label: "Upload", Icon: Upload },
  { id: "elements", label: "Elements", Icon: Shapes },
  { id: "text", label: "Text", Icon: Type },
  { id: "effects", label: "Effects", Icon: Wand2 },
  { id: "ai", label: "AI", Icon: Sparkles },
];

const TOOLS: { id: ToolId; label: string; Icon: React.ElementType }[] = [
  { id: "move", label: "Move", Icon: Move },
  { id: "marquee", label: "Marquee", Icon: SquareDashed },
  { id: "lasso", label: "Lasso", Icon: Lasso },
  { id: "magic-wand", label: "Magic Wand", Icon: Wand2 },
  { id: "eyedropper", label: "Eyedropper", Icon: Pipette },
  { id: "shape", label: "Shape", Icon: Square },
  { id: "pen", label: "Pen", Icon: PenTool },
  { id: "path-select", label: "Path Select", Icon: MousePointer2 },
  { id: "clone-stamp", label: "Clone Stamp", Icon: Stamp },
  { id: "gradient", label: "Gradient", Icon: Blend },
  { id: "eraser", label: "Eraser", Icon: Eraser },
  { id: "ruler", label: "Ruler", Icon: Ruler },
  { id: "rotate-view", label: "Rotate View", Icon: RotateCw },
  { id: "hand", label: "Hand", Icon: Hand },
  { id: "zoom", label: "Zoom", Icon: ZoomIn },
];

export default function EditorLeftRail({
  activePanel,
  onPanelChange,
  activeTool,
  onToolChange,
}: {
  activePanel: PanelId | null;
  onPanelChange: (id: PanelId | null) => void;
  activeTool: ToolId;
  onToolChange: (id: ToolId) => void;
}) {
  return (
    <div className="w-12 flex-shrink-0 overflow-y-auto rounded-xl border border-white/10 bg-[#202324] py-2 text-white sm:w-16 sm:gap-2.5 sm:py-3">
      {PANELS.map(({ id, label, Icon }) => {
        const active = activePanel === id;
        return (
          <button
            key={id}
            onClick={() => onPanelChange(active ? null : id)}
            title={label}
            className={`mx-1 flex w-[calc(100%-0.5rem)] flex-col items-center gap-1 rounded-lg py-2 text-[8px] transition-colors ${
              active
                ? "bg-accent text-accent-foreground shadow-sm"
                : "text-white/55 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon size={15} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}

      <div className="mx-2 my-2 border-t border-white/10" />

      {/* Photoshop-style tools palette — one tool active at a time */}
      {TOOLS.map(({ id, label, Icon }) => {
        const active = activeTool === id;
        return (
          <button
            key={id}
            onClick={() => onToolChange(id)}
            title={label}
            className={`mx-auto flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${
              active
                ? "bg-accent text-accent-foreground shadow-sm"
                : "text-white/60 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon size={14} />
          </button>
        );
      })}
    </div>
  );
}
