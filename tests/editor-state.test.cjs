const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "apps/web/src/lib/editor-state.ts");
const compiled = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  fileName: sourcePath,
}).outputText;
const editorState = { exports: {} };
new Function("module", "exports", compiled)(editorState, editorState.exports);

const {
  EDITOR_CANVAS_SPEC,
  calculateEditorViewport,
  clampEditorZoom,
  createEditorHistory,
  migrateLegacyEditorDocument,
  pushEditorSnapshot,
  stepEditorHistory,
} = editorState.exports;

test("canvas specification is fixed at 4500×5400 px, 300 DPI, transparent PNG", () => {
  assert.deepEqual(EDITOR_CANVAS_SPEC, {
    width: 4500,
    height: 5400,
    resolutionDpi: 300,
    background: "transparent",
    format: "png",
    fixed: true,
  });
});

test("editor viewport fits the artboard and centers it without changing document geometry", () => {
  const [scale, , , , offsetX, offsetY] = calculateEditorViewport(390, 700, 1, 0, 0);
  assert.ok(scale > 0 && scale < 1);
  assert.ok(offsetX >= 0 && offsetY >= 0);
  assert.ok(offsetX + EDITOR_CANVAS_SPEC.width * scale <= 390);
  assert.ok(offsetY + EDITOR_CANVAS_SPEC.height * scale <= 700);
});

test("editor viewport applies pan after fit and clamps zoom", () => {
  const fit = calculateEditorViewport(900, 700, 1, 0, 0);
  const moved = calculateEditorViewport(900, 700, 2, 35, -20);
  assert.equal(moved[0], fit[0] * 2);
  assert.equal(moved[4] - (900 - EDITOR_CANVAS_SPEC.width * moved[0]) / 2, 35);
  assert.equal(moved[5] - (700 - EDITOR_CANVAS_SPEC.height * moved[0]) / 2, -20);
  assert.equal(clampEditorZoom(0), 0.25);
  assert.equal(clampEditorZoom(8), 3);
});

test("legacy 500×600 drafts scale into the fixed print canvas and clear the old artboard fill", () => {
  const migrated = migrateLegacyEditorDocument({
    objects: [
      { type: "rect", editorId: "mh-editor-artboard", left: 0, top: 0, width: 500, height: 600, fill: "#fff" },
      { type: "textbox", text: "T Shirt", left: 120, top: 170, width: 260, height: 50, fontSize: 44 },
      { type: "textbox", text: "Custom text", left: 120, top: 170, width: 260, height: 50, fontSize: 44, scaleX: 1, scaleY: 1 },
      { type: "circle", left: 190, top: 230, width: 140, height: 140, radius: 70, strokeWidth: 2 },
      { type: "image", left: 140, top: 180, scaleX: 0.5, scaleY: 0.5 },
    ],
  });
  const [artboard, text, circle, image] = migrated.objects;
  assert.equal(artboard.width, 4500);
  assert.equal(artboard.height, 5400);
  assert.equal(artboard.opacity, 0);
  assert.equal(text.text, "Custom text");
  assert.equal(text.left, 1080);
  assert.equal(text.width, 2340);
  assert.equal(text.fontSize, 396);
  assert.equal(migrated.objects.some((object) => object.text === "T Shirt"), false);
  assert.equal(circle.radius, 630);
  assert.equal(image.left, 1260);
  assert.equal(image.scaleX, 4.5);
});

test("editor history deduplicates snapshots and supports undo and redo", () => {
  let history = createEditorHistory("empty");
  history = pushEditorSnapshot(history, "text");
  history = pushEditorSnapshot(history, "text");
  history = pushEditorSnapshot(history, "text-moved");
  assert.deepEqual(history.snapshots, ["empty", "text", "text-moved"]);

  const undo = stepEditorHistory(history, "undo");
  assert.equal(undo.snapshot, "text");
  const redo = stepEditorHistory(undo.history, "redo");
  assert.equal(redo.snapshot, "text-moved");
});

test("new edits after undo discard redo history and history remains bounded", () => {
  let history = createEditorHistory("a");
  history = pushEditorSnapshot(history, "b");
  history = pushEditorSnapshot(history, "c");
  history = stepEditorHistory(history, "undo").history;
  history = pushEditorSnapshot(history, "new");
  assert.deepEqual(history.snapshots, ["a", "b", "new"]);
  assert.equal(stepEditorHistory(history, "redo").snapshot, undefined);

  for (let index = 0; index < 10; index += 1) {
    history = pushEditorSnapshot(history, `snapshot-${index}`, 4);
  }
  assert.equal(history.snapshots.length, 4);
  assert.equal(history.snapshots.at(-1), "snapshot-9");
});
