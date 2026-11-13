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
  calculateEditorViewport,
  clampEditorZoom,
  createEditorHistory,
  pushEditorSnapshot,
  stepEditorHistory,
} = editorState.exports;

test("editor viewport fits the artboard and centers it without changing document geometry", () => {
  const [scale, , , , offsetX, offsetY] = calculateEditorViewport(390, 700, 1, 0, 0);
  assert.ok(scale > 0 && scale < 1);
  assert.ok(offsetX >= 0 && offsetY >= 0);
  assert.ok(offsetX + 500 * scale <= 390);
  assert.ok(offsetY + 600 * scale <= 700);
});

test("editor viewport applies pan after fit and clamps zoom", () => {
  const fit = calculateEditorViewport(900, 700, 1, 0, 0);
  const moved = calculateEditorViewport(900, 700, 2, 35, -20);
  assert.equal(moved[0], fit[0] * 2);
  assert.equal(moved[4] - (900 - 500 * moved[0]) / 2, 35);
  assert.equal(moved[5] - (700 - 600 * moved[0]) / 2, -20);
  assert.equal(clampEditorZoom(0), 0.25);
  assert.equal(clampEditorZoom(8), 3);
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
