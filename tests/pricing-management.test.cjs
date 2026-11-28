// Pricing Management (owner spec 2026-11-21): a variant is one specification combination, size
// included, with its own manually set price. The model is dynamic — an attribute the owner switches on
// for a product adds variants and columns without a schema change — so these tests pin the variant
// rows, the duplicate guard, the version check, the matrix grouping and the history.
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
const variants = loadModule("apps/web/src/lib/pricing-variants.ts");

const product = (data, id) => data.products.find((entry) => entry.id === id);
const tee = (data) => product(data, "product-classic-tee");

test("a product starts priced by size, one variant row per size", () => {
  const data = admin.createAdminDemoData(Date.now());
  const rows = variants.variantRows(data, tee(data));
  assert.deepEqual(rows.map((row) => row.size), ["S", "M", "L", "XL", "2XL"]);
  assert.equal(rows.every((row) => row.priceKs > 0), true, "the seeded sizes are priced");
  assert.equal(rows.every((row) => row.status === "Active"), true);
  assert.deepEqual(variants.productAttributeKeys(data, tee(data)), ["size"]);
});

test("switching an attribute on adds variants and columns without a schema change", () => {
  const data = admin.createAdminDemoData(Date.now());
  const withColor = variants.setProductAttributes(data, tee(data).id, ["size", "color"]);
  const rows = variants.variantRows(withColor, tee(data));
  const colors = variants.productPricingAttributes(withColor, tee(data)).find((attribute) => attribute.key === "color").options;
  assert.equal(rows.length, tee(data).sizes.length * colors.length, "one row per size and colour");
  assert.deepEqual(
    variants.variantColumns(variants.productPricingAttributes(withColor, tee(data))).map((column) => column.label),
    ["Color", "Size"],
    "the new attribute becomes a column, in chain order with Size last",
  );
  assert.equal(rows.filter((row) => row.priceKs !== null).length, 0, "new combinations start Incomplete");
  assert.equal(variants.pricingOverview(withColor).incomplete >= colors.length * tee(data).sizes.length, true);
});

test("a price is written per variant and reaches only that variant", () => {
  const data = admin.createAdminDemoData(Date.now());
  const withColor = variants.setProductAttributes(data, tee(data).id, ["size", "color"]);
  const row = variants.variantRows(withColor, tee(data)).find((entry) => entry.options.color === "White" && entry.size === "M");
  const saved = variants.saveVariantChanges(
    withColor,
    tee(data).id,
    [{ options: row.options, size: "M", priceKs: 7_500, expectedVersion: row.version }],
    "Owner",
    "2026-11-21T09:00:00.000Z",
  );
  assert.equal(saved.applied, 1);
  const after = variants.variantRows(saved.data, tee(data));
  assert.equal(after.find((entry) => entry.options.color === "White" && entry.size === "M").priceKs, 7_500);
  assert.equal(after.find((entry) => entry.options.color === "Black" && entry.size === "M").priceKs, null, "another colour is untouched");
  assert.equal(after.find((entry) => entry.options.color === "White" && entry.size === "L").priceKs, null, "another size is untouched");
  assert.equal(saved.data.priceHistory.length, 1, "the change is in the history");
  assert.deepEqual(saved.data.priceHistory[0].options, { color: "White", size: "M" });
});

test("a stale save is refused instead of overwriting another admin", () => {
  const data = admin.createAdminDemoData(Date.now());
  const row = variants.variantRows(data, tee(data)).find((entry) => entry.size === "L");
  const first = variants.saveVariantChanges(
    data, tee(data).id, [{ options: row.options, size: "L", priceKs: 20_000, expectedVersion: row.version }], "A", "2026-11-21T09:00:00.000Z",
  );
  const second = variants.saveVariantChanges(
    first.data, tee(data).id, [{ options: row.options, size: "L", priceKs: 30_000, expectedVersion: row.version }], "B", "2026-11-21T09:01:00.000Z",
  );
  assert.equal(second.applied, 0);
  assert.equal(second.conflicts.length, 1);
  assert.equal(variants.variantRows(second.data, tee(data)).find((entry) => entry.size === "L").priceKs, 20_000);
});

