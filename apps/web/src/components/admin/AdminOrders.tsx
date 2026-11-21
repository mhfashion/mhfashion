"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays, Check, Download, FileDown, Package, Printer, Search, Truck, X,
} from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import {
  AdminBadge, AdminButton, AdminCard, AdminCardHeader, AdminDrawer, AdminEmpty,
  AdminField, AdminInput, AdminSelect, AdminStat, AdminTextarea, type AdminTone,
} from "@/components/admin/AdminUi";
import { updateAdminData, useAdminDemoData } from "@/lib/admin-demo-store";
import { downloadCsv } from "@/lib/admin-csv";
import {
  designPreviewSrc, downloadDesignFile, downloadOrderArchive, openOrderPrintSheet, orderPrintRows,
} from "@/lib/order-print";
import {
  ADMIN_ORDER_DATE_PRESETS, ADMIN_ORDER_SORTS, ADMIN_ORDER_STAGES,
  adminDayKey, adminDayLabel, adminTodayKey, buildMockupDiagramSvg, designLayerSize,
  formatAdminDateTime, formatKs, nextOrderStage,
  orderDateRangeForPreset, orderDayGroups, orderStageIndex, orderTotalKs, orderUnits,
  ordersInDateRange, setOrderNote, setOrderStage, sortOrders, summarizeOrders,
  type AdminDateRange, type AdminOrder, type AdminOrderDatePreset, type AdminOrderSort,
  type AdminOrderStage,
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

function count(value: number, word: string) {
  return `${value} ${word}${value === 1 ? "" : "s"}`;
}

function orderSearchText(order: AdminOrder) {
  return `${order.id} ${order.customerName} ${order.customerEmail} ${order.stage} ${order.payment} ${order.items.map((item) => `${item.name} ${item.size} ${item.color}`).join(" ")}`.toLowerCase();
}

export default function AdminOrders() {
  const data = useAdminDemoData();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<AdminOrderStage | "All">("All");
  const [preset, setPreset] = useState<AdminOrderDatePreset>("All");
  const [range, setRange] = useState<AdminDateRange>(() => orderDateRangeForPreset("All"));
  const [sort, setSort] = useState<AdminOrderSort>("Newest first");
  const [openId, setOpenId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  const query = search.trim().toLowerCase();
  const summary = useMemo(() => summarizeOrders(data.orders), [data.orders]);
  const todayKey = adminTodayKey();
  const today = useMemo(() => summarizeOrders(data.orders.filter((order) => adminDayKey(order.placedAt) === todayKey)), [data.orders, todayKey]);
  const inRange = useMemo(() => ordersInDateRange(data.orders, range), [data.orders, range]);
  const dayGroups = useMemo(() => orderDayGroups(inRange), [inRange]);
  const filtered = useMemo(() => sortOrders(inRange.filter((order) => (
    (filter === "All" || order.stage === filter) && orderSearchText(order).includes(query)
  )), sort), [inRange, filter, query, sort]);
  const filteredSummary = useMemo(() => summarizeOrders(filtered), [filtered]);
  const rangeLabel = range.from || range.to
    ? `${range.from ? adminDayLabel(range.from) : "Start"} → ${range.to ? adminDayLabel(range.to) : "Today"}`
    : "All time";

  function choosePreset(next: AdminOrderDatePreset) {
    setPreset(next);
    setRange(orderDateRangeForPreset(next));
  }

  function chooseDay(dayKey: string) {
    setPreset("All");
    setRange({ from: dayKey, to: dayKey });
  }
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
      <section aria-label="Order metrics" className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2 xl:grid-cols-5">
        <AdminStat label="Today" value={String(today.count)} hint={`${formatKs(today.revenueKs)} · ${count(today.units, "unit")}`} icon={<CalendarDays size={21} />} />
        <AdminStat label="All orders" value={String(summary.count)} hint={`${count(summary.units, "unit")} ordered`} icon={<Package size={21} />} />
        <AdminStat label="Revenue" value={formatKs(summary.revenueKs)} hint="Cancelled and refunded excluded" icon={<Truck size={21} />} />
        <AdminStat label="In production" value={String(summary.byStage.Processing + summary.byStage.Printing + summary.byStage.Confirmed)} hint={`${summary.byStage["Pending Payment"]} awaiting payment`} icon={<Package size={21} />} />
        <AdminStat label="Waiting to ship" value={String(summary.byStage["Ready to Ship"] + summary.byStage["Handed to Delivery"] + summary.byStage["Out for Delivery"])} hint={`${count(queueUnits, "unit")} in the queue`} icon={<Truck size={21} />} />
      </section>

      <AdminCard className="mt-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0">
            <p className="mb-1 text-[9px] font-bold uppercase tracking-wide text-[#7b8492]">Date range</p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter orders by date">
              {ADMIN_ORDER_DATE_PRESETS.map((option) => (
                <button
                  key={option}
                  type="button"
                  data-order-date-preset={option}
                  aria-pressed={preset === option}
                  onClick={() => choosePreset(option)}
                  className={`rounded-full border px-2.5 py-1 text-[9px] font-bold transition-colors ${preset === option ? "border-[#4cae22] bg-[#eef8e6] text-[#3f8c22]" : "border-[#e4e8ed] bg-white text-[#6c7683] hover:bg-[#f7f9fb]"}`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div className="w-[130px]">
            <AdminField label="From">
              <AdminInput type="date" aria-label="Orders from date" data-order-from value={range.from} onChange={(event) => { setPreset("All"); setRange((current) => ({ ...current, from: event.target.value })); }} />
            </AdminField>
          </div>
          <div className="w-[130px]">
            <AdminField label="To">
              <AdminInput type="date" aria-label="Orders to date" data-order-to value={range.to} onChange={(event) => { setPreset("All"); setRange((current) => ({ ...current, to: event.target.value })); }} />
            </AdminField>
          </div>
          <div className="w-[150px]">
            <AdminField label="Sort">
              <AdminSelect aria-label="Sort orders" data-order-sort value={sort} onChange={(event) => setSort(event.target.value as AdminOrderSort)}>
                {ADMIN_ORDER_SORTS.map((option) => <option key={option} value={option}>{option}</option>)}
              </AdminSelect>
            </AdminField>
          </div>
          <p data-order-range-label className="ml-auto text-[10px] font-semibold text-[#6c7683]">
            {rangeLabel} · <span className="text-[#27303b]">{count(filtered.length, "order")}</span> · <span className="text-[#27303b]">{count(filteredSummary.units, "unit")}</span> · <span className="text-[#27303b]">{formatKs(filteredSummary.revenueKs)}</span>
          </p>
        </div>
      </AdminCard>

      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter orders by stage">
        {FILTERS.map((stage) => {
          const count = stage === "All" ? inRange.length : inRange.filter((order) => order.stage === stage).length;
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

      {dayGroups.length > 0 && (
        <AdminCard className="mt-3 overflow-hidden">
          <AdminCardHeader title="Orders by day" description="Pick a day to jump straight to it." />
          <div className="flex gap-1.5 overflow-x-auto px-3 pb-3" role="group" aria-label="Orders by day">
            {dayGroups.map((group) => (
              <button
                key={group.key}
                type="button"
                data-order-day={group.key}
                aria-pressed={range.from === group.key && range.to === group.key}
                onClick={() => chooseDay(group.key)}
                className={`shrink-0 rounded-xl border px-2.5 py-2 text-left transition-colors ${range.from === group.key && range.to === group.key ? "border-[#4cae22] bg-[#eef8e6]" : "border-[#e9edf1] bg-[#fbfcfd] hover:bg-[#f4f7f9]"}`}
              >
                <span className="block text-[9px] font-bold text-[#394250]">{group.label}</span>
                <span className="mt-0.5 block text-[9px] text-[#87909b]">{count(group.count, "order")} · {count(group.units, "unit")}</span>
                <span className="mt-0.5 block text-[9px] font-semibold text-[#4cae22]">{formatKs(group.revenueKs)}</span>
              </button>
            ))}
          </div>
        </AdminCard>
      )}

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
              }) : <tr><td colSpan={8}><AdminEmpty title="No orders match this filter" description="Clear the search, widen the date range or pick another stage." /></td></tr>}
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
            <div className="flex flex-wrap items-center gap-2">
              <AdminButton variant="secondary" onClick={() => downloadCsv(`${selected.id.replace("#", "order-")}-print-spec.csv`, orderPrintRows(selected))}><Download size={14} /> Print spec CSV</AdminButton>
              <AdminButton variant="secondary" aria-label="Download all design files and the print data as a ZIP" onClick={() => downloadOrderArchive(selected)}><FileDown size={14} /> Print files ZIP</AdminButton>
              <AdminButton onClick={() => openOrderPrintSheet(selected)}><Printer size={14} /> Print sheet</AdminButton>
            </div>
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
              {selected.shipTo ? <p className="mt-1 text-[9px] leading-snug text-[#87909b]">{selected.shipTo.address}<br />{selected.shipTo.township}, {selected.shipTo.city}</p> : null}
              <div className="mt-2 flex items-center gap-2">
                <AdminBadge tone={STAGE_TONES[selected.stage]}>{selected.stage}</AdminBadge>
                <AdminBadge tone="slate">{selected.payment}</AdminBadge>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-[#edf0f3] pt-2 text-[9px]">
                <div><dt className="text-[#87909b]">Placed</dt><dd className="font-semibold text-[#394250]">{formatAdminDateTime(selected.placedAt)}</dd></div>
                <div><dt className="text-[#87909b]">Day</dt><dd className="font-semibold text-[#394250]">{adminDayLabel(adminDayKey(selected.placedAt))}</dd></div>
                <div><dt className="text-[#87909b]">Items</dt><dd className="font-semibold text-[#394250]">{count(selected.items.length, "line")} · {count(orderUnits(selected), "unit")}</dd></div>
                <div><dt className="text-[#87909b]">Order total</dt><dd className="font-semibold text-[#394250]">{formatKs(orderTotalKs(selected))}</dd></div>
              </dl>
            </div>

            <div>
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[#7b8492]">Items</h3>
              <table className="w-full text-left text-[10px]">
                <thead className="text-[9px] text-[#828c99]"><tr><th className="pb-1.5 font-semibold">Product</th><th className="pb-1.5 font-semibold">Variant</th><th className="pb-1.5 text-right font-semibold">Qty</th><th className="pb-1.5 text-right font-semibold">Unit</th><th className="pb-1.5 text-right font-semibold">Total</th></tr></thead>
                <tbody className="divide-y divide-[#f0f2f4]">
                  {selected.items.map((item) => (
                    <tr key={`${item.productId}-${item.size}-${item.color}`}>
                      <td className="py-2 font-semibold text-[#394250]">{item.name}</td>
                      <td className="py-2 text-[#727d8a]">{item.size} · {item.color}</td>
                      <td className="py-2 text-right tabular-nums text-[#394250]">{item.quantity}</td>
                      <td className="py-2 text-right tabular-nums text-[#727d8a]">{formatKs(item.unitPriceKs)}</td>
                      <td className="py-2 text-right tabular-nums font-semibold text-[#394250]">{formatKs(item.quantity * item.unitPriceKs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-2 space-y-1 border-t border-[#edf0f3] pt-2 text-[10px] text-[#727d8a]">
                <div className="flex items-center justify-between"><span>Units</span><span className="tabular-nums">{orderUnits(selected)}</span></div>
                <div className="flex items-center justify-between text-[11px] font-bold text-[#27303b]"><span>Total</span><span className="tabular-nums">{formatKs(orderTotalKs(selected))}</span></div>
              </div>
            </div>

            <div data-order-print-sheet>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-[10px] font-bold uppercase tracking-wide text-[#7b8492]">Print sheet</h3>
                <AdminButton compact variant="secondary" onClick={() => openOrderPrintSheet(selected)}><Printer size={12} /> Print</AdminButton>
              </div>
              <div className="space-y-2">
                {selected.items.map((item, index) => {
                  const design = item.design;
                  const spec: [string, string | number][] = [
                    ["Colour", item.color],
                    ["Size", item.size],
                    ["Material", item.material ?? "—"],
                    ["GSM", item.gsm ?? "—"],
                    ["Fit", item.fit ?? "—"],
                    ["Sleeve", item.sleeve ?? "—"],
                    ["Print", item.printMethod ?? "—"],
                    ["Placement", design?.placement ?? "—"],
                    ["Print size", design ? `${design.printWidthCm} × ${design.printHeightCm} cm` : "—"],
                    ["Design", design?.name ?? "No design"],
                    ["Ink", design?.ink ?? "—"],
                    ["Mockup", design?.mockup.name ?? "—"],
                    ["Garment", design ? `${design.mockup.garmentWidthCm} × ${design.mockup.garmentHeightCm} cm` : "—"],
                    ["Print at", design ? `${design.mockup.printAreaXCm} cm left · ${design.mockup.printAreaYCm} cm top` : "—"],
                  ];
                  return (
                    <div key={`${item.productId}-${item.size}-${item.color}-${index}`} className="rounded-xl border border-[#edf0f3] p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[10px] font-bold text-[#27303b]">Line {index + 1} · {item.name}</p>
                        <span className="shrink-0 rounded-full bg-[#eef8e6] px-2 py-0.5 text-[9px] font-bold text-[#3f8c22]">×{item.quantity}</span>
                      </div>
                      <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[9px]">
                        {spec.map(([label, value]) => (
                          <div key={label} className="flex min-w-0 justify-between gap-2">
                            <dt className="shrink-0 text-[#87909b]">{label}</dt>
                            <dd className="truncate text-right font-semibold text-[#394250]">{value}</dd>
                          </div>
                        ))}
                      </dl>
                      {design ? (
                        <div className="mt-2 flex items-center gap-2 rounded-lg bg-[#fafbfc] p-2">
                          <img src={designPreviewSrc(design)} alt={`${design.name} artwork`} data-order-design-preview className="h-14 w-12 shrink-0 rounded border border-[#e6e9ed] bg-white object-contain" />
                          <img src={designPreviewSrc({ ...design, svg: buildMockupDiagramSvg(design) })} alt={`Print position on ${design.mockup.name}`} data-order-design-placement className="h-14 w-10 shrink-0 rounded border border-[#e6e9ed] bg-white object-contain" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[9px] font-bold text-[#394250]">{design.fileName}</p>
                            <p className="text-[8px] text-[#87909b]">SVG · {design.printWidthCm} × {design.printHeightCm} cm</p>
                          </div>
                          <AdminButton compact variant="secondary" aria-label={`Download ${design.fileName}`} onClick={() => downloadDesignFile(design)}><FileDown size={12} /> SVG</AdminButton>
                        </div>
                      ) : <p className="mt-2 text-[9px] text-[#9aa2ae]">No design file attached.</p>}
                      {design && design.layers.length ? (
                        <div className="mt-2" data-order-design-layout>
                          <p className="mb-1 text-[8px] font-bold uppercase tracking-wide text-[#87909b]">
                            Layout · print area {design.printWidthCm} × {design.printHeightCm} cm · {design.unitsPerCm} units/cm
                          </p>
                          <table className="w-full text-left text-[8px]">
                            <thead className="text-[#9aa2ae]"><tr><th className="pb-0.5 font-semibold">Layer</th><th className="pb-0.5 font-semibold">Type</th><th className="pb-0.5 text-right font-semibold">X</th><th className="pb-0.5 text-right font-semibold">Y</th><th className="pb-0.5 text-right font-semibold">W × H</th><th className="pb-0.5 text-right font-semibold">Rot</th><th className="pb-0.5 text-right font-semibold">Scale</th></tr></thead>
                            <tbody className="divide-y divide-[#f2f4f6] text-[#505a68]">
                              {design.layers.map((layer) => {
                                const size = designLayerSize(layer, design.unitsPerCm);
                                return (
                                  <tr key={layer.name}>
                                    <td className="py-1 font-semibold text-[#394250]">{layer.name}</td>
                                    <td className="py-1">{layer.kind}</td>
                                    <td className="py-1 text-right tabular-nums">{size.xCm}</td>
                                    <td className="py-1 text-right tabular-nums">{size.yCm}</td>
                                    <td className="py-1 text-right tabular-nums">{size.widthCm} × {size.heightCm}</td>
                                    <td className="py-1 text-right tabular-nums">{layer.rotation}°</td>
                                    <td className="py-1 text-right tabular-nums">{layer.scale}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          <p className="mt-1 text-[8px] text-[#9aa2ae]">X, Y and W × H are centimetres on the print area.</p>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
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
