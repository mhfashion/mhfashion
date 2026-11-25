const assert = require("node:assert/strict");
const test = require("node:test");
const { loadModule } = require("./helpers/load-ts-module.cjs");

const orders = loadModule("apps/web/src/lib/order-assets.ts");
const storeLib = loadModule("apps/web/src/lib/asset-store.ts");

test("an order file is named after the order, except the manifest", () => {
  assert.equal(orders.orderFileName("o-1", "print-sheet.html"), "print-sheet-o-1.html");
  assert.equal(orders.orderFileName("o-1", "manifest.json"), "manifest.json");
  assert.equal(orders.orderFileKey("o-1", "print-spec.csv"), "orders/o-1/print-spec-o-1.csv");
  assert.equal(orders.orderFileKey("o-1", "manifest.json"), "orders/o-1/manifest.json");
  assert.equal(orders.orderFileKey("o-1", "delivery.json"), "orders/o-1/delivery-o-1.json");
});

test("a design copy sits under the order, with the look in its name", () => {
  assert.equal(orders.orderDesignKey("o-1", "d-9", "front"), "orders/o-1/designs/d-9-front.svg");
  assert.equal(orders.orderDesignKey("o-1", "d-9", "front", "mockup"), "orders/o-1/designs/d-9-front-mockup.svg");
});

test("the order is written once, and a second write is refused", async () => {
  const buckets = storeLib.createMemoryAssetBuckets({}, {});
  const files = [
    { document: "manifest.json", body: "{}" },
    { document: "print-sheet.html", body: "<html></html>" },
  ];
  const first = await orders.writeOrderFiles(buckets.private, "o-1", files);
  assert.deepEqual(first.written, ["orders/o-1/manifest.json", "orders/o-1/print-sheet-o-1.html"]);
  assert.deepEqual(first.refused, []);
  assert.equal(buckets.private.objects.get("orders/o-1/print-sheet-o-1.html").contentType, "text/html; charset=utf-8");
  assert.equal(buckets.private.objects.get("orders/o-1/manifest.json").cacheControl, "private, no-store");

  const second = await orders.writeOrderFiles(buckets.private, "o-1", files);
  assert.deepEqual(second.written, []);
  assert.deepEqual(second.refused, ["orders/o-1/manifest.json", "orders/o-1/print-sheet-o-1.html"]);
});
