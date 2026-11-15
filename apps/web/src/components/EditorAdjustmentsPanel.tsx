"use client";

import { ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import type { EditorArtworkLayer, EditorTextContent } from "@/lib/editor-layers";

const PANEL_WIDTH = "min(16rem, 86vw)";
const EDITOR_FONTS = ["Inter", "Arial", "Georgia", "Impact", "Courier New", "Trebuchet MS", "Verdana", "Times New Roman"];

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
  const [fontQuery, setFontQuery] = useState("");
  const [recentFonts, setRecentFonts] = useState<string[]>([]);
  const filteredFonts = useMemo(() => {
    const needle = fontQuery.trim().toLowerCase();
    return EDITOR_FONTS.filter((font) => !needle || font.toLowerCase().includes(needle));
  }, [fontQuery]);
  function chooseFont(fontFamily: string) {
    onUpdateTextStyle({ fontFamily });
    setRecentFonts((current) => [fontFamily, ...current.filter((font) => font !== fontFamily)].slice(0, 4));
  }
  return (
    <>
      {open && (
        <aside aria-label="Adjustments panel" data-dock-side="right" className="absolute inset-y-0 right-0 z-30 flex min-h-0 flex-col overflow-hidden border-l border-[#b7b7b7] bg-[#e8e8e8] text-[#202020] shadow-xl dark:border-[#1b1b1b] dark:bg-[#303030] dark:text-[#dedede]" style={{ width: PANEL_WIDTH }}>
          <div aria-label="Adjustments panel title" className="flex h-11 shrink-0 items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#1d2429] via-[#252f35] to-[#303b41] px-3 text-white shadow-sm [@media(pointer:coarse)]:h-12">
            <div><span role="heading" aria-level={2} className="text-[12px] font-semibold tracking-tight">Adjustments</span><span className="ml-2 rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent">Live</span></div>
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-accent shadow-[0_0_10px_#d4ff3f]" />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {!selectedLayer ? (
              <p className="text-[11px] text-[#666] dark:text-[#bdbdbd]">Select a layer to edit its properties.</p>
            ) : (
              <div className="space-y-3 text-[11px]">
                <div className="rounded-xl border border-border/70 bg-bg/70 px-3 py-2 font-semibold text-text-primary shadow-sm dark:bg-white/[0.04]">{selectedLayer.name}<span className="mt-0.5 block text-[9px] font-normal uppercase tracking-wider text-text-muted">{selectedLayer.kind} layer</span></div>
                {text ? (
                  <>
                    <label className="block font-semibold text-text-secondary">Text
                      <textarea aria-label="Adjustment text" value={text.value} onChange={(event) => onUpdateText(event.target.value)} className="mt-1 min-h-20 w-full resize-y rounded-xl border border-border bg-bg p-2 text-[12px] font-normal text-text-primary outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20" />
                    </label>
                    <label className="flex items-center justify-between gap-2">Font size
                      <input aria-label="Adjustment font size" type="number" min="24" max="260" value={text.fontSize} onChange={(event) => onUpdateTextStyle({ fontSize: Number(event.target.value) })} className="w-20 rounded-lg border border-border bg-bg px-2 py-1.5 text-right text-[11px] text-text-primary outline-none focus:border-accent" />
                    </label>
                    <label className="flex items-center justify-between gap-2">Color
                      <input aria-label="Adjustment text color" type="color" value={text.color} onChange={(event) => onUpdateTextStyle({ color: event.target.value })} className="h-8 w-11 cursor-pointer rounded-lg border border-border bg-bg p-0.5" />
                    </label>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 font-semibold text-text-secondary"><span>Font</span><span className="text-[9px] font-normal text-text-muted">{text.fontFamily ?? "Inter"}</span></div>
                      <input aria-label="Search fonts" value={fontQuery} onChange={(event) => setFontQuery(event.target.value)} placeholder="Search fonts" className="w-full rounded-lg border border-border bg-bg px-2 py-1.5 text-[11px] text-text-primary outline-none placeholder:text-text-muted focus:border-accent" />
                      {recentFonts.length > 0 && !fontQuery && <div className="flex flex-wrap gap-1">{recentFonts.map((font) => <button key={font} type="button" onClick={() => chooseFont(font)} className="rounded-full border border-accent/30 bg-accent/10 px-2 py-1 text-[9px] text-accent hover:bg-accent/20">{font}</button>)}</div>}
                      <div role="listbox" aria-label="Available fonts" className="grid max-h-28 grid-cols-2 gap-1 overflow-y-auto rounded-lg border border-border bg-bg p-1">
                        {filteredFonts.map((font) => <button key={font} type="button" role="option" aria-selected={(text.fontFamily ?? "Inter") === font} onClick={() => chooseFont(font)} className={`truncate rounded-md px-2 py-1.5 text-left text-[11px] transition hover:bg-accent/10 ${((text.fontFamily ?? "Inter") === font) ? "bg-accent/15 font-semibold text-accent" : "text-text-primary"}`} style={{ fontFamily: font }}>{font}</button>)}
                        {filteredFonts.length === 0 && <span className="col-span-2 px-2 py-2 text-[10px] text-text-muted">No matching fonts</span>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" aria-label="Toggle bold text" aria-pressed={(text.fontWeight ?? 700) >= 700} onClick={() => onUpdateTextStyle({ fontWeight: (text.fontWeight ?? 700) >= 700 ? 400 : 700 })} className="flex-1 rounded-lg border border-border px-2 py-1.5 font-bold transition hover:border-accent aria-pressed:bg-accent aria-pressed:text-accent-foreground">B</button>
                      <button type="button" aria-label="Toggle italic text" aria-pressed={text.fontStyle === "italic"} onClick={() => onUpdateTextStyle({ fontStyle: text.fontStyle === "italic" ? "normal" : "italic" })} className="flex-1 rounded-lg border border-border px-2 py-1.5 italic transition hover:border-accent aria-pressed:bg-accent aria-pressed:text-accent-foreground">I</button>
                      <button type="button" aria-label="Toggle underline text" aria-pressed={text.underline === true} onClick={() => onUpdateTextStyle({ underline: !text.underline })} className="flex-1 rounded-lg border border-border px-2 py-1.5 underline transition hover:border-accent aria-pressed:bg-accent aria-pressed:text-accent-foreground">U</button>
                    </div>
                    <label className="flex items-center justify-between gap-2">Align
                      <select aria-label="Adjustment text alignment" value={text.textAlign ?? "center"} onChange={(event) => onUpdateTextStyle({ textAlign: event.target.value as "left" | "center" | "right" })} className="w-24 rounded-lg border border-border bg-bg px-2 py-1.5 text-[11px] text-text-primary outline-none focus:border-accent"><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select>
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
