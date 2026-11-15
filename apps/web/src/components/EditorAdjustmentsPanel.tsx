"use client";

import { ChevronRight } from "lucide-react";
import type { EditorArtworkLayer, EditorTextContent } from "@/lib/editor-layers";

const PANEL_WIDTH = "min(16rem, 86vw)";

export default function EditorAdjustmentsPanel({
  open,
  onToggle,
  selectedLayer,
  onUpdateLayer,
  onUpdateText,
  onUpdateTextStyle,
}: {
  open: boolean;
  onToggle: () => void;
  selectedLayer: EditorArtworkLayer | null;
  onUpdateLayer: (id: string, update: Partial<Pick<EditorArtworkLayer, "opacity" | "fillOpacity" | "blendMode">>) => void;
  onUpdateText: (value: string) => void;
  onUpdateTextStyle: (update: Partial<Pick<EditorTextContent, "fontSize" | "color" | "fontFamily" | "fontWeight" | "fontStyle" | "textAlign" | "underline" | "letterSpacing" | "lineHeight">>) => void;
}) {
  const text = selectedLayer?.text;
  return (
    <>
      {open && (
        <aside aria-label="Adjustments panel" data-dock-side="right" className="absolute inset-y-0 right-0 z-30 flex min-h-0 flex-col overflow-hidden border-l border-[#b7b7b7] bg-[#e8e8e8] text-[#202020] shadow-xl dark:border-[#1b1b1b] dark:bg-[#303030] dark:text-[#dedede]" style={{ width: PANEL_WIDTH }}>
          <div aria-label="Adjustments panel title" className="flex h-8 shrink-0 items-center border-b border-[#b7b7b7] bg-[#d3d3d3] px-2 dark:border-[#202020] dark:bg-[#242424] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)_and_(max-height:500px)]:h-8">
            <span role="heading" aria-level={2} className="text-[11px] font-semibold dark:text-white">Adjustments</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {!selectedLayer ? (
              <p className="text-[11px] text-[#666] dark:text-[#bdbdbd]">Select a layer to edit its properties.</p>
            ) : (
              <div className="space-y-3 text-[11px]">
                <div className="font-semibold text-[#202020] dark:text-white">{selectedLayer.name}</div>
                {text ? (
                  <>
                    <label className="block">Text
                      <textarea aria-label="Adjustment text" value={text.value} onChange={(event) => onUpdateText(event.target.value)} className="mt-1 min-h-20 w-full resize-y border border-[#999] bg-white p-1 text-[12px] text-[#202020] outline-none dark:border-[#555] dark:bg-[#202020] dark:text-white" />
                    </label>
                    <label className="flex items-center justify-between gap-2">Font size
                      <input aria-label="Adjustment font size" type="number" min="24" max="260" value={text.fontSize} onChange={(event) => onUpdateTextStyle({ fontSize: Number(event.target.value) })} className="w-20 border border-[#999] bg-white px-1 py-1 text-right text-[11px] text-[#202020] outline-none dark:border-[#555] dark:bg-[#202020] dark:text-white" />
                    </label>
                    <label className="flex items-center justify-between gap-2">Color
                      <input aria-label="Adjustment text color" type="color" value={text.color} onChange={(event) => onUpdateTextStyle({ color: event.target.value })} className="h-7 w-10" />
                    </label>
                    <label className="flex items-center justify-between gap-2">Font
                      <select aria-label="Adjustment font family" value={text.fontFamily ?? "Inter"} onChange={(event) => onUpdateTextStyle({ fontFamily: event.target.value })} className="w-32 border border-[#999] bg-white px-1 py-1 text-[11px] text-[#202020] dark:border-[#555] dark:bg-[#202020] dark:text-white"><option>Inter</option><option>Arial</option><option>Georgia</option><option>Impact</option><option>Courier New</option></select>
                    </label>
                    <div className="flex gap-1">
                      <button type="button" aria-label="Toggle bold text" aria-pressed={(text.fontWeight ?? 700) >= 700} onClick={() => onUpdateTextStyle({ fontWeight: (text.fontWeight ?? 700) >= 700 ? 400 : 700 })} className="flex-1 border border-[#999] px-2 py-1 font-bold">B</button>
                      <button type="button" aria-label="Toggle italic text" aria-pressed={text.fontStyle === "italic"} onClick={() => onUpdateTextStyle({ fontStyle: text.fontStyle === "italic" ? "normal" : "italic" })} className="flex-1 border border-[#999] px-2 py-1 italic">I</button>
                      <button type="button" aria-label="Toggle underline text" aria-pressed={text.underline === true} onClick={() => onUpdateTextStyle({ underline: !text.underline })} className="flex-1 border border-[#999] px-2 py-1 underline">U</button>
                    </div>
                    <label className="flex items-center justify-between gap-2">Align
                      <select aria-label="Adjustment text alignment" value={text.textAlign ?? "center"} onChange={(event) => onUpdateTextStyle({ textAlign: event.target.value as "left" | "center" | "right" })} className="w-24 border border-[#999] bg-white px-1 py-1 text-[11px] text-[#202020] dark:border-[#555] dark:bg-[#202020] dark:text-white"><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select>
                    </label>
                    <label className="flex items-center justify-between gap-2">Spacing
                      <input aria-label="Adjustment letter spacing" type="number" min="-20" max="80" value={text.letterSpacing ?? 0} onChange={(event) => onUpdateTextStyle({ letterSpacing: Number(event.target.value) })} className="w-20 border border-[#999] px-1 py-1 text-right" />
                    </label>
                    <label className="flex items-center justify-between gap-2">Line height
                      <input aria-label="Adjustment line height" type="number" min="0.7" max="3" step="0.1" value={text.lineHeight ?? 1.2} onChange={(event) => onUpdateTextStyle({ lineHeight: Number(event.target.value) })} className="w-20 border border-[#999] px-1 py-1 text-right" />
                    </label>
                  </>
                ) : (
                  <p className="border border-dashed border-[#999] p-2 text-[#666] dark:border-[#555] dark:text-[#bdbdbd]">This layer has no text properties.</p>
                )}
                <label className="flex items-center justify-between gap-2">Opacity
                  <input aria-label="Adjustment opacity" type="number" min="0" max="100" value={selectedLayer.opacity} disabled={selectedLayer.locked} onChange={(event) => onUpdateLayer(selectedLayer.id, { opacity: Number(event.target.value) })} className="w-20 border border-[#999] bg-white px-1 py-1 text-right text-[11px] text-[#202020] outline-none disabled:opacity-50 dark:border-[#555] dark:bg-[#202020] dark:text-white" />
                </label>
                <label className="flex items-center justify-between gap-2">Fill
                  <input aria-label="Adjustment fill" type="number" min="0" max="100" value={selectedLayer.fillOpacity} disabled={selectedLayer.locked} onChange={(event) => onUpdateLayer(selectedLayer.id, { fillOpacity: Number(event.target.value) })} className="w-20 border border-[#999] bg-white px-1 py-1 text-right text-[11px] text-[#202020] outline-none disabled:opacity-50 dark:border-[#555] dark:bg-[#202020] dark:text-white" />
                </label>
              </div>
            )}
          </div>
        </aside>
      )}
      <button type="button" aria-label={open ? "Close Adjustments panel" : "Open Adjustments panel"} aria-expanded={open} onClick={onToggle} className="absolute top-2 z-40 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-md outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11" style={{ right: open ? PANEL_WIDTH : 0 }}>
        <ChevronRight size={17} aria-hidden="true" />
      </button>
    </>
  );
}
