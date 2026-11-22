const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const sourcePath = path.join(__dirname, "../apps/web/src/lib/editor-layers.ts");
const compiled = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  fileName: sourcePath,
}).outputText;
const lib = { exports: {} };
new Function("module", "exports", compiled)(lib, lib.exports);
const {
  EDITOR_TOOL_OPTIONS_DEFAULT,
  EDITOR_ERASER_PRESETS,
  EDITOR_GRADIENT_PRESETS,
  EDITOR_TEXT_FONT_FAMILY,
  normalizeEditorTextToolSettings,
  normalizeEditorToolOptions,
  editorGradientFromToolSettings,
} = lib.exports;

const panel = readFileSync(path.join(__dirname, "../apps/web/src/components/EditorAdjustmentsPanel.tsx"), "utf8");
const canvas = readFileSync(path.join(__dirname, "../apps/web/src/components/EditorCanvas.tsx"), "utf8");

test("the Text tool box defaults are complete and render-safe", () => {
  const text = EDITOR_TOOL_OPTIONS_DEFAULT.text;
  assert.equal(text.fontSize, 110);
  assert.equal(text.fontFamily, EDITOR_TEXT_FONT_FAMILY);
  assert.equal(text.fontWeight, 700);
  assert.equal(text.textAlign, "center");
  assert.equal(text.color, null, "null means follow the toolbar foreground colour");
  assert.equal(text.letterSpacing, 0);

  assert.deepEqual(normalizeEditorTextToolSettings(undefined), text);
  // Out-of-range values are clamped, not rejected, so a slider can never store junk.
  const clamped = normalizeEditorTextToolSettings({ fontSize: 5, fontWeight: 1200, letterSpacing: 400 });
  assert.equal(clamped.fontSize, 20);
  assert.equal(clamped.fontWeight, 900);
  assert.equal(clamped.letterSpacing, 40);
  // Alignment only accepts the three real values.
  assert.equal(normalizeEditorTextToolSettings({ textAlign: "justify" }).textAlign, "center");
  assert.equal(normalizeEditorTextToolSettings({ textAlign: "left" }).textAlign, "left");
  // A colour must be a hex value; anything else falls back to "follow the toolbar".
  assert.equal(normalizeEditorTextToolSettings({ color: "#ff0000" }).color, "#ff0000");
  assert.equal(normalizeEditorTextToolSettings({ color: "red" }).color, null);
  assert.equal(normalizeEditorTextToolSettings({ fontFamily: "  " }).fontFamily, EDITOR_TEXT_FONT_FAMILY);
  assert.equal(normalizeEditorTextToolSettings({ fontFamily: "Georgia" }).fontFamily, "Georgia");
});

test("normalizing tool options keeps the Text group and fills it in for old drafts", () => {
  const normalized = normalizeEditorToolOptions({ pen: { width: 12, cap: "butt" }, gradient: { type: "radial", presetId: "sunset" } });
  assert.deepEqual(normalized.text, EDITOR_TOOL_OPTIONS_DEFAULT.text);
  assert.equal(normalized.pen.width, 12);
  assert.equal(normalized.gradient.reverse, false);

  const kept = normalizeEditorToolOptions({ text: { fontSize: 64, fontWeight: 900, textAlign: "right", color: "#123456", letterSpacing: 6 } });
  assert.equal(kept.text.fontSize, 64);
  assert.equal(kept.text.fontWeight, 900);
  assert.equal(kept.text.textAlign, "right");
  assert.equal(kept.text.color, "#123456");
  assert.equal(kept.text.letterSpacing, 6);
});

test("the eraser nib presets only set eraser fields", () => {
  const allowed = new Set(["mode", "shape", "size", "hardness", "opacity", "flow", "spacing", "angle", "roundness"]);
  assert.ok(EDITOR_ERASER_PRESETS.length >= 4);
  assert.deepEqual(EDITOR_ERASER_PRESETS.map((preset) => preset.id), ["soft", "hard", "block", "fine"]);
  for (const preset of EDITOR_ERASER_PRESETS) {
    assert.ok(preset.label, `${preset.id} is labelled`);
    const keys = Object.keys(preset.settings);
    assert.ok(keys.length > 0);
    for (const key of keys) assert.ok(allowed.has(key), `${preset.id} sets ${key}`);
  }
  const block = EDITOR_ERASER_PRESETS.find((preset) => preset.id === "block");
  assert.equal(block.settings.shape, "square");
  assert.equal(block.settings.roundness, 0);
});

test("reversing the gradient tool flips the preset ramp", () => {
  // A two-stop black-to-white ramp is symmetric, so use a preset with three uneven stops.
  const preset = EDITOR_GRADIENT_PRESETS.find((item) => item.stops.length >= 3)
    ?? EDITOR_GRADIENT_PRESETS[0];
  const forward = editorGradientFromToolSettings({ type: "linear", presetId: preset.id, reverse: false });
  const reversed = editorGradientFromToolSettings({ type: "linear", presetId: preset.id, reverse: true });
  assert.equal(forward.stops.length, preset.stops.length);
  assert.deepEqual(forward.stops.map((stop) => stop.offset), [...preset.stops.map((stop) => stop.offset)].sort((a, b) => a - b));
  assert.deepEqual(reversed.stops.map((stop) => stop.offset), [...preset.stops.map((stop) => 100 - stop.offset)].sort((a, b) => a - b));
  assert.notDeepEqual(reversed.stops.map((stop) => stop.offset), forward.stops.map((stop) => stop.offset));
  // Reversing paints the same ramp the other way round: the last colour now starts the axis.
  assert.deepEqual(reversed.stops.map((stop) => stop.color), [...preset.stops.map((stop) => stop.color)].reverse());
  assert.notEqual(forward.stops[0].id, reversed.stops[0].id, "stops get fresh ids");
});

