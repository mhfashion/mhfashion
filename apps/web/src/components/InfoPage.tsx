import type { Metadata } from "next";
import { ArrowRight, Mail } from "lucide-react";
import Header from "@/components/Header";
import { CONTACT_EMAIL, type InfoPage as InfoPageContent } from "@/lib/storefront-info";

export function infoPageMetadata(page: InfoPageContent): Metadata {
  return { title: `${page.title} — MH Fashion`, description: page.lead };
}

export default function InfoPage({ page }: { page: InfoPageContent }) {
  return (
    <div>
      <Header />
      <main className="w-full bg-bg px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-[880px]">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent">{page.eyebrow}</p>
          <h1 className="mt-2 text-2xl font-black sm:text-4xl">{page.title}</h1>
          <p className="mt-2 text-xs text-text-secondary sm:text-sm">{page.lead}</p>
          {page.draft ? (
            <p data-info-draft className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[10px] font-semibold text-amber-500">
              {page.draft}
            </p>
          ) : null}

          <div className="mt-6 space-y-5">
            {page.sections.map((section) => (
              <section key={section.heading} data-info-section className="rounded-2xl border border-border bg-bg-surface p-4 shadow-sm sm:p-6">
                <h2 className="text-sm font-black sm:text-base">{section.heading}</h2>
                {section.body?.map((paragraph) => (
                  <p key={paragraph} className="mt-2 text-[11px] leading-relaxed text-text-secondary sm:text-xs">{paragraph}</p>
                ))}
                {section.bullets ? (
                  <ul className="mt-2 space-y-1.5">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-1.5 text-[11px] leading-relaxed text-text-secondary sm:text-xs">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>

          <section className="mt-6 rounded-2xl border border-border bg-bg-surface p-4 shadow-sm sm:p-6">
            <h2 className="text-sm font-black">Still need an answer?</h2>
            <p className="mt-1 text-[11px] text-text-secondary sm:text-xs">Write to us and include the order number if you have one.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href="/contact" data-info-contact className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2.5 text-[11px] font-bold text-accent-foreground">Contact us <ArrowRight size={13} /></a>
              <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2.5 text-[11px] font-bold"><Mail size={13} /> {CONTACT_EMAIL}</a>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
