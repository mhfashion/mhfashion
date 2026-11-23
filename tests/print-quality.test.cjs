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
const admin = loadModule("apps/web/src/lib/admin-demo-data.ts");
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

// Plan P1-6: DTF and Sublimation do not hold the same artwork.

test("the method rules are readable and the method name is normalised", () => {
  assert.deepEqual(quality.printMethodOf("DTF"), "DTF");
  assert.deepEqual(quality.printMethodOf(" dtf "), "DTF");
  assert.deepEqual(quality.printMethodOf("Sublimation"), "Sublimation");
  assert.deepEqual(quality.printMethodOf("sublimation"), "Sublimation");
  assert.deepEqual(quality.printMethodOf("Screen"), null);
  assert.deepEqual(quality.printMethodOf(undefined), null);
  assert.equal(quality.PRINT_METHOD_RULES.DTF.printsWhiteInk, true);
  assert.equal(quality.PRINT_METHOD_RULES.Sublimation.printsWhiteInk, false);
  assert.ok(quality.PRINT_METHOD_RULES.Sublimation.edgeMarginCm > quality.PRINT_METHOD_RULES.DTF.edgeMarginCm);
});

test("white ink is recognised in every form the design can store", () => {
  for (const ink of ["#fff", "#ffffff", "#FFFFFF", " white ", "white", "rgb(255, 255, 255)", "rgba(255,255,255,0.9)", "#fefefe", "rgb(254,254,254)", "#ffffff00"]) {
    assert.equal(quality.inkIsWhite(ink), true, ink);
  }
  for (const ink of ["#111111", "#f0f0f0", "rgb(249,249,249)", "navy", ""]) {
    assert.equal(quality.inkIsWhite(ink), false, ink);
  }
});

test("sublimation refuses white artwork, DTF prints it", () => {
  const white = design({ ink: "#ffffff" });
  const onSublimation = quality.checkDesignQuality(white, "Sublimation");
  assert.deepEqual(onSublimation.map((issue) => issue.code), ["no-white-ink"]);
  assert.equal(onSublimation[0].level, "warning");
  assert.match(onSublimation[0].message, /prints no white ink, so it comes out in the garment colour/);
  assert.match(onSublimation[0].message, /switch the method to DTF/);
  assert.deepEqual(quality.checkDesignQuality(white, "DTF"), []);
  assert.deepEqual(quality.checkDesignQuality(white), []);
});

test("artwork inside the print area can still be too close to the edge for the method", () => {
  // 0.04 cm from the left edge (0.4 artwork units): inside, but inside neither method's margin.
  const tight = design({
    layers: [{ name: "Logo", kind: "shape", x: 0.4, y: 100, width: 100, height: 100, rotation: 0, scale: 1 }],
  });
  const dtf = quality.checkDesignQuality(tight, "DTF");
  assert.deepEqual(dtf.map((issue) => issue.code), ["edge-too-tight"]);
  assert.match(dtf[0].message, /comes within 0 cm of the print edge; DTF wants 0.1 cm/);

  const sublimation = quality.checkDesignQuality(tight, "Sublimation");
  assert.deepEqual(sublimation.map((issue) => issue.code), ["edge-too-tight"]);
  assert.match(sublimation[0].message, /Sublimation wants 0.3 cm/);

  // 2 mm inside the left edge (2 artwork units): fine for DTF, still too tight for sublimation.
  const close = design({
    layers: [{ name: "Logo", kind: "shape", x: 2, y: 100, width: 100, height: 100, rotation: 0, scale: 1 }],
  });
  assert.deepEqual(quality.checkDesignQuality(close, "DTF"), []);
  assert.deepEqual(quality.checkDesignQuality(close, "Sublimation").map((issue) => issue.code), ["edge-too-tight"]);

  // Comfortably inside: no warning from either method.
  const safe = design({
    layers: [{ name: "Logo", kind: "shape", x: 100, y: 100, width: 100, height: 100, rotation: 0, scale: 1 }],
  });
  assert.deepEqual(quality.checkDesignQuality(safe, "Sublimation"), []);
});

test("artwork past the print area is an error, not an edge warning", () => {
  const outside = design({
    layers: [{ name: "Logo", kind: "shape", x: -60, y: 100, width: 100, height: 100, rotation: 0, scale: 1 }],
  });
  const codes = quality.checkDesignQuality(outside, "Sublimation").map((issue) => issue.code);
  assert.deepEqual(codes, ["outside-print-area"]);
});

