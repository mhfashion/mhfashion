"use client";

import { ChevronLeft, ChevronRight, Layers } from "lucide-react";

const PANEL_WIDTH = "min(17rem, 86vw)";

export default function EditorLayersPanel({
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
          aria-label="Layers panel"
          className="absolute inset-y-0 left-0 z-30 flex flex-col border-r border-border bg-bg-surface text-text-primary shadow-xl"
          style={{ width: PANEL_WIDTH }}
        >
          <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3">
            <Layers size={15} aria-hidden="true" className="text-text-secondary" />
            <h2 className="text-sm font-semibold">Layers</h2>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center p-4">
            <p className="max-w-[15rem] text-center text-xs leading-5 text-text-muted">
              Layer controls will be added step by step.
            </p>
          </div>
        </aside>
      )}
      <button
        type="button"
        aria-label={open ? "Collapse Layers panel" : "Expand Layers panel"}
        aria-expanded={open}
        onClick={onToggle}
        className="absolute top-1/2 z-40 flex h-11 w-10 -translate-y-1/2 items-center justify-center rounded-r-md border border-border border-l-0 bg-bg-surface text-text-secondary shadow-md outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent"
        style={{ left: open ? PANEL_WIDTH : 0 }}
      >
        {open ? <ChevronLeft size={17} aria-hidden="true" /> : <ChevronRight size={17} aria-hidden="true" />}
      </button>
    </>
  );
}
