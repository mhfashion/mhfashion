"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowRight, Check, CreditCard, Loader2, Lock, ShoppingBag, Truck } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useCurrency } from "@/lib/currency-context";
import { updateAdminData, useAdminDemoData } from "@/lib/admin-demo-store";
import type { AdminOrder } from "@/lib/admin-demo-data";
import {
  CHECKOUT_CITIES, CHECKOUT_PAYMENTS, EMPTY_ADDRESS, applyPaymentStatus, checkoutAddressIssues, checkoutSubtotalKs, placeOrder,
  validateCheckout,
  providerIdFor, type CheckoutAddress, type CheckoutDraft, type CheckoutPayment,
} from "@/lib/checkout";
import { addressSummary, lastOrderAddress, readSavedAddress, saveDeliveryAddress } from "@/lib/delivery-address";
import { orderAmountKs, type PaymentStatus } from "@/lib/payments";

const CHECKOUT_KEY_STORAGE = "mh-fashion-checkout-key";

/** One key per checkout attempt: a refresh reuses it, so a double submit cannot create two orders. */
function useIdempotencyKey(): string {
  const [key] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      const stored = window.sessionStorage.getItem(CHECKOUT_KEY_STORAGE);
      if (stored) return stored;
      const fresh = `co_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      window.sessionStorage.setItem(CHECKOUT_KEY_STORAGE, fresh);
      return fresh;
    } catch {
      return `co_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    }
  });
  return key;
}