test("an order line carries its method into the quality list, sheet and README", () => {
  const white = design({ ink: "#ffffff" });
  const sublimationLine = { ...line(white), printMethod: "Sublimation" };
  const issues = quality.orderQualityIssues(order([sublimationLine]));
  assert.deepEqual(issues.map((issue) => issue.code), ["no-white-ink"]);
  assert.match(quality.qualitySummaryLine(issues), /Quality check: 1 warning\./);

  const sheet = print.buildOrderPrintSheetHtml(order([sublimationLine]));
  assert.match(sheet, /<section class="quality">/);
  assert.match(sheet, /prints no white ink/);

  const readme = print.orderManifest(order([sublimationLine]));
  assert.equal(readme.quality[0].code, "no-white-ink");

  const dtfLine = { ...line(white), printMethod: "DTF" };
  assert.deepEqual(quality.orderQualityIssues(order([dtfLine])), []);
  const noMethod = line(white);
  assert.deepEqual(quality.orderQualityIssues(order([noMethod])), []);
});

test("a method the shop has not defined falls back to the plain checks", () => {
  const tight = design({
    layers: [{ name: "Logo", kind: "shape", x: 0.4, y: 100, width: 100, height: 100, rotation: 0, scale: 1 }],
  });
  const issues = quality.orderQualityIssues(order([{ ...line(tight), printMethod: "Screen Print" }]));
  assert.deepEqual(issues, []);
});

test("a line thinner than the press holds is named with its width", () => {
  const thin = design({ layers: [{ name: "Hairline", kind: "shape", x: 100, y: 100, width: 100, height: 100, rotation: 0, scale: 1, strokeWidth: 0.1 }] });
  const dtf = quality.checkDesignQuality(thin, "DTF");
  const line = dtf.find((issue) => issue.code === "line-too-thin");
  assert.ok(line, "0.1 units is 0.1 mm here, under the 0.2 mm DTF line");
  assert.equal(line.level, "warning", "a thin line warns; it does not block the press");
  assert.equal(line.layer, "Hairline");
  assert.match(line.message, /0\.1 mm line; DTF needs 0\.2 mm/, "the message carries both numbers");
  assert.match(line.message, /thicken the line or fill the shape/, "the message names the fix");

  const sublimation = quality.checkDesignQuality(thin, "Sublimation").find((issue) => issue.code === "line-too-thin");
  assert.match(sublimation.message, /Sublimation needs 0\.3 mm/, "sublimation holds a thinner line than DTF");
});

test("a line the press can hold is silent", () => {
  const thick = design({ layers: [{ name: "Border", kind: "shape", x: 100, y: 100, width: 100, height: 100, rotation: 0, scale: 1, strokeWidth: 20 }] });
  assert.equal(quality.checkDesignQuality(thick, "DTF").some((issue) => issue.code === "line-too-thin"), false, "20 mm needs no warning");
  assert.equal(quality.checkDesignQuality(thick, "Sublimation").some((issue) => issue.code === "line-too-thin"), false);
});

test("only a painted line is judged, and only when the method is known", () => {
  const filled = design({ layers: [{ name: "Block", kind: "shape", x: 100, y: 100, width: 100, height: 100, rotation: 0, scale: 1 }] });
  assert.equal(quality.checkDesignQuality(filled, "DTF").length, 0, "a filled shape paints no line");
  const zero = design({ layers: [{ name: "Block", kind: "shape", x: 100, y: 100, width: 100, height: 100, rotation: 0, scale: 1, strokeWidth: 0 }] });
  assert.equal(quality.checkDesignQuality(zero, "DTF").some((issue) => issue.code === "line-too-thin"), false, "a zero stroke paints nothing");
  const text = design({ layers: [{ name: "Title", kind: "text", text: "MH", x: 100, y: 100, width: 100, height: 100, rotation: 0, scale: 1, strokeWidth: 1 }] });
  assert.equal(quality.checkDesignQuality(text, "DTF").some((issue) => issue.code === "line-too-thin"), false, "text is measured by its glyphs, not a stroke");
  const thin = design({ layers: [{ name: "Hairline", kind: "shape", x: 100, y: 100, width: 100, height: 100, rotation: 0, scale: 1, strokeWidth: 0.1 }] });
  assert.equal(quality.checkDesignQuality(thin, null).some((issue) => issue.code === "line-too-thin"), false, "no method, no line rule");
});

