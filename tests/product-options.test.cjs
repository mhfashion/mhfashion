// The product page offers the boxes the admin ticked for that post. These push the pure rules, plus the
// wiring that keeps the page from carrying its own hardcoded lists again.
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const ROOT = path.join(__dirname, "..");

function loadModule(relativePath, cache = new Map()) {
  const sourcePath = path.join(ROOT, relativePath);
  if (cache.has(sourcePath)) return cache.get(sourcePath);
  const compiled = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: sourcePath,
  }).outputText;
  const loaded = { exports: {} };
  cache.set(sourcePath, loaded.exports);
  const localRequire = (specifier) => {
    if (!specifier.startsWith(".")) throw new Error(`unexpected import: ${specifier}`);
    return loadModule(path.relative(ROOT, path.join(path.dirname(sourcePath), `${specifier}.ts`)), cache);
  };
  new Function("module", "exports", "require", compiled)(loaded, loaded.exports, localRequire);
  return loaded.exports;
}

const options = loadModule("apps/web/src/lib/product-options.ts");
const cart = loadModule("apps/web/src/lib/cart-items.ts");
const products = readFileSync(path.join(ROOT, "apps/web/src/lib/products.ts"), "utf8");
const detail = readFileSync(path.join(ROOT, "apps/web/src/components/ProductDetailClient.tsx"), "utf8");
const page = readFileSync(path.join(ROOT, "apps/web/src/app/products/[slug]/page.tsx"), "utf8");

test("an attribute name becomes the key the cart already knows", () => {
  assert.equal(options.optionKeyForAttributeName("Size"), "size");
  assert.equal(options.optionKeyForAttributeName("Color"), "color");
  assert.equal(options.optionKeyForAttributeName("Colour"), "color");
  assert.equal(options.optionKeyForAttributeName("Fabric Type"), "material");
  assert.equal(options.optionKeyForAttributeName("Material"), "material");
  assert.equal(options.optionKeyForAttributeName("Fit Type"), "fit");
  assert.equal(options.optionKeyForAttributeName("Sleeve"), "sleeve");
  assert.equal(options.optionKeyForAttributeName("GSM"), "gsm");
  assert.equal(options.optionKeyForAttributeName("Print Method"), "print");
  assert.equal(options.optionKeyForAttributeName("Knit Structure"), "knit");
  assert.equal(options.optionKeyForAttributeName("MH Cuttings"), "cutting");
  assert.equal(options.optionKeyForAttributeName("Something New"), "something-new");
});

test("blank options and empty groups never reach the page", () => {
  const normalized = options.normalizeProductOptionGroups([
    { key: "Size", label: "Size", options: ["S", " ", "S", "M "] },
    { key: "color", label: "Color", options: [] },
    { key: "", label: "Broken", options: ["x"] },
    { key: "size", label: "Size again", options: ["L"] },
  ]);
  assert.deepEqual(normalized, [{ key: "size", label: "Size", options: ["S", "M"] }]);
});

test("the admin's ticked attributes are the page's boxes, and a missing one is simply absent", () => {
  const configured = options.resolveProductOptionGroups([
    { key: "size", label: "Size", options: ["S", "M", "L"] },
    { key: "color", label: "Color", options: ["Black"] },
    { key: "print", label: "Print Method", options: ["DTF", "Sublimation"] },
  ]);
  assert.deepEqual(configured.map((group) => group.key), ["size", "color", "print"]);
  // No material, no fit, no sleeve, no GSM: this drop does not sell them.
  assert.equal(configured.some((group) => group.key === "material"), false);
});

test("a product with no attribute rows falls back to the shop defaults, a ready-made one to size only", () => {
  assert.deepEqual(options.resolveProductOptionGroups(null).map((group) => group.key), ["size", "color", "material", "fit", "sleeve", "gsm"]);
  assert.deepEqual(options.resolveProductOptionGroups([], { readyMade: true }).map((group) => group.key), ["size"]);
  assert.deepEqual(options.resolveProductOptionGroups(null).map((group) => group.key).includes("size"), true);
});

test("a one-option box opens already chosen, and only real choices are required", () => {
  const groups = [
    { key: "size", label: "Size", options: ["S", "M"] },
    { key: "color", label: "Color", options: ["Black"] },
    { key: "print", label: "Print Method", options: ["DTF", "Sublimation"] },
  ];
  const initial = options.defaultOptionSelection(groups);
  assert.deepEqual(initial, { color: "Black" }, "the single colour comes preselected");
  assert.deepEqual(options.missingOptionKeys(groups, initial), ["size", "print"]);
  assert.deepEqual(options.missingOptionKeys(groups, { ...initial, size: "M", print: "DTF" }), []);
  // A value the box does not offer is not a selection.
  assert.deepEqual(options.missingOptionKeys(groups, { size: "XXL", color: "Black", print: "DTF" }), ["size"]);
  assert.equal(options.optionSelectionLabel(groups, { size: "M", color: "Black", print: "DTF" }), "Size: M · Color: Black · Print Method: DTF");
});

test("the product page reads the attributes instead of carrying its own lists", () => {
  assert.match(products, /export async function getProductOptionGroups/);
  assert.match(products, /from\("product_attribute_types"\)/);
  assert.match(products, /\.from\("attribute_values"\)/);
  assert.match(page, /getProductOptionGroups\(product\.id\)/);
  assert.match(page, /optionGroups=\{optionGroups\}/);
  assert.match(detail, /resolveProductOptionGroups\(catalogueGroups, \{ readyMade: !designEditable \}\)/);
  assert.match(detail, /\{optionGroups\.map\(\(group\) => \(/);
  for (const gone of ["const materials = ", "const gsmOptions = ", "const sizes = ", "const colors = ["]) {
    assert.equal(detail.includes(gone), false, `the hardcoded list came back: ${gone.trim()}`);
  }
});

test("a ready-made piece shows Buy Now and Add to Cart only", () => {
  const actions = detail.slice(detail.indexOf("data-buy-now") - 400, detail.indexOf("data-variant-warning"));
  assert.match(actions, /data-buy-now/);
  assert.match(actions, /data-add-to-cart/);
  assert.match(actions, /designEditable \? <a href=\{`\/create\?product=/);
  assert.equal(actions.includes("data-ready-made"), false, "the ready-made note is back in the buying box");
  // The note lives in the Product Details tab instead.
  assert.match(detail, /designEditable \? null : <p data-ready-made/);
});

test("further attributes travel with the cart line", () => {
  const variant = cart.normalizeCartVariant({ size: "M", color: "Black", extras: { "Print Method": "DTF", "Knit Structure": " " } });
  assert.deepEqual(variant.extras, { "Print Method": "DTF" });
  assert.equal(cart.variantLabel(variant), "M · Black · DTF");
  assert.notEqual(cart.cartItemKey("p1", variant), cart.cartItemKey("p1", { size: "M", color: "Black", extras: { "Print Method": "Sublimation" } }));
  assert.equal(cart.variantLabel({ size: "M" }), "M", "a variant without extras reads as before");
});
