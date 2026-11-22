"use client";

import { AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, ChevronRight, Minus, Plus, Trash2 } from "lucide-react";
import { useId, useMemo, useState } from "react";
import type { EditorArtworkLayer, EditorBrushBlend, EditorBrushShape, EditorBrushSettings, EditorEraserSettings, EditorGradient, EditorGradientStop, EditorGradientToolSettings, EditorGradientType, EditorLayerPlacement, EditorPenSettings, EditorShapeBuilderMode, EditorShapePreset, EditorShapeStyle, EditorTextContent, EditorTextEffect, EditorTextEffectKind, EditorTextToolSettings, EditorToolOptions, PhotoAdjustmentUpdate } from "@/lib/editor-layers";
import { createEditorShapePaths, EDITOR_BRUSH_BLENDS, EDITOR_BRUSH_PRESETS, EDITOR_DESIGN_SWATCHES, EDITOR_ERASER_PRESETS, EDITOR_SHAPE_LABELS, EDITOR_SHAPE_PRESETS, EDITOR_TEXT_FONT_FAMILY, EDITOR_GRADIENT_LABELS, EDITOR_GRADIENT_PRESETS, EDITOR_GRADIENT_STOP_LIMIT, EDITOR_GRADIENT_TYPES, EDITOR_SHAPE_LINE_STYLES, EDITOR_TEXT_STYLES, EDITOR_TOOL_OPTIONS_DEFAULT, nextEditorGradientStopId, resolveEditorShapeStyle, sortEditorGradientStops, textStyleEffects } from "@/lib/editor-layers";
import type { EditorTool } from "@/components/EditorToolsBar";
import EditorPhotoAdjustments from "@/components/EditorPhotoAdjustments";
import { IMAGE_PRINT_LEVEL_LABEL, type ImagePrintQuality } from "@/lib/editor-image-ppi";
import { EditorTextArtwork } from "@/components/EditorLayerPreview";
import { useEditorFontLibrary } from "@/lib/editor-font-library";

const PANEL_WIDTH = "min(16rem, 86vw)";
const TOOL_LABELS: Record<EditorTool, string> = {
  move: "Move",
  hand: "Hand",
  pencil: "Pencil",
  pen: "Pen",
  text: "Text",
  brush: "Brush",
  eraser: "Eraser",
  shape: "Shape",
  gradient: "Gradient",
  "remove-bg": "Remove BG",
};
// Families offered by the Text tool box. The first entry is the app font stack,
// the rest are plain family names so they match what the Font list writes.
const TEXT_TOOL_FONTS = [
  { label: "Inter", value: EDITOR_TEXT_FONT_FAMILY },
  { label: "Arial", value: "Arial" },
  { label: "Georgia", value: "Georgia" },
  { label: "Impact", value: "Impact" },
  { label: "Courier New", value: "Courier New" },
  { label: "Trebuchet MS", value: "Trebuchet MS" },
  { label: "Verdana", value: "Verdana" },
  { label: "Times New Roman", value: "Times New Roman" },
];

const TOOL_OPTION_HINTS: Partial<Record<EditorTool, string>> = {
  move: "Drag the canvas to move the selected layer. Adjust a layer's own size, opacity, and blend under Appearance.",
  hand: "Drag to pan the workspace view. Zoom stays available from the canvas controls.",
  text: "Select a text layer to edit its font, size, color, alignment, effects, and decoration.",
  shape: "Pick a shape from the Shape chip, then drag on the canvas to draw it into the active layer.",
  gradient: "Pick a shape and preset, then drag on the canvas to lay a gradient on a new layer. Drag a selected gradient layer to re-aim its axis; fine-tune stops under Gradient.",
  "remove-bg": "Upload a photo layer to use background removal. The image service is not connected yet.",
};
type ToolOptionsPatch = {
  brush?: Partial<EditorBrushSettings>;
  pencil?: Partial<EditorBrushSettings>;
  eraser?: Partial<EditorEraserSettings>;
  pen?: Partial<EditorPenSettings>;
  gradient?: Partial<EditorGradientToolSettings>;
  text?: Partial<EditorTextToolSettings>;
};
type TextStyleUpdate = Partial<Pick<EditorTextContent, "fontSize" | "color" | "fontFamily" | "fontWeight" | "fontStyle" | "textAlign" | "underline" | "letterSpacing" | "lineHeight" | "textTransform" | "textEffect" | "effectColor" | "effectOffset" | "effectBlur" | "outlineWidth" | "textDecoration" | "decorationColor" | "decorationWidth" | "effects">>;
const EFFECT_TYPES: { kind: EditorTextEffectKind; label: string; color: string }[] = [
  { kind: "shadow", label: "Shadow", color: "#111827" },
  { kind: "outline", label: "Outline", color: "#d4ff3f" },
  { kind: "glow", label: "Glow", color: "#d4ff3f" },
  { kind: "offset", label: "Offset", color: "#ff5b8a" },
  { kind: "echo", label: "Echo", color: "#37d7ff" },
  { kind: "extrude", label: "Extrude", color: "#7c3aed" },
  { kind: "stripe", label: "Stripe", color: "#f97316" },
  { kind: "blur", label: "Blur", color: "#ffffff" },
  { kind: "gradient", label: "Gradient", color: "#37d7ff" },
  { kind: "pattern", label: "Pattern", color: "#d4ff3f" },
  { kind: "hollow", label: "Hollow", color: "#d4ff3f" },
  { kind: "bevel", label: "Bevel", color: "#334155" },
  { kind: "gloss", label: "Gloss", color: "#ffffff" },
];

/** The sample stack each effect tile paints, so the tile shows the effect it adds. */
function effectSample(effect: EditorTextEffect): EditorTextContent {
  return { value: "Aa", x: 50, y: 60, fontSize: 46, color: "#ffffff", textAlign: "center", effects: [effect] };
}

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

function RangeField({ label, value, min, max, step = 1, suffix, ariaLabel, onChange }: { label: string; value: number; min: number; max: number; step?: number; suffix?: string; ariaLabel: string; onChange: (value: number) => void }) {
  return <label className="block text-[10px] text-text-secondary">{label}<span className="float-right font-semibold text-text-primary">{value}{suffix}</span><input aria-label={ariaLabel} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-2 h-1.5 w-full cursor-pointer accent-[var(--accent)]" /></label>;
}

// Brand colours for text, fill, stroke and frame borders, so a design stays on
// palette without opening a colour wheel.
function Swatches({ value, ariaLabel, onPick }: { value: string; ariaLabel: string; onPick: (color: string) => void }) {
  return <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-1">
    {EDITOR_DESIGN_SWATCHES.map((swatch) => <button key={swatch.name} type="button" title={swatch.name} aria-label={`${ariaLabel} ${swatch.name}`} aria-pressed={value.toLowerCase() === swatch.value.toLowerCase()} onClick={() => onPick(swatch.value)} className="h-5 w-5 rounded-md border border-border outline-none transition hover:scale-110 aria-pressed:ring-2 aria-pressed:ring-accent [@media(pointer:coarse)]:h-7 [@media(pointer:coarse)]:w-7" style={{ background: swatch.value }} />)}
  </div>;
}

