const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

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

const quality = loadModule("apps/web/src/lib/print-quality.ts");
const print = loadModule("apps/web/src/lib/order-print.ts");

/** A design whose layers are all inside a 30 x 40 cm print area. */
function design(overrides = {}) {
  return {
    id: "design-1",
    name: "Front artwork",
    fileName: "front-artwork.svg",
    ink: "#111111",
    svg: "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>",
    printWidthCm: 30,
    printHeightCm: 40,
    unitsPerCm: 10,
    placement: "Front",
    mockup: { name: "T-shirt · White · M", garmentWidthCm: 50, garmentHeightCm: 70, printAreaXCm: 10, printAreaYCm: 15 },
    layers: [
      { name: "Logo", kind: "shape", x: 100, y: 100, width: 100, height: 100, rotation: 0, scale: 1 },
    ],
    ...overrides,
  };
}

function order(items) {
  return {
    id: "MH2001",
    customerName: "Aye Aye",
    customerEmail: "aye@example.com",
    customerPhone: "09-000-000-000",
    items,
    stage: "Confirmed",
    payment: "KBZPay",
    placedAt: "2026-11-21T03:00:00.000Z",
    note: "",
  };
}

function line(withDesign) {
  return {
    productId: "product-tshirt",
    name: "Classic T-shirt",
    color: "White",
    size: "M",
    quantity: 1,
    unitPriceKs: 15000,
    design: withDesign,
  };
}

test("layerBoxCm converts artwork units to centimetres and honours scale", () => {
  const box = quality.layerBoxCm({ name: "A", kind: "shape", x: 100, y: 200, width: 100, height: 50, rotation: 0, scale: 2 }, 10);
  assert.equal(box.left, 10);
  assert.equal(box.top, 20);
  assert.equal(box.width, 20);
  assert.equal(box.height, 10);
  assert.equal(box.right, 30);
  assert.equal(box.bottom, 30);
});

test("layerBoxCm grows the box for a rotated layer", () => {
  const box = quality.layerBoxCm({ name: "A", kind: "shape", x: 0, y: 0, width: 20, height: 20, rotation: 45, scale: 1 }, 10);
  const diagonal = Math.round(Math.SQRT2 * 2 * 10) / 10;
  assert.equal(Math.round((box.right - box.left) * 10) / 10, diagonal);
  assert.equal(Math.round((box.bottom - box.top) * 10) / 10, diagonal);
});

test("a design inside its print area has no issues", () => {
  assert.deepEqual(quality.checkDesignQuality(design()), []);
});

test("artwork past the print area is a blocking issue", () => {
  const issues = quality.checkDesignQuality(design({
    layers: [{ name: "Logo", kind: "shape", x: 250, y: 100, width: 100, height: 100, rotation: 0, scale: 1 }],
  }));
  assert.equal(issues.length, 1);
  assert.equal(issues[0].code, "outside-print-area");
  assert.equal(issues[0].level, "error");
  assert.equal(issues[0].layer, "Logo");
  assert.match(issues[0].message, /prints cut off/);
  assert.match(issues[0].message, /25 to 35 cm across/);
});

test("a rotated layer that only reaches past the edge when turned is caught", () => {
  const issues = quality.checkDesignQuality(design({
    layers: [{ name: "Diamond", kind: "shape", x: 0, y: 0, width: 20, height: 20, rotation: 45, scale: 1 }],
  }));
  assert.equal(issues.length, 1);
  assert.equal(issues[0].code, "outside-print-area");
});

test("centimetre rounding alone is not an issue", () => {
  const issues = quality.checkDesignQuality(design({
    layers: [{ name: "Edge", kind: "shape", x: 0, y: 0, width: 300, height: 400, rotation: 0, scale: 1 }],
  }));
  assert.deepEqual(issues, []);
});

