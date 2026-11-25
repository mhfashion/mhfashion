const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const { loadModule } = require("./helpers/load-ts-module.cjs");
const lib = { exports: loadModule("apps/web/src/lib/editor-layers.ts") };
const {
  EDITOR_TOOL_OPTIONS_DEFAULT,
  DEFAULT_TEXT_WRAP_WIDTH,
  EDITOR_ERASER_PRESETS,
  EDITOR_GRADIENT_PRESETS,
  EDITOR_TEXT_FONT_FAMILY,
  EDITOR_TEXT_DEFAULT_LINE_HEIGHT,
  normalizeEditorTextToolSettings,
  normalizeEditorToolOptions,
  penDashArray,
  editorGradientFromToolSettings,
} = lib.exports;

const panel = readFileSync(path.join(__dirname, "../apps/web/src/components/EditorAdjustmentsPanel.tsx"), "utf8");
const canvas = readFileSync(path.join(__dirname, "../apps/web/src/components/EditorCanvas.tsx"), "utf8");

test("the Text tool carries a default line height into every new layer", () => {
  assert.equal(EDITOR_TEXT_DEFAULT_LINE_HEIGHT, 1.2);
  assert.equal(normalizeEditorTextToolSettings(undefined).lineHeight, EDITOR_TEXT_DEFAULT_LINE_HEIGHT);
  assert.equal(normalizeEditorTextToolSettings({ lineHeight: 0.1 }).lineHeight, 0.7, "too tight is clamped up");
  assert.equal(normalizeEditorTextToolSettings({ lineHeight: 9 }).lineHeight, 3, "too loose is clamped down");
  assert.equal(normalizeEditorTextToolSettings({ lineHeight: 1.6 }).lineHeight, 1.6, "a chosen value is kept");

  assert.match(canvas, /lineHeight: textDefaults\.lineHeight,/, "new text layers take the tool default");
  assert.match(panel, /ariaLabel="Text tool line height"/, "the Text box offers the control");
  assert.match(
    panel,
    /value=\{text\.lineHeight \?\? EDITOR_TEXT_DEFAULT_LINE_HEIGHT\}/,
    "the per-layer field falls back to the same constant",
  );
});

test("the Text tool box defaults are complete and render-safe", () => {
  const text = EDITOR_TOOL_OPTIONS_DEFAULT.text;
  assert.equal(text.fontSize, 110);
  assert.equal(text.fontFamily, EDITOR_TEXT_FONT_FAMILY);
  assert.equal(text.fontWeight, 700);
  assert.equal(text.textAlign, "center");
  assert.equal(text.color, null, "null means follow the toolbar foreground colour");
  assert.equal(text.letterSpacing, 0);
  assert.equal(text.wrapWidth, DEFAULT_TEXT_WRAP_WIDTH);
  assert.equal(text.lineHeight, EDITOR_TEXT_DEFAULT_LINE_HEIGHT, "new text starts at the default line height");

  assert.deepEqual(normalizeEditorTextToolSettings(undefined), text);
  // Out-of-range values are clamped, not rejected, so a slider can never store junk.
  const clamped = normalizeEditorTextToolSettings({ fontSize: 5, fontWeight: 1200, letterSpacing: 400, wrapWidth: 20 });
  assert.equal(clamped.fontSize, 20);
  assert.equal(clamped.fontWeight, 900);
  assert.equal(clamped.letterSpacing, 40);
  assert.equal(clamped.wrapWidth, 120, "a wrap width below the limit is pulled up to it");
  assert.equal(normalizeEditorTextToolSettings({ wrapWidth: 9000 }).wrapWidth, 2000);
  assert.equal(normalizeEditorTextToolSettings({ wrapWidth: 640 }).wrapWidth, 640);
  // Alignment only accepts the three real values.
  assert.equal(normalizeEditorTextToolSettings({ textAlign: "justify" }).textAlign, "center");
  assert.equal(normalizeEditorTextToolSettings({ textAlign: "left" }).textAlign, "left");
  // A colour must be a hex value; anything else falls back to "follow the toolbar".
  assert.equal(normalizeEditorTextToolSettings({ color: "#ff0000" }).color, "#ff0000");
  assert.equal(normalizeEditorTextToolSettings({ color: "red" }).color, null);
  assert.equal(normalizeEditorTextToolSettings({ fontFamily: "  " }).fontFamily, EDITOR_TEXT_FONT_FAMILY);
  assert.equal(normalizeEditorTextToolSettings({ fontFamily: "Georgia" }).fontFamily, "Georgia");
});