test("the printed width follows the layer scale, which is how a hairline reaches the press", () => {
  assert.equal(quality.strokePrintMm(18, 10), 18, "18 units at 10 units/cm is 1.8 cm, so 18 mm");
  assert.equal(quality.strokePrintMm(18, 10, 0.1), 1.8, "dragged down to a tenth, the same line is 1.8 mm");
  assert.equal(quality.strokePrintMm(18, 0, 1), 18, "a broken units/cm falls back to 10");
  assert.equal(quality.STRICTEST_MIN_STROKE_MM, 0.3, "the editor holds the strictest method until it knows the run");
});

test("the seeded orders gain no new warning from the line rule", () => {
  const seeded = admin.createAdminDemoData(Date.UTC(2026, 10, 21, 9));
  for (const order of seeded.orders) {
    for (const item of order.items) {
      const issues = quality.checkDesignQuality(item.design, quality.printMethodOf(item.printMethod));
      assert.equal(issues.some((issue) => issue.code === "line-too-thin"), false, `${item.design.fileName} was already clean`);
    }
  }
});

// --- Photo resolution (Plan P1-6, the last check in the list) -----------------------------------

function photoLayer(overrides = {}) {
  return { name: "Team photo", kind: "image", x: 100, y: 100, width: 300, height: 200, rotation: 0, scale: 1, ...overrides };
}
function photoDesign(layer, overrides = {}) {
  return {
    fileName: "team-photo.svg",
    ink: "#111111",
    printWidthCm: 38.1,
    printHeightCm: 45.72,
    unitsPerCm: 10,
    layers: [layer],
    ...overrides,
  };
}

test("a photo's printed resolution is its pixels over the inches it covers", () => {
  // 300 x 200 units at 10 units/cm is 30 x 20 cm = 11.81 x 7.87 in.
  assert.equal(quality.layerPhotoPpi(photoLayer({ pixelWidth: 1181, pixelHeight: 787 }), 10), 100);
  assert.equal(quality.layerPhotoPpi(photoLayer({ pixelWidth: 3543, pixelHeight: 2362 }), 10), 300);
});

test("the weaker axis decides, so a photo stretched sideways is reported honestly", () => {
  // Wide pixels but a short height: 200 units = 7.87 in, so 787 px is 100 ppi even though the width is 300.
  assert.equal(quality.layerPhotoPpi(photoLayer({ pixelWidth: 3543, pixelHeight: 787 }), 10), 100);
});

test("scaling the layer down raises the resolution, and up lowers it", () => {
  const layer = photoLayer({ pixelWidth: 1181, pixelHeight: 787 });
  assert.equal(quality.layerPhotoPpi({ ...layer, scale: 0.5 }, 10), 200, "half the print size, twice the ppi");
  assert.equal(quality.layerPhotoPpi({ ...layer, scale: 2 }, 10), 50);
});

test("a photo with no recorded pixels, or a zero-size box, has no ppi", () => {
  assert.equal(quality.layerPhotoPpi(photoLayer(), 10), null, "vector artwork carries no pixel size");
  assert.equal(quality.layerPhotoPpi(photoLayer({ pixelWidth: 0, pixelHeight: 0 }), 10), null);
  assert.equal(quality.layerPhotoPpi(photoLayer({ pixelWidth: 1000, pixelHeight: 1000, width: 0 }), 10), null);
  assert.equal(quality.layerPhotoPpi(photoLayer({ pixelWidth: 1181, pixelHeight: 787 }), 0), 100, "a broken units/cm falls back to 10");
});

test("a soft photo is a warning on the press sheet, naming the numbers and the fix", () => {
  const issues = quality.checkDesignQuality(photoDesign(photoLayer({ pixelWidth: 600, pixelHeight: 400 })), "DTF");
  const soft = issues.filter((issue) => issue.code === "photo-too-soft");
  assert.equal(soft.length, 1);
  assert.equal(soft[0].level, "warning", "a soft photo prints, badly; it is not a blocker");
  assert.equal(soft[0].layer, "Team photo");
  assert.match(soft[0].message, /51 ppi at 30 × 20 cm/);
  assert.match(soft[0].message, /DTF wants 150 ppi/);
  assert.match(soft[0].message, /larger image or print it smaller/, "the desk is told what to do");
});