function BrushOptions({ label, value, onChange, onReset }: { label: string; value: EditorBrushSettings; onChange: (patch: Partial<EditorBrushSettings>) => void; onReset: () => void }) {
  const square = value.shape === "square";
  return <div className="space-y-3">
    <div className="space-y-1.5">
      <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted">Presets</p>
      <div role="group" aria-label={`${label} presets`} className="grid grid-cols-3 gap-1">{EDITOR_BRUSH_PRESETS.map((preset) => <button key={preset.id} type="button" aria-label={`${label} preset ${preset.label}`} onClick={() => onChange(preset.settings)} className="flex flex-col items-center gap-0.5 rounded-lg border border-border px-1 py-1 text-[8px] leading-tight text-text-secondary outline-none hover:border-accent hover:bg-accent/10 [@media(pointer:coarse)]:min-h-11">
        <NibPreview size={preset.settings.size} shape={preset.settings.shape} angle={preset.settings.angle} roundness={preset.settings.roundness} softness={preset.settings.softness} opacity={Math.max(0.5, preset.settings.opacity)} scatter={preset.settings.scatter} className="h-5 w-full text-text-primary" />
        {preset.label}
      </button>)}</div>
      <div aria-label={`${label} stroke preview`} className="flex items-center gap-2 rounded-lg border border-border bg-[#151c20] px-2 py-1">
        <NibPreview size={value.size} shape={value.shape} angle={value.angle} roundness={value.roundness} softness={value.softness} opacity={value.opacity} scatter={value.scatter} className="h-6 flex-1 text-white" />
        <span className="shrink-0 text-[8px] uppercase tracking-wider text-text-muted">{Math.round(value.opacity * 100)}% · {value.flow}% flow</span>
      </div>
    </div>

    <div className="space-y-1.5">
      <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted">Nib</p>
      <OptionGroup label="Tip" ariaLabel={`${label} shape`} options={[{ value: "round", label: "Round" }, { value: "square", label: "Square" }]} value={value.shape} onChange={(shape) => onChange({ shape: shape as EditorBrushShape })} />
      <RangeField label="Size" value={value.size} min={1} max={400} suffix="px" ariaLabel={`${label} size`} onChange={(size) => onChange({ size })} />
      {square && <>
        <RangeField label="Angle" value={value.angle} min={-180} max={180} suffix="°" ariaLabel={`${label} angle`} onChange={(angle) => onChange({ angle })} />
        <RangeField label="Roundness" value={value.roundness} min={0} max={100} suffix="%" ariaLabel={`${label} roundness`} onChange={(roundness) => onChange({ roundness })} />
      </>}
    </div>

    <div className="space-y-1.5">
      <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted">Paint</p>
      <RangeField label="Opacity" value={Math.round(value.opacity * 100)} min={1} max={100} suffix="%" ariaLabel={`${label} opacity`} onChange={(percent) => onChange({ opacity: percent / 100 })} />
      <RangeField label="Flow" value={value.flow} min={1} max={100} suffix="%" ariaLabel={`${label} flow`} onChange={(flow) => onChange({ flow })} />
      <RangeField label="Spacing" value={value.spacing} min={1} max={100} suffix="%" ariaLabel={`${label} spacing`} onChange={(spacing) => onChange({ spacing })} />
      <RangeField label="Smoothing" value={value.smoothing} min={1} max={10} suffix="×" ariaLabel={`${label} smoothing`} onChange={(smoothing) => onChange({ smoothing })} />
    </div>

    <div className="space-y-1.5">
      <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted">Edge</p>
      <RangeField label="Softness" value={value.softness} min={0} max={100} suffix="%" ariaLabel={`${label} softness`} onChange={(softness) => onChange({ softness })} />
      <RangeField label="Feather" value={value.feather} min={0} max={100} suffix="%" ariaLabel={`${label} feather`} onChange={(feather) => onChange({ feather })} />
    </div>

    <div className="space-y-1.5">
      <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted">Shape dynamics</p>
      <RangeField label="Size jitter" value={value.sizeJitter} min={0} max={100} suffix="%" ariaLabel={`${label} size jitter`} onChange={(sizeJitter) => onChange({ sizeJitter })} />
      <RangeField label="Opacity jitter" value={value.opacityJitter} min={0} max={100} suffix="%" ariaLabel={`${label} opacity jitter`} onChange={(opacityJitter) => onChange({ opacityJitter })} />
      {(value.sizeJitter > 0 || value.opacityJitter > 0) && <RangeField label="Jitter floor" value={value.jitterMinimum} min={0} max={100} suffix="%" ariaLabel={`${label} jitter floor`} onChange={(jitterMinimum) => onChange({ jitterMinimum })} />}
      <RangeField label="Scatter" value={value.scatter} min={0} max={100} suffix="%" ariaLabel={`${label} scatter`} onChange={(scatter) => onChange({ scatter })} />
      <RangeField label="Angle jitter" value={value.angleJitter} min={0} max={100} suffix="%" ariaLabel={`${label} angle jitter`} onChange={(angleJitter) => onChange({ angleJitter })} />
      <RangeField label="Roundness jitter" value={value.roundnessJitter} min={0} max={100} suffix="%" ariaLabel={`${label} roundness jitter`} onChange={(roundnessJitter) => onChange({ roundnessJitter })} />
      <label className="flex items-center justify-between gap-2 text-[10px] text-text-secondary"><span>Fade out tail</span><input aria-label={`${label} fade out`} type="checkbox" checked={value.fadeOut} onChange={(event) => onChange({ fadeOut: event.target.checked })} className="h-3.5 w-3.5 accent-[var(--accent)]" /></label>
    </div>

    <div className="space-y-1.5">
      <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted">Blending</p>
      <OptionGroup label="Dab blend" ariaLabel={`${label} blend`} options={EDITOR_BRUSH_BLENDS.map((blend) => ({ value: blend, label: blend }))} value={value.blend} onChange={(blend) => onChange({ blend: blend as EditorBrushBlend })} />
    </div>

    <button type="button" aria-label={`Reset ${label} to its default`} onClick={onReset} className="w-full rounded-lg border border-border px-2 py-1.5 text-[10px] font-semibold text-text-secondary outline-none hover:border-accent hover:bg-accent/10">Reset {label.toLowerCase()} to default</button>

    <p className="text-[9px] leading-relaxed text-text-muted">Flow, spacing, jitter, and smoothing build one {label.toLowerCase()} stroke from spaced nib dabs. These values apply to the next stroke you draw and stay until you change them.</p>
  </div>;
}


/** A row of nib dabs at the current settings, so a preset shows what it paints. */
function NibPreview({ size, shape, angle = 0, roundness = 100, softness = 0, opacity = 1, scatter = 0, className }: {
  size: number; shape: EditorBrushShape; angle?: number; roundness?: number; softness?: number; opacity?: number; scatter?: number; className?: string;
}) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const filterId = `nib-soft-${id}`;
  const radius = Math.max(1.4, Math.min(6.5, size / 16));
  const soft = Math.max(0, Math.min(100, softness));
  const dabs = [0, 1, 2, 3, 4, 5];
  return <svg viewBox="0 0 64 24" className={className} aria-hidden="true">
    <defs>
      {soft > 0 && <filter id={filterId} x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation={soft / 30} /></filter>}
    </defs>
    {dabs.map((index) => {
      const t = index / (dabs.length - 1);
      const cx = 8 + t * 48;
      const cy = 12 - Math.sin(t * Math.PI) * 2.5 + ((index % 2) - 0.5) * (scatter / 100) * 5;
      return shape === "square"
        ? <rect key={index} x={cx - radius} y={cy - radius} width={radius * 2} height={radius * 2} rx={(radius * roundness) / 100} fill="currentColor" opacity={opacity} transform={`rotate(${angle} ${cx} ${cy})`} filter={soft > 0 ? `url(#${filterId})` : undefined} />
        : <circle key={index} cx={cx} cy={cy} r={radius} fill="currentColor" opacity={opacity} filter={soft > 0 ? `url(#${filterId})` : undefined} />;
    })}
  </svg>;
}

/** A preset tile that paints the real effect stack, the way Kittl and Canva show their styles. */
function TextStyleTile({ preset, active, onApply }: { preset: (typeof EDITOR_TEXT_STYLES)[number]; active: boolean; onApply: () => void }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const sample: EditorTextContent = {
    value: "Aa",
    x: 50,
    y: 58,
    fontSize: 44,
    color: "#ffffff",
    textAlign: "center",
    effects: textStyleEffects(preset, `tile-${id}`),
  };
  return <button type="button" aria-label={`Apply ${preset.label} text style`} aria-pressed={active} title={preset.hint} onClick={onApply} className="rounded-lg border border-border p-1 text-left outline-none transition hover:border-accent hover:bg-accent/10 aria-pressed:border-accent aria-pressed:bg-accent/15 [@media(pointer:coarse)]:min-h-11">
    <span className="flex h-12 items-center justify-center overflow-hidden rounded-md bg-[#151c20] text-white"><svg viewBox="0 0 100 76" className="h-12 w-full"><EditorTextArtwork text={sample} idPrefix={`tile-${id}`} /></svg></span>
    <span className="mt-1 block text-[9px] font-semibold text-text-primary">{preset.label}</span>
  </button>;
}

/** A warp preset, painted on the sample so the tile shows the bend it applies. */
function TextTransformTile({ shape, label, active, onApply }: { shape: "none" | "arch" | "wave"; label: string; active: boolean; onApply: () => void }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const sample: EditorTextContent = { value: "Aa", x: 50, y: 58, fontSize: 44, color: "#ffffff", textAlign: "center", textTransform: shape };
  return <button type="button" aria-label={`Text transform ${shape}`} aria-pressed={active} onClick={onApply} className="rounded-lg border border-border p-0.5 outline-none transition hover:border-accent hover:bg-accent/10 aria-pressed:border-accent aria-pressed:bg-accent/15 [@media(pointer:coarse)]:min-h-11">
    <span className="flex h-10 items-center justify-center overflow-hidden rounded-md bg-[#151c20] text-white"><svg viewBox="0 0 100 78" className="h-10 w-full"><EditorTextArtwork text={sample} idPrefix={`warp-${id}`} /></svg></span>
    <span className="mt-0.5 block text-center text-[8px] leading-tight text-text-secondary">{label}</span>
  </button>;
}

/** One effect, painted on a sample "Aa" — Kittl lists effects as pictures, not names. */
function EffectTile({ kind, label, color, active, onApply }: { kind: EditorTextEffectKind; label: string; color: string; active: boolean; onApply: () => void }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const effect: EditorTextEffect = kind === "pattern"
    ? { id: `tile-${id}`, kind, color, color2: "#1b2430", pattern: "dots", distance: 14 }
    : kind === "hollow"
      ? { id: `tile-${id}`, kind, color, width: 5 }
      : { id: `tile-${id}`, kind, color, color2: "#d4ff3f" };
  return <button type="button" aria-label={`Apply text ${kind}`} aria-pressed={active} title={label} onClick={onApply} className="rounded-lg border border-border p-0.5 outline-none transition hover:border-accent hover:bg-accent/10 aria-pressed:border-accent aria-pressed:bg-accent/15 [@media(pointer:coarse)]:min-h-11">
    <span className="flex h-9 items-center justify-center overflow-hidden rounded-md bg-[#151c20] text-white"><svg viewBox="0 0 100 78" className="h-9 w-full"><EditorTextArtwork text={effectSample(effect)} idPrefix={`fx-${id}`} /></svg></span>
    <span className="mt-0.5 block truncate text-[8px] leading-tight text-text-secondary">{label}</span>
  </button>;
}

