"use client";

import { useEffect } from "react";

export default function BrowserZoomGuard() {
  useEffect(() => {
    const preventBrowserZoom = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) event.preventDefault();
    };

    window.addEventListener("wheel", preventBrowserZoom, {
      capture: true,
      passive: false,
    });
    return () => window.removeEventListener("wheel", preventBrowserZoom, true);
  }, []);

  return null;
}