test("a disabled variant stops being offered but keeps its price", () => {
  const data = admin.createAdminDemoData(Date.now());
  const row = variants.variantRows(data, tee(data)).find((entry) => entry.size === "XL");
  const saved = variants.saveVariantChanges(
    data, tee(data).id,
    [{ options: row.options, size: "XL", priceKs: null, status: "Disabled", expectedVersion: row.version }],
    "Owner", "2026-11-21T09:00:00.000Z",
  );
  const after = variants.variantRows(saved.data, tee(data)).find((entry) => entry.size === "XL");
  assert.equal(after.status, "Disabled");
  assert.equal(after.priceKs, row.priceKs, "disabling keeps the price for later");
  assert.equal(variants.pricingOverview(saved.data).disabled, 1);
});

test("the matrix shows the sizes of one specification, and only that specification", () => {
  const data = admin.createAdminDemoData(Date.now());
  const withColor = variants.setProductAttributes(data, tee(data).id, ["size", "color"]);
  const groups = variants.specificationGroups(withColor, tee(data));
  const colors = variants.productPricingAttributes(withColor, tee(data)).find((attribute) => attribute.key === "color").options;
  assert.equal(groups.length, colors.length, "one specification per colour");
  const black = groups.find((group) => group.options.color === "Black");
  const rows = variants.matrixRows(withColor, tee(data), black.options);
  assert.deepEqual(rows.map((row) => row.size), ["S", "M", "L", "XL", "2XL"]);
  assert.equal(rows.every((row) => row.options.color === "Black"), true);
});

test("the history lists every price change newest first, with its specification", () => {
  const data = admin.createAdminDemoData(Date.now());
  const row = variants.variantRows(data, tee(data))[0];
  const saved = variants.saveVariantChanges(
    data, tee(data).id, [{ options: row.options, size: row.size, priceKs: 25_000, expectedVersion: row.version }], "Owner", "2026-11-21T09:00:00.000Z",
  );
  const history = variants.pricingHistory(saved.data);
  assert.equal(history.length, 1);
  assert.equal(history[0].oldPriceKs, row.priceKs);
  assert.equal(history[0].newPriceKs, 25_000);
  assert.equal(history[0].actor, "Owner");
  assert.equal(variants.pricingHistory(saved.data, { search: "classic" }).length, 1);
  assert.equal(variants.pricingHistory(saved.data, { search: "hoodie" }).length, 0);
});

test("the CSV carries the specification columns and the price", () => {
  const data = admin.createAdminDemoData(Date.now());
  const withColor = variants.setProductAttributes(data, tee(data).id, ["size", "color"]);
  const attributes = variants.productPricingAttributes(withColor, tee(data));
  const rows = variants.variantRows(withColor, tee(data)).slice(0, 2);
  const csv = variants.buildVariantCsv(attributes, rows);
  const [header, first] = csv.split("\n");
  assert.equal(header, "Specification,Color,Size,Status,MMK Price,USD Price,Availability,SKU,Updated At");
  assert.equal(first.split(",").slice(1, 4).join(","), `${rows[0].options.color},${rows[0].options.size},${rows[0].status}`, "the row carries its own spec and status");
  assert.equal(first.split(",")[6], "Available", "the CSV carries the availability");
});

