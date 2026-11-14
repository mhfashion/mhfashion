const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const sourcePath = path.join(__dirname, "../apps/web/src/lib/editor-layers.ts");
const source = readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  fileName: sourcePath,
}).outputText;
const layerModel = { exports: {} };
new Function("module", "exports", compiled)(layerModel, layerModel.exports);
const {
  addLayerMask,
  appendLayerStroke,
  createEditorArtworkLayer,
  deleteEditorLayer,
  duplicateEditorLayer,
  removeLayerMask,
  reorderEditorLayer,
  updateEditorLayer,
  updateLayerLastStroke,
} = layerModel.exports;

const pointStroke = (x1, x2 = x1) => ({ points: [{ x: x1, y: 0.5 }, { x: x2, y: 0.5 }] });

test("new layers get editable defaults and drawing remains isolated to the selected layer", () => {
  const first = createEditorArtworkLayer("one", "Layer 1");
  const second = createEditorArtworkLayer("two", "Layer 2");
  const original = [first, second];
  const drawn = appendLayerStroke(original, "two", "artwork", pointStroke(0.2, 0.4), "hide");

  assert.deepEqual(first, {
    id: "one", name: "Layer 1", visible: true, locked: false, opacity: 100,
    blendMode: "normal", strokes: [], mask: null,
  });
  assert.equal(original[1].strokes.length, 0, "Updates are immutable");
  assert.equal(drawn[0].strokes.length, 0);
  assert.equal(drawn[1].strokes.length, 1);
  assert.deepEqual(drawn[1].strokes[0], pointStroke(0.2, 0.4));
});

test("layer masks store black-hide and white-reveal strokes without changing source artwork", () => {
  const art = appendLayerStroke([createEditorArtworkLayer("one", "Layer 1")], "one", "artwork", pointStroke(0.2), "hide");
  const masked = addLayerMask(art, "one");
  const hidden = appendLayerStroke(masked, "one", "mask", pointStroke(0.3, 0.5), "hide");
  const revealed = appendLayerStroke(hidden, "one", "mask", pointStroke(0.7, 0.8), "reveal");

  assert.equal(art[0].mask, null, "Adding a mask does not alter the original layer");
  assert.deepEqual(masked[0].mask, []);
  assert.equal(revealed[0].strokes.length, 1, "Mask painting never removes source artwork");
  assert.deepEqual(revealed[0].mask.map(({ mode }) => mode), ["hide", "reveal"]);
  assert.deepEqual(revealed[0].mask[0].points, pointStroke(0.3, 0.5).points);
  assert.equal(removeLayerMask(revealed, "one")[0].mask, null);
});

test("live stroke updates replace the latest stroke and a locked layer rejects both edit targets", () => {
  const layer = createEditorArtworkLayer("one", "Layer 1");
  const masked = addLayerMask([layer], "one");
  const started = appendLayerStroke(masked, "one", "mask", pointStroke(0.2), "hide");
  const updated = updateLayerLastStroke(started, "one", "mask", pointStroke(0.2, 0.6), "hide");
  const locked = updateEditorLayer(updated, "one", { locked: true });
  const attemptedArtwork = appendLayerStroke(locked, "one", "artwork", pointStroke(0.7), "reveal");
  const attemptedMask = appendLayerStroke(locked, "one", "mask", pointStroke(0.8), "reveal");

  assert.equal(updated[0].mask.length, 1);
  assert.deepEqual(updated[0].mask[0].points, pointStroke(0.2, 0.6).points);
  assert.strictEqual(attemptedArtwork[0], locked[0]);
  assert.strictEqual(attemptedMask[0], locked[0]);
});

test("layer properties clamp and rename safely; visibility and stack order are explicit", () => {
  const layers = [createEditorArtworkLayer("top", "Top"), createEditorArtworkLayer("bottom", "Bottom")];
  const renamed = updateEditorLayer(layers, "top", { name: "  Ink  ", opacity: 140, blendMode: "multiply" });
  const clamped = updateEditorLayer(renamed, "top", { opacity: -4, visible: false });
  const moved = reorderEditorLayer(clamped, "bottom", -1);

  assert.equal(renamed[0].name, "Ink");
  assert.equal(renamed[0].opacity, 100);
  assert.equal(renamed[0].blendMode, "multiply");
  assert.equal(clamped[0].opacity, 0);
  assert.equal(clamped[0].visible, false);
  assert.deepEqual(moved.map((layer) => layer.id), ["bottom", "top"]);
  assert.strictEqual(reorderEditorLayer(moved, "bottom", -1), moved, "A boundary move is a no-op");
});

test("duplicate copies artwork/mask data without sharing mutable arrays and delete removes only the requested layer", () => {
  const layer = createEditorArtworkLayer("one", "Layer 1");
  const painted = appendLayerStroke(addLayerMask([layer], "one"), "one", "artwork", pointStroke(0.1, 0.9), "hide");
  const withMask = appendLayerStroke(painted, "one", "mask", pointStroke(0.2, 0.4), "reveal");
  const duplicated = duplicateEditorLayer(withMask, "one", "copy");
  const copy = duplicated[0];

  assert.equal(copy.id, "copy");
  assert.equal(copy.name, "Layer 1 copy");
  assert.notStrictEqual(copy.strokes, withMask[0].strokes);
  assert.notStrictEqual(copy.strokes[0].points, withMask[0].strokes[0].points);
  assert.notStrictEqual(copy.mask, withMask[0].mask);
  assert.equal(deleteEditorLayer(duplicated, "copy").length, 1);
  assert.equal(deleteEditorLayer(duplicated, "one")[0].id, "copy");
});