/** The nine shapes the tool draws, drawn with the same path builder the canvas uses. */
function ShapePresetIcon({ preset }: { preset: EditorShapePreset }) {
  const paths = createEditorShapePaths(preset, { x: 24, y: 22 }, { x: 76, y: 78 }, "currentColor");
  return <svg viewBox="0 0 100 100" className="mx-auto h-6 w-6" aria-hidden="true">{paths.map((path, index) => <path key={index} d={path.d} fill={path.fill} stroke={path.stroke} strokeWidth={Math.min(10, path.strokeWidth ?? 10)} strokeLinecap="round" strokeLinejoin="round" />)}</svg>;
}

function OptionGroup({ label, ariaLabel, options, value, onChange }: { label: string; ariaLabel: string; options: { value: string; label: string }[]; value: string; onChange: (value: string) => void }) {
  return <div className="flex items-center justify-between gap-2 text-[10px] text-text-secondary"><span className="shrink-0">{label}</span><div role="group" aria-label={ariaLabel} className="flex flex-wrap justify-end gap-1">{options.map((option) => <button key={option.value} type="button" aria-label={`${ariaLabel} ${option.label}`} aria-pressed={value === option.value} onClick={() => onChange(option.value)} className="rounded-lg border border-border px-2 py-1 capitalize aria-pressed:border-accent aria-pressed:bg-accent/15 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:px-2.5">{option.label}</button>)}</div></div>;
}

function EraserOptions({ value, onChange, onClear, canClear }: { value: EditorEraserSettings; onChange: (patch: Partial<EditorEraserSettings>) => void; onClear: () => void; canClear: boolean }) {
  const square = value.shape === "square";
  return <div className="space-y-2">
    <div className="space-y-1.5">
      <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted">Nib presets</p>
      <div role="group" aria-label="Eraser presets" className="grid grid-cols-4 gap-1">{EDITOR_ERASER_PRESETS.map((preset) => <button key={preset.id} type="button" aria-label={`Eraser preset ${preset.label}`} onClick={() => onChange(preset.settings)} className="flex flex-col items-center gap-0.5 rounded-lg border border-border px-1 py-1 text-[8px] leading-tight text-text-secondary outline-none hover:border-accent hover:bg-accent/10 [@media(pointer:coarse)]:min-h-11">
        <NibPreview size={preset.settings.size ?? 120} shape={(preset.settings.shape ?? "round") as EditorBrushShape} angle={preset.settings.angle ?? 0} roundness={preset.settings.roundness ?? 100} softness={100 - (preset.settings.hardness ?? 60)} opacity={Math.max(0.5, (preset.settings.opacity ?? 100) / 100)} className="h-4 w-full text-text-primary" />
        {preset.label}
      </button>)}</div>
    </div>
    <OptionGroup label="Mode" ariaLabel="Eraser mode" options={[{ value: "brush", label: "Brush" }, { value: "stroke", label: "Stroke" }]} value={value.mode} onChange={(mode) => onChange({ mode: mode as EditorEraserSettings["mode"] })} />
    <OptionGroup label="Nib" ariaLabel="Eraser nib" options={[{ value: "round", label: "Round" }, { value: "square", label: "Square" }]} value={value.shape} onChange={(shape) => onChange({ shape: shape as EditorBrushShape })} />
    <RangeField label="Size" value={value.size} min={10} max={600} suffix="px" ariaLabel="Eraser size" onChange={(size) => onChange({ size })} />
    <RangeField label="Hardness" value={value.hardness} min={0} max={100} suffix="%" ariaLabel="Eraser hardness" onChange={(hardness) => onChange({ hardness })} />
    <RangeField label="Opacity" value={value.opacity} min={1} max={100} suffix="%" ariaLabel="Eraser opacity" onChange={(opacity) => onChange({ opacity })} />
    <RangeField label="Flow" value={value.flow} min={1} max={100} suffix="%" ariaLabel="Eraser flow" onChange={(flow) => onChange({ flow })} />
    <RangeField label="Spacing" value={value.spacing} min={1} max={100} suffix="%" ariaLabel="Eraser spacing" onChange={(spacing) => onChange({ spacing })} />
    {square && <>
      <RangeField label="Angle" value={value.angle} min={-180} max={180} suffix="°" ariaLabel="Eraser angle" onChange={(angle) => onChange({ angle })} />
      <RangeField label="Roundness" value={value.roundness} min={0} max={100} suffix="%" ariaLabel="Eraser roundness" onChange={(roundness) => onChange({ roundness })} />
    </>}
    <p className="text-[9px] leading-relaxed text-text-muted">Brush mode paints a soft eraser nib that builds up as you drag. Stroke mode clears any whole stroke whose points fall under the nib. Hardness 0% is fully feathered; higher flow erases more per pass. Locked layers are never erased.</p>
    <button type="button" aria-label="Clear erasures on this layer" disabled={!canClear} onClick={onClear} className="w-full rounded-lg border border-border px-2 py-1.5 text-[10px] font-semibold text-text-primary outline-none hover:border-accent hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-40">Clear erasures on this layer</button>
  </div>;
}

/** Defaults for new text layers: size, family, weight, alignment, colour, tracking. */
function TextToolOptions({ value, onChange }: { value: EditorTextToolSettings; onChange: (patch: Partial<EditorTextToolSettings>) => void }) {
  return <div className="space-y-2.5">
    <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted">A new text layer starts with</p>
    <RangeField label="Size" value={value.fontSize} min={20} max={400} suffix="px" ariaLabel="Text tool font size" onChange={(fontSize) => onChange({ fontSize })} />
    <label className="flex items-center justify-between gap-2 text-[10px] text-text-secondary">Font<select aria-label="Text tool font family" value={value.fontFamily} onChange={(event) => onChange({ fontFamily: event.target.value })} className="max-w-[150px] rounded-lg border border-border bg-bg px-1.5 py-1 text-[10px] text-text-primary outline-none">{TEXT_TOOL_FONTS.map((font) => <option key={font.label} value={font.value}>{font.label}</option>)}</select></label>
    <OptionGroup label="Weight" ariaLabel="Text tool weight" options={[{ value: "300", label: "Light" }, { value: "400", label: "Regular" }, { value: "700", label: "Bold" }, { value: "900", label: "Black" }]} value={String(value.fontWeight)} onChange={(weight) => onChange({ fontWeight: Number(weight) })} />
    <OptionGroup label="Align" ariaLabel="Text tool alignment" options={[{ value: "left", label: "Left" }, { value: "center", label: "Centre" }, { value: "right", label: "Right" }]} value={value.textAlign} onChange={(textAlign) => onChange({ textAlign: textAlign as EditorTextToolSettings["textAlign"] })} />
    <RangeField label="Letter spacing" value={value.letterSpacing} min={0} max={40} suffix="px" ariaLabel="Text tool letter spacing" onChange={(letterSpacing) => onChange({ letterSpacing })} />
    <div className="flex items-center justify-between gap-2 text-[10px] text-text-secondary"><span>Colour</span><div className="flex items-center gap-1">
      <button type="button" aria-label="Text tool follow the toolbar colour" aria-pressed={value.color === null} onClick={() => onChange({ color: null })} className="rounded-lg border border-border px-2 py-1 text-[9px] outline-none hover:border-accent aria-pressed:border-accent aria-pressed:bg-accent/15 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:px-3">Toolbar</button>
      <input aria-label="Text tool colour" type="color" value={value.color ?? "#111111"} onChange={(event) => onChange({ color: event.target.value })} className="h-7 w-10 rounded-lg border border-border p-0.5" />
    </div></div>
    <Swatches value={value.color ?? "#111111"} ariaLabel="Text tool colour swatch" onPick={(color) => onChange({ color })} />
    <p className="text-[9px] leading-relaxed text-text-muted">These values are written into every new text layer; existing text keeps its own font and colour. Pick Toolbar to follow the foreground colour again.</p>
  </div>;
}

/** Which shape the Shape tool draws, plus a reminder of how the style is applied. */
function ShapeToolOptions({ preset, onSelect }: { preset: EditorShapePreset; onSelect: (preset: EditorShapePreset) => void }) {
  return <div className="space-y-2">
    <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted">Shape to draw</p>
    <div role="group" aria-label="Shape tool preset" className="grid grid-cols-3 gap-1">{EDITOR_SHAPE_PRESETS.map((option) => <button key={option} type="button" aria-label={`Shape tool ${EDITOR_SHAPE_LABELS[option]}`} aria-pressed={preset === option} onClick={() => onSelect(option)} className="flex min-h-8 flex-col items-center gap-0.5 rounded-lg border border-border px-1 py-1 text-[8px] leading-tight text-text-secondary outline-none transition hover:border-accent hover:bg-accent/10 aria-pressed:border-accent aria-pressed:bg-accent/15 aria-pressed:text-accent [@media(pointer:coarse)]:min-h-11"><ShapePresetIcon preset={option} />{EDITOR_SHAPE_LABELS[option]}</button>)}</div>
    <p className="text-[9px] leading-relaxed text-text-muted">The shape lands in the selected layer with the foreground colour. Adjust fill, stroke, corners, shadow and glow under Shape once it is drawn.</p>
  </div>;
}

