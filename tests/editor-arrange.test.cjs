const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const { loadModule } = require("./helpers/load-ts-module.cjs");


const lib = loadModule("apps/web/src/lib/editor-layers.ts");
const panel = readFileSync(path.join(__dirname, "../apps/web/src/components/EditorAdjustmentsPanel.tsx"), "utf8");
const preview = readFileSync(path.join(__dirname, "../apps/web/src/components/EditorLayerPreview.tsx"), "utf8");
const canvas = readFileSync(path.join(__dirname, "../apps/web/src/components/EditorCanvas.tsx"), "utf8");

const close = (a, b, label) => assert.ok(Math.abs(a - b) < 1e-6, `${label}: ${a} != ${b}`);
const bounds = { x: 100, y: 200, width: 200, height: 100 };
const still = { offset: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, origin: { x: 200, y: 250 }, rotation: 0 };

test("a layer's painted box follows its offset, scale and rotation", () => {
  assert.deepEqual(lib.placedLayerBounds(bounds, still), bounds);

  const moved = lib.placedLayerBounds(bounds, { ...still, offset: { x: 40, y: -30 } });
  assert.deepEqual(moved, { x: 140, y: 170, width: 200, height: 100 });

  // Scaling happens about the layer's own pivot, so the box grows either side of it.
  const doubled = lib.placedLayerBounds(bounds, { ...still, scale: { x: 2, y: 2 } });
  assert.deepEqual(doubled, { x: 0, y: 150, width: 400, height: 200 });

  // A quarter turn swaps the box around the pivot.
  const turned = lib.placedLayerBounds(bounds, { ...still, rotation: 90 });
  close(turned.width, 100, "turned width");
  close(turned.height, 200, "turned height");
  close(turned.x + turned.width / 2, 200, "turned centre x");
  close(turned.y + turned.height / 2, 250, "turned centre y");

  // A flip mirrors in place: the same box, painted the other way round.
  const flipped = lib.placedLayerBounds(bounds, { ...still, scale: { x: -1, y: 1 } });
  assert.deepEqual(flipped, bounds);
});

test("aligning a layer puts it flush with the artboard edge or centre", () => {
  const artboard = lib.EDITOR_ARTBOARD;
  assert.deepEqual({ width: artboard.width, height: artboard.height }, { width: 1000, height: 1200 });

  const at = (placement, action) => lib.placedLayerBounds(bounds, { ...placement, offset: lib.arrangeLayerOffset(bounds, placement, action) });

  const left = at(still, "left");
  close(left.x, 0, "left edge");
  const right = at(still, "right");
  close(right.x + right.width, artboard.width, "right edge");
  const centreH = at(still, "center-h");
  close(centreH.x + centreH.width / 2, artboard.width / 2, "centre x");

  const top = at(still, "top");
  close(top.y, 0, "top edge");
  const bottom = at(still, "bottom");
  close(bottom.y + bottom.height, artboard.height, "bottom edge");
  const middle = at(still, "middle");
  close(middle.y + middle.height / 2, artboard.height / 2, "middle y");

  const centred = at(still, "center");
  close(centred.x + centred.width / 2, artboard.width / 2, "centred x");
  close(centred.y + centred.height / 2, artboard.height / 2, "centred y");

  // Alignment is measured on the painted box, so a scaled and turned layer still lands flush.
  const busy = { offset: { x: 220, y: -140 }, scale: { x: 1.7, y: 0.8 }, origin: { x: 200, y: 250 }, rotation: 37 };
  const busyRight = at(busy, "right");
  close(busyRight.x + busyRight.width, artboard.width, "turned right edge");
  const busyMiddle = at(busy, "middle");
  close(busyMiddle.y + busyMiddle.height / 2, artboard.height / 2, "turned middle");

  // Aligning is additive: a second call is a no-op, so the button never drifts the layer.
  const once = lib.arrangeLayerOffset(bounds, still, "left");
  const twice = lib.arrangeLayerOffset(bounds, { ...still, offset: once }, "left");
  close(twice.x, once.x, "left is idempotent");
  close(twice.y, once.y, "left keeps y");
});

