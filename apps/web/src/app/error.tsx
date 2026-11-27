"use client";

import Link from "next/link";
import { useEffect } from "react";
import { recordClientError } from "@/lib/error-log";
import T from "@/components/T";

/**
 * The shop's own crash page. Next's default is a bare "Application error" line, which tells a customer
 * nothing and tells the owner less; this one says what happened, keeps the crash on the device so the
 * admin can read it, and gives two ways forward.
 */
export default function ShopError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    recordClientError({
      message: error.message || "The page crashed",
      kind: "error",
      digest: error.digest ?? "",
      stack: error.stack ?? "",
    });
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-accent">MH Fashion</p>
      <h1 className="text-2xl font-black"><T k="errors.pageTitle" /></h1>
      <p className="mt-3 text-sm leading-relaxed text-text-secondary">
        Something in this page failed. Your cart and any design saved on this device are untouched — reload the
        page, or carry on from the shop.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={reset} className="rounded-full bg-accent px-5 py-2.5 text-xs font-bold text-accent-foreground">
          <T k="errors.retry" />
        </button>
        <Link href="/" className="rounded-full border border-border px-5 py-2.5 text-xs font-bold">
          <T k="errors.backToShop" />
        </Link>
      </div>
      <p className="mt-5 text-[10px] leading-4 text-text-muted">
        The details were saved on this device. Staff can read them under Admin → Settings → Crash log.
        {error.digest ? ` Reference ${error.digest}.` : ""}
      </p>
    </main>
  );
}
