const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { loadModule } = require("./helpers/load-ts-module.cjs");

const chain = loadModule("apps/web/src/lib/editor-attributes.ts");
const admin = loadModule("apps/web/src/lib/admin-demo-data.ts");
const price = loadModule("apps/web/src/lib/editor-price.ts");

test("the chain offers the §4.1 attribute names", () => {
  assert.deepEqual([...chain.PRINT_METHOD_OPTIONS], ["DTF", "Sublimation"]);
  assert.deepEqual([...chain.FABRIC_TYPE_OPTIONS], ["Combed Cotton", "Compact Combed Cotton", "Polyester"]);
  assert.deepEqual([...chain.KNIT_STRUCTURE_OPTIONS], ["Single Jersey", "Interlock", "Air Layer"]);
  assert.deepEqual([...chain.MH_CUTTINGS_OPTIONS], ["Crew Neck", "V-Neck", "Polo Neck", "Round Neck"]);
  assert.deepEqual(chain.DEFAULT_EDITOR_ATTRIBUTES, {
    printMethod: "DTF",
    fabricType: "Combed Cotton",
    knitStructure: "Single Jersey",
    cuttings: "Crew Neck",
  });
});

test("sublimation narrows the fabric list to polyester, and the knit follows the fabric", () => {
  assert.deepEqual(chain.fabricTypeOptions("DTF"), ["Combed Cotton", "Compact Combed Cotton", "Polyester"]);
  assert.deepEqual(chain.fabricTypeOptions("Sublimation"), ["Polyester"]);
  assert.deepEqual(chain.knitStructureOptions("Combed Cotton"), ["Single Jersey", "Interlock"]);
  assert.deepEqual(chain.knitStructureOptions("Polyester"), ["Interlock", "Air Layer"]);
});

test("a value the cascade drops falls back to the first option still offered", () => {
  const sublimated = chain.narrowEditorAttributes({
    printMethod: "Sublimation",
    fabricType: "Combed Cotton",
    knitStructure: "Single Jersey",
    cuttings: "Crew Neck",
  });
  assert.equal(sublimated.fabricType, "Polyester", "cotton cannot be sublimated");
  assert.equal(sublimated.knitStructure, "Interlock", "single jersey is not a polyester knit");

  const backToDtf = chain.narrowEditorAttributes({ ...sublimated, printMethod: "DTF" });
  assert.equal(backToDtf.fabricType, "Polyester", "a still-valid fabric is kept");
  assert.equal(backToDtf.knitStructure, "Interlock", "a still-valid knit is kept");

  const strayCutting = chain.narrowEditorAttributes({ ...chain.DEFAULT_EDITOR_ATTRIBUTES, cuttings: "Kimono" });
  assert.equal(strayCutting.cuttings, "Crew Neck");
});

test("narrowing never changes an already valid selection", () => {
  assert.deepEqual(chain.narrowEditorAttributes(chain.DEFAULT_EDITOR_ATTRIBUTES), chain.DEFAULT_EDITOR_ATTRIBUTES);
});

test("posts use the §4.1 attribute names and the same option values", () => {
  const labels = admin.TSHIRT_POST_ATTRIBUTES.map((attribute) => attribute.label);
  for (const label of ["Print Method", "Fabric Type", "Knit Structure", "MH Cutings".replace("Cutings", "Cuttings"), "Color", "Size"]) {
    assert.ok(labels.includes(label), `posts are missing the ${label} attribute`);
  }
  assert.ok(!labels.includes("Material"), "Material was renamed to Fabric Type");
  assert.ok(!labels.includes("Cutting"), "Cutting was renamed to MH Cuttings");
  assert.ok(!labels.includes("Print"), "Print was renamed to Print Method");

  const fabric = admin.TSHIRT_POST_ATTRIBUTES.find((attribute) => attribute.key === "material");
  assert.equal(fabric.label, "Fabric Type");
  assert.deepEqual(fabric.options, ["Combed Cotton", "Compact Combed Cotton", "Polyester"]);
  const print = admin.TSHIRT_POST_ATTRIBUTES.find((attribute) => attribute.key === "print");
  assert.equal(print.label, "Print Method");
  assert.deepEqual(print.options, ["DTF", "Sublimation"]);
  const knit = admin.TSHIRT_POST_ATTRIBUTES.find((attribute) => attribute.key === "knit");
  assert.equal(knit.label, "Knit Structure");
  assert.deepEqual(knit.options, ["Single Jersey", "Interlock", "Air Layer"]);
});

