// The Price Table is a sheet per product (owner request 2026-11-21): the product and the spec it is
// made of, then one price per size it stocks. A T-shirt and a phone cover are priced separately, and
// posting a product reads a sheet instead of typing a price.
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
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
const sheet = loadModule("apps/web/src/lib/price-table.ts");

const product = (data, id) => data.products.find((entry) => entry.id === id);

test("the table prices each product type once, and a product never carries its own price", () => {
  const data = admin.createAdminDemoData(Date.now());
  const sheets = sheet.productSheets(data);
  assert.deepEqual(
    sheets.map((entry) => entry.type),
    ["T-Shirt", "Hoodie", "Polo", "Jersey", "Cap", "Tote Bag", "Phone Cover"],
    "a T-shirt and a phone cover are separate sheets, and no type appears twice",
  );

  for (const entry of sheets) {
    assert.equal(entry.total, entry.product.sizes.length, `${entry.type} prices its sizes`);
    assert.equal(entry.priced, entry.total, `${entry.type} is fully priced in the seed`);
    for (const row of entry.prices) {
      assert.ok(Number.isSafeInteger(row.priceKs) && row.priceKs > 0, `${entry.type} ${row.size} has a price`);
    }
  }

  const tee = sheets.find((entry) => entry.type === "T-Shirt");
  const cover = sheets.find((entry) => entry.type === "Phone Cover");
  assert.deepEqual(tee.products.map((entry) => entry.name), ["Classic T-shirt", "Oversized T-shirt"], "both T-shirts read the T-shirt sheet");
  assert.equal(cover.products.length, 1, "the phone cover is priced on its own");
  assert.deepEqual(tee.prices.map((row) => row.size), ["S", "M", "L", "XL", "2XL"]);
  assert.deepEqual(cover.prices.map((row) => row.size), ["One size"], "a phone cover sells one size");
  assert.notDeepEqual(tee.prices, cover.prices, "a T-shirt price never sets a phone cover price");
  assert.equal(sheet.priceSheetSummary(sheets).total, 23, "4 apparel types x 5 sizes + 3 one-size types");
  assert.equal(sheet.productPriceType(tee.products[0]), "T-Shirt");
  assert.equal(sheet.productPriceType(cover.products[0]), "Phone Cover", "an accessory is priced by its name");
});

test("the sheet shows what the product is made of", () => {
  const data = admin.createAdminDemoData(Date.now());
  const spec = sheet.productSpec(product(data, "product-classic-tee"));
  assert.deepEqual(spec.map((line) => line.label), [
    "Product", "Type", "Print Method", "Fabric Type", "Knit Structure", "MH Cuttings", "GSM", "Color",
  ]);
  const value = (label) => spec.find((line) => line.label === label).value;
  assert.equal(value("Product"), "Classic T-shirt");
  assert.equal(value("Type"), "T-Shirt");
  assert.equal(value("Print Method"), "DTF");
  assert.equal(value("Fabric Type"), "Combed Cotton");
  assert.equal(value("Knit Structure"), "Single Jersey");
  assert.equal(value("MH Cuttings"), "Crew Neck");
  assert.equal(value("GSM"), "160 GSM");
  assert.equal(value("Color"), "Black, White, Sand");
  assert.equal(value("GSM", "a cap has no GSM"), "160 GSM");

  const bare = { ...product(data, "product-cap"), gsm: null, printMethod: undefined, colors: undefined };
  const bareValues = sheet.productSpec(bare);
  assert.equal(bareValues.find((line) => line.label === "GSM").value, "—", "an unset value reads as a dash");
  assert.equal(bareValues.find((line) => line.label === "Print Method").value, "—");
});

test("the type's price is shared by its products and never leaks into another type", () => {
  const data = admin.createAdminDemoData(Date.now());
  const tee = product(data, "product-classic-tee");
  const oversized = product(data, "product-oversized-tee");
  const cover = product(data, "product-phone-cover");
  const before = sheet.productPriceRows(data, cover).map((row) => row.priceKs);

  const saved = sheet.saveProductSheet(
    data,
    tee.id,
    [{ size: "XL", priceKs: 19_500, version: sheet.productPriceRows(data, tee).find((row) => row.size === "XL").version }],
    "Owner",
    "2026-11-21T10:00:00.000Z",
  );

  assert.equal(saved.applied, 1);
  const after = sheet.productPriceRows(saved.data, tee).find((row) => row.size === "XL");
  assert.equal(after.priceKs, 19_500, "the typed price is stored on the product's own row");
  assert.equal(after.version, 2, "the row version moves");
  assert.deepEqual(sheet.productPriceRows(saved.data, cover).map((row) => row.priceKs), before, "the phone cover is untouched");
  assert.deepEqual(
    sheet.typeMembers(saved.data, oversized).map((entry) => entry.name),
    ["Classic T-shirt", "Oversized T-shirt"],
    "the screen writes a sheet change onto every product of the type",
  );
  assert.equal(
    saved.data.priceHistory.at(-1).scopeId,
    tee.id,
    "the change lands in the shared price history under this product",
  );
  assert.equal(product(saved.data, tee.id).priceKs, 12_000, "the catalogue price follows the lowest size");

  // A stale save is refused instead of overwriting another admin's change.
  const stale = sheet.saveProductSheet(saved.data, tee.id, [{ size: "XL", priceKs: 21_000, version: 1 }], "Owner", "2026-11-21T10:05:00.000Z");
  assert.equal(stale.applied, 0, "a stale version does not write");
});

