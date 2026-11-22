const assert = require("node:assert/strict");
const test = require("node:test");
const { loadModule } = require("./helpers/load-ts-module.cjs");

const align = loadModule("apps/web/src/lib/editor-align.ts");
const spec = loadModule("apps/web/src/lib/editor-canvas-spec.ts");

const PRINT = align.ARTWORK_PRINT_AREA;

test("the alignment target is the print area, in artwork units", () => {
  assert.deepEqual(PRINT, { x: 0, y: 0, width: 1000, height: 1200 });
  // The artwork space maps 1 unit to 4.5 print pixels, so 1000 x 1200 units is the 4500 x 5400 canvas.
  assert.equal(PRINT.width * (spec.PRINT_CANVAS_SPEC.widthPx / 1000), spec.PRINT_CANVAS_SPEC.widthPx);
  assert.equal(PRINT.height * (spec.PRINT_CANVAS_SPEC.heightPx / 1200), spec.PRINT_CANVAS_SPEC.heightPx);
  assert.deepEqual([...align.ALIGN_EDGES], ["left", "centre", "right", "top", "middle", "bottom"]);
});

test("each edge moves the box without resizing it", () => {
  const box = { x: 120, y: 80, width: 200, height: 100 };
  assert.deepEqual(align.alignOffset(box, PRINT, "left"), { dx: -120, dy: 0 });
  assert.deepEqual(align.alignOffset(box, PRINT, "centre"), { dx: 500 - 220, dy: 0 });
  assert.deepEqual(align.alignOffset(box, PRINT, "right"), { dx: 1000 - 320, dy: 0 });
  assert.deepEqual(align.alignOffset(box, PRINT, "top"), { dx: 0, dy: -80 });
  assert.deepEqual(align.alignOffset(box, PRINT, "middle"), { dx: 0, dy: 600 - 130 });
  assert.deepEqual(align.alignOffset(box, PRINT, "bottom"), { dx: 0, dy: 1200 - 180 });

  for (const edge of align.ALIGN_EDGES) {
    const { dx, dy } = align.alignOffset(box, PRINT, edge);
    assert.equal(box.width, 200, "the width is never touched");
    assert.equal(box.height, 100);
    assert.ok(edge === "left" || edge === "centre" || edge === "right" ? dy === 0 : dx === 0, `${edge} moves on one axis only`);
  }
});

test("a box already aligned is not moved", () => {
  const centred = { x: 400, y: 550, width: 200, height: 100 };
  assert.deepEqual(align.alignOffset(centred, PRINT, "centre"), { dx: 0, dy: 0 });
  assert.deepEqual(align.alignOffset(centred, PRINT, "middle"), { dx: 0, dy: 0 });
});

test("a selection aligns as one unit", () => {
  const boxes = [{ x: 100, y: 100, width: 100, height: 50 }, { x: 400, y: 300, width: 100, height: 50 }];
  const union = align.unionBox(boxes);
  assert.deepEqual(union, { x: 100, y: 100, width: 400, height: 250 });
  const { dx } = align.alignOffset(union, PRINT, "left");
  assert.equal(dx, -100);
  // Both layers move by the same delta, so their spacing survives the alignment.
  assert.deepEqual(boxes.map((box) => box.x + dx), [0, 300]);
  assert.deepEqual(align.unionBox([]), null);
});

test("tidy spreads three or more boxes evenly and keeps the outer two in place", () => {
  const boxes = [
    { x: 0, y: 0, width: 100, height: 40 },
    { x: 120, y: 0, width: 100, height: 40 },
    { x: 300, y: 0, width: 100, height: 40 },
  ];
  const deltas = align.tidyDeltas(boxes, "x");
  // 400 units of span minus 300 units of boxes leaves two 50-unit gaps: the middle box moves 30.
  assert.deepEqual(deltas, [0, 30, 0], "the middle box takes the extra room");
  const spaced = boxes.map((box, index) => box.x + deltas[index]);
  const gaps = [spaced[1] - (spaced[0] + 100), spaced[2] - (spaced[1] + 100)];
  assert.equal(gaps[0], gaps[1], "the two gaps are equal");
  assert.equal(spaced[0], 0);
  assert.equal(spaced[2], 300, "the outer boxes never move");
});

test("tidy works on the vertical axis and with an out-of-order list", () => {
  const boxes = [
    { x: 0, y: 300, width: 40, height: 100 },
    { x: 0, y: 0, width: 40, height: 100 },
    { x: 0, y: 120, width: 40, height: 100 },
  ];
  const deltas = align.tidyDeltas(boxes, "y");
  const tops = boxes.map((box, index) => box.y + deltas[index]);
  assert.deepEqual(tops, [300, 0, 150], "only the middle box moves, whatever order the list came in");
  const sorted = [...tops].sort((a, b) => a - b);
  assert.equal(sorted[1] - (sorted[0] + 100), sorted[2] - (sorted[1] + 100), "the gaps are equal once the boxes are in order");
});

test("tidy leaves fewer than three boxes alone", () => {
  const one = [{ x: 10, y: 10, width: 10, height: 10 }];
  assert.deepEqual(align.tidyDeltas(one, "x"), [0]);
  const two = [...one, { x: 90, y: 10, width: 10, height: 10 }];
  assert.deepEqual(align.tidyDeltas(two, "x"), [0, 0]);
});

test("overlapping boxes tidy without inventing a negative gap that moves the ends", () => {
  const boxes = [
    { x: 0, y: 0, width: 100, height: 40 },
    { x: 20, y: 0, width: 100, height: 40 },
    { x: 40, y: 0, width: 100, height: 40 },
  ];
  const deltas = align.tidyDeltas(boxes, "x");
  assert.equal(deltas[0], 0);
  assert.equal(deltas[2], 0);
  const tops = boxes.map((box, index) => box.x + deltas[index]);
  assert.equal(tops[1] - (tops[0] + 100), tops[2] - (tops[1] + 100));
});
