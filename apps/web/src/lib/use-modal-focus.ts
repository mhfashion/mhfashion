"use client";

import { useEffect, useRef } from "react";

/**
 * The focus an `aria-modal` panel owes the keyboard: move into the panel when it opens, keep Tab inside it,
 * and hand the focus back to the control that opened it when it closes. `aria-modal` alone hides the page
 * from a screen reader while Tab still walks it, so a panel without this is worse than an ordinary popover.
 *
 * Returns the ref for the panel, which must also carry `tabIndex={-1}`.
 */
export function useModalFocus(open: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    panel?.focus();
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusable = [...panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
        .filter((element) => element.getClientRects().length > 0);
      if (!focusable.length) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        event.preventDefault();
        last.focus();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      returnFocusRef.current?.focus?.();
    };
  }, [open]);

  return panelRef;
}
