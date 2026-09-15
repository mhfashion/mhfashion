"use client";

import { Search } from "lucide-react";
import type { PanelId } from "./EditorLeftRail";

const TITLES: Record<PanelId, string> = {
  upload: "Upload",
  elements: "Elements",
  text: "Text",
  effects: "Effects",
  ai: "AI",
};

export default function EditorFlyout({ panel }: { panel: PanelId }) {
  return (
    <div className="w-52 flex-shrink-0 border-r border-border bg-bg-surface p-3 overflow-y-auto">
      <p className="text-xs font-semibold mb-2.5">{TITLES[panel]}</p>

      {panel === "upload" && (
        <div className="space-y-2">
          <button className="w-full border border-dashed border-border-light rounded-lg py-6 text-[10px] text-text-muted">
            Click to upload an image
          </button>
          <p className="text-[9px] text-text-faint leading-relaxed">
            Once you upload a photo, Remove Background and Upscale become
            available in the toolbar above the canvas.
          </p>
        </div>
      )}

      {(panel === "elements" || panel === "text") && (
        <>
          <div className="flex items-center gap-1.5 bg-bg rounded-md px-2 py-1.5 mb-2.5 text-text-muted">
            <Search size={12} />
            <input
              placeholder={`Search ${TITLES[panel].toLowerCase()}`}
              className="bg-transparent outline-none text-[10px] w-full placeholder:text-text-faint"
            />
          </div>
          {/* Thumbnails come from pre-rendered raster previews of decomposed
              SVG layers — raw SVG is never exposed in the browsing UI. */}
          <div className="grid grid-cols-3 gap-1.5">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-md bg-bg border border-border"
              />
            ))}
          </div>
        </>
      )}

      {panel === "effects" && (
        <div className="space-y-1.5 text-[10px]">
          {["Drop Shadow", "Stroke", "Glow", "Blur", "Sharpen"].map((fx) => (
            <button
              key={fx}
              className="w-full text-left px-2 py-1.5 rounded-md bg-bg border border-border"
            >
              {fx}
            </button>
          ))}
        </div>
      )}

      {panel === "ai" && (
        <div className="space-y-2">
          <div className="rounded-md bg-bg border border-border p-2">
            <p className="text-[10px] font-medium mb-1">Generate image</p>
            <textarea
              rows={3}
              placeholder="Describe what you want..."
              className="w-full bg-transparent outline-none text-[10px] resize-none placeholder:text-text-faint"
            />
            <button className="w-full bg-accent text-accent-foreground rounded py-1 text-[10px] font-semibold mt-1">
              Generate · 100 pts
            </button>
          </div>
          <p className="text-[9px] text-text-faint">
            300 points are granted daily. Unused daily points expire; points
            earned from purchases don&apos;t.
          </p>
        </div>
      )}
    </div>
  );
}
