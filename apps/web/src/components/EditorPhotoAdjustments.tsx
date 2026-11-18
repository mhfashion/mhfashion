"use client";

import { useMemo, useRef, useState } from "react";
import type { EditorArtworkLayer, EditorImageContent, PhotoAdjustmentUpdate } from "@/lib/editor-layers";
import { autoPhotoAdjustments, neutralPhotoAdjustments } from "@/lib/photo-adjustments";

// Photoshop Camera Raw's Basic panel is the reference: grouped, collapsible
// controls, 0 as neutral for every presence/tone slider, Exposure in stops, and
// Temp/Tint on the white-balance axis. Values stay on the image layer as
// instructions, so every edit is non-destructive and re-renderable.

type GroupKey = "wb" | "light" | "presence" | "curve" | "levels" | "hsl" | "grading" | "selective" | "channel" | "effects" | "detail" | "smart" | "services";

const CURVE_CHANNELS = ["RGB", "Red", "Green", "Blue"] as const;
type CurveChannel = (typeof CURVE_CHANNELS)[number];

function Group({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border border-border/70 bg-bg/50">
      <button type="button" aria-expanded={open} onClick={onToggle} className="flex min-h-9 w-full items-center justify-between px-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-text-primary transition hover:bg-accent/10 [@media(pointer:coarse)]:min-h-11">
        <span>{title}</span>
        <span aria-hidden="true" className="text-accent">{open ? "–" : "+"}</span>
      </button>
      {open && <div className="space-y-2.5 border-t border-border/60 p-2.5">{children}</div>}
    </section>
  );
}

function Slider({ label, value, min, max, step = 1, suffix = "", ariaLabel, onChange }: { label: string; value: number; min: number; max: number; step?: number; suffix?: string; ariaLabel: string; onChange: (value: number) => void }) {
  const shown = step < 1 ? value.toFixed(2) : String(Math.round(value));
  return (
    <label className="block text-[10px] text-text-secondary">
      <span className="flex items-center justify-between"><span>{label}</span><span className="font-semibold text-text-primary">{shown}{suffix}</span></span>
      <input aria-label={ariaLabel} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} onDoubleClick={() => onChange(0)} className="mt-1.5 h-1.5 w-full cursor-pointer accent-[var(--accent)]" />
    </label>
  );
}

function Toggle({ label, pressed, ariaLabel, onClick }: { label: string; pressed: boolean; ariaLabel: string; onClick: () => void }) {
  return <button type="button" aria-label={ariaLabel} aria-pressed={pressed} onClick={onClick} className="min-h-11 rounded-lg border border-border px-2 py-2 text-[10px] font-semibold transition hover:border-accent aria-pressed:border-accent aria-pressed:bg-accent/15">{label}</button>;
}

