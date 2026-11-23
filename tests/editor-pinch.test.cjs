const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const ROOT = path.join(__dirname, "..");
function loadModule(relativePath) {
  const sourcePath = path.join(ROOT, relativePath);
  const compiled = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: sourcePath,
  }).outputText;
  const loaded = { exports: {} };
  new Function("module", "exports", "require", compiled)(loaded, loaded.exports, require);
  return loaded.exports;
}

const pinch = loadModule("apps/web/src/lib/editor-pinch.ts");

// A phone-sized frame: the workspace box starts at x 49, its origin is the top centre at 146 px.
const PHONE = { distance: 120, rectLeft: 49, rectTop: 291, originX: 146, originY: 0, midpointX: 195, midpointY: 351, zoom: 1, panX: 0, panY: 0 };

test("spreading two fingers zooms in by the ratio they spread", () => {
  const view = pinch.pinchView(PHONE, { distance: 240, midpointX: 195, midpointY: 351 });
  assert.equal(view.zoom, 2);
  const view3 = pinch.pinchView(PHONE, { distance: 360, midpointX: 195, midpointY: 351 });
  assert.equal(view3.zoom, 3);
});

test("pinching in zooms out, down to the floor and no further", () => {
  assert.equal(pinch.pinchView(PHONE, { distance: 60, midpointX: 195, midpointY: 351 }).zoom, 0.5);
  assert.equal(pinch.pinchView(PHONE, { distance: 1, midpointX: 195, midpointY: 351 }).zoom, pinch.EDITOR_ZOOM_MIN);
});

test("zooming out from a zoomed view stays inside the same bounds", () => {
  const zoomed = { ...PHONE, zoom: 2.5 };
  assert.equal(pinch.pinchView(zoomed, { distance: 120, midpointX: 195, midpointY: 351 }).zoom, 2.5);
  assert.equal(pinch.pinchView(zoomed, { distance: 1200, midpointX: 195, midpointY: 351 }).zoom, pinch.EDITOR_ZOOM_MAX);
});

test("the artwork under the fingers stays under the fingers", () => {
  const midpointX = 195;
  const midpointY = 351;
  const view = pinch.pinchView(PHONE, { distance: 240, midpointX, midpointY });
  // Screen position of the workspace's own top-left corner, which is a fixed local point:
  // rectLeft + pan + origin * (1 - zoom).
  const corner = (state) => state.panX + PHONE.rectLeft + PHONE.originX * (1 - state.zoom);
  const before = corner(PHONE);
  const after = corner(view);
  const ratio = view.zoom / PHONE.zoom;
  const predicted = midpointX + (before - midpointX) * ratio;
  assert.ok(Math.abs(after - predicted) < 0.001, `corner moved to ${after}, the anchor says ${predicted}`);
});

test("the transform origin is not forgotten: without it the box slides sideways", () => {
  // This is the bug the browser test caught: a phone scales about its top centre, so a zoom that
  // ignores the origin drifts by originX * (z1 - z0) — 146 px here, a third of the print canvas.
  const withOrigin = pinch.pinchView(PHONE, { distance: 240, midpointX: 195, midpointY: 351 });
  const withoutOrigin = pinch.pinchView({ ...PHONE, originX: 0 }, { distance: 240, midpointX: 195, midpointY: 351 });
  assert.equal(withOrigin.panX - withoutOrigin.panX, 146, "the origin term is exactly originX * growth");
  assert.equal(withOrigin.panY - withoutOrigin.panY, 0, "the vertical origin is zero on a phone");
});

test("two fingers that drag without spreading pan the view and hold the zoom", () => {
  const start = { ...PHONE, zoom: 2, panX: 0, panY: -60 };
  const view = pinch.pinchView(start, { distance: 120, midpointX: 255, midpointY: 411 });
  assert.equal(view.zoom, 2, "a drag is not a zoom");
  assert.equal(view.panX, 60, "the view follows the midpoint");
  assert.equal(view.panY, 60 - 60, "and the pan starts from where it was");
});

test("a drag and a spread at once do both, still anchored", () => {
  const view = pinch.pinchView(PHONE, { distance: 240, midpointX: 255, midpointY: 411 });
  assert.equal(view.zoom, 2);
  const ratio = view.zoom / PHONE.zoom;
  const before = PHONE.panX + PHONE.rectLeft + PHONE.originX * (1 - PHONE.zoom);
  const after = view.panX + PHONE.rectLeft + PHONE.originX * (1 - view.zoom);
  assert.ok(Math.abs(after - (255 + (before - 195) * ratio)) < 0.001, "the first midpoint's artwork ends under the new midpoint");
});

test("a gesture that starts with the fingers on top of each other changes nothing", () => {
  const view = pinch.pinchView({ ...PHONE, distance: 0 }, { distance: 200, midpointX: 195, midpointY: 351 });
  assert.deepEqual(view, { zoom: 1, panX: 0, panY: 0 }, "dividing by zero would fly the canvas off screen");
});

test("a frame can be taken from the live view and the measured box", () => {
  const frame = pinch.pinchFrameFrom({ zoom: 1.5, panX: 20, panY: -10 }, { left: 49, top: 291 }, { x: 146, y: 0 }, { distance: 120, midpointX: 195, midpointY: 351 });
  assert.deepEqual(frame, { distance: 120, rectLeft: 49, rectTop: 291, originX: 146, originY: 0, midpointX: 195, midpointY: 351, zoom: 1.5, panX: 20, panY: -10 });
});

test("the editor binds the gesture once and reads the live view through refs", () => {
  const canvas = readFileSync(path.join(ROOT, "apps/web/src/components/EditorCanvas.tsx"), "utf8");
  assert.match(canvas, /viewport\.addEventListener\("touchstart", handleTouchStart/, "a two-finger gesture is listened for");
  assert.match(canvas, /viewport\.addEventListener\("touchmove", handleTouchMove, \{ passive: false \}\)/, "and its move can be cancelled");
  assert.match(canvas, /event\.preventDefault\(\);/, "so the page does not scroll or zoom under the fingers");
  assert.match(canvas, /if \(event\.touches\.length !== 2\) return;/, "one finger is left to the tools");
  assert.match(canvas, /panStartRef\.current \|\| activeNodeDragRef\.current/, "a layer drag is not hijacked by a second finger");
  assert.match(canvas, /pinchView\(start,/, "the maths lives in the tested helper");
  assert.match(canvas, /const zoomRef = useRef\(zoom\);/, "the live view is read through a ref, not a stale closure");
  assert.match(canvas, /viewport\.removeEventListener\("touchmove", handleTouchMove\)/, "and the listeners are cleaned up");
});
