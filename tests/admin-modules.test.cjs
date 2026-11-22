const assert = require("node:assert/strict");
const test = require("node:test");
const { loadModule } = require("./helpers/load-ts-module.cjs");

const admin = loadModule("apps/web/src/lib/admin-demo-data.ts");
const ads = loadModule("apps/web/src/lib/admin-ads.ts");

const NOW = Date.UTC(2026, 10, 21, 9, 0, 0);
const yangonClock = (iso) => new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Yangon", hour12: false });

function order(overrides = {}) {
  return {
    id: "MH-2001",
    customerName: "Aye Chan",
    customerEmail: "aye@example.com",
    customerPhone: "09 111 222 333",
    items: [{ productId: "product-classic-tee", name: "Classic T-shirt", size: "L", color: "Navy", quantity: 2, unitPriceKs: 21_000 }],
    stage: "Processing",
    payment: "KBZPay",
    placedAt: new Date(NOW).toISOString(),
    note: "",
    ...overrides,
  };
}

test("the dashboard splits revenue by payment method, newest money first", () => {
  const split = admin.paymentSplit([
    order({ id: "A", payment: "KBZPay" }),
    order({ id: "B", payment: "Cash on Delivery", items: [{ ...order().items[0], quantity: 1 }] }),
    order({ id: "C", payment: "KBZPay", stage: "Cancelled", items: [{ ...order().items[0], quantity: 5 }] }),
  ]);
  assert.deepEqual(split.map((row) => row.method), ["KBZPay", "Cash on Delivery"]);
  assert.deepEqual(split[0], { method: "KBZPay", orders: 2, revenueKs: 42_000 }, "a cancelled order counts, but its money does not");
  assert.deepEqual(split[1], { method: "Cash on Delivery", orders: 1, revenueKs: 21_000 });
  assert.deepEqual(admin.paymentSplit([]), []);
});

test("a promotion runs from midnight to midnight in Yangon", () => {
  const draft = admin.promotionDraftFrom(undefined, NOW);
  assert.equal(draft.startsAt, "2026-11-21", "the default start is the Yangon day, not the UTC day");
  assert.equal(draft.endsAt, "2026-12-21");
  assert.equal(draft.kind, "percent");
  assert.equal(draft.usageLimit, "100");

  const created = admin.promotionFromDraft({ ...draft, code: " newyear ", value: "15" });
  assert.equal(created.code, "NEWYEAR", "the code is stored upper case");
  assert.equal(created.value, 15);
  assert.equal(created.used, 0);
  assert.equal(created.enabled, true);
  assert.match(yangonClock(created.startsAt), /00:00:00$/, "it starts at Yangon midnight");
  assert.match(yangonClock(created.endsAt), /23:59:59$/, "and ends at the last second of the Yangon day");

  // Re-opening the editor shows the same days it was saved with, on any device clock.
  const reopened = admin.promotionDraftFrom(created, NOW);
  assert.equal(reopened.startsAt, "2026-11-21");
  assert.equal(reopened.endsAt, "2026-12-21");
});

test("a promotion draft is checked before it is saved", () => {
  const good = { ...admin.promotionDraftFrom(undefined, NOW), code: "NY26", value: "10" };
  assert.deepEqual(admin.validatePromotionDraft(good), []);
  assert.equal(admin.validatePromotionDraft({ ...good, code: "A" }).length, 1, "a one-letter code is refused");
  assert.equal(admin.validatePromotionDraft({ ...good, code: "BAD CODE" }).length, 1, "a space is not allowed in a code");
  assert.equal(admin.validatePromotionDraft({ ...good, value: "0" }).length, 1);
  assert.equal(admin.validatePromotionDraft({ ...good, value: "95" }).length, 1, "a percent over 90 is refused");
  assert.deepEqual(admin.validatePromotionDraft({ ...good, kind: "amount", value: "95" }), [], "a fixed amount has no such cap");
  assert.equal(admin.validatePromotionDraft({ ...good, minSpendKs: "-1" }).length, 1);
  assert.equal(admin.validatePromotionDraft({ ...good, usageLimit: "0" }).length, 1);
  assert.equal(admin.validatePromotionDraft({ ...good, endsAt: "2026-11-20" }).length, 1, "the end has to be after the start");
});

