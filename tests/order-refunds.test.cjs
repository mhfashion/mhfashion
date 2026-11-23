const assert = require("node:assert/strict");
const test = require("node:test");
const { loadModule } = require("./helpers/load-ts-module.cjs");

const refunds = loadModule("apps/web/src/lib/order-refunds.ts");
const admin = loadModule("apps/web/src/lib/admin-demo-data.ts");
const info = loadModule("apps/web/src/lib/storefront-info.ts");

const NOW = new Date(2026, 10, 21, 9, 0, 0).getTime();
const AT = new Date(NOW).toISOString();

function order(overrides = {}) {
  return {
    id: "#MH1",
    customerName: "Thura Aung",
    customerEmail: "thura.aung@example.com",
    customerPhone: "+95 9 771 220 431",
    items: [{ productId: "product-classic-tee", name: "Classic T-shirt", size: "M", color: "Black", quantity: 1, unitPriceKs: 21000 }],
    stage: "Processing",
    payment: "KBZPay",
    placedAt: AT,
    note: "",
    ...overrides,
  };
}

const ask = (overrides = {}) => refunds.requestRefund(order(), { reason: "misprint", note: "The print is smudged", at: AT, id: "rf-1", ...overrides });

test("the reasons are the published policy, not a change of mind", () => {
  const ids = refunds.REFUND_REASONS.map((reason) => reason.id);
  assert.deepEqual(ids, ["misprint", "wrong-item", "damaged", "missing"]);
  const labels = refunds.REFUND_REASONS.map((reason) => reason.label.toLowerCase()).join(" ");
  assert.doesNotMatch(labels, /change of mind|changed my mind/);
  // The published page promises exactly these, so the form cannot offer more than the policy covers.
  const policy = info.INFO_PAGES.returns.sections.flatMap((section) => section.bullets ?? []).join(" ").toLowerCase();
  assert.match(policy, /misprint/);
  assert.match(policy, /change of mind/);
});

test("a request is recorded on the order and can only be made once", () => {
  const first = ask();
  assert.deepEqual(first.issues, []);
  assert.equal(first.order.refundRequests.length, 1);
  assert.equal(first.order.refundRequests[0].status, "Requested");
  assert.equal(first.order.refundRequests[0].note, "The print is smudged");

  const again = refunds.requestRefund(first.order, { reason: "damaged", note: "", at: AT, id: "rf-2" });
  assert.equal(again.order, first.order);
  assert.match(again.issues[0], /with the print desk/);

  const unknown = refunds.requestRefund(order(), { reason: "change-of-mind", note: "", at: AT, id: "rf-3" });
  assert.equal(unknown.order.stage, "Processing");
  assert.equal(unknown.order.refundRequests, undefined);
  assert.match(unknown.issues[0], /Pick what went wrong/);
});

test("an order that cannot be refunded says why", () => {
  assert.match(refunds.refundBlocker(order({ stage: "Pending Payment" })), /not been paid/);
  assert.match(refunds.refundBlocker(order({ stage: "Cancelled" })), /was cancelled/);
  assert.match(refunds.refundBlocker(order({ stage: "Refunded" })), /already been refunded/);
  assert.equal(refunds.refundBlocker(order({ stage: "Delivered" })), null);
  assert.equal(refunds.canRequestRefund(order({ stage: "Ready to Ship" })), true);

  for (const stage of ["Pending Payment", "Cancelled", "Refunded"]) {
    const refused = refunds.requestRefund(order({ stage }), { reason: "damaged", note: "", at: AT, id: "rf-9" });
    assert.equal(refused.order.stage, stage);
    assert.equal(refused.issues.length, 1);
  }
});

