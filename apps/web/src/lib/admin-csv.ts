export type CsvCell = string | number | null | undefined;

/**
 * A spreadsheet runs any cell that starts with one of these, so a customer name of
 * `=HYPERLINK("http://evil","Invoice")` would become a live formula in the admin's Excel. Text cells
 * are made inert with a leading apostrophe; numbers are passed through untouched.
 */
const FORMULA_START = /^[=+\-@\t\r]/;
/** `-5` and `+95 9 123 456` are data, not formulas, and must stay readable. */
const PLAIN_NUMBER = /^-?\d+(?:\.\d+)?$/;
const PHONE_LIKE = /^\+\d[\d\s().-]*$/;

function neutralise(value: string): string {
  if (!FORMULA_START.test(value)) return value;
  if (PLAIN_NUMBER.test(value) || PHONE_LIKE.test(value)) return value;
  return `'${value}`;
}

export function toCsv(rows: CsvCell[][]): string {
  return rows.map((row) => row.map(escapeCell).join(",")).join("\r\n");
}

function escapeCell(cell: CsvCell) {
  const raw = cell === null || cell === undefined ? "" : String(cell);
  const value = typeof cell === "string" ? neutralise(raw) : raw;
  return /[",\r\n']/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function downloadCsv(filename: string, rows: CsvCell[][]) {
  const blob = new Blob([`\uFEFF${toCsv(rows)}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
