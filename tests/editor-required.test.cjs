const assert = require("node:assert/strict");
const test = require("node:test");

const { loadModule } = require("./helpers/load-ts-module.cjs");

const required = loadModule("apps/web/src/lib/editor-required.ts");
const { EDITOR_REQUIRED_SELECTIONS, missingEditorSelections, editorSelectionNotice, editorSelectionLabel } = required;


const complete = {
  product: "T-Shirt", printMethod: "DTF", fabricType: "Combed Cotton", knitStructure: "Single Jersey",
  cuttings: "Crew Neck", gsm: "180", color: "Black", size: "XL",
};

test("the required set is the eight header boxes, in bar order", () => {
  assert.deepEqual(EDITOR_REQUIRED_SELECTIONS.map((selection) => selection.key), [
    "product", "printMethod", "fabricType", "knitStructure", "cuttings", "gsm", "color", "size",
  ]);
  assert.deepEqual(EDITOR_REQUIRED_SELECTIONS.map((selection) => selection.en), [
    "Product", "Print Method", "Fabric Type", "Knit Structure", "MH Cuttings", "GSM", "Color", "Size",
  ]);
});

test("a full set has nothing missing", () => {
  assert.deepEqual(missingEditorSelections(complete), []);
  assert.equal(editorSelectionNotice([]), "");
});

test("an empty colour is the only thing missing", () => {
  assert.deepEqual(missingEditorSelections({ ...complete, color: "" }), ["color"]);
  assert.equal(editorSelectionNotice(["color"]), "Choose Color before buying");
});

test("blank, whitespace, null and a missing key all count as not chosen", () => {
  assert.deepEqual(missingEditorSelections({ ...complete, color: "   " }), ["color"]);
  assert.deepEqual(missingEditorSelections({ ...complete, color: null }), ["color"]);
  assert.deepEqual(missingEditorSelections({ ...complete, color: undefined }), ["color"]);
  const { size, ...withoutSize } = complete;
  assert.deepEqual(missingEditorSelections(withoutSize), ["size"]);
  assert.equal(editorSelectionNotice(["size"]), "Choose Size before buying");
});

test("several missing boxes read in header order, not the order they were passed", () => {
  assert.deepEqual(missingEditorSelections({ ...complete, size: "", color: "" }), ["color", "size"]);
  assert.equal(editorSelectionNotice(["color", "size"]), "Choose Color and Size before buying");
  // GSM sits before Color in the bar, so a caller's own order does not leak into the sentence.
  assert.equal(editorSelectionNotice(["size", "gsm", "color"]), "Choose GSM, Color and Size before buying");
  assert.equal(
    editorSelectionNotice(["product", "printMethod", "fabricType", "knitStructure", "cuttings", "gsm", "color", "size"]),
    "Choose Product, Print Method, Fabric Type, Knit Structure, MH Cuttings, GSM, Color and Size before buying",
  );
});

test("Myanmar wording names the same boxes", () => {
  assert.equal(editorSelectionLabel("color", "my"), "အရောင်");
  assert.equal(editorSelectionNotice(["color"], "my"), "အရောင် ကို ရွေးပါ");
  assert.equal(editorSelectionNotice(["color", "size"], "my"), "အရောင် နှင့် အရွယ်အစား ကို ရွေးပါ");
  assert.equal(editorSelectionNotice(["color"], "en"), "Choose Color before buying");
  assert.equal(editorSelectionLabel("printMethod", "en"), "Print Method");
});
