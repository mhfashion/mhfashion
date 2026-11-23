// A measured size chart per product (Plan P1 item 10). The catalog shipped with no measurements at all —
// the product page said "choose your usual size" and the size guide was generic prose — so this module is
// the shape the admin fills in and the product page reads.
//
// Measurements are stored in centimetres because that is what the tape reads; inches are derived for
// display. Nothing is seeded: a style with no chart says so rather than showing a guessed number, because
// a wrong chest measurement is a returned garment.

export const SIZE_CHART_MEASURES = ["chest", "length", "shoulder", "sleeve"] as const;
export type SizeChartMeasure = (typeof SIZE_CHART_MEASURES)[number];

export const SIZE_CHART_MEASURE_LABEL: Record<SizeChartMeasure, string> = {
  chest: "Chest",
  length: "Length",
  shoulder: "Shoulder",
  sleeve: "Sleeve",
};

/** Half centimetres are as fine as a tape measure gets; anything coarser is a typo. */
export const SIZE_CHART_STEP_CM = 0.5;
export const SIZE_CHART_MAX_CM = 200;

export type SizeChartSize = Partial<Record<SizeChartMeasure, number>>;
/** Keyed by the product's own size label, so "S" and "2XL" mean what the catalog means. */
export type ProductSizeChart = Record<string, SizeChartSize>;

const CM_PER_INCH = 2.54;

export function cmToInches(cm: number): number {
  return Math.round((cm / CM_PER_INCH) * 10) / 10;
}

export function inchesToCm(inches: number): number {
  return Math.round(inches * CM_PER_INCH * 2) / 2;
}

export function roundCm(value: number): number {
  return Math.round(value / SIZE_CHART_STEP_CM) * SIZE_CHART_STEP_CM;
}

function isMeasure(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= SIZE_CHART_MAX_CM;
}

/** Drops what cannot be measured; an empty result means "no chart yet", not "zero". */
export function normalizeSizeChart(raw: unknown): ProductSizeChart {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const chart: ProductSizeChart = {};
  for (const [size, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (!size.trim() || !entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const measured: SizeChartSize = {};
    for (const measure of SIZE_CHART_MEASURES) {
      const value = (entry as Record<string, unknown>)[measure];
      if (isMeasure(value)) measured[measure] = roundCm(value);
    }
    if (Object.keys(measured).length) chart[size.trim()] = measured;
  }
  return chart;
}

export function sizeChartIsEmpty(chart: ProductSizeChart | undefined | null): boolean {
  return !chart || Object.keys(chart).length === 0;
}

export type SizeChartRow = { size: string; measures: SizeChartSize; complete: boolean };

/** Rows in the product's own size order; a size with nothing measured is left out, not shown blank. */
export function sizeChartRows(chart: ProductSizeChart | undefined | null, sizes: readonly string[]): SizeChartRow[] {
  if (sizeChartIsEmpty(chart)) return [];
  const source = chart as ProductSizeChart;
  const order = sizes.length ? sizes : Object.keys(source);
  return order
    .filter((size) => source[size] && Object.keys(source[size]).length > 0)
    .map((size) => ({
      size,
      measures: source[size],
      complete: SIZE_CHART_MEASURES.every((measure) => typeof source[size][measure] === "number"),
    }));
}

/** The measures that at least one row fills, so a cap chart is not shown with empty sleeve columns. */
export function sizeChartMeasures(chart: ProductSizeChart | undefined | null): SizeChartMeasure[] {
  if (sizeChartIsEmpty(chart)) return [];
  const source = chart as ProductSizeChart;
  return SIZE_CHART_MEASURES.filter((measure) => Object.values(source).some((entry) => typeof entry[measure] === "number"));
}

/** Writes one cell, leaving the rest of the chart alone; a blank or zero clears the cell. */
export function setSizeChartCell(
  chart: ProductSizeChart | undefined,
  size: string,
  measure: SizeChartMeasure,
  value: number | null,
): ProductSizeChart {
  const next: ProductSizeChart = { ...(chart ?? {}) };
  const entry: SizeChartSize = { ...(next[size] ?? {}) };
  if (value === null || !Number.isFinite(value) || value <= 0) delete entry[measure];
  else entry[measure] = roundCm(Math.min(value, SIZE_CHART_MAX_CM));
  if (Object.keys(entry).length) next[size] = entry;
  else delete next[size];
  return next;
}

export function formatMeasure(cm: number, unit: "cm" | "in"): string {
  return unit === "cm" ? `${cm} cm` : `${cmToInches(cm)} in`;
}
