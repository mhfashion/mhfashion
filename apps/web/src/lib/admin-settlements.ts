// Delivery Settlement Report (Plan §16 P2). Pure rules over `data.deliveries`: filter a period,
// total what the shopper paid against what the courier is owed, and settle rows as a batch.
// A row is settled once; settling again keeps the first stamp so the report stays auditable.

import { ADMIN_COURIERS, type AdminCourier, type AdminDelivery, type AdminDemoData, type AdminDeliveryStatus } from "@/lib/admin-demo-data";

export type SettlementFilter = {
  from?: string;
  to?: string;
  courier?: AdminCourier | "all";
  status?: AdminDeliveryStatus | "all";
  settled?: "all" | "settled" | "open";
  search?: string;
};

export type SettlementTotals = {
  rows: number;
  feeKs: number;
  costKs: number;
  marginKs: number;
  openKs: number;
  settledKs: number;
  returned: number;
};

export type CourierTotal = { courier: AdminCourier; rows: number; feeKs: number; costKs: number; marginKs: number; openKs: number };

export function settlementMargin(delivery: AdminDelivery): number {
  return delivery.feeKs - delivery.costKs;
}

export function isSettled(delivery: AdminDelivery): boolean {
  return Boolean(delivery.settledAt);
}

function dayKey(value: string | Date): string {
  return new Date(value).toISOString().slice(0, 10);
}

export function filterDeliveries(deliveries: readonly AdminDelivery[], filter: SettlementFilter): AdminDelivery[] {
  const search = filter.search?.trim().toLowerCase() ?? "";
  return deliveries.filter((delivery) => {
    if (filter.from && dayKey(delivery.handedAt) < filter.from) return false;
    if (filter.to && dayKey(delivery.handedAt) > filter.to) return false;
    if (filter.courier && filter.courier !== "all" && delivery.courier !== filter.courier) return false;
    if (filter.status && filter.status !== "all" && delivery.status !== filter.status) return false;
    if (filter.settled === "settled" && !isSettled(delivery)) return false;
    if (filter.settled === "open" && isSettled(delivery)) return false;
    if (!search) return true;
    return `${delivery.orderId} ${delivery.courier} ${delivery.township}`.toLowerCase().includes(search);
  });
}

export function settlementTotals(deliveries: readonly AdminDelivery[]): SettlementTotals {
  return deliveries.reduce<SettlementTotals>((totals, delivery) => ({
    rows: totals.rows + 1,
    feeKs: totals.feeKs + delivery.feeKs,
    costKs: totals.costKs + delivery.costKs,
    marginKs: totals.marginKs + settlementMargin(delivery),
    openKs: totals.openKs + (isSettled(delivery) ? 0 : delivery.costKs),
    settledKs: totals.settledKs + (isSettled(delivery) ? delivery.costKs : 0),
    returned: totals.returned + (delivery.status === "Returned" ? 1 : 0),
  }), { rows: 0, feeKs: 0, costKs: 0, marginKs: 0, openKs: 0, settledKs: 0, returned: 0 });
}

/** One row per courier, in the courier list order so the table does not jump between renders. */
export function courierTotals(deliveries: readonly AdminDelivery[]): CourierTotal[] {
  const byCourier = new Map<AdminCourier, CourierTotal>();
  for (const courier of ADMIN_COURIERS) {
    byCourier.set(courier, { courier, rows: 0, feeKs: 0, costKs: 0, marginKs: 0, openKs: 0 });
  }
  for (const delivery of deliveries) {
    const entry = byCourier.get(delivery.courier);
    if (!entry) continue;
    entry.rows += 1;
    entry.feeKs += delivery.feeKs;
    entry.costKs += delivery.costKs;
    entry.marginKs += settlementMargin(delivery);
    if (!isSettled(delivery)) entry.openKs += delivery.costKs;
  }
  return [...byCourier.values()].filter((entry) => entry.rows > 0);
}

/** Settles the given rows. Already-settled rows keep their original stamp. */
export function markDeliveriesSettled(
  data: AdminDemoData,
  ids: readonly string[],
  actor: string,
  at: string,
): { data: AdminDemoData; settled: number; skipped: number } {
  const wanted = new Set(ids);
  let settled = 0;
  let skipped = 0;
  const deliveries = data.deliveries.map((delivery) => {
    if (!wanted.has(delivery.id)) return delivery;
    if (isSettled(delivery)) {
      skipped += 1;
      return delivery;
    }
    settled += 1;
    return { ...delivery, settledAt: at, settledBy: actor };
  });
  if (!settled) return { data, settled: 0, skipped };
  return { data: { ...data, deliveries }, settled, skipped };
}

export function unsettleDeliveries(data: AdminDemoData, ids: readonly string[]): AdminDemoData {
  const wanted = new Set(ids);
  return {
    ...data,
    deliveries: data.deliveries.map((delivery) => (wanted.has(delivery.id)
      ? { ...delivery, settledAt: null, settledBy: null }
      : delivery)),
  };
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Courier settlement sheet: one line per delivery plus a per-courier total block. */
export function buildSettlementCsv(deliveries: readonly AdminDelivery[]): string {
  const lines = ["Order,Courier,Township,Handed,Status,Shipping fee (Ks),Courier cost (Ks),Margin (Ks),Settled,Settled by,Settled at"];
  for (const delivery of deliveries) {
    lines.push([
      delivery.orderId,
      delivery.courier,
      delivery.township,
      dayKey(delivery.handedAt),
      delivery.status,
      delivery.feeKs,
      delivery.costKs,
      settlementMargin(delivery),
      isSettled(delivery) ? "Yes" : "No",
      delivery.settledBy ?? "",
      delivery.settledAt ? dayKey(delivery.settledAt) : "",
    ].map(csvCell).join(","));
  }
  const totals = settlementTotals(deliveries);
  lines.push("");
  lines.push(["Total", "", "", "", "", totals.feeKs, totals.costKs, totals.marginKs, "", "", ""].map(csvCell).join(","));
  for (const courier of courierTotals(deliveries)) {
    lines.push([`Subtotal ${courier.courier}`, "", "", "", "", courier.feeKs, courier.costKs, courier.marginKs, "", "", ""].map(csvCell).join(","));
  }
  return `\uFEFF${lines.join("\n")}`;
}

/** Period presets used by the report header (days back from `now`). */
export function periodRange(days: 7 | 30 | 90, now: Date): { from: string; to: string } {
  const to = new Date(now);
  const from = new Date(now.getTime() - days * 24 * 3600_000);
  return { from: dayKey(from), to: dayKey(to) };
}
