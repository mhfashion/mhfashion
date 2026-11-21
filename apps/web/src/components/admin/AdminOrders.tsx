"use client";

import { useMemo, useState } from "react";
import {
  Check, Download, Package, Search, Truck, X,
} from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import {
  AdminBadge, AdminButton, AdminCard, AdminDrawer, AdminEmpty,
  AdminStat, AdminTextarea, type AdminTone,
} from "@/components/admin/AdminUi";
import { updateAdminData, useAdminDemoData } from "@/lib/admin-demo-store";
import { downloadCsv } from "@/lib/admin-csv";
import {
  ADMIN_ORDER_STAGES, formatAdminDateTime, formatKs, nextOrderStage, orderStageIndex,
  orderTotalKs, orderUnits, setOrderNote, setOrderStage, summarizeOrders,
  type AdminOrder, type AdminOrderStage,
} from "@/lib/admin-demo-data";

const STAGE_TONES: Record<AdminOrderStage, AdminTone> = {
  "Pending Payment": "amber",
  Confirmed: "blue",
  Processing: "blue",
  Printing: "violet",
  "Ready to Ship": "green",
  "Handed to Delivery": "green",
  "Out for Delivery": "green",
  Delivered: "slate",
  Cancelled: "red",
  Refunded: "red",
};

const FILTERS: (AdminOrderStage | "All")[] = ["All", ...ADMIN_ORDER_STAGES, "Cancelled", "Refunded"];

function orderSearchText(order: AdminOrder) {
  return `${order.id} ${order.customerName} ${order.customerEmail} ${order.stage} ${order.payment} ${order.items.map((item) => `${item.name} ${item.size} ${item.color}`).join(" ")}`.toLowerCase();
}

function productionRows(order: AdminOrder) {
  return [
    ["Order", "Product", "Size", "Color", "Quantity", "Unit price (Ks)", "Line total (Ks)", "Stage", "Payment"],
    ...order.items.map((item) => [
      order.id, item.name, item.size, item.color, item.quantity,
      item.unitPriceKs, item.unitPriceKs * item.quantity, order.stage, order.payment,
    ]),
  ];
}

