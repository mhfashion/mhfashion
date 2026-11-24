"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Bell } from "lucide-react";

type NotificationItem = {
  id: string;
  title: string;
  timeAgo: string;
  read: boolean;
};

// Placeholder items — real notifications (order status, reward points, etc.)
// will come from the notifications table once that's wired up.
const PLACEHOLDER_NOTIFICATIONS: NotificationItem[] = [
  { id: "1", title: "Your order #1042 has shipped", timeAgo: "2h ago", read: false },
  { id: "2", title: "You earned 50 points from your last purchase", timeAgo: "1d ago", read: false },
  { id: "3", title: "Chaos Theory is back in stock", timeAgo: "3d ago", read: true },
];

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // The bell is rendered in the header and again in the phone drawer, so the panel id has to be unique.
  const panelId = useId();
  const unreadCount = PLACEHOLDER_NOTIFICATIONS.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Without Escape the panel could only be dismissed with a mouse: it closes on an outside mousedown.
  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    function handleKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        ref={buttonRef}
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        className="relative"
        onClick={() => setOpen((o) => !o)}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span aria-hidden="true" className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-accent" />
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label="Notifications"
          tabIndex={-1}
          className="absolute right-0 top-full mt-3 w-80 bg-bg-surface border border-border rounded-xl shadow-xl overflow-hidden z-50 outline-none"
        >
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-text-primary">
              Notifications
            </p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {PLACEHOLDER_NOTIFICATIONS.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-8">
                No notifications yet
              </p>
            ) : (
              <ul>
                {PLACEHOLDER_NOTIFICATIONS.map((n) => (
                  <li
                    key={n.id}
                    className="flex items-start gap-2.5 px-4 py-3 border-b border-border last:border-0 hover:bg-bg"
                  >
                    {!n.read && (
                      <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                    )}
                    <div className={n.read ? "pl-4" : ""}>
                      <p className="text-xs text-text-primary leading-snug">
                        {n.title}
                      </p>
                      <p className="text-[10px] text-text-muted mt-0.5">
                        {n.timeAgo}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
