import type { AdminDesignLayer, AdminOrder, AdminOrderDesign } from "./admin-demo-data";

/**
 * What the press would get wrong. The editor lets a layer sit past the print area (the mockup
 * clips it) and it lets a layer shrink to almost nothing, so the saved order can carry artwork
 * that cannot be printed as drawn. These checks read only the saved design, so the same numbers
 * reach the press sheet, the manifest and the archive README.
 */
export type PrintQualityLevel = "error" | "warning";

export type PrintQualityIssue = {
  code: "blank-design" | "outside-print-area" | "tiny-artwork" | "edge-too-tight" | "no-white-ink" | "line-too-thin";
  level: PrintQualityLevel;
  design: string;
  layer?: string;
  message: string;
};

export type PrintMethod = "DTF" | "Sublimation";

/**
 * Plan P1-6: the print method decides what the press can hold, so the same artwork is checked
 * differently on a DTF sheet and on a sublimation run.
 * - DTF prints a white underlayer and holds a hard edge, so artwork may run close to the edge.
 * - Sublimation dyes the polyester and prints no white ink: white artwork takes the fabric colour, and
 *   an edge-to-edge print needs bleed because the dye wicks.
 * The margins below are the shop's starting defaults, kept here so the owner can change them in one
 * place once the press confirms its tolerances.
 */
export const PRINT_METHOD_RULES: Record<PrintMethod, {
  edgeMarginCm: number;
  printsWhiteInk: boolean;
  /**
   * Thinnest line the press can hold. Under this a stroke breaks up or fades on the garment, so the
   * desk is asked to thicken it or fill the shape. Starting defaults, like the margins above.
   */
  minStrokeMm: number;
}> = {
  DTF: { edgeMarginCm: 0.1, printsWhiteInk: true, minStrokeMm: 0.2 },
  Sublimation: { edgeMarginCm: 0.3, printsWhiteInk: false, minStrokeMm: 0.3 },
};

/** The strictest line the press holds, used where the print method is not known yet (the editor). */
export const STRICTEST_MIN_STROKE_MM = Math.max(...Object.values(PRINT_METHOD_RULES).map((rules) => rules.minStrokeMm));

/**
 * A stroke's printed width in millimetres. Scaling a layer down shrinks its line with it, which is
 * how a hairline reaches the press: the shape was drawn thick and then dragged small.
 */
export function strokePrintMm(strokeWidthUnits: number, unitsPerCm: number, scale = 1): number {
  const units = unitsPerCm > 0 ? unitsPerCm : 10;
  const factor = scale > 0 ? scale : 1;
  return Math.round(((strokeWidthUnits * factor) / units) * 10 * 100) / 100;
}

/** A layer's painted line width in millimetres; `null` when the layer paints no line. */
export function layerStrokeMm(layer: AdminDesignLayer, unitsPerCm: number): number | null {
  const units = unitsPerCm > 0 ? unitsPerCm : 10;
  const stroke = layer.strokeWidth;
  if (typeof stroke !== "number" || !(stroke > 0)) return null;
  return Math.round((stroke / units) * 10 * 100) / 100;
}

export function printMethodOf(value: unknown): PrintMethod | null {
  const text = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (text === "dtf") return "DTF";
  if (text === "sublimation") return "Sublimation";
  return null;
}

/** `#fff`, `white` and `rgb(255,255,255)` all mean no ink at all; so does a near-white. */
export function inkIsWhite(ink: string): boolean {
  const value = ink.trim().toLowerCase();
  if (value === "white" || value === "#fff") return true;
  const hex = /^#([0-9a-f]{6})(?:[0-9a-f]{2})?$/.exec(value);
  if (hex) return [0, 2, 4].every((index) => parseInt(hex[1].slice(index, index + 2), 16) >= 250);
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(value);
  if (rgb) return Number(rgb[1]) >= 250 && Number(rgb[2]) >= 250 && Number(rgb[3]) >= 250;
  return false;
}

/**
 * A 5 mm wordmark prints fine, so "tiny" means a sliver: under 3 mm on a side, or under 0.2 cm²
 * in total. Anything smaller is a misplaced layer far more often than a design choice.
 */
const TINY_SIDE_CM = 0.3;
const TINY_AREA_CM2 = 0.2;
/** Centimetre rounding must not read as artwork hanging off the print area. */
const EDGE_TOLERANCE_CM = 0.05;

export type LayerBoxCm = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

const round1 = (value: number) => Math.round(value * 10) / 10;

/**
 * A layer's axis-aligned box in centimetres from the print area's top-left corner. The layer box
 * is rotated about its own centre (`designLayerSvg` does the same), so the corners of a rotated
 * layer can reach past the unrotated box.
 */
