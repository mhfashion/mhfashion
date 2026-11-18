const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const sourcePath = path.join(__dirname, "../apps/web/src/lib/editor-layers.ts");
const source = readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  fileName: sourcePath,
}).outputText;
const layerModel = { exports: {} };
new Function("module", "exports", compiled)(layerModel, layerModel.exports);
const transformSourcePath = path.join(__dirname, "../apps/web/src/lib/editor-transform.ts");
const transformCompiled = ts.transpileModule(readFileSync(transformSourcePath, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  fileName: transformSourcePath,
}).outputText;
const transformModule = { exports: {} };
new Function("module", "exports", transformCompiled)(transformModule, transformModule.exports);
const { getFreeTransformResizeAnchor, getFreeTransformResizeFactors, rotateTransformPoint, snapEditorRotationDelta } = transformModule.exports;
const {
  addLayerMask,
  applyEditorShapeBuilderOperation,
  appendEditorShapePaths,
  defaultEditorShapeStyle,
  normalizeEditorShapeStyle,
  resolveEditorShapeStyle,
  roundEditorShapePath,
  updateEditorShapeStyle,
  appendLayerErasure,
  appendLayerStroke,
  brushDabBlurRadius,
  brushDabPoints,
  clearLayerErasures,
  createEditorArtworkLayer,
  distanceToSegment,
  segmentDistancePx,
  smoothBrushPoints,
  eraserDabBlurRadius,
  eraserDabPoints,
  updateLayerLastErasure,
  createEditorImageLayer,
  createEditorShapeLayer,
  createEditorTextLayer,
  updateEditorImageAdjustments,
  deleteEditorLayer,
  duplicateEditorLayer,
  EDITOR_SHAPE_PRESETS,
  createEditorShapePaths,
  groupEditorLayers,
  linkEditorLayers,
  moveEditorLayerToIndex,
  removeLayerMask,
  reorderEditorLayer,
  setEditorLayerText,
  updateEditorLayer,
  updateEditorLayerTextStyle,
  ungroupEditorLayers,
  unlinkEditorLayers,
  updateEditorPenPath,
  updateLayerLastStroke,
} = layerModel.exports;

const pointStroke = (x1, x2 = x1) => ({ points: [{ x: x1, y: 0.5 }, { x: x2, y: 0.5 }] });

test("new layers get editable defaults and drawing remains isolated to the selected layer", () => {
  const first = createEditorArtworkLayer("one", "Layer 1");
  const second = createEditorArtworkLayer("two", "Layer 2");
  const original = [first, second];
  const drawn = appendLayerStroke(original, "two", "artwork", pointStroke(0.2, 0.4), "hide");

  assert.deepEqual(first, {
    id: "one", name: "Layer 1", kind: "artwork", visible: true, locked: false, opacity: 100,
    fillOpacity: 100, blendMode: "normal", groupId: null, linkId: null, strokes: [], erasures: [], mask: null, text: null, shape: null, image: null,
  });
  assert.equal(original[1].strokes.length, 0, "Updates are immutable");
  assert.equal(drawn[0].strokes.length, 0);
  assert.equal(drawn[1].strokes.length, 1);
  assert.deepEqual(drawn[1].strokes[0], pointStroke(0.2, 0.4));
});

test("brush styling metadata survives live updates and layer duplication", () => {
  const layer = createEditorArtworkLayer("one", "Layer 1");
  const brushStroke = { ...pointStroke(0.2, 0.4), tool: "brush", color: "#f97316" };
  const drawn = appendLayerStroke([layer], "one", "artwork", brushStroke, "hide");
  const updated = updateLayerLastStroke(drawn, "one", "artwork", { ...pointStroke(0.25, 0.45), tool: "brush", color: "#f97316" }, "hide");
  const duplicate = duplicateEditorLayer(updated, "one", "copy")[0];

  assert.equal(updated[0].strokes[0].tool, "brush");
  assert.equal(updated[0].strokes[0].color, "#f97316");
  assert.equal(duplicate.strokes[0].tool, "brush");
  assert.equal(duplicate.strokes[0].color, "#f97316");
  assert.notStrictEqual(duplicate.strokes[0].points, updated[0].strokes[0].points);
});

