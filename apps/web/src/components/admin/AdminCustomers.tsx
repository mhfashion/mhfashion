"use client";

import { useMemo, useState } from "react";
import { Search, Users, Wallet } from "lucide-react";
import AdminShell, { AdminAvatar } from "@/components/admin/AdminShell";
import {
  AdminBadge, AdminButton, AdminCard, AdminCardHeader, AdminDrawer, AdminEmpty, AdminField, AdminInput,
  AdminSelect, AdminStat,
} from "@/components/admin/AdminUi";
import { updateAdminData, useAdminDemoData } from "@/lib/admin-demo-store";
import {
  aggregateCustomers, formatAdminDate, formatKs, orderTotalKs, orderUnits,
  type AdminCustomer, type AdminOrder,
} from "@/lib/admin-demo-data";
import { ADMIN_PAGE_SIZE, customerSearchText, nextPageSize, pageSlice } from "@/lib/admin-order-search";
import { matchesSearchQuery } from "@/lib/search-text";
import {
  PASSWORD_MIN_LENGTH, applyCustomerPassword, canCustomerSignIn, createCustomerPassword, customerAccountFor,
  customerPasswordState, generateCustomerPassword, passwordIssues, setCustomerMustChangePassword,
  setCustomerStatus,
} from "@/lib/customer-accounts";

type SortKey = "spend" | "orders" | "recent";

const VIP_SPEND_KS = 100000;
const RECENT_ORDERS = 8;

function customerInitials(customer: AdminCustomer) {
  return customer.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "CU";
}

function shipToLines(orders: AdminOrder[]) {
  const seen = new Map<string, string>();
  for (const order of orders) {
    const ship = order.shipTo;
    if (!ship) continue;
    const line = [ship.address, ship.township, ship.city].filter(Boolean).join(", ");
    if (line) seen.set(line, ship.name || order.customerName);
  }
  return [...seen.entries()].map(([line, name]) => ({ line, name }));
}