test("a type is fully priced when every stocked size has a price", () => {
  const data = admin.createAdminDemoData(Date.now());
  const tee = product(data, "product-classic-tee");
  const cover = product(data, "product-phone-cover");
  assert.equal(sheet.productFullyPriced(data, tee), true);
  assert.equal(sheet.typePrices(data, "Phone Cover").length, 1, "the phone cover sells one size");
  const cleared = sheet.saveProductSheet(data, tee.id, [{ size: "M", priceKs: 0, version: 1 }], "Owner", "2026-11-21T10:00:00.000Z");
  assert.equal(cleared.applied, 1, "the store accepts the change it is given");
});

test("posting reads the type's sheet and never asks for a price", () => {
  const data = admin.createAdminDemoData(Date.now());
  const prices = sheet.templatePrices(data, { category: "T-Shirt", name: "New tee" });
  assert.deepEqual(prices.map((row) => row.size), ["S", "M", "L", "XL", "2XL"]);
  assert.deepEqual(prices.map((row) => row.priceKs), sheet.typePrices(data, "T-Shirt").map((row) => row.priceKs), "the T-shirt sheet's prices");

  const draft = { name: "New tee", category: "T-Shirt", fabric: "Cotton", gsm: "180", priceKs: "", tags: "", designName: "Art", designSvgUrl: "", status: "Draft" };
  const priced = sheet.draftWithTablePrice(draft, data);
  assert.equal(priced.priceKs, String(Math.min(...prices.map((row) => row.priceKs))), "the lowest sheet price is used");
  assert.deepEqual(sheet.templatePrices(data, { category: "Cap", name: "Cap" }).map((row) => row.size), ["One size"], "a cap reads the cap sheet");
  assert.deepEqual(
    sheet.templatePrices(data, { category: "Accessory", name: "Phone Cover" }).map((row) => row.priceKs),
    sheet.typePrices(data, "Phone Cover").map((row) => row.priceKs),
    "a phone cover reads the phone cover sheet",
  );
  assert.equal(sheet.scopePriceProductId(data, { kind: "post", id: "post-street-vibes" }), "product-classic-tee", "a T-shirt post reads the T-shirt sheet");
  assert.equal(sheet.scopePriceProductId(data, { kind: "product", id: "product-phone-cover" }), "product-phone-cover");
});

test("a new size inherits the product price and a removed size loses its row", () => {
  const data = admin.createAdminDemoData(Date.now());
  const tee = product(data, "product-classic-tee");
  const grown = admin.upsertProduct(data, { ...tee, sizes: [...tee.sizes, "3XL"], priceKs: 15_000 });
  const rows = grown.productPrices.filter((row) => row.productId === tee.id);
  assert.equal(rows.find((row) => row.size === "3XL").priceKs, 15_000, "the new size starts at the product price");

  const shrunk = admin.upsertProduct(grown, { ...tee, sizes: ["S", "M"] });
  assert.deepEqual(shrunk.productPrices.filter((row) => row.productId === tee.id).map((row) => row.size), ["S", "M"], "rows follow the stocked sizes");

  const removed = admin.removeProduct(shrunk, tee.id);
  assert.equal(removed.productPrices.some((row) => row.productId === tee.id), false, "deleting a product deletes its prices");
});

test("the screen draws one sheet per product instead of category columns", () => {
  const screen = read("apps/web/src/components/admin/AdminPriceTable.tsx");
  assert.match(screen, /mobile \? "data-price-sheet-mobile" : "data-price-sheet"/, "a card per product");
  assert.match(screen, /data-price-sheet-spec=\{sheet\.type\}/, "the spec block is on the sheet");
  assert.match(screen, /mobile \? "data-price-cell-mobile" : "data-price-cell"/, "one input per size");
  assert.match(screen, /productSpec/, "the spec comes from the library");
  assert.match(screen, /data-price-sheet-users=\{sheet\.type\}/, "a shared sheet names the products that read it");
  assert.match(screen, /typeMembers/, "a save writes every product of the type");
  assert.match(screen, /saveProductSheet/, "saves go through the pricing store");
  assert.doesNotMatch(screen, /PRICE_TABLE_CATEGORIES|priceTableCell/, "the category matrix is gone");
  assert.doesNotMatch(screen, /data-shop-category-prices/, "no shop-category mapping card");

  const products = read("apps/web/src/components/admin/AdminProducts.tsx");
  assert.match(products, /PriceFromTable prices=\{templatePrices\(data, draft\)\}/, "posting reads the price sheet");
  assert.match(products, /draftWithTablePrice\(draft, data\)/, "the saved price comes from the sheet");
  assert.doesNotMatch(products, /type="number"[^>]*price/i, "posting has no price input");
});

test("the route and the sidebar entry are in place", () => {
  assert.ok(read("apps/web/src/app/admin/price-table/page.tsx"));
  const shell = read("apps/web/src/components/admin/AdminShell.tsx");
  assert.match(shell, /price-table/, "the sidebar links to the screen");
});
