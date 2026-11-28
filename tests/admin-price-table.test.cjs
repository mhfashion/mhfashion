// The Price Table is the shop's single source of prices: one price per category and size. Posting a
// product or a T-shirt post reads it, so nothing types a price by hand.
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
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
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
const priceTable = loadModule("apps/web/src/lib/price-table.ts");

test("the seeded table prices every size of every category", () => {
  const data = admin.createAdminDemoData(Date.now());
  assert.ok(data.priceTable, "the store carries the table");
  for (const category of admin.PRICE_TABLE_CATEGORIES) {
    const counts = admin.priceTableCounts(data.priceTable, category);
    assert.equal(counts.priced, counts.total, `${category} is fully priced`);
    for (const size of admin.priceTableSizes(category)) {
      const price = admin.priceTableCell(data.priceTable, category, size);
      assert.ok(Number.isSafeInteger(price) && price > 0, `${category} ${size} has a price`);
    }
  }
  assert.deepEqual(admin.priceTableSizes("T-Shirt"), ["S", "M", "L", "XL", "2XL"]);
  assert.deepEqual(admin.priceTableSizes("Cap"), ["One size"], "a cap sells one size");
  assert.equal(admin.priceTableSummary(data.priceTable).total, 22, "5 sizes x 4 apparel categories + 2 one-size rows");
});

test("a table cell can be written and cleared, and junk is dropped", () => {
  let table = admin.normalizePriceTable({ "T-Shirt": { M: 13_000 } });
  assert.equal(admin.priceTableCell(table, "T-Shirt", "M"), 13_000);
  table = admin.setPriceTableCell(table, "T-Shirt", "L", 14_500);
  assert.equal(admin.priceTableCell(table, "T-Shirt", "L"), 14_500);
  table = admin.setPriceTableCell(table, "T-Shirt", "L", null);
  assert.equal(admin.priceTableCell(table, "T-Shirt", "L"), null, "a cleared cell stays empty");
  table = admin.setPriceTableCell(table, "T-Shirt", "M", null);
  assert.equal(table["T-Shirt"], undefined, "a category with no cells is dropped");

  const junk = admin.normalizePriceTable({
    "T-Shirt": { S: 0, M: -5, L: 12_000.5, XL: "20000", "2XL": 20_000, XXXL: 9_000 },
    Hat: { "One size": 5_000 },
    Cap: { "One size": 9_000, S: 4_000 },
  });
  assert.deepEqual(junk, { "T-Shirt": { "2XL": 20_000 }, Cap: { "One size": 9_000 } }, "only real prices on real rows survive");
  assert.deepEqual(admin.normalizePriceTable(undefined), {}, "a missing table is empty");
});

test("the table decides a product's catalogue price", () => {
  const table = admin.normalizePriceTable(admin.SEED_PRICE_TABLE);
  const prices = priceTable.pricesForCategory(table, "T-Shirt");
  assert.deepEqual(prices.map((cell) => cell.size), ["S", "M", "L", "XL", "2XL"]);
  assert.equal(priceTable.lowestTablePrice(table, "T-Shirt"), 12_000, "the card lists from the lowest size");
  assert.equal(priceTable.lowestTablePrice(table, "Hoodie"), 26_000);
  assert.ok(priceTable.categoryFullyPriced(table, "T-Shirt"));
  assert.equal(priceTable.lowestTablePrice({ "T-Shirt": { M: 13_000 } }, "T-Shirt"), 13_000);
  assert.equal(priceTable.lowestTablePrice({}, "T-Shirt"), null);
  assert.equal(priceTable.categoryFullyPriced({ "T-Shirt": { M: 13_000 } }, "T-Shirt"), false, "a half-filled category cannot be posted");
});

test("a posted product takes the table's price, and keeps its own when the table is silent", () => {
  const table = admin.normalizePriceTable(admin.SEED_PRICE_TABLE);
  const draft = { ...admin.productDraftFrom(), category: "Hoodie", priceKs: "999" };
  assert.equal(priceTable.draftWithTablePrice(draft, table).priceKs, "26000", "the table wins over a typed price");
  assert.equal(priceTable.draftWithTablePrice(draft, {}).priceKs, "999", "an empty table leaves the draft alone");
  assert.equal(admin.productFromDraft(priceTable.draftWithTablePrice(draft, table)).priceKs, 26_000);
});

