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
  return module.exports.PRINT_CANVAS_SPEC;
}

test("print canvas is a blank fixed transparent 4500×5400 PNG target at 300 DPI", () => {
  const spec = loadCanvasSpec();
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
