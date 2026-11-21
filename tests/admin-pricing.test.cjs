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

const admin = loadModule("apps/web/src/lib/admin-demo-data.ts");
const combos = loadModule("apps/web/src/lib/pricing-combinations.ts");
const pricing = loadModule("apps/web/src/lib/admin-pricing.ts");

const NOW = Date.UTC(2026, 10, 21, 9, 0, 0);
const AT = new Date(NOW).toISOString();
const data = admin.createAdminDemoData(NOW);
const peacock = { kind: "post", id: "post-peacock-line" };

test("price input accepts the three shapes from the spec and rejects everything else", () => {
  for (const raw of ["24000", "24,000", "Ks 24000", "Ks 24,000", "ks.24,000"]) {
    assert.deepEqual(combos.parsePriceInput(raw), { ok: true, value: 24000 }, raw);
  }
  for (const raw of ["", "  ", "0", "-5", "abc", "24,000.50", "10,000,000", "9,999,9999"]) {
    assert.equal(combos.parsePriceInput(raw).ok, false, raw);
  }
  assert.equal(combos.parsePriceInput("0").error, "Prices must be more than Ks 0.");
  assert.match(combos.parsePriceInput("10000000").error, /under 9,999,999 Ks/);
  assert.equal(combos.formatPriceInput(24000), "24,000");
  assert.equal(combos.formatPriceInput(null), "");
});

test("the cascade decides which combinations exist", () => {
  assert.equal(combos.isValidCombination({ print: "Sublimation", material: "Combed Cotton" }), false);
  assert.equal(combos.isValidCombination({ print: "Sublimation", material: "Polyester" }), true);
  assert.equal(combos.isValidCombination({ material: "Polyester", knit: "Single Jersey" }), false);
  assert.equal(combos.isValidCombination({ material: "Polyester", knit: "Interlock" }), true);
  assert.equal(combos.isValidCombination({ material: "Combed Cotton", knit: "Single Jersey" }), true);
  assert.equal(combos.isValidCombination({ size: "M" }), true);
});

test("every valid combination appears exactly once and none is invalid", () => {
  const rows = pricing.scopeRows(data, peacock);
  const keys = new Set(rows.map((row) => row.key));
  assert.equal(keys.size, rows.length, "duplicate combination row");
  for (const row of rows) assert.equal(combos.isValidCombination(row.options), true, JSON.stringify(row.options));
  // 4 sizes x 2 fabrics x 1 fit x 3 colours x 2 prints = 48, minus the 24 Sublimation/cotton rows.
  assert.equal(rows.length, 24);
  const attributes = pricing.scopeAttributes(data, peacock);
  assert.deepEqual(attributes.map((attribute) => attribute.label), ["Size", "Fabric Type", "Fit Type", "Color", "Print Method"]);
  assert.equal(combos.combinationLabel(attributes, rows[0].options).split(" · ").length, 5);
});

test("a product prices one row per stocked size", () => {
  const product = data.products.find((entry) => entry.category === "T-Shirt");
  const scope = { kind: "product", id: product.id };
  const rows = pricing.scopeRows(data, scope);
  assert.deepEqual(rows.map((row) => row.options.size), product.sizes);
  const prices = pricing.scopePrices(data, scope);
  for (const row of rows) assert.equal(prices.get(row.key), product.priceKs);
});

test("grid row keys are the keys the price map and version map use", () => {
  const rows = pricing.scopeRows(data, peacock);
  const prices = pricing.scopePrices(data, peacock);
  const versions = pricing.scopeVersions(data, peacock);
  const priced = rows.filter((row) => prices.has(row.key));
  assert.equal(priced.length, 5, "the seed prices five combinations");
  for (const row of priced) assert.equal(typeof versions.get(row.key), "number");
});

