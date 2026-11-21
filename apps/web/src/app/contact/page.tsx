import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import Header from "@/components/Header";
import ContactForm from "@/components/ContactForm";
import { CONTACT_EMAIL } from "@/lib/storefront-info";

export const metadata: Metadata = { title: "Contact — MH Fashion", description: "Report a copyright claim, ask about an order, or ask a product question." };

const CLAIM_STEPS = [
  "Which design it is — a link or the design name.",
  "What you own and how we can check it (a portfolio link, a registration, or the original file).",
  "Your name and a way to reach you.",
];

export default function ContactPage() {
  return (
    <div><Header /><main className="w-full bg-bg px-4 py-5 sm:px-6 lg:px-8 lg:py-8"><div className="mx-auto max-w-[980px]">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent">Help</p>
      <h1 className="mt-2 text-2xl font-black sm:text-4xl">Contact</h1>
      <p className="mt-2 text-xs text-text-secondary sm:text-sm">
        One channel for everything: copyright claims, order help and product questions. Write to
        <a href={`mailto:${CONTACT_EMAIL}`} className="ml-1 font-bold text-accent">{CONTACT_EMAIL}</a>, or use the form below and send it from your own mail app.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <ContactForm />
        <aside className="space-y-4">
          <section data-contact-claim className="rounded-2xl border border-border bg-bg-surface p-4 shadow-sm sm:p-5">
            <h2 className="flex items-center gap-1.5 text-sm font-black"><ShieldAlert size={15} className="text-accent" /> Copyright claims</h2>
            <p className="mt-2 text-[11px] leading-relaxed text-text-secondary">
              If a design on MH Fashion is yours, say so and we accept the claim: the design is taken down from the shop and the editor.
              An order that is already paid is still produced and delivered — the takedown only stops new sales.
            </p>
            <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-text-muted">Include</p>
            <ul className="mt-1 space-y-1.5">
              {CLAIM_STEPS.map((step) => (
                <li key={step} className="flex gap-1.5 text-[11px] leading-relaxed text-text-secondary">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" /><span>{step}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[10px] text-text-muted">Every claim is recorded with the claimant, the date and the admin who handled it.</p>
          </section>
          <section className="rounded-2xl border border-border bg-bg-surface p-4 shadow-sm sm:p-5">
            <h2 className="text-sm font-black">Faster answers</h2>
            <ul className="mt-2 space-y-1.5 text-[11px] text-text-secondary">
              <li><a href="/faq" className="hover:text-accent">Frequently asked questions</a></li>
              <li><a href="/shipping" className="hover:text-accent">Shipping and delivery</a></li>
              <li><a href="/returns" className="hover:text-accent">Returns and refunds</a></li>
              <li><a href="/terms" className="hover:text-accent">Terms of Use</a></li>
            </ul>
          </section>
        </aside>
      </div>
    </div></main></div>
  );
}