test("eraser passes accumulate as a subtractive mask and stay off locked layers", () => {
  const layer = createEditorArtworkLayer("one", "Layer 1");
  const pass = { ...pointStroke(0.2, 0.4), tool: "brush", width: 120, hardness: 60, flow: 100, spacing: 12, angle: 0, roundness: 100 };
  const started = appendLayerErasure([layer], "one", pass);
  const grown = updateLayerLastErasure(started, "one", { ...pass, points: [{ x: 0.2, y: 0.5 }, { x: 0.5, y: 0.5 }] });
  const second = appendLayerErasure(grown, "one", { ...pass, points: [{ x: 0.7, y: 0.5 }] });
  const lockedLayers = updateEditorLayer(second, "one", { locked: true });
  const locked = appendLayerErasure(lockedLayers, "one", pass);

  assert.equal(layer.erasures.length, 0, "Erasures never mutate the source layer");
  assert.equal(grown[0].erasures.length, 1, "The live pass replaces the previous one");
  assert.equal(second[0].erasures.length, 2, "A new gesture starts a new pass");
  assert.notStrictEqual(second[0].erasures[0].points, pass.points);
  assert.strictEqual(locked[0], lockedLayers[0], "Locked layers reject erasures");
  assert.deepEqual(clearLayerErasures(second, "one")[0].erasures, []);
  assert.equal(clearLayerErasures(second, "missing")[0].erasures.length, 2);
});

test("eraser dabs resample to the nib spacing and soften with lower hardness", () => {
  const line = { points: [{ x: 0, y: 0.5 }, { x: 0.5, y: 0.5 }], width: 100, spacing: 25 };
  const dabs = eraserDabPoints(line);
  assert.ok(dabs.length > 2, "Spacing above 1% inserts intermediate dabs");
  assert.deepEqual(dabs[0], { x: 0, y: 0.5 });
  assert.deepEqual(dabs[dabs.length - 1], { x: 0.5, y: 0.5 });
  assert.deepEqual(eraserDabPoints({ points: [{ x: 0.3, y: 0.3 }], width: 100, spacing: 25 }), [{ x: 0.3, y: 0.3 }]);
  assert.equal(eraserDabBlurRadius({ width: 100, hardness: 100 }), 0);
  assert.ok(eraserDabBlurRadius({ width: 100, hardness: 0 }) > eraserDabBlurRadius({ width: 100, hardness: 50 }));
});

test("layer masks store black-hide and white-reveal strokes without changing source artwork", () => {
  const art = appendLayerStroke([createEditorArtworkLayer("one", "Layer 1")], "one", "artwork", pointStroke(0.2), "hide");
  const masked = addLayerMask(art, "one");
  const hidden = appendLayerStroke(masked, "one", "mask", pointStroke(0.3, 0.5), "hide");
  const revealed = appendLayerStroke(hidden, "one", "mask", pointStroke(0.7, 0.8), "reveal");

  assert.equal(art[0].mask, null, "Adding a mask does not alter the original layer");
  assert.deepEqual(masked[0].mask, []);
  assert.equal(revealed[0].strokes.length, 1, "Mask painting never removes source artwork");
  assert.deepEqual(revealed[0].mask.map(({ mode }) => mode), ["hide", "reveal"]);
  assert.deepEqual(revealed[0].mask[0].points, pointStroke(0.3, 0.5).points);
  assert.equal(removeLayerMask(revealed, "one")[0].mask, null);
});

test("live stroke updates replace the latest stroke and a locked layer rejects both edit targets", () => {
  const layer = createEditorArtworkLayer("one", "Layer 1");
  const masked = addLayerMask([layer], "one");
  const started = appendLayerStroke(masked, "one", "mask", pointStroke(0.2), "hide");
  const updated = updateLayerLastStroke(started, "one", "mask", pointStroke(0.2, 0.6), "hide");
  const locked = updateEditorLayer(updated, "one", { locked: true });
  const attemptedArtwork = appendLayerStroke(locked, "one", "artwork", pointStroke(0.7), "reveal");
  const attemptedMask = appendLayerStroke(locked, "one", "mask", pointStroke(0.8), "reveal");

  assert.equal(updated[0].mask.length, 1);
  assert.deepEqual(updated[0].mask[0].points, pointStroke(0.2, 0.6).points);
  assert.strictEqual(attemptedArtwork[0], locked[0]);
  assert.strictEqual(attemptedMask[0], locked[0]);
});

