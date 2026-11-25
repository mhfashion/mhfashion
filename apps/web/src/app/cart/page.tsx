import type { Metadata } from "next";
import Header from "@/components/Header";
import CartPageClient from "@/components/CartPageClient";

export const metadata: Metadata = { title: "Cart — MH Fashion", description: "Review your MH Fashion products before checkout." };

export default function CartPage() {
  return <div><Header /><main className="w-full bg-bg px-4 py-5 sm:px-6 lg:px-8 lg:py-8"><div className="mx-auto max-w-[1180px]"><div className="mb-6"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent">MH Fashion</p><h1 className="mt-2 text-2xl font-black sm:text-4xl">Your Cart</h1><p className="mt-1 text-xs text-text-muted sm:text-sm">Review your selected designs before checkout.</p></div><CartPageClient /></div></main></div>;
}
