import type { Metadata } from "next";
import Link from "next/link";
import T from "@/components/T";

export const metadata: Metadata = {
  title: "Offline — MH Fashion",
  description: "You are offline. The pages you already opened are still available.",
  robots: { index: false, follow: false },
};

/**
 * The fallback the service worker shows when the phone has no connection. It is deliberately
 * built from plain markup: the header, the dock and the icons all need client chunks, and a chunk
 * that cannot be fetched offline turns this page into the browser's own error screen.
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-[520px] rounded-2xl border border-border bg-bg-surface p-6 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 2l20 20" /><path d="M8.5 16.5a5 5 0 0 1 7 0" /><path d="M5 12.5a10 10 0 0 1 4-2.4" /><path d="M15 10.1a10 10 0 0 1 4 2.4" /><path d="M2 8.8a15 15 0 0 1 5-3.2" /><path d="M17 5.6a15 15 0 0 1 5 3.2" /><path d="M12 20h.01" /></svg>
        </span>
        <h1 className="mt-3 text-xl font-black"><T k="errors.offlineTitle" /></h1>
        <p className="mt-2 text-xs leading-relaxed text-text-secondary">
          <T k="errors.offlineHelp" />
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link href="/" className="rounded-full bg-accent px-4 py-2.5 text-[11px] font-bold text-accent-foreground"><T k="errors.offlineCta" /></Link>
          <Link href="/faq" className="rounded-full border border-border px-4 py-2.5 text-[11px] font-bold"><T k="errors.readFaq" /></Link>
        </div>
        <p className="mt-3 text-[10px] text-text-muted"><T k="errors.offlineNote" /></p>
      </div>
    </main>
  );
}
