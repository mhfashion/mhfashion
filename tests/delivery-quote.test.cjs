const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { loadModule } = require("./helpers/load-ts-module.cjs");

const admin = loadModule("apps/web/src/lib/admin-demo-data.ts");
const delivery = loadModule("apps/web/src/lib/delivery.ts");

const data = admin.createAdminDemoData(Date.now());
const order = data.orders.find((entry) => entry.shipTo && entry.items.length > 0) ?? data.orders[0];

test("the quote request carries the address and phone MH Delivery asked for", () => {
  const payload = delivery.buildDeliveryQuoteRequest(order, { requestedAt: "2026-11-21T00:00:00.000Z" });
  assert.equal(payload.reference, order.id);
  assert.equal(payload.requestedAt, "2026-11-21T00:00:00.000Z");
  assert.equal(payload.consignee.name, order.shipTo.name);
  assert.equal(payload.consignee.phone, order.shipTo.phone);
  assert.equal(payload.consignee.email, order.customerEmail);
  assert.equal(payload.consignee.address.line1, order.shipTo.address);
  assert.equal(payload.consignee.address.township, order.shipTo.township);
  assert.equal(payload.consignee.address.city, order.shipTo.city);
  assert.ok(payload.merchant.name);
  assert.ok(payload.merchant.phone);
});

test("the parcel lists every line with its own weight and the order total", () => {
  const payload = delivery.buildDeliveryQuoteRequest(order);
  const parcel = payload.parcels[0];
  assert.equal(parcel.items.length, order.items.length);
  for (const [index, item] of order.items.entries()) {
    const sent = parcel.items[index];
    assert.equal(sent.product, item.name);
    assert.equal(sent.size, item.size);
    assert.equal(sent.colour, item.color);
    assert.equal(sent.quantity, item.quantity);
    assert.equal(sent.weightGrams, delivery.unitWeightGrams(item) * item.quantity);
  }
  const units = order.items.reduce((total, item) => total + item.quantity, 0);
  assert.equal(parcel.units, units);
  assert.equal(payload.totals.units, units);
  assert.equal(parcel.weightGrams, parcel.items.reduce((total, item) => total + item.weightGrams, 0));
  assert.ok(parcel.longestSideCm > 0);
});

test("cash on delivery sends the amount, a paid order sends zero", () => {
  const cod = delivery.buildDeliveryQuoteRequest({ ...order, payment: "Cash on Delivery" });
  assert.equal(cod.totals.cod, true);
  assert.equal(cod.totals.codAmountKs, admin.orderTotalKs(order));

  const paid = delivery.buildDeliveryQuoteRequest({ ...order, payment: "AYAPay" });
  assert.equal(paid.totals.cod, false);
  assert.equal(paid.totals.codAmountKs, 0);
});

test("the JSON file is the payload, pretty printed, named after the order", () => {
  const json = delivery.deliveryQuoteJson(order);
  const parsed = JSON.parse(json);
  assert.equal(parsed.reference, order.id);
  assert.ok(json.includes('\n  "consignee"'));
  assert.equal(delivery.deliveryFileName(order), `delivery-${order.id.replace(/[^A-Za-z0-9-]+/g, "").toLowerCase()}.json`);
});

test("a product without a known type still gets a sensible weight", () => {
  assert.equal(delivery.unitWeightGrams({ name: "T-Shirt" }), 250);
  assert.equal(delivery.unitWeightGrams({ name: "Hoodie" }), 550);
  assert.equal(delivery.unitWeightGrams({ name: "Mystery Box" }), delivery.DEFAULT_UNIT_WEIGHT_GRAMS);
  assert.equal(delivery.longestSideCm({ name: "Mystery Box" }), delivery.DEFAULT_LONGEST_SIDE_CM);
});
