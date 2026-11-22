const assert = require("node:assert/strict");
const test = require("node:test");
const { loadModule } = require("./helpers/load-ts-module.cjs");

const geometry = loadModule("apps/web/src/lib/editor-path-boolean.ts");
const layers = loadModule("apps/web/src/lib/editor-layers.ts");

const rect = (x, y, width, height) => `M ${x} ${y} H ${x + width} V ${y + height} H ${x} Z`;
const square = { x: 100, y: 100, size: 400 };
const A = rect(square.x, square.y, square.size, square.size);
const B = rect(300, 300, 400, 400);
const area = (d) => geometry.parsePathRings(d).reduce((total, ring) => total + Math.abs(geometry.signedArea(ring)), 0);
const rings = (d) => geometry.parsePathRings(d);
/** The same number-pair scan `layerCanvasBounds` uses, so the box follows the result. */
const boundsOf = (d) => {
  const values = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const points = Array.from({ length: Math.floor(values.length / 2) }, (_, index) => ({ x: values[index * 2], y: values[index * 2 + 1] }));
  return {
    x: Math.min(...points.map((point) => point.x)),
    y: Math.min(...points.map((point) => point.y)),
    right: Math.max(...points.map((point) => point.x)),
    bottom: Math.max(...points.map((point) => point.y)),
  };
};

/** Bounds of the parsed geometry, for path data whose numbers are relative. */
const ringBounds = (d) => {
  const points = rings(d).flat();
  return {
    x: Math.min(...points.map((point) => point.x)),
    y: Math.min(...points.map((point) => point.y)),
    right: Math.max(...points.map((point) => point.x)),
    bottom: Math.max(...points.map((point) => point.y)),
  };
};

test("two overlapping squares merge into one ring of the right area", () => {
  const merged = geometry.booleanPathData([A, B], "merge");
  assert.equal(rings(merged).length, 1);
  assert.equal(area(merged), 280000, "400^2 + 400^2 - the 200 x 200 overlap");
  assert.deepEqual(boundsOf(merged), { x: 100, y: 100, right: 700, bottom: 700 });
});

test("subtract cuts the second path out of the first and keeps one path", () => {
  const subtracted = geometry.booleanPathData([A, B], "subtract");
  assert.equal(rings(subtracted).length, 1);
  assert.equal(area(subtracted), 120000);
  assert.deepEqual(boundsOf(subtracted), { x: 100, y: 100, right: 500, bottom: 500 }, "the box stays on the base shape");
});

test("intersect keeps only the overlap", () => {
  const intersected = geometry.booleanPathData([A, B], "intersect");
  assert.equal(rings(intersected).length, 1);
  assert.equal(area(intersected), 40000);
  assert.deepEqual(boundsOf(intersected), { x: 300, y: 300, right: 500, bottom: 500 });
});

test("exclude keeps both outer pieces as two rings of one path", () => {
  const excluded = geometry.booleanPathData([A, B], "exclude");
  assert.equal(rings(excluded).length, 2);
  assert.equal(area(excluded), 240000);
  assert.deepEqual(boundsOf(excluded), { x: 100, y: 100, right: 700, bottom: 700 });
});

test("curved paths are sampled finely enough for print", () => {
  const circle = "M 500 300 C 610 300 700 390 700 500 C 700 610 610 700 500 700 C 390 700 300 610 300 500 C 300 390 390 300 500 300 Z";
  const circleArea = Math.PI * 200 * 200;
  assert.ok(Math.abs(area(circle) - circleArea) / circleArea < 0.01, "the sampled circle keeps its area within 1%");
  const merged = geometry.booleanPathData([circle, rect(400, 400, 400, 400)], "merge");
  assert.equal(rings(merged).length, 1, "a circle and a square that overlap make one ring");
  const cut = geometry.booleanPathData([circle, rect(400, 400, 400, 400)], "subtract");
  assert.ok(area(cut) > 0 && area(cut) < area(circle), "subtract removes the quarter the square covers");
  const excluded = geometry.booleanPathData([circle, rect(400, 400, 400, 400)], "exclude");
  assert.equal(rings(excluded).length, 2);
});

