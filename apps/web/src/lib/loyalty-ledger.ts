// The customer's own points (Plan §9 economy). Attribute Management configures the economy — the daily
// grant, what an AI image costs, what a bought piece earns, the tiers and the milestones — and this module
// is the ledger those settings act on. Until now the account page printed a hardcoded 250, so the economy
// was a preview in the admin screen and nothing else.
//
// The ledger is browser-local like the rest of the demo store: one entry per event, never a running total,
// so an expiry, a refund or a correction can be seen and undone instead of silently changing a number.
// Spending (100 points per AI image) waits for the AI image action, which is still a stub.

import type { AdminMilestone, AdminOrder, AdminPointsRule, AdminTier } from "@/lib/admin-demo-data";

export const LOYALTY_KINDS = ["daily", "purchase"] as const;
export type LoyaltyKind = (typeof LOYALTY_KINDS)[number];

export type LoyaltyEntry = {
  id: string;
  kind: LoyaltyKind;
  /** Always positive; a reversal removes the entry it undoes rather than adding a negative one. */
  points: number;
  at: string;
  /** Daily points expire; purchase points do not. */
  expiresAt?: string;
  /** Purchase entries carry the order they came from, so a refund can remove exactly them. */
  orderId?: string;
};

export type LoyaltyLedger = LoyaltyEntry[];

/** Yangon day key, so "today" does not change at UTC midnight for a shopper in Yangon. */
export function loyaltyDayKey(at: string | Date): string {
  const date = typeof at === "string" ? new Date(at) : at;
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Yangon" }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function addHours(at: string, hours: number): string {
  return new Date(Date.parse(at) + hours * 3_600_000).toISOString();
}

export type DailyGrantResult = { ledger: LoyaltyLedger; granted: number; entry: LoyaltyEntry | null };

/** Grants the daily points once per Yangon day; a second visit the same day changes nothing. */
export function earnDaily(ledger: LoyaltyLedger, rules: AdminPointsRule, now: string): DailyGrantResult {
  const today = loyaltyDayKey(now);
  const already = ledger.some((entry) => entry.kind === "daily" && loyaltyDayKey(entry.at) === today);
  if (already || rules.dailyGrant <= 0) return { ledger, granted: 0, entry: null };
  const entry: LoyaltyEntry = {
    id: `pt-daily-${today}`,
    kind: "daily",
    points: rules.dailyGrant,
    at: now,
    expiresAt: addHours(now, rules.dailyExpiryHours),
  };
  return { ledger: [...ledger, entry], granted: rules.dailyGrant, entry };
}

/** Pieces in an order; a quantity of 0 still means one garment, as everywhere else in the shop. */
export function orderPieces(order: AdminOrder): number {
  return order.items.reduce((total, item) => total + Math.max(1, item.quantity), 0);
}

/** Buying earns `purchasePointsPerUnit` per piece, once per order: paying twice cannot earn twice. */
export function awardPurchase(
  ledger: LoyaltyLedger,
  order: AdminOrder,
  rules: AdminPointsRule,
  at: string,
): { ledger: LoyaltyLedger; awarded: number } {
  if (ledger.some((entry) => entry.kind === "purchase" && entry.orderId === order.id)) return { ledger, awarded: 0 };
  const points = orderPieces(order) * Math.max(0, rules.purchasePointsPerUnit);
  if (points <= 0) return { ledger, awarded: 0 };
  const entry: LoyaltyEntry = { id: `pt-${order.id}-${at}`, kind: "purchase", points, at, orderId: order.id };
  return { ledger: [...ledger, entry], awarded: points };
}

/** A refund takes the order's points back with the money, so the balance matches what was kept. */
export function reversePurchase(ledger: LoyaltyLedger, orderId: string): { ledger: LoyaltyLedger; reversed: number } {
  const kept = ledger.filter((entry) => !(entry.kind === "purchase" && entry.orderId === orderId));
  const reversed = ledger.filter((entry) => entry.kind === "purchase" && entry.orderId === orderId).reduce((total, entry) => total + entry.points, 0);
  return { ledger: kept, reversed };
}

export type PointsBalance = {
  total: number;
  /** Daily points that are still alive; these go first when spending arrives. */
  daily: number;
  /** Purchase points, which never expire. */
  permanent: number;
  /** When the oldest live daily points lapse, or null when none are live. */
  expiresAt: string | null;
};

