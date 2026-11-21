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
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: sourcePath,
  }).outputText;
  const loaded = { exports: {} };
  loadedModules.set(sourcePath, loaded);
  const localRequire = (id) => (id.startsWith("@/") ? loadModule(`apps/web/src/${id.slice(2)}.ts`) : require(id));
  new Function("module", "exports", "require", compiled)(loaded, loaded.exports, localRequire);
  return loaded.exports;
}

const admin = loadModule("apps/web/src/lib/admin-demo-data.ts");
const payments = loadModule("apps/web/src/lib/payments.ts");
const store = loadModule("apps/web/src/lib/payment-store.ts");
const webhook = loadModule("apps/web/src/lib/payment-webhook.ts");

const SECRET = "test_secret";
const NOW = 1_800_000_000;

function event(overrides = {}) {
  return {
    id: "evt_1",
    ref: "pi_test",
    orderId: "#MH1101",
    provider: "mock",
    status: "paid",
    amountKs: 42000,
    occurredAt: "2026-11-21T10:00:00.000Z",
    ...overrides,
  };
}

function order(overrides = {}) {
  return {
    id: "#MH1101",
    customerName: "Aung Kyaw",
    customerEmail: "",
    customerPhone: "09770123456",
    items: [{ productId: "butterfly-effect", name: "Butterfly Effect", size: "M", color: "Black", quantity: 2, unitPriceKs: 21000 }],
    stage: "Pending Payment",
    payment: "KBZPay",
    placedAt: "2026-11-21T10:00:00.000Z",
    note: "",
    ...overrides,
  };
}

async function signed(input, options = {}) {
  const body = JSON.stringify(input);
  const timestamp = String(options.nowSeconds ?? NOW);
  const signature = await payments.signPayload(options.secret ?? SECRET, timestamp, body);
  return { body, timestamp, signature };
}

test("a signature covers the timestamp and the body", async () => {
  const body = JSON.stringify(event());
  const first = await payments.signPayload(SECRET, String(NOW), body);
  const same = await payments.signPayload(SECRET, String(NOW), body);
  const otherSecret = await payments.signPayload("other", String(NOW), body);
  const otherStamp = await payments.signPayload(SECRET, String(NOW + 1), body);
  assert.equal(first, same);
  assert.notEqual(first, otherSecret);
  assert.notEqual(first, otherStamp);
  assert.match(first, /^[0-9a-f]{64}$/);
});

test("verification refuses a missing, stale or altered callback", async () => {
  const body = JSON.stringify(event());
  const signature = await payments.signPayload(SECRET, String(NOW), body);
  const base = { secret: SECRET, body, nowSeconds: NOW, timestamp: String(NOW), signature };

  assert.deepEqual(await payments.verifySignature(base), { ok: true });
  assert.equal((await payments.verifySignature({ ...base, signature: null })).reason, "missing_signature");
  assert.equal((await payments.verifySignature({ ...base, timestamp: null })).reason, "invalid_timestamp");
  assert.equal((await payments.verifySignature({ ...base, nowSeconds: NOW + 301 })).reason, "stale_timestamp");
  assert.equal((await payments.verifySignature({ ...base, body: body.replace("42000", "1") })).reason, "bad_signature");
  assert.equal((await payments.verifySignature({ ...base, secret: "wrong" })).reason, "bad_signature");
  assert.deepEqual(await payments.verifySignature({ ...base, nowSeconds: NOW + 120 }), { ok: true }, "inside the window");
});

test("an event is parsed strictly", () => {
  assert.deepEqual(payments.parsePaymentEvent(event()).issues, []);
  assert.match(payments.parsePaymentEvent({ ...event(), status: "settled" }).issues.join(), /Unknown status/);
  assert.match(payments.parsePaymentEvent({ ...event(), provider: "paypal" }).issues.join(), /Unknown provider/);
  assert.match(payments.parsePaymentEvent({ ...event(), amountKs: 0 }).issues.join(), /amount must be positive/);
  assert.match(payments.parsePaymentEvent({ ...event(), occurredAt: "yesterday" }).issues.join(), /valid timestamp/);
  assert.equal(payments.parsePaymentEvent(null).event, null);
});