test("a promotion is active only inside its window and under its usage limit", () => {
  const base = admin.promotionFromDraft({ ...admin.promotionDraftFrom(undefined, NOW), code: "NY26", value: "10" });
  assert.equal(admin.promotionStatus(base, NOW), "Active");
  assert.equal(admin.promotionStatus({ ...base, startsAt: new Date(NOW + 86_400_000).toISOString() }, NOW), "Scheduled");
  assert.equal(admin.promotionStatus({ ...base, endsAt: new Date(NOW - 1000).toISOString() }, NOW), "Expired");
  assert.equal(admin.promotionStatus({ ...base, used: base.usageLimit }, NOW), "Used up");
  assert.equal(admin.promotionStatus({ ...base, enabled: false }, NOW), "Disabled");

  assert.equal(admin.promotionDiscountKs(base, 100_000, NOW), 10_000);
  assert.equal(admin.promotionDiscountKs(base, 0, NOW), 0, "nothing is discounted when there is nothing to spend");
  assert.equal(admin.promotionDiscountKs({ ...base, minSpendKs: 200_000 }, 100_000, NOW), 0, "under the minimum spend");
  assert.equal(admin.promotionDiscountKs({ ...base, enabled: false }, 100_000, NOW), 0, "a disabled code discounts nothing");
  const fixed = { ...base, kind: "amount", value: 30_000 };
  assert.equal(admin.promotionDiscountKs(fixed, 20_000, NOW), 20_000, "a fixed discount never exceeds the subtotal");
});

test("promotions are added, edited, paused and removed through the demo store", () => {
  const data = admin.createAdminDemoData(NOW);
  const draft = { ...admin.promotionDraftFrom(undefined, NOW), code: "NY26", value: "10" };
  const created = admin.promotionFromDraft(draft);
  const added = admin.upsertPromotion(data, created);
  assert.equal(added.promotions.length, data.promotions.length + 1);

  const edited = admin.upsertPromotion(added, { ...created, value: 20 });
  assert.equal(edited.promotions.length, added.promotions.length, "editing does not add a second row");
  assert.equal(edited.promotions.find((promotion) => promotion.id === created.id).value, 20);
  assert.equal(admin.togglePromotion(edited, created.id).promotions.find((promotion) => promotion.id === created.id).enabled, false);
  assert.equal(admin.removePromotion(edited, created.id).promotions.some((promotion) => promotion.id === created.id), false);
});

test("a design is published, hidden and removed without touching the others", () => {
  const data = admin.createAdminDemoData(NOW);
  assert.ok(data.designs.length >= 2, "the demo data ships a few designs");
  const [first, second] = data.designs;
  const published = admin.setDesignStatus(data, first.id, "Published");
  assert.equal(published.designs.find((design) => design.id === first.id).status, "Published");
  assert.equal(published.designs.find((design) => design.id === second.id), second, "the other design is untouched");
  assert.equal(data.designs[0].status, first.status, "the input is not mutated");
  const removed = admin.removeDesign(published, first.id);
  assert.equal(removed.designs.length, data.designs.length - 1);
  assert.equal(removed.designs.some((design) => design.id === first.id), false);
});

test("combination keys and labels are built from the enabled attributes in order", () => {
  const attributes = [
    { key: "size", label: "Sizes", options: ["S", "M"] },
    { key: "color", label: "Colours", options: ["Black"] },
  ];
  assert.equal(admin.tshirtCombinationKey(attributes, { color: "Black", size: "M" }), "size=M|color=Black");
  assert.equal(admin.tshirtCombinationKey(attributes, { size: "M" }), "size=M|color=", "a missing option leaves an empty slot");
  assert.equal(admin.tshirtCombinationLabel(attributes, { size: "M", color: "Black" }), "M · Black");
  assert.equal(admin.tshirtCombinationLabel(attributes, {}), "— · —");
  assert.equal(admin.tshirtAttributeLabel("size"), "Size");
  assert.equal(admin.tshirtAttributeLabel("unknown-key"), "unknown-key", "an unknown key is shown as itself");

  const post = { attributes: [{ ...attributes[0], options: ["S", "M"] }, { ...attributes[1], options: [] }] };
  assert.equal(admin.tshirtPostAttributeSummary(post), "Sizes: S, M", "an attribute with no options is left out of the summary");
});