test("a rotated shape and a pen path both go through the builder", () => {
  const rotated = "M 300 100 L 700 300 L 500 700 L 100 500 Z";
  const intersected = geometry.booleanPathData([rotated, rect(400, 200, 400, 400)], "intersect");
  const result = rings(intersected);
  assert.equal(result.length, 1);
  assert.equal(result[0].length, 5, "the overlap is a pentagon");
  const pen = "M 200 200 C 300 100 500 100 600 200 C 700 300 600 500 500 600 L 200 600 Z";
  const merged = geometry.booleanPathData([pen, rect(100, 100, 200, 200)], "merge");
  assert.equal(rings(merged).length, 1);
  const penBounds = ringBounds(pen);
  const mergedBounds = boundsOf(merged);
  assert.deepEqual({ ...mergedBounds, right: 0 }, { x: 100, y: 100, right: 0, bottom: 600 });
  assert.ok(Math.abs(mergedBounds.right - penBounds.right) < 0.01, "the union keeps the curve's own reach");
  assert.ok(penBounds.right > 600 && penBounds.right < 700, "the control point is outside the ink");
});

test("disjoint and contained shapes take the expected short cuts", () => {
  const left = rect(0, 0, 100, 100);
  const right = rect(200, 200, 100, 100);
  assert.equal(rings(geometry.booleanPathData([left, right], "merge")).length, 2);
  assert.equal(geometry.booleanPathData([left, right], "intersect"), "");
  assert.equal(area(geometry.booleanPathData([left, right], "subtract")), 10000);
  assert.equal(geometry.booleanPathData([rect(120, 120, 50, 50), rect(100, 100, 400, 400)], "subtract"), "", "a shape inside the cut is gone");
  assert.equal(area(geometry.booleanPathData([rect(120, 120, 50, 50), rect(100, 100, 400, 400)], "intersect")), 2500);
});

test("relative commands parse the same as absolute ones", () => {
  const absolute = "M 100 100 L 500 100 L 500 500 L 100 500 Z";
  const relative = "m 100 100 l 400 0 l 0 400 l -400 0 z";
  assert.equal(area(relative), area(absolute));
  assert.deepEqual(ringBounds(relative), ringBounds(absolute));
  const curved = "M 100 100 c 100 0 200 100 200 200 s -100 200 -200 200 z";
  assert.ok(rings(curved)[0].length > 10, "the cubic and the reflected cubic are both sampled");
});

test("fractional canvas coordinates chain into closed rings", () => {
  const first = "M -253.42 -174.86 L 363.01 -174.86 L 363.01 442.29 L -253.42 442.29 Z";
  const second = "M 89.04 168 L 431.51 168 L 431.51 648 L 89.04 648 Z";
  const merged = geometry.booleanPathData([first, second], "merge");
  assert.equal(rings(merged).length, 1, "a crossing between fractional edges still joins up");
  const expected = 616.43 * 617.15 + 342.47 * 480 - (363.01 - 89.04) * (442.29 - 168);
  assert.ok(Math.abs(area(merged) - expected) < 1, `union area ${area(merged)} should be about ${expected}`);
  assert.deepEqual(boundsOf(merged), { x: -253.42, y: -174.86, right: 431.51, bottom: 648 });
});

test("the shape builder writes one path and the layer box follows it", () => {
  const layer = layers.createEditorShapeLayer("shape-builder", "Builder", {
    paths: [
      { d: A, fill: "#111111" },
      { d: B, fill: "#111111" },
    ],
  });
  for (const mode of ["merge", "subtract", "intersect", "exclude"]) {
    const result = layers.applyEditorShapeBuilderOperation([layer], layer.id, mode)[0];
    assert.equal(result.shape.builderMode, mode);
    assert.equal(result.shape.paths.length, 1, `${mode} leaves one path`);
    assert.ok(rings(result.shape.paths[0].d).length >= 1, `${mode} keeps printable geometry`);
  }
  const merged = layers.applyEditorShapeBuilderOperation([layer], layer.id, "merge")[0];
  assert.deepEqual(boundsOf(merged.shape.paths[0].d), { x: 100, y: 100, right: 700, bottom: 700 });
  const empty = layers.applyEditorShapeBuilderOperation([layer], layer.id, "subtract")[0];
  assert.ok(empty.shape.paths[0].d.length > 0, "a result that would be empty leaves the artwork alone");
});
