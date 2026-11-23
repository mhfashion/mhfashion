const assert = require("node:assert/strict");
const test = require("node:test");
const { loadModule } = require("./helpers/load-ts-module.cjs");

const ledgerLib = loadModule("apps/web/src/lib/loyalty-ledger.ts");
const admin = loadModule("apps/web/src/lib/admin-demo-data.ts");
const checkout = loadModule("apps/web/src/lib/checkout.ts");

const RULES = { dailyGrant: 300, dailyExpiryHours: 24, imageCost: 100, purchasePointsPerUnit: 50 };
// 2026-11-22 09:00 in Yangon.
const AT = "2026-11-22T02:30:00.000Z";
const NEXT_DAY = "2026-11-23T02:30:00.000Z";

function order(overrides = {}) {
  return {
    id: "#MH1",
    customerName: "Thura Aung",
    customerEmail: "thura.aung@example.com",
    customerPhone: "+95 9 771 220 431",
    items: [
      { productId: "p1", name: "Classic T-shirt", size: "M", color: "Black", quantity: 2, unitPriceKs: 21000 },
      { productId: "p2", name: "Hoodie", size: "L", color: "Grey", quantity: 1, unitPriceKs: 45000 },
    ],
    stage: "Confirmed",
    payment: "KBZPay",
    placedAt: AT,
    note: "",
    ...overrides,
  };
}

test("the daily grant lands once per Yangon day, not per visit", () => {
  const first = ledgerLib.earnDaily([], RULES, AT);
  assert.equal(first.granted, 300);
  assert.equal(first.ledger.length, 1);
  assert.equal(first.entry.expiresAt, "2026-11-23T02:30:00.000Z");

  const again = ledgerLib.earnDaily(first.ledger, RULES, "2026-11-22T10:00:00.000Z");
  assert.equal(again.granted, 0);
  assert.equal(again.ledger, first.ledger);

  // 18:00 UTC is already the next day in Yangon.
  const nextDay = ledgerLib.earnDaily(first.ledger, RULES, NEXT_DAY);
  assert.equal(nextDay.granted, 300);
  assert.equal(nextDay.ledger.length, 2);

  assert.equal(ledgerLib.loyaltyDayKey("2026-11-21T17:30:00.000Z"), "2026-11-22");
  assert.equal(ledgerLib.loyaltyDayKey("2026-11-21T16:30:00.000Z"), "2026-11-21");
  assert.equal(ledgerLib.earnDaily([], { ...RULES, dailyGrant: 0 }, AT).granted, 0);
});

test("buying earns per piece, once per order", () => {
  const first = ledgerLib.awardPurchase([], order(), RULES, AT);
  assert.equal(first.awarded, 150, "three pieces at 50");
  assert.equal(first.ledger[0].orderId, "#MH1");
  assert.equal(first.ledger[0].expiresAt, undefined, "bought points never expire");

  const replay = ledgerLib.awardPurchase(first.ledger, order(), RULES, NEXT_DAY);
  assert.equal(replay.awarded, 0);
  assert.equal(replay.ledger, first.ledger);

  // A quantity of 0 still means one garment, as it does everywhere else.
  assert.equal(ledgerLib.awardPurchase([], order({ items: [{ productId: "p", name: "Tee", size: "M", color: "Black", quantity: 0, unitPriceKs: 1 }] }), RULES, AT).awarded, 50);
});

test("a refund takes back exactly that order's points", () => {
  const bought = ledgerLib.awardPurchase(ledgerLib.earnDaily([], RULES, AT).ledger, order(), RULES, AT);
  const other = ledgerLib.awardPurchase(bought.ledger, order({ id: "#MH2" }), RULES, AT).ledger;
  const reversed = ledgerLib.reversePurchase(other, "#MH1");
  assert.equal(reversed.reversed, 150);
  assert.equal(reversed.ledger.some((entry) => entry.orderId === "#MH1"), false);
  assert.equal(reversed.ledger.some((entry) => entry.orderId === "#MH2"), true);
  assert.equal(reversed.ledger.some((entry) => entry.kind === "daily"), true);
});

