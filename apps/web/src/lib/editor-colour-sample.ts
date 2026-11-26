import { ARTWORK_VIEWBOX, designExportDocument, svgDataUrl } from "@/lib/design-export";

/** The press prints on white paper, so a transparent pixel samples as the paper it sits on. */
export const EDITOR_PAPER_COLOUR = "#ffffff";

const clampChannel = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

/** One canvas pixel as `#rrggbb`, blended over the paper where the artwork is transparent. */
export function hexFromRgba(rgba: ArrayLike<number>, paper: string = EDITOR_PAPER_COLOUR): string | null {
  if (rgba.length < 4) return null;
  const alpha = clampChannel(rgba[3]) / 255;
  const paperRgb = /^#[0-9a-f]{6}$/i.test(paper)
    ? [parseInt(paper.slice(1, 3), 16), parseInt(paper.slice(3, 5), 16), parseInt(paper.slice(5, 7), 16)]
    : [255, 255, 255];
  const blended = [0, 1, 2].map((index) => clampChannel(rgba[index] * alpha + paperRgb[index] * (1 - alpha)));
  return `#${blended.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

/** A pointer position given as a 0..1 fraction of the canvas, in artwork units and inside it. */
export function artworkPointFromUnit(unit: { x: number; y: number }) {
  const clamp = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return {
    x: Math.round(clamp(unit.x) * (ARTWORK_VIEWBOX.width - 1)),
    y: Math.round(clamp(unit.y) * (ARTWORK_VIEWBOX.height - 1)),
  };
}

/**
 * Rasterises the artwork at canvas resolution and reads the pixel under `point`, so the colour
 * comes from what is actually painted — layers, effects and all — rather than from a layer's
 * declared fill.
 */
export async function sampleArtworkColour({
  inner,
  point,
  fontCss = "",
}: {
  inner: string;
  point: { x: number; y: number };
  fontCss?: string;
}): Promise<string | null> {
  if (!inner.trim() || typeof document === "undefined") return null;
  const image = new Image();
  image.src = svgDataUrl(designExportDocument({ inner, title: "Colour sample", fontCss }));
  try {
    await image.decode();
  } catch {
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = ARTWORK_VIEWBOX.width;
  canvas.height = ARTWORK_VIEWBOX.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(image, 0, 0, ARTWORK_VIEWBOX.width, ARTWORK_VIEWBOX.height);
  const { x, y } = artworkPointFromUnit({ x: point.x / ARTWORK_VIEWBOX.width, y: point.y / ARTWORK_VIEWBOX.height });
  return hexFromRgba(context.getImageData(x, y, 1, 1).data);
}

type EyeDropperLike = { open(): Promise<{ sRGBHex: string }> };
type EyeDropperWindow = { EyeDropper?: new () => EyeDropperLike };

/** The browser's own picker, which can read the mockup and the page around the canvas too. */
export function nativeEyeDropper(): EyeDropperLike | null {
  if (typeof window === "undefined") return null;
  const ctor = (window as unknown as EyeDropperWindow).EyeDropper;
  return ctor ? new ctor() : null;
}