export default function AdminCustomers() {
  const data = useAdminDemoData();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("spend");
  const [openEmail, setOpenEmail] = useState<string | null>(null);

  const query = search;
  const customers = useMemo(() => aggregateCustomers(data.orders), [data.orders]);
  const filtered = useMemo(() => customers
    .filter((customer) => matchesSearchQuery(customerSearchText(customer), query))
    .sort((a, b) => {
      if (sort === "orders") return b.orders - a.orders;
      if (sort === "recent") return new Date(b.lastOrderAt).getTime() - new Date(a.lastOrderAt).getTime();
      return b.spendKs - a.spendKs;
    }), [customers, query, sort]);

  // Plan §17 S9: 50 rows at a time, from the top whenever the search or the sort changes.
  const [paging, setPaging] = useState({ key: "", shown: ADMIN_PAGE_SIZE });
  const filterKey = `${query}|${sort}`;
  const shown = paging.key === filterKey ? paging.shown : ADMIN_PAGE_SIZE;
  const visible = useMemo(() => pageSlice(filtered, shown), [filtered, shown]);

  const repeat = customers.filter((customer) => customer.orders > 1).length;
  const spendTotal = customers.reduce((total, customer) => total + customer.spendKs, 0);
  const vips = customers.filter((customer) => customer.spendKs >= VIP_SPEND_KS).length;

  const selected = customers.find((customer) => customer.email === openEmail) ?? null;

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
          description="Open a customer to read their details and manage their password"
          actions={(
            <AdminSelect aria-label="Sort customers" value={sort} onChange={(event) => setSort(event.target.value as SortKey)} className="w-auto">
              <option value="spend">Top spend</option>
              <option value="orders">Most orders</option>
              <option value="recent">Most recent</option>
            </AdminSelect>
          )}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-[10px]">
            <thead className="bg-[#fafbfc] text-[9px] font-semibold text-[#828c99]">
              <tr>
                <th className="px-4 py-2.5 font-semibold sm:px-5">Customer</th>
                <th className="px-3 py-2.5 font-semibold">Phone</th>
                <th className="px-3 py-2.5 font-semibold">Orders</th>
                <th className="px-3 py-2.5 font-semibold">Units</th>
                <th className="px-3 py-2.5 font-semibold">Spend</th>
                <th className="px-3 py-2.5 font-semibold">Last order</th>
                <th className="px-3 py-2.5 font-semibold">Password</th>
                <th className="px-4 py-2.5 text-right font-semibold sm:px-5">Segment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f2f4]">
              {visible.length ? visible.map((customer) => {
                const account = customerAccountFor(data.customerAccounts, customer.email);
                return (
                  <tr
                    key={customer.email}
                    data-customer-row={customer.email}
                    onClick={() => setOpenEmail(customer.email)}
                    onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setOpenEmail(customer.email); } }}
                    tabIndex={0}
                    aria-label={`Open ${customer.name}`}
                    className="cursor-pointer hover:bg-[#f7faf4] focus:bg-[#f7faf4] focus:outline-none"
                  >
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
                    <td className="whitespace-nowrap px-3 py-2.5" data-customer-password-state={customer.email}>
                      {!account?.password
                        ? <AdminBadge tone="slate">Not set</AdminBadge>
                        : account.status === "Blocked"
                          ? <AdminBadge tone="red">Blocked</AdminBadge>
                          : account.mustChangePassword
                            ? <AdminBadge tone="amber">Temporary</AdminBadge>
                            : <AdminBadge tone="green">Set</AdminBadge>}
                    </td>
                    <td className="px-4 py-2.5 text-right sm:px-5">
                      {customer.spendKs >= VIP_SPEND_KS
                        ? <AdminBadge tone="violet">VIP</AdminBadge>
                        : customer.orders > 1
                          ? <AdminBadge tone="green">Repeat</AdminBadge>
                          : <AdminBadge tone="slate">New</AdminBadge>}
                    </td>
                  </tr>
                );
              }) : <tr><td colSpan={8}><AdminEmpty title="No customers match this search" description="Try a different name, email or phone number." /></td></tr>}
            </tbody>
          </table>
        </div>
        {filtered.length > visible.length ? (
          <div className="flex items-center justify-between gap-3 border-t border-[#f0f2f4] px-4 py-3 sm:px-5">
            <p className="text-[9px] text-[#87909b]" data-admin-customers-shown={visible.length}>Showing {visible.length} of {filtered.length} customers</p>
            <AdminButton compact variant="secondary" onClick={() => setPaging({ key: filterKey, shown: nextPageSize(shown, filtered.length) })}>
              Show {Math.min(ADMIN_PAGE_SIZE, filtered.length - visible.length)} more
            </AdminButton>
          </div>
        ) : null}
      </AdminCard>

      <CustomerDetail
        customer={selected}
        orders={selected ? data.orders.filter((order) => order.customerEmail === selected.email) : []}
        onClose={() => setOpenEmail(null)}
      />
    </AdminShell>
  );
}

