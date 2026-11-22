const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function loadCanvasSpec() {
  const file = path.join(__dirname, "../apps/web/src/lib/editor-canvas-spec.ts");
  const source = readFileSync(file, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: file,
  }).outputText;
  const module = { exports: {} };
  new Function("module", "exports", compiled)(module, module.exports);
  return module.exports;
}

function loadCanvasModule() {
  return loadCanvasSpec();
}

test("print canvas is a blank fixed transparent 4500×5400 PNG target at 300 DPI", () => {
  const spec = loadCanvasModule().PRINT_CANVAS_SPEC;
  assert.deepEqual(spec, {
    widthPx: 4500,
    heightPx: 5400,
    resolutionDpi: 300,
    background: "transparent",
    exportFormat: "png",
    fixedSize: true,
    startsBlank: true,
  });
  assert.equal(Object.isFrozen(spec), true);
});

test("the on-screen canvas keeps the print area's shape at a size a phone can allocate", () => {
  const { PRINT_CANVAS_SPEC, PRINT_CANVAS_BACKING_SPEC } = loadCanvasModule();
  assert.equal(
    PRINT_CANVAS_BACKING_SPEC.widthPx / PRINT_CANVAS_BACKING_SPEC.heightPx,
    PRINT_CANVAS_SPEC.widthPx / PRINT_CANVAS_SPEC.heightPx,
    "a different ratio would squash the print area on screen",
  );
  const area = PRINT_CANVAS_BACKING_SPEC.widthPx * PRINT_CANVAS_BACKING_SPEC.heightPx;
  assert.ok(area <= 16_777_216, `the backing store must fit the 16.7 M px iOS limit, got ${area}`);
  assert.ok(area < PRINT_CANVAS_SPEC.widthPx * PRINT_CANVAS_SPEC.heightPx, "and stay far below the print size");
});
