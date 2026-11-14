"use client";

import {
  Brush,
  ChevronDown,
  ChevronUp,
  Eraser,
  Hand,
  ImageMinus,
  Move,
  Pen,
  Type,
  Undo2,
} from "lucide-react";

export type EditorTool = "move" | "pen" | "hand" | "brush" | "eraser" | "text" | "remove-bg";

type Props = {
  activeTool: EditorTool;
  collapsed: boolean;
  canUndo: boolean;
  notice: string;
  onSelect: (tool: EditorTool) => void;
  onUndo: () => void;
  onToggleCollapsed: () => void;
  hideOnMobile?: boolean;
};

const tools = [
  { id: "move", label: "Move", Icon: Move },
  { id: "pen", label: "Pen", Icon: Pen },
  { id: "hand", label: "Hand tool", Icon: Hand },
  { id: "brush", label: "Brush", Icon: Brush },
  { id: "eraser", label: "Eraser", Icon: Eraser },
  { id: "text", label: "Text", Icon: Type },
  { id: "remove-bg", label: "Remove BG", Icon: ImageMinus },
] as const;

export default function EditorToolsBar({
  activeTool,
  collapsed,
  canUndo,
  notice,
  onSelect,
  onUndo,
  onToggleCollapsed,
  hideOnMobile = false,
}: Props) {
  return (
    <div className={`pointer-events-none absolute inset-x-0 bottom-2 z-50 flex justify-center px-2 md:bottom-3 ${hideOnMobile ? "max-md:hidden" : ""}`} data-testid="editor-tools-positioner">
      <section
        aria-label="Editor tools"
        data-testid="editor-tools-bar"
        className="pointer-events-auto relative flex max-w-full items-center gap-1 rounded-2xl border border-border bg-bg-surface/95 p-1.5 text-text-primary shadow-lg backdrop-blur"
      >
        {!collapsed && (
          <div className="flex max-w-[calc(100vw-58px)] items-center gap-0.5 overflow-x-auto">
            {tools.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                aria-label={label}
                aria-pressed={activeTool === id}
                title={label}
                onClick={() => onSelect(id)}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent ${activeTool === id ? "bg-accent text-accent-foreground" : "text-text-secondary hover:bg-bg hover:text-text-primary"}`}
              >
                <Icon size={14} strokeWidth={1.9} aria-hidden="true" />
              </button>
            ))}
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
          </div>
        )}
        <button
          type="button"
          aria-label={collapsed ? "Expand editor tools" : "Collapse editor tools"}
          title={collapsed ? "Expand tools" : "Collapse tools"}
          aria-expanded={!collapsed}
          onClick={onToggleCollapsed}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent outline-none hover:bg-accent/20 focus-visible:ring-2 focus-visible:ring-accent"
        >
          {collapsed ? <ChevronUp size={15} aria-hidden="true" /> : <ChevronDown size={15} aria-hidden="true" />}
        </button>
        {notice && <span aria-hidden="true" className="absolute bottom-full left-1/2 mb-2 max-w-[calc(100vw-24px)] -translate-x-1/2 rounded-lg bg-text-primary px-2 py-1 text-[10px] leading-tight text-bg-surface shadow-lg">{notice}</span>}
        <span className="sr-only" role="status" aria-live="polite">{notice}</span>
      </section>
    </div>
  );
}