test("layer properties clamp and rename safely; visibility and stack order are explicit", () => {
  const layers = [createEditorArtworkLayer("top", "Top"), createEditorArtworkLayer("bottom", "Bottom")];
  const renamed = updateEditorLayer(layers, "top", { name: "  Ink  ", opacity: 140, blendMode: "multiply" });
  const clamped = updateEditorLayer(renamed, "top", { opacity: -4, visible: false });
  const moved = reorderEditorLayer(clamped, "bottom", -1);

  assert.equal(renamed[0].name, "Ink");
  assert.equal(renamed[0].opacity, 100);
  assert.equal(renamed[0].blendMode, "multiply");
  assert.equal(clamped[0].opacity, 0);
  assert.equal(clamped[0].visible, false);
  assert.deepEqual(moved.map((layer) => layer.id), ["bottom", "top"]);
  assert.strictEqual(reorderEditorLayer(moved, "bottom", -1), moved, "A boundary move is a no-op");
});

test("duplicate copies artwork/mask data without sharing mutable arrays and delete removes only the requested layer", () => {
  const layer = createEditorArtworkLayer("one", "Layer 1");
  const painted = appendLayerStroke(addLayerMask([layer], "one"), "one", "artwork", pointStroke(0.1, 0.9), "hide");
  const withMask = appendLayerStroke(painted, "one", "mask", pointStroke(0.2, 0.4), "reveal");
  const duplicated = duplicateEditorLayer(withMask, "one", "copy");
  const copy = duplicated[0];

  assert.equal(copy.id, "copy");
  assert.equal(copy.name, "Layer 1 copy");
  assert.notStrictEqual(copy.strokes, withMask[0].strokes);
  assert.notStrictEqual(copy.strokes[0].points, withMask[0].strokes[0].points);
  assert.notStrictEqual(copy.mask, withMask[0].mask);
  assert.equal(deleteEditorLayer(duplicated, "copy").length, 1);
  assert.equal(deleteEditorLayer(duplicated, "one")[0].id, "copy");
});

test("Add Text, element and upload layers keep their own content and stay in the layer stack", () => {
  const text = createEditorTextLayer("text-1", "Text 1", {
    value: "", x: 500, y: 600, fontSize: 110, color: "#202124",
  });
  assert.equal(text.kind, "text");
  assert.equal(text.text.value, "");

  const typed = setEditorLayerText([text], "text-1", "MH FASHION");
  assert.equal(typed[0].text.value, "MH FASHION");
  assert.equal(text.text.value, "", "Typing is immutable");
  assert.equal(setEditorLayerText([text], "missing", "x")[0].text.value, "");

  const shape = createEditorShapeLayer("shape-1", "Wave line", {
    paths: [{ d: "M 1 1 L 2 2", stroke: "#000", strokeWidth: 8, fill: "none" }],
  });
  assert.equal(shape.kind, "shape");
  assert.equal(shape.shape.paths.length, 1);

  const image = createEditorImageLayer("image-1", "photo.jpg", {
    src: "data:image/jpeg;base64,AAAA", x: 100, y: 100, width: 800, height: 600, byteSize: 40960,
  });
  assert.equal(image.kind, "image");
  assert.equal(image.image.byteSize, 40960);
  const maskedImage = addLayerMask([image], "image-1");
  assert.ok(maskedImage[0].mask, "Photo layers accept a non-destructive layer mask");
  const blendedImage = updateEditorLayer(maskedImage, "image-1", { blendMode: "multiply" });
  assert.equal(blendedImage[0].blendMode, "multiply", "Photo layers retain blend mode updates");
  const adjustedImage = updateEditorImageAdjustments([image], "image-1", { brightness: 125, contrast: 80, saturation: 140, blur: 2, temperature: 20, tint: -10, exposure: 15, highlights: -25, shadows: 35, vibrance: 45, vignette: 30, hue: 12, red: 115, green: 90, blue: 105, levelsBlack: 8, levelsWhite: 96, levelsGamma: 1.15, curves: [0, 30, 55, 80, 100], selectiveCyan: 12, selectiveMagenta: -8, selectiveYellow: 20, selectiveBlack: -5, hslHue: 15, hslSaturation: 25, hslLightness: -10, aiEnhanced: true, smartFilter: "cinematic", smartFilterIntensity: 70, backgroundRemoved: true, upscaled: true });
  assert.deepEqual(adjustedImage[0].image, { ...image.image, brightness: 125, contrast: 80, saturation: 140, blur: 2, temperature: 20, tint: -10, exposure: 15, highlights: -25, shadows: 35, vibrance: 45, vignette: 30, hue: 12, red: 115, green: 90, blue: 105, levelsBlack: 8, levelsWhite: 96, levelsGamma: 1.15, curves: [0, 30, 55, 80, 100], selectiveCyan: 12, selectiveMagenta: -8, selectiveYellow: 20, selectiveBlack: -5, hslHue: 15, hslSaturation: 25, hslLightness: -10, aiEnhanced: true, smartFilter: "cinematic", smartFilterIntensity: 70, backgroundRemoved: true, upscaled: true });
  assert.equal(image.image.brightness, undefined, "Photo adjustments are immutable");

  const duplicatedText = duplicateEditorLayer(typed, "text-1", "text-2")[0];
  assert.equal(duplicatedText.text.value, "MH FASHION");
  assert.notStrictEqual(duplicatedText.text, typed[0].text);
});

