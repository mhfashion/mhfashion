// The Eyedropper tool (plan E21 item 3): pixel → colour, pointer → artwork units, and the
// browser picker when the platform has one.
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const ROOT = path.join(__dirname, "..");

function loadModule(relativePath) {
  const sourcePath = path.join(ROOT, relativePath);
  const compiled = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: sourcePath,
  }).outputText;
  const loaded = { exports: {} };
  const localRequire = (id) => {
    if (id.startsWith("@/")) return loadModule(`apps/web/src/${id.slice(2)}.ts`);
    throw new Error(`unexpected import: ${id}`);
  };
  new Function("module", "exports", "require", compiled)(loaded, loaded.exports, localRequire);
  return loaded.exports;
}

const sample = loadModule("apps/web/src/lib/editor-colour-sample.ts");
const read = (relativePath) => readFileSync(path.join(ROOT, relativePath), "utf8");

test("a pixel becomes a hex colour, blended over the white paper", () => {
  assert.equal(sample.hexFromRgba([32, 33, 36, 255]), "#202124");
  assert.equal(sample.hexFromRgba([0, 0, 0, 0]), "#ffffff", "an unpainted pixel is the paper");
  assert.equal(sample.hexFromRgba([0, 0, 0, 128]), "#7f7f7f", "half-transparent black over white");
  assert.equal(sample.hexFromRgba([255, 0, 0, 255], "#000000"), "#ff0000");
  assert.equal(sample.hexFromRgba([200, 100, 50, 255]).length, 7);
  assert.equal(sample.hexFromRgba([1, 2, 3]), null, "a pixel without alpha cannot be read");
});

test("a pointer lands inside the artwork, whatever the canvas says", () => {
  assert.deepEqual(sample.artworkPointFromUnit({ x: 0, y: 0 }), { x: 0, y: 0 });
  assert.deepEqual(sample.artworkPointFromUnit({ x: 1, y: 1 }), { x: 999, y: 1199 });
  assert.deepEqual(sample.artworkPointFromUnit({ x: 0.5, y: 0.25 }), { x: 500, y: 300 });
  assert.deepEqual(sample.artworkPointFromUnit({ x: -3, y: 12 }), { x: 0, y: 1199 }, "clamped, never negative");
  assert.deepEqual(sample.artworkPointFromUnit({ x: Number.NaN, y: 0.5 }), { x: 0, y: 600 });
});

test("sampling without a document or artwork returns null instead of throwing", async () => {
  assert.equal(await sample.sampleArtworkColour({ inner: "", point: { x: 1, y: 1 } }), null);
  assert.equal(await sample.sampleArtworkColour({ inner: "   ", point: { x: 1, y: 1 } }), null);
  assert.equal(sample.nativeEyeDropper(), null, "no window in Node");
});

test("the tool, its I shortcut and the canvas handler are wired together", () => {
  const bar = read("apps/web/src/components/EditorToolsBar.tsx");
  assert.match(bar, /id: "eyedropper", label: "Eyedropper", Icon: Pipette/);
  assert.match(bar, /\| "eyedropper"/);

  const shortcuts = loadModule("apps/web/src/lib/editor-shortcuts.ts");
  assert.deepEqual(shortcuts.editorToolShortcut({ key: "i", code: "KeyI" }), { kind: "tool", tool: "eyedropper" });
  assert.equal(shortcuts.editorToolShortcutKey("eyedropper"), "I");

  const canvas = read("apps/web/src/components/EditorCanvas.tsx");
  assert.match(canvas, /if \(activeTool === "eyedropper"\) \{/);
  assert.match(canvas, /void pickColourAt\(event\.clientX, event\.clientY\);/);
  assert.match(canvas, /const native = nativeEyeDropper\(\);/);
  assert.match(canvas, /await sampleArtworkColour\(\{/);
  assert.match(canvas, /setForegroundColor\(colour\);/);
  assert.match(canvas, /toolBeforeEyedropperRef\.current = activeTool;/);
  // The one-shot tool hands the canvas back to what was active before it.
  assert.match(canvas, /const handBack = \(\) => setActiveTool\(toolBeforeEyedropperRef\.current === "eyedropper" \? "move" : toolBeforeEyedropperRef\.current\);/);
});
