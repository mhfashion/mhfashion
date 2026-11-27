// Plan §17 S9: the admin lists search more than the name, and page 50 rows at a time.
const assert = require("node:assert/strict");
const test = require("node:test");
const { loadModule } = require("./helpers/load-ts-module.cjs");

const search = loadModule("apps/web/src/lib/admin-order-search.ts");
const data = loadModule("apps/web/src/lib/admin-demo-data.ts");
const { matchesSearchQuery } = loadModule("apps/web/src/lib/search-text.ts");

const order = {
  id: "#MH-1042",
  customerName: "Aye Chan",
  customerEmail: "aye@example.com",
  customerPhone: "09 771 234 567",
  shipTo: { name: "Aye Chan", phone: "09 771 234 567", address: "No 12, Baho Road", township: "Ahlone", city: "Yangon" },
  items: [{ productId: "p1", name: "Oversized Tee", size: "L", color: "Black", quantity: 1, unitPriceKs: 25000 }],
  stage: "Printing",
  payment: "KBZ Pay",
  placedAt: "2026-11-20T04:30:00.000Z",
  note: "Ring the bell twice",
  trackingNumber: "MHD-778812",
  paymentReference: "KBZ 2600 4455",
};

test("an order is found by phone, township, address, note, tracking and payment reference", () => {
  for (const [field, term] of [
    ["the phone", "771 234"],
    ["the township", "ahlone"],
    ["the address", "baho road"],
    ["the note", "bell"],
    ["the tracking number", "778812"],
    ["the payment reference", "2600 4455"],
    ["the order number", "1042"],
  ]) {
    assert.ok(matchesSearchQuery(search.orderSearchText(order), term), `${field} is not searched`);
  }
  assert.equal(matchesSearchQuery(search.orderSearchText(order), "mandalay"), false, "an unrelated term still misses");
});

test("an order without a ship-to or handles still searches what it has", () => {
  const bare = { ...order, shipTo: undefined, trackingNumber: undefined, paymentReference: undefined, note: "" };
  assert.ok(matchesSearchQuery(search.orderSearchText(bare), "aye chan"));
  assert.ok(matchesSearchQuery(search.orderSearchText(bare), "oversized"));
});

test("a customer is found by phone as well as by name and email", () => {
  const customer = { email: "aye@example.com", name: "Aye Chan", phone: "09 771 234 567", orders: 2, units: 3, spendKs: 90000, lastOrderAt: "2026-11-20T04:30:00.000Z" };
  assert.ok(matchesSearchQuery(search.customerSearchText(customer), "771234"));
  assert.ok(matchesSearchQuery(search.customerSearchText(customer), "aye"));
});

test("the lists page 50 rows at a time and stop at the last row", () => {
  const rows = Array.from({ length: 120 }, (_, index) => index);
  assert.equal(search.ADMIN_PAGE_SIZE, 50);
  assert.equal(search.pageSlice(rows, 0).length, 50, "the first page is 50 even before a press");
  assert.equal(search.pageSlice(rows, 100).length, 100);
  assert.equal(search.nextPageSize(50, 120), 100);
  assert.equal(search.nextPageSize(100, 120), 120);
  assert.equal(search.nextPageSize(120, 120), 120, "the last press does not grow past the answer");
  assert.equal(search.pageSlice(rows.slice(0, 30), 100).length, 30);
});

test("saving the parcel keeps the trimmed handles and clears a blank one", () => {
  const base = { orders: [{ ...order }], designs: [] };
  const saved = data.setOrderFulfilment(base, "#MH-1042", { trackingNumber: "  MHD-1  ", paymentReference: " KBZ 9 " });
  assert.equal(saved.orders[0].trackingNumber, "MHD-1");
  assert.equal(saved.orders[0].paymentReference, "KBZ 9");
  const cleared = data.setOrderFulfilment(saved, "#MH-1042", { trackingNumber: "   ", paymentReference: "" });
  assert.equal(cleared.orders[0].trackingNumber, undefined);
  assert.equal(cleared.orders[0].paymentReference, undefined);
  assert.equal(base.orders[0].trackingNumber, "MHD-778812", "the input data is not mutated");
});