/** Arrow pad for the Move tool: nudge the selection without dragging it. */
function MoveToolOptions({ placement, onNudge }: { placement: EditorLayerPlacement | null; onNudge: (dx: number, dy: number) => void }) {
  const [step, setStep] = useState(10);
  const pad = "flex min-h-8 items-center justify-center rounded-lg border border-border text-[11px] text-text-secondary outline-none transition hover:border-accent hover:bg-accent/10 [@media(pointer:coarse)]:min-h-11";
  return <div className="space-y-2">
    <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted">Nudge the selection</p>
    <div role="group" aria-label="Nudge step" className="flex gap-1">{[1, 10, 50].map((option) => <button key={option} type="button" aria-label={`Nudge step ${option}`} aria-pressed={step === option} onClick={() => setStep(option)} className="flex-1 rounded-lg border border-border px-2 py-1 text-[9px] outline-none hover:border-accent aria-pressed:border-accent aria-pressed:bg-accent/15 [@media(pointer:coarse)]:min-h-11">{option} u</button>)}</div>
    <div role="group" aria-label="Nudge selected layer" className="mx-auto grid w-36 grid-cols-3 gap-1">
      <span aria-hidden="true" />
      <button type="button" aria-label="Nudge layer up" onClick={() => onNudge(0, -step)} className={pad}>↑</button>
      <span aria-hidden="true" />
      <button type="button" aria-label="Nudge layer left" onClick={() => onNudge(-step, 0)} className={pad}>←</button>
      <button type="button" aria-label="Nudge layer down" onClick={() => onNudge(0, step)} className={pad}>↓</button>
      <button type="button" aria-label="Nudge layer right" onClick={() => onNudge(step, 0)} className={pad}>→</button>
    </div>
    <p aria-label="Nudge readout" className="text-center text-[9px] text-text-muted">Offset {Math.round(placement?.offset.x ?? 0)} · {Math.round(placement?.offset.y ?? 0)} units</p>
    <p className="text-[9px] leading-relaxed text-text-muted">The nudge moves the layer&apos;s canvas offset only, so the artwork stays put inside its own transform.</p>
  </div>;
}

function GradientPreviewBar({ stops }: { stops: EditorGradientStop[] }) {
  const sorted = sortEditorGradientStops(stops);
  const css = sorted.map((stop) => `${stop.color} ${stop.offset}%`).join(", ");
  return <span aria-hidden="true" className="block h-5 w-full rounded-md border border-border" style={{ backgroundImage: `linear-gradient(90deg, ${css})` }} />;
}

function GradientOptions({ value, onChange }: { value: EditorGradientToolSettings; onChange: (patch: Partial<EditorGradientToolSettings>) => void }) {
  return <div className="space-y-3">
    <div className="space-y-1.5">
      <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted">Shape</p>
      <div role="group" aria-label="Gradient shape" className="grid grid-cols-3 gap-1">{EDITOR_GRADIENT_TYPES.map((type) => <button key={type} type="button" aria-label={`Gradient shape ${EDITOR_GRADIENT_LABELS[type]}`} aria-pressed={value.type === type} onClick={() => onChange({ type })} className="rounded-lg border border-border px-1 py-1.5 text-[9px] outline-none hover:border-accent hover:bg-accent/10 aria-pressed:border-accent aria-pressed:bg-accent/15 [@media(pointer:coarse)]:min-h-11">{EDITOR_GRADIENT_LABELS[type]}</button>)}</div>
    </div>
    <div className="space-y-1.5">
      <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted">Preset</p>
      <div role="group" aria-label="Gradient preset" className="grid grid-cols-2 gap-1.5">
        {EDITOR_GRADIENT_PRESETS.map((preset) => <button key={preset.id} type="button" aria-label={`Gradient preset ${preset.label}`} aria-pressed={value.presetId === preset.id} onClick={() => onChange({ presetId: preset.id })} className="space-y-1 rounded-lg border border-border p-1 text-left outline-none hover:border-accent aria-pressed:border-accent aria-pressed:bg-accent/10">
          <GradientPreviewBar stops={preset.stops.map((stop, index) => ({ id: `${preset.id}-${index}`, offset: stop.offset, color: stop.color, opacity: stop.opacity }))} />
          <span className="block truncate text-[9px] text-text-secondary">{preset.label}</span>
        </button>)}
      </div>
    </div>
    <label className="flex items-center justify-between gap-2 text-[10px] text-text-secondary"><span>Reverse the ramp</span><input aria-label="Gradient reverse" type="checkbox" checked={value.reverse} onChange={(event) => onChange({ reverse: event.target.checked })} className="h-3.5 w-3.5 accent-[var(--accent)]" /></label>
    <p className="text-[9px] leading-relaxed text-text-muted">Pick a shape and preset, then drag on the canvas to lay the gradient. Drag again on a selected gradient layer to re-aim it; edit its stops under Gradient below.</p>
  </div>;
}

/** A gradient strip: draggable stop handles over a live preview ramp. */
function GradientEditor({ gradient, onChange }: { gradient: EditorGradient; onChange: (gradient: EditorGradient) => void }) {
  const sorted = sortEditorGradientStops(gradient.stops);
  const css = sorted.map((stop) => `${stop.color} ${stop.offset}%`).join(", ");
  const activeStop = (id: string | null) => sorted.find((stop) => stop.id === id) ?? sorted[0];
  const [selectedStopId, setSelectedStopId] = useState<string | null>(sorted[0]?.id ?? null);
  const selected = activeStop(selectedStopId);
  const commit = (stops: EditorGradientStop[]) => onChange({ ...gradient, stops: sortEditorGradientStops(stops) });
  function updateStop(id: string, patch: Partial<EditorGradientStop>) {
    commit(gradient.stops.map((stop) => stop.id === id ? { ...stop, ...patch } : stop));
  }
  function addStop() {
    if (gradient.stops.length >= EDITOR_GRADIENT_STOP_LIMIT) return;
    const sortedStops = sortEditorGradientStops(gradient.stops);
    // Drop the new stop in the widest gap, so it never lands on top of an existing handle.
    let bestGap = -1;
    let insertAt = 50;
    for (let index = 1; index < sortedStops.length; index += 1) {
      const gap = sortedStops[index].offset - sortedStops[index - 1].offset;
      if (gap > bestGap) {
        bestGap = gap;
        insertAt = (sortedStops[index].offset + sortedStops[index - 1].offset) / 2;
      }
    }
    const id = nextEditorGradientStopId();
    commit([...gradient.stops, { id, offset: Math.round(insertAt), color: "#808080", opacity: 1 }]);
    setSelectedStopId(id);
  }
  function removeStop(id: string) {
    if (gradient.stops.length <= 2) return;
    const next = gradient.stops.filter((stop) => stop.id !== id);
    commit(next);
    if (selectedStopId === id) setSelectedStopId(sortEditorGradientStops(next)[0]?.id ?? null);
  }
  return <div className="space-y-3">
    <div className="flex items-center justify-between gap-2 text-[10px] text-text-secondary"><span>Type</span><select aria-label="Gradient layer type" value={gradient.type} onChange={(event) => onChange({ ...gradient, type: event.target.value as EditorGradientType })} className="w-28 rounded-lg border border-border bg-bg px-2 py-1.5 text-[11px] text-text-primary">{EDITOR_GRADIENT_TYPES.map((type) => <option key={type} value={type}>{EDITOR_GRADIENT_LABELS[type]}</option>)}</select></div>

    <div className="relative pt-1">
      <span aria-hidden="true" className="block h-6 w-full rounded-md border border-border" style={{ backgroundImage: `linear-gradient(90deg, ${css})` }} />
      <div role="group" aria-label="Gradient stop handles" className="relative mt-1 h-5">
        {sorted.map((stop) => <button key={stop.id} type="button" aria-label={`Gradient stop at ${stop.offset}%`} aria-pressed={selected?.id === stop.id} onClick={() => setSelectedStopId(stop.id)} onDoubleClick={() => removeStop(stop.id)} className="absolute top-0 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white shadow aria-pressed:ring-2 aria-pressed:ring-accent" style={{ left: `${stop.offset}%`, backgroundColor: stop.color }} />)}
      </div>
      <div className="mt-1 flex items-center justify-between">
        <button type="button" aria-label="Add gradient stop" disabled={gradient.stops.length >= EDITOR_GRADIENT_STOP_LIMIT} onClick={addStop} className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[9px] text-text-secondary outline-none hover:border-accent hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-40"><Plus size={11} />Add stop</button>
        <span className="text-[9px] text-text-muted">{gradient.stops.length}/{EDITOR_GRADIENT_STOP_LIMIT} stops · double-click a handle to remove</span>
      </div>
    </div>

    {selected && <div className="space-y-2 rounded-lg border border-border/70 bg-bg/60 p-2">
      <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted">Selected stop</p>
      <label className="flex items-center justify-between gap-2 text-[10px] text-text-secondary">Color<input aria-label="Gradient stop color" type="color" value={selected.color} onChange={(event) => updateStop(selected.id, { color: event.target.value })} className="h-7 w-10 rounded-lg border border-border p-0.5" /></label>
      <RangeField label="Position" value={Math.round(selected.offset)} min={0} max={100} suffix="%" ariaLabel="Gradient stop position" onChange={(offset) => updateStop(selected.id, { offset })} />
      <RangeField label="Opacity" value={Math.round(selected.opacity * 100)} min={0} max={100} suffix="%" ariaLabel="Gradient stop opacity" onChange={(percent) => updateStop(selected.id, { opacity: percent / 100 })} />
      <div className="flex items-center justify-between gap-2 text-[10px] text-text-secondary"><span>Start / End</span><div className="flex gap-1"><input aria-label="Gradient axis start X" type="number" value={Math.round(gradient.x1)} onChange={(event) => onChange({ ...gradient, x1: Number(event.target.value) })} className="w-14 rounded-lg border border-border bg-bg px-1 py-1 text-right text-[10px]" /><input aria-label="Gradient axis start Y" type="number" value={Math.round(gradient.y1)} onChange={(event) => onChange({ ...gradient, y1: Number(event.target.value) })} className="w-14 rounded-lg border border-border bg-bg px-1 py-1 text-right text-[10px]" /></div></div>
      <div className="flex items-center justify-between gap-2 text-[10px] text-text-secondary"><span>End X / Y</span><div className="flex gap-1"><input aria-label="Gradient axis end X" type="number" value={Math.round(gradient.x2)} onChange={(event) => onChange({ ...gradient, x2: Number(event.target.value) })} className="w-14 rounded-lg border border-border bg-bg px-1 py-1 text-right text-[10px]" /><input aria-label="Gradient axis end Y" type="number" value={Math.round(gradient.y2)} onChange={(event) => onChange({ ...gradient, y2: Number(event.target.value) })} className="w-14 rounded-lg border border-border bg-bg px-1 py-1 text-right text-[10px]" /></div></div>
    </div>}
    <p className="text-[9px] leading-relaxed text-text-muted">Drag a handle to move a stop, add one to split a ramp, and double-click to remove. The axis Start and End set the gradient direction and length.</p>
  </div>;
}

