const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const ROOT = path.join(__dirname, "..");
function loadModule(relativePath) {
  const sourcePath = path.join(ROOT, relativePath);
  const compiled = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: sourcePath,
  }).outputText;
  const loaded = { exports: {} };
  new Function("module", "exports", "require", compiled)(loaded, loaded.exports, require);
  return loaded.exports;
}

const viewport = loadModule("apps/web/src/lib/editor-viewport.ts");
const GAP = viewport.TOOLS_BAR_CLEARANCE_GAP_PX;

test("a canvas that already sits above the bar reserves nothing", () => {
  // Phone 390x844: viewport 153..778, canvas 291..641, bar top 690.
  assert.equal(viewport.editorToolsBarClearance({ canvasBottom: 641, barTop: 690, viewportTop: 153, viewportHeight: 625 }), 0);
  assert.equal(viewport.editorToolsBarClearance({ canvasBottom: 690 - GAP, barTop: 690, viewportTop: 153, viewportHeight: 625 }), 0);
});

test("a canvas that runs under the bar reserves its own hidden height", () => {
  // Phone 320x568: viewport 153..414 (261 tall), canvas 173..472, bar top 414.
  const clearance = viewport.editorToolsBarClearance({ canvasBottom: 472, barTop: 414, viewportTop: 153, viewportHeight: 261 });
  assert.equal(clearance, 472 + GAP - 414, "the hidden part plus the gap");
  assert.equal(472 - clearance, 414 - GAP, "scrolling by that much lands the canvas one gap above the bar");
});

test("a canvas no taller than the viewport still reserves the covered strip", () => {
  // A canvas that ends exactly at the viewport bottom has nothing hidden to scroll, so the room has to
  // come from the strip the bar covers.
  const clearance = viewport.editorToolsBarClearance({ canvasBottom: 414, barTop: 414, viewportTop: 153, viewportHeight: 261 });
  assert.equal(clearance, 261 - (414 - 153) + GAP, "viewport height minus the covered strip, plus the gap");
});

test("a very short phone reserves enough to reach the whole canvas", () => {
  // 320x480: viewport 153..414, canvas 173..472, bar top 326.
  const clearance = viewport.editorToolsBarClearance({ canvasBottom: 472, barTop: 326, viewportTop: 153, viewportHeight: 261 });
  assert.ok(clearance >= 472 - 326 + GAP, "at least the hidden part");
  assert.ok(472 - clearance <= 326 - GAP, "and the canvas clears the bar when scrolled to the end");
});

test("a taller canvas keeps its own hidden height", () => {
  const clearance = viewport.editorToolsBarClearance({ canvasBottom: 700, barTop: 400, viewportTop: 100, viewportHeight: 300 });
  assert.equal(clearance, 320, "700 + gap - 400 beats the 300 - 300 + gap floor");
});

test("a bar that does not cover the viewport cannot inflate the reservation", () => {
  const clearance = viewport.editorToolsBarClearance({ canvasBottom: 900, barTop: 400, viewportTop: 500, viewportHeight: 300 });
  assert.equal(clearance, 900 + GAP - 400, "the covered strip clamps at zero");
});

test("missing geometry reserves nothing", () => {
  assert.equal(viewport.editorToolsBarClearance({ canvasBottom: Number.NaN, barTop: 400, viewportTop: 0, viewportHeight: 300 }), 0);
  assert.equal(viewport.editorToolsBarClearance({ canvasBottom: 700, barTop: Number.NaN, viewportTop: 0, viewportHeight: 300 }), 0);
});

test("the editor reserves the room with a spacer, not with padding on the scroller", () => {
  const canvas = readFileSync(path.join(ROOT, "apps/web/src/components/EditorCanvas.tsx"), "utf8");
  assert.match(canvas, /toolsBarClearance > 0 && <div aria-hidden="true"/, "a spacer inside the scroller");
  // The scroller is absolutely positioned: padding on it inflates its own box and pushes the editor
  // under the bottom navigation.
  assert.doesNotMatch(canvas, /paddingBottom: toolsBarClearance/, "no padding on the scroller");
});
