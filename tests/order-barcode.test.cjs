const assert = require("node:assert/strict");
const test = require("node:test");

const { readFileSync } = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

// The sheet pulls in `qrcode`, which needs the same esModuleInterop the app tsconfig uses.
const ROOT = path.join(__dirname, "..");
function loadModule(relativePath, cache = new Map()) {
  const sourcePath = path.join(ROOT, relativePath);
  if (cache.has(sourcePath)) return cache.get(sourcePath);
  const compiled = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: sourcePath,
  }).outputText;
  const loaded = { exports: {} };
  cache.set(sourcePath, loaded.exports);
  const localRequire = (specifier) => {
    if (specifier.startsWith("@/")) return loadModule(`apps/web/src/${specifier.slice(2)}.ts`, cache);
    if (specifier.startsWith(".")) {
      return loadModule(path.relative(ROOT, path.join(path.dirname(sourcePath), `${specifier}.ts`)), cache);
    }
    return require(specifier);
  };
  new Function("module", "exports", "require", compiled)(loaded, loaded.exports, localRequire);
  return loaded.exports;
}

const barcode = loadModule("apps/web/src/lib/order-barcode.ts");
const print = loadModule("apps/web/src/lib/order-print.ts");

const PATTERN_COUNT = 107;

test("the pattern table is a real Code 128 table", () => {
  // Every symbol is seven widths summing to eleven modules, except the stop symbol's thirteen.
  const symbols = barcode.code128Symbols("A");
  assert.equal(symbols.length, 4, "start, one data symbol, checksum and stop");
  for (const symbol of symbols.slice(0, -1)) {
    assert.equal(symbol.widths.length, 6, "six widths per symbol: bar, space, bar, space, bar, space");
    assert.equal(symbol.widths.reduce((sum, width) => sum + width, 0), 11, "eleven modules per symbol");
  }
  const stop = symbols.at(-1);
  assert.equal(stop.value, 106, "the last symbol is stop");
  assert.deepEqual(stop.widths, [2, 3, 3, 1, 1, 1, 2], "the stop pattern is the published one");
});

test("the stop pattern is the only thirteen-module symbol", () => {
  const everything = barcode.code128Symbols(" !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~");
  const widths = everything.map((symbol) => symbol.widths.reduce((sum, width) => sum + width, 0));
  assert.equal(widths.filter((width) => width === 13).length, 1, "exactly one stop symbol");
  assert.equal(widths.filter((width) => width !== 11 && width !== 13).length, 0, "nothing else is off-width");
});

test("an order id encodes as start B, its characters, a checksum and stop", () => {
  const symbols = barcode.code128Symbols("MH2001");
  assert.deepEqual(symbols.map((symbol) => symbol.value), [104, 45, 40, 18, 16, 16, 17, 14, 106]);
  // 104*1 + 45*1 + 40*2 + 18*3 + 16*4 + 16*5 + 17*6 = 529; 529 mod 103 = 14.
  assert.equal(symbols[7].value, 14, "the checksum is weighted by position");
  assert.equal(symbols.at(-1).value, 106, "stop closes the code");
});

test("the module string is the widths, bar first", () => {
  const modules = barcode.code128Modules("A");
  assert.equal(modules.length, 3 * 11 + 13, "three eleven-module symbols and the stop");
  assert.equal(modules[0], "1", "a Code 128 code starts with a bar");
  assert.match(modules, /^[01]+$/, "only modules");
  assert.equal(modules.at(-1), "1", "the stop symbol ends on a bar");
  // Every bar run and every space run is one to four modules wide.
  const runs = modules.match(/(.)\1*/g).map((run) => run.length);
  assert.equal(runs.every((run) => run >= 1 && run <= 4), true, `runs stay within 1-4 modules: ${runs.join(",")}`);
});

