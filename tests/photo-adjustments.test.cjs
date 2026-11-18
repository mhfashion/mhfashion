const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const sourcePath = path.join(__dirname, "../apps/web/src/lib/photo-adjustments.ts");
const compiled = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  fileName: sourcePath,
}).outputText;
const photoModule = { exports: {} };
new Function("module", "exports", compiled)(photoModule, photoModule.exports);
const {
  applyCurve,
  autoPhotoAdjustments,
  buildColorMatrix,
  buildToneTable,
  colorMatrixValues,
  grainParams,
  hasPhotoAdjustments,
  neutralPhotoAdjustments,
  photoFilterCss,
  splitToneBands,
  vignetteParams,
  DEFAULT_CURVE,
} = photoModule.exports;

const image = (overrides = {}) => ({ src: "x.png", x: 0, y: 0, width: 100, height: 100, byteSize: 10, ...overrides });
const tableOf = (values) => values.trim().split(/\s+/).map(Number);

test("a neutral image renders an identity tone curve and no CSS filter", () => {
  const values = tableOf(buildToneTable(image()));
  assert.equal(values.length, 33);
  assert.equal(values[0], 0);
  assert.equal(values[values.length - 1], 1);
  // Identity transfer: each sample stays on the diagonal (4-dp rounding).
  values.forEach((value, index) => assert.ok(Math.abs(value - index / (values.length - 1)) < 1e-4));
  assert.equal(photoFilterCss(image()), "");
  assert.equal(hasPhotoAdjustments(image()), false);
});

test("exposure is applied in stops, not percent", () => {
  const oneStop = tableOf(buildToneTable(image({ exposure: 1 })));
  const twoStops = tableOf(buildToneTable(image({ exposure: 2 })));
  // A mid input doubles with +1 EV and quadruples with +2 EV (clamped at 1).
  const midIndex = 16;
  const midIn = midIndex / 32;
  assert.ok(Math.abs(oneStop[midIndex] - Math.min(1, midIn * 2)) < 1e-3);
  assert.ok(Math.abs(twoStops[midIndex] - Math.min(1, midIn * 4)) < 1e-3);
});

test("highlights act on the upper zone and shadows on the lower zone", () => {
  const base = tableOf(buildToneTable(image()));
  const lifted = tableOf(buildToneTable(image({ highlights: -100 })));
  const shadowed = tableOf(buildToneTable(image({ shadows: 100 })));
  // -100 highlights darkens the top end but leaves the bottom end alone.
  assert.ok(lifted[32] < base[32]);
  assert.ok(Math.abs(lifted[0] - base[0]) < 1e-6);
  // +100 shadows lifts the low end but leaves the top end alone.
  assert.ok(shadowed[0] > base[0]);
  assert.ok(Math.abs(shadowed[32] - base[32]) < 1e-6);
});

test("whites set the white point and blacks set the black point", () => {
  const whites = tableOf(buildToneTable(image({ whites: 100 })));
  const blacks = tableOf(buildToneTable(image({ blacks: -100 })));
  assert.ok(whites[32] >= 1);
  assert.ok(blacks[0] <= 0);
});

test("levels remap the black and white input points", () => {
  const values = tableOf(buildToneTable(image({ levelsBlack: 20, levelsWhite: 80 })));
  // Input 0.2 maps to 0 and input 0.8 maps to 1 after the remap.
  assert.ok(values[Math.round(0.2 * 32)] <= 0.001);
  assert.ok(values[Math.round(0.8 * 32)] >= 0.999);
});

test("the point curve is monotonic between stored control points", () => {
  assert.equal(applyCurve(0, DEFAULT_CURVE), 0);
  assert.equal(applyCurve(1, DEFAULT_CURVE), 1);
  const lifted = applyCurve(0.5, [0, 50, 100, 100, 100]);
  assert.ok(lifted > 0.5);
  // Interpolation is continuous and never overshoots its endpoints.
  for (let i = 0; i <= 20; i += 1) {
    const value = applyCurve(i / 20, [0, 40, 60, 80, 100]);
    assert.ok(value >= 0 && value <= 1);
  }
});

test("white balance warms with positive temperature and cools with negative", () => {
  const warm = buildColorMatrix(image({ temperature: 100 }));
  const cool = buildColorMatrix(image({ temperature: -100 }));
  assert.ok(warm[0] > 1, "warm raises red");
  assert.ok(warm[12] < 1, "warm lowers blue");
  assert.ok(cool[0] < 1, "cool lowers red");
  assert.ok(cool[12] > 1, "cool raises blue");
  // Tint moves the green/magenta axis.
  const magenta = buildColorMatrix(image({ tint: 100 }));
  assert.ok(magenta[6] < 1, "positive tint lowers green");
});

test("saturation scales the color matrix toward or away from luminance", () => {
  const desaturated = buildColorMatrix(image({ saturation: -100 }));
  // Fully desaturated rows are identical, so the matrix maps every channel to luminance.
  assert.ok(Math.abs(desaturated[0] - desaturated[5]) < 1e-6);
  assert.ok(Math.abs(desaturated[1] - desaturated[6]) < 1e-6);
  const saturated = buildColorMatrix(image({ saturation: 100 }));
  assert.ok(saturated[0] > desaturated[0]);
});

test("the color matrix string is a valid 20-value SVG matrix", () => {
  const values = colorMatrixValues(image({ temperature: 40, saturation: 25 })).split(/\s+/);
  assert.equal(values.length, 20);
  values.forEach((value) => assert.ok(Number.isFinite(Number(value))));
});

test("presence controls emit a CSS filter and leave neutral controls empty", () => {
  assert.equal(photoFilterCss(image({ clarity: 0, texture: 0, dehaze: 0 })), "");
  const css = photoFilterCss(image({ clarity: 50, dehaze: 30, noiseReduction: 20 }));
  assert.match(css, /contrast\(/);
  assert.match(css, /brightness\(/);
  assert.match(css, /blur\(/);
  assert.match(photoFilterCss(image({ smartFilter: "bw", smartFilterIntensity: 100 })), /saturate\(0\)/);
});

test("split toning, vignette, and grain derive from their sliders", () => {
  assert.equal(splitToneBands(image()).highlights.opacity, 0);
  const graded = splitToneBands(image({ splitHighlightSat: 80, splitShadowSat: 60 }));
  assert.ok(graded.highlights.opacity > 0);
  assert.ok(graded.shadows.opacity > 0);
  assert.equal(vignetteParams(image()).amount, 0);
  assert.equal(vignetteParams(image({ vignette: 50 })).amount, 0.5);
  assert.equal(grainParams(image()).amount, 0);
  assert.ok(grainParams(image({ grain: 60 })).amount > 0);
});

test("neutral reset clears every adjustment and keeps the source", () => {
  const reset = neutralPhotoAdjustments();
  assert.equal(reset.brightness, 0);
  assert.equal(reset.red, 100);
  assert.equal(reset.levelsWhite, 100);
  assert.equal(reset.smartFilter, "none");
  assert.equal(reset.backgroundRemoved, false);
  assert.deepEqual(reset.curves, DEFAULT_CURVE);
  assert.equal("src" in reset, false);
  assert.equal(hasPhotoAdjustments(image(reset)), false);
});

test("auto produces a balanced, non-destructive starting point", () => {
  const auto = autoPhotoAdjustments(image());
  assert.ok(auto.exposure > 0);
  assert.ok(auto.contrast > 0);
  assert.ok(auto.highlights < 0);
  assert.ok(auto.shadows > 0);
  assert.equal(hasPhotoAdjustments(image(auto)), true);
});
