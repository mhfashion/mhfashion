/**
 * Code 128B bars for the shop floor: the order number as a line a handheld scanner reads.
 *
 * The press sheet already carries a QR, but a scanner is a laser, not a camera: it wants one row of
 * bars at a fixed width. Code 128B is the subset every common scanner decodes out of the box, and it
 * covers exactly what an order id is made of (printable ASCII).
 *
 * The patterns below are the published Code 128 widths: six numbers per symbol (bar, space, bar,
 * space, bar, space) making eleven modules, and seven for the stop symbol, making thirteen.
 */

/** Symbol widths, index 0-102 data, 103 Start A, 104 Start B, 105 Start C, 106 Stop. */
const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
] as const;

const START_B = 104;
const STOP = 106;
const CODE128_B_MIN = 32;
const CODE128_B_MAX = 126;

export type Code128Symbol = { value: number; widths: number[] };

/** The symbol values a Code 128B code carries, checksum included. */
export function code128Symbols(value: string): Code128Symbol[] {
  const text = value.trim();
  if (!text) throw new Error("a barcode needs a value");
  const codes = [START_B];
  for (const character of text) {
    const code = character.codePointAt(0) ?? 0;
    if (code < CODE128_B_MIN || code > CODE128_B_MAX) {
      throw new Error(`Code 128B cannot carry ${JSON.stringify(character)}; use printable ASCII`);
    }
    codes.push(code - CODE128_B_MIN);
  }
  // The checksum weights the start symbol by one, then each data symbol by its position.
  const checksum = codes.reduce((sum, code, index) => sum + code * (index === 0 ? 1 : index), 0) % 103;
  codes.push(checksum, STOP);
  return codes.map((code) => ({ value: code, widths: [...CODE128_PATTERNS[code]].map(Number) }));
}

/** The bars as one string of modules: `1` is ink, `0` is space. */
export function code128Modules(value: string): string {
  let modules = "";
  for (const symbol of code128Symbols(value)) {
    symbol.widths.forEach((width, index) => {
      modules += (index % 2 === 0 ? "1" : "0").repeat(width);
    });
  }
  return modules;
}

export type BarcodeSvgOptions = {
  /** Width of one module in SVG units; the sheet prints at 96dpi, so 2 is a ~0.53mm module. */
  moduleWidth?: number;
  /** Bar height in SVG units. */
  height?: number;
  /** Quiet zone in modules per side; below 10 the laser loses the start symbol. */
  quietZone?: number;
};

/**
 * A vector barcode: one path of bars, no canvas, no font. `shape-rendering: crispEdges` keeps every
 * bar a whole number of pixels so a cheap scanner does not read a blurred edge as a second bar.
 */
export function barcodeSvg(value: string, options: BarcodeSvgOptions = {}): string {
  const text = value.trim();
  const modules = code128Modules(text);
  const moduleWidth = Math.max(1, Math.round(options.moduleWidth ?? 2));
  const height = Math.max(20, Math.round(options.height ?? 48));
  const quietZone = Math.max(0, Math.round(options.quietZone ?? 10));
  const width = (modules.length + quietZone * 2) * moduleWidth;

  let path = "";
  let cursor = 0;
  while (cursor < modules.length) {
    if (modules[cursor] !== "1") {
      cursor += 1;
      continue;
    }
    let run = 0;
    while (cursor + run < modules.length && modules[cursor + run] === "1") run += 1;
    path += `M${(quietZone + cursor) * moduleWidth} 0h${run * moduleWidth}v${height}h-${run * moduleWidth}z`;
    cursor += run;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Barcode ${escapeAttribute(text)}"><rect width="${width}" height="${height}" fill="#ffffff"/><path d="${path}" fill="#000000" shape-rendering="crispEdges"/></svg>`;
}

/**
 * What the printed barcode carries: the order id without its leading `#`. The hash is a display
 * convention, and a scanned id lands in a spreadsheet or a search box, where it is only noise.
 */
export function orderBarcodeValue(orderId: string): string {
  const id = orderId.trim().replace(/^#+/, "").trim();
  if (!id) throw new Error("orderBarcodeValue needs an order id");
  return id;
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