test("the Adjustments panel renders a box for every tool", () => {
  assert.match(panel, /activeTool === "text" && <TextToolOptions/);
  assert.match(panel, /activeTool === "shape" && <ShapeToolOptions/);
  assert.match(panel, /activeTool === "move" && <MoveToolOptions/);
  assert.match(panel, /ariaLabel="Text tool font size"/);
  assert.match(panel, /aria-label="Text tool font family"/);
  assert.match(panel, /ariaLabel="Text tool weight"/);
  assert.match(panel, /ariaLabel="Text tool alignment"/);
  assert.match(panel, /ariaLabel="Text tool letter spacing"/);
  assert.match(panel, /aria-label="Text tool follow the toolbar colour"/);
  assert.match(panel, /aria-label="Shape tool preset"/);
  assert.match(panel, /EDITOR_SHAPE_PRESETS\.map/);
  assert.match(panel, /aria-label="Nudge selected layer"/);
  assert.match(panel, /aria-label="Nudge layer up"/);
  assert.match(panel, /aria-label="Nudge layer left"/);
  assert.match(panel, /aria-label="Nudge readout"/);
  assert.match(panel, /aria-label="Eraser presets"/);
  assert.match(panel, /EDITOR_ERASER_PRESETS\.map/);
  assert.match(panel, /aria-label="Gradient reverse"/);
  assert.match(panel, /aria-label=\{`Reset \$\{label\} to its default`\}/);
  assert.match(panel, /Reset \{label\.toLowerCase\(\)\} to default/);
});

test("new text and nudges go through the tool options and the canvas offset", () => {
  assert.match(canvas, /const textDefaults = toolOptions\.text;/);
  assert.match(canvas, /fontSize: source\?\.fontSize \?\? textDefaults\.fontSize/);
  assert.match(canvas, /color: source\?\.color \?\? textDefaults\.color \?\? foregroundColor/);
  assert.match(canvas, /fontWeight: textDefaults\.fontWeight/);
  assert.match(canvas, /textAlign: textDefaults\.textAlign/);
  assert.match(canvas, /letterSpacing: textDefaults\.letterSpacing/);
  assert.match(canvas, /const nudgeSelectedLayer = \(dx: number, dy: number\)/);
  assert.match(canvas, /setCanvasLayerTransforms\(\(all\) => \(\{ \.\.\.all, \[layer\.id\]: \{ x: current\.x \+ dx, y: current\.y \+ dy \} \}\)\)/);
  assert.match(canvas, /onNudge=\{nudgeSelectedLayer\}/);
  // The panel sends one field at a time, so the text group must be merged, not replaced.
  assert.match(canvas, /text\?: Partial<EditorToolOptions\["text"\]>/);
  assert.match(canvas, /text: \{ \.\.\.current\.text, \.\.\.patch\.text \}/);
  assert.match(canvas, /selectedShape=\{selectedShape\}/);
});

test("text styles paint a preview from the same renderer as the canvas", () => {
  const preview = readFileSync(path.join(__dirname, "../apps/web/src/components/EditorLayerPreview.tsx"), "utf8");
  const panelSource = readFileSync(path.join(__dirname, "../apps/web/src/components/EditorAdjustmentsPanel.tsx"), "utf8");

  // One renderer, two callers: the layer preview and the style tiles.
  assert.match(preview, /export function EditorTextArtwork\(\{ text, idPrefix \}/);
  assert.match(preview, /\{text && <EditorTextArtwork text=\{text\} idPrefix=\{effectPrefix\} \/>\}/);
  assert.match(panelSource, /import \{ EditorTextArtwork \} from "@\/components\/EditorLayerPreview";/);
  assert.match(panelSource, /<EditorTextArtwork text=\{sample\} idPrefix=\{`tile-\$\{id\}`\} \/>/);

  // Every tile samples the preset's own effects, not a hand-drawn approximation.
  assert.match(panelSource, /effects: textStyleEffects\(preset, `tile-\$\{id\}`\)/);
  assert.match(panelSource, /<TextStyleTile key=\{preset\.id\} preset=\{preset\} active=\{appliedStyle === preset\.id\}/);

  // A gradient fill must paint over the base glyphs, or it would be hidden behind them.
  const baseIndex = preview.indexOf('drawText("base-text"');
  const gradientIndex = preview.indexOf("effect.kind === \"gradient\").map((effect) => drawText(");
  assert.ok(baseIndex > 0 && gradientIndex > baseIndex, "gradient copies paint after the base text");
  assert.match(preview, /<linearGradient key=\{effect\.id\} id=\{`\$\{idPrefix\}-grad-/);
});

test("blur and gradient effects keep the transform box honest", () => {
  const { editorTextPaintPadding } = lib.exports;
  const text = { value: "Aa", x: 100, y: 200, fontSize: 100, color: "#ffffff" };

  const plain = editorTextPaintPadding({ ...text, effects: [] });
  const blurred = editorTextPaintPadding({ ...text, effects: [{ id: "b", kind: "blur", color: "#ffffff", blur: 8 }] });
  assert.ok(blurred.right - plain.right >= 20, "a blur bleeds past the ink");
  assert.ok(blurred.left - plain.left >= 20, "a blur bleeds on the left too");

  const gradient = editorTextPaintPadding({ ...text, effects: [{ id: "g", kind: "gradient", color: "#37d7ff", color2: "#d4ff3f" }] });
  assert.deepEqual(gradient, plain, "a gradient fill paints inside the ink");
});
