const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { loadModule } = require("./helpers/load-ts-module.cjs");
const lib = loadModule("apps/web/src/lib/editor-layers.ts");
const panel = readFileSync(path.join(__dirname, "../apps/web/src/components/EditorAdjustmentsPanel.tsx"), "utf8");
const preview = readFileSync(path.join(__dirname, "../apps/web/src/components/EditorLayerPreview.tsx"), "utf8");
const canvas = readFileSync(path.join(__dirname, "../apps/web/src/components/EditorCanvas.tsx"), "utf8");

const anchors = [
  { x: 100, y: 100, in: null, out: null },
  { x: 300, y: 100, in: null, out: null },
];

test("the pen offers the end shapes and defaults to none", () => {
  assert.deepEqual(lib.EDITOR_PEN_END_SHAPES, ["none", "arrow", "circle", "square", "bar"]);
  assert.equal(lib.EDITOR_TOOL_OPTIONS_DEFAULT.pen.ends, "none");
  assert.equal(lib.normalizeEditorToolOptions({ pen: { ends: "arrow" } }).pen.ends, "arrow");
  assert.equal(lib.normalizeEditorToolOptions({ pen: { ends: "banana" } }).pen.ends, "none", "an unknown shape falls back");
});

test("markers sit on both ends and face away from the path", () => {
  const markers = lib.editorPenEndMarkers({ d: "", ends: "arrow", strokeWidth: 10, penPath: { anchors, closed: false } });
  assert.equal(markers.length, 2);
  assert.deepEqual(markers.map((marker) => [marker.kind, marker.x, marker.y]), [["arrow", 100, 100], ["arrow", 300, 100]]);
  assert.equal(markers[0].angle, 180, "the start marker points back along the line");
  assert.equal(markers[1].angle, 0, "the end marker points forward");
  assert.equal(markers[0].size, 30, "the marker scales with the stroke");
});

test("a closed path, a one-point path and the none shape draw no markers", () => {
  assert.deepEqual(lib.editorPenEndMarkers({ d: "", ends: "arrow", penPath: { anchors, closed: true } }), []);
  assert.deepEqual(lib.editorPenEndMarkers({ d: "", ends: "arrow", penPath: { anchors: [anchors[0]], closed: false } }), []);
  assert.deepEqual(lib.editorPenEndMarkers({ d: "", ends: "none", penPath: { anchors, closed: false } }), []);
  assert.deepEqual(lib.editorPenEndMarkers({ d: "", penPath: { anchors, closed: false } }), [], "paths from before the setting draw none");
});

test("the tool, the canvas, the panel and the preview agree on the setting", () => {
  assert.match(panel, /aria-label="Pen end shape"/, "the pen box offers the control");
  assert.match(panel, /aria-label={`Pen end shape \$\{shape\}`}/);
  assert.match(canvas, /ends: toolOptions\.pen\.ends,/, "a drawn path keeps the chosen ends");
  assert.match(preview, /editorPenEndMarkers\(path\)/, "the preview paints the markers");
  for (const kind of ["arrow", "circle", "square", "bar"]) {
    assert.match(preview, new RegExp(`marker\\.kind === "${kind}"`), `the preview draws ${kind}`);
  }
});
