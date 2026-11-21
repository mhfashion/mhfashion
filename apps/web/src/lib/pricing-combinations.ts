// Pricing Management (Plan §4.5.1): a price belongs to one full valid combination, never to a
// size or a base price with deltas. Everything here is pure so the grid, the CSV round-trip and
// the tests share one definition of "valid combination" and "valid price".

import { fabricTypeOptions, knitStructureOptions } from "@/lib/editor-attributes";

export type PricingAttribute = { key: string; label: string; options: readonly string[] };
export type PricingOptions = Record<string, string>;
export type PricingRow = { key: string; options: PricingOptions };

export const MAX_PRICE_KS = 9_999_999;
/** Guards the cartesian product: a 7-attribute chain can otherwise explode into thousands of rows. */
export const MAX_COMBINATIONS = 2000;

export type ParsedPrice = { ok: true; value: number } | { ok: false; error: string };

/**
 * Accepts `24000`, `24,000`, `Ks 24000` and `Ks 24,000` (the spec's three shapes). Rejects 0,
 * negatives, non-numeric input and anything at or above Ks 10,000,000.
 */
export function parsePriceInput(raw: string): ParsedPrice {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: "Enter a price." };
  const cleaned = trimmed.replace(/^ks\.?\s*/i, "").replace(/[\s,]/g, "");
  if (!/^\d+$/.test(cleaned)) return { ok: false, error: "Prices are whole Ks numbers." };
  const value = Number(cleaned);
  if (!Number.isSafeInteger(value)) return { ok: false, error: "Prices are whole Ks numbers." };
  if (value <= 0) return { ok: false, error: "Prices must be more than Ks 0." };
  if (value > MAX_PRICE_KS) return { ok: false, error: `Prices must stay under ${MAX_PRICE_KS.toLocaleString("en-US")} Ks.` };
  return { ok: true, value };
}

/** The grid and the CSV both write prices with thousands separators; the store keeps integers. */
export function formatPriceInput(value: number | null | undefined): string {
  return value ? value.toLocaleString("en-US") : "";
}

/** Cascade rule from Plan §4.1: Sublimation is polyester-only, and polyester knits are not jersey. */
export function isValidCombination(options: PricingOptions): boolean {
  const print = options.print;
  const fabric = options.material;
  const knit = options.knit;
  if (print && fabric && !fabricTypeOptions(print).includes(fabric)) return false;
  if (fabric && knit && !knitStructureOptions(fabric).includes(knit)) return false;
  return true;
}

export function rowKey(options: PricingOptions, keys: readonly string[]): string {
  return keys.map((key) => `${key}=${options[key] ?? ""}`).join("|");
}

/** One row per valid combination, in attribute order so the grid reads like the chain. */
export function combinationsFor(attributes: readonly PricingAttribute[]): PricingRow[] {
  const usable = attributes.filter((attribute) => attribute.options.length > 0);
  if (!usable.length) return [];
  const keys = usable.map((attribute) => attribute.key);
  let rows: PricingRow[] = [{ key: "", options: {} }];
  for (const attribute of usable) {
    if (rows.length * attribute.options.length > MAX_COMBINATIONS * 8) break;
    rows = rows.flatMap((row) => attribute.options.map((option) => ({
      key: "",
      options: { ...row.options, [attribute.key]: option },
    })));
  }
  return rows
    .filter((row) => isValidCombination(row.options))
    .map((row) => ({ key: rowKey(row.options, keys), options: row.options }));
}

export function combinationLabel(attributes: readonly PricingAttribute[], options: PricingOptions): string {
  return attributes.map((attribute) => options[attribute.key] ?? "—").join(" · ");
}

/** Search text for a row: the combination words plus the label, so "navy xl" finds it. */
export function combinationSearchText(attributes: readonly PricingAttribute[], options: PricingOptions): string {
  return `${attributes.map((attribute) => `${attribute.label} ${options[attribute.key] ?? ""}`).join(" ")} ${combinationLabel(attributes, options)}`.toLowerCase();
}

export type PriceState = "priced" | "unpriced";

export function priceState(price: number | null | undefined): PriceState {
  return price && price > 0 ? "priced" : "unpriced";
}

