const assert = require("node:assert/strict");
const test = require("node:test");
const { loadModule } = require("./helpers/load-ts-module.cjs");

const snap = loadModule("apps/web/src/lib/editor-snap.ts");
const align = loadModule("apps/web/src/lib/editor-align.ts");

const AREA = align.ARTWORK_PRINT_AREA;

test("a box offers its two edges and its centre on each axis", () => {
  const box = { x: 100, y: 200, width: 300, height: 400 };
  assert.deepEqual(snap.snapLinesFor(box, "x"), [100, 250, 400]);
  assert.deepEqual(snap.snapLinesFor(box, "y"), [200, 400, 600]);
});

test("the targets are the canvas edges and centre plus every other layer", () => {
  const other = { x: 700, y: 900, width: 100, height: 200 };
  const targets = snap.snapTargetLines([other], AREA);
  assert.deepEqual([...targets.x].sort((a, b) => a - b), [0, 500, 700, 750, 800, 1000], "canvas edges and centre, plus the other layer's edges and centre");
  assert.deepEqual([...targets.y].sort((a, b) => a - b), [0, 600, 900, 1000, 1100, 1200]);
  assert.ok(targets.x.includes(500), "the canvas centre is a target");
  assert.ok(targets.y.includes(600), "the canvas centre is a target");
});

test("a drag within the snap distance lands exactly on the line", () => {
  const targets = snap.snapTargetLines([], AREA);
  const box = { x: 3, y: 595, width: 200, height: 100 };
  const result = snap.snapBoxToLines(box, targets);
  assert.equal(result.dx, -3, "the left edge meets the canvas edge");
  assert.equal(result.dy, 5, "the middle meets the canvas centre");
  assert.deepEqual(result.guides, [{ axis: "x", position: 0 }, { axis: "y", position: 600 }]);
});

test("a drag outside the snap distance is left alone", () => {
  const targets = snap.snapTargetLines([], AREA);
  const box = { x: 40, y: 200, width: 200, height: 100 };
  const result = snap.snapBoxToLines(box, targets);
  assert.deepEqual(result, { dx: 0, dy: 0, guides: [] });
});

test("the nearest line wins, so a drag never jumps across the canvas", () => {
  const targets = snap.snapTargetLines([], AREA);
  // The right edge is 4 units from the canvas edge and the centre is 5 units the other way.
  const box = { x: 796, y: 300, width: 200, height: 100 };
  const result = snap.snapBoxToLines(box, targets);
  assert.equal(result.dx, 4);
  assert.deepEqual(result.guides, [{ axis: "x", position: 1000 }]);
});

test("a layer snaps to another layer's edge, not only to the canvas", () => {
  const other = { x: 400, y: 100, width: 100, height: 100 };
  const targets = snap.snapTargetLines([other], AREA);
  const box = { x: 405, y: 500, width: 50, height: 50 };
  const result = snap.snapBoxToLines(box, targets);
  assert.equal(result.dx, -5);
  assert.equal(result.dy, 0);
  assert.deepEqual(result.guides, [{ axis: "x", position: 400 }]);
});

test("a zero threshold disables snapping, which is what the modifier key asks for", () => {
  const targets = snap.snapTargetLines([], AREA);
  const box = { x: 1, y: 1, width: 100, height: 100 };
  assert.deepEqual(snap.snapBoxToLines(box, targets, 0), { dx: 0, dy: 0, guides: [] });
});

test("the drag box is measured from the box the drag started on", () => {
  const start = { x: 10, y: 20, width: 100, height: 100 };
  assert.deepEqual(snap.offsetBox(start, 5, -7), { x: 15, y: 13, width: 100, height: 100 });
  assert.deepEqual(start, { x: 10, y: 20, width: 100, height: 100 }, "the start box is not mutated");
});
