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

const PANEL_WIDTH = "min(14rem, 86vw)";

const EDIT_TOOLS = [
  { label: "Design", Icon: LayoutTemplate },
  { label: "Elements", Icon: Shapes },
  { label: "Text", Icon: Type },
  { label: "Brand", Icon: BadgeCheck },
  { label: "Uploads", Icon: Upload },
  { label: "Draw", Icon: PenTool },
  { label: "Projects", Icon: FolderOpen },
  { label: "Apps", Icon: AppWindow },
] as const;

export default function EditorEditSidebar({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      {open && (
        <aside
          id="editor-edit-sidebar"
          aria-label="Edit sidebar"
          data-dock-side="left"
          className="absolute inset-y-0 left-0 z-30 flex min-h-0 flex-col overflow-hidden border-r border-border bg-bg-surface text-text-primary shadow-xl"
          style={{ width: PANEL_WIDTH }}
        >
          <div
            aria-label="Edit sidebar title"
            className="flex h-8 shrink-0 items-center border-b border-border px-3 text-[11px] font-semibold [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)_and_(max-height:500px)]:h-8"
          >
            <span role="heading" aria-level={2}>Edit sidebar</span>
          </div>
          <nav aria-label="Edit sidebar tools" className="min-h-0 flex-1 overflow-y-auto p-2">
            <div className="flex flex-col gap-1">
              {EDIT_TOOLS.map(({ label, Icon }) => (
                <button
                  key={label}
                  type="button"
                  disabled
                  aria-label={`${label} (coming soon)`}
                  title="This tool will be defined in a later Editor step"
                  className="flex min-h-9 w-full items-center gap-3 rounded-lg px-3 text-left text-xs font-medium text-text-secondary opacity-60 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)_and_(max-height:500px)]:min-h-8"
                >
                  <Icon size={17} aria-hidden="true" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
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