test("approving refunds the order; declining needs a reason", () => {
  const asked = ask().order;
  const id = asked.refundRequests[0].id;

  const noReply = refunds.decideRefund(asked, id, "Declined", "Daw Mya", AT, "  ");
  assert.equal(noReply.order, asked);
  assert.match(noReply.issues[0], /Write why/);

  const declined = refunds.decideRefund(asked, id, "Declined", "Daw Mya", AT, "The size matches the order.");
  assert.deepEqual(declined.issues, []);
  assert.equal(declined.order.stage, "Processing", "a decline leaves the order where it was");
  assert.equal(declined.order.refundRequests[0].status, "Declined");
  assert.equal(declined.order.refundRequests[0].decidedBy, "Daw Mya");
  assert.equal(declined.order.refundRequests[0].reply, "The size matches the order.");

  const approved = refunds.decideRefund(asked, id, "Approved", "Daw Mya", AT);
  assert.deepEqual(approved.issues, []);
  assert.equal(approved.order.stage, "Refunded");
  assert.equal(approved.order.refundRequests[0].status, "Approved");

  // A decided request cannot be decided again.
  const twice = refunds.decideRefund(approved.order, id, "Declined", "Daw Mya", AT, "no");
  assert.equal(twice.order, approved.order);
  assert.match(twice.issues[0], /already approved/);

  const stranger = refunds.decideRefund(asked, "rf-404", "Approved", "Daw Mya", AT);
  assert.equal(stranger.order, asked);
  assert.match(stranger.issues[0], /not on this order/);
});

test("the desk queue is open requests only, newest first", () => {
  const older = ask({ id: "rf-old" }).order;
  const newer = refunds.requestRefund(order({ id: "#MH2" }), { reason: "missing", note: "", at: new Date(NOW + 60_000).toISOString(), id: "rf-new" }).order;
  const decided = refunds.requestRefund(order({ id: "#MH3" }), { reason: "damaged", note: "", at: AT, id: "rf-x" });
  const settledOrder = refunds.decideRefund(decided.order, "rf-x", "Approved", "Desk", AT).order;

  const queue = refunds.pendingRefundRequests([older, newer, settledOrder]);
  assert.deepEqual(queue.map((row) => row.request.id), ["rf-new", "rf-old"]);
});

test("a saved request that cannot be read is dropped, an unknown status stays open", () => {
  assert.deepEqual(refunds.normalizeRefundRequests(undefined), []);
  assert.deepEqual(refunds.normalizeRefundRequests("nope"), []);
  const kept = refunds.normalizeRefundRequests([
    null,
    { id: "rf-1", reason: "change-of-mind", note: "", at: AT, status: "Requested" },
    { id: "rf-2", reason: "damaged", note: 7, at: AT, status: "weird" },
    { id: "rf-3", reason: "misprint", note: "smudged", at: AT, status: "Approved", decidedBy: "Desk", reply: "Reprinted" },
  ]);
  assert.equal(kept.length, 2);
  assert.deepEqual(kept[0], { id: "rf-2", reason: "damaged", note: "", at: AT, status: "Requested", decidedAt: undefined, decidedBy: undefined, reply: undefined });
  assert.equal(kept[1].status, "Approved");
  assert.equal(kept[1].reply, "Reprinted");
});

test("the seeded demo orders carry no requests, so the queue starts empty", () => {
  const data = admin.createAdminDemoData(Date.UTC(2026, 10, 21));
  assert.equal(data.orders.length > 0, true);
  assert.deepEqual(refunds.pendingRefundRequests(data.orders), []);
  assert.equal(data.orders.every((entry) => !entry.refundRequests?.length), true);
});

test("the account page and the admin drawer both use this module", () => {
  const { readFileSync } = require("node:fs");
  const path = require("node:path");
  const account = readFileSync(path.join(__dirname, "..", "apps/web/src/app/account/page.tsx"), "utf8");
  const drawer = readFileSync(path.join(__dirname, "..", "apps/web/src/components/admin/AdminOrders.tsx"), "utf8");
  for (const marker of ["requestRefund(", "refundBlocker(", "data-account-refund-open", 'aria-label="Refund reason"']) {
    assert.ok(account.includes(marker), `account page is missing ${marker}`);
  }
  for (const marker of ["decideRefund(", "pendingRefundRequests(", "data-order-refunds", 'aria-label="Approve the refund"', 'aria-label="Decline the refund"']) {
    assert.ok(drawer.includes(marker), `order drawer is missing ${marker}`);
  }
});
