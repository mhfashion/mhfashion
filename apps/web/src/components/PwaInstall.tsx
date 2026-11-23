"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Download, X } from "lucide-react";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const DISMISS_KEY = "mh-fashion-pwa-dismissed";

/** The editor and the admin are working surfaces; an install banner there is only in the way. */
const HIDDEN_PREFIXES = ["/admin", "/create"];

/** Read once on mount; a blocked storage keeps the prompt available. */
function readDismissed() {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export default function PwaInstall() {
  const pathname = usePathname();
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(readDismissed);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Registered late so the first paint is never waiting on the worker.
    const register = () => navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    const onPrompt = (event: Event) => {
      // Chrome only fires this once and only while the app is installable.
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("load", register);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // A blocked storage just means the banner comes back next visit.
    }
  }

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === "dismissed") dismiss();
    setPrompt(null);
  }

  const hidden = dismissed || installed || !prompt || HIDDEN_PREFIXES.some((prefix) => pathname?.startsWith(prefix));
  if (hidden) return null;

  return (
    <div data-pwa-install className="fixed inset-x-3 bottom-[calc(var(--mobile-navigation-height,4rem)+0.75rem)] z-50 mx-auto flex max-w-md items-center gap-2 rounded-2xl border border-border bg-bg-surface p-2.5 shadow-lg md:bottom-4 md:left-auto md:right-4 md:mx-0">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent"><Download size={15} /></span>
      <p className="min-w-0 flex-1 text-[11px] leading-4 text-text-secondary">
        <b className="text-text-primary">Install MH Fashion</b> for one-tap ordering and offline browsing.
      </p>
      <button type="button" onClick={install} className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-[10px] font-bold text-accent-foreground">Install</button>
      <button type="button" onClick={dismiss} aria-label="Dismiss install prompt" className="shrink-0 rounded-full p-1 text-text-muted"><X size={13} /></button>
    </div>
  );
}
