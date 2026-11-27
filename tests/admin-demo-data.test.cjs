const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { loadModule } = require("./helpers/load-ts-module.cjs");
const ts = require("typescript");



const admin = loadModule("apps/web/src/lib/admin-demo-data.ts");
const csv = loadModule("apps/web/src/lib/admin-csv.ts");

const NOW = Date.UTC(2026, 10, 21, 9, 0, 0);

function order(overrides) {
  return {
    id: "#MH1",
    customerName: "Thura Aung",
    customerEmail: "thura.aung@example.com",
    customerPhone: "+95 9 771 220 431",
    items: [{ productId: "product-classic-tee", name: "Classic T-shirt", size: "M", color: "Black", quantity: 2, unitPriceKs: 21000 }],
    stage: "Processing",
    payment: "KBZPay",
    placedAt: new Date(NOW - 2 * 86400000).toISOString(),
    note: "",
    ...overrides,
  };
}

test("the demo seed is deterministic and covers every module", () => {
  const first = admin.createAdminDemoData(NOW);
  const second = admin.createAdminDemoData(NOW);
  assert.deepEqual(first, second, "the same clock produces the same demo set");
  assert.ok(first.orders.length >= 20);
  assert.ok(first.products.length >= 6);
  assert.ok(first.designs.length >= 6);
  assert.ok(first.promotions.length >= 4);
  assert.ok(first.team.some((member) => member.role === "Super Admin"));
  assert.equal(first.version, 1);
  for (const product of first.products) {
    assert.ok(product.sizes.length > 0, `${product.name} has sizes`);
    for (const size of product.sizes) {
      assert.equal(typeof first.stock[product.id][size], "number", `${product.name} ${size} has stock`);
    }
  }
  const timestamps = first.orders.map((entry) => new Date(entry.placedAt).getTime());
  assert.deepEqual(timestamps, [...timestamps].sort((a, b) => b - a), "orders are newest first");
});

test("order stages advance one step at a time and stop at delivered", () => {
  assert.equal(admin.nextOrderStage("Pending Payment"), "Confirmed");
  assert.equal(admin.nextOrderStage("Printing"), "Ready to Ship");
  assert.equal(admin.nextOrderStage("Out for Delivery"), "Delivered");
  assert.equal(admin.nextOrderStage("Delivered"), null);
  assert.equal(admin.nextOrderStage("Cancelled"), null);
  assert.equal(admin.nextOrderStage("Refunded"), null);
  assert.equal(admin.orderStageIndex("Printing"), 3);
  assert.equal(admin.orderStageIndex("Cancelled"), -1);
});

test("stage changes replace only the target order", () => {
  const data = { ...admin.createAdminDemoData(NOW), orders: [order({ id: "#MH1" }), order({ id: "#MH2", stage: "Delivered" })] };
  const next = admin.setOrderStage(data, "#MH1", "Printing");
  assert.equal(next.orders[0].stage, "Printing");
  assert.equal(next.orders[1].stage, "Delivered");
  assert.equal(data.orders[0].stage, "Processing", "the previous state is not mutated");
  const noted = admin.setOrderNote(next, "#MH1", "  check collar  ");
  assert.equal(noted.orders[0].note, "check collar");
});

test("order totals, units and summaries exclude cancelled and refunded revenue", () => {
  const paid = order({ id: "#MH1", stage: "Delivered" });
  const cancelled = order({ id: "#MH2", stage: "Cancelled", items: [{ ...order({}).items[0], quantity: 1 }] });
  const refunded = order({ id: "#MH3", stage: "Refunded", items: [{ ...order({}).items[0], quantity: 1 }] });
  const processing = order({ id: "#MH4", stage: "Processing" });
  assert.equal(admin.orderTotalKs(paid), 42000);
  assert.equal(admin.orderUnits(paid), 2);

  const summary = admin.summarizeOrders([paid, cancelled, refunded, processing]);
  assert.equal(summary.count, 4);
  assert.equal(summary.units, 2 + 1 + 1 + 2);
  assert.equal(summary.revenueKs, 42000 + 42000, "cancelled and refunded orders drop out");
  assert.equal(summary.averageOrderKs, 21000);
  assert.equal(summary.byStage.Cancelled, 1);
  assert.equal(summary.byStage.Refunded, 1);
  assert.equal(summary.byStage.Delivered, 1);
});

