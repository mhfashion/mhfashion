"use client";

import { useRef, useState } from "react";
import { ImagePlus, Plus } from "lucide-react";
import type { PanelId } from "./EditorLeftRail";
import type { ShapeType } from "./InteractiveCanvas";

const TITLES: Record<PanelId, string> = {
  upload: "Upload",
  elements: "Elements",
  text: "Text",
  effects: "Effects",
  ai: "AI",
};
const COLORS = ["#111827", "#d4ff3f", "#ef4444", "#3b82f6", "#a855f7", "#ffffff"];
const FONT_FAMILIES = ["Arial", "Georgia", "Times New Roman", "Courier New", "Trebuchet MS", "Impact"];
const EFFECT_OPTIONS = ["shadow", "stroke", "glow", "blur", "sharpen"];
const SHAPES: { id: ShapeType; label: string }[] = [
  { id: "rectangle", label: "Rectangle" },
  { id: "circle", label: "Circle" },
  { id: "triangle", label: "Triangle" },
  { id: "star", label: "Star" },
];

type Props = {
  panel: PanelId;
  onUploadImage: (file: File) => Promise<void>;
  onAddText: (text: string, color: string, fontSize: number, fontFamily: string) => void;
  onAddShape: (shape: ShapeType, color: string) => void;
  selectedEffects: string[];
  onToggleEffect: (effect: string) => void;
};

