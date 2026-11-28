// The Price Table is the one place a price lives, so everything that touches a price must meet it
// there: a published post, Attribute Management, the shop and a sale. These tests pin those joins.
const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const loadedModules = new Map();

function loadModule(relativePath) {
  const sourcePath = path.join(__dirname, "..", relativePath);
  const cached = loadedModules.get(sourcePath);
  if (cached) return cached.exports;
  const compiled = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React },
    fileName: sourcePath,
  }).outputText;
  const loaded = { exports: {} };
  loadedModules.set(sourcePath, loaded);
  const localRequire = (id) => {
    if (id.startsWith("@/")) return loadModule(`apps/web/src/${id.slice(2)}.ts`);
    return require(id);
  };
  new Function("module", "exports", "require", compiled)(loaded, loaded.exports, localRequire);
  return loaded.exports;
}

const read = (relativePath) => readFileSync(path.join(__dirname, "..", relativePath), "utf8");
const admin = loadModule("apps/web/src/lib/admin-demo-data.ts");
const pricing = loadModule("apps/web/src/lib/pricing-variants.ts");
const shop = loadModule("apps/web/src/lib/variant-price.ts");

const NOW = "2026-11-21T09:00:00.000Z";

function postFor(productId, prices) {
  return {
    productId,
    status: "Published",
    attributes: [
      { key: "size", label: "Size", options: ["S", "M"], enabled: true },
      { key: "color", label: "Color", options: ["Black"], enabled: true },
    ],
    prices: prices.map((priceKs, index) => ({ options: { color: "Black" }, priceKs: priceKs + index * 0 })),
  };
}

test("publishing a post seeds the Price Table from its combination prices", () => {
  const data = admin.createAdminDemoData(new Date(NOW));
  const product = data.products[0];
  // A clean product: nothing priced yet.
  const empty = { ...data, productPrices: data.productPrices.filter((row) => row.productId !== product.id) };
  const result = pricing.syncPostPricing(empty, postFor(product.id, [18000]));

  assert.deepEqual(result.issues, []);
  const rows = pricing.variantRows(result.data, product);
  const priced = rows.filter((row) => row.priceKs !== null);
  assert.equal(priced.length, product.sizes.length, "every stocked size got a row from the post price");
  assert.ok(priced.every((row) => row.priceKs === 18000), "the post price is what the row carries");
  assert.ok(priced.every((row) => row.priceUsd === null), "USD is left missing for the owner to type, never converted");
});

test("posting never overwrites a price the owner already set", () => {
  const data = admin.createAdminDemoData(new Date(NOW));
  const product = data.products[0];
  const before = data.productPrices.filter((row) => row.productId === product.id);
  assert.ok(before.some((row) => row.priceKs !== null), "the seed carries priced rows to protect");

  const result = pricing.syncPostPricing(data, postFor(product.id, [999000]));
  const identity = (row) => `${row.productId}|${row.size}|${JSON.stringify(row.options ?? {})}`;
  for (const row of before) {
    const same = result.data.productPrices.find((entry) => identity(entry) === identity(row));
    assert.ok(same, "the stored row is still there");
    assert.equal(same.priceKs, row.priceKs, "an existing price survives a re-post");
    assert.equal(same.priceUsd ?? null, row.priceUsd ?? null, "an existing USD price survives too");
  }
  const created = result.data.productPrices.filter((entry) => entry.productId === product.id
    && !before.some((row) => identity(entry) === identity(row)));
  assert.ok(created.length, "the post still seeded the variants it named");
  assert.ok(
    created.every((entry) => (entry.priceUsd ?? null) === null),
    `a seeded row waits for the owner's USD price: ${JSON.stringify(created.filter((entry) => (entry.priceUsd ?? null) !== null))}`,
  );
});

test("a draft post leaves the Price Table alone", () => {
  const data = admin.createAdminDemoData(new Date(NOW));
  const result = pricing.syncPostPricing(data, { ...postFor(data.products[0].id, [20000]), status: "Draft" });
  assert.equal(result.seeded, 0);
  assert.deepEqual(result.data, data);
});

test("other product types are priced too, not just the T-shirt", () => {
  const data = admin.createAdminDemoData(new Date(NOW));
  // The chain carries the specs a phone cover, a cup and a tote are sold on.
  const keys = data.attributeChain.map((attribute) => attribute.key);
  for (const key of ["phoneBrand", "phoneModel", "caseType", "magSafe", "cupType", "capacity", "bagSize"]) {
    assert.ok(keys.includes(key), `the chain is missing ${key}`);
  }

  const nonTshirt = data.products.find((product) => product.category !== "T-Shirt") ?? null;
  const product = nonTshirt ?? { ...data.products[0], category: "Phone Cover" };
  const switched = pricing.setProductAttributes(data, product.id, ["phoneBrand", "caseType", "size"]);
  assert.deepEqual(
    [...pricing.productAttributeKeys(switched, switched.products.find((entry) => entry.id === product.id))].sort(),
    ["caseType", "phoneBrand", "size"],
    "a non-T-shirt product prices its own attributes",
  );

  const rows = pricing.variantRows(switched, switched.products.find((entry) => entry.id === product.id));
  assert.ok(rows.length > 0, "the grid still builds for another category");
  assert.ok(rows.every((row) => "phoneBrand" in row.options), "the phone brand is a column, as Attribute Management defines it");
});