export function pointsBalance(ledger: LoyaltyLedger, now: string): PointsBalance {
  const at = Date.parse(now);
  let daily = 0;
  let permanent = 0;
  let expiresAt: string | null = null;
  for (const entry of ledger) {
    if (entry.kind === "daily") {
      if (!entry.expiresAt || Date.parse(entry.expiresAt) <= at) continue;
      daily += entry.points;
      if (!expiresAt || Date.parse(entry.expiresAt) < Date.parse(expiresAt)) expiresAt = entry.expiresAt;
    } else {
      permanent += entry.points;
    }
  }
  return { total: daily + permanent, daily, permanent, expiresAt };
}

/** Oldest first, which is the order the shopper reads their history in. */
export function loyaltyHistory(ledger: LoyaltyLedger, now: string): (LoyaltyEntry & { expired: boolean })[] {
  const at = Date.parse(now);
  return ledger
    .slice()
    .sort((left, right) => Date.parse(right.at) - Date.parse(left.at))
    .map((entry) => ({ ...entry, expired: Boolean(entry.expiresAt && Date.parse(entry.expiresAt) <= at) }));
}

/** Money the shopper has actually kept with us: paid, not cancelled, not refunded. */
export function lifetimeSpendKs(orders: readonly AdminOrder[]): number {
  return orders
    .filter((order) => order.stage !== "Cancelled" && order.stage !== "Refunded" && order.stage !== "Pending Payment")
    .reduce((total, order) => total + order.items.reduce((sum, item) => sum + item.unitPriceKs * Math.max(1, item.quantity), 0), 0);
}

/** The highest tier the spend reaches; the tiers are sorted by spend so a gap cannot skip one. */
export function tierFor(spendKs: number, tiers: readonly AdminTier[]): AdminTier | null {
  const sorted = tiers.slice().sort((left, right) => left.minSpendKs - right.minSpendKs);
  let reached: AdminTier | null = null;
  for (const tier of sorted) {
    if (spendKs >= tier.minSpendKs) reached = tier;
  }
  return reached;
}

/** The next tier and what it still needs, for the "you are X away" line. */
export function nextTier(spendKs: number, tiers: readonly AdminTier[]): { tier: AdminTier; remainingKs: number } | null {
  const sorted = tiers.slice().sort((left, right) => left.minSpendKs - right.minSpendKs);
  const next = sorted.find((tier) => spendKs < tier.minSpendKs);
  return next ? { tier: next, remainingKs: next.minSpendKs - spendKs } : null;
}

export type MilestoneProgress = { milestone: AdminMilestone; reached: boolean; current: number; target: number };

/** Milestones count pieces, orders or spend over the shopper's own kept orders. */
export function milestoneProgress(
  orders: readonly AdminOrder[],
  milestones: readonly AdminMilestone[],
): MilestoneProgress[] {
  const kept = orders.filter((order) => order.stage !== "Cancelled" && order.stage !== "Refunded" && order.stage !== "Pending Payment");
  const pieces = kept.reduce((total, order) => total + orderPieces(order), 0);
  const spend = kept.reduce((total, order) => total + order.items.reduce((sum, item) => sum + item.unitPriceKs * Math.max(1, item.quantity), 0), 0);
  return milestones.map((milestone) => {
    const current = milestone.trigger === "quantity" ? pieces : milestone.trigger === "orders" ? kept.length : spend;
    return { milestone, reached: current >= milestone.threshold, current, target: milestone.threshold };
  });
}

/** A stored entry that cannot be read is dropped; a daily entry without an expiry gets the default. */
export function normalizeLoyaltyLedger(raw: unknown, rules: AdminPointsRule): LoyaltyLedger {
  if (!Array.isArray(raw)) return [];
  const ledger: LoyaltyLedger = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    const item = entry as Partial<LoyaltyEntry> | null;
    if (!item || typeof item.id !== "string" || typeof item.at !== "string") continue;
    if (!LOYALTY_KINDS.includes(item.kind as LoyaltyKind)) continue;
    if (typeof item.points !== "number" || !Number.isFinite(item.points) || item.points <= 0) continue;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    ledger.push({
      id: item.id,
      kind: item.kind as LoyaltyKind,
      points: Math.round(item.points),
      at: item.at,
      expiresAt: item.kind === "daily" ? (typeof item.expiresAt === "string" ? item.expiresAt : addHours(item.at, rules.dailyExpiryHours)) : undefined,
      orderId: typeof item.orderId === "string" ? item.orderId : undefined,
    });
  }
  return ledger;
}