export function layerBoxCm(layer: AdminDesignLayer, unitsPerCm: number): LayerBoxCm {
  const units = unitsPerCm > 0 ? unitsPerCm : 10;
  const scale = layer.scale > 0 ? layer.scale : 1;
  const width = (layer.width * scale) / units;
  const height = (layer.height * scale) / units;
  const centerX = (layer.x + (layer.width * scale) / 2) / units;
  const centerY = (layer.y + (layer.height * scale) / 2) / units;
  const radians = ((layer.rotation ?? 0) * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  const halfWidth = (width * cos + height * sin) / 2;
  const halfHeight = (width * sin + height * cos) / 2;
  return {
    left: centerX - halfWidth,
    top: centerY - halfHeight,
    right: centerX + halfWidth,
    bottom: centerY + halfHeight,
    width,
    height,
  };
}

export function checkDesignQuality(design: AdminOrderDesign, method: PrintMethod | null = null): PrintQualityIssue[] {
  if (design.layers.length === 0) {
    return [{
      code: "blank-design",
      level: "error",
      design: design.fileName,
      message: `${design.fileName} holds no artwork, so there is nothing to print.`,
    }];
  }
  const issues: PrintQualityIssue[] = [];
  const rules = method ? PRINT_METHOD_RULES[method] : null;
  if (rules && !rules.printsWhiteInk && inkIsWhite(design.ink)) {
    issues.push({
      code: "no-white-ink",
      level: "warning",
      design: design.fileName,
      message: `${design.fileName} is white and ${method} prints no white ink, so it comes out in the garment colour. Pick a darker ink or switch the method to DTF.`,
    });
  }
  for (const layer of design.layers) {
    const box = layerBoxCm(layer, design.unitsPerCm);
    if (Math.min(box.width, box.height) < TINY_SIDE_CM || box.width * box.height < TINY_AREA_CM2) {
      issues.push({
        code: "tiny-artwork",
        level: "warning",
        design: design.fileName,
        layer: layer.name,
        message: `${layer.name} is ${round1(box.width)} × ${round1(box.height)} cm, too small to print cleanly.`,
      });
    }
    if (rules) {
      const strokeMm = layerStrokeMm(layer, design.unitsPerCm);
      if (strokeMm !== null && strokeMm < rules.minStrokeMm) {
        issues.push({
          code: "line-too-thin",
          level: "warning",
          design: design.fileName,
          layer: layer.name,
          message: `${layer.name} draws a ${strokeMm} mm line; ${method} needs ${rules.minStrokeMm} mm, so thicken the line or fill the shape.`,
        });
      }
    }
    const outside = box.left < -EDGE_TOLERANCE_CM
      || box.top < -EDGE_TOLERANCE_CM
      || box.right > design.printWidthCm + EDGE_TOLERANCE_CM
      || box.bottom > design.printHeightCm + EDGE_TOLERANCE_CM;
    if (!outside && rules) {
      const margin = rules.edgeMarginCm;
      const gaps = [box.left, box.top, design.printWidthCm - box.right, design.printHeightCm - box.bottom];
      const closest = Math.min(...gaps);
      if (closest < margin) {
        issues.push({
          code: "edge-too-tight",
          level: "warning",
          design: design.fileName,
          layer: layer.name,
          message: `${layer.name} comes within ${Math.max(0, round1(closest))} cm of the print edge; ${method} wants ${margin} cm so the fabric edge does not eat it.`,
        });
      }
    }
    if (outside) {
      issues.push({
        code: "outside-print-area",
        level: "error",
        design: design.fileName,
        layer: layer.name,
        message: `${layer.name} runs from ${round1(box.left)} to ${round1(box.right)} cm across and ${round1(box.top)} to ${round1(box.bottom)} cm down, past the ${design.printWidthCm} × ${design.printHeightCm} cm print area, so it prints cut off.`,
      });
    }
  }
  return issues;
}

/** One design can sit on several lines; report it once, under its file name. */
export function orderQualityIssues(order: Pick<AdminOrder, "items">): PrintQualityIssue[] {
  const seen = new Set<string>();
  const issues: PrintQualityIssue[] = [];
  for (const item of order.items) {
    const design = item.design;
    if (!design || seen.has(design.fileName)) continue;
    seen.add(design.fileName);
    issues.push(...checkDesignQuality(design, printMethodOf(item.printMethod)));
  }
  return issues;
}

export function qualitySummaryLine(issues: PrintQualityIssue[]): string {
  if (issues.length === 0) return "Quality check passed: every layer sits inside its print area.";
  const errors = issues.filter((issue) => issue.level === "error").length;
  const warnings = issues.length - errors;
  const parts = [errors ? `${errors} blocking` : "", warnings ? `${warnings} warning${warnings === 1 ? "" : "s"}` : ""]
    .filter(Boolean)
    .join(", ");
  return `Quality check: ${parts}.`;
}

/** README lines: the summary first, then one indented line per issue. */
export function qualityReadmeLines(issues: PrintQualityIssue[]): string[] {
  if (issues.length === 0) return [qualitySummaryLine(issues)];
  return [
    qualitySummaryLine(issues),
    ...issues.map((issue) => `  ${issue.level === "error" ? "!" : "·"} ${issue.message}`),
  ];
}

/** The same list on the press sheet, so a blocking design is visible before the press starts. */
export function qualitySheetHtml(issues: PrintQualityIssue[]): string {
  if (issues.length === 0) return "";
  const items = issues
    .map((issue) => `<li class="${issue.level}">${escapeHtml(issue.message)}</li>`)
    .join("");
  return `<section class="quality"><b>${escapeHtml(qualitySummaryLine(issues))}</b><ul>${items}</ul></section>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
