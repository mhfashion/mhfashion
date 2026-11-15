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
  createEditorImageLayer,
  createEditorShapeLayer,
  createEditorTextLayer,
  deleteEditorLayer,
  duplicateEditorLayer,
  groupEditorLayers,
  linkEditorLayers,
  moveEditorLayerToIndex,
  removeLayerMask,
  reorderEditorLayer,
  setEditorLayerText,
  updateEditorLayer,
  ungroupEditorLayers,
  unlinkEditorLayers,
  updateLayerLastStroke,
} = layerModel.exports;

const pointStroke = (x1, x2 = x1) => ({ points: [{ x: x1, y: 0.5 }, { x: x2, y: 0.5 }] });

test("new layers get editable defaults and drawing remains isolated to the selected layer", () => {
  const first = createEditorArtworkLayer("one", "Layer 1");
  const second = createEditorArtworkLayer("two", "Layer 2");
  const original = [first, second];
  const drawn = appendLayerStroke(original, "two", "artwork", pointStroke(0.2, 0.4), "hide");

  assert.deepEqual(first, {
    id: "one", name: "Layer 1", kind: "artwork", visible: true, locked: false, opacity: 100,
    fillOpacity: 100, blendMode: "normal", groupId: null, linkId: null, strokes: [], mask: null, text: null, shape: null, image: null,
  });
  assert.equal(original[1].strokes.length, 0, "Updates are immutable");
  assert.equal(drawn[0].strokes.length, 0);
  assert.equal(drawn[1].strokes.length, 1);
  assert.deepEqual(drawn[1].strokes[0], pointStroke(0.2, 0.4));
});

test("brush styling metadata survives live updates and layer duplication", () => {
  const layer = createEditorArtworkLayer("one", "Layer 1");
  const brushStroke = { ...pointStroke(0.2, 0.4), tool: "brush", color: "#f97316" };
  const drawn = appendLayerStroke([layer], "one", "artwork", brushStroke, "hide");
  const updated = updateLayerLastStroke(drawn, "one", "artwork", { ...pointStroke(0.25, 0.45), tool: "brush", color: "#f97316" }, "hide");
  const duplicate = duplicateEditorLayer(updated, "one", "copy")[0];

  assert.equal(updated[0].strokes[0].tool, "brush");
  assert.equal(updated[0].strokes[0].color, "#f97316");
  assert.equal(duplicate.strokes[0].tool, "brush");
  assert.equal(duplicate.strokes[0].color, "#f97316");
  assert.notStrictEqual(duplicate.strokes[0].points, updated[0].strokes[0].points);
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

test("Add Text, element and upload layers keep their own content and stay in the layer stack", () => {
  const text = createEditorTextLayer("text-1", "Text 1", {
    value: "", x: 500, y: 600, fontSize: 110, color: "#202124",
  });
  assert.equal(text.kind, "text");
  assert.equal(text.text.value, "");

  const typed = setEditorLayerText([text], "text-1", "MH FASHION");
  assert.equal(typed[0].text.value, "MH FASHION");
  assert.equal(text.text.value, "", "Typing is immutable");
  assert.equal(setEditorLayerText([text], "missing", "x")[0].text.value, "");

  const shape = createEditorShapeLayer("shape-1", "Wave line", {
    paths: [{ d: "M 1 1 L 2 2", stroke: "#000", strokeWidth: 8, fill: "none" }],
  });
  assert.equal(shape.kind, "shape");
  assert.equal(shape.shape.paths.length, 1);

  const image = createEditorImageLayer("image-1", "photo.jpg", {
    src: "data:image/jpeg;base64,AAAA", x: 100, y: 100, width: 800, height: 600, byteSize: 40960,
  });
  assert.equal(image.kind, "image");
  assert.equal(image.image.byteSize, 40960);

  const duplicatedText = duplicateEditorLayer(typed, "text-1", "text-2")[0];
  assert.equal(duplicatedText.text.value, "MH FASHION");
  assert.notStrictEqual(duplicatedText.text, typed[0].text);
});

test("groups preserve independent layers while links provide an explicit shared transform membership", () => {
  const layers = [createEditorArtworkLayer("one", "One"), createEditorArtworkLayer("two", "Two")];
  const grouped = groupEditorLayers(layers, ["one", "two"], "group-1");
  assert.equal(grouped[0].groupId, "group-1");
  assert.equal(grouped[1].groupId, "group-1");
  const individuallyUngrouped = ungroupEditorLayers(grouped, ["one"]);
  assert.equal(individuallyUngrouped[0].groupId, null);
  assert.equal(individuallyUngrouped[1].groupId, "group-1");
  const linked = linkEditorLayers(individuallyUngrouped, ["one", "two"], "link-1");
  assert.equal(linked[0].linkId, "link-1");
  assert.equal(linked[1].linkId, "link-1");
  assert.equal(unlinkEditorLayers(linked, ["one"])[0].linkId, null);
  assert.equal(unlinkEditorLayers(linked, ["one"])[1].linkId, "link-1");
});

test("layer rows can be dropped at an arbitrary stack index", () => {
  const layers = ["one", "two", "three"].map((id) => createEditorArtworkLayer(id, id));
  assert.deepEqual(moveEditorLayerToIndex(layers, "three", 0).map((layer) => layer.id), ["three", "one", "two"]);
  assert.deepEqual(moveEditorLayerToIndex(layers, "one", 3).map((layer) => layer.id), ["two", "three", "one"]);
});

test("grouping non-adjacent layers creates a contiguous Photoshop-style folder block", () => {
  const layers = ["one", "two", "three", "four"].map((id) => createEditorArtworkLayer(id, id));
  const grouped = groupEditorLayers(layers, ["one", "three"], "group-1");
  assert.deepEqual(grouped.map((layer) => layer.id), ["one", "three", "two", "four"]);
  assert.deepEqual(grouped.slice(0, 2).map((layer) => layer.groupId), ["group-1", "group-1"]);
});

test("invalid numeric appearance updates do not poison layer opacity", () => {
  const layer = createEditorArtworkLayer("one", "One");
  assert.equal(updateEditorLayer([layer], "one", { opacity: Number.NaN })[0].opacity, 100);
  assert.equal(updateEditorLayer([layer], "one", { fillOpacity: Number.POSITIVE_INFINITY })[0].fillOpacity, 100);
  assert.equal(updateEditorLayer([layer], "one", { opacity: 125, fillOpacity: -5 })[0].opacity, 100);
  assert.equal(updateEditorLayer([layer], "one", { opacity: 125, fillOpacity: -5 })[0].fillOpacity, 0);
});
