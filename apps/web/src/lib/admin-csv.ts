export type CsvCell = string | number | null | undefined;

export function toCsv(rows: CsvCell[][]): string {
  return rows.map((row) => row.map(escapeCell).join(",")).join("\r\n");
}

function escapeCell(cell: CsvCell) {
  const value = cell === null || cell === undefined ? "" : String(cell);
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
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
