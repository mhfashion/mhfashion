"use client";

import {
  Blend,
  Brush,
  ChevronDown,
  ChevronUp,
  Eraser,
  Hand,
  Move,
  Pencil,
  PenTool,
  Redo2,
  RefreshCw,
  Square,
  Type,
  Undo2,
} from "lucide-react";
import { useRef } from "react";

export type EditorTool = "move" | "hand" | "pencil" | "pen" | "text" | "brush" | "eraser" | "shape" | "gradient" | "remove-bg";

type Props = {
  activeTool: EditorTool;
  collapsed: boolean;
  canUndo: boolean;
  canRedo: boolean;
  notice: string;
  foregroundColor: string;
  backgroundColor: string;
  onSelect: (tool: EditorTool) => void;
  onForegroundColorChange: (color: string) => void;
  onBackgroundColorChange: (color: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSwapColors: () => void;
  onToggleCollapsed: () => void;
  hideOnMobile?: boolean;
};

const tools = [
  { id: "move", label: "Move", Icon: Move },
  { id: "hand", label: "Hand tool", Icon: Hand },
  { id: "pencil", label: "Pencil tool", Icon: Pencil },
  { id: "pen", label: "Pen tool", Icon: PenTool },
  { id: "text", label: "Text tool", Icon: Type },
  { id: "brush", label: "Brush", Icon: Brush },
  { id: "eraser", label: "Eraser tool", Icon: Eraser },
  { id: "shape", label: "Shape tools", Icon: Square },
  { id: "gradient", label: "Gradient tool", Icon: Blend },
] as const;

export default function EditorToolsBar({
  activeTool,
  collapsed,
  canUndo,
  canRedo,
  notice,
  foregroundColor,
  backgroundColor,
  onSelect,
  onForegroundColorChange,
  onBackgroundColorChange,
  onUndo,
  onRedo,
  onSwapColors,
  onToggleCollapsed,
  hideOnMobile = false,
}: Props) {
  const foregroundInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={`pointer-events-none absolute inset-x-0 bottom-2 z-50 flex justify-center px-2 md:bottom-3 ${hideOnMobile ? "max-md:hidden" : ""}`} data-testid="editor-tools-positioner">
      <section
        aria-label="Editor tools"
        data-testid="editor-tools-bar"
        className="pointer-events-auto relative flex w-fit max-w-[calc(100vw-16px)] items-center gap-1 rounded-2xl border border-border bg-bg-surface/95 p-1.5 text-text-primary shadow-lg backdrop-blur"
      >
        {!collapsed && (
          <div className="flex max-w-full flex-wrap items-center justify-center gap-0.5">
            {tools.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                aria-label={label}
                aria-pressed={activeTool === id}
                title={id === "hand" ? "Hand tool" : label}
                onClick={() => onSelect(id)}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent ${activeTool === id ? "bg-accent text-accent-foreground shadow-[0_2px_8px_rgba(212,255,63,.35)]" : "text-text-secondary hover:bg-bg hover:text-text-primary"}`}
              >
                <Icon size={14} strokeWidth={1.9} aria-hidden="true" />
              </button>
            ))}
            <div role="group" aria-label="Color switch tool" title="Color switch tool" className="relative h-9 w-11 shrink-0">
              <input
                ref={foregroundInputRef}
                type="color"
                value={foregroundColor}
                onChange={(event) => onForegroundColorChange(event.target.value)}
                aria-hidden="true"
                tabIndex={-1}
                className="sr-only"
              />
              <input
                ref={backgroundInputRef}
                type="color"
                value={backgroundColor}
                onChange={(event) => onBackgroundColorChange(event.target.value)}
                aria-hidden="true"
                tabIndex={-1}
                className="sr-only"
              />
              <button
                type="button"
                aria-label="Background Color"
                title="Background Color"
                onClick={() => backgroundInputRef.current?.click()}
                className="absolute right-0 top-0 h-6 w-6 rounded border border-border shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-accent"
                style={{ backgroundColor }}
              />
              <button
                type="button"
                aria-label="Foreground Color"
                title="Foreground Color"
                onClick={() => foregroundInputRef.current?.click()}
                className="absolute bottom-0 left-0 z-10 h-6 w-6 rounded border border-border shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-accent"
                style={{ backgroundColor: foregroundColor }}
              />
              <button
                type="button"
                aria-label="Swap foreground and background colors"
                title="Swap foreground/background colors"
                onClick={onSwapColors}
                className="absolute -right-1 -bottom-1 z-20 flex h-4 w-4 items-center justify-center rounded-full border border-border bg-bg-surface text-text-secondary shadow-sm outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent"
              >
                <RefreshCw size={10} aria-hidden="true" />
              </button>
            </div>
            <span className="mx-0.5 h-5 w-px shrink-0 bg-border" aria-hidden="true" />
            <button
              type="button"
              aria-label="Undo"
              title="Undo"
              onClick={onUndo}
              disabled={!canUndo}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-text-secondary outline-none transition-colors hover:bg-bg hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-35"
            >
              <Undo2 size={14} strokeWidth={1.9} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Redo"
              title="Redo"
              onClick={onRedo}
              disabled={!canRedo}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-text-secondary outline-none transition-colors hover:bg-bg hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-35"
            >
              <Redo2 size={14} strokeWidth={1.9} aria-hidden="true" />
            </button>
          </div>
        )}
        <button
          type="button"
          aria-label={collapsed ? "Expand editor tools" : "Collapse editor tools"}
          aria-expanded={!collapsed}
          onClick={onToggleCollapsed}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-md outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent"
        >
          {collapsed ? <ChevronUp size={15} aria-hidden="true" /> : <ChevronDown size={15} aria-hidden="true" />}
        </button>
        {notice && <span aria-hidden="true" className="absolute bottom-full left-1/2 mb-2 max-w-[calc(100vw-24px)] -translate-x-1/2 rounded-lg bg-text-primary px-2 py-1 text-[10px] leading-tight text-bg-surface shadow-lg">{notice}</span>}
        <span className="sr-only" role="status" aria-live="polite">{notice}</span>
      </section>
    </div>
  );
}