export default function AdminOrders() {
  const data = useAdminDemoData();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<AdminOrderStage | "All">("All");
  const [openId, setOpenId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  const query = search.trim().toLowerCase();
  const summary = useMemo(() => summarizeOrders(data.orders), [data.orders]);
  const filtered = useMemo(() => data.orders.filter((order) => (
    (filter === "All" || order.stage === filter) && orderSearchText(order).includes(query)
  )), [data.orders, filter, query]);
  const selected = data.orders.find((order) => order.id === openId) ?? null;
  const nextStage = selected ? nextOrderStage(selected.stage) : null;
  const queueUnits = data.orders.filter((order) => !["Delivered", "Cancelled", "Refunded"].includes(order.stage)).reduce((total, order) => total + orderUnits(order), 0);

  function openOrder(order: AdminOrder) {
    setOpenId(order.id);
    setNoteDraft(order.note);
  }

  function advance(order: AdminOrder) {
    const next = nextOrderStage(order.stage);
    if (!next) return;
    updateAdminData((current) => setOrderStage(current, order.id, next));
  }

  function moveTo(order: AdminOrder, stage: AdminOrderStage) {
    updateAdminData((current) => setOrderStage(current, order.id, stage));
  }

  function saveNote(order: AdminOrder) {
    updateAdminData((current) => setOrderNote(current, order.id, noteDraft.trim()));
  }

  return (
    <AdminShell
      active="orders"
      title="Orders"
      description="Advance the production pipeline, hand off to delivery and keep notes on every order."
      actions={<AdminButton variant="secondary" onClick={() => downloadCsv("mh-fashion-orders.csv", [["Order", "Customer", "Email", "Items", "Units", "Total (Ks)", "Payment", "Stage", "Placed"], ...filtered.map((order) => [order.id, order.customerName, order.customerEmail, order.items.map((item) => `${item.name} (${item.size})`).join(" + "), orderUnits(order), orderTotalKs(order), order.payment, order.stage, formatAdminDateTime(order.placedAt)])])}><Download size={14} /> Export CSV</AdminButton>}
      search={(
        <label className="flex h-10 w-full max-w-[420px] items-center gap-2.5 rounded-full border border-[#e6e9ed] bg-[#f8f9fb] px-3.5 text-[#8c95a1] focus-within:border-[#a5d972] focus-within:bg-white">
          <Search size={16} className="shrink-0" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search orders" placeholder="Search order, customer, product..." className="min-w-0 flex-1 bg-transparent text-[11px] text-[#252c37] outline-none placeholder:text-[#9da5af]" />
        </label>
      )}
    >
      <section aria-label="Order metrics" className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Orders" value={String(summary.count)} hint={`${summary.units} units ordered`} icon={<Package size={21} />} />
        <AdminStat label="Revenue" value={formatKs(summary.revenueKs)} hint="Cancelled and refunded excluded" icon={<Truck size={21} />} />
        <AdminStat label="In production" value={String(summary.byStage.Processing + summary.byStage.Printing + summary.byStage.Confirmed)} hint={`${summary.byStage["Pending Payment"]} awaiting payment`} icon={<Package size={21} />} />
        <AdminStat label="Waiting to ship" value={String(summary.byStage["Ready to Ship"] + summary.byStage["Handed to Delivery"] + summary.byStage["Out for Delivery"])} hint={`${queueUnits} units in the queue`} icon={<Truck size={21} />} />
      </section>

      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter orders by stage">
        {FILTERS.map((stage) => {
          const count = stage === "All" ? data.orders.length : data.orders.filter((order) => order.stage === stage).length;
          return (
            <button
              key={stage}
              type="button"
              aria-pressed={filter === stage}
              onClick={() => setFilter(stage)}
              className={`rounded-full border px-2.5 py-1 text-[9px] font-bold transition-colors ${filter === stage ? "border-[#4cae22] bg-[#eef8e6] text-[#3f8c22]" : "border-[#e4e8ed] bg-white text-[#6c7683] hover:bg-[#f7f9fb]"}`}
            >
              {stage} <span className="ml-1 text-[8px] opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      <AdminCard className="mt-3 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-[10px]">
            <thead className="bg-[#fafbfc] text-[9px] font-semibold text-[#828c99]">
              <tr>
                <th className="px-4 py-2.5 font-semibold sm:px-5">Order</th>
                <th className="px-3 py-2.5 font-semibold">Customer</th>
                <th className="px-3 py-2.5 font-semibold">Items</th>
                <th className="px-3 py-2.5 font-semibold">Total</th>
                <th className="px-3 py-2.5 font-semibold">Payment</th>
                <th className="px-3 py-2.5 font-semibold">Stage</th>
                <th className="px-3 py-2.5 font-semibold">Placed</th>
                <th className="px-4 py-2.5 text-right font-semibold sm:px-5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f2f4]">
              {filtered.length ? filtered.map((order) => {
                const next = nextOrderStage(order.stage);
                return (
                  <tr key={order.id} className="hover:bg-[#fafbfc]">
                    <td className="whitespace-nowrap px-4 py-3 font-bold text-[#505a68] sm:px-5">{order.id}</td>
                    <td className="px-3 py-2.5">
                      <span className="block font-semibold text-[#394250]">{order.customerName}</span>
                      <span className="mt-0.5 block text-[8px] text-[#919aa6]">{order.customerEmail}</span>
                    </td>
                    <td className="px-3 py-2.5 text-[#727d8a]">{order.items.map((item) => `${item.name} ×${item.quantity}`).join(", ")}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-[#394250]">{formatKs(orderTotalKs(order))}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[#727d8a]">{order.payment}</td>
                    <td className="px-3 py-2.5"><AdminBadge tone={STAGE_TONES[order.stage]}>{order.stage}</AdminBadge></td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[#919aa6]">{formatAdminDateTime(order.placedAt)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right sm:px-5">
                      <div className="inline-flex items-center gap-1.5">
                        {next ? <AdminButton compact variant="secondary" onClick={() => advance(order)} aria-label={`Advance ${order.id} to ${next}`}>{next}</AdminButton> : null}
                        <AdminButton compact variant="ghost" onClick={() => openOrder(order)} aria-label={`Open ${order.id}`}>Open</AdminButton>
                      </div>
                    </td>
                  </tr>
                );
              }) : <tr><td colSpan={8}><AdminEmpty title="No orders match this filter" description="Clear the search or pick another stage." /></td></tr>}
            </tbody>
          </table>
        </div>
      </AdminCard>

      <AdminDrawer
        open={Boolean(selected)}
        title={selected ? `Order ${selected.id}` : "Order"}
        description={selected ? `${selected.customerName} · ${formatAdminDateTime(selected.placedAt)}` : undefined}
        onClose={() => setOpenId(null)}
        footer={selected ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <AdminButton variant="secondary" onClick={() => downloadCsv(`${selected.id.replace("#", "order-")}-production.csv`, productionRows(selected))}><Download size={14} /> Production CSV</AdminButton>
            <div className="flex flex-wrap items-center gap-2">
              {selected.stage !== "Cancelled" && selected.stage !== "Refunded" ? <AdminButton variant="danger" onClick={() => moveTo(selected, "Cancelled")}><X size={14} /> Cancel</AdminButton> : null}
              {selected.stage === "Delivered" ? <AdminButton variant="secondary" onClick={() => moveTo(selected, "Refunded")}>Refund</AdminButton> : null}
              {nextStage ? <AdminButton onClick={() => advance(selected)}><Check size={14} /> Mark {nextStage}</AdminButton> : null}
            </div>
          </div>
        ) : null}
      >
        {selected ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-[#edf0f3] bg-[#fafbfc] p-3">
              <p className="text-[10px] font-bold text-[#394250]">{selected.customerName}</p>
              <p className="mt-0.5 text-[9px] text-[#87909b]">{selected.customerEmail}</p>
              <p className="mt-0.5 text-[9px] text-[#87909b]">{selected.customerPhone}</p>
              <div className="mt-2 flex items-center gap-2">
                <AdminBadge tone={STAGE_TONES[selected.stage]}>{selected.stage}</AdminBadge>
                <AdminBadge tone="slate">{selected.payment}</AdminBadge>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[#7b8492]">Items</h3>
              <table className="w-full text-left text-[10px]">
                <thead className="text-[9px] text-[#828c99]"><tr><th className="pb-1.5 font-semibold">Product</th><th className="pb-1.5 font-semibold">Variant</th><th className="pb-1.5 text-right font-semibold">Qty</th><th className="pb-1.5 text-right font-semibold">Total</th></tr></thead>
                <tbody className="divide-y divide-[#f0f2f4]">
                  {selected.items.map((item) => (
                    <tr key={`${item.productId}-${item.size}-${item.color}`}>
                      <td className="py-2 font-semibold text-[#394250]">{item.name}</td>
                      <td className="py-2 text-[#727d8a]">{item.size} · {item.color}</td>
                      <td className="py-2 text-right tabular-nums text-[#394250]">{item.quantity}</td>
                      <td className="py-2 text-right tabular-nums font-semibold text-[#394250]">{formatKs(item.quantity * item.unitPriceKs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-2 flex items-center justify-between border-t border-[#edf0f3] pt-2 text-[11px] font-bold text-[#27303b]">
                <span>Total</span><span>{formatKs(orderTotalKs(selected))}</span>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[#7b8492]">Pipeline</h3>
              <ol className="space-y-1.5">
                {ADMIN_ORDER_STAGES.map((stage) => {
                  const current = orderStageIndex(selected.stage);
                  const index = orderStageIndex(stage);
                  const done = current >= 0 && index < current;
                  const active = selected.stage === stage;
                  return (
                    <li key={stage} className="flex items-center gap-2 text-[10px]">
                      <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${active ? "border-[#4cae22] bg-[#4cae22] text-white" : done ? "border-[#bfe0ab] bg-[#eef8e6] text-[#4cae22]" : "border-[#e2e7ec] text-transparent"}`}>{done || active ? <Check size={10} /> : null}</span>
                      <span className={active ? "font-bold text-[#27303b]" : done ? "text-[#5c6673]" : "text-[#9aa2ae]"}>{stage}</span>
                    </li>
                  );
                })}
              </ol>
              {selected.stage === "Cancelled" || selected.stage === "Refunded" ? <p className="mt-2 rounded-lg bg-[#fff6f6] px-2.5 py-1.5 text-[9px] font-semibold text-[#c9424a]">This order is {selected.stage.toLowerCase()} and left the production pipeline.</p> : null}
            </div>

            <div>
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[#7b8492]">Print desk note</h3>
              <AdminTextarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} rows={3} aria-label="Order note" placeholder="Add a note for the print desk..." />
              <div className="mt-2 flex justify-end"><AdminButton compact variant="secondary" onClick={() => saveNote(selected)}>Save note</AdminButton></div>
            </div>
          </div>
        ) : null}
      </AdminDrawer>

      <p className="mt-3 text-[9px] text-[#929ba7]">Sample orders are stored in this browser only; stage changes survive a reload.</p>
    </AdminShell>
  );
}