test("a sharp photo raises nothing", () => {
  const issues = quality.checkDesignQuality(photoDesign(photoLayer({ pixelWidth: 3543, pixelHeight: 2362 })), "DTF");
  assert.equal(issues.some((issue) => issue.code === "photo-too-soft"), false);
});

test("sublimation asks for more than DTF, so a 180 ppi photo passes one and not the other", () => {
  const layer = photoLayer({ pixelWidth: 2126, pixelHeight: 1417 });
  assert.equal(quality.layerPhotoPpi(layer, 10), 180);
  assert.equal(quality.checkDesignQuality(photoDesign(layer), "DTF").some((issue) => issue.code === "photo-too-soft"), false);
  const sublimation = quality.checkDesignQuality(photoDesign(layer), "Sublimation").filter((issue) => issue.code === "photo-too-soft");
  assert.equal(sublimation.length, 1);
  assert.match(sublimation[0].message, /Sublimation wants 200 ppi/);
});

test("an order whose method is unknown still catches a photo that cannot print anywhere", () => {
  const soft = quality.checkDesignQuality(photoDesign(photoLayer({ pixelWidth: 600, pixelHeight: 400 })));
  const issue = soft.find((entry) => entry.code === "photo-too-soft");
  assert.ok(issue, "no method is not a reason to let a 51 ppi photo through");
  assert.match(issue.message, /the press wants 150 ppi/, "the floor every method can hold");
  const sharp = quality.checkDesignQuality(photoDesign(photoLayer({ pixelWidth: 3543, pixelHeight: 2362 })));
  assert.equal(sharp.some((entry) => entry.code === "photo-too-soft"), false, "and a sharp photo stays quiet");
});

test("the seeded orders gain no new warning from the photo rule", () => {
  const seeded = admin.createAdminDemoData(Date.UTC(2026, 10, 21, 9));
  for (const order of seeded.orders) {
    for (const item of order.items) {
      const issues = quality.checkDesignQuality(item.design, quality.printMethodOf(item.printMethod));
      assert.equal(issues.some((issue) => issue.code === "photo-too-soft"), false, `${item.design.fileName} was already clean`);
    }
  }
});

test("the press reads the soft-photo warning the same three ways as every other check", () => {
  const design = photoDesign(photoLayer({ pixelWidth: 600, pixelHeight: 400 }));
  const issues = quality.checkDesignQuality(design, "DTF");
  const readme = quality.qualityReadmeLines(issues).join("\n");
  assert.match(readme, /photo-too-soft|pp|larger image/, "the archive README carries it");
  const sheet = quality.qualitySheetHtml(issues);
  assert.match(sheet, /larger image/, "and so does the press sheet banner");
  assert.match(quality.qualitySummaryLine(issues), /warning/, "the summary counts it");
});

test("the editor warns on a soft photo and says what to do", () => {
  const ppi = loadModule("apps/web/src/lib/editor-image-ppi.ts");
  const qualityOf = ppi.imagePrintQuality({ width: 300, height: 200, sourceWidth: 600, sourceHeight: 400 });
  assert.deepEqual(qualityOf, { ppi: 133, level: "low" }, "the editor uses its own two thresholds");
  assert.equal(ppi.imagePrintQuality({ width: 300, height: 200, sourceWidth: 300, sourceHeight: 200 }).level, "very-low");
  assert.equal(ppi.imagePrintLevel(120), "low");
  assert.equal(ppi.imagePrintLevel(300), "good");
  const panel = readFileSync(path.join(ROOT, "apps/web/src/components/EditorAdjustmentsPanel.tsx"), "utf8");
  assert.match(panel, /the press wants \$\{IMAGE_PRINT_THRESHOLDS\.low\} ppi/, "the readout names the floor");
  assert.match(panel, /use a larger image or make this one smaller/, "and the fix");
});

test("the order layer model can carry a photo's pixels, and the editor records them at import", () => {
  const model = readFileSync(path.join(ROOT, "apps/web/src/lib/admin-demo-data.ts"), "utf8");
  assert.match(model, /pixelWidth\?: number;/, "a saved design can carry the source pixels");
  assert.match(model, /pixelHeight\?: number;/);
  const canvas = readFileSync(path.join(ROOT, "apps/web/src/components/EditorCanvas.tsx"), "utf8");
  assert.match(canvas, /sourceWidth: compressed\.width/, "the editor keeps the photo's own size at import");
});
