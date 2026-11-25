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

const editing = loadModule("apps/web/src/lib/product-editing.ts");
const detail = readFileSync(path.join(ROOT, "apps/web/src/components/ProductDetailClient.tsx"), "utf8");
const nyein = readFileSync(path.join(ROOT, "apps/web/src/app/nyein/page.tsx"), "utf8");
const products = readFileSync(path.join(ROOT, "apps/web/src/lib/products.ts"), "utf8");

test("a ready-made product is not design-editable", () => {
  assert.equal(editing.isDesignEditable({ isCustomizable: "none" }), false);
  assert.equal(editing.isDesignEditable({ isCustomizable: "full" }), true);
  assert.equal(editing.isDesignEditable({ isCustomizable: "partial" }), true);
  assert.equal(editing.isDesignEditable({}), true, "an unknown flag keeps the editor");
  assert.equal(editing.isDesignEditable({ subBrand: "Nyein" }), false, "a Nyein piece is ready-made even without the flag");
});

test("ready-made products stay buyable: no editor link, no draft artwork", () => {
  assert.match(detail, /const designEditable = isDesignEditable\(product\)/);
  assert.match(detail, /draft: designEditable \? readDesignDraft\(\) : null/);
  assert.match(detail, /designEditable \? <a href=\{`\/create\?product=/);
  assert.match(detail, /data-ready-made/);
  // Both buying controls survive the change.
  assert.match(detail, /data-buy-now/);
  assert.match(detail, /data-add-to-cart/);
});

test("the Nyein page lists the Nyein brand from the catalogue", () => {
  assert.match(nyein, /getProductsBySubBrand\(NYEIN_BRAND\)/);
  assert.match(nyein, /ProductStrip/);
  assert.match(nyein, /<ProductStrip products=\{popular\}/, "the shelf is the shop's own");
  assert.equal(/placeholder|ready for the layout and content direction/i.test(nyein), false);
  assert.match(products, /export async function getProductsBySubBrand/);
  assert.match(products, /\.ilike\("sub_brand", subBrand\)/);
});

test("the product queries carry the brand and the customization flag", () => {
  for (const select of [
    "id, name, slug, image_url, is_new, product_type, sub_brand, is_customizable",
  ]) {
    assert.ok(products.includes(select), `a product query is missing columns: ${select}`);
  }
  assert.match(products, /subBrand: row\.sub_brand \?\? undefined/);
});

test("the R2 contract is documented where the owner can follow it", () => {
  const doc = readFileSync(path.join(ROOT, "Doc/R2-STORAGE.md"), "utf8");
  for (const marker of [
    "mh-fashion-assets",
    "NEXT_PUBLIC_R2_PUBLIC_URL",
    "mockups/product/<product-slug>/<look>",
    "mockups/editor/<garment-slug>/<look>",
    "designs/<design-slug>.svg",
    "posts/<post-slug>.svg",
    "orders/<order-id>",
    "npx wrangler r2 bucket create mh-fashion-assets",
    "black-oversized-short-sleeve",
  ]) {
    assert.ok(doc.includes(marker), `R2 doc is missing ${marker}`);
  }
});
