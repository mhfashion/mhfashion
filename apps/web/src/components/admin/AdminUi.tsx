"use client";

import { useEffect, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { X } from "lucide-react";

export type AdminTone = "green" | "blue" | "amber" | "red" | "violet" | "slate";

const TONE_CLASSES: Record<AdminTone, string> = {
  green: "bg-[#e7f8e2] text-[#2f8f3c]",
  blue: "bg-[#e5efff] text-[#2d69d8]",
  amber: "bg-[#fff4d8] text-[#9a6c07]",
  red: "bg-[#ffeaeb] text-[#c9424a]",
  violet: "bg-[#f1e8ff] text-[#8347d6]",
  slate: "bg-[#eef1f4] text-[#5c6673]",
};

export function AdminBadge({ tone = "slate", children }: { tone?: AdminTone; children: ReactNode }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 text-[9px] font-bold ${TONE_CLASSES[tone]}`}>
      {children}
    </span>
  );
}

export function AdminCard({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <article className={`min-w-0 rounded-2xl border border-[#e8ebef] bg-white shadow-[0_2px_10px_rgba(22,34,51,0.025)] ${className}`}>
      {children}
    </article>
  );
}

export function AdminCardHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#edf0f3] px-4 py-4 sm:px-5">
      <div className="min-w-0">
        <h2 className="text-[14px] font-bold text-[#202733]">{title}</h2>
        {description ? <p className="mt-1 text-[10px] text-[#929ba7]">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function AdminStat({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <AdminCard className="flex items-center gap-3 p-4 sm:p-5">
      {icon ? <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#eef4e6] text-[#4cae22]">{icon}</span> : null}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-medium text-[#7b8492]">{label}</p>
        <strong className="mt-1 block text-[18px] font-extrabold leading-6 tracking-tight text-[#151a22] sm:text-[20px]">{value}</strong>
        {hint ? <p className="mt-0.5 text-[9px] text-[#9aa2ae]">{hint}</p> : null}
      </div>
    </AdminCard>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-[#4cae22] text-white hover:bg-[#429a1d] disabled:bg-[#b7d9a6]",
  secondary: "border border-[#e2e7ec] bg-white text-[#3c4553] hover:bg-[#f6f8fa]",
  ghost: "text-[#4c9d38] hover:bg-[#f1f8ec]",
  danger: "border border-[#f3d2d4] bg-[#fff6f6] text-[#c9424a] hover:bg-[#ffecec]",
};

export function AdminButton({
  variant = "primary",
  compact = false,
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; compact?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl font-bold transition-colors disabled:cursor-not-allowed ${compact ? "h-8 px-2.5 text-[10px]" : "h-9 px-3.5 text-[11px]"} ${BUTTON_VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function AdminInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={`h-9 w-full rounded-xl border border-[#e2e7ec] bg-white px-3 text-[11px] text-[#252c37] outline-none placeholder:text-[#a4acb6] focus:border-[#a5d972] ${className}`}
    />
  );
}

export function AdminSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", ...rest } = props;
  return (
    <select
      {...rest}
      className={`h-9 w-full rounded-xl border border-[#e2e7ec] bg-white px-2.5 text-[11px] font-semibold text-[#3c4553] outline-none focus:border-[#a5d972] ${className}`}
    />
  );
}

export function AdminTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = "", ...rest } = props;
  return (
    <textarea
      {...rest}
      className={`w-full rounded-xl border border-[#e2e7ec] bg-white px-3 py-2 text-[11px] text-[#252c37] outline-none placeholder:text-[#a4acb6] focus:border-[#a5d972] ${className}`}
    />
  );
}

export function AdminField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[10px] font-bold text-[#5b6674]">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[9px] text-[#98a1ac]">{hint}</span> : null}
    </label>
  );
}

export function AdminEmpty({ title, description }: { title: string; description?: string }) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="text-[11px] font-bold text-[#5b6674]">{title}</p>
      {description ? <p className="mt-1 text-[10px] text-[#929ba7]">{description}</p> : null}
    </div>
  );
}

/**
 * aria-modal hides the page from a screen reader, so the focus has to move into the panel, stay in while it is
 * open, and go back to the control that opened it — otherwise Tab walks the page behind the sheet.
 * Returns the ref to put on the panel, which must also carry `tabIndex={-1}`.
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

export function AdminDrawer({
  open,
  title,
  description,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const panelRef = useModalFocus(open, onClose);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close panel" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-[#111820]/45" />
      <div ref={panelRef} tabIndex={-1} className="relative flex h-full w-full max-w-[430px] flex-col bg-white shadow-[-16px_0_48px_rgba(17,24,32,0.18)] outline-none">
        <div className="flex items-start justify-between gap-3 border-b border-[#edf0f3] px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-[14px] font-bold text-[#202733]">{title}</h2>
            {description ? <p className="mt-1 text-[10px] text-[#929ba7]">{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Close panel" className="rounded-lg p-1.5 text-[#87909c] hover:bg-[#f3f5f7]">
            <X size={17} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <div className="border-t border-[#edf0f3] px-5 py-3">{footer}</div> : null}
      </div>
    </div>
  );
}