test("a pricing scope fills from its own category", () => {
  const table = admin.normalizePriceTable(admin.SEED_PRICE_TABLE);
  const rows = [
    { key: "s|M", options: { size: "M", print: "DTF" } },
    { key: "s|XL", options: { size: "XL", print: "Sublimation" } },
    { key: "s|XS", options: { size: "XS" } },
  ];
  const filled = priceTable.fillPricesFromTable(table, "T-Shirt", rows);
  assert.deepEqual([...filled], [["s|M", 13_000], ["s|XL", 15_000]], "the size picks the cell and unknown sizes are skipped");
  assert.equal(priceTable.fillPricesFromTable(table, null, rows).size, 0, "no category, no fill");

  const data = admin.createAdminDemoData(Date.now());
  const product = data.products.find((entry) => entry.category === "Hoodie");
  assert.ok(product, "the seed has a hoodie");
  assert.equal(priceTable.scopePriceCategory(data, { kind: "product", id: product.id }), "Hoodie");
  assert.equal(priceTable.scopePriceCategory(data, { kind: "post", id: data.tshirtPosts[0].id }), "T-Shirt", "every post is a T-shirt post");
  assert.equal(priceTable.scopePriceCategory(data, { kind: "product", id: "nope" }), null);
});

test("every shop category the storefront lists has a column behind it", () => {
  const row = read("apps/web/src/components/CategoryRow.tsx");
  const listed = [...row.matchAll(/name: "([^"]+)", slug:/g)].map((match) => match[1]);
  assert.ok(listed.length >= 5, "the storefront still lists its categories");
  const mapped = new Map(priceTable.SHOP_CATEGORY_PRICES.map((entry) => [entry.shop, entry.column]));
  for (const shop of listed) {
    assert.ok(mapped.has(shop), `${shop} has a price column`);
    assert.ok(admin.PRICE_TABLE_CATEGORIES.includes(mapped.get(shop)), `${shop} maps to a posted category`);
  }
  assert.ok(mapped.has("T-Shirts") && mapped.get("T-Shirts") === "T-Shirt", "the T-shirt family is priced from the T-shirt column");
});

test("the price table has its own admin screen, nav entry and module", () => {
  assert.ok(existsSync(path.join(__dirname, "..", "apps/web/src/app/admin/price-table/page.tsx")), "the route exists");
  const nav = read("apps/web/src/lib/admin-nav.ts");
  assert.match(nav, /\{ id: "price-table", label: "Price Table", href: "\/admin\/price-table" \}/);
  assert.match(read("apps/web/src/lib/admin-demo-data.ts"), /\{ id: "price-table", label: "Price Table" \}/, "the module is registered");
  assert.match(read("apps/web/src/components/admin/AdminShell.tsx"), /"price-table": Grid3x3/, "the sidebar has an icon");
  assert.match(read("apps/web/src/components/admin/AdminDashboard.tsx"), /href: "\/admin\/price-table"/, "the dashboard links to it");
});

test("posting a product no longer types a price", () => {
  const products = read("apps/web/src/components/admin/AdminProducts.tsx");
  assert.doesNotMatch(products, /aria-label="Price in Ks"/, "the manual price input is gone");
  assert.match(products, /<PriceFromTable table=\{data\.priceTable\} category=\{draft\.category\} \/>/);
  assert.match(products, /draftWithTablePrice\(draft, data\.priceTable\)/, "the saved price comes from the table");
  assert.match(products, /data-product-price-missing/, "a category missing from the table is called out");

  const pricing = read("apps/web/src/components/admin/AdminPricing.tsx");
  assert.match(pricing, /fillPricesFromTable\(data\.priceTable/, "the combination grid fills from the table");
  assert.match(pricing, /From Price Table/);
});