test("the screen keeps the spec's controls and reads the shared variant model", () => {
  const screen = read("apps/web/src/components/admin/AdminPricingManagement.tsx");
  for (const label of ["Overview", "Product Pricing", "Price Table", "Price History", "Attribute Management"]) {
    assert.match(screen, new RegExp(label), `${label} is in the navigation`);
  }
  assert.match(screen, /data-pricing-variant-row=/, "a table row per variant");
  assert.match(screen, /data-pricing-matrix\b/, "the matrix view is rendered");
  assert.match(screen, /data-pricing-table-view\b/, "the table view is rendered");
  assert.match(screen, /data-pricing-usd=/, "the table edits the USD price beside the MMK one");
  assert.match(screen, /data-pricing-availability=/, "availability is edited per variant");
  assert.match(screen, /data-pricing-matrix-kmk=/, "each matrix cell holds the MMK price");
  assert.match(screen, /data-pricing-matrix-usd=/, "each matrix cell holds the USD price");
  assert.match(screen, /data-pricing-view=/, "the spec's views are the switch");
  assert.match(screen, /data-pricing-stock-tracking/, "stock tracking is opt-in per product");
  for (const label of ["All prices", "Matrix", "Missing prices", "Out of stock", "Disabled variants"]) {
    assert.match(screen, new RegExp(label), `${label} is one of the views`);
  }
  assert.match(screen, /Add product pricing/, "the add button is present");
  assert.doesNotMatch(screen, /derived|surcharge/i, "prices are manual, never derived");
});

test("MMK and USD are stored separately and neither is converted from the other", () => {
  const data = admin.createAdminDemoData(Date.now());
  const row = variants.variantRows(data, tee(data)).find((entry) => entry.size === "M");
  assert.equal(typeof row.priceUsd, "number", "the seed carries a dollar price");
  const saved = variants.saveVariantChanges(
    data, tee(data).id, [{ options: row.options, size: "M", priceKs: 13_500, priceUsd: 6.4, expectedVersion: row.version }], "Owner", "2026-11-21T10:00:00.000Z",
  );
  const after = variants.variantRows(saved.data, tee(data)).find((entry) => entry.size === "M");
  assert.equal(after.priceKs, 13_500);
  assert.equal(after.priceUsd, 6.4, "the dollar price is the one typed, not 13500/2100");
  assert.deepEqual(
    [saved.data.priceHistory.at(-1).oldPriceUsd, saved.data.priceHistory.at(-1).newPriceUsd],
    [row.priceUsd, 6.4],
    "the history records both currencies",
  );
});

test("a variant with one currency missing is Missing Price and cannot be sold", () => {
  const data = admin.createAdminDemoData(Date.now());
  const row = variants.variantRows(data, tee(data)).find((entry) => entry.size === "L");
  const saved = variants.saveVariantChanges(
    data, tee(data).id, [{ options: row.options, size: "L", priceUsd: null, expectedVersion: row.version }], "Owner", "2026-11-21T10:00:00.000Z",
  );
  const after = variants.variantRows(saved.data, tee(data)).find((entry) => entry.size === "L");
  assert.equal(after.priceUsd, null);
  assert.equal(variants.hasFullPrice(after), false);
  assert.equal(variants.variantSellable(after), false, "both currencies are needed before it sells");
  assert.equal(variants.pricingOverview(saved.data).missingUsd, 1);
});

test("availability is separate from status: Active can be out of stock, Disabled is never sold", () => {
  const data = admin.createAdminDemoData(Date.now());
  const row = variants.variantRows(data, tee(data)).find((entry) => entry.size === "XL");
  const out = variants.saveVariantChanges(
    data, tee(data).id,
    [{ options: row.options, size: "XL", availability: "Out of Stock", expectedVersion: row.version }],
    "Owner", "2026-11-21T10:00:00.000Z",
  );
  const after = variants.variantRows(out.data, tee(data)).find((entry) => entry.size === "XL");
  assert.equal(after.status, "Active", "the status is untouched");
  assert.equal(after.effectiveAvailability, "Out of Stock");
  assert.equal(variants.variantSellable(after), false);
  assert.equal(out.data.priceHistory.at(-1).newAvailability, "Out of Stock", "the switch is in the history");

  const disabled = variants.setProductAvailability(out.data, tee(data).id, "Disabled");
  assert.equal(variants.variantRows(disabled, tee(data)).every((entry) => entry.effectiveAvailability === "Disabled"), true, "a product switch covers every variant");
});

