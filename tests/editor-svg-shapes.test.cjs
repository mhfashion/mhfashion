// Plan §12.2.12 item 6: a pattern SVG becomes the same shape paths the nine built-in patterns build, so
// a catalogue pattern is a layer the canvas can move, scale and rotate like any other.
const assert = require("node:assert/strict");
const test = require("node:test");
const { loadModule } = require("./helpers/load-ts-module.cjs");

const shapes = loadModule("apps/web/src/lib/editor-svg-shapes.ts");

test("the viewBox is scaled onto the 1000 x 1200 artwork space", () => {
  const { paths, issues } = shapes.svgShapePaths('<svg viewBox="0 0 100 120"><rect width="100" height="120" fill="#123456"/></svg>');
  assert.deepEqual(issues, []);
  assert.equal(paths.length, 1);
  assert.equal(paths[0].d, "M 0 0 L 1000 0 L 1000 1200 L 0 1200 Z");
  assert.equal(paths[0].fill, "#123456");
});

test("a viewBox with an offset is moved to the artwork origin", () => {
  const { paths } = shapes.svgShapePaths('<svg viewBox="50 60 10 12"><rect x="50" y="60" width="10" height="12"/></svg>');
  assert.equal(paths[0].d, "M 0 0 L 1000 0 L 1000 1200 L 0 1200 Z");
});

test("a relative path is written back in absolute artwork coordinates", () => {
  const { paths } = shapes.svgShapePaths('<svg viewBox="0 0 10 10"><path d="M0 0 h5 v5 z"/></svg>');
  assert.equal(paths[0].d, "M 0 0 L 500 0 L 500 600 Z");
});

test("nested groups compose their translate and scale, and the stroke follows the scale", () => {
  const { paths } = shapes.svgShapePaths(
    '<svg viewBox="0 0 10 10"><g transform="translate(1,2) scale(2)" stroke="#000" stroke-width="0.5" fill="none"><path d="M0 0 L1 1"/></g></svg>',
  );
  assert.equal(paths.length, 1);
  // scale first, then translate, then the viewBox: (1,1) → (2,2) → (3,4) → (300,480).
  assert.equal(paths[0].d, "M 100 240 L 300 480");
  assert.equal(paths[0].stroke, "#000");
  assert.equal(paths[0].fill, undefined, "fill=\"none\" is not painted");
  assert.ok(paths[0].strokeWidth > 1, "a scaled stroke is scaled with its path");
});

test("circles, ellipses, lines and polygons become paths", () => {
  const { paths } = shapes.svgShapePaths(
    '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="2"/><line x1="0" y1="0" x2="10" y2="10" stroke="#f00"/><polygon points="0,0 5,0 5,5" fill="#0f0"/></svg>',
  );
  assert.equal(paths.length, 3);
  assert.match(paths[0].d, /^M 300 600 C /);
  assert.equal(paths[1].d, "M 0 0 L 1000 1200");
  assert.equal(paths[1].stroke, "#f00");
  assert.equal(paths[2].d, "M 0 0 L 500 0 L 500 600 Z");
  assert.equal(paths[2].fill, "#0f0");
});

test("what a shape cannot carry is reported, not painted", () => {
  const { paths, issues } = shapes.svgShapePaths(
    '<svg viewBox="0 0 10 10"><defs><linearGradient id="g"><stop offset="0"/></linearGradient></defs>' +
      '<rect width="5" height="5" fill="url(#g)"/><text x="0" y="0">hi</text>' +
      '<rect width="5" height="5" transform="rotate(30)"/></svg>',
  );
  assert.equal(paths.length, 0);
  const reasons = issues.map((issue) => `${issue.element}: ${issue.reason}`);
  assert.equal(reasons.length, 3, "the gradient definition itself is not an issue");
  assert.ok(reasons.some((line) => /rect: a gradient or pattern fill/.test(line)));
  assert.ok(reasons.some((line) => /text: <text> cannot be a shape/.test(line)));
  assert.ok(reasons.some((line) => /rect: transform "rotate\(\)"/.test(line)));
});

test("a style attribute and an inherited fill are both honoured", () => {
  const { paths } = shapes.svgShapePaths(
    '<svg viewBox="0 0 10 10"><g fill="#abcdef"><path d="M0 0 L1 0" style="stroke:#123;stroke-width:2"/></g></svg>',
    { width: 10, height: 10 },
  );
  assert.equal(paths[0].fill, "#abcdef");
  assert.equal(paths[0].stroke, "#123");
  assert.equal(paths[0].strokeWidth, 2);
});

test("an empty or shapeless file leaves the built-in patterns alone", () => {
  for (const svg of ["", "<svg></svg>", "<svg><image href=\"a.png\"/></svg>"]) {
    assert.equal(shapes.svgShapePaths(svg).paths.length, 0, svg);
  }
});