test("saving a price writes the row, bumps its version and records history", () => {
  const rows = pricing.scopeRows(data, peacock);
  const unpriced = rows.find((row) => !pricing.scopePrices(data, peacock).has(row.key));
  const result = pricing.applyPriceChanges(data, peacock, [{
    key: unpriced.key, options: unpriced.options, priceKs: 26500, expectedVersion: 1,
  }], "Admin Test", AT);

  assert.equal(result.applied, 1);
  assert.deepEqual(result.conflicts, []);
  const post = result.data.tshirtPosts.find((entry) => entry.id === peacock.id);
  const stored = post.prices.find((row) => pricing.scopePrices({ ...result.data, tshirtPosts: [post] }, peacock).size >= 0
    && Object.entries(unpriced.options).every(([key, value]) => row.options[key] === value));
  assert.equal(stored.priceKs, 26500);
  assert.equal(stored.version, 1);
  assert.equal(stored.updatedBy, "Admin Test");
  assert.equal(pricing.scopePrices(result.data, peacock).get(unpriced.key), 26500);

  const history = pricing.scopeHistory(result.data, peacock);
  assert.equal(history.length, 1);
  assert.equal(history[0].oldPriceKs, null);
  assert.equal(history[0].newPriceKs, 26500);
  assert.equal(history[0].actor, "Admin Test");
  assert.deepEqual(history[0].options, unpriced.options);
});

test("a stale save is rejected instead of overwriting another admin's change", () => {
  const rows = pricing.scopeRows(data, peacock);
  const priced = rows.find((row) => pricing.scopePrices(data, peacock).has(row.key));
  const first = pricing.applyPriceChanges(data, peacock, [{
    key: priced.key, options: priced.options, priceKs: 30000, expectedVersion: 1,
  }], "Admin A", AT);
  const stale = pricing.applyPriceChanges(first.data, peacock, [{
    key: priced.key, options: priced.options, priceKs: 31000, expectedVersion: 1,
  }], "Admin B", AT);

  assert.equal(stale.applied, 0);
  assert.deepEqual(stale.conflicts, [priced.key]);
  assert.equal(pricing.scopePrices(stale.data, peacock).get(priced.key), 30000);
  assert.equal(pricing.scopeHistory(stale.data, peacock).length, 1);
});

test("product scope saves bump the row version and keep one row per size", () => {
  const product = data.products[0];
  const scope = { kind: "product", id: product.id };
  const rows = pricing.scopeRows(data, scope);
  const versions = pricing.scopeVersions(data, scope);
  const result = pricing.applyPriceChanges(data, scope, [{
    key: rows[0].key, options: rows[0].options, priceKs: product.priceKs + 1000, expectedVersion: versions.get(rows[0].key),
  }], "Admin Test", AT);

  assert.equal(result.applied, 1);
  const saved = result.data.productPrices.filter((row) => row.productId === product.id);
  assert.equal(saved.length, product.sizes.length, "no duplicate size rows");
  const changed = saved.find((row) => row.size === rows[0].options.size);
  assert.equal(changed.priceKs, product.priceKs + 1000);
  assert.equal(changed.version, 2);
  assert.equal(changed.updatedBy, "Admin Test");
});

test("CSV export then import of an unchanged file produces zero changes", () => {
  const rows = pricing.scopeRows(data, peacock);
  const prices = pricing.scopePrices(data, peacock);
  const csv = combos.buildPricingCsv(pricing.scopeAttributes(data, peacock), rows, prices);
  assert.ok(csv.startsWith("\uFEFF"), "Excel needs the BOM for Myanmar text");
  const header = csv.replace(/^\uFEFF/, "").split("\n")[0];
  assert.equal(header, "Size,Fabric Type,Fit Type,Color,Print Method,Price");

  const parsed = combos.parsePricingCsv(csv, pricing.scopeAttributes(data, peacock), rows, prices);
  assert.deepEqual(parsed.issues, []);
  assert.equal(parsed.rows.length, rows.length);
  // Unpriced rows export with an empty Price cell, so re-importing them is "unchanged" too.
  assert.equal(parsed.rows.filter((row) => row.status === "same").length, rows.length);
  assert.equal(parsed.rows.filter((row) => row.status === "invalid").length, 0);
  assert.equal(combos.importChanges(parsed.rows).length, 0);
});

