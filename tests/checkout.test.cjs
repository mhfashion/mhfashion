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
const checkout = loadModule("apps/web/src/lib/checkout.ts");
const deliveryAddress = loadModule("apps/web/src/lib/delivery-address.ts");

const NOW = Date.UTC(2026, 10, 21, 9, 0, 0);
const data = admin.createAdminDemoData(NOW);

function cartItem(overrides = {}) {
  return {
    id: "butterfly-effect",
    key: "butterfly-effect::M::Black::Premium Cotton::180::Oversized::Short Sleeve",
    name: "Butterfly Effect",
    slug: "butterfly-effect",
    priceMinKs: 21000,
    priceMaxKs: 25000,
    imageUrl: "",
    quantity: 2,
    variant: { size: "M", color: "Black", material: "Premium Cotton", gsm: "180", fit: "Oversized", sleeve: "Short Sleeve" },
    unitPriceKs: 21000,
    ...overrides,
  };
}

function draft(overrides = {}) {
  return {
    idempotencyKey: "co_test_1",
    items: [cartItem()],
    address: { name: "Aung Kyaw", phone: "09 770 123 456", address: "No. 12, Baho Road", township: "Sanchaung", city: "Yangon" },
    payment: "KBZPay",
    note: "",
    placedAt: "2026-11-21T10:00:00.000Z",
    ...overrides,
  };
}

test("the same request key never creates a second order", () => {
  const first = checkout.placeOrder(data, draft());
  assert.deepEqual(first.issues, []);
  assert.equal(first.created, true);
  assert.equal(first.order.stage, "Pending Payment", "payment must complete before the order confirms");
  assert.equal(first.data.orders.length, data.orders.length + 1);
  assert.equal(first.data.orders[0].id, first.order.id, "the new order is at the top of the queue");

  const retry = checkout.placeOrder(first.data, draft({ placedAt: "2026-11-21T10:00:05.000Z" }));
  assert.equal(retry.created, false);
  assert.equal(retry.order.id, first.order.id, "the retry returns the first order");
  assert.equal(retry.data.orders.length, first.data.orders.length, "nothing was added");
  assert.equal(retry.data.orders[0].placedAt, "2026-11-21T10:00:00.000Z", "the first attempt wins");

  const other = checkout.placeOrder(retry.data, draft({ idempotencyKey: "co_test_2" }));
  assert.equal(other.created, true);
  assert.notEqual(other.order.id, first.order.id, "a different key is a different order");
});

test("the order carries the address, the payment and every line", () => {
  const result = checkout.placeOrder(data, draft({ payment: "Visa" }));
  const order = result.order;
  assert.equal(order.customerName, "Aung Kyaw");
  assert.equal(order.customerPhone, "09 770 123 456");
  assert.deepEqual(order.shipTo, { name: "Aung Kyaw", phone: "09 770 123 456", address: "No. 12, Baho Road", township: "Sanchaung", city: "Yangon" });
  assert.equal(order.payment, "Visa");
  assert.equal(order.checkoutKey, "co_test_1");
  assert.equal(order.items.length, 1);
  assert.deepEqual(order.items[0], {
    productId: "butterfly-effect",
    name: "Butterfly Effect",
    size: "M",
    color: "Black",
    quantity: 2,
    unitPriceKs: 21000,
    material: "Premium Cotton",
    gsm: 180,
    fit: "Oversized",
    sleeve: "Short Sleeve",
    design: null,
  });
});