test("vector shape paths append to one unlocked layer without allocating a new layer", () => {
  const layer = createEditorArtworkLayer("active", "Layer 1");
  const firstPath = { d: "M 10 10 L 90 90", fill: "none", stroke: "#111111" };
  const secondPath = { d: "M 20 20 L 80 80", fill: "none", stroke: "#ff0000" };
  const withFirst = appendEditorShapePaths([layer], layer.id, [firstPath]);
  const withBoth = appendEditorShapePaths(withFirst, layer.id, [secondPath]);

  assert.equal(withBoth.length, 1);
  assert.equal(withBoth[0].id, "active");
  assert.equal(withBoth[0].kind, "shape");
  assert.deepEqual(withBoth[0].shape.paths.map((path) => path.d), [firstPath.d, secondPath.d]);
  assert.notStrictEqual(withBoth[0].shape.paths[0], firstPath, "appended paths are cloned");
  assert.equal(layer.shape, null, "the source layer is unchanged");

  const locked = updateEditorLayer(withBoth, "active", { locked: true });
  assert.strictEqual(appendEditorShapePaths(locked, "active", [firstPath])[0], locked[0], "locked layers reject vector drawing");
});

test("shape style derives from geometry, clamps edits, and updates independently of fill/stroke paths", () => {
  const paths = [
    { d: "M 0 0 L 100 0 L 100 100 Z", fill: "#4c9d16", stroke: "none", strokeWidth: 0 },
  ];
  const seeded = defaultEditorShapeStyle(paths);
  assert.equal(seeded.fill, "#4c9d16");
  assert.equal(seeded.fillEnabled, true);
  assert.equal(seeded.strokeWidth, 0);
  assert.equal(seeded.strokeStyle, "solid");
  assert.equal(seeded.cornerRadius, 0);
  assert.equal(seeded.shadow.enabled, false);
  assert.equal(seeded.glow.enabled, false);

  // A layer without an explicit style resolves to a derived one.
  const layer = createEditorShapeLayer("shape-style", "Box", { paths });
  assert.equal(layer.shape.style, undefined);
  assert.equal(resolveEditorShapeStyle(layer.shape).fill, "#4c9d16");

  // Appending geometry seeds a style so the panel always has real values.
  const base = createEditorArtworkLayer("style-target", "Layer 1");
  const appended = appendEditorShapePaths([base], base.id, paths)[0];
  assert.equal(appended.shape.style.fill, "#4c9d16");

  // Updates merge partials and clamp out-of-range numbers.
  const styled = updateEditorShapeStyle([appended], appended.id, {
    stroke: "#ff0000",
    strokeWidth: 500,
    fillOpacity: -20,
    strokeStyle: "dash",
    cornerRadius: 9999,
    shadow: { ...appended.shape.style.shadow, enabled: true, blur: 999 },
  })[0];
  assert.equal(styled.shape.style.stroke, "#ff0000");
  assert.equal(styled.shape.style.strokeWidth, 120, "stroke width clamps to 120");
  assert.equal(styled.shape.style.fillOpacity, 0, "fill opacity clamps to 0");
  assert.equal(styled.shape.style.strokeStyle, "dash");
  assert.equal(styled.shape.style.cornerRadius, 400, "corner radius clamps to 400");
  assert.equal(styled.shape.style.shadow.enabled, true);
  assert.equal(styled.shape.style.shadow.blur, 60, "shadow blur clamps to 60");
  // The underlying path geometry is untouched.
  assert.equal(styled.shape.paths[0].fill, "#4c9d16");

  // A locked layer rejects style changes.
  const lockedLayer = updateEditorLayer([styled], styled.id, { locked: true })[0];
  assert.strictEqual(updateEditorShapeStyle([lockedLayer], lockedLayer.id, { fill: "#000000" })[0], lockedLayer);

  // normalizeEditorShapeStyle falls back to safe defaults for unknown input.
  const normalized = normalizeEditorShapeStyle({ ...seeded, strokeStyle: "wavy" });
  assert.equal(normalized.strokeStyle, "solid");
});