function CustomerDetail({
  customer,
  orders,
  onClose,
}: {
  customer: AdminCustomer | null;
  orders: AdminOrder[];
  onClose: () => void;
}) {
  const data = useAdminDemoData();
  const account = customer ? customerAccountFor(data.customerAccounts, customer.email) : null;
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [issued, setIssued] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const sortedOrders = useMemo(() => [...orders].sort((a, b) => b.placedAt.localeCompare(a.placedAt)), [orders]);
  const addresses = useMemo(() => shipToLines(sortedOrders), [sortedOrders]);
  const recent = sortedOrders.slice(0, RECENT_ORDERS);
  const average = orders.length ? Math.round(orders.reduce((total, order) => total + orderTotalKs(order), 0) / orders.length) : 0;
  const firstOrder = sortedOrders.at(-1)?.placedAt ?? null;
  const issues = customer && password ? passwordIssues(password, customer) : [];
  const mismatch = confirm.length > 0 && confirm !== password;

  const resetFields = () => {
    setPassword("");
    setConfirm("");
    setIssued(null);
  };

  const savePassword = async () => {
    if (!customer || !account || busy) return;
    if (!password || issues.length || mismatch) {
      setMessage("Fix the password first.");
      return;
    }
    setBusy(true);
    try {
      const hash = await createCustomerPassword(password);
      updateAdminData((current) => ({
        ...current,
        customerAccounts: applyCustomerPassword(current.customerAccounts ?? [], customer.email, hash, {
          actor: "MH Fashion Owner",
          at: new Date().toISOString(),
          // The tick is written by its own toggle, so it must survive the save.
          mustChangePassword: account.mustChangePassword,
        }),
      }));
      setIssued(password);
      setMessage(account.mustChangePassword
        ? `Password set. ${customer.name} must choose a new one at next sign-in.`
        : `Password set. Share it with ${customer.name}; the screen shows it once.`);
      setPassword("");
      setConfirm("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The password could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const issueTemporary = () => {
    const generated = generateCustomerPassword();
    setPassword(generated);
    setConfirm(generated);
    setIssued(null);
    setMessage("Temporary password generated. Tick “Change at next sign-in”, then set it.");
  };

  const copyIssued = async () => {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued);
      setMessage("Copied. Send it over a channel the customer controls.");
    } catch {
      setMessage("Copy is blocked in this browser; select the password and copy it by hand.");
    }
  };

  const toggleMustChange = () => {
    if (!customer) return;
    const next = !account?.mustChangePassword;
    updateAdminData((current) => ({
      ...current,
      customerAccounts: setCustomerMustChangePassword(current.customerAccounts ?? [], customer.email, next),
    }));
    setMessage(next ? "The customer will be asked to change the password at next sign-in." : "The password stands until the customer changes it.");
  };

  const toggleBlock = () => {
    if (!customer) return;
    const next = account?.status === "Blocked" ? "Active" : "Blocked";
    updateAdminData((current) => ({
      ...current,
      customerAccounts: setCustomerStatus(current.customerAccounts ?? [], customer.email, next),
    }));
    setMessage(next === "Blocked" ? "Sign-in blocked. Orders and details are untouched." : "Sign-in allowed again.");
  };

  return (
    <AdminDrawer
      open={Boolean(customer)}
      title={customer ? customer.name : "Customer"}
      description={customer?.email}
      onClose={() => { resetFields(); setMessage(""); onClose(); }}
      footer={customer ? (
        <div className="flex items-center justify-between gap-2">
          <AdminButton variant="ghost" onClick={() => { resetFields(); setMessage(""); onClose(); }}>Close</AdminButton>
          <AdminButton onClick={savePassword} disabled={busy || !password || issues.length > 0 || mismatch}>
            {busy ? "Saving…" : "Set password"}
          </AdminButton>
        </div>
      ) : undefined}
    >
      {customer && account ? (
        <div className="space-y-4 px-5 py-4" data-customer-detail={customer.email}>
          <section aria-label="Customer details" className="rounded-xl border border-[#eef1f4] p-3">
            <h3 className="text-[10px] font-black uppercase tracking-wide text-[#828c99]">Details</h3>
            <dl className="mt-2 grid grid-cols-[92px_1fr] gap-x-3 gap-y-1.5 text-[10px]">
              <dt className="font-semibold text-[#828c99]">Name</dt>
              <dd className="text-[#303844]" data-customer-name>{customer.name}</dd>
              <dt className="font-semibold text-[#828c99]">Email</dt>
              <dd className="break-all text-[#303844]" data-customer-email>{customer.email}</dd>
              <dt className="font-semibold text-[#828c99]">Phone</dt>
              <dd className="text-[#303844]">{customer.phone || "—"}</dd>
              <dt className="font-semibold text-[#828c99]">First order</dt>
              <dd className="text-[#303844]">{firstOrder ? formatAdminDate(firstOrder) : "—"}</dd>
              <dt className="font-semibold text-[#828c99]">Last order</dt>
              <dd className="text-[#303844]">{formatAdminDate(customer.lastOrderAt)}</dd>
              <dt className="font-semibold text-[#828c99]">Orders</dt>
              <dd className="text-[#303844]" data-customer-orders>{customer.orders} · {customer.units} pieces</dd>
              <dt className="font-semibold text-[#828c99]">Spend</dt>
              <dd className="text-[#303844]" data-customer-spend>{formatKs(customer.spendKs)} · average {formatKs(average)}</dd>
            </dl>
          </section>

          <section aria-label="Delivery addresses" className="rounded-xl border border-[#eef1f4] p-3">
            <h3 className="text-[10px] font-black uppercase tracking-wide text-[#828c99]">Addresses on file</h3>
            {addresses.length ? (
              <ul className="mt-2 space-y-1.5 text-[10px] text-[#4a5361]" data-customer-addresses>
                {addresses.map((entry) => <li key={entry.line} className="rounded-lg bg-[#f8f9fb] px-2 py-1.5">{entry.line}</li>)}
              </ul>
            ) : <p className="mt-2 text-[10px] text-[#87909b]">No delivery address was saved for this customer.</p>}
          </section>

          <section aria-label="Recent orders" className="rounded-xl border border-[#eef1f4] p-3">
            <h3 className="text-[10px] font-black uppercase tracking-wide text-[#828c99]">Recent orders</h3>
            <ul className="mt-2 divide-y divide-[#f1f3f5] text-[10px]">
              {recent.map((order) => (
                <li key={order.id} className="flex items-center justify-between gap-2 py-1.5">
                  <span className="font-mono text-[9px] text-[#5b6572]">{order.id}</span>
                  <span className="text-[#87909b]">{formatAdminDate(order.placedAt)}</span>
                  <span className="text-[#87909b]">{orderUnits(order)} pcs</span>
                  <span className="font-semibold text-[#303844]">{formatKs(orderTotalKs(order))}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-label="Password" className="rounded-xl border border-[#eef1f4] p-3">
            <h3 className="text-[10px] font-black uppercase tracking-wide text-[#828c99]">Password</h3>
            <p className="mt-1.5 text-[10px] text-[#4a5361]" data-customer-password-status>
              {customerPasswordState(account)}
              {account.passwordUpdatedBy ? ` · by ${account.passwordUpdatedBy}` : ""}
            </p>
            <p className="mt-1 text-[9px] text-[#93a0ad]">
              Stored as a salted PBKDF2 hash, so nobody can read it back — setting a new one replaces it.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <AdminButton compact variant="secondary" onClick={issueTemporary} data-customer-generate>Generate</AdminButton>
              <label className="inline-flex items-center gap-1 text-[9px] font-bold text-[#6c7683]">
                <input type="checkbox" checked={account.mustChangePassword} onChange={toggleMustChange} data-customer-must-change />
                Change at next sign-in
              </label>
              <AdminButton
                compact
                variant={account.status === "Blocked" ? "secondary" : "ghost"}
                onClick={toggleBlock}
                data-customer-block
              >
                {account.status === "Blocked" ? "Allow sign-in" : "Block sign-in"}
              </AdminButton>
            </div>

            <div className="mt-3 grid gap-2">
              <AdminField label="New password">
                <AdminInput
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => { setPassword(event.target.value); setIssued(null); }}
                  aria-label="New password"
                  data-customer-password-input
                />
              </AdminField>
              <AdminField label="Repeat password">
                <AdminInput
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  aria-label="Repeat password"
                  data-customer-password-confirm
                />
              </AdminField>
            </div>

            {issues.length ? (
              <ul className="mt-2 space-y-0.5 text-[9px] font-semibold text-[#b4463c]" data-customer-password-issues>
                {issues.map((issue) => <li key={issue}>{issue}</li>)}
              </ul>
            ) : null}
            {mismatch ? <p className="mt-2 text-[9px] font-semibold text-[#b4463c]">The two passwords do not match.</p> : null}

            {issued ? (
              <div className="mt-3 rounded-lg border border-[#cfe6bc] bg-[#f4fbee] px-2.5 py-2" data-customer-password-issued>
                <p className="text-[9px] font-bold uppercase tracking-wide text-[#3f8c22]">Shown once — share it now</p>
                <p className="mt-1 break-all font-mono text-[11px] text-[#25401a]">{issued}</p>
                <AdminButton compact variant="secondary" onClick={copyIssued} className="mt-1.5">Copy</AdminButton>
              </div>
            ) : null}
            {message ? <p role="status" className="mt-2 text-[9px] font-semibold text-[#3f8c22]" data-customer-message>{message}</p> : null}
            <p className="mt-2 text-[9px] text-[#93a0ad]">
              Sign-in {canCustomerSignIn(account) ? "possible" : "not possible"} right now. Policy: {PASSWORD_MIN_LENGTH}+
              characters with a letter and a number, and not the customer&apos;s name or email.
            </p>
          </section>
        </div>
      ) : null}
    </AdminDrawer>
  );
}
