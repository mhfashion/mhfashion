import type { AdminDesignLayer, AdminOrder, AdminOrderDesign } from "./admin-demo-data";

/**
 * What the press would get wrong. The editor lets a layer sit past the print area (the mockup
 * clips it) and it lets a layer shrink to almost nothing, so the saved order can carry artwork
 * that cannot be printed as drawn. These checks read only the saved design, so the same numbers
 * reach the press sheet, the manifest and the archive README.
 */
export type PrintQualityLevel = "error" | "warning";

export type PrintQualityIssue = {
  code: "blank-design" | "outside-print-area" | "tiny-artwork";
  level: PrintQualityLevel;
  design: string;
  layer?: string;
  message: string;
};

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

export function checkDesignQuality(design: AdminOrderDesign): PrintQualityIssue[] {
  if (design.layers.length === 0) {
    return [{
      code: "blank-design",
      level: "error",
      design: design.fileName,
      message: `${design.fileName} holds no artwork, so there is nothing to print.`,
    }];
  }
  const issues: PrintQualityIssue[] = [];
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
    const outside = box.left < -EDGE_TOLERANCE_CM
      || box.top < -EDGE_TOLERANCE_CM
      || box.right > design.printWidthCm + EDGE_TOLERANCE_CM
      || box.bottom > design.printHeightCm + EDGE_TOLERANCE_CM;
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
    issues.push(...checkDesignQuality(design));
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