test("old option strings are mapped onto the current vocabulary on read", () => {
  const post = {
    id: "post-legacy",
    attributes: [
      { key: "material", label: "Material", options: ["Cotton", "Blend"] },
      { key: "cutting", label: "Cutting", options: ["Standard", "V-Neck"] },
      { key: "print", label: "Print", options: ["Screen Print"] },
    ],
    prices: [{ id: "row-1", options: { material: "Cotton", cutting: "Standard" }, priceKs: 25_000, version: 1, updatedAt: new Date(NOW).toISOString() }],
  };
  const normalised = admin.normalizeTshirtPostOptions(post);
  assert.deepEqual(normalised.attributes[0].options, ["Combed Cotton"], "two old names for one fabric collapse into one");
  assert.deepEqual(normalised.attributes[1].options, ["Crew Neck", "V-Neck"]);
  assert.deepEqual(normalised.attributes[2].options, ["DTF"], "the old print name maps onto the current one");
  assert.equal(normalised.attributes[0].label, "Fabric Type", "the label comes from the chain");
  assert.deepEqual(normalised.prices[0].options, { material: "Combed Cotton", cutting: "Crew Neck" }, "the price rows follow the same mapping");
  assert.equal(normalised.prices[0].priceKs, 25_000, "prices are not touched");
  assert.equal(post.attributes[0].options[0], "Cotton", "the stored post is not mutated");

  // A post that is already current keeps its identity, so the store does not churn.
  assert.equal(admin.normalizeTshirtPostOptions(normalised), normalised);
});

test("a mockup places the print area on the garment it will be printed on", () => {
  const front = admin.designMockupPlacement("Front", 28, 35, { name: "Classic T-shirt", size: "L", color: "Navy" });
  assert.equal(front.name, "Classic T-shirt · Navy · L");
  assert.equal(front.garmentWidthCm, 54, "a size L tee is 54 cm across");
  assert.equal(front.garmentHeightCm, 72);
  assert.equal(front.printAreaXCm, 13, "a front print is centred: (54 - 28) / 2");
  assert.equal(front.printAreaYCm, 15.8, "and sits 22% down the shirt");

  const chest = admin.designMockupPlacement("Left chest", 9, 9, { size: "M" });
  assert.equal(chest.printAreaXCm, 35, "the chest print is set in from the wearer's left, 6 cm off the edge");
  assert.equal(admin.designMockupPlacement("Sleeve", 7, 7, { size: "M" }).printAreaXCm, 4);

  const hoodie = admin.designMockupPlacement("Front", 28, 35, { category: "Hoodie", size: "M" });
  assert.equal(hoodie.garmentHeightCm, 76, "a hoodie is 6 cm longer than the tee of the same size");
  assert.equal(admin.designMockupPlacement("Front", 28, 35, { size: "3XL" }).garmentWidthCm, 50, "an unknown size falls back to M");
  const huge = admin.designMockupPlacement("Front", 80, 90, { size: "S" });
  assert.equal(huge.printAreaXCm, 0, "a print wider than the garment is clamped to the edge, never negative");
  assert.equal(huge.printAreaYCm, 0);
});

test("the design file is sized in centimetres and draws every layer", () => {
  const design = {
    name: "Street Vibes & Co",
    ink: "#2f7d32",
    printWidthCm: 28,
    printHeightCm: 35,
    unitsPerCm: 10,
    layers: [
      { name: "Title", kind: "text", text: "Street <Vibes>", x: 0, y: 0, width: 100, height: 40, rotation: 0, scale: 1 },
      { name: "Block", kind: "shape", x: 10, y: 50, width: 80, height: 60, rotation: 12, scale: 1.5 },
      { name: "Photo", kind: "image", x: 0, y: 120, width: 40, height: 40, rotation: 0, scale: 1 },
    ],
  };
  const svg = admin.buildDesignSvg(design);
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="28cm" height="35cm" viewBox="0 0 280\.0 350\.0">/);
  assert.match(svg, /<title>Street Vibes &amp; Co<\/title>/, "the title is escaped");
  assert.match(svg, /<text [^>]*>Street &lt;Vibes&gt;<\/text>/, "the layer text is escaped");
  assert.match(svg, /transform="rotate\(12 /, "a rotated layer carries its rotation into the file");
  assert.match(svg, /width="120\.0" height="90\.0"/, "a scaled layer is written at its scaled size");
  assert.equal((svg.match(/<rect /g) || []).length, 2, "the shape and the image placeholder are both drawn");
});

test("an id is unique and says what it belongs to", () => {
  const first = admin.makeAdminId("promo");
  const second = admin.makeAdminId("promo");
  assert.match(first, /^promo-[a-z0-9]+-[a-z0-9]+$/);
  assert.notEqual(first, second);
  assert.match(ads.makeAdId(NOW), /^ad_/);
});
