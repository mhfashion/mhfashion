import { PRINT_CANVAS_SPEC } from "@/lib/editor-canvas-spec";

/** The editor draws in a 1000 x 1200 unit space that maps exactly onto the print area. */
export const ARTWORK_VIEWBOX = { width: 1000, height: 1200 } as const;

export const EXPORT_DPI = PRINT_CANVAS_SPEC.resolutionDpi;

const CM_PER_INCH = 2.54;
const round2 = (value: number) => Math.round(value * 100) / 100;

/** 4500 px at 300 dpi is 15 in, so the print area is 38.1 x 45.72 cm — the same size the press
 * sheet and the layer-measurement CSV quote. */
export const PRINT_AREA_WIDTH_CM = round2((PRINT_CANVAS_SPEC.widthPx / EXPORT_DPI) * CM_PER_INCH);
export const PRINT_AREA_HEIGHT_CM = round2((PRINT_CANVAS_SPEC.heightPx / EXPORT_DPI) * CM_PER_INCH);

export function exportPixelSize(widthCm: number, heightCm: number, dpi: number = EXPORT_DPI) {
  const toPixels = (cm: number) => Math.max(1, Math.round((cm / CM_PER_INCH) * dpi));
  return { width: toPixels(widthCm), height: toPixels(heightCm) };
}

/** The reverse of `exportPixelSize`, so a saved PNG can be checked against the press measurements. */
export function pixelsToCentimetres(pixels: number, dpi: number = EXPORT_DPI) {
  return round2((pixels / dpi) * CM_PER_INCH);
}

export function designExportFileName(name: string, extension: "svg" | "png") {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${slug || "mh-fashion-design"}.${extension}`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * A standalone document holding only the artwork. It is sized in centimetres, so the file the
 * customer keeps opens at the same physical size the press prints.
 */
export function designExportDocument({
  inner,
  title,
  widthCm = PRINT_AREA_WIDTH_CM,
  heightCm = PRINT_AREA_HEIGHT_CM,
  fontCss = "",
}: {
  inner: string;
  title: string;
  widthCm?: number;
  heightCm?: number;
  /** `@font-face` rules with the files inlined. The PNG is rasterised through an `<img>`, which
   * cannot fetch a font, so without this a hosted font would fall back inside the download. */
  fontCss?: string;
}) {
  const fonts = fontCss.trim()
    ? `<defs><style type="text/css"><![CDATA[${fontCss.replaceAll("]]>", "]]]]><![CDATA[>")}]]></style></defs>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${widthCm}cm" height="${heightCm}cm" viewBox="0 0 ${ARTWORK_VIEWBOX.width} ${ARTWORK_VIEWBOX.height}"><title>${escapeXml(title)}</title>${fonts}${inner}</svg>`;
}

export function svgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export type DesignExportOutcome = "downloaded" | "failed";

/** The artwork group of the off-screen export canvas, without the editor's own chrome. */
export function serializeArtworkSvg(svg: SVGSVGElement | null) {
  const group = svg?.querySelector("[data-editor-export-artwork]");
  return group ? group.innerHTML : "";
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadDesignSvg(svg: string, name: string): DesignExportOutcome {
  if (!svg) return "failed";
  saveBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), designExportFileName(name, "svg"));
  return "downloaded";
}

async function rasterize(svg: string, dpi: number) {
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("The design could not be drawn into an image."));
    image.src = svgDataUrl(svg);
  });
  const { width, height } = exportPixelSize(PRINT_AREA_WIDTH_CM, PRINT_AREA_HEIGHT_CM, dpi);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.drawImage(image, 0, 0, width, height);
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
}

/** The PNG carries the print resolution: 4500 x 5400 px, i.e. 38.1 x 45.72 cm at 300 dpi. */
export async function downloadDesignPng(svg: string, name: string, dpi: number = EXPORT_DPI): Promise<DesignExportOutcome> {
  if (!svg) return "failed";
  try {
    const blob = await rasterize(svg, dpi);
    if (!blob) return "failed";
    saveBlob(blob, designExportFileName(name, "png"));
    return "downloaded";
  } catch {
    return "failed";
  }
}
