"use client";

import { useEffect } from "react";
import { recordClientError } from "@/lib/error-log";

/** Noise that is not a bug: a cross-origin script the browser will not describe, and the browser's own
 * ResizeObserver warning, which fires on a layout that is merely busy. */
const IGNORED = [/^Script error\.?$/i, /ResizeObserver loop/i];

/**
 * Catches what a React error boundary cannot: a crash inside an event handler or a timer, which is
 * exactly how "the editor froze" arrives. A crash a boundary already recorded collapses into the same
 * entry, because the log dedupes on message and path.
 */
export default function CrashReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      const message = event.message?.trim();
      if (!message || IGNORED.some((pattern) => pattern.test(message))) return;
      recordClientError({ message, kind: "unhandled", stack: event.error instanceof Error ? event.error.stack ?? "" : "" });
    };
    window.addEventListener("error", onError);
    return () => window.removeEventListener("error", onError);
  }, []);
  return null;
}