test("a paid event confirms only a pending order, and a replay changes nothing", () => {
  const pending = order();
  const paid = payments.applyPaymentEvent(pending, event());
  assert.equal(paid.changed, true);
  assert.equal(paid.order.stage, "Confirmed");
  assert.equal(pending.stage, "Pending Payment", "the input is not mutated");

  const replay = payments.applyPaymentEvent(paid.order, event());
  assert.equal(replay.changed, false);
  assert.equal(replay.order, paid.order, "the same object comes back");

  const later = payments.applyPaymentEvent(order({ stage: "Printing" }), event());
  assert.equal(later.changed, false);
  assert.equal(later.order.stage, "Printing", "a late event does not rewind a printed order");

  const cancelled = payments.applyPaymentEvent(order({ stage: "Cancelled" }), event());
  assert.equal(cancelled.changed, false);
  assert.match(cancelled.issues[0], /a payment cannot confirm it/);

  const wrongOrder = payments.applyPaymentEvent(order({ id: "#MH2000" }), event());
  assert.equal(wrongOrder.changed, false);
  assert.match(wrongOrder.issues[0], /belongs to #MH1101/);
});

test("failed and refunded events move the right orders only", () => {
  assert.equal(payments.applyPaymentEvent(order(), event({ status: "failed" })).order.stage, "Cancelled");
  assert.equal(payments.applyPaymentEvent(order({ stage: "Processing" }), event({ status: "failed" })).order.stage, "Processing");
  assert.equal(payments.applyPaymentEvent(order({ stage: "Delivered" }), event({ status: "refunded" })).order.stage, "Refunded");
  const already = order({ stage: "Refunded" });
  assert.equal(payments.applyPaymentEvent(already, event({ status: "refunded" })).changed, false);
});

test("the amount must match the order", () => {
  assert.equal(payments.orderAmountKs(order()), 42000);
  assert.equal(payments.amountsMatch(order(), event()), true);
  assert.equal(payments.amountsMatch(order(), event({ amountKs: 1 })), false);
});

test("the webhook accepts one valid callback and then reports the duplicate", async () => {
  store.resetIntents();
  store.createIntent({ ref: "pi_test", orderId: "#MH1101", amountKs: 42000, provider: "mock" });
  const env = { PAYMENT_WEBHOOK_SECRET: SECRET };

  const bad = await webhook.handlePaymentWebhook({ provider: "mock", body: JSON.stringify(event()), signature: null, timestamp: String(NOW), env, nowSeconds: NOW });
  assert.equal(bad.status, 401);
  assert.equal(bad.body.error, "missing_signature");

  const wrongProvider = await webhook.handlePaymentWebhook({ provider: "kbzpay", ...(await signed(event())), env, nowSeconds: NOW });
  assert.equal(wrongProvider.status, 400);
  assert.equal(wrongProvider.body.error, "provider_mismatch");

  const unknown = await webhook.handlePaymentWebhook({ provider: "mock", ...(await signed(event({ ref: "pi_missing" }))), env, nowSeconds: NOW });
  assert.equal(unknown.status, 404);
  assert.equal(unknown.body.error, "unknown_ref");

  const mismatch = await webhook.handlePaymentWebhook({ provider: "mock", ...(await signed(event({ amountKs: 1 }))), env, nowSeconds: NOW });
  assert.equal(mismatch.status, 400);
  assert.equal(mismatch.body.error, "amount_mismatch");

  const ok = await webhook.handlePaymentWebhook({ provider: "mock", ...(await signed(event())), env, nowSeconds: NOW });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.status, "paid");
  assert.equal(store.getIntent("pi_test").status, "paid");

  const duplicate = await webhook.handlePaymentWebhook({ provider: "mock", ...(await signed(event())), env, nowSeconds: NOW });
  assert.equal(duplicate.status, 200);
  assert.equal(duplicate.body.duplicate, true);

  const stale = await webhook.handlePaymentWebhook({ provider: "mock", ...(await signed(event())), env, nowSeconds: NOW + 900 });
  assert.equal(stale.status, 409);
  assert.equal(stale.body.error, "stale_timestamp");
});

test("an unconfigured provider is named instead of silently used", () => {
  assert.deepEqual(payments.missingCredentials("mock", {}), []);
  const missing = payments.missingCredentials("kbzpay", {});
  assert.ok(missing.includes("KBZPAY_APP_ID"));
  assert.ok(missing.includes("PAYMENT_WEBHOOK_SECRET"));
  assert.deepEqual(payments.missingCredentials("kbzpay", { KBZPAY_APP_ID: "a", KBZPAY_SECRET: "b", PAYMENT_WEBHOOK_SECRET: "c" }), []);
  assert.equal(payments.findProvider("paypal"), undefined);
});

test("the routes exist and the demo callback path is guarded", () => {
  const read = (relativePath) => readFileSync(path.join(__dirname, "..", relativePath), "utf8");
  const webhookRoute = read("apps/web/src/app/api/payments/webhook/[provider]/route.ts");
  assert.match(webhookRoute, /handlePaymentWebhook/);
  assert.match(webhookRoute, /request\.text\(\)/, "the signature is checked against the raw body");

  const simulate = read("apps/web/src/app/api/payments/simulate/route.ts");
  assert.match(simulate, /mock_disabled/);
  assert.match(simulate, /isMockAllowed/);
  assert.match(simulate, /buildSignedCallback/);
  assert.match(simulate, /not_a_mock_intent/);

  const intent = read("apps/web/src/app/api/payments/intent/route.ts");
  assert.match(intent, /provider_not_configured/);
  assert.match(intent, /Nothing is charged/);

  const checkout = read("apps/web/src/components/CheckoutClient.tsx");
  for (const marker of ["/api/payments/intent", "/api/payments/simulate", "/api/payments/status/"]) {
    assert.ok(checkout.includes(marker), `CheckoutClient does not call ${marker}`);
  }
  assert.ok(!checkout.includes("confirmPayment"), "the demo confirmPayment stand-in is gone");
});