test("revenue buckets land on the right day and ignore settled orders", () => {
  const day = (offset) => new Date(Date.UTC(2026, 10, 21 - offset, 5, 0, 0)).toISOString();
  const orders = [
    order({ id: "#MH1", placedAt: day(0), stage: "Processing" }),
    order({ id: "#MH2", placedAt: day(0), stage: "Delivered" }),
    order({ id: "#MH3", placedAt: day(1), stage: "Cancelled" }),
    order({ id: "#MH4", placedAt: day(40), stage: "Delivered" }),
  ];
  const buckets = admin.revenueByDay(orders, 3, NOW);
  assert.equal(buckets.length, 3);
  assert.equal(buckets[2].orders, 2);
  assert.equal(buckets[2].revenueKs, 84000);
  assert.equal(buckets[1].orders, 1);
  assert.equal(buckets[1].revenueKs, 0, "a cancelled order still counts as an order but adds no revenue");
  assert.equal(buckets[0].orders, 0);
  assert.equal(buckets.reduce((total, bucket) => total + bucket.orders, 0), 3, "orders outside the window are dropped");
});

test("top products rank by units and skip settled orders", () => {
  const orders = [
    order({ id: "#MH1", items: [{ productId: "p1", name: "Hoodie", size: "L", color: "Black", quantity: 3, unitPriceKs: 42000 }] }),
    order({ id: "#MH2", items: [{ productId: "p2", name: "Cap", size: "One size", color: "Sand", quantity: 5, unitPriceKs: 18000 }] }),
    order({ id: "#MH3", stage: "Cancelled", items: [{ productId: "p3", name: "Tote Bag", size: "One size", color: "Sand", quantity: 9, unitPriceKs: 16000 }] }),
  ];
  const ranked = admin.topProducts(orders, 2);
  assert.deepEqual(ranked.map((product) => product.name), ["Cap", "Hoodie"]);
  assert.equal(ranked[0].revenueKs, 90000);
});

test("customers aggregate by email with lifetime spend and the latest order", () => {
  const orders = [
    order({ id: "#MH1", placedAt: new Date(NOW - 5 * 86400000).toISOString() }),
    order({ id: "#MH2", placedAt: new Date(NOW - 1 * 86400000).toISOString(), items: [{ productId: "p1", name: "Cap", size: "One size", color: "Sand", quantity: 1, unitPriceKs: 18000 }] }),
    order({ id: "#MH3", customerName: "May Thu", customerEmail: "may.thu@example.com", stage: "Cancelled" }),
  ];
  const customers = admin.aggregateCustomers(orders);
  assert.equal(customers.length, 2);
  const thura = customers.find((customer) => customer.email === "thura.aung@example.com");
  assert.equal(thura.orders, 2);
  assert.equal(thura.spendKs, 42000 + 18000);
  assert.equal(thura.units, 3);
  assert.equal(thura.lastOrderAt, new Date(NOW - 1 * 86400000).toISOString());
  assert.equal(customers.find((customer) => customer.email === "may.thu@example.com").spendKs, 0);
});

test("stock adjustments clamp at zero and flag low or out rows", () => {
  const data = admin.createAdminDemoData(NOW);
  const productId = data.products[0].id;
  const size = data.products[0].sizes[0];
  const start = admin.stockQuantity(data, productId, size);

  const emptied = admin.adjustStock(data, productId, size, -start - 50);
  assert.equal(admin.stockQuantity(emptied, productId, size), 0);
  const refilled = admin.adjustStock(emptied, productId, size, 7);
  assert.equal(admin.stockQuantity(refilled, productId, size), 7);

  const exact = admin.setStockQuantity(refilled, productId, size, 42);
  assert.equal(admin.stockQuantity(exact, productId, size), 42);

  const rows = admin.stockRows(refilled);
  const row = rows.find((entry) => entry.productId === productId && entry.size === size);
  assert.equal(row.quantity, 7);
  assert.equal(row.low, true, "seven is at or below the default threshold of twelve");
  assert.equal(row.out, false);
  for (const entry of rows) {
    assert.equal(entry.low, entry.quantity > 0 && entry.quantity <= refilled.settings.lowStockThreshold);
    assert.equal(entry.out, entry.quantity === 0);
  }

  const summary = admin.stockSummary(refilled);
  assert.equal(summary.skus, rows.length);
  assert.equal(summary.units, rows.reduce((total, entry) => total + entry.quantity, 0));
});