// A live transfer-curve graph. Editing a point moves the matching stored value;
// the input tone is plotted on X and the rendered tone on Y, matching the tone
// stage the preview filter applies.
function CurveGraph({ points, onChange, channel }: { points: number[]; onChange: (index: number, value: number) => void; channel: CurveChannel }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const coords = points.map((point, index) => ({ x: (index / (points.length - 1)) * 100, y: 100 - point }));
  const path = coords.map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`).join(" ");
  const channelColor = channel === "Red" ? "#ef4444" : channel === "Green" ? "#22c55e" : channel === "Blue" ? "#3b82f6" : "#d4ff3f";

  function valueFromEvent(event: React.PointerEvent<SVGSVGElement>, index: number) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return points[index];
    const ratio = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    return Math.round((1 - ratio) * 100);
  }
  return (
    <svg
      ref={svgRef}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Photo curves preview"
      preserveAspectRatio="none"
      className="h-28 w-full touch-none rounded border border-border bg-[#151c20]"
      onPointerMove={(event) => { if (dragging !== null) onChange(dragging, valueFromEvent(event, dragging)); }}
      onPointerUp={() => setDragging(null)}
      onPointerLeave={() => setDragging(null)}
    >
      <path d="M0 100 L100 0" stroke="#6b7280" strokeWidth="0.5" strokeDasharray="2 2" fill="none" />
      {[25, 50, 75].map((grid) => <line key={grid} x1="0" y1={grid} x2="100" y2={grid} stroke="#2a333a" strokeWidth="0.4" />)}
      {[25, 50, 75].map((grid) => <line key={`v${grid}`} x1={grid} y1="0" x2={grid} y2="100" stroke="#2a333a" strokeWidth="0.4" />)}
      <path d={path} fill="none" stroke={channelColor} strokeWidth="1.6" />
      {coords.map((point, index) => (
        <circle
          key={index}
          cx={point.x}
          cy={point.y}
          r={dragging === index ? 3.2 : 2.4}
          fill="#151c20"
          stroke={channelColor}
          strokeWidth="1.2"
          className="cursor-pointer"
          onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDragging(index); }}
        />
      ))}
    </svg>
  );
}

export default function EditorPhotoAdjustments({ image, selectedLayer, onUpdateImage, onAddMask, onRemoveMask, onSelectMask }: {
  image: EditorImageContent;
  selectedLayer: EditorArtworkLayer;
  onUpdateImage: (update: PhotoAdjustmentUpdate) => void;
  onAddMask: (id: string) => void;
  onRemoveMask: (id: string) => void;
  onSelectMask: () => void;
}) {
  const [openGroups, setOpenGroups] = useState<GroupKey[]>(["light"]);
  const [curveChannel, setCurveChannel] = useState<CurveChannel>("RGB");
  const toggleGroup = (key: GroupKey) => setOpenGroups((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  const isOpen = (key: GroupKey) => openGroups.includes(key);
  const curves = useMemo(() => image.curves && image.curves.length >= 2 ? image.curves : [0, 25, 50, 75, 100], [image.curves]);
  const vignetteOn = (image.vignette ?? 0) > 0;
  const grainOn = (image.grain ?? 0) > 0;
  const setCurvePoint = (index: number, value: number) => {
    const next = [...curves];
    next[index] = Math.max(0, Math.min(100, value));
    onUpdateImage({ curves: next });
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <button type="button" aria-label="Auto photo adjustments" onClick={() => onUpdateImage(autoPhotoAdjustments(image))} className="min-h-9 flex-1 rounded-lg border border-border bg-accent/10 px-2 text-[10px] font-bold text-text-primary transition hover:border-accent [@media(pointer:coarse)]:min-h-11">Auto</button>
        <button type="button" aria-label="Reset photo adjustments" onClick={() => onUpdateImage(neutralPhotoAdjustments())} className="min-h-9 flex-1 rounded-lg border border-border px-2 text-[10px] font-bold text-text-primary transition hover:border-rose-400 [@media(pointer:coarse)]:min-h-11">Reset</button>
      </div>

      <Group title="White Balance" open={isOpen("wb")} onToggle={() => toggleGroup("wb")}>
        <Slider label="Temperature" value={image.temperature ?? 0} min={-100} max={100} ariaLabel="Photo temperature" onChange={(temperature) => onUpdateImage({ temperature })} />
        <p className="-mt-1 text-[8px] uppercase tracking-wide text-text-muted">Blue · Neutral · Yellow</p>
        <Slider label="Tint" value={image.tint ?? 0} min={-100} max={100} ariaLabel="Photo tint" onChange={(tint) => onUpdateImage({ tint })} />
        <p className="-mt-1 text-[8px] uppercase tracking-wide text-text-muted">Green · Neutral · Magenta</p>
      </Group>

      <Group title="Light" open={isOpen("light")} onToggle={() => toggleGroup("light")}>
        <Slider label="Exposure" value={image.exposure ?? 0} min={-5} max={5} step={0.05} suffix=" EV" ariaLabel="Photo exposure" onChange={(exposure) => onUpdateImage({ exposure })} />
        <Slider label="Contrast" value={image.contrast ?? 0} min={-100} max={100} ariaLabel="Photo contrast" onChange={(contrast) => onUpdateImage({ contrast })} />
        <Slider label="Highlights" value={image.highlights ?? 0} min={-100} max={100} ariaLabel="Photo highlights" onChange={(highlights) => onUpdateImage({ highlights })} />
        <Slider label="Shadows" value={image.shadows ?? 0} min={-100} max={100} ariaLabel="Photo shadows" onChange={(shadows) => onUpdateImage({ shadows })} />
        <Slider label="Whites" value={image.whites ?? 0} min={-100} max={100} ariaLabel="Photo whites" onChange={(whites) => onUpdateImage({ whites })} />
        <Slider label="Blacks" value={image.blacks ?? 0} min={-100} max={100} ariaLabel="Photo blacks" onChange={(blacks) => onUpdateImage({ blacks })} />
      </Group>

      <Group title="Presence" open={isOpen("presence")} onToggle={() => toggleGroup("presence")}>
        <Slider label="Texture" value={image.texture ?? 0} min={-100} max={100} ariaLabel="Photo texture" onChange={(texture) => onUpdateImage({ texture })} />
        <Slider label="Clarity" value={image.clarity ?? 0} min={-100} max={100} ariaLabel="Photo clarity" onChange={(clarity) => onUpdateImage({ clarity })} />
        <Slider label="Dehaze" value={image.dehaze ?? 0} min={-100} max={100} ariaLabel="Photo dehaze" onChange={(dehaze) => onUpdateImage({ dehaze })} />
        <Slider label="Vibrance" value={image.vibrance ?? 0} min={-100} max={100} ariaLabel="Photo vibrance" onChange={(vibrance) => onUpdateImage({ vibrance })} />
        <Slider label="Saturation" value={image.saturation ?? 0} min={-100} max={100} ariaLabel="Photo saturation" onChange={(saturation) => onUpdateImage({ saturation })} />
        <Slider label="Hue" value={image.hue ?? 0} min={-180} max={180} suffix="°" ariaLabel="Photo hue" onChange={(hue) => onUpdateImage({ hue })} />
      </Group>

      <Group title="Tone Curve" open={isOpen("curve")} onToggle={() => toggleGroup("curve")}>
        <div role="group" aria-label="Curve channel" className="flex gap-1">
          {CURVE_CHANNELS.map((channel) => <button key={channel} type="button" aria-label={`Curve channel ${channel}`} aria-pressed={curveChannel === channel} onClick={() => setCurveChannel(channel)} className="flex-1 rounded-lg border border-border px-1 py-1 text-[9px] font-semibold aria-pressed:border-accent aria-pressed:bg-accent/15">{channel}</button>)}
        </div>
        <CurveGraph points={curves} channel={curveChannel} onChange={setCurvePoint} />
        <div className="space-y-1">{curves.map((point, index) => <label key={index} className="block text-[9px] text-text-secondary">Point {index + 1}<input aria-label={`Photo curve point ${index + 1}`} type="range" min="0" max="100" value={point} onChange={(event) => setCurvePoint(index, Number(event.target.value))} className="ml-2 inline-block h-1.5 w-[calc(100%-3.5rem)] cursor-pointer align-middle accent-[var(--accent)]" /></label>)}</div>
        <button type="button" aria-label="Reset photo curves" onClick={() => onUpdateImage({ curves: [0, 25, 50, 75, 100] })} className="min-h-8 w-full rounded-lg border border-border text-[9px] font-semibold transition hover:border-accent">Linear reset</button>
      </Group>

      <Group title="Levels" open={isOpen("levels")} onToggle={() => toggleGroup("levels")}>
        <Slider label="Black point" value={image.levelsBlack ?? 0} min={0} max={100} ariaLabel="Photo levels black point" onChange={(levelsBlack) => onUpdateImage({ levelsBlack })} />
        <Slider label="White point" value={image.levelsWhite ?? 100} min={0} max={100} ariaLabel="Photo levels white point" onChange={(levelsWhite) => onUpdateImage({ levelsWhite })} />
        <Slider label="Gamma" value={image.levelsGamma ?? 1} min={0.1} max={3} step={0.05} ariaLabel="Photo levels gamma" onChange={(levelsGamma) => onUpdateImage({ levelsGamma })} />
      </Group>

      <Group title="Color Mixer · HSL" open={isOpen("hsl")} onToggle={() => toggleGroup("hsl")}>
        <Slider label="Hue" value={image.hslHue ?? 0} min={-180} max={180} suffix="°" ariaLabel="HSL hue" onChange={(hslHue) => onUpdateImage({ hslHue })} />
        <Slider label="Saturation" value={image.hslSaturation ?? 0} min={-100} max={100} ariaLabel="HSL saturation" onChange={(hslSaturation) => onUpdateImage({ hslSaturation })} />
        <Slider label="Luminance" value={image.hslLightness ?? 0} min={-100} max={100} ariaLabel="HSL lightness" onChange={(hslLightness) => onUpdateImage({ hslLightness })} />
      </Group>

      <Group title="Color Grading" open={isOpen("grading")} onToggle={() => toggleGroup("grading")}>
        <p className="text-[9px] font-semibold text-text-primary">Highlights</p>
        <Slider label="Hue" value={image.splitHighlightHue ?? 45} min={0} max={360} suffix="°" ariaLabel="Grading highlights hue" onChange={(splitHighlightHue) => onUpdateImage({ splitHighlightHue })} />
        <Slider label="Saturation" value={image.splitHighlightSat ?? 0} min={0} max={100} ariaLabel="Grading highlights saturation" onChange={(splitHighlightSat) => onUpdateImage({ splitHighlightSat })} />
        <p className="text-[9px] font-semibold text-text-primary">Midtones</p>
        <Slider label="Hue" value={image.splitMidHue ?? 0} min={0} max={360} suffix="°" ariaLabel="Grading midtones hue" onChange={(splitMidHue) => onUpdateImage({ splitMidHue })} />
        <Slider label="Saturation" value={image.splitMidSat ?? 0} min={0} max={100} ariaLabel="Grading midtones saturation" onChange={(splitMidSat) => onUpdateImage({ splitMidSat })} />
        <p className="text-[9px] font-semibold text-text-primary">Shadows</p>
        <Slider label="Hue" value={image.splitShadowHue ?? 220} min={0} max={360} suffix="°" ariaLabel="Grading shadows hue" onChange={(splitShadowHue) => onUpdateImage({ splitShadowHue })} />
        <Slider label="Saturation" value={image.splitShadowSat ?? 0} min={0} max={100} ariaLabel="Grading shadows saturation" onChange={(splitShadowSat) => onUpdateImage({ splitShadowSat })} />
        <Slider label="Balance" value={image.splitBalance ?? 0} min={-100} max={100} ariaLabel="Grading balance" onChange={(splitBalance) => onUpdateImage({ splitBalance })} />
      </Group>

      <Group title="Selective Color" open={isOpen("selective")} onToggle={() => toggleGroup("selective")}>
        <Slider label="Cyan" value={image.selectiveCyan ?? 0} min={-100} max={100} ariaLabel="Selective color cyan" onChange={(selectiveCyan) => onUpdateImage({ selectiveCyan })} />
        <Slider label="Magenta" value={image.selectiveMagenta ?? 0} min={-100} max={100} ariaLabel="Selective color magenta" onChange={(selectiveMagenta) => onUpdateImage({ selectiveMagenta })} />
        <Slider label="Yellow" value={image.selectiveYellow ?? 0} min={-100} max={100} ariaLabel="Selective color yellow" onChange={(selectiveYellow) => onUpdateImage({ selectiveYellow })} />
        <Slider label="Black" value={image.selectiveBlack ?? 0} min={-100} max={100} ariaLabel="Selective color black" onChange={(selectiveBlack) => onUpdateImage({ selectiveBlack })} />
      </Group>

      <Group title="Channel Mixer" open={isOpen("channel")} onToggle={() => toggleGroup("channel")}>
        <Slider label="Red" value={image.red ?? 100} min={0} max={200} suffix="%" ariaLabel="Photo red channel" onChange={(red) => onUpdateImage({ red })} />
        <Slider label="Green" value={image.green ?? 100} min={0} max={200} suffix="%" ariaLabel="Photo green channel" onChange={(green) => onUpdateImage({ green })} />
        <Slider label="Blue" value={image.blue ?? 100} min={0} max={200} suffix="%" ariaLabel="Photo blue channel" onChange={(blue) => onUpdateImage({ blue })} />
      </Group>

      <Group title="Effects" open={isOpen("effects")} onToggle={() => toggleGroup("effects")}>
        <Slider label="Vignette" value={image.vignette ?? 0} min={0} max={100} suffix="%" ariaLabel="Photo vignette" onChange={(vignette) => onUpdateImage({ vignette })} />
        <Slider label="Grain" value={image.grain ?? 0} min={0} max={100} suffix="%" ariaLabel="Photo grain" onChange={(grain) => onUpdateImage({ grain })} />
        <Slider label="Grain size" value={image.grainSize ?? 25} min={0} max={100} ariaLabel="Photo grain size" onChange={(grainSize) => onUpdateImage({ grainSize })} />
        {(vignetteOn || grainOn) && <button type="button" aria-label="Clear photo effects" onClick={() => onUpdateImage({ vignette: 0, grain: 0 })} className="min-h-8 w-full rounded-lg border border-border text-[9px] font-semibold transition hover:border-rose-400">Clear effects</button>}
      </Group>

      <Group title="Detail" open={isOpen("detail")} onToggle={() => toggleGroup("detail")}>
        <Slider label="Sharpen" value={image.sharpen ?? 0} min={0} max={100} ariaLabel="Photo sharpen" onChange={(sharpen) => onUpdateImage({ sharpen })} />
        <Slider label="Noise reduction" value={image.noiseReduction ?? 0} min={0} max={100} ariaLabel="Photo noise reduction" onChange={(noiseReduction) => onUpdateImage({ noiseReduction })} />
        <Slider label="Blur" value={image.blur ?? 0} min={0} max={20} suffix="px" ariaLabel="Photo blur" onChange={(blur) => onUpdateImage({ blur })} />
      </Group>

      <Group title="Smart &amp; AI" open={isOpen("smart")} onToggle={() => toggleGroup("smart")}>
        <div className="grid grid-cols-2 gap-1.5">
          <Toggle label={image.aiEnhanced ? "AI Enhanced" : "AI Enhance"} pressed={image.aiEnhanced === true} ariaLabel="AI Enhance photo" onClick={() => onUpdateImage({ aiEnhanced: !image.aiEnhanced })} />
          <label className="flex min-h-11 flex-col justify-center rounded-lg border border-border px-2 py-1 text-[10px] font-semibold">Smart Filter<select aria-label="Smart filter" value={image.smartFilter ?? "none"} onChange={(event) => onUpdateImage({ smartFilter: event.target.value as NonNullable<EditorImageContent["smartFilter"]> })} className="mt-1 rounded border border-border bg-bg px-1 py-1 text-[10px] font-normal"><option value="none">None</option><option value="clarity">Clarity</option><option value="cinematic">Cinematic</option><option value="vintage">Vintage</option><option value="bw">B&amp;W</option><option value="warm">Warm</option><option value="cool">Cool</option></select></label>
        </div>
        {(image.smartFilter ?? "none") !== "none" && <Slider label="Filter intensity" value={image.smartFilterIntensity ?? 100} min={0} max={100} suffix="%" ariaLabel="Smart filter intensity" onChange={(smartFilterIntensity) => onUpdateImage({ smartFilterIntensity })} />}
      </Group>

      <Group title="Layer Mask" open={isOpen("services")} onToggle={() => toggleGroup("services")}>
        <div className="grid grid-cols-2 gap-1.5">
          <button type="button" aria-label={selectedLayer.mask ? "Edit photo layer mask" : "Add photo layer mask"} onClick={() => selectedLayer.mask ? onSelectMask() : onAddMask(selectedLayer.id)} className="min-h-11 rounded-lg border border-border px-2 py-2 text-[10px] font-semibold transition hover:border-accent">{selectedLayer.mask ? "Edit Layer Mask" : "Add Layer Mask"}</button>
          {selectedLayer.mask && <button type="button" aria-label="Remove photo layer mask" onClick={() => onRemoveMask(selectedLayer.id)} className="min-h-11 rounded-lg border border-border px-2 py-2 text-[10px] font-semibold transition hover:border-rose-400">Remove Mask</button>}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <Toggle label={image.backgroundRemoved ? "Background removed" : "Remove background"} pressed={image.backgroundRemoved === true} ariaLabel="Remove background" onClick={() => onUpdateImage({ backgroundRemoved: !image.backgroundRemoved })} />
          <Toggle label={image.upscaled ? "Upscaled" : "Upscale"} pressed={image.upscaled === true} ariaLabel="Upscale photo" onClick={() => onUpdateImage({ upscaled: !image.upscaled })} />
        </div>
        <p className="text-[9px] leading-relaxed text-text-muted">Edits render live and stay non-destructive. Background removal and upscale are ready for the connected image service.</p>
      </Group>
    </div>
  );
}
