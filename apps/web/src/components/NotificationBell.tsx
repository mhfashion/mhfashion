"use client";

import { useEffect, useRef, useState } from "react";
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

  return (
    <div className="relative" ref={ref}>
      <button
        aria-label="Notifications"
        className="relative"
        onClick={() => setOpen((o) => !o)}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-accent" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-3 w-80 bg-bg-surface border border-border rounded-xl shadow-xl overflow-hidden z-50">
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
              PLACEHOLDER_NOTIFICATIONS.map((n) => (
                <div
                  key={n.id}
                  className="flex items-start gap-2.5 px-4 py-3 border-b border-border last:border-0 hover:bg-bg cursor-pointer"
                >
                  {!n.read && (
                    <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                  )}
                  <div className={n.read ? "pl-4" : ""}>
                    <p className="text-xs text-text-primary leading-snug">
                      {n.title}
                    </p>
                    <p className="text-[10px] text-text-muted mt-0.5">
                      {n.timeAgo}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
