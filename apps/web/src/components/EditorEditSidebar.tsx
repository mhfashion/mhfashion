"use client";

import {
  AppWindow,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  LayoutTemplate,
  PenTool,
  Shapes,
  Type,
  Upload,
} from "lucide-react";
import { useState } from "react";

const PANEL_WIDTH = "min(14rem, 86vw)";
const EDIT_TOOLS = [
  { label: "Design", Icon: LayoutTemplate, description: "Start with a template or blank design." },
  { label: "Elements", Icon: Shapes, description: "Shapes and reusable design elements are coming next." },
  { label: "Text", Icon: Type, description: "Text objects are not connected yet." },
  { label: "Brand", Icon: BadgeCheck, description: "Brand assets will be available in a later Editor step." },
  { label: "Uploads", Icon: Upload, description: "Image upload is not connected yet." },
  { label: "Draw", Icon: PenTool, description: "Use the bottom Tools Bar for the current drawing tools." },
  { label: "Projects", Icon: FolderOpen, description: "Project browsing is not connected yet." },
  { label: "Apps", Icon: AppWindow, description: "Apps will be available in a later Editor step." },
] as const;

export default function EditorEditSidebar({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  const [activeLabel, setActiveLabel] = useState("Design");
  const activeTool = EDIT_TOOLS.find((tool) => tool.label === activeLabel) ?? EDIT_TOOLS[0];

  return (
    <>
      {!open && (
        <aside aria-label="Edit sidebar rail" data-dock-side="left" className="absolute inset-y-0 left-0 z-30 flex w-11 flex-col items-center border-r border-border bg-bg-surface/95 py-2 text-text-primary shadow-xl backdrop-blur [@media(pointer:coarse)]:w-12">
          <div className="flex flex-col gap-1">
            {EDIT_TOOLS.map(({ label, Icon }) => (
              <button
                key={label}
                type="button"
                aria-label={`Open ${label} in Edit sidebar`}
                title={label}
                onClick={() => { setActiveLabel(label); onToggle(); }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary outline-none hover:bg-bg hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-10 [@media(pointer:coarse)]:w-10"
              >
                <Icon size={16} aria-hidden="true" />
              </button>
            ))}
          </div>
        </aside>
      )}
      {open && (
        <aside
          id="editor-edit-sidebar"
          aria-label="Edit sidebar"
          data-dock-side="left"
          className="absolute inset-y-0 left-0 z-30 flex min-h-0 flex-col overflow-hidden border-r border-border bg-bg-surface text-text-primary shadow-xl"
          style={{ width: PANEL_WIDTH }}
        >
          <div aria-label="Edit sidebar title" className="flex h-8 shrink-0 items-center gap-2 border-b border-border px-3 text-[11px] font-semibold [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)_and_(max-height:500px)]:h-8">
            <span role="heading" aria-level={2}>Edit sidebar</span>
            <span className="truncate text-text-secondary">{activeTool.label}</span>
          </div>
          <nav aria-label="Edit sidebar tools" className="min-h-0 flex-1 overflow-y-auto p-2">
            <div className="grid grid-cols-2 gap-1">
              {EDIT_TOOLS.map(({ label, Icon }) => (
                <button
                  key={label}
                  type="button"
                  aria-label={`${label} (coming soon)`}
                  aria-pressed={activeLabel === label}
                  title={label}
                  onClick={() => setActiveLabel(label)}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg px-2 text-center text-[10px] font-medium outline-none transition-colors [@media(pointer:coarse)]:min-h-20 ${activeLabel === label ? "bg-accent/15 text-accent" : "text-text-secondary hover:bg-bg hover:text-text-primary"}`}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
            <div aria-live="polite" className="mt-3 rounded-lg border border-border bg-bg px-3 py-3 text-[11px] leading-4 text-text-secondary">
              <div className="mb-1 font-semibold text-text-primary">{activeTool.label}</div>
              {activeTool.description}
            </div>
          </nav>
        </aside>
      )}
      <button
        type="button"
        aria-label={open ? "Collapse Edit sidebar" : "Expand Edit sidebar"}
        aria-expanded={open}
        onClick={onToggle}
        className="absolute top-2 z-40 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-md outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11"
        style={{ left: open ? PANEL_WIDTH : 0 }}
      >
        {open ? <ChevronLeft size={17} aria-hidden="true" /> : <ChevronRight size={17} aria-hidden="true" />}
      </button>
    </>
  );
}
