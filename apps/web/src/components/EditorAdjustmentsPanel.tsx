"use client";

import { AlignCenter, AlignLeft, AlignRight, ChevronRight, Minus, Plus, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import type { EditorArtworkLayer, EditorShapeBuilderMode, EditorTextContent } from "@/lib/editor-layers";

const PANEL_WIDTH = "min(16rem, 86vw)";
const EDITOR_FONTS = ["Inter", "Arial", "Georgia", "Impact", "Courier New", "Trebuchet MS", "Verdana", "Times New Roman"];
type TextStyleUpdate = Partial<Pick<EditorTextContent, "fontSize" | "color" | "fontFamily" | "fontWeight" | "fontStyle" | "textAlign" | "underline" | "letterSpacing" | "lineHeight" | "textTransform" | "textEffect" | "effectColor" | "effectOffset" | "effectBlur" | "outlineWidth" | "textDecoration" | "decorationColor" | "decorationWidth">>;

function Section({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border/70 bg-bg/70 shadow-sm dark:bg-white/[0.035]">
      <button type="button" aria-expanded={open} onClick={onToggle} className="flex min-h-10 w-full items-center justify-between px-3 text-left text-[11px] font-bold text-text-primary transition hover:bg-accent/10 [@media(pointer:coarse)]:min-h-11">
        <span>{title}</span>
        {open ? <Minus size={14} className="text-accent" aria-hidden="true" /> : <Plus size={14} className="text-text-muted" aria-hidden="true" />}
      </button>
      {open && <div className="border-t border-border/60 p-3">{children}</div>}
    </section>
  );
}

function NumberField({ label, value, min, max, step = 1, ariaLabel, onChange }: { label: string; value: number; min: number; max: number; step?: number; ariaLabel: string; onChange: (value: number) => void }) {
  return <label className="flex items-center justify-between gap-2 text-[10px] text-text-secondary"><span>{label}</span><input aria-label={ariaLabel} type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-20 rounded-lg border border-border bg-bg px-2 py-1.5 text-right text-[11px] text-text-primary outline-none focus:border-accent" /></label>;
}

export default function EditorAdjustmentsPanel({ open, onToggle, selectedLayer, onUpdateLayer, onUpdateText, onUpdateTextStyle, onUpdateShapeBuilder }: {
  open: boolean;
  onToggle: () => void;
  selectedLayer: EditorArtworkLayer | null;
  onUpdateLayer: (id: string, update: Partial<Pick<EditorArtworkLayer, "opacity" | "fillOpacity" | "blendMode">>) => void;
  onUpdateText: (value: string) => void;
  onUpdateTextStyle: (update: TextStyleUpdate) => void;
  onUpdateShapeBuilder: (mode: EditorShapeBuilderMode) => void;
}) {
  const text = selectedLayer?.text;
  const [fontQuery, setFontQuery] = useState("");
  const [recentFonts, setRecentFonts] = useState<string[]>([]);
  const [openSection, setOpenSection] = useState("Text");
  const filteredFonts = useMemo(() => {
    const needle = fontQuery.trim().toLowerCase();
    return EDITOR_FONTS.filter((font) => !needle || font.toLowerCase().includes(needle));
  }, [fontQuery]);
  function toggleSection(section: string) { setOpenSection((current) => current === section ? "" : section); }
  function chooseFont(fontFamily: string) {
    onUpdateTextStyle({ fontFamily });
    setRecentFonts((current) => [fontFamily, ...current.filter((font) => font !== fontFamily)].slice(0, 4));
  }
  return <>
    {open && <aside aria-label="Adjustments panel" data-dock-side="right" className="absolute inset-y-0 right-0 z-30 flex min-h-0 flex-col overflow-hidden border-l border-[#b7b7b7] bg-[#e8e8e8] text-[#202020] shadow-xl dark:border-[#1b1b1b] dark:bg-[#303030] dark:text-[#dedede]" style={{ width: PANEL_WIDTH }}>
      <div aria-label="Adjustments panel title" className="flex h-11 shrink-0 items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#1d2429] via-[#252f35] to-[#303b41] px-3 text-white shadow-sm [@media(pointer:coarse)]:h-12">
        <div><span role="heading" aria-level={2} className="text-[12px] font-semibold tracking-tight">Adjustments</span><span className="ml-2 rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent">Live</span></div>
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-accent shadow-[0_0_10px_#d4ff3f]" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {!selectedLayer ? <p className="p-2 text-[11px] text-[#666] dark:text-[#bdbdbd]">Select a layer to edit its properties.</p> : <div className="space-y-2 text-[11px]">
          <div className="rounded-xl border border-border/70 bg-bg/70 px-3 py-2 font-semibold text-text-primary shadow-sm dark:bg-white/[0.04]">{selectedLayer.name}<span className="mt-0.5 block text-[9px] font-normal uppercase tracking-wider text-text-muted">{selectedLayer.kind} layer</span></div>
          {selectedLayer.shape && <Section title="Shape Builder" open={openSection === "Shape Builder"} onToggle={() => toggleSection("Shape Builder")}>
            <div className="grid grid-cols-2 gap-1.5">{(["select", "merge", "subtract", "intersect"] as const).map((mode) => <button key={mode} type="button" aria-label={`Shape builder ${mode}`} aria-pressed={(selectedLayer.shape?.builderMode ?? "select") === mode} onClick={() => onUpdateShapeBuilder(mode)} className="rounded-lg border border-border px-2 py-2 text-[10px] capitalize aria-pressed:border-accent aria-pressed:bg-accent/15">{mode === "select" ? "Select" : mode}</button>)}</div>
            <p className="mt-2 text-[9px] leading-relaxed text-text-muted">Choose a builder mode before combining or editing vector shapes on the Canvas.</p>
          </Section>}
          {text ? <>
            <Section title="Text" open={openSection === "Text"} onToggle={() => toggleSection("Text")}>
              <textarea aria-label="Adjustment text" value={text.value} onChange={(event) => onUpdateText(event.target.value)} className="min-h-20 w-full resize-y rounded-xl border border-border bg-bg p-2 text-[12px] text-text-primary outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20" />
            </Section>
            <Section title="Font" open={openSection === "Font"} onToggle={() => toggleSection("Font")}>
              <div className="space-y-2">
                <NumberField label="Font size" value={text.fontSize} min={24} max={260} ariaLabel="Adjustment font size" onChange={(value) => onUpdateTextStyle({ fontSize: value })} />
                <label className="flex items-center justify-between gap-2 text-[10px] text-text-secondary">Color<input aria-label="Adjustment text color" type="color" value={text.color} onChange={(event) => onUpdateTextStyle({ color: event.target.value })} className="h-8 w-11 cursor-pointer rounded-lg border border-border bg-bg p-0.5" /></label>
                <div className="flex items-center justify-between gap-2 text-[10px] text-text-secondary"><span>Font</span><span className="text-[9px] text-text-muted">{text.fontFamily ?? "Inter"}</span></div>
                <input aria-label="Search fonts" value={fontQuery} onChange={(event) => setFontQuery(event.target.value)} placeholder="Search fonts" className="w-full rounded-lg border border-border bg-bg px-2 py-1.5 text-[11px] text-text-primary outline-none placeholder:text-text-muted focus:border-accent" />
                {recentFonts.length > 0 && !fontQuery && <div className="flex flex-wrap gap-1">{recentFonts.map((font) => <button key={font} type="button" onClick={() => chooseFont(font)} className="rounded-full border border-accent/30 bg-accent/10 px-2 py-1 text-[9px] text-accent hover:bg-accent/20">{font}</button>)}</div>}
                <div role="listbox" aria-label="Available fonts" className="grid max-h-28 grid-cols-2 gap-1 overflow-y-auto rounded-lg border border-border bg-bg p-1">
                  {filteredFonts.map((font) => <button key={font} type="button" role="option" aria-selected={(text.fontFamily ?? "Inter") === font} onClick={() => chooseFont(font)} className={`truncate rounded-md px-2 py-1.5 text-left text-[11px] transition hover:bg-accent/10 ${((text.fontFamily ?? "Inter") === font) ? "bg-accent/15 font-semibold text-accent" : "text-text-primary"}`} style={{ fontFamily: font }}>{font}</button>)}
                  {filteredFonts.length === 0 && <span className="col-span-2 px-2 py-2 text-[10px] text-text-muted">No matching fonts</span>}
                </div>
              </div>
            </Section>
            <Section title="Style & Alignment" open={openSection === "Style & Alignment"} onToggle={() => toggleSection("Style & Alignment")}>
              <div className="space-y-2">
                <div className="flex gap-1"><button type="button" aria-label="Toggle bold text" aria-pressed={(text.fontWeight ?? 700) >= 700} onClick={() => onUpdateTextStyle({ fontWeight: (text.fontWeight ?? 700) >= 700 ? 400 : 700 })} className="flex-1 rounded-lg border border-border px-2 py-1.5 font-bold aria-pressed:bg-accent aria-pressed:text-accent-foreground">B</button><button type="button" aria-label="Toggle italic text" aria-pressed={text.fontStyle === "italic"} onClick={() => onUpdateTextStyle({ fontStyle: text.fontStyle === "italic" ? "normal" : "italic" })} className="flex-1 rounded-lg border border-border px-2 py-1.5 italic aria-pressed:bg-accent aria-pressed:text-accent-foreground">I</button><button type="button" aria-label="Toggle underline text" aria-pressed={text.underline === true} onClick={() => onUpdateTextStyle({ underline: !text.underline })} className="flex-1 rounded-lg border border-border px-2 py-1.5 underline aria-pressed:bg-accent aria-pressed:text-accent-foreground">U</button></div>
                <div className="flex items-center justify-between gap-2 text-[10px] text-text-secondary"><span>Align</span><div role="group" aria-label="Text alignment" className="flex gap-1"><button type="button" aria-label="Align text left" aria-pressed={text.textAlign === "left"} onClick={() => onUpdateTextStyle({ textAlign: "left" })} className="rounded-lg border border-border p-1.5 aria-pressed:bg-accent aria-pressed:text-accent-foreground"><AlignLeft size={14} /></button><button type="button" aria-label="Align text center" aria-pressed={(text.textAlign ?? "center") === "center"} onClick={() => onUpdateTextStyle({ textAlign: "center" })} className="rounded-lg border border-border p-1.5 aria-pressed:bg-accent aria-pressed:text-accent-foreground"><AlignCenter size={14} /></button><button type="button" aria-label="Align text right" aria-pressed={text.textAlign === "right"} onClick={() => onUpdateTextStyle({ textAlign: "right" })} className="rounded-lg border border-border p-1.5 aria-pressed:bg-accent aria-pressed:text-accent-foreground"><AlignRight size={14} /></button></div></div>
                <NumberField label="Letter spacing" value={text.letterSpacing ?? 0} min={-20} max={80} ariaLabel="Adjustment letter spacing" onChange={(value) => onUpdateTextStyle({ letterSpacing: value })} />
                <NumberField label="Line height" value={text.lineHeight ?? 1.2} min={0.7} max={3} step={0.1} ariaLabel="Adjustment line height" onChange={(value) => onUpdateTextStyle({ lineHeight: value })} />
              </div>
            </Section>
            <Section title="Effects" open={openSection === "Effects"} onToggle={() => toggleSection("Effects")}>
              <div className="mb-2 flex items-center justify-center rounded-lg border border-border bg-[#151c20] py-2 text-xl font-black tracking-tight text-white"><span className={text.textEffect === "shadow" ? "[text-shadow:3px_3px_0_#050505]" : text.textEffect === "outline" ? "text-transparent [text-shadow:-1px_-1px_0_#d4ff3f,1px_1px_0_#d4ff3f]" : ""}>Aa</span></div>
              <div className="space-y-2"><div className="grid grid-cols-3 gap-1"><button type="button" aria-label="No text effect" aria-pressed={(text.textEffect ?? "none") === "none"} onClick={() => onUpdateTextStyle({ textEffect: "none" })} className="rounded-lg border border-border px-1 py-2 text-[9px] aria-pressed:border-accent aria-pressed:bg-accent/15">None</button><button type="button" aria-label="Apply text shadow" aria-pressed={text.textEffect === "shadow"} onClick={() => onUpdateTextStyle({ textEffect: "shadow" })} className="rounded-lg border border-border px-1 py-2 text-[9px] aria-pressed:border-accent aria-pressed:bg-accent/15"><Sparkles size={12} className="mx-auto mb-0.5" />Shadow</button><button type="button" aria-label="Apply text outline" aria-pressed={text.textEffect === "outline"} onClick={() => onUpdateTextStyle({ textEffect: "outline" })} className="rounded-lg border border-border px-1 py-2 text-[9px] aria-pressed:border-accent aria-pressed:bg-accent/15">Outline</button></div><label className="flex items-center justify-between gap-2 text-[10px] text-text-secondary">Effect color<input aria-label="Text effect color" type="color" value={text.effectColor ?? "#000000"} onChange={(event) => onUpdateTextStyle({ effectColor: event.target.value })} className="h-7 w-10 rounded-lg border border-border p-0.5" /></label>{text.textEffect === "shadow" && <><NumberField label="Offset" value={text.effectOffset ?? 12} min={0} max={80} ariaLabel="Text shadow offset" onChange={(value) => onUpdateTextStyle({ effectOffset: value })} /><NumberField label="Softness" value={text.effectBlur ?? 0} min={0} max={30} ariaLabel="Text shadow softness" onChange={(value) => onUpdateTextStyle({ effectBlur: value })} /></>}{text.textEffect === "outline" && <NumberField label="Outline width" value={text.outlineWidth ?? 6} min={1} max={30} ariaLabel="Text outline width" onChange={(value) => onUpdateTextStyle({ outlineWidth: value })} />}</div>
            </Section>
            <Section title="Decoration" open={openSection === "Decoration"} onToggle={() => toggleSection("Decoration")}>
              <div className="space-y-2"><label className="flex items-center justify-between gap-2 text-[10px] text-text-secondary">Style<select aria-label="Text decoration" value={text.textDecoration ?? "none"} onChange={(event) => onUpdateTextStyle({ textDecoration: event.target.value as "none" | "line" | "cut" | "oblique" })} className="w-24 rounded-lg border border-border bg-bg px-2 py-1.5 text-[11px] text-text-primary"><option value="none">None</option><option value="line">Line</option><option value="cut">Color cut</option><option value="oblique">Oblique</option></select></label><label className="flex items-center justify-between gap-2 text-[10px] text-text-secondary">Color<input aria-label="Text decoration color" type="color" value={text.decorationColor ?? "#d4ff3f"} onChange={(event) => onUpdateTextStyle({ decorationColor: event.target.value })} className="h-7 w-10 rounded-lg border border-border p-0.5" /></label><NumberField label="Weight" value={text.decorationWidth ?? 4} min={1} max={24} ariaLabel="Text decoration weight" onChange={(value) => onUpdateTextStyle({ decorationWidth: value })} /></div>
            </Section>
            <Section title="Transform" open={openSection === "Transform"} onToggle={() => toggleSection("Transform")}>
              <div className="mb-2 overflow-hidden rounded-lg border border-border bg-[#151c20] py-2 text-center text-lg font-black text-white"><span className={text.textTransform === "arch" ? "inline-block -rotate-6" : text.textTransform === "wave" ? "inline-block skew-x-6" : text.textTransform === "circle" ? "inline-block rounded-full border border-accent px-2" : ""}>Aa</span></div>
              <div className="grid grid-cols-4 gap-1">{(["none", "arch", "wave", "circle"] as const).map((shape) => <button key={shape} type="button" aria-label={`Text transform ${shape}`} aria-pressed={(text.textTransform ?? "none") === shape} onClick={() => onUpdateTextStyle({ textTransform: shape })} className="rounded-lg border border-border px-1 py-2 text-[9px] capitalize aria-pressed:border-accent aria-pressed:bg-accent/15">{shape === "none" ? "Plain" : shape}</button>)}</div>
              <p className="mt-2 text-[9px] leading-relaxed text-text-muted">Presets stay editable as live text and can be combined with effects.</p>
            </Section>
          </> : <p className="rounded-xl border border-dashed border-[#999] p-3 text-[#666] dark:border-[#555] dark:text-[#bdbdbd]">This layer has no text properties.</p>}
          <Section title="Appearance" open={openSection === "Appearance"} onToggle={() => toggleSection("Appearance")}>
            <div className="space-y-3"><label className="block text-[10px] text-text-secondary">Opacity<span className="float-right font-semibold text-text-primary">{selectedLayer.opacity}%</span><input aria-label="Adjustment opacity" type="range" min="0" max="100" value={selectedLayer.opacity} disabled={selectedLayer.locked} onChange={(event) => onUpdateLayer(selectedLayer.id, { opacity: Number(event.target.value) })} className="mt-2 h-1.5 w-full cursor-pointer accent-[var(--accent)]" /></label><label className="block text-[10px] text-text-secondary">Fill<span className="float-right font-semibold text-text-primary">{selectedLayer.fillOpacity}%</span><input aria-label="Adjustment fill" type="range" min="0" max="100" value={selectedLayer.fillOpacity} disabled={selectedLayer.locked} onChange={(event) => onUpdateLayer(selectedLayer.id, { fillOpacity: Number(event.target.value) })} className="mt-2 h-1.5 w-full cursor-pointer accent-[var(--accent)]" /></label></div>
          </Section>
        </div>}
      </div>
    </aside>}
    <button type="button" aria-label={open ? "Close Adjustments panel" : "Open Adjustments panel"} aria-expanded={open} onClick={onToggle} className="absolute top-2 z-40 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-md outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11" style={{ right: open ? PANEL_WIDTH : 0 }}><ChevronRight size={17} aria-hidden="true" /></button>
  </>;
}
