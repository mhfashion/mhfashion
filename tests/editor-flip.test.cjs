const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const { loadModule } = require("./helpers/load-ts-module.cjs");

const transform = loadModule("apps/web/src/lib/editor-transform.ts");
const layers = loadModule("apps/web/src/lib/editor-layers.ts");
const toolsBar = readFileSync(path.join(__dirname, "../apps/web/src/components/EditorToolsBar.tsx"), "utf8");
const canvas = readFileSync(path.join(__dirname, "../apps/web/src/components/EditorCanvas.tsx"), "utf8");
const panel = readFileSync(path.join(__dirname, "../apps/web/src/components/EditorLayersPanel.tsx"), "utf8");
const adjustments = readFileSync(path.join(__dirname, "../apps/web/src/components/EditorAdjustmentsPanel.tsx"), "utf8");

const close = (a, b, label) => assert.ok(Math.abs(a - b) < 1e-6, `${label}: ${a} != ${b}`);
const box = { x: 100, y: 200, width: 200, height: 100 };
const centreOf = (b) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });

test("flipping a layer mirrors its scale and reverses its rotation about its own centre", () => {
  const placement = { offset: { x: 0, y: 0 }, scale: { x: 1.4, y: 0.8 }, pivot: centreOf(box), rotation: 25 };
  const flipped = transform.flipLayerPlacement(placement, "horizontal", centreOf(box));
  assert.deepEqual(flipped.scale, { x: -1.4, y: 0.8 });
  assert.equal(flipped.rotation, -25);
  assert.deepEqual(flipped.offset, placement.offset, "a layer centred on the mirror line keeps its place");

  const vertical = transform.flipLayerPlacement(placement, "vertical", centreOf(box));
  assert.deepEqual(vertical.scale, { x: 1.4, y: -0.8 });
  assert.deepEqual(vertical.offset, placement.offset);
});

test("a layer that sits off the mirror line is reflected to the other side", () => {
  const placement = { offset: { x: 60, y: -10 }, scale: { x: 1, y: 1 }, pivot: centreOf(box), rotation: 0 };
  const flipped = transform.flipLayerPlacement(placement, "horizontal", { x: 500, y: 600 });
  // Its painted centre mirrors: 200 + 60 = 260 becomes 2 * 500 - 260 = 740.
  close(flipped.pivot.x + flipped.offset.x, 740, "mirrored centre");
  close(flipped.pivot.y + flipped.offset.y, centreOf(box).y - 10, "the other axis is untouched");
});

test("a flipped layer's box is the mirror of the box it painted", () => {
  const placement = { offset: { x: 18, y: -6 }, scale: { x: 1.3, y: 0.9 }, pivot: centreOf(box), rotation: 32 };
  const centre = centreOf(box);
  const before = layers.placedLayerBounds(box, { ...placement, origin: placement.pivot });

  const mirrored = transform.flipLayerPlacement(placement, "horizontal", centre);
  const after = layers.placedLayerBounds(box, { ...mirrored, origin: mirrored.pivot });
  close(after.x, 2 * centre.x - (before.x + before.width), "left edge");
  close(after.width, before.width, "width");
  close(after.y, before.y, "top edge");
  close(after.height, before.height, "height");

  const flippedVertical = transform.flipLayerPlacement(placement, "vertical", centre);
  const vertical = layers.placedLayerBounds(box, { ...flippedVertical, origin: flippedVertical.pivot });
  close(vertical.y, 2 * centre.y - (before.y + before.height), "top edge after a vertical flip");
  close(vertical.height, before.height, "height after a vertical flip");
});

test("flipping twice restores the layer", () => {
  const placement = { offset: { x: 12, y: 40 }, scale: { x: 0.75, y: 1.6 }, pivot: centreOf(box), rotation: -12 };
  const once = transform.flipLayerPlacement(placement, "horizontal", { x: 500, y: 600 });
  const twice = transform.flipLayerPlacement(once, "horizontal", { x: 500, y: 600 });
  close(twice.scale.x, placement.scale.x, "scale");
  close(twice.offset.x, placement.offset.x, "offset");
  close(twice.rotation, placement.rotation, "rotation");
});

