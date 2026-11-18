const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const sourcePath = path.join(__dirname, "../apps/web/src/lib/editor-price.ts");
const compiled = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  fileName: sourcePath,
}).outputText;
const priceModule = { exports: {} };
new Function("module", "exports", compiled)(priceModule, priceModule.exports);
const { EDITOR_BASE_PRICE_KS, calculateEditorPriceKs } = priceModule.exports;

test("editor price stays hidden until the product's required selections exist", () => {
  assert.equal(calculateEditorPriceKs({ product: "T-Shirt", gsm: "160 GSM" }), null, "GSM without a size has no price yet");
  assert.equal(calculateEditorPriceKs({ product: "T-Shirt", size: "XL" }), null, "Size without a GSM has no price yet");
  assert.equal(calculateEditorPriceKs({ product: "T-Shirt" }), null, "No selections means no price yet");
});

test("editor price adds the selected GSM and Size deltas to the product base", () => {
  assert.equal(
    calculateEditorPriceKs({ product: "T-Shirt", gsm: "160 GSM", size: "XL" }),
    EDITOR_BASE_PRICE_KS["T-Shirt"] + 3000,
  );
  assert.equal(
    calculateEditorPriceKs({ product: "T-Shirt", gsm: "240 GSM", size: "3XL" }),
    EDITOR_BASE_PRICE_KS["T-Shirt"] + 3500 + 5000,
  );
  assert.equal(
    calculateEditorPriceKs({ product: "T-Shirt", gsm: "200 GSM", size: "M" }),
    EDITOR_BASE_PRICE_KS["T-Shirt"] + 2000 + 1000,
  );
});

test("editor price for Phone needs no GSM or Size", () => {
  assert.equal(calculateEditorPriceKs({ product: "Phone" }), EDITOR_BASE_PRICE_KS.Phone);
  assert.equal(calculateEditorPriceKs({ product: "Phone", gsm: "160 GSM", size: "XL" }), EDITOR_BASE_PRICE_KS.Phone);
});

test("editor price ignores unknown GSM or Size values", () => {
  assert.equal(calculateEditorPriceKs({ product: "T-Shirt", gsm: "999 GSM", size: "XL" }), null);
  assert.equal(calculateEditorPriceKs({ product: "T-Shirt", gsm: "160 GSM", size: "4XL" }), null);
});