test("the balance counts daily points only while they last", () => {
  const ledger = ledgerLib.awardPurchase(ledgerLib.earnDaily([], RULES, AT).ledger, order(), RULES, AT).ledger;
  const today = ledgerLib.pointsBalance(ledger, AT);
  assert.deepEqual(today, { total: 450, daily: 300, permanent: 150, expiresAt: "2026-11-23T02:30:00.000Z" });

  const tomorrow = ledgerLib.pointsBalance(ledger, NEXT_DAY);
  assert.equal(tomorrow.total, 150);
  assert.equal(tomorrow.daily, 0);
  assert.equal(tomorrow.expiresAt, null);

  const history = ledgerLib.loyaltyHistory(ledger, NEXT_DAY);
  assert.equal(history.length, 2);
  assert.equal(history.find((entry) => entry.kind === "purchase").expired, false, "bought points never expire");
  assert.equal(history.find((entry) => entry.kind === "daily").expired, true);
});

test("spend, tier and milestones read only the orders the shopper kept", () => {
  const orders = [
    order({ id: "#MH1", stage: "Delivered" }),
    order({ id: "#MH2", stage: "Refunded" }),
    order({ id: "#MH3", stage: "Pending Payment" }),
    order({ id: "#MH4", stage: "Cancelled" }),
  ];
  assert.equal(ledgerLib.lifetimeSpendKs(orders), 87_000);

  const tiers = admin.createSeedLoyalty().tiers;
  assert.equal(ledgerLib.tierFor(0, tiers).name, "Member");
  assert.equal(ledgerLib.tierFor(87_000, tiers).name, "Member");
  assert.equal(ledgerLib.tierFor(120_000, tiers).name, "Silver");
  assert.equal(ledgerLib.tierFor(900_000, tiers).name, "Gold");
  assert.equal(ledgerLib.nextTier(87_000, tiers).tier.name, "Silver");
  assert.equal(ledgerLib.nextTier(87_000, tiers).remainingKs, 13_000);
  assert.equal(ledgerLib.nextTier(900_000, tiers), null);

  const progress = ledgerLib.milestoneProgress(orders, admin.createSeedLoyalty().milestones);
  assert.deepEqual(progress.map((entry) => entry.reached), [true, true, false]);
  assert.equal(progress[1].current, 3, "pieces in the kept order");
  assert.equal(progress[2].current, 87_000);
});

test("a stored ledger is repaired on read", () => {
  assert.deepEqual(ledgerLib.normalizeLoyaltyLedger(undefined, RULES), []);
  const kept = ledgerLib.normalizeLoyaltyLedger([
    null,
    { id: "a", kind: "mystery", points: 10, at: AT },
    { id: "b", kind: "daily", points: 0, at: AT },
    { id: "c", kind: "daily", points: 300, at: AT },
    { id: "c", kind: "daily", points: 300, at: AT },
    { id: "d", kind: "purchase", points: 150, at: AT, orderId: "#MH1", expiresAt: "whenever" },
  ], RULES);
  assert.deepEqual(kept.map((entry) => entry.id), ["c", "d"]);
  assert.equal(kept[0].expiresAt, "2026-11-23T02:30:00.000Z", "a daily entry without an expiry takes the configured one");
  assert.equal(kept[1].expiresAt, undefined, "bought points never expire");
});

test("paying earns the order's points, a refund takes them back", () => {
  const data = admin.createAdminDemoData(Date.UTC(2026, 10, 21, 9));
  assert.deepEqual(data.loyaltyLedger, []);

  const placed = checkout.placeOrder(data, {
    idempotencyKey: "co_loyalty",
    address: { name: "Thura Aung", phone: "09 771 220 431", address: "No. 12, 5th Street", township: "Hlaing", city: "Yangon" },
    payment: "KBZPay",
    note: "",
    placedAt: "2026-11-21T10:00:00.000Z",
    items: [{
      id: "classic-tee",
      key: "classic-tee::M::Black",
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
  assert.deepEqual(placed.data.loyaltyLedger, [], "an unpaid order earns nothing");

  const paid = checkout.applyPaymentStatus(placed.data, placed.order.id, "paid", "pi_loyalty");
  assert.equal(paid.data.loyaltyLedger.length, 1);
  assert.equal(paid.data.loyaltyLedger[0].points, 100, "two pieces at 50");

  const replay = checkout.applyPaymentStatus(paid.data, placed.order.id, "paid", "pi_loyalty");
  assert.equal(replay.data.loyaltyLedger.length, 1, "a replayed status cannot earn twice");

  const refunded = checkout.applyPaymentStatus(paid.data, placed.order.id, "refunded");
  assert.deepEqual(refunded.data.loyaltyLedger, []);
});