test("a scanner can read the bars back", () => {
  // Decode by width, the way a laser does: look the run pattern up in the same published table.
  const value = "MH2001";
  const modules = barcode.code128Modules(value);
  const runs = modules.match(/(.)\1*/g).map((run) => run.length);
  const stop = runs.slice(-7).join("");
  const symbols = [];
  for (let index = 0; index < runs.length - 7; index += 6) {
    symbols.push(runs.slice(index, index + 6).join(""));
  }
  assert.equal(stop, "2331112", "the stop reads back as the stop pattern");
  // The decoded widths must equal what the encoder produced, symbol for symbol.
  const encoded = barcode.code128Symbols(value).map((symbol) => symbol.widths.join(""));
  assert.deepEqual([...symbols, stop], encoded, "the widths decode to the same symbols");
});

test("the SVG is one crisp path over a white quiet zone", () => {
  const svg = barcode.barcodeSvg("MH2001");
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="\d+" height="48"/);
  assert.match(svg, /role="img" aria-label="Barcode MH2001"/, "the code names itself for a screen reader");
  assert.match(svg, /<rect width="\d+" height="48" fill="#ffffff"\/>/, "a white background under the bars");
  assert.match(svg, /shape-rendering="crispEdges"/, "blurred edges read as extra bars");
  assert.equal((svg.match(/<path/g) ?? []).length, 1, "all bars are one path");

  const modules = barcode.code128Modules("MH2001").length;
  const quiet = 10;
  const moduleWidth = 2;
  const expected = (modules + quiet * 2) * moduleWidth;
  assert.match(svg, new RegExp(`width="${expected}" height="48"`), "the width is the modules plus both quiet zones");
  assert.match(svg, new RegExp(`M${quiet * moduleWidth} 0h`), "the first bar starts after the quiet zone");
});

test("options are honoured and a silly value cannot shrink the bars", () => {
  const wide = barcode.barcodeSvg("MH2001", { moduleWidth: 4, height: 80, quietZone: 4 });
  assert.match(wide, /height="80"/);
  assert.match(wide, /M16 0h/, "4 modules of quiet zone at 4 units each");
  const small = barcode.barcodeSvg("MH2001", { moduleWidth: 0, height: 1, quietZone: -5 });
  assert.match(small, /width="101" height="20"/, "a zero module is one unit, a one-unit height is twenty");
  assert.match(small, /M0 0h/, "a negative quiet zone is none");
});

test("what Code 128B cannot carry is refused, not silently mangled", () => {
  assert.throws(() => barcode.code128Modules(""), /needs a value/);
  assert.throws(() => barcode.code128Modules("   "), /needs a value/);
  assert.throws(() => barcode.code128Modules("MH-é"), /cannot carry/, "an accented letter has no Code 128B value");
  assert.throws(() => barcode.code128Modules("MH\n1"), /cannot carry/, "a newline has no Code 128B value");
  assert.throws(() => barcode.orderBarcodeValue(""), /needs an order id/);
  assert.equal(barcode.orderBarcodeValue("  MH2001 "), "MH2001", "the printed value is trimmed");
  assert.equal(barcode.orderBarcodeValue("#MH2001"), "MH2001", "the display hash is not part of the id a scanner types");
  assert.throws(() => barcode.orderBarcodeValue("#"), /needs an order id/, "a bare hash is not an id");
});

test("the press sheet carries both the bars and the QR", () => {
  const sheet = print.buildOrderPrintSheetHtml({
    id: "MH2001",
    customerName: "Aye Aye",
    customerEmail: "aye@example.com",
    customerPhone: "09-000-000-000",
    items: [{ productName: "Tee", productSlug: "tee", color: "White", size: "M", quantity: 1, price: 25000, printMethod: "DTF", design: null }],
    stage: "Confirmed",
    payment: "KBZPay",
    total: 25000,
    placedAt: new Date(Date.UTC(2026, 10, 20, 4)).toISOString(),
    address: { line1: "1 Road", city: "Yangon", township: "Hlaing", region: "Yangon", postalCode: "11011", country: "Myanmar" },
    reprints: [],
  });
  assert.match(sheet, /figure class="barcode"/, "the bars are on the sheet");
  assert.match(sheet, /aria-label="Barcode MH2001"/, "and they carry the order id");
  assert.match(sheet, /figure class="qr"/, "the QR is still there for a camera");
  assert.match(sheet, /\.codes \{ display: flex; flex-direction: column/, "the two codes stack in the corner");
});