test("roundEditorShapePath rounds closed polygons and leaves open or zero-radius paths unchanged", () => {
  const square = "M 0 0 L 100 0 L 100 100 L 0 100 Z";
  const rounded = roundEditorShapePath(square, 20);
  assert.notEqual(rounded, square);
  assert.match(rounded, /^M /);
  assert.match(rounded, /Q /);
  assert.match(rounded, /Z$/);
  // Radius 0 is a no-op.
  assert.equal(roundEditorShapePath(square, 0), square);
  // Open paths are not rounded.
  const open = "M 0 0 L 100 0 L 100 100";
  assert.equal(roundEditorShapePath(open, 20), open);
});

test("Pen paths retain editable Bézier nodes, update their SVG data, and duplicate independently", () => {
  const penPath = { closed: false, anchors: [
    { x: 0.1, y: 0.5, handleOut: { x: 0.2, y: -0.1 } },
    { x: 0.9, y: 0.5, handleIn: { x: -0.2, y: -0.1 } },
  ] };
  const layer = createEditorShapeLayer("pen-1", "Pen path 1", {
    paths: [{ d: "M 100 600 C 300 480 700 480 900 600", fill: "none", stroke: "#111111", penPath }],
  });
  const nextPenPath = { ...penPath, anchors: [{ ...penPath.anchors[0], x: 0.12 }, penPath.anchors[1]] };
  const updated = updateEditorPenPath([layer], layer.id, nextPenPath, "M 120 600 C 320 480 700 480 900 600");
  const duplicate = duplicateEditorLayer(updated, layer.id, "pen-copy")[0];

  assert.equal(updated[0].shape.paths[0].d, "M 120 600 C 320 480 700 480 900 600");
  assert.deepEqual(updated[0].shape.paths[0].penPath, nextPenPath);
  assert.notStrictEqual(updated[0].shape.paths[0].penPath, penPath);
  assert.notStrictEqual(updated[0].shape.paths[0].penPath.anchors, penPath.anchors);
  assert.notStrictEqual(duplicate.shape.paths[0].penPath.anchors, updated[0].shape.paths[0].penPath.anchors);
  assert.notStrictEqual(duplicate.shape.paths[0].penPath.anchors[0].handleOut, updated[0].shape.paths[0].penPath.anchors[0].handleOut);
});

test("Pen point updates target the selected vector path while multiple paths stay in one layer", () => {
  const firstPath = { closed: false, anchors: [{ x: 0.1, y: 0.2 }, { x: 0.4, y: 0.5 }] };
  const secondPath = { closed: false, anchors: [{ x: 0.5, y: 0.6 }, { x: 0.9, y: 0.8 }] };
  const layer = createEditorArtworkLayer("pen-layer", "Layer 1");
  const sameLayer = appendEditorShapePaths([layer], layer.id, [
    { d: "M 100 240 L 400 600", fill: "none", stroke: "#111111", penPath: firstPath },
    { d: "M 500 720 L 900 960", fill: "none", stroke: "#111111", penPath: secondPath },
  ]);
  const editedSecondPath = { ...secondPath, anchors: [{ ...secondPath.anchors[0], x: 0.55 }, secondPath.anchors[1]] };
  const updated = updateEditorPenPath(sameLayer, layer.id, editedSecondPath, "M 550 720 L 900 960", 1);

  assert.equal(updated.length, 1);
  assert.equal(updated[0].shape.paths[0].d, "M 100 240 L 400 600");
  assert.deepEqual(updated[0].shape.paths[0].penPath, firstPath);
  assert.equal(updated[0].shape.paths[1].d, "M 550 720 L 900 960");
  assert.deepEqual(updated[0].shape.paths[1].penPath, editedSecondPath);
});

test("groups preserve independent layers while links provide an explicit shared transform membership", () => {
  const layers = [createEditorArtworkLayer("one", "One"), createEditorArtworkLayer("two", "Two")];
  const grouped = groupEditorLayers(layers, ["one", "two"], "group-1");
  assert.equal(grouped[0].groupId, "group-1");
  assert.equal(grouped[1].groupId, "group-1");
  const individuallyUngrouped = ungroupEditorLayers(grouped, ["one"]);
  assert.equal(individuallyUngrouped[0].groupId, null);
  assert.equal(individuallyUngrouped[1].groupId, "group-1");
  const linked = linkEditorLayers(individuallyUngrouped, ["one", "two"], "link-1");
  assert.equal(linked[0].linkId, "link-1");
  assert.equal(linked[1].linkId, "link-1");
  assert.equal(unlinkEditorLayers(linked, ["one"])[0].linkId, null);
  assert.equal(unlinkEditorLayers(linked, ["one"])[1].linkId, "link-1");
});

