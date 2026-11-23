// Refund requests (Plan §16 P2 item 13). The published policy (`/returns`) covers our mistakes — a
// misprint, a wrong colour or size we sent, damage — and not a change of mind, so the reasons here are
// exactly those. A request is recorded on the order the customer already has, which keeps the claim and
// the garment in one place instead of a second inbox nobody reads.
//
// Everything is pure and synchronous: the account page and the admin drawer both call it, and a test can
// read the same numbers without a browser.

import type { AdminOrder } from "@/lib/admin-demo-data";

export const REFUND_REASONS = [
  { id: "misprint", label: "Misprint" },
  { id: "wrong-item", label: "Wrong colour or size we sent" },
  { id: "damaged", label: "Damaged when it arrived" },
  { id: "missing", label: "Never arrived" },
] as const;

export type RefundReasonId = (typeof REFUND_REASONS)[number]["id"];
export type RefundStatus = "Requested" | "Approved" | "Declined";

export type AdminOrderRefundRequest = {
  id: string;
  reason: RefundReasonId;
  /** What the customer wrote; the photo travels through the contact channel until uploads exist. */
  note: string;
  at: string;
  status: RefundStatus;
  decidedAt?: string;
  decidedBy?: string;
  /** The shop's answer, shown to the customer under the request. */
  reply?: string;
};

export type RefundRequestInput = { reason: RefundReasonId; note: string; at: string; id: string };
export type RefundPatch = { order: AdminOrder; issues: string[] };

export function refundReasonLabel(reason: string): string {
  return REFUND_REASONS.find((entry) => entry.id === reason)?.label ?? reason;
}

/** The newest request, which is the one the customer and the desk both act on. */
export function latestRefundRequest(order: AdminOrder): AdminOrderRefundRequest | null {
  const requests = order.refundRequests ?? [];
  return requests.length ? requests[requests.length - 1] : null;
}

/**
 * Why this order cannot take a request right now, or null when it can. An order is refundable once it is
 * paid and still moving; an order that was cancelled or already refunded has nothing left to refund, and
 * an open request must be answered before another one is made.
 */
export function refundBlocker(order: AdminOrder): string | null {
  if (order.stage === "Cancelled") return "This order was cancelled, so there is nothing to refund.";
  if (order.stage === "Refunded") return "This order has already been refunded.";
  if (order.stage === "Pending Payment") return "This order has not been paid yet.";
  const latest = latestRefundRequest(order);
  if (latest?.status === "Requested") return "Your request is with the print desk. We answer within one working day.";
  return null;
}

export function canRequestRefund(order: AdminOrder): boolean {
  return refundBlocker(order) === null;
}

export function requestRefund(order: AdminOrder, input: RefundRequestInput): RefundPatch {
  const blocker = refundBlocker(order);
  if (blocker) return { order, issues: [blocker] };
  if (!REFUND_REASONS.some((entry) => entry.id === input.reason)) {
    return { order, issues: ["Pick what went wrong so the desk knows what to look for."] };
  }
  const request: AdminOrderRefundRequest = {
    id: input.id,
    reason: input.reason,
    note: input.note.trim(),
    at: input.at,
    status: "Requested",
  };
  return { order: { ...order, refundRequests: [...(order.refundRequests ?? []), request] }, issues: [] };
}

export type RefundDecision = "Approved" | "Declined";

/**
 * The desk answers a request. Approving moves the order to `Refunded`, which is the stage every other
 * screen already reads, so a refunded order stops counting as revenue and its delivery row turns into a
 * return. A reply is required on a decline, because a customer who cannot see the reason will write again.
 */
export function decideRefund(
  order: AdminOrder,
  requestId: string,
  decision: RefundDecision,
  by: string,
  at: string,
  reply = "",
): RefundPatch {
  const requests = order.refundRequests ?? [];
  const index = requests.findIndex((request) => request.id === requestId);
  if (index === -1) return { order, issues: ["That request is not on this order."] };
  const request = requests[index];
  if (request.status !== "Requested") return { order, issues: [`This request was already ${request.status.toLowerCase()}.`] };
  if (decision === "Declined" && !reply.trim()) return { order, issues: ["Write why, so the customer knows what happens next."] };
  const decided: AdminOrderRefundRequest = {
    ...request,
    status: decision,
    decidedAt: at,
    decidedBy: by,
    reply: reply.trim() || undefined,
  };
  const nextRequests = requests.slice();
  nextRequests[index] = decided;
  return {
    order: {
      ...order,
      refundRequests: nextRequests,
      stage: decision === "Approved" ? "Refunded" : order.stage,
    },
    issues: [],
  };
}

/** Open requests first, newest first: the desk works the queue from the top. */
export function pendingRefundRequests(orders: readonly AdminOrder[]): { order: AdminOrder; request: AdminOrderRefundRequest }[] {
  const rows: { order: AdminOrder; request: AdminOrderRefundRequest }[] = [];
  for (const order of orders) {
    for (const request of order.refundRequests ?? []) {
      if (request.status === "Requested") rows.push({ order, request });
    }
  }
  return rows.sort((left, right) => Date.parse(right.request.at) - Date.parse(left.request.at));
}

/** A stored request that cannot be read is dropped; an unknown status is treated as still open. */
export function normalizeRefundRequests(raw: unknown): AdminOrderRefundRequest[] {
  if (!Array.isArray(raw)) return [];
  const requests: AdminOrderRefundRequest[] = [];
  for (const entry of raw) {
    const request = entry as Partial<AdminOrderRefundRequest> | null;
    if (!request || typeof request.id !== "string" || typeof request.at !== "string") continue;
    if (!REFUND_REASONS.some((reason) => reason.id === request.reason)) continue;
    const status: RefundStatus = request.status === "Approved" || request.status === "Declined" ? request.status : "Requested";
    requests.push({
      id: request.id,
      reason: request.reason as RefundReasonId,
      note: typeof request.note === "string" ? request.note : "",
      at: request.at,
      status,
      decidedAt: typeof request.decidedAt === "string" ? request.decidedAt : undefined,
      decidedBy: typeof request.decidedBy === "string" ? request.decidedBy : undefined,
      reply: typeof request.reply === "string" && request.reply ? request.reply : undefined,
    });
  }
  return requests;
}
