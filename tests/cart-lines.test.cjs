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

const cart = loadModule("apps/web/src/lib/cart-items.ts");

const tee = {
  id: "product-classic-tee",
  name: "Classic T-shirt",
  slug: "classic-t-shirt",
  priceMinKs: 21000,
  priceMaxKs: 24000,
  imageUrl: "/x.png",
};

const blackM = { size: "M", color: "Black", material: "Cotton", gsm: "160 GSM", fit: "Oversized", sleeve: "Short Sleeve" };

test("a different size is a separate cart line, never merged", () => {
  let items = cart.addCartItem([], tee, blackM, 1, 22000);
  items = cart.addCartItem(items, tee, { ...blackM, size: "L" }, 1, 23000);
  assert.equal(items.length, 2);
  assert.notEqual(items[0].key, items[1].key);
  assert.deepEqual(items.map((item) => item.variant.size), ["M", "L"]);
  assert.deepEqual(items.map((item) => item.unitPriceKs), [22000, 23000]);
});

test("every variant field keeps lines apart", () => {
  const fields = ["size", "color", "material", "gsm", "fit", "sleeve"];
  const base = cart.cartItemKey(tee.id, blackM);
  for (const field of fields) {
    const changed = cart.cartItemKey(tee.id, { ...blackM, [field]: "Other" });
    assert.notEqual(changed, base, `${field} does not separate the line`);
  }
});

test("the same combination increments instead of adding a second line", () => {
  let items = cart.addCartItem([], tee, blackM, 2, 22000);
  items = cart.addCartItem(items, tee, { ...blackM }, 3, 22000);
  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 5);
});

test("adding a second variant leaves the first line's quantity alone", () => {
  let items = cart.addCartItem([], tee, blackM, 2, 22000);
  items = cart.addCartItem(items, tee, { ...blackM, color: "White" }, 1, 22500);
  assert.equal(items.length, 2);
  assert.equal(items[0].quantity, 2);
  assert.equal(items[1].quantity, 1);
});

test("quantity updates and removals target one line by key", () => {
  let items = cart.addCartItem([], tee, blackM, 1, 22000);
  items = cart.addCartItem(items, tee, { ...blackM, size: "XL" }, 1, 24000);
  const [first, second] = items;
  const updated = cart.updateCartQuantity(items, second.key, 4);
  assert.equal(updated.find((item) => item.key === first.key).quantity, 1);
  assert.equal(updated.find((item) => item.key === second.key).quantity, 4);
  assert.equal(cart.updateCartQuantity(items, second.key, 0).length, 1);
  assert.deepEqual(cart.removeCartItem(items, first.key).map((item) => item.key), [second.key]);
});

test("totals use the variant price when the product page knew it", () => {
  let items = cart.addCartItem([], tee, blackM, 2, 22000);
  items = cart.addCartItem(items, tee, { ...blackM, size: "L" }, 1, 25000);
  assert.equal(cart.cartLineTotal(items[0]), 44000);
  assert.equal(cart.cartSubtotal(items), 69000);
  assert.equal(cart.cartSubtotal(cart.addCartItem([], tee, null, 2)), 42000);
});

test("variant labels read the way the print desk expects", () => {
  assert.equal(cart.variantLabel(blackM), "M · Black · Cotton · 160 GSM · Oversized · Short Sleeve");
  assert.equal(cart.variantLabel({ size: "M" }), "M");
  assert.equal(cart.variantLabel(null), "");
});

test("carts saved before variants existed keep every line", () => {
  const legacy = [
    { ...tee, quantity: 2 },
    { ...tee, quantity: 1 },
  ];
  const items = cart.normalizeCartItems(legacy);
  assert.equal(items.length, 2);
  assert.notEqual(items[0].key, items[1].key);
  assert.deepEqual(items[0].variant, cart.EMPTY_VARIANT);
});

test("the product page and both cart surfaces use the line key", () => {
  const detail = readFileSync(path.join(ROOT, "apps/web/src/components/ProductDetailClient.tsx"), "utf8");
  assert.match(detail, /addItem\(product, variant, quantity/);
  assert.match(detail, /data-variant-warning/);

  for (const file of ["apps/web/src/components/CartBox.tsx", "apps/web/src/components/CartPageClient.tsx"]) {
    const source = readFileSync(path.join(ROOT, file), "utf8");
    assert.match(source, /item\.key/, `${file} still keys lines by product id`);
    assert.match(source, /variantLabel\(item\.variant\)/);
    assert.equal(/item\.id, item\.quantity/.test(source), false, `${file} updates by product id`);
  }
});
