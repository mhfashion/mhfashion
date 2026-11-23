const assert = require("node:assert/strict");
const test = require("node:test");
const { loadModule } = require("./helpers/load-ts-module.cjs");

const stock = loadModule("apps/web/src/lib/stock-movement.ts");
const admin = loadModule("apps/web/src/lib/admin-demo-data.ts");
const checkout = loadModule("apps/web/src/lib/checkout.ts");

const NOW = Date.UTC(2026, 10, 21, 9, 0, 0);
const AT = new Date(NOW).toISOString();

function order(overrides = {}) {
  return {
    id: "#MH1",
    customerName: "Thura Aung",
    customerEmail: "thura.aung@example.com",
    customerPhone: "+95 9 771 220 431",
    items: [
      { productId: "product-classic-tee", name: "Classic T-shirt", size: "M", color: "Black", quantity: 2, unitPriceKs: 21000 },
      { productId: "product-classic-tee", name: "Classic T-shirt", size: "M", color: "White", quantity: 1, unitPriceKs: 21000 },
      { productId: "product-classic-tee", name: "Classic T-shirt", size: "L", color: "Black", quantity: 1, unitPriceKs: 21000 },
    ],
    stage: "Confirmed",
    payment: "KBZPay",
    placedAt: AT,
    note: "",
    ...overrides,
  };
}

function data(overrides = {}) {
  const seeded = admin.createAdminDemoData(NOW);
  // The shop must opt in: the owner's decision is that stock does not follow a sale by default.
  return { ...seeded, settings: { ...seeded.settings, deductStockOnSale: true }, orders: [order(), ...seeded.orders], ...overrides };
}

test("one line per product and size, because a size can appear twice", () => {
  assert.deepEqual(stock.stockLinesFor(order()), [
    { productId: "product-classic-tee", size: "M", quantity: 3 },
    { productId: "product-classic-tee", size: "L", quantity: 1 },
  ]);
});

test("a paid order takes its pieces out of stock once", () => {
  const start = data();
  const before = admin.stockQuantity(start, "product-classic-tee", "M");
  const first = stock.consumeStock(start, "#MH1", AT);
  assert.deepEqual(first.issues, []);
  assert.equal(admin.stockQuantity(first.data, "product-classic-tee", "M"), before - 3);
  assert.equal(admin.stockQuantity(first.data, "product-classic-tee", "L"), start.stock["product-classic-tee"].L - 1);
  assert.equal(first.data.orders[0].stockConsumedAt, AT);
  assert.deepEqual(first.data.orders[0].stockTaken, [
    { productId: "product-classic-tee", size: "M", quantity: 3 },
    { productId: "product-classic-tee", size: "L", quantity: 1 },
  ]);

  const replay = stock.consumeStock(first.data, "#MH1", AT);
  assert.equal(replay.data, first.data, "a replay writes nothing");
  assert.equal(stock.stockStatus(first.data.orders[0]), "taken");
  assert.equal(stock.stockStatus(order()), "none");
});

test("a sale the blanks cannot cover still completes and records the gap", () => {
  const start = data();
  const short = { ...start, stock: { ...start.stock, "product-classic-tee": { ...start.stock["product-classic-tee"], M: 1 } } };
  const result = stock.consumeStock(short, "#MH1", AT);
  assert.equal(admin.stockQuantity(result.data, "product-classic-tee", "M"), 0, "never negative");
  assert.deepEqual(result.shortfalls, [{ productId: "product-classic-tee", size: "M", wanted: 3, available: 1 }]);
  assert.deepEqual(result.data.orders[0].stockShortfall, result.shortfalls);
  assert.deepEqual(result.data.orders[0].stockTaken, [{ productId: "product-classic-tee", size: "M", quantity: 1 }, { productId: "product-classic-tee", size: "L", quantity: 1 }]);
});

test("a refund gives back exactly what the sale took, once", () => {
  const paid = stock.consumeStock(data(), "#MH1", AT).data;
  const restored = stock.restoreStock(paid, "#MH1", AT);
  assert.deepEqual(restored.issues, []);
  assert.equal(admin.stockQuantity(restored.data, "product-classic-tee", "M"), admin.stockQuantity(data(), "product-classic-tee", "M"));
  assert.equal(restored.data.orders[0].stockRestoredAt, AT);
  assert.equal(restored.data.orders[0].stockTaken, undefined);
  assert.equal(stock.stockStatus(restored.data.orders[0]), "restored");

  const again = stock.restoreStock(restored.data, "#MH1", AT);
  assert.equal(again.data, restored.data, "a second refund writes nothing");

  // A re-payment after the refund takes the pieces again.
  const repaid = stock.consumeStock(restored.data, "#MH1", AT);
  assert.equal(admin.stockQuantity(repaid.data, "product-classic-tee", "M"), admin.stockQuantity(data(), "product-classic-tee", "M") - 3);
});