test("layer rows can be dropped at an arbitrary stack index", () => {
  const layers = ["one", "two", "three"].map((id) => createEditorArtworkLayer(id, id));
  assert.deepEqual(moveEditorLayerToIndex(layers, "three", 0).map((layer) => layer.id), ["three", "one", "two"]);
  assert.deepEqual(moveEditorLayerToIndex(layers, "one", 3).map((layer) => layer.id), ["two", "three", "one"]);
});

test("grouping non-adjacent layers creates a contiguous Photoshop-style folder block", () => {
  const layers = ["one", "two", "three", "four"].map((id) => createEditorArtworkLayer(id, id));
  const grouped = groupEditorLayers(layers, ["one", "three"], "group-1");
  assert.deepEqual(grouped.map((layer) => layer.id), ["one", "three", "two", "four"]);
  assert.deepEqual(grouped.slice(0, 2).map((layer) => layer.groupId), ["group-1", "group-1"]);
});

test("invalid numeric appearance updates do not poison layer opacity", () => {
  const layer = createEditorArtworkLayer("one", "One");
  assert.equal(updateEditorLayer([layer], "one", { opacity: Number.NaN })[0].opacity, 100);
  assert.equal(updateEditorLayer([layer], "one", { fillOpacity: Number.POSITIVE_INFINITY })[0].fillOpacity, 100);
  assert.equal(updateEditorLayer([layer], "one", { opacity: 125, fillOpacity: -5 })[0].opacity, 100);
  assert.equal(updateEditorLayer([layer], "one", { opacity: 125, fillOpacity: -5 })[0].fillOpacity, 0);
});

test("shape builder performs deterministic rectangle merge, subtract, and intersect geometry", () => {
  const layer = createEditorShapeLayer("shape-builder", "Builder", {
    paths: [
      { d: "M 100 100 H 500 V 500 H 100 Z", fill: "#111111" },
      { d: "M 300 300 H 700 V 700 H 300 Z", fill: "#111111" },
    ],
  });
  const merged = applyEditorShapeBuilderOperation([layer], layer.id, "merge")[0];
  assert.equal(merged.shape.paths.length, 1);
  assert.match(merged.shape.paths[0].d, /M 100 100.*M 300 300/);

  const subtracted = applyEditorShapeBuilderOperation([layer], layer.id, "subtract")[0];
  assert.equal(subtracted.shape.builderMode, "subtract");
  assert.equal(subtracted.shape.paths.length, 2);
  assert.match(subtracted.shape.paths[0].d, /M 100 100 H 300/);

  const intersected = applyEditorShapeBuilderOperation([layer], layer.id, "intersect")[0];
  assert.equal(intersected.shape.builderMode, "intersect");
  assert.equal(intersected.shape.paths[0].d, "M 300 300 H 500 V 500 H 300 Z");
});

test("shape preset geometry covers reversed drags and returns renderable vector paths", () => {
  const rectangle = createEditorShapePaths("rectangle", { x: 400, y: 500 }, { x: 100, y: 200 }, "#d4ff3f");
  assert.equal(rectangle[0].d, "M 100 200 L 400 200 L 400 500 L 100 500 Z");
  assert.equal(rectangle[0].fill, "#d4ff3f");

  for (const preset of EDITOR_SHAPE_PRESETS) {
    const paths = createEditorShapePaths(preset, { x: 100, y: 120 }, { x: 580, y: 720 }, "#202124");
    assert.ok(paths.length > 0, `${preset} should return at least one path`);
    for (const path of paths) {
      assert.match(path.d, /^M -?[\d.]+ -?[\d.]+/);
      assert.ok(path.fill || path.stroke, `${preset} should render with a fill or stroke`);
      assert.ok(!/NaN|Infinity/.test(path.d), `${preset} should use finite coordinates`);
    }
  }
  assert.equal(createEditorShapePaths("arrow", { x: 10, y: 10 }, { x: 100, y: 100 }, "#000").length, 3);
  assert.equal(createEditorShapePaths("line", { x: 10, y: 10 }, { x: 100, y: 100 }, "#000")[0].fill, "none");
  assert.ok(createEditorShapePaths("ellipse", { x: 10, y: 10 }, { x: 100, y: 100 }, "#000")[0].d.split("L ").length > 40);
});