export default function CheckoutClient() {
  const { items, clearCart } = useCart();
  const { formatRangeKs } = useCurrency();
  const data = useAdminDemoData();
  const idempotencyKey = useIdempotencyKey();

  const [address, setAddress] = useState<CheckoutAddress>(EMPTY_ADDRESS);
  const [savedAddress, setSavedAddress] = useState<CheckoutAddress | null>(null);
  const [editingAddress, setEditingAddress] = useState(false);
  const addressHydrated = useRef(false);
  const [payment, setPayment] = useState<CheckoutPayment>("KBZPay");
  const [note, setNote] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<AdminOrder | null>(null);
  const [message, setMessage] = useState("");
  const submittingRef = useRef(false);
  const confirmationRef = useRef<HTMLHeadingElement>(null);

  // A customer who already gave us an address does not type it again: the saved one fills the form,
  // and the newest order on this device covers the case where nothing was saved yet.
  useEffect(() => {
    if (addressHydrated.current) return;
    addressHydrated.current = true;
    const known = readSavedAddress() ?? lastOrderAddress(data.orders);
    if (!known) return;
    setSavedAddress(known);
    setAddress(known);
  }, [data.orders]);

  const subtotal = checkoutSubtotalKs(items);
  const units = useMemo(() => items.reduce((total, item) => total + Math.max(1, item.quantity), 0), [items]);

  // The stored order wins over the local copy, so a refresh (and a later payment step) shows the
  // current stage rather than the one captured at submit time.
  const storedOrder = idempotencyKey ? data.orders.find((entry) => entry.checkoutKey === idempotencyKey) ?? null : null;
  const order = storedOrder ?? submittedOrder;

  useEffect(() => {
    if (order) confirmationRef.current?.focus();
  }, [order]);

  function submit() {
    if (submittingRef.current) return;
    const draft: CheckoutDraft = {
      idempotencyKey,
      items,
      address,
      payment,
      note,
      placedAt: new Date().toISOString(),
    };
    // The terms are checked last so an empty form still lists every missing field in one pass,
    // instead of making the customer tick the box only to learn the address is blank too.
    if (!accepted) {
      setIssues([...validateCheckout(draft), "Accept the terms to place the order."]);
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setIssues([]);
    const outcome: { order: AdminOrder | null; created: boolean; issues: string[] } = { order: null, created: false, issues: [] };
    updateAdminData((current) => {
      const result = placeOrder(current, draft);
      outcome.order = result.order;
      outcome.created = result.created;
      outcome.issues = result.issues;
      return result.data;
    });
    setIssues(outcome.issues);
    if (outcome.order) {
      setSubmittedOrder(outcome.order);
      saveDeliveryAddress(address);
      setSavedAddress(address);
      setEditingAddress(false);
      clearCart();
      setMessage(outcome.created ? `Order ${outcome.order.id} placed.` : `Order ${outcome.order.id} was already placed — nothing was charged twice.`);
    }
    setSubmitting(false);
    submittingRef.current = false;
  }

  async function pay() {
    if (!order || paying) return;
    setPaying(true);
    setIssues([]);
    setMessage("");
    try {
      const intentResponse = await fetch("/api/payments/intent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderId: order.id, amountKs: orderAmountKs(order), provider: providerIdFor(order.payment) }),
      });
      const intent = await intentResponse.json();
      if (!intentResponse.ok) {
        setIssues(intent.error === "provider_not_configured"
          ? [`${order.payment} is not configured on this deployment yet (${(intent.missing ?? []).join(", ")}).`]
          : ["The payment could not start. Nothing was charged."]);
        return;
      }
      if (intent.warning) setMessage(intent.warning);

      // The demo provider plays its own part: it signs a callback and the webhook verifies it, so the
      // same signature, replay and idempotency checks run as they will in production.
      const callback = await fetch("/api/payments/simulate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ref: intent.ref }),
      });
      const callbackBody = await callback.json();
      if (!callback.ok) {
        setIssues([`The provider callback was refused (${callbackBody.error ?? "unknown"}). Nothing was charged.`]);
        return;
      }

      const statusResponse = await fetch(`/api/payments/status/${intent.ref}`);
      const statusBody = await statusResponse.json();
      const outcome: { order: AdminOrder | null; issues: string[] } = { order: null, issues: [] };
      updateAdminData((current) => {
        const result = applyPaymentStatus(current, order.id, (statusBody.status ?? "pending") as PaymentStatus, intent.ref);
        outcome.order = result.order;
        outcome.issues = result.issues;
        return result.data;
      });
      setIssues(outcome.issues);
      if (outcome.order) {
        setMessage(`${outcome.order.id} is ${outcome.order.stage} — payment reference ${intent.ref}.`);
      }
    } catch {
      setIssues(["The payment service could not be reached. Nothing was charged."]);
    } finally {
      setPaying(false);
    }
  }

  if (order) {
    // The submit button disappears with the form, so focus would fall back to the page top; the
    // heading takes it and the order result is read out from there.
    return (
      <section className="mx-auto max-w-[720px]">
        <div data-checkout-confirmation className="rounded-2xl border border-border bg-bg-surface p-6 shadow-sm sm:p-8">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-accent/10 text-accent"><Check size={22} /></span>
          <h2 ref={confirmationRef} tabIndex={-1} className="mt-4 text-xl font-black outline-none sm:text-2xl">Order {order.id} {order.stage === "Pending Payment" ? "placed" : "confirmed"}</h2>
          <p data-checkout-status className="mt-1 text-xs font-semibold text-text-secondary">Status: {order.stage}</p>
          <p className="mt-3 text-xs text-text-muted">
            {order.stage === "Pending Payment"
              ? "Payment has not completed yet, so the order is held at Pending Payment — the plan does not confirm an order before payment."
              : "Payment is recorded, so the order moved to Confirmed."}
          </p>
          <dl className="mt-5 grid grid-cols-1 gap-2 rounded-xl border border-border p-3 text-[11px] sm:grid-cols-2">
            <div><dt className="text-text-muted">Recipient</dt><dd className="font-bold">{order.shipTo?.name}</dd></div>
            <div><dt className="text-text-muted">Phone</dt><dd className="font-bold">{order.shipTo?.phone}</dd></div>
            <div className="sm:col-span-2"><dt className="text-text-muted">Deliver to</dt><dd className="font-bold">{[order.shipTo?.address, order.shipTo?.township, order.shipTo?.city].filter(Boolean).join(", ")}</dd></div>
            <div><dt className="text-text-muted">Payment</dt><dd className="font-bold">{order.payment}</dd></div>
            <div><dt className="text-text-muted">Items</dt><dd className="font-bold">{order.items.reduce((total, item) => total + item.quantity, 0)}</dd></div>
          </dl>
          {message ? <p data-checkout-message role="status" className="mt-3 text-[11px] font-semibold text-accent">{message}</p> : null}
          {issues.length ? (
            <div role="alert" className="mt-3 rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2">
              {issues.map((issue) => <p key={issue} className="text-[11px] font-semibold text-red-400">{issue}</p>)}
            </div>
          ) : null}
          {order.stage === "Pending Payment" ? (
            <button
              type="button"
              onClick={pay}
              disabled={paying}
              data-checkout-pay
              className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-accent px-4 py-3 text-xs font-bold text-accent-foreground disabled:opacity-60"
            >
              {paying ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
              {paying ? "Confirming with the provider…" : `Pay with ${order.payment}`}
            </button>
          ) : null}
          <p className="mt-3 text-[10px] text-text-muted">
            The provider callback is signed (HMAC-SHA256 over the timestamp and body) and verified by
            <code className="mx-1">/api/payments/webhook/&lt;provider&gt;</code>; a replayed or altered callback is refused.
            No real provider is configured yet, so the demo provider stands in and no money moves.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a href="/new" className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2.5 text-[11px] font-bold">Continue shopping <ArrowRight size={13} /></a>
            <a href="/account" className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2.5 text-[11px] font-bold">My account</a>
          </div>
        </div>
      </section>
    );
  }

  if (!items.length) {
    return (
      <section className="mx-auto min-h-[297px] max-w-[720px] rounded-2xl border border-border bg-bg-surface px-5 py-14 text-center shadow-sm">
        <ShoppingBag size={40} className="mx-auto text-text-muted" />
        <h2 className="mt-4 text-lg font-black">Nothing to check out</h2>
        <p className="mt-2 text-xs text-text-muted">Your cart is empty, so there is no order to place.</p>
        <a href="/new" className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-full bg-accent px-5 text-xs font-bold text-accent-foreground">Browse products <ArrowRight size={14} /></a>
      </section>
    );
  }

  // Field problems only appear once a submit was attempted, and each one names its own field to a
  // screen reader instead of leaving the shopper to match the summary list against the inputs.
  const fieldIssues = issues.length ? checkoutAddressIssues(address, note) : {};
  const problemFor = (key: keyof CheckoutAddress) => fieldIssues[key];
  const problemText = (key: keyof CheckoutAddress) => (
    problemFor(key) ? <span id={`checkout-${key}-problem`} className="mt-1 block text-[9px] font-semibold text-red-400">{problemFor(key)}</span> : null
  );

  const field = (label: string, key: keyof CheckoutAddress, extra?: { hint?: string; type?: string; inputMode?: "text" | "tel" }) => (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wide text-text-muted">{label}</span>
      <input
        aria-label={label}
        aria-invalid={problemFor(key) ? true : undefined}
        aria-describedby={problemFor(key) ? `checkout-${key}-problem` : undefined}
        type={extra?.type ?? "text"}
        inputMode={extra?.inputMode}
        value={address[key]}
        onChange={(event) => setAddress({ ...address, [key]: event.target.value })}
        className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-xs font-semibold outline-none focus:border-accent"
      />
      {problemText(key)}
      {extra?.hint ? <span className="mt-1 block text-[9px] text-text-muted">{extra.hint}</span> : null}
    </label>
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-4">
        <div className="rounded-2xl border border-border bg-bg-surface p-4 shadow-sm sm:p-6">
          <h2 className="text-sm font-black">Delivery address</h2>
          {savedAddress && !editingAddress ? (
            <div data-checkout-saved-address className="mt-3 rounded-xl border border-border bg-bg p-3">
              <p className="text-[11px] font-bold">{address.name} <span className="font-semibold text-text-muted">· {address.phone}</span></p>
              <p data-checkout-saved-address-line className="mt-1 text-[11px] text-text-secondary">{addressSummary(address)}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-[9px] text-text-muted">Already on file — this parcel ships here unless you change it.</p>
                <button
                  type="button"
                  data-checkout-address-change
                  onClick={() => setEditingAddress(true)}
                  className="shrink-0 rounded-full border border-border-light px-3 py-1 text-[10px] font-bold text-accent hover:border-accent"
                >
                  Change
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {field("Full name", "name")}
                {field("Phone", "phone", { type: "tel", inputMode: "tel", hint: "The courier calls this number." })}
                <div className="sm:col-span-2">{field("Address", "address", { hint: "House, street, quarter." })}</div>
                {field("Township", "township")}
                <label className="block">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-text-muted">City / region</span>
                  <select
                    aria-label="City or region"
                    aria-invalid={problemFor("city") ? true : undefined}
                    aria-describedby={problemFor("city") ? "checkout-city-problem" : undefined}
                    value={address.city}
                    onChange={(event) => setAddress({ ...address, city: event.target.value })}
                    className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-xs font-semibold outline-none focus:border-accent"
                  >
                    <option value="">Choose…</option>
                    {CHECKOUT_CITIES.map((city) => <option key={city} value={city}>{city}</option>)}
                  </select>
                  {problemText("city")}
                </label>
              </div>
              {savedAddress ? (
                <button
                  type="button"
                  data-checkout-address-cancel
                  onClick={() => { setAddress(savedAddress); setEditingAddress(false); }}
                  className="mt-3 text-[10px] font-bold text-accent"
                >
                  Keep the saved address
                </button>
              ) : null}
            </>
          )}
          <label className="mt-3 block">
            <span className="text-[10px] font-bold uppercase tracking-wide text-text-muted">Note for the print desk (optional)</span>
            <textarea
              aria-label="Order note"
              aria-invalid={fieldIssues.note ? true : undefined}
              aria-describedby={fieldIssues.note ? "checkout-note-problem" : undefined}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-xs outline-none focus:border-accent"
            />
            {fieldIssues.note ? <span id="checkout-note-problem" className="mt-1 block text-[9px] font-semibold text-red-400">{fieldIssues.note}</span> : null}
          </label>
        </div>

        <div className="rounded-2xl border border-border bg-bg-surface p-4 shadow-sm sm:p-6">
          <h2 className="text-sm font-black">Payment</h2>
          <p className="mt-1 text-[10px] text-text-muted">Payment must complete before the order confirms. Cash on delivery is not offered.</p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {CHECKOUT_PAYMENTS.map((method) => (
              <button
                key={method.id}
                type="button"
                data-payment={method.id}
                aria-pressed={payment === method.id}
                onClick={() => setPayment(method.id)}
                className={`rounded-xl border px-3 py-2.5 text-left ${payment === method.id ? "border-accent bg-accent/5" : "border-border"}`}
              >
                <span className="block text-[11px] font-bold">{method.label}</span>
                <span className="block text-[9px] text-text-muted">{method.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-bg-surface p-4 shadow-sm sm:p-6">
          <h2 className="text-sm font-black">Delivery</h2>
          <p className="mt-1 flex items-start gap-1.5 text-[10px] text-text-muted">
            <Truck size={13} className="mt-0.5 shrink-0" />
            The fee is quoted by MH Delivery for this parcel; it is added to the receipt once the quote arrives. No fee is invented here.
          </p>
        </div>
      </section>

      <aside className="h-fit rounded-2xl border border-border bg-bg-surface p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-black">Order summary</h2>
        <ul className="mt-3 divide-y divide-border">
          {items.map((item) => (
            <li key={item.key} data-checkout-line={item.key} className="flex items-start justify-between gap-2 py-2">
              <span className="min-w-0">
                <span className="block truncate text-[11px] font-bold">{item.name}</span>
                <span className="block text-[9px] text-text-muted">{[item.variant.size, item.variant.color, item.variant.material].filter(Boolean).join(" · ") || "Standard"} × {item.quantity}</span>
              </span>
              <span className="shrink-0 text-[11px] font-bold">{formatRangeKs((item.unitPriceKs ?? item.priceMinKs) * item.quantity, (item.unitPriceKs ?? item.priceMaxKs) * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs"><span className="text-text-muted">Subtotal ({units})</span><strong>{formatRangeKs(subtotal, subtotal)}</strong></div>
        <div className="mt-1 flex items-center justify-between text-xs"><span className="text-text-muted">Delivery</span><span className="font-semibold text-text-muted">Quoted by MH Delivery</span></div>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm font-black"><span>Total today</span><span data-checkout-total className="text-accent">{formatRangeKs(subtotal, subtotal)}</span></div>

        <label className="mt-4 flex items-start gap-2 text-[10px] text-text-secondary">
          <input
            type="checkbox"
            aria-label="Accept the terms"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[#4cae22] [color-scheme:light]"
          />
          <span>I accept the Terms and the copyright policy: I hold the rights to what I upload, and MH Fashion may remove a design after a claim.</span>
        </label>

        {issues.length ? (
          <div role="alert" className="mt-3 rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2">
            {issues.map((issue) => <p key={issue} className="flex items-start gap-1 text-[10px] font-semibold text-red-400"><AlertCircle size={11} className="mt-0.5 shrink-0" /> {issue}</p>)}
          </div>
        ) : null}

        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          data-checkout-submit
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-accent px-4 py-3 text-xs font-bold text-accent-foreground disabled:opacity-60"
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Lock size={13} />}
          {submitting ? "Placing…" : `Place order · ${formatRangeKs(subtotal, subtotal)}`}
        </button>
        <p className="mt-2 flex items-center justify-center gap-1 text-[9px] text-text-muted"><Lock size={10} /> One order per submit — a retry reuses the same request.</p>
      </aside>
    </div>
  );
}
