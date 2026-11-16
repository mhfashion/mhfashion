const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const sourcePath = path.join(__dirname, "../apps/web/src/lib/editor-pen-path.ts");
const source = readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  fileName: sourcePath,
}).outputText;
const penGeometry = { exports: {} };
new Function("module", "exports", compiled)(penGeometry, penGeometry.exports);
const {
  draggedEditorPenAnchor,
  editorPenPathData,
  insertEditorPenAnchor,
  removeEditorPenAnchor,
  snapEditorPenPoint,
} = penGeometry.exports;

test("Pen paths serialize click anchors as lines and drag anchors as cubic Béziers", () => {
  const straight = editorPenPathData({ anchors: [{ x: 0.1, y: 0.5 }, { x: 0.9, y: 0.5 }], closed: false });
  assert.equal(straight, "M 100 600 L 900 600");

  const curved = editorPenPathData({ anchors: [
    { x: 0.1, y: 0.5, handleOut: { x: 0.2, y: -0.25 } },
    { x: 0.9, y: 0.5, handleIn: { x: -0.2, y: -0.25 } },
  ], closed: false });
  assert.equal(curved, "M 100 600 C 300 300 700 300 900 600");
});

test("closing a Pen path adds its closing segment and fillable close command", () => {
  const d = editorPenPathData({ anchors: [
    { x: 0.1, y: 0.1 }, { x: 0.9, y: 0.1 }, { x: 0.5, y: 0.9 },
  ], closed: true });
  assert.equal(d, "M 100 120 L 900 120 L 500 1080 L 100 120 Z");
});

test("drag-created nodes keep paired handles and Shift snaps to 45-degree segments", () => {
  const anchor = draggedEditorPenAnchor({ x: 0.5, y: 0.5 }, { x: 0.6, y: 0.4 });
  assert.ok(Math.abs(anchor.handleOut.x - 0.1) < 1e-9);
  assert.ok(Math.abs(anchor.handleOut.y + 0.1) < 1e-9);
  assert.ok(Math.abs(anchor.handleIn.x + 0.1) < 1e-9);
  assert.ok(Math.abs(anchor.handleIn.y - 0.1) < 1e-9);

  const snapped = snapEditorPenPoint({ x: 0.8, y: 0.7 }, { x: 0.1, y: 0.1 });
  const dx = (snapped.x - 0.1) * 1000;
  const dy = (snapped.y - 0.1) * 1200;
  assert.ok(Math.abs(dx - dy) < 0.001, "the snapped segment should be exactly 45 degrees in artwork coordinates");
});

test("nodes can be inserted on straight and curved segments without losing curve handles", () => {
  const line = { anchors: [{ x: 0.1, y: 0.5 }, { x: 0.9, y: 0.5 }], closed: false };
  const lineWithNode = insertEditorPenAnchor(line, { x: 0.5, y: 0.5 });
  assert.equal(lineWithNode.anchors.length, 3);
  assert.deepEqual(lineWithNode.anchors[1], { x: 0.5, y: 0.5 });
  assert.equal(editorPenPathData(lineWithNode), "M 100 600 L 500 600 L 900 600");

  const curve = { anchors: [
    { x: 0.1, y: 0.5, handleOut: { x: 0.2, y: -0.25 } },
    { x: 0.9, y: 0.5, handleIn: { x: -0.2, y: -0.25 } },
  ], closed: false };
  const curveWithNode = insertEditorPenAnchor(curve, { x: 0.5, y: 0.3125 });
  assert.equal(curveWithNode.anchors.length, 3);
  assert.ok(curveWithNode.anchors[1].handleIn);
  assert.ok(curveWithNode.anchors[1].handleOut);
  assert.equal((editorPenPathData(curveWithNode).match(/C /g) ?? []).length, 2);
});

test("node removal preserves the minimum anchors required by open and closed paths", () => {
  const open = { anchors: [{ x: 0, y: 0 }, { x: 0.5, y: 0.5 }, { x: 1, y: 1 }], closed: false };
  assert.equal(removeEditorPenAnchor(open, 1).anchors.length, 2);
  assert.equal(removeEditorPenAnchor({ anchors: open.anchors.slice(0, 2), closed: false }, 0), null);

  const closed = { anchors: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0.5, y: 1 }, { x: 0.5, y: 0.5 }], closed: true };
  assert.equal(removeEditorPenAnchor(closed, 1).anchors.length, 3);
  assert.equal(removeEditorPenAnchor({ anchors: closed.anchors.slice(0, 3), closed: true }, 1), null);
});
