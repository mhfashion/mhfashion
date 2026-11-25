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
  const localRequire = (id) => (id.startsWith("@/") ? loadModule(`apps/web/src/${id.slice(2)}.ts`) : require(id));
  new Function("module", "exports", "require", compiled)(loaded, loaded.exports, localRequire);
  return loaded.exports;
}

const admin = loadModule("apps/web/src/lib/admin-demo-data.ts");
const settle = loadModule("apps/web/src/lib/admin-settlements.ts");

const NOW = Date.UTC(2026, 10, 21, 9, 0, 0);
const data = admin.createAdminDemoData(NOW);
const AT = "2026-11-21T10:00:00.000Z";

test("every handed-to-delivery order seeds one delivery row with a fee and a cost", () => {
  const handed = data.orders.filter((order) => ["Handed to Delivery", "Out for Delivery", "Delivered", "Refunded"].includes(order.stage));
  assert.equal(data.deliveries.length, handed.length);
  assert.ok(data.deliveries.length > 10);
  for (const delivery of data.deliveries) {
    assert.ok(delivery.feeKs > 0 && delivery.costKs > 0, delivery.id);
    assert.ok(admin.ADMIN_COURIERS.includes(delivery.courier));
    assert.ok(handed.some((order) => order.id === delivery.orderId), "every row belongs to a real order");
  }
  assert.ok(data.deliveries.some((delivery) => delivery.status === "Returned"), "returns are represented");
});

test("totals add fee, cost, margin and the open balance", () => {
  const totals = settle.settlementTotals(data.deliveries);
  assert.equal(totals.rows, data.deliveries.length);
  assert.equal(totals.feeKs, data.deliveries.reduce((sum, delivery) => sum + delivery.feeKs, 0));
  assert.equal(totals.marginKs, totals.feeKs - totals.costKs);
  assert.equal(totals.openKs + totals.settledKs, totals.costKs, "every cost is either open or settled");
  assert.equal(totals.returned, data.deliveries.filter((delivery) => delivery.status === "Returned").length);
});

test("filters narrow by period, courier, status, settlement state and search", () => {
  const courier = data.deliveries[0].courier;
  const byCourier = settle.filterDeliveries(data.deliveries, { courier });
  assert.ok(byCourier.length > 0);
  assert.ok(byCourier.every((delivery) => delivery.courier === courier));

  const open = settle.filterDeliveries(data.deliveries, { settled: "open" });
  const settled = settle.filterDeliveries(data.deliveries, { settled: "settled" });
  assert.equal(open.length + settled.length, data.deliveries.length);
  assert.ok(open.every((delivery) => !delivery.settledAt));
  assert.ok(settled.every((delivery) => delivery.settledAt));

  const returned = settle.filterDeliveries(data.deliveries, { status: "Returned" });
  assert.ok(returned.every((delivery) => delivery.status === "Returned"));

  const order = data.deliveries[0].orderId;
  assert.deepEqual(settle.filterDeliveries(data.deliveries, { search: order.toLowerCase() }).map((delivery) => delivery.orderId), [order]);

  const range = settle.periodRange(7, new Date(NOW));
  const recent = settle.filterDeliveries(data.deliveries, range);
  assert.ok(recent.every((delivery) => delivery.handedAt.slice(0, 10) >= range.from && delivery.handedAt.slice(0, 10) <= range.to));
  assert.equal(settle.periodRange(7, new Date(NOW)).to, "2026-11-21");
});

test("per-courier subtotals follow the courier list and add up to the total", () => {
  const couriers = settle.courierTotals(data.deliveries);
  const order = admin.ADMIN_COURIERS.filter((courier) => couriers.some((entry) => entry.courier === courier));
  assert.deepEqual(couriers.map((entry) => entry.courier), order);
  const totals = settle.settlementTotals(data.deliveries);
  assert.equal(couriers.reduce((sum, entry) => sum + entry.feeKs, 0), totals.feeKs);
  assert.equal(couriers.reduce((sum, entry) => sum + entry.openKs, 0), totals.openKs);
});