test("text effects stack immutably and remain independent when a text layer is duplicated", () => {
  const initial = createEditorTextLayer("text-1", "Text", {
    value: "MH", x: 500, y: 600, fontSize: 110, color: "#202124",
  });
  const effects = [
    { id: "fx-1", kind: "shadow", color: "#111111", offsetX: 8, offsetY: 12 },
    { id: "fx-2", kind: "glow", color: "#d4ff3f", blur: 9 },
  ];
  const updated = updateEditorLayerTextStyle([initial], initial.id, { effects });
  const duplicate = duplicateEditorLayer(updated, initial.id, "text-2")[0];
  assert.deepEqual(updated[0].text.effects, effects);
  assert.equal(initial.text.effects, undefined, "Effect updates do not mutate the source text");
  assert.notStrictEqual(updated[0].text.effects, effects);
  assert.notStrictEqual(duplicate.text.effects, updated[0].text.effects);
  assert.notStrictEqual(duplicate.text.effects[0], updated[0].text.effects[0]);
});

test("Free Transform preserves aspect ratio by default and toggles independent corner scaling with Shift", () => {
  const bounds = { x: 0, y: 0, width: 200, height: 100 };
  const proportional = getFreeTransformResizeFactors({
    bounds, handle: "bottom-right", rotation: 0,
    pointerStart: { x: 200, y: 100 }, pointerCurrent: { x: 400, y: 100 },
    centered: false, freeScale: false,
  });
  assert.equal(proportional.x, proportional.y);
  assert.ok(proportional.x > 1);

  const distorted = getFreeTransformResizeFactors({
    bounds, handle: "bottom-right", rotation: 0,
    pointerStart: { x: 200, y: 100 }, pointerCurrent: { x: 300, y: 100 },
    centered: false, freeScale: true,
  });
  assert.equal(distorted.x, 1.5);
  assert.equal(distorted.y, 1);
});

test("Free Transform Alt/Option scales from center and rotated edge handles follow the object's local axes", () => {
  const bounds = { x: 0, y: 0, width: 200, height: 100 };
  const centeredAnchor = getFreeTransformResizeAnchor({ bounds, handle: "bottom-right", rotation: 0, centered: true });
  assert.deepEqual(centeredAnchor, { x: 100, y: 50 });

  const start = rotateTransformPoint({ x: 200, y: 50 }, { x: 100, y: 50 }, 90);
  const current = { x: start.x, y: start.y + 50 };
  const sideScale = getFreeTransformResizeFactors({
    bounds, handle: "middle-right", rotation: 90,
    pointerStart: start, pointerCurrent: current,
    centered: false, freeScale: false,
  });
  assert.equal(sideScale.x, 1.25);
  assert.equal(sideScale.y, 1);
});

test("Free Transform snaps rotation to 15-degree steps only while Shift is held", () => {
  assert.equal(snapEditorRotationDelta(13, true), 15);
  assert.equal(snapEditorRotationDelta(7, true), 0);
  assert.equal(snapEditorRotationDelta(13, false), 13);
});

test("brush dabs resample a stroke to the brush spacing and smoothing", () => {
  const stroke = {
    points: [{ x: 0.1, y: 0.5 }, { x: 0.9, y: 0.5 }],
    width: 100,
    spacing: 10,
    smoothing: 1,
    flow: 100,
  };
  const wide = brushDabPoints(stroke);
  assert.ok(wide.length > 2, "a spaced brush lays down several dabs along the segment");
  assert.deepEqual({ x: wide[0].x, y: wide[0].y }, { x: 0.1, y: 0.5 }, "the run starts at the first pointer sample");
  assert.deepEqual(
    { x: wide[wide.length - 1].x, y: wide[wide.length - 1].y },
    { x: 0.9, y: 0.5 },
    "the run ends at the last pointer sample",
  );
  const step = (100 * 10) / 100;
  for (let index = 1; index < wide.length; index += 1) {
    const gap = Math.hypot((wide[index].x - wide[index - 1].x) * 1000, (wide[index].y - wide[index - 1].y) * 1200);
    assert.ok(gap <= step + 1e-6, `dab ${index} stays within one spacing step`);
  }
  const denser = brushDabPoints({ ...stroke, spacing: 2 });
  assert.ok(denser.length > wide.length, "a smaller spacing value deposits more dabs");
  const smoothed = brushDabPoints({ ...stroke, smoothing: 5 });
  assert.deepEqual(smoothed, wide, "smoothing keeps the same dab run on a straight path");
});