test("a post of another category only prices the product's own specification", () => {
  const data = admin.createAdminDemoData(new Date(NOW));
  const product = data.products[0];
  const post = {
    productId: product.id,
    status: "Published",
    attributes: [
      { key: "size", label: "Size", options: ["S"], enabled: true },
      { key: "cupType", label: "Cup Type", options: ["Ceramic"], enabled: true },
    ],
    prices: [{ options: { cupType: "Ceramic" }, priceKs: 12000 }],
  };
  const result = pricing.syncPostPricing(data, post);
  assert.deepEqual(result.issues, []);
  assert.ok(
    pricing.productAttributeKeys(result.data, result.data.products.find((entry) => entry.id === product.id)).includes("cupType"),
    "the post switches the spec on for its product",
  );
});

test("a sale takes the variant's stock and a refund gives it back, once", () => {
  const data = admin.createAdminDemoData(new Date(NOW));
  const product = data.products[0];
  const row = pricing.variantRows(data, product).find((entry) => entry.priceKs !== null);
  const tracked = pricing.applyVariantStockForOrder(
    {
      ...data,
      productPrices: data.productPrices.map((entry) => (entry.productId === product.id
        ? { ...entry, stock: { ...(entry.stock ?? { quantity: 0, lowStockThreshold: 2, restockQty: 5, note: "" }), tracking: true, quantity: 5 } }
        : entry)),
      orders: [{
        ...data.orders[0],
        id: "order-stock-check",
        stage: "Paid",
        items: [{
          productId: product.id,
          name: product.name,
          size: row.size,
          color: String(row.options.color ?? ""),
          quantity: 2,
          unitPriceKs: row.priceKs,
        }],
      }],
    },
    "order-stock-check",
    "take",
  );
  const taken = tracked.moved.find((entry) => entry.key.startsWith(product.id));
  assert.ok(taken, "the sale moved a variant's stock");
  assert.equal(taken.quantity, -2, "two pieces left the shelf");

  const again = pricing.applyVariantStockForOrder(tracked.data, "order-stock-check", "take");
  assert.deepEqual(again.moved, [], "a replayed payment does not take the stock twice");

  const restored = pricing.applyVariantStockForOrder(tracked.data, "order-stock-check", "restore");
  assert.ok(restored.moved.some((entry) => entry.quantity === 2), "a refund puts the pieces back");
});

test("the shop reads the stored price in the picked currency and never converts", () => {
  const variants = [
    { signature: "color=Black|size=M", options: { color: "Black", size: "M" }, size: "M", priceKs: 15000, priceUsd: 4, availability: "Available" },
    { signature: "color=Black|size=L", options: { color: "Black", size: "L" }, size: "L", priceKs: 17000, priceUsd: null, availability: "Available" },
    { signature: "color=Red|size=M", options: { color: "Red", size: "M" }, size: "M", priceKs: 16000, priceUsd: 4.35, availability: "Out of Stock" },
  ];
  const m = shop.findVariant(variants, { color: "Black", size: "M" });
  assert.equal(m.priceKs, 15000);
  assert.equal(m.priceUsd, 4);
  assert.ok(shop.variantIsSellable(m));

  const l = shop.findVariant(variants, { color: "Black", size: "L" });
  assert.equal(shop.variantIsSellable(l), false, "a row without a USD price is not sellable");
  assert.match(shop.variantNotice(l), /not priced/);

  const red = shop.findVariant(variants, { color: "Red", size: "M" });
  assert.equal(shop.variantIsSellable(red), false);
  assert.match(shop.variantNotice(red), /out of stock/);

  assert.equal(shop.findVariant(variants, { color: "Green", size: "M" }), null);

  const currency = loadModule("apps/web/src/lib/currency-context.tsx");
  assert.equal(currency.pickPrice("Ks", 15000, 4), "15,000 Ks");
  assert.equal(currency.pickPrice("USD", 15000, 4), "$4.00");
  // A missing USD price shows the MMK one; it is never divided by the exchange rate.
  assert.equal(currency.pickPrice("USD", 15000, null), "15,000 Ks");
  assert.equal(currency.pickPrice("Ks", null, 4), "$4.00");
  assert.equal(currency.pickPrice("USD", null, null), "Price on request");
});

test("one Price Table screen: the old route forwards and the sheet is a tab", () => {
  assert.ok(existsSync(path.join(__dirname, "..", "apps/web/src/app/admin/price-table/page.tsx")));
  assert.match(read("apps/web/src/app/admin/price-table/page.tsx"), /redirect\("\/admin\/pricing"\)/);

  const posts = read("apps/web/src/components/admin/AdminPosts.tsx");
  assert.match(posts, /data-post-product/, "the post editor picks the product it is sold as");
  assert.match(posts, /syncPostPricing\(saved/, "publishing hands the post to the Price Table");
  assert.match(posts, /href="\/admin\/pricing"/, "the editor links to the merged screen");
  assert.match(posts, /productAttributeKeys/, "the product decides which attributes the post prices");

  const catalog = read("apps/web/src/lib/products.ts");
  assert.match(catalog, /product_variant_prices/, "the shop reads the Price Table's rows");
  const page = read("apps/web/src/components/ProductDetailClient.tsx");
  assert.match(page, /findVariant\(product\.variants/, "the product page prices the picked combination");
  assert.match(page, /variantIsSellable/, "an unpriced or switched-off combination cannot be bought");

  const sql = read("SQL/0012_pricing_management.sql");
  assert.match(sql, /create or replace function public\.product_variant_prices/, "the shop's read path is in the migration");
});
