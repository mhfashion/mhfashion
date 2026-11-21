"use client";

import { useMemo, useState } from "react";
import { Download, TrendingUp, Wallet } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import { AdminButton, AdminCard, AdminCardHeader, AdminEmpty, AdminStat } from "@/components/admin/AdminUi";
import { useAdminDemoData } from "@/lib/admin-demo-store";
import { downloadCsv } from "@/lib/admin-csv";
import {
  ADMIN_ORDER_STAGES, formatKs, paymentSplit, revenueByDay, stockRows, summarizeOrders, topProducts,
} from "@/lib/admin-demo-data";

const RANGES = [7, 30, 90];

export default function AdminReports() {
  const data = useAdminDemoData();
  const [days, setDays] = useState(30);

  const buckets = useMemo(() => revenueByDay(data.orders, days), [data.orders, days]);
  const summary = useMemo(() => summarizeOrders(data.orders), [data.orders]);
  const ranked = useMemo(() => topProducts(data.orders, 6), [data.orders]);
  const payments = useMemo(() => paymentSplit(data.orders), [data.orders]);
  const lowStock = useMemo(() => stockRows(data).filter((row) => row.low || row.out).slice(0, 6), [data]);
  const maxDay = Math.max(...buckets.map((bucket) => bucket.revenueKs), 1);
  const rangeRevenue = buckets.reduce((total, bucket) => total + bucket.revenueKs, 0);
  const rangeOrders = buckets.reduce((total, bucket) => total + bucket.orders, 0);
  const bestDay = buckets.reduce((best, bucket) => (bucket.revenueKs > best.revenueKs ? bucket : best), buckets[0]);

  return (
    <AdminShell
      active="reports"
      title="Reports"
      description="Revenue, product performance, payment mix and stock health from the demo orders."
      actions={(
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-[#e5e8ec] bg-white p-0.5 text-[9px] font-semibold text-[#7e8794]">
            {RANGES.map((range) => (
              <button
                key={range}
                type="button"
                aria-pressed={days === range}
                onClick={() => setDays(range)}
                className={`rounded-lg px-2.5 py-1.5 ${days === range ? "bg-[#eef8e6] text-[#3f8c22]" : "hover:bg-[#f6f8fa]"}`}
              >
                {range} days
              </button>
            ))}
          </div>
          <AdminButton
            variant="secondary"
            onClick={() => downloadCsv("mh-fashion-report.csv", [
              ["Date", "Orders", "Revenue (Ks)"],
              ...buckets.map((bucket) => [bucket.date, bucket.orders, bucket.revenueKs]),
              [],
              ["Product", "Units", "Revenue (Ks)"],
              ...ranked.map((product) => [product.name, product.units, product.revenueKs]),
            ])}
          >
            <Download size={14} /> Export
          </AdminButton>
        </div>
      )}
    >
      <section aria-label="Report metrics" className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2 xl:grid-cols-4">
        <AdminStat label={`Revenue · ${days} days`} value={formatKs(rangeRevenue)} hint={bestDay ? `Best day ${bestDay.label} · ${formatKs(bestDay.revenueKs)}` : "No orders yet"} icon={<Wallet size={21} />} />
        <AdminStat label={`Orders · ${days} days`} value={String(rangeOrders)} hint={`${summary.units} units all time`} icon={<TrendingUp size={21} />} />
        <AdminStat label="Average order" value={formatKs(summary.averageOrderKs)} hint="Cancelled and refunded excluded" icon={<Wallet size={21} />} />
        <AdminStat label="Cancelled / refunded" value={String(summary.byStage.Cancelled + summary.byStage.Refunded)} hint="Out of the revenue total" icon={<TrendingUp size={21} />} />
      </section>

      <AdminCard className="mt-3 overflow-hidden">
        <AdminCardHeader title="Revenue by day" description={`Daily totals across the last ${days} days`} />
        <div className="px-4 pb-4 pt-5 sm:px-5">
          <div className="flex h-[180px] items-end gap-[3px]" role="img" aria-label={`Daily revenue for the last ${days} days`}>
            {buckets.map((bucket) => (
              <div key={bucket.date} className="group relative flex h-full min-w-0 flex-1 items-end">
                <div
                  className="w-full rounded-t-[3px] bg-gradient-to-t from-[#4cae22] to-[#8bd340] transition-opacity group-hover:opacity-80"
                  style={{ height: `${Math.max(2, (bucket.revenueKs / maxDay) * 100)}%` }}
                  title={`${bucket.label}: ${formatKs(bucket.revenueKs)} · ${bucket.orders} orders`}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between text-[9px] text-[#9aa2ae]">
            <span>{buckets[0]?.label}</span>
            <span>{buckets[Math.floor(buckets.length / 2)]?.label}</span>
            <span>{buckets[buckets.length - 1]?.label}</span>
          </div>
        </div>
      </AdminCard>

      <section aria-label="Report breakdown" className="mt-3 grid gap-3 xl:grid-cols-3">
        <AdminCard className="overflow-hidden">
          <AdminCardHeader title="Top products" description="By units sold" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[300px] text-left text-[10px]">
              <thead className="bg-[#fafbfc] text-[9px] font-semibold text-[#828c99]"><tr><th className="px-4 py-2.5 font-semibold sm:px-5">Product</th><th className="px-3 py-2.5 font-semibold">Units</th><th className="px-4 py-2.5 text-right font-semibold sm:px-5">Revenue</th></tr></thead>
              <tbody className="divide-y divide-[#f0f2f4]">
                {ranked.length ? ranked.map((product) => (
                  <tr key={product.name} className="hover:bg-[#fafbfc]">
                    <td className="px-4 py-2.5 font-bold text-[#303844] sm:px-5">{product.name}</td>
                    <td className="px-3 py-2.5 tabular-nums text-[#505a68]">{product.units}</td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-[#303844] sm:px-5">{formatKs(product.revenueKs)}</td>
                  </tr>
                )) : <tr><td colSpan={3}><AdminEmpty title="No sales yet" /></td></tr>}
              </tbody>
            </table>
          </div>
        </AdminCard>

        <AdminCard className="overflow-hidden">
          <AdminCardHeader title="Payment mix" description="Orders by method" />
          <div className="space-y-3 px-4 py-4 sm:px-5">
            {payments.length ? payments.map((payment) => {
              const share = summary.count ? Math.round((payment.orders / summary.count) * 100) : 0;
              return (
                <div key={payment.method}>
                  <div className="flex items-center justify-between text-[10px]"><span className="font-semibold text-[#394250]">{payment.method}</span><span className="text-[#87909b]">{payment.orders} · {share}%</span></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#edf0f3]"><span className="block h-full rounded-full bg-[#3978ef]" style={{ width: `${share}%` }} /></div>
                </div>
              );
            }) : <AdminEmpty title="No payments yet" />}
          </div>
        </AdminCard>

        <AdminCard className="overflow-hidden">
          <AdminCardHeader title="Pipeline" description="Orders by stage" />
          <div className="space-y-2 px-4 py-4 sm:px-5">
            {ADMIN_ORDER_STAGES.map((stage) => {
              const count = summary.byStage[stage] ?? 0;
              const share = summary.count ? Math.round((count / summary.count) * 100) : 0;
              return (
                <div key={stage} className="flex items-center gap-2 text-[10px]">
                  <span className="w-[110px] shrink-0 truncate text-[#5c6673]">{stage}</span>
                  <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#edf0f3]"><span className="block h-full rounded-full bg-[#4cae22]" style={{ width: `${share}%` }} /></span>
                  <span className="w-6 text-right tabular-nums font-bold text-[#394250]">{count}</span>
                </div>
              );
            })}
          </div>
        </AdminCard>
      </section>

      <AdminCard className="mt-3 overflow-hidden">
        <AdminCardHeader title="Stock to watch" description={`Rows at or below ${data.settings.lowStockThreshold} units`} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-[10px]">
            <thead className="bg-[#fafbfc] text-[9px] font-semibold text-[#828c99]"><tr><th className="px-4 py-2.5 font-semibold sm:px-5">Product</th><th className="px-3 py-2.5 font-semibold">Size</th><th className="px-4 py-2.5 text-right font-semibold sm:px-5">On hand</th></tr></thead>
            <tbody className="divide-y divide-[#f0f2f4]">
              {lowStock.length ? lowStock.map((row) => (
                <tr key={`${row.productId}-${row.size}`} className="hover:bg-[#fafbfc]">
                  <td className="px-4 py-2.5 font-bold text-[#303844] sm:px-5">{row.product}</td>
                  <td className="px-3 py-2.5 text-[#727d8a]">{row.size}</td>
                  <td className={`px-4 py-2.5 text-right font-semibold tabular-nums sm:px-5 ${row.out ? "text-[#c9424a]" : "text-[#9a6c07]"}`}>{row.quantity}</td>
                </tr>
              )) : <tr><td colSpan={3}><AdminEmpty title="Stock levels look healthy" /></td></tr>}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </AdminShell>
  );
}