test("switching an option off stops only the variants that carry it", () => {
  const data = admin.createAdminDemoData(Date.now());
  const withColor = variants.setProductAttributes(data, tee(data).id, ["size", "color"]);
  const switched = variants.setOptionAvailability(withColor, tee(data).id, "color", "White", "Disabled");
  const rows = variants.variantRows(switched, tee(data));
  assert.equal(rows.filter((row) => row.options.color === "White").every((row) => row.effectiveAvailability === "Disabled"), true);
  assert.equal(rows.filter((row) => row.options.color !== "White").every((row) => row.effectiveAvailability === "Available"), true, "other colours still sell");
});

test("stock tracking zeroes availability when the quantity runs out", () => {
  const data = admin.createAdminDemoData(Date.now());
  const withStock = variants.setStockTracking(data, tee(data).id, true);
  const row = variants.variantRows(withStock, tee(data)).find((entry) => entry.size === "S");
  const saved = variants.saveVariantChanges(
    withStock, tee(data).id,
    [{
      options: row.options, size: "S", expectedVersion: row.version,
      stock: { tracking: true, quantity: 0, lowThreshold: 5, restockQuantity: 20 },
    }],
    "Owner", "2026-11-21T10:00:00.000Z",
  );
  const after = variants.variantRows(saved.data, tee(data)).find((entry) => entry.size === "S");
  assert.equal(after.stock.quantity, 0);
  assert.equal(after.effectiveAvailability, "Out of Stock", "zero stock reads as out of stock");

  const restocked = variants.saveVariantChanges(
    saved.data, tee(data).id,
    [{
      options: row.options, size: "S", expectedVersion: after.version,
      stock: { tracking: true, quantity: 12, lowThreshold: 5, restockQuantity: 20 },
    }],
    "Owner", "2026-11-21T10:05:00.000Z",
  );
  assert.equal(variants.variantRows(restocked.data, tee(data)).find((entry) => entry.size === "S").effectiveAvailability, "Available");
});

test("the Table View filters combine availability, status, missing price and ranges", () => {
  const data = admin.createAdminDemoData(Date.now());
  const row = variants.variantRows(data, tee(data)).find((entry) => entry.size === "M");
  const out = variants.saveVariantChanges(
    data, tee(data).id, [{ options: row.options, size: "M", availability: "Out of Stock", expectedVersion: row.version }], "Owner", "2026-11-21T10:00:00.000Z",
  );
  const rows = variants.variantRows(out.data, tee(data));
  assert.deepEqual(variants.filterVariants(rows, { availability: "Out of Stock" }).map((entry) => entry.size), ["M"]);
  assert.equal(variants.filterVariants(rows, { minKs: 17_000 }).every((entry) => entry.priceKs >= 17_000), true);
  assert.equal(variants.filterVariants(rows, { maxUsd: 4.2 }).length, 3, "3.80, 4.00, 4.20");
  assert.equal(variants.filterVariants(rows, { missingPrice: true }).length, 0, "the seed prices both currencies");
});

test("the Table View sorts by MMK, USD and Updated At", () => {
  const data = admin.createAdminDemoData(Date.now());
  const row = variants.variantRows(data, tee(data)).find((entry) => entry.size === "XL");
  const saved = variants.saveVariantChanges(
    data, tee(data).id, [{ options: row.options, size: "XL", priceKs: 9_000, priceUsd: 2.5, expectedVersion: row.version }], "Owner", "2026-11-21T11:00:00.000Z",
  );
  const rows = variants.variantRows(saved.data, tee(data));
  assert.equal(variants.sortVariants(rows, "mmk-asc")[0].size, "XL", "the cheapest Ks price first");
  assert.equal(variants.sortVariants(rows, "usd-desc")[0].size, "2XL");
  assert.equal(variants.sortVariants(rows, "updated")[0].size, "XL", "the last edit first");
});

test("USD input takes two decimals and refuses anything else", () => {
  assert.deepEqual(variants.parseUsdInput("$3.80"), { ok: true, value: 3.8 });
  assert.deepEqual(variants.parseUsdInput("3.8"), { ok: true, value: 3.8 });
  assert.equal(variants.parseUsdInput("3.805").ok, false);
  assert.equal(variants.parseUsdInput("0").ok, false);
  assert.equal(variants.parseUsdInput("abc").ok, false);
});