test("stock does not move at all unless the shop switches it on", () => {
  const seeded = admin.createAdminDemoData(NOW);
  assert.equal(seeded.settings.deductStockOnSale, false, "the owner's decision: a sale does not move blank stock");
  const withOrder = { ...seeded, orders: [order(), ...seeded.orders] };
  assert.equal(stock.syncStockWithStage(withOrder, "#MH1"), withOrder, "off writes nothing");
  const placed = { ...withOrder, orders: [{ ...withOrder.orders[0], stage: "Refunded" }, ...withOrder.orders.slice(1)] };
  assert.equal(stock.syncStockWithStage(placed, "#MH1"), placed, "off does not restore either");
});

test("stock follows the stage, whichever path moved it", () => {
  const start = data();
  const untouched = admin.stockQuantity(start, "product-classic-tee", "M");
  const synced = stock.syncStockWithStage(start, "#MH1");
  assert.equal(admin.stockQuantity(synced, "product-classic-tee", "M"), untouched - 3, "a paid order that was never taken gets taken");
  assert.equal(stock.syncStockWithStage(synced, "#MH1"), synced, "and only once");

  const pending = { ...start, orders: [{ ...start.orders[0], stage: "Pending Payment" }, ...start.orders.slice(1)] };
  assert.equal(stock.syncStockWithStage(pending, "#MH1"), pending, "an unpaid order takes nothing");

  const confirmed = stock.syncStockWithStage({ ...pending, orders: [{ ...pending.orders[0], stage: "Confirmed" }, ...pending.orders.slice(1)] }, "#MH1");
  assert.equal(admin.stockQuantity(confirmed, "product-classic-tee", "M"), untouched - 3);

  for (const stage of ["Cancelled", "Refunded"]) {
    const closed = stock.syncStockWithStage({ ...confirmed, orders: [{ ...confirmed.orders[0], stage }, ...confirmed.orders.slice(1)] }, "#MH1");
    assert.equal(admin.stockQuantity(closed, "product-classic-tee", "M"), untouched, `${stage} puts the pieces back`);
  }
});

test("paying through the checkout moves the seeded stock once the rule is on", () => {
  const seeded = { ...admin.createAdminDemoData(NOW), settings: { ...admin.createAdminDemoData(NOW).settings, deductStockOnSale: true } };
  const before = admin.stockQuantity(seeded, "product-classic-tee", "M");
  const placed = checkout.placeOrder(seeded, {
    idempotencyKey: "co_stock",
    address: { name: "Thura Aung", phone: "09 771 220 431", address: "No. 12, 5th Street", township: "Hlaing", city: "Yangon" },
    payment: "KBZPay",
    note: "",
    placedAt: AT,
    items: [{
      id: "product-classic-tee",
      key: "product-classic-tee::M::Black",
      name: "Classic T-shirt",
      slug: "classic-tee",
      priceMinKs: 21000,
      priceMaxKs: 21000,
      imageUrl: "",
      quantity: 2,
      unitPriceKs: 21000,
      variant: { size: "M", color: "Black", material: "Combed Cotton", gsm: "180 GSM", fit: "Regular", sleeve: "Short Sleeve" },
    }],
  });
  assert.deepEqual(placed.issues, []);
  assert.equal(admin.stockQuantity(placed.data, "product-classic-tee", "M"), before, "an unpaid order takes nothing");

  const paid = checkout.applyPaymentStatus(placed.data, placed.order.id, "paid", "pi_stock");
  assert.equal(admin.stockQuantity(paid.data, "product-classic-tee", "M"), before - 2);
  assert.equal(paid.order.stockConsumedAt !== undefined, true);

  const replay = checkout.applyPaymentStatus(paid.data, placed.order.id, "paid", "pi_stock");
  assert.equal(admin.stockQuantity(replay.data, "product-classic-tee", "M"), before - 2, "a replayed callback takes nothing twice");

  const refunded = checkout.applyPaymentStatus(paid.data, placed.order.id, "refunded");
  assert.equal(admin.stockQuantity(refunded.data, "product-classic-tee", "M"), before);
  assert.equal(stock.stockStatus(refunded.order), "restored");
});
