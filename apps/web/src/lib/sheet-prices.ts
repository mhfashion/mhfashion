import type { AdminTshirtPostAttributeKey } from "@/lib/admin-demo-data";

// T-shirt prices can be kept in a Google Sheet and pulled into a post. The sheet has one
// row per combination, with a column per attribute and a price column:
//
//   Size | Material | Fit Type | Colour | Sleeve | GSM | Cutting | Print | Price
//   XL   | Cotton   | Regular  | Black  |        |     |         | DTF   | 24000
//
// This module stays free of the demo store so the route handler can use it on the server.
// Only types are imported from the store.

export type SheetPriceRow = {
  options: Partial<Record<AdminTshirtPostAttributeKey, string>>;
  priceKs: string;
};

export type SheetParseResult = {
  rows: SheetPriceRow[];
  columns: AdminTshirtPostAttributeKey[];
  issues: string[];
};

const HEADER_ALIASES: Record<string, AdminTshirtPostAttributeKey> = {
  size: "size",
  sizes: "size",
  material: "material",
  fabric: "material",
  fit: "fit",
  "fit type": "fit",
  fittype: "fit",
  colour: "color",
  color: "color",
  colours: "color",
  colors: "color",
  sleeve: "sleeve",
  sleeves: "sleeve",
  "sleeve type": "sleeve",
  gsm: "gsm",
  weight: "gsm",
  cutting: "cutting",
  cut: "cutting",
  print: "print",
  printing: "print",
  "print type": "print",
  dtf: "print",
};

const PRICE_HEADERS = ["price", "price ks", "priceks", "price (ks)", "price mmk", "amount", "ဈေး"];

const SHEET_ID_PATTERN = /^[a-zA-Z0-9_-]{20,}$/;

export function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function attributeForHeader(header: string): AdminTshirtPostAttributeKey | null {
  return HEADER_ALIASES[normalizeHeader(header)] ?? null;
}

export function isPriceHeader(header: string) {
  return PRICE_HEADERS.includes(normalizeHeader(header));
}

// Accepts a normal share link, a bare spreadsheet id, or a URL that already returns CSV.
// The gviz endpoint is the one that works without an API key once the sheet is shared as
// "anyone with the link can view".
export function sheetCsvUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  if (raw.includes("tqx=out:csv") || raw.includes("/export?format=csv") || raw.includes("format=csv")) {
    return raw.startsWith("https://") ? raw : null;
  }

  const match = raw.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  const id = match ? match[1] : SHEET_ID_PATTERN.test(raw) ? raw : null;
  if (!id) return null;

  const gidMatch = raw.match(/[#&?]gid=(\d+)/);
  const gid = gidMatch ? `&gid=${gidMatch[1]}` : "";
  return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv${gid}`;
}

export function isGoogleSheetUrl(url: string) {
  return url.startsWith("https://docs.google.com/");
}

// RFC 4180-ish: quoted cells may contain commas and doubled quotes.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((entry) => entry.some((value) => value.trim() !== ""));
}

// "24,000" / "Ks 24000" / "24000.00" all become "24000".
export function parsePriceCell(value: string): number | null {
  const cleaned = value.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const amount = Number(cleaned);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount);
}

export function parseSheetPrices(text: string): SheetParseResult {
  const table = parseCsv(text);
  const issues: string[] = [];
  if (table.length === 0) return { rows: [], columns: [], issues: ["The sheet is empty."] };

  const header = table[0];
  const columns: AdminTshirtPostAttributeKey[] = [];
  const columnIndex = new Map<AdminTshirtPostAttributeKey, number>();
  let priceIndex = -1;

  header.forEach((cell, index) => {
    const key = attributeForHeader(cell);
    if (key && !columnIndex.has(key)) {
      columnIndex.set(key, index);
      columns.push(key);
      return;
    }
    if (priceIndex < 0 && isPriceHeader(cell)) priceIndex = index;
  });

  if (priceIndex < 0) issues.push('No price column found. Name it "Price" (or "Price Ks").');
  if (columns.length === 0) issues.push("No attribute columns found. Use Size, Material, Fit Type, Colour, Sleeve, GSM, Cutting or Print.");

  const rows: SheetPriceRow[] = [];
  const seen = new Set<string>();

  table.slice(1).forEach((cells, position) => {
    const line = position + 2;
    const options: Partial<Record<AdminTshirtPostAttributeKey, string>> = {};
    for (const key of columns) {
      const value = (cells[columnIndex.get(key) ?? -1] ?? "").trim();
      if (value) options[key] = value;
    }
    if (Object.keys(options).length === 0) return;

    const price = priceIndex >= 0 ? parsePriceCell(cells[priceIndex] ?? "") : null;
    if (price === null) {
      issues.push(`Row ${line}: no usable price.`);
      return;
    }
    if (price > 10_000_000) {
      issues.push(`Row ${line}: ${price} Ks is above the 10,000,000 Ks limit.`);
      return;
    }

    const key = columns.map((column) => `${column}=${options[column] ?? ""}`).join("|");
    if (seen.has(key)) {
      issues.push(`Row ${line}: this combination is already listed above.`);
      return;
    }
    seen.add(key);
    rows.push({ options, priceKs: String(price) });
  });

  if (rows.length === 0 && issues.length === 0) issues.push("No priced rows found under the header.");
  return { rows, columns, issues };
}

export type SheetReadResult =
  | { ok: true; result: SheetParseResult }
  | { ok: false; status: number; error: string };

// Split out from the route so the fetch can be stubbed in tests. The fetcher is injected
// rather than imported so no module-level network code runs in a unit test.
export async function readSheetPrices(csvUrl: string, fetcher: typeof fetch = fetch): Promise<SheetReadResult> {
  let response: Response;
  try {
    response = await fetcher(csvUrl, { cache: "no-store", redirect: "follow" });
  } catch {
    return { ok: false, status: 502, error: "Google Sheets could not be reached." };
  }

  if (!response.ok) {
    const hint = response.status === 401 || response.status === 403
      ? " Share the sheet as “anyone with the link can view”."
      : "";
    return { ok: false, status: 502, error: `Google Sheets returned ${response.status}.${hint}` };
  }

  const csv = await response.text();
  if (/<html/i.test(csv.slice(0, 400))) {
    return { ok: false, status: 502, error: "Google returned a sign-in page; the sheet is not shared publicly." };
  }
  return { ok: true, result: parseSheetPrices(csv) };
}