test("the pen joins corners and draws dashed or dotted lines", () => {
  const pen = EDITOR_TOOL_OPTIONS_DEFAULT.pen;
  assert.equal(pen.join, "round");
  assert.equal(pen.style, "solid");
  // Old saved settings fill the new fields in, and junk falls back to the default.
  const filled = normalizeEditorToolOptions({ pen: { width: 9 } }).pen;
  assert.deepEqual(filled, { width: 9, cap: "round", join: "round", style: "solid" });
  const kept = normalizeEditorToolOptions({ pen: { join: "miter", style: "dot" } }).pen;
  assert.equal(kept.join, "miter");
  assert.equal(kept.style, "dot");
  assert.equal(normalizeEditorToolOptions({ pen: { join: "round-join", style: "wavy" } }).pen.join, "round");
  assert.equal(normalizeEditorToolOptions({ pen: { join: "round-join", style: "wavy" } }).pen.style, "solid");
  // The dash pattern scales with the pen width, so a fat dotted line keeps its rhythm.
  assert.equal(penDashArray("solid", 5), undefined);
  assert.equal(penDashArray("dash", 4), "12 8");
  assert.equal(penDashArray("dot", 10), "6 18");
  assert.equal(penDashArray("dot", 0), "0.6 1.8", "a zero width still draws a dot, never a solid line");
  // The one renderer every view shares (canvas, mockup, PNG/SVG export) paints what the path carries.
  const preview = readFileSync(path.join(__dirname, "..", "apps/web/src/components/EditorLayerPreview.tsx"), "utf8");
  assert.match(preview, /strokeDasharray=\{shapeStyle \? shapeDash : path\.dash\}/);
  assert.match(preview, /strokeLinejoin=\{path\.lineJoin \?\? "round"\}/);
});