test("settling is idempotent and reopening clears the stamp", () => {
  const open = data.deliveries.filter((delivery) => !delivery.settledAt);
  assert.ok(open.length > 0);
  const result = settle.markDeliveriesSettled(data, [open[0].id], "Admin Test", AT);
  assert.equal(result.settled, 1);
  assert.equal(result.skipped, 0);
  const stamped = result.data.deliveries.find((delivery) => delivery.id === open[0].id);
  assert.equal(stamped.settledAt, AT);
  assert.equal(stamped.settledBy, "Admin Test");
  assert.equal(data.deliveries.find((delivery) => delivery.id === open[0].id).settledAt, null, "input is not mutated");

  const again = settle.markDeliveriesSettled(result.data, [open[0].id], "Someone Else", "2026-11-22T10:00:00.000Z");
  assert.equal(again.settled, 0);
  assert.equal(again.skipped, 1);
  assert.equal(again.data.deliveries.find((delivery) => delivery.id === open[0].id).settledAt, AT, "the first stamp wins");

  const reopened = settle.unsettleDeliveries(result.data, [open[0].id]);
  assert.equal(reopened.deliveries.find((delivery) => delivery.id === open[0].id).settledAt, null);
});

test("the CSV carries every row, the total and one subtotal per courier", () => {
  const csv = settle.buildSettlementCsv(data.deliveries);
  const lines = csv.replace(/^\uFEFF/, "").split("\n");
  assert.match(lines[0], /^Order,Courier,Township,Handed,Status,Shipping fee \(Ks\),Courier cost \(Ks\),Margin \(Ks\),Settled,Settled by,Settled at$/);
  assert.equal(lines.filter((line) => line.startsWith("#MH")).length, data.deliveries.length);
  assert.match(lines.find((line) => line.startsWith("Total,")), new RegExp(`,${settle.settlementTotals(data.deliveries).feeKs},`));
  assert.equal(lines.filter((line) => line.startsWith("Subtotal ")).length, settle.courierTotals(data.deliveries).length);
});

test("a returned delivery with a cost above its fee shows a negative margin", () => {
  const loss = { ...data.deliveries[0], feeKs: 1000, costKs: 2500, status: "Returned" };
  assert.equal(settle.settlementMargin(loss), -1500);
  const totals = settle.settlementTotals([loss]);
  assert.equal(totals.marginKs, -1500);
  assert.equal(totals.returned, 1);
});

test("Delivery Settlement is registered, routed and states the settle-once rule", () => {
  assert.ok(admin.ADMIN_MODULES.some((module) => module.id === "settlements" && module.label === "Settlements"));
  // The shell's sidebar and the storefront menu share one list.
  const shell = readFileSync(path.join(__dirname, "..", "apps/web/src/components/admin/AdminShell.tsx"), "utf8");
  const nav = readFileSync(path.join(__dirname, "..", "apps/web/src/lib/admin-nav.ts"), "utf8");
  assert.match(shell, /ADMIN_NAV\.map\(\(entry\) => \(/);
  assert.match(nav, /id: "settlements", label: "Settlements", href: "\/admin\/settlements"/);
  assert.ok(existsSync(path.join(__dirname, "..", "apps/web/src/app/admin/settlements/page.tsx")));
  const source = readFileSync(path.join(__dirname, "..", "apps/web/src/components/admin/AdminSettlements.tsx"), "utf8");
  for (const marker of [
    "data-settlement-count",
    "data-settlement-message",
    'aria-label="Settlement period"',
    'aria-label="Settlement courier"',
    'aria-label="Settlement status"',
    'aria-label="Settlement state"',
    'aria-label="Mark the selected deliveries settled"',
    'aria-label="Reopen the selected settled deliveries"',
    "A row settles once",
    "negative margin",
  ]) {
    assert.ok(source.includes(marker), `AdminSettlements is missing ${marker}`);
  }
});
