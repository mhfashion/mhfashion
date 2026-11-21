"use client";

import { useMemo, useState } from "react";
import { Check, Download, HandCoins, RotateCcw, Search, Truck, Wallet } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import { AdminBadge, AdminButton, AdminCard, AdminEmpty, AdminSelect, AdminStat } from "@/components/admin/AdminUi";
import { getDemoAdminSession } from "@/lib/admin-demo-auth";
import { updateAdminData, useAdminDemoData } from "@/lib/admin-demo-store";
import { ADMIN_COURIERS, formatKs, type AdminCourier, type AdminDeliveryStatus } from "@/lib/admin-demo-data";
import {
  buildSettlementCsv, courierTotals, filterDeliveries, isSettled, markDeliveriesSettled, periodRange,
  settlementMargin, settlementTotals, unsettleDeliveries, type SettlementFilter,
} from "@/lib/admin-settlements";

const STATUS_TONES: Record<AdminDeliveryStatus, "green" | "amber" | "red"> = {
  Delivered: "green",
  "In transit": "amber",
  Returned: "red",
};

export default function AdminSettlements() {
  const data = useAdminDemoData();
  const [days, setDays] = useState<"all" | 7 | 30 | 90>("all");
  const [courier, setCourier] = useState<AdminCourier | "all">("all");
  const [status, setStatus] = useState<AdminDeliveryStatus | "all">("all");
  const [settled, setSettled] = useState<"all" | "settled" | "open">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");

  const filter: SettlementFilter = useMemo(() => ({
    ...(days === "all" ? {} : periodRange(days, new Date())),
    courier,
    status,
    settled,
    search,
  }), [days, courier, status, settled, search]);

  const rows = useMemo(() => filterDeliveries(data.deliveries, filter).sort((a, b) => b.handedAt.localeCompare(a.handedAt)), [data.deliveries, filter]);
  const totals = settlementTotals(rows);
  const couriers = courierTotals(rows);
  const openSelected = rows.filter((row) => selected.has(row.id) && !isSettled(row));

  function settle() {
    if (!openSelected.length) {
      setMessage("Pick at least one unsettled delivery.");
      return;
    }
    const actor = getDemoAdminSession()?.name ?? "Admin";
    let settledCount = 0;
    let skipped = 0;
    updateAdminData((current) => {
      const result = markDeliveriesSettled(current, openSelected.map((row) => row.id), actor, new Date().toISOString());
      settledCount = result.settled;
      skipped = result.skipped;
      return result.data;
    });
    setSelected(new Set());
    setMessage(`${settledCount} deliver${settledCount === 1 ? "y" : "ies"} settled${skipped ? `, ${skipped} already settled` : ""}.`);
  }

  function undo() {
    if (!selected.size) {
      setMessage("Pick a settled row to reopen.");
      return;
    }
    const settledSelected = rows.filter((row) => selected.has(row.id) && isSettled(row));
    if (!settledSelected.length) {
      setMessage("None of the selected rows are settled.");
      return;
    }
    updateAdminData((current) => unsettleDeliveries(current, settledSelected.map((row) => row.id)));
    setSelected(new Set());
    setMessage(`${settledSelected.length} deliver${settledSelected.length === 1 ? "y" : "ies"} reopened.`);
  }

  function exportCsv() {
    const csv = buildSettlementCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mhfashion-delivery-settlement-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const allFilteredSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));

  return (
    <AdminShell
      active="settlements"
      title="Delivery Settlement"
      description="What shoppers paid for shipping against what each courier is owed, per period."
      search={(
        <label className="flex h-10 w-full min-w-0 max-w-[420px] items-center gap-2.5 rounded-full border border-[#e6e9ed] bg-[#f8f9fb] px-3.5 text-[#8c95a1] focus-within:border-[#a5d972] focus-within:bg-white">
          <Search size={16} className="shrink-0" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search deliveries" placeholder="Order, courier or township..." className="min-w-0 flex-1 bg-transparent text-[11px] text-[#252c37] outline-none placeholder:text-[#9da5af]" />
        </label>
      )}
      actions={(
        <AdminButton variant="secondary" onClick={exportCsv} aria-label="Export the settlement sheet as CSV"><Download size={13} /> Export sheet</AdminButton>
      )}
    >
      <section aria-label="Settlement metrics" className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Deliveries" value={String(totals.rows)} hint={`${totals.returned} returned`} icon={<Truck size={21} />} />
        <AdminStat label="Shipping collected" value={formatKs(totals.feeKs)} hint="Paid by shoppers" icon={<Wallet size={21} />} />
        <AdminStat label="Courier cost" value={formatKs(totals.costKs)} hint={`${formatKs(totals.openKs)} still open`} icon={<HandCoins size={21} />} />
        <AdminStat label="Margin" value={formatKs(totals.marginKs)} hint={`${formatKs(totals.settledKs)} already settled`} icon={<Check size={21} />} />
      </section>

      <AdminCard className="mt-3">
        <div className="flex flex-wrap items-end gap-2 border-b border-[#f0f2f4] px-4 py-3 sm:px-5">
          <label className="min-w-[130px] flex-1">
            <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-[#828c99]">Period</span>
            <AdminSelect aria-label="Settlement period" value={String(days)} onChange={(event) => setDays(event.target.value === "all" ? "all" : Number(event.target.value) as 7 | 30 | 90)}>
              <option value="all">All time</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </AdminSelect>
          </label>
          <label className="min-w-[130px] flex-1">
            <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-[#828c99]">Courier</span>
            <AdminSelect aria-label="Settlement courier" value={courier} onChange={(event) => setCourier(event.target.value as AdminCourier | "all")}>
              <option value="all">All couriers</option>
              {ADMIN_COURIERS.map((name) => <option key={name} value={name}>{name}</option>)}
            </AdminSelect>
          </label>
          <label className="min-w-[130px] flex-1">
            <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-[#828c99]">Status</span>
            <AdminSelect aria-label="Settlement status" value={status} onChange={(event) => setStatus(event.target.value as AdminDeliveryStatus | "all")}>
              <option value="all">Every status</option>
              <option value="In transit">In transit</option>
              <option value="Delivered">Delivered</option>
              <option value="Returned">Returned</option>
            </AdminSelect>
          </label>
          <label className="min-w-[130px] flex-1">
            <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-[#828c99]">Settlement</span>
            <AdminSelect aria-label="Settlement state" value={settled} onChange={(event) => setSettled(event.target.value as "all" | "settled" | "open")}>
              <option value="all">Settled and open</option>
              <option value="open">Open only</option>
              <option value="settled">Settled only</option>
            </AdminSelect>
          </label>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <span data-settlement-count className="text-[10px] font-bold text-[#6c7683]">{rows.length} of {data.deliveries.length} deliveries</span>
            <AdminButton compact onClick={settle} disabled={!openSelected.length} aria-label="Mark the selected deliveries settled"><Check size={12} /> Mark settled</AdminButton>
            <AdminButton compact variant="ghost" onClick={undo} disabled={!selected.size} aria-label="Reopen the selected settled deliveries"><RotateCcw size={12} /> Reopen</AdminButton>
          </div>
        </div>

        {rows.length === 0 ? (
          <AdminEmpty title="No deliveries in this period" description="Widen the period or clear a filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[10px]">
              <thead className="bg-[#fafbfc] text-[9px] font-semibold text-[#828c99]">
                <tr>
                  <th className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      aria-label="Select all filtered deliveries"
                      className="h-4 w-4 accent-[#4cae22] [color-scheme:light]"
                      checked={allFilteredSelected}
                      onChange={(event) => setSelected(event.target.checked ? new Set(rows.map((row) => row.id)) : new Set())}
                    />
                  </th>
                  <th className="px-3 py-2.5">Order</th>
                  <th className="px-3 py-2.5">Courier</th>
                  <th className="px-3 py-2.5">Township</th>
                  <th className="px-3 py-2.5">Handed</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 text-right">Fee</th>
                  <th className="px-3 py-2.5 text-right">Cost</th>
                  <th className="px-3 py-2.5 text-right">Margin</th>
                  <th className="px-3 py-2.5">Settlement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f2f4]">
                {rows.map((row) => {
                  const margin = settlementMargin(row);
                  return (
                    <tr key={row.id} className={selected.has(row.id) ? "bg-[#f6fbf1]" : "hover:bg-[#fafbfc]"}>
                      <td className="px-3 py-1.5">
                        <input
                          type="checkbox"
                          aria-label={`Select delivery for ${row.orderId}`}
                          className="h-4 w-4 accent-[#4cae22] [color-scheme:light]"
                          checked={selected.has(row.id)}
                          onChange={() => setSelected((current) => {
                            const next = new Set(current);
                            if (next.has(row.id)) next.delete(row.id);
                            else next.add(row.id);
                            return next;
                          })}
                        />
                      </td>
                      <td className="px-3 py-1.5 font-bold text-[#303844]">{row.orderId}</td>
                      <td className="px-3 py-1.5 text-[#4b5563]">{row.courier}</td>
                      <td className="px-3 py-1.5 text-[#6c7683]">{row.township}</td>
                      <td className="px-3 py-1.5 tabular-nums text-[#6c7683]">{new Date(row.handedAt).toLocaleDateString("en-GB", { timeZone: "Asia/Yangon" })}</td>
                      <td className="px-3 py-1.5"><AdminBadge tone={STATUS_TONES[row.status]}>{row.status}</AdminBadge></td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{formatKs(row.feeKs)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{formatKs(row.costKs)}</td>
                      <td className={`px-3 py-1.5 text-right tabular-nums font-semibold ${margin < 0 ? "text-[#a33]" : "text-[#3f8c22]"}`}>{formatKs(margin)}</td>
                      <td className="px-3 py-1.5">
                        {isSettled(row) ? (
                          <span className="text-[9px] text-[#6c7683]">{row.settledBy} · {row.settledAt ? new Date(row.settledAt).toLocaleDateString("en-GB", { timeZone: "Asia/Yangon" }) : ""}</span>
                        ) : <AdminBadge tone="amber">Open</AdminBadge>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t border-[#e5e9ee] bg-[#fafbfc] text-[10px] font-bold text-[#303844]">
                <tr>
                  <td colSpan={6} className="px-3 py-2">Total · {totals.rows} deliveries</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatKs(totals.feeKs)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatKs(totals.costKs)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-[#3f8c22]">{formatKs(totals.marginKs)}</td>
                  <td className="px-3 py-2">{formatKs(totals.openKs)} open</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </AdminCard>

      {couriers.length ? (
        <AdminCard className="mt-3">
          <div className="px-4 py-3 sm:px-5">
            <h2 className="text-[11px] font-bold text-[#303844]">Per courier</h2>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-[10px]">
                <thead className="text-[9px] font-semibold text-[#828c99]">
                  <tr>
                    <th className="py-1.5 pr-3">Courier</th>
                    <th className="px-3 py-1.5 text-right">Deliveries</th>
                    <th className="px-3 py-1.5 text-right">Fee</th>
                    <th className="px-3 py-1.5 text-right">Cost</th>
                    <th className="px-3 py-1.5 text-right">Margin</th>
                    <th className="px-3 py-1.5 text-right">Open</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f2f4]">
                  {couriers.map((entry) => (
                    <tr key={entry.courier}>
                      <td className="py-1.5 pr-3 font-semibold text-[#303844]">{entry.courier}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{entry.rows}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{formatKs(entry.feeKs)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{formatKs(entry.costKs)}</td>
                      <td className={`px-3 py-1.5 text-right tabular-nums font-semibold ${entry.marginKs < 0 ? "text-[#a33]" : "text-[#3f8c22]"}`}>{formatKs(entry.marginKs)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{formatKs(entry.openKs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </AdminCard>
      ) : null}

      {message ? <p data-settlement-message role="status" className="mt-2 text-[10px] font-semibold text-[#3f8c22]">{message}</p> : null}

      <p className="mt-3 text-[10px] text-[#98a1ac]">
        A row settles once; reopening keeps the courier cost in the open balance again. Returns keep their cost, so a returned parcel shows a negative margin.
      </p>
    </AdminShell>
  );
}