test("the text style presets are editable effect stacks", () => {
  const ids = lib.EDITOR_TEXT_STYLES.map((preset) => preset.id);
  assert.equal(new Set(ids).size, ids.length, "preset ids are unique");
  assert.deepEqual(ids, ["neon", "aurora", "sunset", "halo", "sticker", "retro", "chrome", "outline", "shadow", "echo", "stripe", "long-shadow", "comic", "isometric", "varsity", "poster", "hollow", "dots", "checker", "grid", "chrome-3d", "gold", "ice", "lava", "balloon", "jelly", "wood", "marble", "led", "comic-3d", "iso-3d"]);
  const kinds = new Set(["shadow", "outline", "glow", "offset", "echo", "extrude", "stripe", "blur", "gradient", "pattern", "hollow", "bevel", "gloss"]);
  for (const preset of lib.EDITOR_TEXT_STYLES) {
    assert.ok(preset.label && preset.hint, `${preset.id} is labelled`);
    assert.ok(preset.effects.length > 0, `${preset.id} paints something`);
    for (const effect of preset.effects) {
      assert.ok(kinds.has(effect.kind), `${preset.id} uses a known effect`);
      if (effect.kind === "gradient") assert.match(effect.color2 ?? "", /^#[0-9a-f]{6}$/i, `${preset.id} gradient has a second stop`);
      if (effect.kind === "pattern") {
        assert.match(effect.color2 ?? "", /^#[0-9a-f]{6}$/i, `${preset.id} pattern has a backdrop`);
        assert.ok(["dots", "grid", "checker"].includes(effect.pattern ?? ""), `${preset.id} pattern names a motif`);
      }
    }
  }

  const preset = lib.EDITOR_TEXT_STYLES.find((item) => item.id === "neon");
  const first = lib.textStyleEffects(preset, "seed-a");
  const second = lib.textStyleEffects(preset, "seed-b");
  assert.equal(first.length, preset.effects.length);
  assert.ok(first.every((effect) => effect.enabled === true));
  assert.notDeepEqual(first.map((effect) => effect.id), second.map((effect) => effect.id));
  // Applying the same preset twice in one session must not collide in the stack editor.
  const again = lib.textStyleEffects(preset, "seed-a");
  assert.deepEqual(first.map((effect) => effect.id), again.map((effect) => effect.id));
  // The preset list is copied, not shared with the constant.
  first[0].color = "#000000";
  assert.notEqual(preset.effects[0].color, "#000000");
});

test("the design swatches are valid, named colours", () => {
  assert.ok(lib.EDITOR_DESIGN_SWATCHES.length >= 8);
  const names = lib.EDITOR_DESIGN_SWATCHES.map((swatch) => swatch.name);
  assert.equal(new Set(names).size, names.length, "swatch names are unique");
  for (const swatch of lib.EDITOR_DESIGN_SWATCHES) {
    assert.match(swatch.value, /^#[0-9a-f]{6}$/i, `${swatch.name} is a hex colour`);
  }
});

test("the Adjustments panel offers Text styles, Frame and swatches", () => {
  // The Arrange box was removed on request: Kittl keeps placement on the canvas handles.
  assert.doesNotMatch(panel, /<Section title="Arrange"/);
  assert.doesNotMatch(panel, /Align layer to canvas/);
  assert.match(panel, /<Section title="Text styles"/);
  assert.match(panel, /aria-label=\{`Text style presets \$\{group\}`\}/);
  assert.match(panel, /textStyleEffects\(preset, /);
  assert.match(panel, /<Section title="Frame"/);
  assert.match(panel, /ariaLabel="Image corner radius"/);
  assert.match(panel, /ariaLabel="Image border width"/);
  assert.match(panel, /ariaLabel="Text colour swatch"/);
  assert.match(panel, /ariaLabel="Shape fill swatch"/);
  assert.match(panel, /ariaLabel="Shape stroke swatch"/);
  assert.match(panel, /ariaLabel="Image border swatch"/);
});

test("the canvas no longer carries an arrange action list", () => {
  assert.doesNotMatch(canvas, /arrangeSelectedLayer/);
  assert.doesNotMatch(canvas, /arrangeLayerOffset\(bounds, placement, action\)/);
  // Placement is still reported so the Move box can show the layer offset.
  assert.match(canvas, /placement=\{selectedLayer \? \{/);
});

test("a photo frame is painted inside the image box", () => {
  assert.match(preview, /clipPath=\{frameRadius > 0 \? `url\(#\$\{imageClipId\}\)` : undefined\}/);
  assert.match(preview, /<rect\s+x=\{image\.x \+ frameWidth \/ 2\}/);
  assert.match(preview, /data-editor-image-border="true"/);
  assert.match(preview, /data-editor-image-frame=/);
});

test("the text preset control offers only presets that paint", () => {
  const tiles = panel.match(/\[\["none", "Plain"\], \["arch", "Arch"\], \["wave", "Wave"\]\]/);
  assert.ok(tiles, "the control lists exactly Plain, Arch and Wave");
  assert.doesNotMatch(panel, /\["circle",/, "a circle tile that paints nothing is not offered");
});