test("a post saved with the old option words is mapped onto the new ones", () => {
  const saved = {
    id: "post-old",
    title: "Old tee",
    description: "",
    svg: null,
    attributes: [
      { key: "size", label: "Size", options: ["M", "XL"] },
      { key: "material", label: "Material", options: ["Cotton", "Premium Cotton", "Blend"] },
      { key: "cutting", label: "Cutting", options: ["Standard", "Raw Edge"] },
      { key: "print", label: "Print", options: ["Screen Print", "Sublimation"] },
    ],
    prices: [
      { id: "row-1", options: { size: "M", material: "Cotton", cutting: "Standard", print: "Screen Print" }, priceKs: 21000 },
      { id: "row-2", options: { size: "XL", material: "Premium Cotton", cutting: "Raw Edge", print: "Sublimation" }, priceKs: 29000 },
    ],
    status: "Published",
    createdAt: "2026-11-01T00:00:00.000Z",
    publishedAt: "2026-11-01T00:00:00.000Z",
  };
  const mapped = admin.normalizeTshirtPost(saved);
  assert.deepEqual(mapped.attributes.map((attribute) => [attribute.label, attribute.options]), [
    ["Size", ["M", "XL"]],
    ["Fabric Type", ["Combed Cotton", "Compact Combed Cotton"]],
    ["MH Cuttings", ["Crew Neck", "V-Neck"]],
    ["Print Method", ["DTF", "Sublimation"]],
  ]);
  assert.deepEqual(mapped.prices.map((row) => row.options), [
    { size: "M", material: "Combed Cotton", cutting: "Crew Neck", print: "DTF" },
    { size: "XL", material: "Compact Combed Cotton", cutting: "V-Neck", print: "Sublimation" },
  ]);
  assert.equal(admin.normalizeTshirtPost(mapped), mapped, "an already-normalised post keeps its identity");
});

test("the seeded posts already speak the new vocabulary", () => {
  const data = admin.createAdminDemoData(Date.UTC(2026, 10, 21));
  for (const post of data.tshirtPosts) {
    for (const attribute of post.attributes) {
      const known = admin.TSHIRT_POST_ATTRIBUTES.find((entry) => entry.key === attribute.key);
      assert.equal(attribute.label, known.label, `${post.id} carries a stale label`);
      for (const option of attribute.options) {
        assert.ok(known.options.includes(option), `${post.id} offers ${option}, which the chain does not`);
      }
    }
    for (const row of post.prices) {
      for (const [key, value] of Object.entries(row.options)) {
        const known = admin.TSHIRT_POST_ATTRIBUTES.find((entry) => entry.key === key);
        assert.ok(known.options.includes(value), `${post.id} prices ${key}: ${value}, which the chain does not offer`);
      }
    }
  }
});

test("the Google Sheet price import is gone", () => {
  const root = path.join(__dirname, "..", "apps/web/src");
  assert.equal(require("node:fs").existsSync(path.join(root, "lib/sheet-prices.ts")), false);
  assert.equal(require("node:fs").existsSync(path.join(root, "app/api/admin/tshirt-prices/route.ts")), false);
  const posts = readFileSync(path.join(root, "components/admin/AdminPosts.tsx"), "utf8");
  assert.doesNotMatch(posts, /Google Sheet/i);
  assert.doesNotMatch(posts, /tshirt-prices/);
  const data = readFileSync(path.join(root, "lib/admin-demo-data.ts"), "utf8");
  assert.doesNotMatch(data, /SheetPriceRow/);
  assert.doesNotMatch(data, /mergeSheetPriceRows/);
});

const seedOptions = (key) => admin.TSHIRT_POST_ATTRIBUTES.find((attribute) => attribute.key === key)?.options ?? [];

test("the admin price book and the editor header read one vocabulary", () => {
  assert.deepEqual(seedOptions("size"), [...chain.SIZE_OPTIONS]);
  assert.deepEqual(seedOptions("gsm"), [...chain.GSM_OPTIONS]);
  assert.deepEqual(seedOptions("color"), [...chain.COLOR_LABELS]);
  assert.deepEqual(seedOptions("material"), [...chain.FABRIC_TYPE_OPTIONS]);
  assert.deepEqual(seedOptions("knit"), [...chain.KNIT_STRUCTURE_OPTIONS]);
  assert.deepEqual(seedOptions("cutting"), [...chain.MH_CUTTINGS_OPTIONS]);
  assert.deepEqual(seedOptions("print"), [...chain.PRINT_METHOD_OPTIONS]);
});

test("every colour the header offers has a label and a real swatch", () => {
  for (const color of chain.COLOR_OPTIONS) {
    assert.match(color.value, /^[a-z]+$/, `${color.label} stores a lowercase value`);
    assert.match(color.hex, /^#[0-9a-f]{6}$/, `${color.label} has a hex swatch`);
  }
  assert.equal(new Set(chain.COLOR_OPTIONS.map((color) => color.value)).size, chain.COLOR_OPTIONS.length);
  assert.equal(chain.COLOR_OPTIONS[0].value, "white", "the editor opens on White");
  assert.deepEqual(chain.COLOR_LABELS, chain.COLOR_OPTIONS.map((color) => color.label));
});

test("the price table prices exactly the sizes and GSM values on offer", () => {
  assert.deepEqual(Object.keys(price.EDITOR_SIZE_PRICE_KS), [...chain.SIZE_OPTIONS], "no price for a size the header cannot choose, none missing");
  assert.deepEqual(Object.keys(price.EDITOR_GSM_PRICE_KS), [...chain.GSM_OPTIONS]);
});

test("the default selection is valid under the cascade and priced", () => {
  const defaults = chain.DEFAULT_EDITOR_ATTRIBUTES;
  assert.deepEqual(chain.narrowEditorAttributes(defaults), defaults, "the defaults survive the cascade untouched");
  const gsm = chain.GSM_OPTIONS[0];
  const priceKs = price.calculateEditorPriceKs({ product: "T-Shirt", gsm, size: chain.SIZE_OPTIONS[0] });
  assert.equal(priceKs, price.EDITOR_BASE_PRICE_KS["T-Shirt"], "the cheapest size and GSM cost the base price");
});
