"use client";

import { useEffect, useMemo, useState } from "react";
import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, Search, Underline } from "lucide-react";
import type { CanvasMark } from "./InteractiveCanvas";
import {
  DEFAULT_FONT,
  FONT_CATEGORIES,
  FONT_LIBRARY,
  TEXT_COMBINATIONS,
  TEXT_PRESETS,
  type TextCombination,
  type TextFormatting,
} from "@/lib/editorTypography";

const TEXT_COLORS = ["#111827", "#d4ff3f", "#ffffff", "#ef4444", "#3b82f6", "#a855f7"];
const INITIAL_FORMATTING: TextFormatting = {
  fontFamily: DEFAULT_FONT.family,
  fontSize: 32,
  fontWeight: "bold",
  fontStyle: "normal",
  underline: false,
  textAlign: "center",
  charSpacing: 0,
  lineHeight: 1.16,
  color: "#111827",
};

type Props = {
  selectedText: CanvasMark | null;
  onAddText: (text: string, formatting: TextFormatting) => void;
  onAddCombination: (combination: TextCombination) => void;
  onUpdateSelectedText: (patch: Partial<TextFormatting>) => void;
};

export default function TextLibrary({ selectedText, onAddText, onAddCombination, onUpdateSelectedText }: Props) {
  const [text, setText] = useState("");
  const [formatting, setFormatting] = useState<TextFormatting>(INITIAL_FORMATTING);
  const [fontQuery, setFontQuery] = useState("");
  const [fontCategory, setFontCategory] = useState("All");

  useEffect(() => {
    if (!selectedText) return;
    setFormatting({
      fontFamily: selectedText.fontFamily ?? DEFAULT_FONT.family,
      fontSize: selectedText.fontSize ?? 32,
      fontWeight: selectedText.fontWeight === "normal" ? "normal" : "bold",
      fontStyle: selectedText.fontStyle === "italic" ? "italic" : "normal",
      underline: selectedText.underline ?? false,
      textAlign: selectedText.textAlign ?? "center",
      charSpacing: selectedText.charSpacing ?? 0,
      lineHeight: selectedText.lineHeight ?? 1.16,
      color: selectedText.color ?? "#111827",
    });
  }, [selectedText?.id, selectedText?.fontFamily, selectedText?.fontSize, selectedText?.fontWeight, selectedText?.fontStyle, selectedText?.underline, selectedText?.textAlign, selectedText?.charSpacing, selectedText?.lineHeight, selectedText?.color]);

  const visibleFonts = useMemo(() => {
    const query = fontQuery.trim().toLocaleLowerCase();
    return FONT_LIBRARY.filter((font) => {
      const matchesCategory = fontCategory === "All" || font.category === fontCategory;
      const matchesQuery = !query || [font.name, font.category, ...font.tags].some((value) => value.toLocaleLowerCase().includes(query));
      return matchesCategory && matchesQuery;
    });
  }, [fontCategory, fontQuery]);

  function updateFormatting(patch: Partial<TextFormatting>) {
    setFormatting((current) => ({ ...current, ...patch }));
    if (selectedText) onUpdateSelectedText(patch);
  }

  function addPreset(preset: (typeof TEXT_PRESETS)[number]) {
    onAddText(text.trim() || preset.placeholder, preset.style);
    setText("");
  }

  function addCustomText() {
    const copy = text.trim();
    if (!copy) return;
    onAddText(copy, formatting);
    setText("");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-bg p-2.5">
        <label className="block text-[9px] font-semibold text-text-muted" htmlFor="editor-text-copy">Your text</label>
        <textarea id="editor-text-copy" value={text} onChange={(event) => setText(event.target.value)} maxLength={120} rows={3} placeholder="Type the words for your design…" className="mt-1.5 w-full resize-y rounded-md border border-border bg-bg-surface px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent" />
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {TEXT_PRESETS.map((preset) => <button key={preset.id} type="button" onClick={() => addPreset(preset)} title={preset.description} className="min-w-0 rounded-md border border-border bg-bg-surface px-1.5 py-2 text-left hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <span className="block truncate text-center text-[15px] leading-tight" style={{ fontFamily: preset.style.fontFamily, fontWeight: preset.style.fontWeight, color: preset.style.color }}>{preset.name === "Heading" ? "Aa" : preset.name === "Subheading" ? "Ab" : "Ag"}</span>
            <span className="mt-1 block truncate text-center text-[8px] text-text-muted">{preset.name}</span>
          </button>)}
        </div>
        <button type="button" onClick={addCustomText} disabled={!text.trim()} className="mt-2 flex w-full items-center justify-center rounded-md bg-accent px-2 py-2 text-[10px] font-bold text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40">Add formatted text to canvas</button>
        <p className="mt-1.5 text-[8px] leading-relaxed text-text-faint">Choose a quick text type or add your copy with the selected formatting. Double-click text on the canvas to edit the words.</p>
      </div>

      <section aria-labelledby="font-combinations-heading">
        <div className="mb-1.5 flex items-center justify-between"><h3 id="font-combinations-heading" className="text-[10px] font-bold">Font combinations</h3><span className="text-[8px] text-text-faint">Adds an editable group</span></div>
        <div className="space-y-1.5">
          {TEXT_COMBINATIONS.map((combination) => <button key={combination.id} type="button" onClick={() => onAddCombination(combination)} className="w-full rounded-md border border-border bg-bg px-2.5 py-2 text-center transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" title={`Add ${combination.name} as two editable text layers`}>
            <span className="block truncate text-[16px] leading-tight" style={{ fontFamily: combination.title.style.fontFamily, fontSize: Math.min(18, combination.title.style.fontSize * 0.4), fontWeight: combination.title.style.fontWeight, color: combination.title.style.color }}>{combination.title.text}</span>
            <span className="mt-0.5 block truncate text-[8px] tracking-[0.12em]" style={{ fontFamily: combination.subtitle.style.fontFamily, color: combination.subtitle.style.color }}>{combination.subtitle.text}</span>
            <span className="mt-1 block text-[8px] text-text-faint">{combination.name}</span>
          </button>)}
        </div>
      </section>

      <section aria-labelledby="font-library-heading">
        <div className="mb-1.5 flex items-center justify-between"><h3 id="font-library-heading" className="text-[10px] font-bold">Font library</h3><span className="text-[8px] text-text-faint">{visibleFonts.length} fonts</span></div>
        <div className="relative">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint" />
          <input value={fontQuery} onChange={(event) => setFontQuery(event.target.value)} placeholder="Search fonts or styles" aria-label="Search fonts by name or style" className="h-8 w-full rounded-md border border-border bg-bg py-1 pl-8 pr-2 text-[9px] outline-none placeholder:text-text-faint focus:border-accent" />
        </div>
        <div role="tablist" aria-label="Font categories" className="-mx-3 mt-2 flex gap-1.5 overflow-x-auto px-3 pb-1">
          {["All", ...FONT_CATEGORIES].map((category) => <button key={category} type="button" role="tab" aria-selected={fontCategory === category} onClick={() => setFontCategory(category)} className={`shrink-0 rounded-full border px-2 py-1 text-[8px] ${fontCategory === category ? "border-accent bg-accent/10 font-semibold text-accent" : "border-border text-text-muted hover:border-accent/50"}`}>{category}</button>)}
        </div>
        <div className="grid max-h-64 grid-cols-2 gap-1.5 overflow-y-auto pr-0.5">
          {visibleFonts.map((font) => <button key={font.id} type="button" aria-pressed={formatting.fontFamily === font.family} onClick={() => updateFormatting({ fontFamily: font.family })} className={`min-w-0 rounded-md border px-2 py-2 text-left transition-colors ${formatting.fontFamily === font.family ? "border-accent bg-accent/10" : "border-border bg-bg hover:border-accent/60"}`}>
            <span className="block truncate text-center text-[17px] leading-tight text-text-primary" style={{ fontFamily: font.family }}>Aa</span>
            <span className="mt-1 block truncate text-center text-[8px] text-text-muted">{font.name}</span>
          </button>)}
        </div>
        {!visibleFonts.length && <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-[9px] text-text-faint">No matching fonts. Try a style such as bold, editorial, or playful.</p>}
        <p className="mt-1.5 text-[8px] leading-relaxed text-text-faint">These are browser/system font choices for this prototype. Licensed custom font files can be added to the planned R2 font catalog later.</p>
      </section>

      <section aria-labelledby="text-format-heading" className="rounded-lg border border-border bg-bg p-2.5">
        <div className="mb-2 flex items-center justify-between"><h3 id="text-format-heading" className="text-[10px] font-bold">Text formatting</h3>{selectedText && <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[8px] font-semibold text-accent">Selected layer</span>}</div>
        <div className="flex items-end gap-2">
          <label className="min-w-0 flex-1 text-[8px] text-text-muted">Font size
            <input aria-label="Text font size" type="number" min={8} max={160} value={formatting.fontSize} onChange={(event) => updateFormatting({ fontSize: Math.max(8, Math.min(160, Number(event.target.value) || 8)) })} className="mt-1 w-full rounded border border-border bg-bg-surface px-2 py-1.5 text-[10px] text-text-primary outline-none focus:border-accent" />
          </label>
          <label className="flex h-8 w-10 items-center justify-center overflow-hidden rounded border border-border bg-bg-surface" title="Text color">
            <input aria-label="Text color" type="color" value={formatting.color} onChange={(event) => updateFormatting({ color: event.target.value })} className="h-10 w-12 cursor-pointer border-0 bg-transparent" />
          </label>
        </div>
        <div className="mt-2 flex items-center gap-1">
          <button type="button" aria-label="Toggle bold" aria-pressed={formatting.fontWeight === "bold"} onClick={() => updateFormatting({ fontWeight: formatting.fontWeight === "bold" ? "normal" : "bold" })} className={`rounded border p-1.5 ${formatting.fontWeight === "bold" ? "border-accent bg-accent/10 text-accent" : "border-border text-text-muted"}`}><Bold size={13} /></button>
          <button type="button" aria-label="Toggle italic" aria-pressed={formatting.fontStyle === "italic"} onClick={() => updateFormatting({ fontStyle: formatting.fontStyle === "italic" ? "normal" : "italic" })} className={`rounded border p-1.5 ${formatting.fontStyle === "italic" ? "border-accent bg-accent/10 text-accent" : "border-border text-text-muted"}`}><Italic size={13} /></button>
          <button type="button" aria-label="Toggle underline" aria-pressed={formatting.underline} onClick={() => updateFormatting({ underline: !formatting.underline })} className={`rounded border p-1.5 ${formatting.underline ? "border-accent bg-accent/10 text-accent" : "border-border text-text-muted"}`}><Underline size={13} /></button>
          <span className="mx-0.5 h-5 w-px bg-border" />
          {([{ id: "left", Icon: AlignLeft }, { id: "center", Icon: AlignCenter }, { id: "right", Icon: AlignRight }] as const).map(({ id, Icon }) => <button key={id} type="button" aria-label={`Align text ${id}`} aria-pressed={formatting.textAlign === id} onClick={() => updateFormatting({ textAlign: id })} className={`rounded border p-1.5 ${formatting.textAlign === id ? "border-accent bg-accent/10 text-accent" : "border-border text-text-muted"}`}><Icon size={13} /></button>)}
        </div>
        <div className="mt-2 flex gap-1.5">{TEXT_COLORS.map((color) => <button key={color} type="button" aria-label={`Text color ${color}`} aria-pressed={formatting.color === color} onClick={() => updateFormatting({ color })} style={{ backgroundColor: color }} className={`h-4 w-4 rounded-full border border-border ${formatting.color === color ? "ring-2 ring-accent ring-offset-1 ring-offset-bg" : ""}`} />)}</div>
        <label className="mt-2 block text-[8px] text-text-muted">Letter spacing · {(formatting.charSpacing / 10).toFixed(1)}%
          <input aria-label="Letter spacing" type="range" min={0} max={300} step={10} value={formatting.charSpacing} onChange={(event) => updateFormatting({ charSpacing: Number(event.target.value) })} className="mt-1 w-full accent-lime-400" />
        </label>
        <label className="mt-2 block text-[8px] text-text-muted">Line spacing · {formatting.lineHeight.toFixed(1)}
          <input aria-label="Line spacing" type="range" min={0.8} max={2} step={0.1} value={formatting.lineHeight} onChange={(event) => updateFormatting({ lineHeight: Number(event.target.value) })} className="mt-1 w-full accent-lime-400" />
        </label>
        <p className="mt-1 text-[8px] leading-relaxed text-text-faint">{selectedText ? "Changes apply to the selected text layer." : "Choose a font and style to use for the next text object."}</p>
      </section>
    </div>
  );
}
