const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { loadModule } = require("./helpers/load-ts-module.cjs");



const admin = loadModule("apps/web/src/lib/admin-demo-data.ts");

const NOW = new Date(2026, 10, 21, 9, 0, 0).getTime();

function order(overrides) {
  return {
    id: "#MH1",
    customerName: "Thura Aung",
    customerEmail: "thura.aung@example.com",
    customerPhone: "+95 9 771 220 431",
    items: [{ productId: "product-classic-tee", name: "Classic T-shirt", size: "M", color: "Black", quantity: 2, unitPriceKs: 21000 }],
    stage: "Processing",
    payment: "KBZPay",
    placedAt: new Date(NOW).toISOString(),
    note: "",
    ...overrides,
  };
}

const at = (dayOffset, hour = 10) => new Date(2026, 10, 21 - dayOffset, hour, 0, 0).toISOString();

test("orders are filed by the local day, not the UTC day", () => {
  const lateEvening = new Date(2026, 10, 21, 23, 30, 0);
  assert.equal(admin.adminDayKey(lateEvening), "2026-11-21");
  assert.equal(admin.adminDayKey(at(1)), "2026-11-20");
});

test("day labels name today and yesterday instead of a date", () => {
  assert.equal(admin.adminDayLabel(admin.adminDayKey(NOW), NOW), "Today");
  assert.equal(admin.adminDayLabel(admin.adminDayKey(NOW - 86400000), NOW), "Yesterday");
  assert.equal(admin.adminDayLabel("2026-10-03", NOW), "03 Oct 2026");
  assert.equal(admin.adminDayLabel("", NOW), "");
});

test("date presets resolve to inclusive ranges", () => {
  assert.deepEqual(admin.orderDateRangeForPreset("Today", NOW), { from: "2026-11-21", to: "2026-11-21" });
  assert.deepEqual(admin.orderDateRangeForPreset("Last 7 days", NOW), { from: "2026-11-15", to: "2026-11-21" });
  assert.deepEqual(admin.orderDateRangeForPreset("Last 30 days", NOW), { from: "2026-10-23", to: "2026-11-21" });
  assert.deepEqual(admin.orderDateRangeForPreset("All", NOW), { from: "", to: "" });
});

test("the range filter keeps both ends and allows one open side", () => {
  const orders = [at(0), at(3), at(9)].map((placedAt, index) => order({ id: `#MH${index}`, placedAt }));
  assert.equal(admin.ordersInDateRange(orders, { from: "2026-11-21", to: "2026-11-21" }).length, 1);
  assert.equal(admin.ordersInDateRange(orders, { from: "2026-11-18", to: "2026-11-21" }).length, 2);
  assert.equal(admin.ordersInDateRange(orders, { from: "2026-11-12", to: "" }).length, 3, "an open end keeps everything from that day on");
  assert.equal(admin.ordersInDateRange(orders, { from: "2026-11-19", to: "" }).length, 1);
  assert.equal(admin.ordersInDateRange(orders, { from: "", to: "2026-11-12" }).length, 1);
  assert.equal(admin.ordersInDateRange(orders, { from: "", to: "" }).length, 3);
});

test("day groups are newest first and drop settled revenue", () => {
  const groups = admin.orderDayGroups([
    order({ id: "#MH1", placedAt: at(0) }),
    order({ id: "#MH2", placedAt: at(0), stage: "Delivered" }),
    order({ id: "#MH3", placedAt: at(2), stage: "Cancelled" }),
  ], NOW);
  assert.deepEqual(groups.map((group) => group.key), ["2026-11-21", "2026-11-19"]);
  assert.equal(groups[0].count, 2);
  assert.equal(groups[0].units, 4);
  assert.equal(groups[0].revenueKs, 84000);
  assert.equal(groups[1].revenueKs, 0, "a cancelled order keeps its count but adds no revenue");
  assert.equal(groups[0].label, "Today");
});

test("sorting covers newest, oldest and total", () => {
  const orders = [
    order({ id: "#MH1", placedAt: at(2), items: [{ productId: "p", name: "Tee", size: "M", color: "Black", quantity: 1, unitPriceKs: 20000 }] }),
    order({ id: "#MH2", placedAt: at(0), items: [{ productId: "p", name: "Tee", size: "M", color: "Black", quantity: 1, unitPriceKs: 90000 }] }),
    order({ id: "#MH3", placedAt: at(1), items: [{ productId: "p", name: "Tee", size: "M", color: "Black", quantity: 1, unitPriceKs: 50000 }] }),
  ];
  assert.deepEqual(admin.sortOrders(orders, "Newest first").map((entry) => entry.id), ["#MH2", "#MH3", "#MH1"]);
  assert.deepEqual(admin.sortOrders(orders, "Oldest first").map((entry) => entry.id), ["#MH1", "#MH3", "#MH2"]);
  assert.deepEqual(admin.sortOrders(orders, "Highest total").map((entry) => entry.id), ["#MH2", "#MH3", "#MH1"]);
  assert.deepEqual(admin.sortOrders(orders, "Lowest total").map((entry) => entry.id), ["#MH1", "#MH3", "#MH2"]);
  assert.deepEqual(orders.map((entry) => entry.id), ["#MH1", "#MH2", "#MH3"], "the source list is not reordered");
});

test("the orders screen offers today, a date range, a day list and sorting", () => {
  const screen = readFileSync(path.join(__dirname, "..", "apps/web/src/components/admin/AdminOrders.tsx"), "utf8");
  assert.match(screen, /ADMIN_ORDER_DATE_PRESETS\.map/);
  assert.match(screen, /data-order-date-preset=\{option\}/);
  assert.match(screen, /data-order-from/);
  assert.match(screen, /data-order-to/);
  assert.match(screen, /data-order-sort/);
  assert.match(screen, /data-order-day=\{group\.key\}/);
  assert.match(screen, /label="Today"/);
  assert.match(screen, /ordersInDateRange\(data\.orders, range\)/);
  assert.match(screen, /sortOrders\(inRange\.filter/);
  assert.match(screen, /const count = stage === "All" \? inRange\.length/);
});
