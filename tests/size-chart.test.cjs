const assert = require("node:assert/strict");
const test = require("node:test");
const { loadModule } = require("./helpers/load-ts-module.cjs");

const chart = loadModule("apps/web/src/lib/size-chart.ts");
const admin = loadModule("apps/web/src/lib/admin-demo-data.ts");

const SIZES = ["S", "M", "L"];

test("the catalog starts with no measurements, not with guessed ones", () => {
  const seeded = admin.createAdminDemoData(Date.UTC(2026, 10, 21, 9));
  for (const product of seeded.products) {
    assert.ok(chart.sizeChartIsEmpty(product.sizeChart), `${product.id} must not invent a chart`);
    assert.deepEqual(chart.sizeChartRows(product.sizeChart, product.sizes), []);
  }
});

test("a cell is stored in half centimetres and cleared by a blank", () => {
  let entry = chart.setSizeChartCell({}, "M", "chest", 51.2);
  assert.deepEqual(entry, { M: { chest: 51 } }, "51.2 rounds to the nearest half centimetre");
  entry = chart.setSizeChartCell(entry, "M", "length", 70.9);
  assert.deepEqual(entry, { M: { chest: 51, length: 71 } });
  entry = chart.setSizeChartCell(entry, "M", "chest", null);
  assert.deepEqual(entry, { M: { length: 71 } }, "a blank clears only its own cell");
  entry = chart.setSizeChartCell(entry, "M", "length", 0);
  assert.deepEqual(entry, {}, "an emptied size disappears rather than showing a zero");
});

test("a nonsense value is dropped, not printed", () => {
  assert.deepEqual(chart.normalizeSizeChart({ M: { chest: -4, length: 999, sleeve: 20 } }), { M: { sleeve: 20 } });
  assert.deepEqual(chart.normalizeSizeChart({ M: { chest: "51" } }), {}, "a string is not a measurement");
  assert.deepEqual(chart.normalizeSizeChart(null), {});
  assert.deepEqual(chart.normalizeSizeChart([]), {});
  assert.deepEqual(chart.normalizeSizeChart({ "  ": { chest: 50 } }), {}, "a blank size label is not a size");
});

test("rows follow the product's size order and skip sizes with nothing measured", () => {
  const stored = chart.normalizeSizeChart({ L: { chest: 56 }, S: { chest: 48, length: 66 }, XL: { chest: 60 } });
  const rows = chart.sizeChartRows(stored, SIZES);
  assert.deepEqual(rows.map((row) => row.size), ["S", "L"], "M is unmeasured and XL is not in this product's run");
  assert.equal(rows[0].complete, false, "S has no shoulder or sleeve yet");
  const full = chart.normalizeSizeChart({ S: { chest: 48, length: 66, shoulder: 42, sleeve: 20 } });
  assert.equal(chart.sizeChartRows(full, SIZES)[0].complete, true);
});

test("only the measures a chart fills become columns", () => {
  const stored = chart.normalizeSizeChart({ "One size": { chest: 54, length: 28 } });
  assert.deepEqual(chart.sizeChartMeasures(stored), ["chest", "length"], "a cap has no sleeve column");
  assert.deepEqual(chart.sizeChartMeasures({}), []);
});

test("inches are derived from the stored centimetres", () => {
  assert.equal(chart.cmToInches(50.8), 20);
  assert.equal(chart.cmToInches(52), 20.5);
  assert.equal(chart.inchesToCm(20), 51, "20 in is 50.8 cm, which the tape grid stores as 51");
  assert.equal(chart.formatMeasure(52, "cm"), "52 cm");
  assert.equal(chart.formatMeasure(52, "in"), "20.5 in");
});

test("the product drawer keeps a chart through a save", () => {
  const seeded = admin.createAdminDemoData(Date.UTC(2026, 10, 21, 9));
  const product = seeded.products.find((entry) => entry.id === "product-classic-tee");
  const draft = admin.productDraftFrom(product);
  const saved = admin.productFromDraft(draft, product);
  const withChart = { ...saved, sizeChart: chart.normalizeSizeChart({ M: { chest: 52, length: 71 } }) };
  const stored = admin.upsertProduct(seeded, withChart);
  const read = stored.products.find((entry) => entry.id === "product-classic-tee");
  assert.deepEqual(read.sizeChart, { M: { chest: 52, length: 71 } });
  assert.deepEqual(chart.sizeChartRows(read.sizeChart, read.sizes).map((row) => row.size), ["M"]);
});
