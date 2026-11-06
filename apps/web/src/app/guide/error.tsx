"use client";

import Link from "next/link";

export default function GuideError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-accent">MH Fashion handbook</p>
      <h1 className="mb-3 text-2xl font-bold">We could not load this guide.</h1>
      <p className="text-sm leading-relaxed text-text-secondary">This may be a temporary connection issue. Please try again in a moment.</p>
      <div className="mt-6 flex items-center gap-5">
        <button type="button" onClick={reset} className="rounded-full bg-accent px-5 py-2.5 text-xs font-bold text-accent-foreground">Try again</button>
        <Link href="/guide" className="text-xs font-semibold text-text-secondary hover:text-accent">Back to guides</Link>
      </div>
    </main>
  );
}