test("a posted product keeps the tags and category the search reads", () => {
  assert.deepEqual(admin.parseProductTags("  Summer , unisex ,, Summer  "), ["Summer", "unisex"], "trimmed, de-duplicated");
  assert.deepEqual(admin.parseProductTags("team kit\nbreathable"), ["team kit", "breathable"], "a new line separates too");
  const many = Array.from({ length: 15 }, (_, index) => `tag${index}`).join(",");
  assert.equal(admin.parseProductTags(many).length, admin.PRODUCT_TAG_LIMIT, "the list is capped");

  const draft = {
    ...admin.productDraftFrom(),
    name: "Summer Tee",
    category: "T-Shirt",
    fabric: "Cotton",
    gsm: "180",
    priceKs: "21000",
    tags: "summer, unisex",
    designName: "Street Vibes",
  };
  assert.deepEqual(admin.validateProductDraft(draft), []);
  const product = admin.productFromDraft(draft);
  assert.deepEqual(product.tags, ["summer", "unisex"]);
  assert.equal(product.category, "T-Shirt");
  assert.equal(admin.productDraftFrom(product).tags, "summer, unisex", "editing shows the stored tags again");

  assert.ok(admin.validateProductDraft({ ...draft, tags: "x".repeat(admin.PRODUCT_TAG_MAX_LENGTH + 1) }).some((error) => /tag/i.test(error)));
  assert.ok(admin.validateProductDraft({ ...draft, tags: many }).some((error) => /tags/i.test(error)));
});

test("product drafts are validated before they reach the catalog", () => {
  const blank = admin.productDraftFrom();
  const errors = admin.validateProductDraft(blank);
  assert.ok(errors.some((error) => /name/i.test(error)));
  assert.ok(errors.some((error) => /fabric/i.test(error)));
  assert.ok(errors.some((error) => /price/i.test(error)));
  assert.ok(errors.some((error) => /gsm/i.test(error)));

  const capDraft = { ...blank, name: "Cap", category: "Cap", fabric: "Cotton Twill", priceKs: "18000", status: "Active", designName: "Golden Peacock" };
  assert.deepEqual(admin.validateProductDraft(capDraft), [], "a cap needs no GSM");

  const apparelDraft = { ...capDraft, name: "Hoodie", category: "Hoodie", gsm: "320" };
  assert.deepEqual(admin.validateProductDraft(apparelDraft), []);
  assert.ok(admin.validateProductDraft({ ...apparelDraft, gsm: "abc" }).length > 0);

  const created = admin.productFromDraft(apparelDraft);
  assert.equal(created.gsm, 320);
  assert.deepEqual(created.sizes, admin.APPAREL_SIZES);
  const cap = admin.productFromDraft(capDraft);
  assert.equal(cap.gsm, null);
  assert.deepEqual(cap.sizes, ["One size"]);

  const existing = admin.createAdminDemoData(NOW).products[0];
  assert.equal(admin.productFromDraft(admin.productDraftFrom(existing), existing).id, existing.id, "editing keeps the id");

  const added = admin.upsertProduct(admin.createAdminDemoData(NOW), created);
  assert.ok(added.products.some((product) => product.id === created.id));
  assert.ok(added.stock[created.id], "new products get stock rows");
  const removed = admin.removeProduct(added, created.id);
  assert.equal(removed.products.some((product) => product.id === created.id), false);
  assert.equal(removed.stock[created.id], undefined);
});