test("a multi-layer selection flips as one picture, not in place", () => {
  const centre = { x: 500, y: 600 };
  const left = { offset: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, pivot: { x: 300, y: 600 }, rotation: 0 };
  const right = { offset: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, pivot: { x: 700, y: 600 }, rotation: 0 };
  const flippedLeft = transform.flipLayerPlacement(left, "horizontal", centre);
  const flippedRight = transform.flipLayerPlacement(right, "horizontal", centre);
  // The layer that sat 200 units left of centre ends up 200 units right of it.
  close(flippedLeft.pivot.x + flippedLeft.offset.x, 700, "left layer moves to the right");
  close(flippedRight.pivot.x + flippedRight.offset.x, 300, "right layer moves to the left");
});

test("Flip lives in the Adjustments panel and mirrors the layer, not a copy of it", () => {
  // Owner decision 2026-11-22: Flip left the Tools bar for the Adjustments panel.
  assert.doesNotMatch(toolsBar, /Flip horizontal|Flip vertical|canFlip|onFlip/);
  assert.match(adjustments, /aria-label="Flip horizontal"/);
  assert.match(adjustments, /aria-label="Flip vertical"/);
  assert.match(adjustments, /onClick=\{\(\) => onFlip\("horizontal"\)\}/);
  assert.match(adjustments, /onClick=\{\(\) => onFlip\("vertical"\)\}/);
  // A locked layer cannot be flipped, so the buttons are disabled with it.
  assert.match(adjustments, /aria-label="Flip horizontal"[\s\S]{0,200}disabled=\{selectedLayer\.locked\}/);
  assert.match(adjustments, /<span className="text-\[10px\] text-text-secondary">Flip<\/span>/);

  assert.match(canvas, /import \{ flipLayerPlacement, /);
  assert.match(canvas, /const flipSelectedLayers = \(axis: "horizontal" \| "vertical"\) => \{/);
  // The linked set moves together, and a locked layer is never mirrored.
  assert.match(canvas, /flipSelectedLayers[\s\S]{0,400}resolveLinkedLayerIds\(selectedLayerIds\)\.filter\(\(id\) => !layers\.find\(\(layer\) => layer\.id === id\)\?\.locked\)/);
  assert.match(canvas, /onFlip=\{flipSelectedLayers\}/);
  assert.doesNotMatch(canvas, /canFlip=/);
  // No separate flip flag: the renderer already composes the scale, so the sign does the work.
  assert.doesNotMatch(canvas, /layerFlips/);
});

test("hovering either side highlights the other without selecting it", () => {
  assert.match(panel, /data-layer-hovered=\{hoveredLayerId === layer\.id \? "true" : undefined\}/);
  assert.match(panel, /onPointerEnter=\{\(\) => onHoverLayer\?\.\(layer\.id\)\}/);
  assert.match(panel, /onPointerLeave=\{\(\) => onHoverLayer\?\.\(null\)\}/);
  assert.match(panel, /hoveredLayerId === layer\.id && !isSelected \? "ring-1 ring-inset ring-\[#4c9dff\]"/);

  assert.match(canvas, /data-editor-hover-outline="true"/);
  assert.match(canvas, /onPointerMove=\{\(event\) => onHoverMove\?\.\(event\.clientX, event\.clientY\)\}/);
  assert.match(canvas, /hoveredLayerId && !selectedLayerIds\.includes\(hoveredLayerId\) \? boundsForLayerIds\(\[hoveredLayerId\]\) : null/);
  // Hover must never move the selection.
  assert.doesNotMatch(canvas, /hoverCanvasLayer[\s\S]{0,200}setSelectedLayer/);
});
