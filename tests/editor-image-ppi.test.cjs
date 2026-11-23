const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const { loadModule } = require("./helpers/load-ts-module.cjs");

const ppi = loadModule("apps/web/src/lib/editor-image-ppi.ts");
const upload = loadModule("apps/web/src/lib/editor-upload.ts");
const layersSource = readFileSync(path.join(__dirname, "../apps/web/src/lib/editor-layers.ts"), "utf8");
const canvasSource = readFileSync(path.join(__dirname, "../apps/web/src/components/EditorCanvas.tsx"), "utf8");

/** The artwork box that covers `printPx` on the print canvas. */
const boxFor = (printPx) => printPx / ppi.PRINT_PX_PER_UNIT;

test("a photo shown at its own pixel size prints at 300 ppi", () => {
  const image = { width: boxFor(2000), height: boxFor(2000), sourceWidth: 2000, sourceHeight: 2000 };
  assert.equal(ppi.imagePrintQuality(image).ppi, 300);
});

test("a photo stretched to cover 3500 print pixels prints at about 171 ppi", () => {
  const image = { width: boxFor(3500), height: boxFor(3500), sourceWidth: 2000, sourceHeight: 2000 };
  assert.equal(ppi.imagePrintQuality(image).ppi, 171);
});

test("a one-axis stretch takes the lower of the two axes", () => {
  const image = { width: boxFor(2000), height: boxFor(2000), sourceWidth: 2000, sourceHeight: 2000 };
  const stretched = ppi.imagePrintQuality(image, { x: 2, y: 1 });
  assert.equal(stretched.ppi, 150, "the stretched axis halves the resolution");
  assert.equal(stretched.level, "good");
  const tall = ppi.imagePrintQuality(image, { x: 1, y: 3 });
  assert.equal(tall.ppi, 100);
});

test("the default upload box lands where the plan says it does", () => {
  const cases = [
    { source: [1333, 2000], expected: 139 },
    { source: [2000, 1333], expected: 167 },
    { source: [2000, 2000], expected: 167 },
  ];
  for (const { source, expected } of cases) {
    const box = upload.imageLayerBox(source[0], source[1]);
    const quality = ppi.imagePrintQuality({ ...box, sourceWidth: source[0], sourceHeight: source[1] });
    assert.equal(quality.ppi, expected, `${source[0]}x${source[1]} at the default size`);
  }
});

test("a 1000 px photo lands between 69 and 83 ppi", () => {
  const portrait = upload.imageLayerBox(667, 1000);
  const landscape = upload.imageLayerBox(1000, 667);
  const portraitPpi = ppi.imagePrintQuality({ ...portrait, sourceWidth: 667, sourceHeight: 1000 }).ppi;
  const landscapePpi = ppi.imagePrintQuality({ ...landscape, sourceWidth: 1000, sourceHeight: 667 }).ppi;
  assert.equal(portraitPpi, 69);
  assert.equal(landscapePpi, 83);
});

test("levels step at 150 and 100 ppi", () => {
  assert.equal(ppi.imagePrintLevel(300), "good");
  assert.equal(ppi.imagePrintLevel(150), "good");
  assert.equal(ppi.imagePrintLevel(149), "low");
  assert.equal(ppi.imagePrintLevel(100), "low");
  assert.equal(ppi.imagePrintLevel(99), "very-low");
  assert.ok(ppi.imagePrintLevelRank("good") < ppi.imagePrintLevelRank("low"));
  assert.ok(ppi.imagePrintLevelRank("low") < ppi.imagePrintLevelRank("very-low"));
});

test("rotation, masks and other photo fields do not change the value", () => {
  const image = { width: boxFor(3000), height: boxFor(3000), sourceWidth: 2000, sourceHeight: 2000 };
  const plain = ppi.imagePrintQuality(image);
  const decorated = ppi.imagePrintQuality({ ...image, mask: { strokes: [] }, brightness: 1.4, cornerRadius: 12, rotation: 35 });
  assert.deepEqual(decorated, plain, "only the box and the source pixels count");
});

test("a layer saved without its pixel size reports nothing rather than a guess", () => {
  assert.equal(ppi.imagePrintQuality({ width: 400, height: 300 }), null);
  assert.equal(ppi.imagePrintQuality({ width: 400, height: 300, sourceWidth: 0, sourceHeight: 0 }), null);
  assert.equal(ppi.imagePrintQuality(null), null);
  assert.equal(ppi.imagePrintQuality({ width: 0, height: 0, sourceWidth: 2000, sourceHeight: 2000 }), null);
});

test("uploads keep the photo's pixel size and the editor reports it", () => {
  assert.match(layersSource, /sourceWidth\?: number;\n\s*sourceHeight\?: number;/);
  assert.match(canvasSource, /sourceWidth: compressed\.width,\n\s*sourceHeight: compressed\.height,/);
  assert.match(canvasSource, /const imagePrintQualityById = useMemo/);
  assert.match(canvasSource, /printQualityById=\{imagePrintQualityById\}/);
  assert.match(canvasSource, /imagePrintQuality=\{selectedLayer \? imagePrintQualityById\[selectedLayer\.id\] \?\? null : null\}/);
  assert.match(canvasSource, /print quality dropped to \$\{after\.ppi\} ppi/);
});

test("a stroke's printed width is millimetres on the garment, and scaling shrinks it", () => {
  // 4.5 print px per unit at 300 dpi: 1 unit is 4.5/300 inch.
  assert.equal(ppi.editorStrokePrintMm(1), 0.38, "1 unit prints 0.38 mm");
  assert.equal(ppi.editorStrokePrintMm(18), 6.86, "an 18-unit line is 6.86 mm");
  assert.equal(ppi.editorStrokePrintMm(18, 0.05), 0.34, "dragged down to a twentieth, the same line is a hairline");
  assert.equal(ppi.editorStrokePrintMm(18, -0.5), 3.43, "a flipped layer still has a width");
  assert.equal(ppi.editorStrokePrintMm(18, 0), 6.86, "a zero scale falls back to 1");
});

test("the shape panel shows the line's printed width and warns under the press minimum", () => {
  const panel = readFileSync(path.join(__dirname, "..", "apps/web/src/components/EditorAdjustmentsPanel.tsx"), "utf8");
  assert.match(panel, /data-stroke-print-mm=\{printed\}/, "the readout carries its millimetres for tests");
  assert.match(panel, /editorStrokePrintMm\(shapeStyle\.strokeWidth, scale\)/, "the width is converted at the editor print scale");
  assert.match(panel, /Math\.min\(Math\.abs\(placement\?\.scale\.x \?\? 1\), Math\.abs\(placement\?\.scale\.y \?\? 1\)\)/, "the smaller scale decides, because the line thins on the short axis");
  assert.match(panel, /printed < STRICTEST_MIN_STROKE_MM/, "the warning uses the strictest press rule until the method is known");
  assert.match(panel, /thicken it or fill the shape/, "the warning names the fix");
});
