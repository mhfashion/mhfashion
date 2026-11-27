import type { Metadata } from "next";
import Header from "@/components/Header";
import CheckoutClient from "@/components/CheckoutClient";
import T from "@/components/T";

export const metadata: Metadata = { title: "Checkout — MH Fashion", description: "Confirm your address and payment, then place the MH Fashion order." };

export default function CheckoutPage() {
  return <div><Header /><main className="w-full bg-bg px-4 py-5 sm:px-6 lg:px-8 lg:py-8"><div className="mx-auto max-w-[1180px]"><div className="mb-5"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent">MH Fashion</p><h1 className="mt-2 text-2xl font-black sm:text-4xl"><T k="checkout.title" /></h1><p className="mt-1 text-xs text-text-muted sm:text-sm"><T k="checkout.lead" /></p></div><CheckoutClient /></div></main></div>;
}