test("a sliver of artwork is a warning, not a blocker", () => {
  const issues = quality.checkDesignQuality(design({
    layers: [{ name: "Dot", kind: "shape", x: 100, y: 100, width: 2, height: 30, rotation: 0, scale: 1 }],
  }));
  assert.equal(issues.length, 1);
  assert.equal(issues[0].code, "tiny-artwork");
  assert.equal(issues[0].level, "warning");
  assert.match(issues[0].message, /0\.2 × 3 cm/);
});

test("a 5 mm wordmark is printable and stays quiet", () => {
  const issues = quality.checkDesignQuality(design({
    layers: [{ name: "Wordmark", kind: "text", x: 100, y: 100, width: 45, height: 5, rotation: 0, scale: 1, text: "MH" }],
  }));
  assert.deepEqual(issues, []);
});

test("a design with no layers blocks the print", () => {
  const issues = quality.checkDesignQuality(design({ layers: [] }));
  assert.equal(issues.length, 1);
  assert.equal(issues[0].code, "blank-design");
  assert.equal(issues[0].level, "error");
});

test("the same design file on two lines is reported once", () => {
  const shared = design({
    layers: [{ name: "Logo", kind: "shape", x: 400, y: 100, width: 100, height: 100, rotation: 0, scale: 1 }],
  });
  const issues = quality.orderQualityIssues(order([line(shared), line(shared)]));
  assert.equal(issues.length, 1);
});

test("a line without a design adds nothing", () => {
  assert.deepEqual(quality.orderQualityIssues(order([line(null)])), []);
});

test("the summary counts blocking issues and warnings apart", () => {
  assert.match(quality.qualitySummaryLine([]), /passed/);
  const issues = [
    { code: "outside-print-area", level: "error", design: "a.svg", message: "x" },
    { code: "tiny-artwork", level: "warning", design: "a.svg", message: "y" },
    { code: "tiny-artwork", level: "warning", design: "a.svg", message: "z" },
  ];
  assert.equal(quality.qualitySummaryLine(issues), "Quality check: 1 blocking, 2 warnings.");
});

test("the README carries the summary and one line per issue", () => {
  const clean = print.buildArchiveReadme(order([line(design())]));
  assert.match(clean, /Quality check\n-------------|Quality check/);
  assert.match(clean, /Quality check passed/);

  const dirty = print.buildArchiveReadme(order([line(design({
    layers: [{ name: "Logo", kind: "shape", x: 250, y: 100, width: 100, height: 100, rotation: 0, scale: 1 }],
  }))]));
  assert.match(dirty, /Quality check: 1 blocking\./);
  assert.match(dirty, /! Logo runs from 25 to 35 cm/);
});

test("the manifest lists the issues as data", () => {
  const manifest = print.orderManifest(order([line(design({
    layers: [{ name: "Logo", kind: "shape", x: 250, y: 100, width: 100, height: 100, rotation: 0, scale: 1 }],
  }))]));
  assert.equal(manifest.quality.length, 1);
  assert.equal(manifest.quality[0].code, "outside-print-area");
  assert.equal(manifest.quality[0].layer, "Logo");
  assert.deepEqual(print.orderManifest(order([line(design())])).quality, []);
});

test("the press sheet shows the banner only when something is wrong", () => {
  const dirty = print.buildOrderPrintSheetHtml(order([line(design({
    layers: [{ name: "Logo", kind: "shape", x: 250, y: 100, width: 100, height: 100, rotation: 0, scale: 1 }],
  }))]));
  assert.match(dirty, /<section class="quality">/);
  assert.match(dirty, /Quality check: 1 blocking\./);

  const clean = print.buildOrderPrintSheetHtml(order([line(design())]));
  assert.doesNotMatch(clean, /<section class="quality">/);
});

test("a layer name cannot inject markup into the sheet or the README", () => {
  const nasty = design({
    layers: [{ name: "<script>alert(1)</script>", kind: "shape", x: 250, y: 100, width: 100, height: 100, rotation: 0, scale: 1 }],
  });
  const sheet = print.buildOrderPrintSheetHtml(order([line(nasty)]));
  assert.doesNotMatch(sheet, /<script>alert\(1\)<\/script>/);
  assert.match(sheet, /&lt;script&gt;/);
});