test("every panel slider carries a number field that steps, jumps ten with Shift and resets", () => {
  // One range input, inside RangeField: a slider anywhere else would be missing its number field.
  assert.equal((panel.match(/type="range"/g) ?? []).length, 1);
  assert.match(panel, /aria-label=\{`\$\{ariaLabel\} value`\}/);
  assert.match(panel, /event\.shiftKey \? 10 : 1/, "Shift steps ten times");
  assert.match(panel, /onDoubleClick=\{\(\) => \{ if \(defaultValue !== undefined\) commit\(defaultValue\); \}\}/);
  // Values are bounded and land on the slider's own step before they are written back.
  assert.match(panel, /const stepped = step > 0 \? Math\.round\(\(bounded - min\) \/ step\) \* step \+ min : bounded;/);
  // Typing is held in a draft, so clearing a field is not read as zero.
  assert.match(panel, /const \[draft, setDraft\] = useState<string \| null>\(null\);/);
  // Plan E21 item 8: every tool box can go back to its defaults.
  assert.match(panel, /aria-label="Reset pen to its default"/);
  assert.match(panel, /aria-label="Reset eraser to its default"/);
  assert.match(panel, /aria-label="Reset gradient to its default"/);
  assert.match(panel, /aria-label="Reset text tool to its default"/);
  assert.match(panel, /aria-label=\{`Reset \$\{label\} to its default`\}/);
  // The brush and pencil share one box, so each passes the defaults of the tool it is showing.
  assert.match(panel, /defaults=\{activeTool === "brush" \? EDITOR_TOOL_OPTIONS_DEFAULT\.brush : EDITOR_TOOL_OPTIONS_DEFAULT\.pencil\}/);
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
  assert.match(panel, /ariaLabel="Text tool wrap width"/);
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

test("the effects box lists effects as pictures, and the warp box paints the real bend", () => {
  const panelSource = readFileSync(path.join(__dirname, "../apps/web/src/components/EditorAdjustmentsPanel.tsx"), "utf8");
  const previewSource = readFileSync(path.join(__dirname, "../apps/web/src/components/EditorLayerPreview.tsx"), "utf8");

  // One tile per kind, painted through the shared renderer, plus a thumbnail on each stack row.
  assert.match(panelSource, /\{EFFECT_TYPES\.map\(\(\{ kind, label, color \}\) => <EffectTile/);
  assert.match(panelSource, /<EditorTextArtwork text=\{effectSample\(effect\)\}/);
  assert.match(panelSource, /<EditorTextArtwork text=\{effectSample\(effect\)\} idPrefix=\{`row-/);
  assert.match(panelSource, /\{ kind: "pattern", label: "Pattern"/);
  assert.match(panelSource, /\{ kind: "hollow", label: "Hollow"/);

  // Warp tiles are painted, not faked with CSS transforms, and the no-op circle option is gone.
  assert.match(panelSource, /<TextTransformTile key=\{shape\} shape=\{shape\}/);
  assert.doesNotMatch(panelSource, /"circle"\] as const/);
  assert.doesNotMatch(panelSource, /skew-x-6/);

  // A hollow effect turns the base glyphs into an outline instead of painting a copy behind them.
  assert.match(previewSource, /hollow\s*\n?\s*\? drawText\("base-text", \{ fill: "none", stroke: hollow\.color/);
  assert.match(previewSource, /effect\.kind === "pattern"\).map\(\(effect\) => drawText\(`pattern-/);
  assert.match(previewSource, /motif === "checker"/);
});

test("pattern and hollow keep the transform box honest", () => {
  const { editorTextPaintPadding } = lib.exports;
  const text = { value: "Aa", x: 100, y: 200, fontSize: 100, color: "#ffffff" };
  const plain = editorTextPaintPadding({ ...text, effects: [] });

  const pattern = editorTextPaintPadding({ ...text, effects: [{ id: "p", kind: "pattern", color: "#d4ff3f", color2: "#111827", pattern: "dots", distance: 13 }] });
  assert.deepEqual(pattern, plain, "a pattern fill paints inside the ink");

  const hollow = editorTextPaintPadding({ ...text, effects: [{ id: "h", kind: "hollow", color: "#ffffff", width: 10 }] });
  assert.ok(hollow.left - plain.left >= 5, "a hollow outline strokes half its width outside the ink");
  assert.ok(hollow.bottom - plain.bottom >= 5, "and does so below the glyphs too");
});

test("3D materials shade the extrusion, light the bevel and gloss the face", () => {
  const { editorTextPaintPadding, mixEditorColors } = lib.exports;
  const previewSource = readFileSync(path.join(__dirname, "../apps/web/src/components/EditorLayerPreview.tsx"), "utf8");

  // The side of an extrusion runs from the far colour to the face colour, so it reads as depth.
  assert.equal(mixEditorColors("#000000", "#ffffff", 0.5), "#808080");
  assert.equal(mixEditorColors("#123456", "#123456", 0.4), "#123456");
  assert.equal(mixEditorColors("nonsense", "#ffffff", 0.9), "#ffffff");
  assert.equal(mixEditorColors("#ffffff", "#000000", 5), "#000000", "the mix clamps past the ends");
  assert.match(previewSource, /fill: mixEditorColors\(effect\.color2 \?\? effect\.color, effect\.color, \(step \+ 1\) \/ count\)/);

  // A bevel paints a lit edge and a shaded edge behind the glyphs.
  assert.match(previewSource, /effect\.kind === "bevel"[\s\S]{0,320}fill: effect\.color2 \?\? "#ffffff"/);
  assert.match(previewSource, /effect\.kind === "bevel"[\s\S]{0,520}fill: effect\.color, opacity/);

  // A gloss is a ramp clipped to the glyphs, so it cannot spill past them.
  assert.match(previewSource, /id=\{`\$\{idPrefix\}-gloss-clip-\$\{effectKey\(effect\)\}`\}/);
  assert.match(previewSource, /clipPath=\{`url\(#\$\{idPrefix\}-gloss-clip-\$\{effectKey\(effect\)\}\)`\}/);

  const text = { value: "Aa", x: 100, y: 200, fontSize: 100, color: "#ffffff" };
  const plain = editorTextPaintPadding({ ...text, effects: [] });
  const gloss = editorTextPaintPadding({ ...text, effects: [{ id: "g", kind: "gloss", color: "#ffffff", opacity: 0.8 }] });
  assert.deepEqual(gloss, plain, "a gloss paints inside the ink");
  const bevel = editorTextPaintPadding({ ...text, effects: [{ id: "b", kind: "bevel", color: "#334155", color2: "#ffffff", width: 6 }] });
  assert.ok(bevel.left - plain.left >= 6, "the lit edge reaches past the ink");
  assert.ok(bevel.bottom - plain.bottom >= 6, "and so does the shaded edge");
});

test("the style gallery is shelved, and the 3D shelf carries the material looks", () => {
  const { EDITOR_TEXT_STYLES } = lib.exports;
  const panelSource = readFileSync(path.join(__dirname, "../apps/web/src/components/EditorAdjustmentsPanel.tsx"), "utf8");
  const groups = [...new Set(EDITOR_TEXT_STYLES.map((preset) => preset.group))];
  assert.deepEqual(groups, ["Classic", "Fill", "3D"], "the shelves are declared once, in order");
  assert.ok(EDITOR_TEXT_STYLES.filter((preset) => preset.group === "3D").length >= 10, "the 3D shelf is not a token entry");
  const ids = EDITOR_TEXT_STYLES.map((preset) => preset.id);
  assert.equal(new Set(ids).size, ids.length, "no two presets share an id");
  assert.match(panelSource, /\(\["Classic", "Fill", "3D"\] as const\)\.map\(\(group\)/);
  assert.match(panelSource, /preset\.group === group/);
});
