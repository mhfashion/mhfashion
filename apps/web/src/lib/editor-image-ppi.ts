import type { EditorImageContent } from "./editor-layers";

/**
 * A photo is the only layer kind whose sharpness depends on its pixel size: text, shapes and
 * strokes are vector. The print canvas is 4500 x 5400 px over a 1000 x 1200 artwork space, so
 * one artwork unit covers 4.5 print pixels.
 */
export const PRINT_PX_PER_UNIT = 4.5;
export const PRINT_DPI = 300;

export type ImagePrintLevel = "good" | "low" | "very-low";
export type ImagePrintQuality = { ppi: number; level: ImagePrintLevel };

/** Placeholders from the print desk: 150 and 100 ppi. */
export const IMAGE_PRINT_THRESHOLDS = { low: 150, veryLow: 100 } as const;

export const IMAGE_PRINT_LEVEL_LABEL: Record<ImagePrintLevel, string> = {
  good: "good",
  low: "low",
  "very-low": "very low",
};

const LEVEL_RANK: Record<ImagePrintLevel, number> = { good: 0, low: 1, "very-low": 2 };

export function imagePrintLevel(ppi: number): ImagePrintLevel {
  if (ppi >= IMAGE_PRINT_THRESHOLDS.low) return "good";
  if (ppi >= IMAGE_PRINT_THRESHOLDS.veryLow) return "low";
  return "very-low";
}

export function imagePrintLevelRank(level: ImagePrintLevel): number {
  return LEVEL_RANK[level];
}

type PrintableImage = Pick<EditorImageContent, "width" | "height"> & {
  sourceWidth?: number;
  sourceHeight?: number;
};

/**
 * Effective ppi of a photo as it sits on the print canvas: 300 dpi times the photo's own pixels
 * over the print pixels its box covers. A photo stretched on one axis only is limited by that
 * axis, so the lower of the two values wins. Rotation and masks do not change it.
 *
 * Returns `null` for a layer saved without its source pixel size — the editor then shows no
 * quality rather than a guess.
 */
export function imagePrintQuality(
  image: PrintableImage | null | undefined,
  scale: { x: number; y: number } = { x: 1, y: 1 },
): ImagePrintQuality | null {
  if (!image) return null;
  const { sourceWidth, sourceHeight } = image;
  if (!sourceWidth || !sourceHeight) return null;
  const coveredX = Math.abs(image.width * (scale.x || 1)) * PRINT_PX_PER_UNIT;
  const coveredY = Math.abs(image.height * (scale.y || 1)) * PRINT_PX_PER_UNIT;
  if (!(coveredX > 0) || !(coveredY > 0)) return null;
  const ppi = Math.round(Math.min(
    (PRINT_DPI * sourceWidth) / coveredX,
    (PRINT_DPI * sourceHeight) / coveredY,
  ));
  return { ppi, level: imagePrintLevel(ppi) };
}