test("CSV import classifies new, changed, unchanged and invalid rows with a reason", () => {
  const attributes = pricing.scopeAttributes(data, peacock);
  const rows = pricing.scopeRows(data, peacock);
  const prices = pricing.scopePrices(data, peacock);
  const priced = rows.find((row) => prices.has(row.key));
  const unpriced = rows.find((row) => !prices.has(row.key));
  const csv = [
    "Size,Fabric Type,Fit Type,Color,Print Method,Price",
    `${priced.options.size},${priced.options.material},${priced.options.fit},${priced.options.color},${priced.options.print},"27,500"`,
    `${unpriced.options.size},${unpriced.options.material},${unpriced.options.fit},${unpriced.options.color},${unpriced.options.print},Ks 28,000`,
    `${unpriced.options.size},${unpriced.options.material},${unpriced.options.fit},${unpriced.options.color},${unpriced.options.print},29000`,
    `S,Polyester,Regular,Black,Sublimation,24000`,
    `XL,Combed Cotton,Regular,White,DTF,0`,
    `XL,Combed Cotton,Regular,Sand,DTF,not a price`,
  ].join("\n");
  const parsed = combos.parsePricingCsv(csv, attributes, rows, prices);
  const byStatus = (status) => parsed.rows.filter((row) => row.status === status);

  assert.equal(byStatus("change").length, 1, "an existing price that differs is a change");
  assert.equal(byStatus("new").length, 1, "an unpriced combination becomes new");
  assert.equal(byStatus("invalid").length, 4);
  assert.match(byStatus("invalid")[0].reason, /Duplicate/);
  assert.match(byStatus("invalid")[1].reason, /No such combination/);
  assert.match(byStatus("invalid")[2].reason, /more than Ks 0/);
  assert.match(byStatus("invalid")[3].reason, /whole Ks numbers/);
  assert.equal(combos.importChanges(parsed.rows).length, 2, "only new and changed rows are written");
});

test("a CSV without the attribute columns is rejected with a reason", () => {
  const attributes = pricing.scopeAttributes(data, peacock);
  const rows = pricing.scopeRows(data, peacock);
  const parsed = combos.parsePricingCsv("Size,Price\nM,24000\n", attributes, rows, pricing.scopePrices(data, peacock));
  assert.equal(parsed.rows.length, 0);
  assert.ok(parsed.issues.some((issue) => /no Fabric Type column/.test(issue)));
});

test("seeded post prices are all valid combinations", () => {
  for (const post of data.tshirtPosts) {
    for (const row of post.prices) {
      assert.equal(combos.isValidCombination(row.options), true, `${post.id} ${row.id} violates the cascade`);
    }
  }
});

test("the Pricing module is registered and routed", () => {
  assert.ok(admin.ADMIN_MODULES.some((module) => module.id === "pricing" && module.label === "Pricing"));
  const shell = readFileSync(path.join(__dirname, "..", "apps/web/src/components/admin/AdminShell.tsx"), "utf8");
  assert.match(shell, /id: "pricing", label: "Pricing", href: "\/admin\/pricing"/);
  assert.ok(existsSync(path.join(__dirname, "..", "apps/web/src/app/admin/pricing/page.tsx")));
});

test("the web grid keeps the spec's controls and no derived-delta tools", () => {
  const source = readFileSync(path.join(__dirname, "..", "apps/web/src/components/admin/AdminPricing.tsx"), "utf8");
  for (const marker of [
    "data-price-row",
    "data-pricing-filtered-count",
    "data-pricing-dirty-count",
    "data-pricing-message",
    "Unpriced only",
    "Set exact price",
    "Copy from first row",
    "will change — save to apply",
    "unsaved change",
    "Export filtered rows as CSV",
    "Import a price CSV",
    "CSV import preview",
    "Nothing is written until you confirm.",
    "Price history",
    'aria-label="Pricing scope"',
    'aria-label="Select all filtered rows"',
  ]) {
    assert.ok(source.includes(marker), `AdminPricing is missing ${marker}`);
  }
  assert.equal(/percentage|\+\/-/.test(source), false, "the spec forbids percentage and +/- bulk tools");
  assert.match(source, /sticky top-0/, "the header stays visible while scrolling");
  assert.match(source, /sticky left-0/, "the first column stays visible while scrolling");
});
