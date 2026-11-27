"use client";

import { useMemo, useState } from "react";
import { Search, Users, Wallet } from "lucide-react";
import AdminShell, { AdminAvatar } from "@/components/admin/AdminShell";
import { AdminBadge, AdminCard, AdminCardHeader, AdminEmpty, AdminSelect, AdminStat } from "@/components/admin/AdminUi";
import { useAdminDemoData } from "@/lib/admin-demo-store";
import { aggregateCustomers, formatAdminDate, formatKs, type AdminCustomer } from "@/lib/admin-demo-data";
import { matchesSearchQuery } from "@/lib/search-text";

type SortKey = "spend" | "orders" | "recent";

const VIP_SPEND_KS = 100000;

function customerInitials(customer: AdminCustomer) {
  return customer.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "CU";
}

export default function AdminCustomers() {
  const data = useAdminDemoData();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("spend");

  const query = search;
  const customers = useMemo(() => aggregateCustomers(data.orders), [data.orders]);
  const visible = useMemo(() => customers
    .filter((customer) => matchesSearchQuery(`${customer.name} ${customer.email} ${customer.phone}`, query))
    .sort((a, b) => {
      if (sort === "orders") return b.orders - a.orders;
      if (sort === "recent") return new Date(b.lastOrderAt).getTime() - new Date(a.lastOrderAt).getTime();
      return b.spendKs - a.spendKs;
    }), [customers, query, sort]);

  const repeat = customers.filter((customer) => customer.orders > 1).length;
  const spendTotal = customers.reduce((total, customer) => total + customer.spendKs, 0);
  const vips = customers.filter((customer) => customer.spendKs >= VIP_SPEND_KS).length;

  return (
    <AdminShell
      active="customers"
      title="Customers"
      description="Everyone who placed a demo order, grouped by email with lifetime spend."
      search={(
        <label className="flex h-10 w-full max-w-[420px] items-center gap-2.5 rounded-full border border-[#e6e9ed] bg-[#f8f9fb] px-3.5 text-[#8c95a1] focus-within:border-[#a5d972] focus-within:bg-white">
          <Search size={16} className="shrink-0" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search customers" placeholder="Search name, email or phone..." className="min-w-0 flex-1 bg-transparent text-[11px] text-[#252c37] outline-none placeholder:text-[#9da5af]" />
        </label>
      )}
    >
      <section aria-label="Customer metrics" className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Customers" value={String(customers.length)} hint="Unique emails in the demo orders" icon={<Users size={21} />} />
        <AdminStat label="Repeat buyers" value={String(repeat)} hint="More than one order" icon={<Users size={21} />} />
        <AdminStat label="Lifetime spend" value={formatKs(spendTotal)} hint="Cancelled and refunded excluded" icon={<Wallet size={21} />} />
        <AdminStat label="VIPs" value={String(vips)} hint={`At or above ${formatKs(VIP_SPEND_KS)}`} icon={<Wallet size={21} />} />
      </section>

      <AdminCard className="mt-3 overflow-hidden">
        <AdminCardHeader
          title="Customer list"
          description="Derived from the order queue — no separate customer records yet"
          actions={(
            <AdminSelect aria-label="Sort customers" value={sort} onChange={(event) => setSort(event.target.value as SortKey)} className="w-auto">
              <option value="spend">Top spend</option>
              <option value="orders">Most orders</option>
              <option value="recent">Most recent</option>
            </AdminSelect>
          )}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[10px]">
            <thead className="bg-[#fafbfc] text-[9px] font-semibold text-[#828c99]">
              <tr>
                <th className="px-4 py-2.5 font-semibold sm:px-5">Customer</th>
                <th className="px-3 py-2.5 font-semibold">Phone</th>
                <th className="px-3 py-2.5 font-semibold">Orders</th>
                <th className="px-3 py-2.5 font-semibold">Units</th>
                <th className="px-3 py-2.5 font-semibold">Spend</th>
                <th className="px-3 py-2.5 font-semibold">Last order</th>
                <th className="px-4 py-2.5 text-right font-semibold sm:px-5">Segment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f2f4]">
              {visible.length ? visible.map((customer) => (
                <tr key={customer.email} className="hover:bg-[#fafbfc]">
                  <td className="px-4 py-2.5 sm:px-5">
                    <div className="flex items-center gap-2.5">
                      <AdminAvatar initials={customerInitials(customer)} small />
                      <span className="min-w-0">
                        <span className="block font-bold text-[#303844]">{customer.name}</span>
                        <span className="mt-0.5 block text-[8px] text-[#919aa6]">{customer.email}</span>
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[#727d8a]">{customer.phone}</td>
                  <td className="px-3 py-2.5 font-semibold tabular-nums text-[#505a68]">{customer.orders}</td>
                  <td className="px-3 py-2.5 tabular-nums text-[#727d8a]">{customer.units}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-[#394250]">{formatKs(customer.spendKs)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[#919aa6]">{formatAdminDate(customer.lastOrderAt)}</td>
                  <td className="px-4 py-2.5 text-right sm:px-5">
                    {customer.spendKs >= VIP_SPEND_KS
                      ? <AdminBadge tone="violet">VIP</AdminBadge>
                      : customer.orders > 1
                        ? <AdminBadge tone="green">Repeat</AdminBadge>
                        : <AdminBadge tone="slate">New</AdminBadge>}
                  </td>
                </tr>
              )) : <tr><td colSpan={7}><AdminEmpty title="No customers match this search" description="Try a different name or email." /></td></tr>}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </AdminShell>
  );
}