test("validation names every missing field and nothing is written", () => {
  const empty = checkout.placeOrder(data, draft({ address: { name: " ", phone: "", address: "", township: "", city: "" } }));
  assert.equal(empty.order, null);
  assert.equal(empty.data, data);
  const issues = empty.issues.join("\n");
  assert.match(issues, /recipient's name/);
  assert.match(issues, /phone number/);
  assert.match(issues, /delivery address/);
  assert.match(issues, /township/);
  assert.match(issues, /city or region/);

  assert.match(checkout.validateCheckout(draft({ address: { ...draft().address, phone: "123" } })).join("\n"), /does not look right/);
  assert.match(checkout.validateCheckout(draft({ items: [] })).join("\n"), /cart is empty/);
  assert.match(checkout.validateCheckout(draft({ items: [cartItem({ quantity: 0 })] })).join("\n"), /quantity must be at least 1/);
  assert.match(checkout.validateCheckout(draft({ items: [cartItem({ unitPriceKs: 0, priceMinKs: 0 })] })).join("\n"), /no price for this combination/);
  assert.match(checkout.validateCheckout(draft({ payment: "Cash on Delivery" })).join("\n"), /how you want to pay/);
  assert.match(checkout.validateCheckout(draft({ note: "x".repeat(501) })).join("\n"), /under 500 characters/);
  assert.match(checkout.validateCheckout(draft({ idempotencyKey: "" })).join("\n"), /request key/);
});

test("cash on delivery is not an option; the three wallets and Visa are", () => {
  assert.deepEqual(checkout.CHECKOUT_PAYMENTS.map((method) => method.id), ["KBZPay", "WavePay", "AYAPay", "Visa"]);
  assert.ok(!checkout.CHECKOUT_PAYMENTS.some((method) => /cash/i.test(method.label)));
});

test("order numbers continue the existing sequence", () => {
  const highest = Math.max(...data.orders.map((order) => Number(/#MH(\d+)/.exec(order.id)?.[1] ?? 0)));
  assert.equal(checkout.nextOrderId(data.orders), `#MH${highest + 1}`);
  assert.equal(checkout.nextOrderId([]), "#MH1101");
  assert.equal(checkout.nextOrderId([{ id: "#MH1105" }]), "#MH1106");
});

test("a provider status moves the order once and never twice", () => {
  const placed = checkout.placeOrder(data, draft());
  const paid = checkout.applyPaymentStatus(placed.data, placed.order.id, "paid", "pi_test");
  assert.deepEqual(paid.issues, []);
  assert.equal(paid.order.stage, "Confirmed");
  assert.equal(paid.data.orders[0].stage, "Confirmed");

  const again = checkout.applyPaymentStatus(paid.data, placed.order.id, "paid", "pi_test");
  assert.equal(again.order.stage, "Confirmed");
  assert.equal(again.data, paid.data, "a replay writes nothing");

  const failedOrder = checkout.placeOrder(placed.data, draft({ idempotencyKey: "co_test_fail" }));
  const failed = checkout.applyPaymentStatus(failedOrder.data, failedOrder.order.id, "failed");
  assert.equal(failed.order.stage, "Cancelled");

  const refunded = checkout.applyPaymentStatus(paid.data, placed.order.id, "refunded");
  assert.equal(refunded.order.stage, "Refunded");

  const missing = checkout.applyPaymentStatus(data, "#MH9999", "paid");
  assert.equal(missing.order, null);
  assert.match(missing.issues[0], /no longer exists/);
});

test("each payment method maps to its provider", () => {
  assert.equal(checkout.providerIdFor("KBZPay"), "kbzpay");
  assert.equal(checkout.providerIdFor("WavePay"), "wavepay");
  assert.equal(checkout.providerIdFor("AYAPay"), "ayapay");
  assert.equal(checkout.providerIdFor("Visa"), "visa");
});

test("the summary totals match the cart", () => {
  const summary = checkout.checkoutSummary(draft({ items: [cartItem(), cartItem({ key: "second", quantity: 1, unitPriceKs: 30000 })] }));
  assert.equal(summary.units, 3);
  assert.equal(summary.subtotalKs, 42000 + 30000);
  assert.equal(summary.lines[0].detail, "M · Black · Premium Cotton · 180 · Oversized · Short Sleeve");
  assert.equal(checkout.checkoutSubtotalKs([]), 0);
});

test("checkout is routed, wired from the cart and states the idempotency rule", () => {
  assert.ok(existsSync(path.join(__dirname, "..", "apps/web/src/app/checkout/page.tsx")));
  const cart = readFileSync(path.join(__dirname, "..", "apps/web/src/components/CartPageClient.tsx"), "utf8");
  assert.match(cart, /href="\/checkout" data-cart-checkout/);

  const source = readFileSync(path.join(__dirname, "..", "apps/web/src/components/CheckoutClient.tsx"), "utf8");
  for (const marker of [
    "data-checkout-submit",
    "data-checkout-total",
    "data-checkout-confirmation",
    "data-checkout-status",
    "data-checkout-message",
    "data-checkout-pay",
    "data-checkout-line",
    "data-payment",
    'aria-label={label}',
    'aria-label="City or region"',
    'aria-label="Order note"',
    'aria-label="Accept the terms"',
    'field("Full name", "name")',
    'field("Phone", "phone"',
    'field("Address", "address"',
    'field("Township", "township")',
    "One order per submit",
    "Quoted by MH Delivery",
    "no money moves",
  ]) {
    assert.ok(source.includes(marker), `CheckoutClient is missing ${marker}`);
  }
});

test("a delivery address already given is reused instead of asked for again", () => {
  const address = { name: "Min Thu Aung", phone: "09123456789", address: "No 12, Baho Road", township: "Sanchaung", city: "Yangon" };
  assert.equal(deliveryAddress.isCompleteAddress(address), true);
  assert.equal(deliveryAddress.isCompleteAddress({ ...address, township: "  " }), false);
  assert.equal(deliveryAddress.isCompleteAddress(null), false);
  assert.equal(deliveryAddress.addressSummary(address), "No 12, Baho Road, Sanchaung, Yangon");

  // No window in Node, so the store is a no-op rather than a crash.
  assert.equal(deliveryAddress.readSavedAddress(), null);
  assert.equal(deliveryAddress.saveDeliveryAddress(address), undefined);

  // An order this browser placed is the fallback when nothing was saved yet.
  const placed = { id: "#MH1001", checkoutKey: "co_1", placedAt: "2026-11-20T10:00:00.000Z", shipTo: address };
  assert.deepEqual(deliveryAddress.lastOrderAddress([placed]), address);
  assert.equal(deliveryAddress.lastOrderAddress([{ ...placed, shipTo: { ...address, city: "" } }]), null);
  assert.equal(deliveryAddress.lastOrderAddress([]), null);

  const source = readFileSync(path.join(__dirname, "..", "apps/web/src/components/CheckoutClient.tsx"), "utf8");
  for (const marker of ["data-checkout-saved-address", "data-checkout-saved-address-line", "data-checkout-address-change", "saveDeliveryAddress(address)"]) {
    assert.ok(source.includes(marker), `CheckoutClient is missing ${marker}`);
  }
});