export default function EditorFlyout({ panel, onUploadImage, onAddText, onAddShape, selectedEffects, onToggleEffect }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [text, setText] = useState("");
  const [textColor, setTextColor] = useState(COLORS[0]);
  const [fontSize, setFontSize] = useState(32);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [shapeColor, setShapeColor] = useState(COLORS[1]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      await onUploadImage(file);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Could not add this image.");
    } finally {
      setUploading(false);
    }
  }

  function submitText(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;
    onAddText(value, textColor, fontSize, fontFamily);
    setText("");
  }

  return (
    <div className="w-52 flex-shrink-0 border-r border-border bg-bg-surface p-3 overflow-y-auto">
      <p className="text-xs font-semibold mb-2.5">{TITLES[panel]}</p>

      {panel === "upload" && (
        <div className="space-y-2">
          <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileChange} className="sr-only" aria-label="Choose an image to upload" />
          <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading} className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-border-light py-6 text-[10px] text-text-muted hover:border-accent hover:text-accent disabled:opacity-50">
            <ImagePlus size={20} />
            {uploading ? "Preparing image…" : "Choose an image"}
          </button>
          <p className="text-[9px] text-text-faint leading-relaxed">PNG, JPG or WebP · up to 10 MB. The image is resized for the editor and kept in this browser draft.</p>
          {uploadError && <p role="alert" className="text-[9px] leading-relaxed text-red-500">{uploadError}</p>}
          <p className="text-[9px] text-text-faint leading-relaxed">Click the image to select it, then choose Eraser and click the canvas to remove it. Remove Background and Upscale are not connected yet.</p>
        </div>
      )}

      {panel === "text" && (
        <form onSubmit={submitText} className="space-y-3">
          <label className="block text-[9px] text-text-muted">Text
            <textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={120} rows={4} placeholder="Type your design text…" className="mt-1 w-full resize-y rounded-md border border-border bg-bg px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent" />
          </label>
          <label className="block text-[9px] text-text-muted">Font size
            <select value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} className="mt-1 w-full rounded-md bg-bg px-2 py-1.5 text-[10px] text-text-primary">
              {[18, 24, 32, 40, 48, 64].map((size) => <option key={size} value={size}>{size} px</option>)}
            </select>
          </label>
          <label className="block text-[9px] text-text-muted">Font family
            <select value={fontFamily} onChange={(event) => setFontFamily(event.target.value)} className="mt-1 w-full rounded-md bg-bg px-2 py-1.5 text-[10px] text-text-primary">
              {FONT_FAMILIES.map((family) => <option key={family} value={family}>{family}</option>)}
            </select>
          </label>
          <div>
            <p className="mb-1 text-[9px] text-text-muted">Text color</p>
            <div className="flex gap-1.5">{COLORS.map((color) => <button key={color} type="button" aria-label={`Text color ${color}`} aria-pressed={textColor === color} onClick={() => setTextColor(color)} style={{ backgroundColor: color }} className={`h-5 w-5 rounded-full border border-border ${textColor === color ? "ring-2 ring-accent ring-offset-1 ring-offset-bg-surface" : ""}`} />)}</div>
          </div>
          <button type="submit" disabled={!text.trim()} className="flex w-full items-center justify-center gap-1 rounded-md bg-accent px-2 py-2 text-[10px] font-bold text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40"><Plus size={13} /> Add text to canvas</button>
          <p className="text-[9px] text-text-faint">Text is added to the center of the active side as a separate layer.</p>
        </form>
      )}

      {panel === "elements" && (
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-[9px] text-text-muted">Fill color</p>
            <div className="flex gap-1.5">{COLORS.map((color) => <button key={color} type="button" aria-label={`Shape color ${color}`} aria-pressed={shapeColor === color} onClick={() => setShapeColor(color)} style={{ backgroundColor: color }} className={`h-5 w-5 rounded-full border border-border ${shapeColor === color ? "ring-2 ring-accent ring-offset-1 ring-offset-bg-surface" : ""}`} />)}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {SHAPES.map((shape) => <button key={shape.id} type="button" onClick={() => onAddShape(shape.id, shapeColor)} className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-md border border-border bg-bg hover:border-accent hover:text-accent">
              <span aria-hidden="true" className={`block h-8 w-10 bg-current ${shape.id === "circle" ? "rounded-full" : ""} ${shape.id === "triangle" ? "[clip-path:polygon(50%_0,0_100%,100%_100%)]" : ""} ${shape.id === "star" ? "[clip-path:polygon(50%_0,61%_35%,98%_35%,68%_57%,79%_95%,50%_72%,21%_95%,32%_57%,2%_35%,39%_35%)]" : ""}`} style={{ color: shapeColor }} />
              <span className="text-[9px]">{shape.label}</span>
            </button>)}
          </div>
          <p className="text-[9px] text-text-faint">Click a shape to add it to the center of the active side as a separate layer.</p>
        </div>
      )}

      {panel === "effects" && (
        <div className="space-y-1.5 text-[10px]">
          {EFFECT_OPTIONS.map((effect) => <button key={effect} type="button" aria-pressed={selectedEffects.includes(effect)} onClick={() => onToggleEffect(effect)} className={`w-full rounded-md border px-2 py-1.5 text-left ${selectedEffects.includes(effect) ? "border-accent bg-accent/10 text-accent" : "border-border bg-bg"}`}>{effect.charAt(0).toUpperCase() + effect.slice(1)} {selectedEffects.includes(effect) ? "· On" : "· Add"}</button>)}
          <p className="pt-1 text-[9px] text-text-faint">Effects apply to the selected layer. Select a layer first to toggle them.</p>
        </div>
      )}

      {panel === "ai" && (
        <div className="space-y-2">
          <div className="rounded-md bg-bg border border-border p-2">
            <p className="text-[10px] font-medium mb-1">Generate image</p>
            <textarea rows={3} placeholder="Describe what you want..." className="w-full bg-transparent outline-none text-[10px] resize-none placeholder:text-text-faint" />
            <button className="w-full bg-accent text-accent-foreground rounded py-1 text-[10px] font-semibold mt-1">Generate · 100 pts</button>
          </div>
          <p className="text-[9px] text-text-faint">300 points are granted daily. Unused daily points expire; points earned from purchases don&apos;t.</p>
        </div>
      )}
    </div>
  );
}