const PRINT_LEVEL_CLASS: Record<ImagePrintQuality["level"], string> = {
  good: "bg-[#dff0d8] text-[#2f5c25] dark:bg-[#2c3b26] dark:text-[#bfe0ae]",
  low: "bg-[#fdf0c8] text-[#7a5a10] dark:bg-[#403522] dark:text-[#f0d99a]",
  "very-low": "bg-[#f8d7d7] text-[#8a2020] dark:bg-[#432323] dark:text-[#f0b4b4]",
};

export default function EditorAdjustmentsPanel({ open, onToggle, selectedLayer, activeTool, toolOptions, onUpdateToolOptions, onUpdateLayer, onUpdateText, onUpdateTextStyle, onUpdateShapeBuilder, onUpdateShapeStyle, onUpdateImage, imagePrintQuality = null, onUpdateGradient, onAddMask, onRemoveMask, onSelectMask, onClearErasures, placement, selectedShape, onSelectShape, onNudge }: {
  open: boolean;
  onToggle: () => void;
  selectedLayer: EditorArtworkLayer | null;
  activeTool: EditorTool;
  toolOptions: EditorToolOptions;
  onUpdateToolOptions: (patch: ToolOptionsPatch) => void;
  onUpdateLayer: (id: string, update: Partial<Pick<EditorArtworkLayer, "opacity" | "fillOpacity" | "blendMode">>) => void;
  onUpdateText: (value: string) => void;
  onUpdateTextStyle: (update: TextStyleUpdate) => void;
  onUpdateShapeBuilder: (mode: EditorShapeBuilderMode) => void;
  onUpdateShapeStyle: (update: Partial<EditorShapeStyle>) => void;
  onUpdateImage: (update: PhotoAdjustmentUpdate) => void;
  /** Print resolution of the selected photo, or null when its pixel size is unknown. */
  imagePrintQuality?: ImagePrintQuality | null;
  onUpdateGradient: (gradient: EditorGradient) => void;
  onAddMask: (id: string) => void;
  onRemoveMask: (id: string) => void;
  onSelectMask: () => void;
  onClearErasures: () => void;
  placement: EditorLayerPlacement | null;
  selectedShape: EditorShapePreset;
  onSelectShape: (preset: EditorShapePreset) => void;
  onNudge: (dx: number, dy: number) => void;
}) {
  const text = selectedLayer?.text;
  const image = selectedLayer?.image;
  const shapeStyle = selectedLayer?.shape ? resolveEditorShapeStyle(selectedLayer.shape) : null;
  const [fontQuery, setFontQuery] = useState("");
  const [recentFonts, setRecentFonts] = useState<string[]>([]);
  const [nextEffectId, setNextEffectId] = useState(1);
  const [appliedStyle, setAppliedStyle] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState("Tool Options");
  // The hosted library replaces the eight system fonts once `fonts/manifest.json` exists in R2. An open
  // Font section also loads one file per font, so each name in the list paints in its own face.
  const fontLibrary = useEditorFontLibrary(
    text ? [text.fontFamily ?? EDITOR_TEXT_FONT_FAMILY] : [],
    { preview: openSection === "Font" },
  );
  const effectStack: EditorTextEffect[] = text ? text.effects ?? (text.textEffect === "shadow"
    ? [{ id: "legacy-shadow", kind: "shadow", color: text.effectColor ?? "#000000", offsetX: text.effectOffset ?? 12, offsetY: text.effectOffset ?? 12, blur: text.effectBlur ?? 0 }]
    : text.textEffect === "outline"
      ? [{ id: "legacy-outline", kind: "outline", color: text.effectColor ?? "#000000", width: text.outlineWidth ?? 6 }]
      : []) : [];
  const filteredFonts = useMemo(() => {
    const needle = fontQuery.trim().toLowerCase();
    return fontLibrary.names.filter((font) => !needle || font.toLowerCase().includes(needle));
  }, [fontLibrary.names, fontQuery]);
  function toggleSection(section: string) { setOpenSection((current) => current === section ? "" : section); }
  function chooseFont(fontFamily: string) {
    onUpdateTextStyle({ fontFamily });
    setRecentFonts((current) => [fontFamily, ...current.filter((font) => font !== fontFamily)].slice(0, 4));
  }
  function replaceEffectStack(effects: EditorTextEffect[], keepStyle = false) {
    onUpdateTextStyle({ effects, textEffect: "none" });
    if (!keepStyle) setAppliedStyle(null);
  }
  // A style preset is only an effect stack, so the layer stays live text.
  function applyTextStyle(id: string) {
    const preset = EDITOR_TEXT_STYLES.find((item) => item.id === id);
    if (!preset) return;
    setAppliedStyle(id);
    replaceEffectStack(textStyleEffects(preset, `${nextEffectId}-${id}`), true);
    setNextEffectId((current) => current + 1);
  }
  function addTextEffect(kind: EditorTextEffectKind) {
    const preset = EFFECT_TYPES.find((item) => item.kind === kind);
    if (!preset) return;
    const usedIds = new Set(effectStack.map((effect) => effect.id));
    let nextId = nextEffectId;
    while (usedIds.has(`text-effect-${nextId}`)) nextId += 1;
    const id = `text-effect-${nextId}`;
    setNextEffectId(nextId + 1);
    replaceEffectStack([...effectStack, { id, kind, color: preset.color, enabled: true }]);
  }
  function updateTextEffect(id: string, update: Partial<EditorTextEffect>) {
    replaceEffectStack(effectStack.map((effect) => effect.id === id ? { ...effect, ...update } : effect));
  }
  function moveTextEffect(id: string, direction: -1 | 1) {
    const index = effectStack.findIndex((effect) => effect.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= effectStack.length) return;
    const next = [...effectStack];
    [next[index], next[target]] = [next[target], next[index]];
    replaceEffectStack(next);
  }
  return <>
    {open && <aside aria-label="Adjustments panel" data-dock-side="right" className="absolute inset-y-0 right-0 z-30 flex min-h-0 flex-col overflow-hidden border-l border-border bg-bg-surface text-text-primary shadow-xl dark:shadow-black/60" style={{ width: PANEL_WIDTH }}>
      <div aria-label="Adjustments panel title" className="flex h-11 shrink-0 items-center justify-between border-b border-border bg-bg px-3 text-text-primary shadow-sm [@media(pointer:coarse)]:h-12">
        <div><span role="heading" aria-level={2} className="text-[12px] font-semibold tracking-tight">Adjustments</span><span className="ml-2 rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent">Live</span></div>
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-accent shadow-[0_0_10px_#d4ff3f]" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <div className="space-y-2 text-[11px]">
          <Section title={`Tool Options · ${TOOL_LABELS[activeTool]}`} open={openSection === "Tool Options"} onToggle={() => toggleSection("Tool Options")}>
            {(activeTool === "brush" || activeTool === "pencil") && <BrushOptions
              label={activeTool === "brush" ? "Brush" : "Pencil"}
              value={activeTool === "brush" ? toolOptions.brush : toolOptions.pencil}
              onChange={(patch) => onUpdateToolOptions(activeTool === "brush" ? { brush: patch } : { pencil: patch })}
              onReset={() => onUpdateToolOptions(activeTool === "brush" ? { brush: EDITOR_TOOL_OPTIONS_DEFAULT.brush } : { pencil: EDITOR_TOOL_OPTIONS_DEFAULT.pencil })}
            />}
            {activeTool === "eraser" && <EraserOptions
              value={toolOptions.eraser}
              onChange={(patch) => onUpdateToolOptions({ eraser: patch })}
              onClear={onClearErasures}
              canClear={!!selectedLayer && !selectedLayer.locked && selectedLayer.erasures.length > 0}
            />}
            {activeTool === "pen" && <div className="space-y-2">
              <label className="block text-[10px] text-text-secondary">Path width<span className="float-right font-semibold text-text-primary">{toolOptions.pen.width}px</span><input aria-label="Pen path width" type="range" min="1" max="60" value={toolOptions.pen.width} onChange={(event) => onUpdateToolOptions({ pen: { width: Number(event.target.value) } })} className="mt-2 h-1.5 w-full cursor-pointer accent-[var(--accent)]" /></label>
              <div role="group" aria-label="Pen width presets" className="flex flex-wrap gap-1">{[1, 3, 6, 12, 24].map((width) => <button key={width} type="button" aria-label={`Pen width ${width} pixels`} aria-pressed={toolOptions.pen.width === width} onClick={() => onUpdateToolOptions({ pen: { width } })} className="flex-1 rounded-lg border border-border px-1 py-1 text-[9px] outline-none hover:border-accent aria-pressed:border-accent aria-pressed:bg-accent/15 [@media(pointer:coarse)]:min-h-11">{width}</button>)}</div>
              <div className="flex items-center justify-between gap-2 text-[10px] text-text-secondary"><span>Cap</span><div role="group" aria-label="Pen cap" className="flex gap-1">{(["round", "butt", "square"] as const).map((cap) => <button key={cap} type="button" aria-label={`Pen cap ${cap}`} aria-pressed={toolOptions.pen.cap === cap} onClick={() => onUpdateToolOptions({ pen: { cap } })} className="rounded-lg border border-border px-2 py-1 capitalize aria-pressed:border-accent aria-pressed:bg-accent/15">{cap}</button>)}</div></div>
              <p className="text-[9px] leading-relaxed text-text-muted">These values are saved as this tool&apos;s defaults for the next path you draw.</p>
            </div>}
            {activeTool === "gradient" && <GradientOptions
              value={toolOptions.gradient}
              onChange={(patch) => onUpdateToolOptions({ gradient: patch })}
            />}
            {activeTool === "text" && <TextToolOptions value={toolOptions.text} onChange={(patch) => onUpdateToolOptions({ text: patch })} />}
            {activeTool === "shape" && <ShapeToolOptions preset={selectedShape} onSelect={onSelectShape} />}
            {activeTool === "move" && <MoveToolOptions placement={placement} onNudge={onNudge} />}
            {(activeTool === "hand" || activeTool === "remove-bg") && <p className="text-[10px] leading-relaxed text-text-muted">{TOOL_OPTION_HINTS[activeTool]}</p>}
          </Section>
          {!selectedLayer && <p className="p-2 text-[11px] text-[#666] dark:text-[#bdbdbd]">Select a layer to edit its properties.</p>}
          {selectedLayer && <>
          <div className="rounded-xl border border-border/70 bg-bg/70 px-3 py-2 font-semibold text-text-primary shadow-sm dark:bg-white/[0.04]">{selectedLayer.name}<span className="mt-0.5 block text-[9px] font-normal uppercase tracking-wider text-text-muted">{selectedLayer.kind} layer</span></div>
          {selectedLayer.shape && shapeStyle && <Section title="Shape" open={openSection === "Shape"} onToggle={() => toggleSection("Shape")}>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 text-[10px] text-text-secondary"><span className="flex items-center gap-1.5"><input aria-label="Toggle shape fill" type="checkbox" checked={shapeStyle.fillEnabled} onChange={(event) => onUpdateShapeStyle({ fillEnabled: event.target.checked })} className="h-3.5 w-3.5 accent-[var(--accent)]" />Fill</span><input aria-label="Shape fill color" type="color" value={shapeStyle.fill} onChange={(event) => onUpdateShapeStyle({ fill: event.target.value })} className="h-7 w-10 rounded-lg border border-border p-0.5" /></div>
              <Swatches value={shapeStyle.fill} ariaLabel="Shape fill swatch" onPick={(fillColor) => onUpdateShapeStyle({ fill: fillColor })} />
              <RangeField label="Fill opacity" value={shapeStyle.fillOpacity} min={0} max={100} suffix="%" ariaLabel="Shape fill opacity" onChange={(fillOpacity) => onUpdateShapeStyle({ fillOpacity })} />
              <div className="flex items-center justify-between gap-2 text-[10px] text-text-secondary"><span>Stroke</span><input aria-label="Shape stroke color" type="color" value={shapeStyle.stroke} onChange={(event) => onUpdateShapeStyle({ stroke: event.target.value })} className="h-7 w-10 rounded-lg border border-border p-0.5" /></div>
              <Swatches value={shapeStyle.stroke} ariaLabel="Shape stroke swatch" onPick={(strokeColor) => onUpdateShapeStyle({ stroke: strokeColor })} />
              <RangeField label="Stroke width" value={shapeStyle.strokeWidth} min={0} max={60} suffix="px" ariaLabel="Shape stroke width" onChange={(strokeWidth) => onUpdateShapeStyle({ strokeWidth })} />
              <div className="flex items-center justify-between gap-2 text-[10px] text-text-secondary"><span>Line style</span><div role="group" aria-label="Shape line style" className="flex gap-1">{EDITOR_SHAPE_LINE_STYLES.map((style) => <button key={style} type="button" aria-label={`Shape line style ${style}`} aria-pressed={shapeStyle.strokeStyle === style} onClick={() => onUpdateShapeStyle({ strokeStyle: style })} className="rounded-lg border border-border px-2 py-1 capitalize aria-pressed:border-accent aria-pressed:bg-accent/15">{style}</button>)}</div></div>
              <RangeField label="Corner radius" value={shapeStyle.cornerRadius} min={0} max={200} suffix="u" ariaLabel="Shape corner radius" onChange={(cornerRadius) => onUpdateShapeStyle({ cornerRadius })} />
              <div className="rounded-lg border border-border/70 bg-bg/60 p-2">
                <div className="flex items-center justify-between gap-2 text-[10px] font-semibold text-text-primary"><span className="flex items-center gap-1.5"><input aria-label="Toggle shape drop shadow" type="checkbox" checked={shapeStyle.shadow.enabled} onChange={(event) => onUpdateShapeStyle({ shadow: { ...shapeStyle.shadow, enabled: event.target.checked } })} className="h-3.5 w-3.5 accent-[var(--accent)]" />Drop shadow</span><input aria-label="Shape shadow color" type="color" value={shapeStyle.shadow.color} onChange={(event) => onUpdateShapeStyle({ shadow: { ...shapeStyle.shadow, color: event.target.value } })} className="h-7 w-10 rounded-lg border border-border p-0.5" /></div>
                {shapeStyle.shadow.enabled && <div className="mt-2 space-y-2">
                  <NumberField label="Offset X" value={shapeStyle.shadow.offsetX} min={-120} max={120} ariaLabel="Shape shadow offset X" onChange={(offsetX) => onUpdateShapeStyle({ shadow: { ...shapeStyle.shadow, offsetX } })} />
                  <NumberField label="Offset Y" value={shapeStyle.shadow.offsetY} min={-120} max={120} ariaLabel="Shape shadow offset Y" onChange={(offsetY) => onUpdateShapeStyle({ shadow: { ...shapeStyle.shadow, offsetY } })} />
                  <RangeField label="Blur" value={shapeStyle.shadow.blur} min={0} max={60} ariaLabel="Shape shadow blur" onChange={(blur) => onUpdateShapeStyle({ shadow: { ...shapeStyle.shadow, blur } })} />
                  <RangeField label="Opacity" value={Math.round(shapeStyle.shadow.opacity * 100)} min={0} max={100} suffix="%" ariaLabel="Shape shadow opacity" onChange={(percent) => onUpdateShapeStyle({ shadow: { ...shapeStyle.shadow, opacity: percent / 100 } })} />
                </div>}
              </div>
              <div className="rounded-lg border border-border/70 bg-bg/60 p-2">
                <div className="flex items-center justify-between gap-2 text-[10px] font-semibold text-text-primary"><span className="flex items-center gap-1.5"><input aria-label="Toggle shape glow" type="checkbox" checked={shapeStyle.glow.enabled} onChange={(event) => onUpdateShapeStyle({ glow: { ...shapeStyle.glow, enabled: event.target.checked } })} className="h-3.5 w-3.5 accent-[var(--accent)]" />Outer glow</span><input aria-label="Shape glow color" type="color" value={shapeStyle.glow.color} onChange={(event) => onUpdateShapeStyle({ glow: { ...shapeStyle.glow, color: event.target.value } })} className="h-7 w-10 rounded-lg border border-border p-0.5" /></div>
                {shapeStyle.glow.enabled && <div className="mt-2 space-y-2">
                  <RangeField label="Spread" value={shapeStyle.glow.width} min={1} max={60} ariaLabel="Shape glow spread" onChange={(width) => onUpdateShapeStyle({ glow: { ...shapeStyle.glow, width } })} />
                  <RangeField label="Opacity" value={Math.round(shapeStyle.glow.opacity * 100)} min={0} max={100} suffix="%" ariaLabel="Shape glow opacity" onChange={(percent) => onUpdateShapeStyle({ glow: { ...shapeStyle.glow, opacity: percent / 100 } })} />
                </div>}
              </div>
              <p className="text-[9px] leading-relaxed text-text-muted">Fill and stroke are independent. Shadow and glow render live on the canvas, the layer thumbnail, and the mockups.</p>
            </div>
          </Section>}
          {selectedLayer.shape && <Section title="Shape Builder" open={openSection === "Shape Builder"} onToggle={() => toggleSection("Shape Builder")}>
            <div className="grid grid-cols-2 gap-1.5">{(["select", "merge", "subtract", "intersect", "exclude"] as const).map((mode) => <button key={mode} type="button" aria-label={`Shape builder ${mode}`} aria-pressed={(selectedLayer.shape?.builderMode ?? "select") === mode} onClick={() => onUpdateShapeBuilder(mode)} className="rounded-lg border border-border px-2 py-2 text-[10px] capitalize aria-pressed:border-accent aria-pressed:bg-accent/15">{mode === "select" ? "Select" : mode}</button>)}</div>
            <p className="mt-2 text-[9px] leading-relaxed text-text-muted">Choose a builder mode before combining or editing vector shapes on the Canvas.</p>
          </Section>}
          {image && imagePrintQuality && (
            <p data-print-quality={imagePrintQuality.level} aria-label={`Print quality ${imagePrintQuality.ppi} ppi, ${IMAGE_PRINT_LEVEL_LABEL[imagePrintQuality.level]}`} className={`rounded-xl px-3 py-2 text-[11px] font-semibold ${PRINT_LEVEL_CLASS[imagePrintQuality.level]}`}>
              Print quality: {imagePrintQuality.ppi} ppi · {IMAGE_PRINT_LEVEL_LABEL[imagePrintQuality.level]}
            </p>
          )}
          {image && <Section title="Photo" open={openSection === "Photo"} onToggle={() => toggleSection("Photo")}>
            <EditorPhotoAdjustments image={image} selectedLayer={selectedLayer} onUpdateImage={onUpdateImage} onAddMask={onAddMask} onRemoveMask={onRemoveMask} onSelectMask={onSelectMask} />
          </Section>}
          {image && <Section title="Frame" open={openSection === "Frame"} onToggle={() => toggleSection("Frame")}>
            <div className="space-y-2">
              <RangeField label="Corner radius" value={image.cornerRadius ?? 0} min={0} max={Math.max(8, Math.round(Math.min(image.width, image.height) / 2))} suffix="u" ariaLabel="Image corner radius" onChange={(cornerRadius) => onUpdateImage({ cornerRadius })} />
              <RangeField label="Border width" value={image.borderWidth ?? 0} min={0} max={80} suffix="u" ariaLabel="Image border width" onChange={(borderWidth) => onUpdateImage({ borderWidth })} />
              <label className="flex items-center justify-between gap-2 text-[10px] text-text-secondary">Border colour<input aria-label="Image border colour" type="color" value={image.borderColor ?? "#ffffff"} onChange={(event) => onUpdateImage({ borderColor: event.target.value })} className="h-7 w-10 rounded-lg border border-border p-0.5" /></label>
              <Swatches value={image.borderColor ?? "#ffffff"} ariaLabel="Image border swatch" onPick={(borderColor) => onUpdateImage({ borderColor })} />
              <p className="text-[9px] leading-relaxed text-text-muted">The frame is drawn inside the photo box, so rounded corners and a border never grow the layer past its transform outline.</p>
            </div>
          </Section>}
          {text ? <>
            <Section title="Text" open={openSection === "Text"} onToggle={() => toggleSection("Text")}>
              <textarea aria-label="Adjustment text" value={text.value} onChange={(event) => onUpdateText(event.target.value)} className="min-h-20 w-full resize-y rounded-xl border border-border bg-bg p-2 text-[12px] text-text-primary outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20" />
            </Section>
            <Section title="Font" open={openSection === "Font"} onToggle={() => toggleSection("Font")}>
              <div className="space-y-2">
                <NumberField label="Font size" value={text.fontSize} min={24} max={260} ariaLabel="Adjustment font size" onChange={(value) => onUpdateTextStyle({ fontSize: value })} />
                <label className="flex items-center justify-between gap-2 text-[10px] text-text-secondary">Color<input aria-label="Adjustment text color" type="color" value={text.color} onChange={(event) => onUpdateTextStyle({ color: event.target.value })} className="h-8 w-11 cursor-pointer rounded-lg border border-border bg-bg p-0.5" /></label>
                <Swatches value={text.color} ariaLabel="Text colour swatch" onPick={(color) => onUpdateTextStyle({ color })} />
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
            <Section title="Text styles" open={openSection === "Text styles"} onToggle={() => toggleSection("Text styles")}>
              <div className="space-y-2">
                {(["Classic", "Fill", "3D"] as const).map((group) => (
                  <div key={group} role="group" aria-label={`Text style presets ${group}`}>
                    <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-text-muted">{group === "3D" ? "3D materials" : group}</p>
                    <div className="grid grid-cols-2 gap-1">
                      {EDITOR_TEXT_STYLES.filter((preset) => preset.group === group).map((preset) => <TextStyleTile key={preset.id} preset={preset} active={appliedStyle === preset.id} onApply={() => applyTextStyle(preset.id)} />)}
                    </div>
                  </div>
                ))}
                <p className="text-[9px] leading-relaxed text-text-muted">Each tile paints its real effect stack on the sample, so what you see is what lands on the canvas. A preset writes an editable stack — tune, reorder or remove each layer below.</p>
              </div>
            </Section>
            <Section title="Effects" open={openSection === "Effects"} onToggle={() => toggleSection("Effects")}>
              <div className="mb-2 flex items-center justify-center rounded-lg border border-border bg-[#151c20] py-2 text-xl font-black tracking-tight text-white"><span className={effectStack.some((effect) => effect.kind === "shadow") ? "[text-shadow:3px_3px_0_#050505]" : effectStack.some((effect) => effect.kind === "outline") ? "text-transparent [text-shadow:-1px_-1px_0_#d4ff3f,1px_1px_0_#d4ff3f]" : ""}>Aa</span></div>
              <div className="space-y-2">
                <div role="group" aria-label="Add text effect" className="grid grid-cols-3 gap-1">
                  {EFFECT_TYPES.map(({ kind, label, color }) => <EffectTile key={kind} kind={kind} label={label} color={color} active={effectStack.some((effect) => effect.kind === kind)} onApply={() => addTextEffect(kind)} />)}
                  <button type="button" aria-label="No text effect" aria-pressed={effectStack.length === 0} onClick={() => replaceEffectStack([])} className="flex flex-col items-center justify-center rounded-lg border border-border p-0.5 text-[8px] aria-pressed:border-accent aria-pressed:bg-accent/15 [@media(pointer:coarse)]:min-h-11"><span className="flex h-9 items-center justify-center text-[13px] font-black text-text-muted">Aa</span>None</button>
                </div>
                <p className="text-[9px] leading-relaxed text-text-muted">Add multiple effects, then reorder and tune each one. Changes render live on the canvas and mockups.</p>
                <div aria-label="Text effect stack" className="space-y-2">
                  {effectStack.map((effect, index) => <section key={effect.id} className="rounded-lg border border-border bg-bg/70 p-2">
                    <div className="mb-2 flex items-center gap-1">
                      <button type="button" aria-label={`${effect.enabled === false ? "Enable" : "Disable"} ${effect.kind} effect ${index + 1}`} aria-pressed={effect.enabled !== false} onClick={() => updateTextEffect(effect.id, { enabled: effect.enabled === false })} className="flex min-h-8 min-w-0 flex-1 items-center gap-1.5 rounded-md px-1 text-left text-[10px] font-semibold capitalize text-text-primary hover:bg-accent/10 aria-pressed:text-accent">
                        <span className="flex h-5 w-6 shrink-0 items-center justify-center overflow-hidden rounded bg-[#151c20] text-white"><svg viewBox="0 0 100 78" className="h-5 w-6"><EditorTextArtwork text={effectSample(effect)} idPrefix={`row-${effect.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`} /></svg></span>
                        <span className="truncate">{effect.kind}</span>
                      </button>
                      <button type="button" aria-label={`Move ${effect.kind} effect up`} disabled={index === 0} onClick={() => moveTextEffect(effect.id, -1)} className="flex h-6 w-6 items-center justify-center rounded-md text-text-secondary hover:bg-accent/10 disabled:opacity-35 [@media(pointer:coarse)]:h-10 [@media(pointer:coarse)]:w-10"><ArrowUp size={13} /></button>
                      <button type="button" aria-label={`Move ${effect.kind} effect down`} disabled={index === effectStack.length - 1} onClick={() => moveTextEffect(effect.id, 1)} className="flex h-6 w-6 items-center justify-center rounded-md text-text-secondary hover:bg-accent/10 disabled:opacity-35 [@media(pointer:coarse)]:h-10 [@media(pointer:coarse)]:w-10"><ArrowDown size={13} /></button>
                      <button type="button" aria-label={`Remove ${effect.kind} effect ${index + 1}`} onClick={() => replaceEffectStack(effectStack.filter((item) => item.id !== effect.id))} className="flex h-6 w-6 items-center justify-center rounded-md text-text-secondary hover:bg-rose-500/10 hover:text-rose-500 [@media(pointer:coarse)]:h-10 [@media(pointer:coarse)]:w-10"><Trash2 size={13} /></button>
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center justify-between gap-2 text-[10px] text-text-secondary">Effect color<input aria-label={`${effect.kind} effect color ${index + 1}`} type="color" value={effect.color} onChange={(event) => updateTextEffect(effect.id, { color: event.target.value })} className="h-7 w-10 rounded-lg border border-border p-0.5" /></label>
                      {(effect.kind === "shadow" || effect.kind === "offset" || effect.kind === "echo") && <>
                        <NumberField label="Offset X" value={effect.offsetX ?? 10} min={-80} max={80} ariaLabel={`${effect.kind} offset X ${index + 1}`} onChange={(value) => updateTextEffect(effect.id, { offsetX: value })} />
                        <NumberField label="Offset Y" value={effect.offsetY ?? 10} min={-80} max={80} ariaLabel={`${effect.kind} offset Y ${index + 1}`} onChange={(value) => updateTextEffect(effect.id, { offsetY: value })} />
                      </>}
                      {(effect.kind === "gradient" || effect.kind === "pattern" || effect.kind === "bevel" || effect.kind === "extrude") && <label className="flex items-center justify-between gap-2 text-[10px] text-text-secondary">{effect.kind === "gradient" ? "End color" : effect.kind === "pattern" ? "Backdrop" : effect.kind === "bevel" ? "Highlight" : "Far color"}<input aria-label={`${effect.kind} second color ${index + 1}`} type="color" value={effect.color2 ?? (effect.kind === "bevel" ? "#ffffff" : effect.kind === "extrude" ? "#111827" : "#d4ff3f")} onChange={(event) => updateTextEffect(effect.id, { color2: event.target.value })} className="h-7 w-10 rounded-lg border border-border p-0.5" /></label>}
                      {(effect.kind === "shadow" || effect.kind === "glow" || effect.kind === "blur") && <NumberField label={effect.kind === "shadow" ? "Softness" : effect.kind === "glow" ? "Glow softness" : "Blur"} value={effect.blur ?? 4} min={0} max={30} ariaLabel={effect.kind === "shadow" ? "Text shadow softness" : `${effect.kind} softness ${index + 1}`} onChange={(value) => updateTextEffect(effect.id, { blur: value })} />}
                      {effect.kind === "pattern" && <div className="flex items-center justify-between gap-2 text-[10px] text-text-secondary"><span>Motif</span><div role="group" aria-label={`Pattern motif ${index + 1}`} className="flex gap-1">{(["dots", "grid", "checker"] as const).map((motif) => <button key={motif} type="button" aria-label={`Pattern motif ${motif}`} aria-pressed={(effect.pattern ?? "dots") === motif} onClick={() => updateTextEffect(effect.id, { pattern: motif })} className="rounded-md border border-border px-1.5 py-0.5 capitalize aria-pressed:border-accent aria-pressed:bg-accent/15">{motif}</button>)}</div></div>}
                      {effect.kind === "pattern" && <NumberField label="Tile size" value={effect.distance ?? 14} min={4} max={60} ariaLabel={`Pattern tile size ${index + 1}`} onChange={(value) => updateTextEffect(effect.id, { distance: value })} />}
                      {effect.kind === "bevel" && <NumberField label="Edge" value={effect.width ?? 4} min={1} max={20} ariaLabel={`Bevel edge ${index + 1}`} onChange={(value) => updateTextEffect(effect.id, { width: value })} />}
                      {effect.kind === "gloss" && <NumberField label="Strength" value={Math.round((effect.opacity ?? 0.75) * 100)} min={5} max={100} ariaLabel={`Gloss strength ${index + 1}`} onChange={(value) => updateTextEffect(effect.id, { opacity: value / 100 })} />}
                      {(effect.kind === "outline" || effect.kind === "glow" || effect.kind === "hollow") && <NumberField label={effect.kind === "outline" ? "Outline width" : effect.kind === "hollow" ? "Line width" : "Glow width"} value={effect.width ?? (effect.kind === "outline" ? 6 : 12)} min={1} max={40} ariaLabel={`${effect.kind} width ${index + 1}`} onChange={(value) => updateTextEffect(effect.id, { width: value })} />}
                      {(effect.kind === "echo" || effect.kind === "extrude") && <NumberField label={effect.kind === "echo" ? "Echo count" : "Extrude steps"} value={effect.count ?? (effect.kind === "echo" ? 3 : 8)} min={1} max={16} ariaLabel={`${effect.kind} count ${index + 1}`} onChange={(value) => updateTextEffect(effect.id, { count: value })} />}
                      {(effect.kind === "extrude" || effect.kind === "stripe") && <NumberField label={effect.kind === "extrude" ? "Depth" : "Stripe spacing"} value={effect.distance ?? 18} min={1} max={80} ariaLabel={`${effect.kind} distance ${index + 1}`} onChange={(value) => updateTextEffect(effect.id, { distance: value })} />}
                      {effect.kind === "stripe" && <NumberField label="Stripe width" value={effect.width ?? 4} min={1} max={16} ariaLabel={`Stripe width ${index + 1}`} onChange={(value) => updateTextEffect(effect.id, { width: value })} />}
                    </div>
                  </section>)}
                </div>
              </div>
            </Section>
            <Section title="Decoration" open={openSection === "Decoration"} onToggle={() => toggleSection("Decoration")}>
              <div className="space-y-2"><label className="flex items-center justify-between gap-2 text-[10px] text-text-secondary">Style<select aria-label="Text decoration" value={text.textDecoration ?? "none"} onChange={(event) => onUpdateTextStyle({ textDecoration: event.target.value as "none" | "line" | "cut" | "oblique" })} className="w-24 rounded-lg border border-border bg-bg px-2 py-1.5 text-[11px] text-text-primary"><option value="none">None</option><option value="line">Line</option><option value="cut">Color cut</option><option value="oblique">Oblique</option></select></label><label className="flex items-center justify-between gap-2 text-[10px] text-text-secondary">Color<input aria-label="Text decoration color" type="color" value={text.decorationColor ?? "#d4ff3f"} onChange={(event) => onUpdateTextStyle({ decorationColor: event.target.value })} className="h-7 w-10 rounded-lg border border-border p-0.5" /></label><NumberField label="Weight" value={text.decorationWidth ?? 4} min={1} max={24} ariaLabel="Text decoration weight" onChange={(value) => onUpdateTextStyle({ decorationWidth: value })} /></div>
            </Section>
            <Section title="Transform" open={openSection === "Transform"} onToggle={() => toggleSection("Transform")}>
              <div className="grid grid-cols-3 gap-1">{([["none", "Plain"], ["arch", "Arch"], ["wave", "Wave"]] as const).map(([shape, label]) => <TextTransformTile key={shape} shape={shape} label={label} active={(text.textTransform ?? "none") === shape} onApply={() => onUpdateTextStyle({ textTransform: shape })} />)}</div>
              <p className="mt-2 text-[9px] leading-relaxed text-text-muted">Each tile bends the same sample the canvas paints, so the preview is the result. Warps stay editable as live text and combine with effects.</p>
            </Section>
          </> : <p className="rounded-xl border border-dashed border-[#999] p-3 text-[#666] dark:border-[#555] dark:text-[#bdbdbd]">This layer has no text properties.</p>}
          {selectedLayer.gradient && <Section title="Gradient" open={openSection === "Gradient"} onToggle={() => toggleSection("Gradient")}>
            <GradientEditor gradient={selectedLayer.gradient} onChange={onUpdateGradient} />
          </Section>}
          <Section title="Appearance" open={openSection === "Appearance"} onToggle={() => toggleSection("Appearance")}>
            <div className="space-y-3"><label className="block text-[10px] text-text-secondary">Blend mode<select aria-label={`Blend mode for ${selectedLayer.name}`} value={selectedLayer.blendMode} disabled={selectedLayer.locked} onChange={(event) => onUpdateLayer(selectedLayer.id, { blendMode: event.target.value as "normal" | "multiply" | "screen" | "overlay" })} className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-1.5 text-[11px] text-text-primary"><option value="normal">Normal</option><option value="multiply">Multiply</option><option value="screen">Screen</option><option value="overlay">Overlay</option></select></label><label className="block text-[10px] text-text-secondary">Opacity<span className="float-right font-semibold text-text-primary">{selectedLayer.opacity}%</span><input aria-label="Adjustment opacity" type="range" min="0" max="100" value={selectedLayer.opacity} disabled={selectedLayer.locked} onChange={(event) => onUpdateLayer(selectedLayer.id, { opacity: Number(event.target.value) })} className="mt-2 h-1.5 w-full cursor-pointer accent-[var(--accent)]" /></label><label className="block text-[10px] text-text-secondary">Fill<span className="float-right font-semibold text-text-primary">{selectedLayer.fillOpacity}%</span><input aria-label="Adjustment fill" type="range" min="0" max="100" value={selectedLayer.fillOpacity} disabled={selectedLayer.locked} onChange={(event) => onUpdateLayer(selectedLayer.id, { fillOpacity: Number(event.target.value) })} className="mt-2 h-1.5 w-full cursor-pointer accent-[var(--accent)]" /></label></div>
          </Section>
          </>}
        </div>
      </div>
    </aside>}
    <button type="button" aria-label={open ? "Return to Layers" : "Open Adjustments panel"} title={open ? "Return to Layers" : "Open Adjustments panel"} data-adjustments-return-arrow={open ? "true" : "false"} aria-expanded={open} onClick={onToggle} className="absolute top-2 z-40 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-md outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11" style={{ right: open ? PANEL_WIDTH : 0 }}><ChevronRight size={17} aria-hidden="true" /></button>
  </>;
}