test("brush dabs apply deterministic size and opacity jitter", () => {
  const stroke = {
    points: [{ x: 0.1, y: 0.5 }, { x: 0.9, y: 0.5 }],
    width: 200,
    spacing: 5,
    smoothing: 3,
    flow: 80,
    sizeJitter: 60,
    opacityJitter: 50,
    jitterMinimum: 25,
  };
  const first = brushDabPoints(stroke);
  const second = brushDabPoints(stroke);
  assert.deepEqual(first, second, "jitter is hashed from the dab index so a re-render is stable");
  assert.ok(first.some((dab) => dab.scale < 1), "size jitter varies at least one dab below the full nib");
  assert.ok(first.some((dab) => dab.alpha < 0.8), "opacity jitter varies at least one dab below the full flow");
  const floor = 0.25;
  assert.ok(first.every((dab) => dab.scale >= floor - 1e-9), "size jitter never falls under the jitter floor");
  assert.ok(first.every((dab) => dab.alpha >= 0 && dab.alpha <= 1), "dab opacity always stays a valid fraction");
});

test("brush dab blur radius scales with softness and nib size", () => {
  assert.equal(brushDabBlurRadius({ width: 100, softness: 0 }), 0, "a hard nib adds no blur");
  assert.ok(brushDabBlurRadius({ width: 100, softness: 100 }) > brushDabBlurRadius({ width: 100, softness: 40 }), "more softness widens the falloff");
  assert.ok(brushDabBlurRadius({ width: 200, softness: 100 }) > brushDabBlurRadius({ width: 100, softness: 100 }), "a larger nib widens the falloff");
});

test("distanceToSegment clamps to the segment endpoints", () => {
  assert.equal(distanceToSegment(5, 0, 0, 0, 10, 0), 0, "a point on the segment has zero distance");
  assert.equal(distanceToSegment(5, 4, 0, 0, 10, 0), 4, "perpendicular distance is measured to the line");
  assert.equal(distanceToSegment(-5, 0, 0, 0, 10, 0), 5, "a point past the start clamps to the start endpoint");
  assert.equal(distanceToSegment(15, 0, 0, 0, 10, 0), 5, "a point past the end clamps to the end endpoint");
});

test("brush smoothing stabilizes interior samples and preserves the endpoints", () => {
  const points = [{ x: 0, y: 0 }, { x: 0.25, y: 0.5 }, { x: 0.5, y: 0 }, { x: 0.75, y: 0.5 }, { x: 1, y: 0 }];
  assert.deepEqual(smoothBrushPoints(points, 1), points, "smoothing 1 leaves the path untouched");
  const smoothed = smoothBrushPoints(points, 5);
  assert.deepEqual(smoothed[0], points[0], "the first sample stays under the pointer");
  assert.deepEqual(smoothed[smoothed.length - 1], points[points.length - 1], "the last sample stays under the pointer");
  assert.ok(smoothed[2].y < points[2].y + 0.5, "interior samples are pulled toward the running average");
});

test("brush dabs stay under the render cap for a long dense stroke", () => {
  const points = [];
  for (let i = 0; i <= 200; i += 1) points.push({ x: i / 200, y: 0.5 });
  const dabs = brushDabPoints({ points, width: 400, spacing: 1, flow: 100 });
  assert.ok(dabs.length <= 601, "the dab run is capped so a long dense drag stays responsive");
  assert.deepEqual({ x: dabs[0].x, y: dabs[0].y }, { x: 0, y: 0.5 }, "the capped run still starts at the first sample");
  assert.deepEqual({ x: dabs[dabs.length - 1].x, y: dabs[dabs.length - 1].y }, { x: 1, y: 0.5 }, "the capped run still ends at the last sample");
});

test("segmentDistancePx measures clearance and reports crossing segments as touching", () => {
  assert.equal(segmentDistancePx(0, 0, 10, 0, 5, -5, 5, 5), 0, "crossing segments report zero distance");
  assert.equal(segmentDistancePx(0, 0, 10, 0, 0, 3, 10, 3), 3, "parallel segments report their perpendicular clearance");
  assert.equal(segmentDistancePx(0, 0, 10, 0, 20, 0, 30, 0), 10, "collinear segments report the endpoint gap");
  assert.equal(segmentDistancePx(0, 0, 10, 0, 5, 4, 5, 8), 4, "a segment starting above reports the nearest endpoint");
});
