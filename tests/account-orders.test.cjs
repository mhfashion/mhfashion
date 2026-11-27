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
  const localRequire = (id) => (id.startsWith("@/") ? loadModule(`apps/web/src/${id.slice(2)}.ts`) : require(id));
  new Function("module", "exports", "require", compiled)(loaded, loaded.exports, localRequire);
  return loaded.exports;
}

const myOrdersLib = loadModule("apps/web/src/lib/my-orders.ts");
const read = (relativePath) => readFileSync(path.join(__dirname, "..", relativePath), "utf8");

const item = (overrides = {}) => ({ productId: "p1", name: "Butterfly Effect", size: "M", color: "Black", quantity: 2, unitPriceKs: 21000, ...overrides });
const order = (overrides = {}) => ({
  id: "#MH1001",
  customerName: "Min Thu Aung",
  customerEmail: "",
  customerPhone: "09123456789",
  items: [item()],
  stage: "Pending Payment",
  payment: "KBZPay",
  placedAt: "2026-09-01T18:00:00.000Z",
  note: "",
  ...overrides,
});

test("only orders this browser created count as mine", () => {
  const seeded = order({ id: "#MH0001", checkoutKey: undefined });
  const mine = order({ id: "#MH1002", checkoutKey: "key-1" });
  const older = order({ id: "#MH1003", checkoutKey: "key-2", placedAt: "2026-08-01T10:00:00.000Z" });
  const newer = order({ id: "#MH1004", checkoutKey: "key-3", placedAt: "2026-10-01T10:00:00.000Z" });

  assert.equal(myOrdersLib.isCheckoutOrder(seeded), false, "the admin demo seed must not be shown as the customer's order");
  assert.equal(myOrdersLib.isCheckoutOrder(mine), true);

  const mineOnly = myOrdersLib.myOrders([seeded, older, mine, newer]);
  assert.deepEqual(mineOnly.map((entry) => entry.id), ["#MH1004", "#MH1002", "#MH1003"], "newest first, seed dropped");

  const input = [seeded, older, newer];
  myOrdersLib.myOrders(input);
  assert.deepEqual(input.map((entry) => entry.id), ["#MH0001", "#MH1003", "#MH1004"], "the admin's own order must not be reordered in place");
});

test("units and total come from the lines that were bought", () => {
  const placed = order({ items: [item({ quantity: 2, unitPriceKs: 21000 }), item({ productId: "p2", name: "Void Hoodie", quantity: 1, unitPriceKs: 32000 })] });
  assert.equal(myOrdersLib.orderUnits(placed), 3);
  assert.equal(myOrdersLib.orderTotalKs(placed), 74000);
  assert.equal(myOrdersLib.orderUnits(order({ items: [item({ quantity: 0 })] })), 1, "a stored 0 still counts as one item");
});

test("the date is printed in Yangon time and never as Invalid Date", () => {
  assert.equal(myOrdersLib.formatOrderDate("2026-09-01T18:00:00.000Z"), "2 Sep 2026");
  assert.equal(myOrdersLib.formatOrderDate("2026-09-01T10:00:00.000Z"), "1 Sep 2026");
  assert.equal(myOrdersLib.formatOrderDate("not a date"), "—");
  assert.equal(myOrdersLib.formatOrderDate(""), "—");
});

test("every stage gets a badge tone and the stopped ones read red", () => {
  const { ADMIN_ORDER_STAGES } = loadModule("apps/web/src/lib/admin-demo-data.ts");
  const tones = ADMIN_ORDER_STAGES.map((stage) => myOrdersLib.orderStageTone(stage));
  assert.ok(tones.every((tone) => ["green", "yellow", "blue", "red", "slate"].includes(tone)), tones.join(","));
  assert.equal(myOrdersLib.orderStageTone("Delivered"), "green");
  assert.equal(myOrdersLib.orderStageTone("Pending Payment"), "yellow");
  assert.equal(myOrdersLib.orderStageTone("Printing"), "blue");
  assert.equal(myOrdersLib.orderStageTone("Out for Delivery"), "slate");
  assert.equal(myOrdersLib.orderStageTone("Cancelled"), "red");
  assert.equal(myOrdersLib.orderStageTone("Refunded"), "red");
  for (const tone of Object.values(myOrdersLib.STAGE_TONE_CLASS)) assert.ok(tone.length > 0);
});

test("the line detail lists the variant without printing empty slots", () => {
  assert.equal(myOrdersLib.orderItemDetail(item({ gsm: 180, material: "Cotton", fit: "Regular", sleeve: "Short" })), "M · Black · Cotton · 180 GSM · Regular · Short");
  assert.equal(myOrdersLib.orderItemDetail(item({ size: "-", color: "", material: undefined, gsm: null, fit: undefined, sleeve: undefined })), "");
});

test("the account page reads the store instead of inventing orders", () => {
  const page = read("apps/web/src/app/account/page.tsx");
  assert.match(page, /useAdminDemoData\(\)/);
  assert.match(page, /myOrders\(store\.orders\)/);
  assert.match(page, /data-account-orders/);
  assert.match(page, /data-account-orders-empty/);
  assert.match(page, /data-account-order=\{order\.id\}/);
  assert.match(page, /data-order-stage=\{stage\}/);
  assert.match(page, /value=\{String\(orders\.length\)\}/, "the dashboard counter must be the real order count");
  assert.ok(!/#MH20250|const ORDERS/.test(page), "the invented order list must stay deleted");
});

test("the account dashboard has no wallet: customers cannot top up", () => {
  const page = readFileSync(path.join(__dirname, "..", "apps/web/src/app/account/page.tsx"), "utf8");
  assert.doesNotMatch(page, /Wallet Balance/, "no wallet balance card");
  assert.doesNotMatch(page, /ပိုက်ဆံအိတ်လက်ကျန်/, "no wallet label in the Myanmar copy");
  assert.doesNotMatch(page, /Icon=\{Wallet\}/, "no wallet stat card");
  const statRow = page.match(/<section className="mb-6 grid gap-3 ([^"]+)">/);
  assert.ok(statRow, "the dashboard still renders its stat row");
  assert.match(statRow[1], /xl:grid-cols-3/, "three cards fill the row");
});
