"use client";

import { useEffect } from "react";

const BROWSER_ZOOM_KEYS = new Set(["+", "=", "-", "_", "0"]);
const BROWSER_ZOOM_CODES = new Set(["NumpadAdd", "NumpadSubtract", "Numpad0"]);

export function isBrowserZoomShortcut(event: Pick<KeyboardEvent, "ctrlKey" | "metaKey" | "key" | "code">): boolean {
  if (!event.ctrlKey && !event.metaKey) return false;
  return BROWSER_ZOOM_KEYS.has(event.key) || BROWSER_ZOOM_CODES.has(event.code);
}

export default function BrowserZoomGuard() {
  useEffect(() => {
    const preventBrowserZoom = (event: WheelEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.cancelable) event.preventDefault();
    };
    const preventBrowserZoomShortcut = (event: KeyboardEvent) => {
      if (isBrowserZoomShortcut(event) && event.cancelable) event.preventDefault();
    };
    const preventPageContextMenu = (event: MouseEvent) => {
      if (event.cancelable) event.preventDefault();
    };

    window.addEventListener("wheel", preventBrowserZoom, {
      capture: true,
      passive: false,
    });
    window.addEventListener("keydown", preventBrowserZoomShortcut, true);
    document.addEventListener("contextmenu", preventPageContextMenu, true);

    return () => {
      window.removeEventListener("wheel", preventBrowserZoom, true);
      window.removeEventListener("keydown", preventBrowserZoomShortcut, true);
      document.removeEventListener("contextmenu", preventPageContextMenu, true);
    };
  }, []);

  return null;
}