test("promotions validate, expire and discount against the subtotal", () => {
  const base = {
    code: "new10", kind: "percent", value: "10", minSpendKs: "30000", usageLimit: "100",
    startsAt: "2026-11-01", endsAt: "2026-11-30",
  };
  assert.deepEqual(admin.validatePromotionDraft(base), []);
  assert.ok(admin.validatePromotionDraft({ ...base, code: "a" }).length > 0);
  assert.ok(admin.validatePromotionDraft({ ...base, value: "95" }).length > 0);
  assert.ok(admin.validatePromotionDraft({ ...base, endsAt: "2026-10-01" }).length > 0);

  const promotion = admin.promotionFromDraft(base);
  assert.equal(promotion.code, "NEW10");
  assert.equal(admin.promotionStatus(promotion, NOW), "Active");
  assert.equal(admin.promotionStatus(promotion, Date.UTC(2026, 9, 1)), "Scheduled");
  assert.equal(admin.promotionStatus(promotion, Date.UTC(2026, 11, 15)), "Expired");
  assert.equal(admin.promotionStatus({ ...promotion, enabled: false }, NOW), "Disabled");
  assert.equal(admin.promotionStatus({ ...promotion, used: 100 }, NOW), "Used up");

  assert.equal(admin.promotionDiscountKs(promotion, 50000, NOW), 5000);
  assert.equal(admin.promotionDiscountKs(promotion, 20000, NOW), 0, "below the minimum spend");
  const flat = admin.promotionFromDraft({ ...base, kind: "amount", value: "4000" });
  assert.equal(admin.promotionDiscountKs(flat, 50000, NOW), 4000);
  assert.equal(admin.promotionDiscountKs(flat, 3000, NOW), 0);

  const data = admin.upsertPromotion(admin.createAdminDemoData(NOW), promotion);
  assert.ok(data.promotions.some((item) => item.code === "NEW10"));
  const toggled = admin.togglePromotion(data, promotion.id);
  assert.equal(toggled.promotions.find((item) => item.id === promotion.id).enabled, false);
  const removed = admin.removePromotion(toggled, promotion.id);
  assert.equal(removed.promotions.some((item) => item.id === promotion.id), false);
});

test("team drafts require a module for every non-super role", () => {
  const draft = { name: "Nandar Win", email: "nandar@mhfashion.com", role: "Post Admin", modules: [] };
  assert.ok(admin.validateTeamDraft(draft).some((error) => /module/i.test(error)));
  assert.deepEqual(admin.validateTeamDraft({ ...draft, modules: ["posts"] }), []);
  assert.deepEqual(admin.validateTeamDraft({ ...draft, role: "Super Admin" }), []);
  assert.ok(admin.validateTeamDraft({ ...draft, email: "not-an-email", modules: ["posts"] }).length > 0);

  const superAdmin = { id: "t1", name: "Owner", email: "owner@mhfashion.com", role: "Super Admin", modules: [], active: true };
  const postAdmin = { id: "t2", name: "Post", email: "post@mhfashion.com", role: "Post Admin", modules: ["posts"], active: true };
  assert.equal(admin.canAccessModule(superAdmin, "settings"), true, "super admins reach every module");
  assert.equal(admin.canAccessModule(postAdmin, "posts"), true);
  assert.equal(admin.canAccessModule(postAdmin, "orders"), false);
  assert.equal(admin.canAccessModule({ ...postAdmin, active: false }, "posts"), false);

  const data = admin.upsertTeamMember(admin.createAdminDemoData(NOW), postAdmin);
  assert.ok(data.team.some((member) => member.id === "t2"));
  assert.equal(admin.removeTeamMember(data, "t2").team.some((member) => member.id === "t2"), false);
});

test("settings updates merge instead of replacing the block", () => {
  const data = admin.createAdminDemoData(NOW);
  const updated = admin.updateSettings(data, { lowStockThreshold: 5, storeName: "MH Fashion Test" });
  assert.equal(updated.settings.lowStockThreshold, 5);
  assert.equal(updated.settings.storeName, "MH Fashion Test");
  assert.equal(updated.settings.usdRateKs, data.settings.usdRateKs);
  assert.equal(data.settings.lowStockThreshold, 12, "the previous state is untouched");
});

test("CSV export escapes separators, quotes and newlines", () => {
  assert.equal(csv.toCsv([["a", "b"], [1, 2]]), "a,b\r\n1,2");
  assert.equal(csv.toCsv([["a,b", 'say "hi"', "line\nbreak", null]]), '"a,b","say ""hi""","line\nbreak",');
});