export function pricingSummary(rows: readonly PricingRow[], prices: ReadonlyMap<string, number>): {
  total: number;
  priced: number;
  unpriced: number;
} {
  const priced = rows.filter((row) => priceState(prices.get(row.key)) === "priced").length;
  return { total: rows.length, priced, unpriced: rows.length - priced };
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * UTF-8 with a BOM so Excel opens Myanmar text correctly (spec: CSV export). One column per
 * attribute plus `Price`; unpriced rows export with an empty price so a re-import leaves them
 * unpriced instead of writing a zero.
 */
export function buildPricingCsv(
  attributes: readonly PricingAttribute[],
  rows: readonly PricingRow[],
  prices: ReadonlyMap<string, number>,
): string {
  const header = [...attributes.map((attribute) => attribute.label), "Price"];
  const lines = rows.map((row) => [
    ...attributes.map((attribute) => csvCell(row.options[attribute.key] ?? "")),
    csvCell(formatPriceInput(prices.get(row.key) ?? null)),
  ].join(","));
  return `\uFEFF${[header.map(csvCell).join(","), ...lines].join("\n")}\n`;
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quoted) {
      if (char === '"' && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

export type PricingImportRow = {
  line: number;
  options: PricingOptions;
  key: string | null;
  priceKs: number | null;
  status: "new" | "change" | "same" | "invalid";
  reason?: string;
};

/**
 * Import is a file upload that only *previews*: every line is classified as new / changed /
 * unchanged / invalid with a reason, and nothing is written until the admin confirms.
 */
export function parsePricingCsv(
  text: string,
  attributes: readonly PricingAttribute[],
  rows: readonly PricingRow[],
  prices: ReadonlyMap<string, number>,
): { rows: PricingImportRow[]; issues: string[] } {
  const issues: string[] = [];
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (!lines.length) return { rows: [], issues: ["The file is empty."] };

  const header = splitCsvLine(lines[0]).map((cell) => cell.toLowerCase());
  const columns = attributes.map((attribute) => {
    const at = header.findIndex((cell) => cell === attribute.label.toLowerCase() || cell === attribute.key.toLowerCase());
    if (at === -1) issues.push(`The file has no ${attribute.label} column.`);
    return at;
  });
  const priceAt = header.findIndex((cell) => cell === "price" || cell === "price ks" || cell === "price_ks");
  if (priceAt === -1) issues.push("The file has no Price column.");
  if (issues.length) return { rows: [], issues };

  const byKey = new Map(rows.map((row) => [row.key, row]));
  const keys = attributes.map((attribute) => attribute.key);
  const parsed: PricingImportRow[] = [];
  const seen = new Set<string>();

  lines.slice(1).forEach((line, index) => {
    const cells = splitCsvLine(line);
    const options: PricingOptions = {};
    attributes.forEach((attribute, at) => {
      options[attribute.key] = cells[columns[at]] ?? "";
    });
    const priceRaw = cells[priceAt] ?? "";
    const key = rowKey(options, keys);
    const lineNumber = index + 2;
    if (seen.has(key)) {
      parsed.push({ line: lineNumber, options, key: null, priceKs: null, status: "invalid", reason: "Duplicate of an earlier row." });
      return;
    }
    seen.add(key);
    if (!byKey.has(key)) {
      parsed.push({ line: lineNumber, options, key: null, priceKs: null, status: "invalid", reason: "No such combination for this scope." });
      return;
    }
    const current = prices.get(key) ?? null;
    if (!priceRaw.trim() && current === null) {
      parsed.push({ line: lineNumber, options, key, priceKs: null, status: "same" });
      return;
    }
    const price = parsePriceInput(priceRaw);
    if (!price.ok) {
      parsed.push({ line: lineNumber, options, key, priceKs: null, status: "invalid", reason: price.error });
      return;
    }
    const status = current === null ? "new" : current === price.value ? "same" : "change";
    parsed.push({ line: lineNumber, options, key, priceKs: price.value, status });
  });

  const valid = parsed.filter((row) => row.status !== "invalid").length;
  if (valid === 0) issues.push("No row in the file could be applied.");
  return { rows: parsed, issues };
}

/** Only new/changed rows are written; unchanged and invalid rows are left alone. */
export function importChanges(parsed: readonly PricingImportRow[]): PricingImportRow[] {
  return parsed.filter((row) => (row.status === "new" || row.status === "change") && row.key && row.priceKs);
}
