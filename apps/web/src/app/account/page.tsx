"use client";

import { useState } from "react";
import {
  User,
  Package,
  Palette,
  Heart,
  Sparkles,
  Settings,
  Trash2,
  LogOut,
} from "lucide-react";
import Header from "@/components/Header";
import { useCurrency } from "@/lib/currency-context";
import { useTheme } from "@/lib/theme-context";

type SectionId =
  | "profile"
  | "orders"
  | "designs"
  | "wishlist"
  | "points"
  | "settings";

const SECTIONS: { id: SectionId; label: string; Icon: React.ElementType }[] = [
  { id: "profile", label: "Profile", Icon: User },
  { id: "orders", label: "Order History", Icon: Package },
  { id: "designs", label: "My Designs", Icon: Palette },
  { id: "wishlist", label: "Wishlist", Icon: Heart },
  { id: "points", label: "AI Points", Icon: Sparkles },
  { id: "settings", label: "Settings", Icon: Settings },
];

// Order status stages, in the confirmed order.
const ORDER_STAGES = [
  "Pending Payment",
  "Confirmed",
  "Processing",
  "Printing",
  "Ready to Ship",
  "Handed to Delivery",
  "Out for Delivery",
  "Delivered",
];

// Placeholder data — replaced with Supabase queries once auth is wired up.
const PLACEHOLDER_ORDERS = [
  { id: "1042", date: "1 Sep 2026", stage: "Out for Delivery", totalKs: 60000, items: 2 },
  { id: "1017", date: "18 Aug 2026", stage: "Delivered", totalKs: 25000, items: 1 },
];

const PLACEHOLDER_DESIGNS = [
  { id: "d1", name: "Chaos Theory remix", product: "T-shirt · Crew Neck · M" },
  { id: "d2", name: "Team jersey #10", product: "Jersey · L" },
];

const PLACEHOLDER_WISHLIST = [
  { id: "w1", name: "Butterfly Effect", priceKs: 21000 },
  { id: "w2", name: "Void Tee", priceKs: 25000 },
];

const MAX_SAVED_DESIGNS = 3; // admin-configurable platform setting

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-bold mb-4">{children}</h2>;
}

function Labelled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] text-text-muted mb-1">{label}</p>
      {children}
    </div>
  );
}

function TextField({ value }: { value: string }) {
  return (
    <input
      defaultValue={value}
      className="w-full bg-bg-surface border border-border rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-border-light"
    />
  );
}

export default function AccountPage() {
  const [active, setActive] = useState<SectionId>("profile");
  const { currency, toggleCurrency } = useCurrency();
  const { theme, toggleTheme } = useTheme();

  return (
    <main>
      <Header />

      <div className="px-6 md:px-8 py-6 max-w-5xl mx-auto">
        <h1 className="text-lg font-bold mb-5">MY ACCOUNT</h1>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Section nav */}
          <nav className="md:w-48 flex-shrink-0 flex md:flex-col gap-1 overflow-x-auto">
            {SECTIONS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActive(id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs whitespace-nowrap ${
                  active === id
                    ? "bg-bg-surface text-accent font-semibold"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
            <button className="flex items-center gap-2 px-3 py-2 rounded-md text-xs text-text-muted hover:text-text-primary md:mt-4">
              <LogOut size={14} /> Sign out
            </button>
          </nav>

          <div className="flex-1 min-w-0">
            {active === "profile" && (
              <section>
                <SectionHeading>Profile</SectionHeading>
                <div className="grid sm:grid-cols-2 gap-4 max-w-lg">
                  <Labelled label="Full name">
                    <TextField value="MH Fashion" />
                  </Labelled>
                  <Labelled label="Email">
                    <TextField value="mhfashionmm@gmail.com" />
                  </Labelled>
                  <Labelled label="Phone number">
                    <TextField value="+95 9 400 686 925" />
                  </Labelled>
                  <div className="sm:col-span-2">
                    <Labelled label="Delivery address">
                      <textarea
                        rows={3}
                        defaultValue=""
                        placeholder="Street, township, city, country"
                        className="w-full bg-bg-surface border border-border rounded-md px-2.5 py-1.5 text-xs outline-none resize-none placeholder:text-text-faint focus:border-border-light"
                      />
                    </Labelled>
                    <p className="text-[9px] text-text-faint mt-1">
                      This address is sent to the courier when you place an
                      order. Domestic orders go through MH Delivery;
                      international orders through DHL.
                    </p>
                  </div>
                </div>
                <button className="mt-4 bg-accent text-accent-foreground text-[11px] font-semibold px-4 py-1.5 rounded">
                  Save changes
                </button>
              </section>
            )}

            {active === "orders" && (
              <section>
                <SectionHeading>Order History</SectionHeading>
                <div className="space-y-3">
                  {PLACEHOLDER_ORDERS.map((order) => {
                    const stageIndex = ORDER_STAGES.indexOf(order.stage);
                    return (
                      <div
                        key={order.id}
                        className="border border-border rounded-lg p-3.5"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-xs font-semibold">
                              Order #{order.id}
                            </p>
                            <p className="text-[10px] text-text-muted">
                              {order.date} · {order.items} item
                              {order.items > 1 ? "s" : ""}
                            </p>
                          </div>
                          <p className="text-xs font-semibold">
                            {order.totalKs.toLocaleString("en-US")} Ks
                          </p>
                        </div>

                        {/* Status timeline */}
                        <div className="flex items-center gap-1">
                          {ORDER_STAGES.map((stage, i) => (
                            <div key={stage} className="flex-1">
                              <div
                                className={`h-1 rounded-full ${
                                  i <= stageIndex ? "bg-accent" : "bg-bg-surface"
                                }`}
                              />
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-accent mt-1.5">
                          {order.stage}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {active === "designs" && (
              <section>
                <SectionHeading>My Designs</SectionHeading>
                <p className="text-[10px] text-text-muted mb-3">
                  {PLACEHOLDER_DESIGNS.length} of {MAX_SAVED_DESIGNS} saved.
                  Delete one to make room for a new design.
                </p>
                <div className="grid sm:grid-cols-3 gap-3">
                  {PLACEHOLDER_DESIGNS.map((d) => (
                    <div
                      key={d.id}
                      className="border border-border rounded-lg overflow-hidden"
                    >
                      <div className="aspect-square bg-bg-surface" />
                      <div className="p-2.5">
                        <p className="text-[11px] font-medium truncate">
                          {d.name}
                        </p>
                        <p className="text-[9px] text-text-muted truncate">
                          {d.product}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <a
                            href="/create"
                            className="text-[10px] text-accent"
                          >
                            Edit
                          </a>
                          <button className="text-[10px] text-text-muted flex items-center gap-1">
                            <Trash2 size={10} /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {PLACEHOLDER_DESIGNS.length < MAX_SAVED_DESIGNS && (
                    <a
                      href="/create"
                      className="border border-dashed border-border-light rounded-lg aspect-square flex items-center justify-center text-[10px] text-text-muted"
                    >
                      + New design
                    </a>
                  )}
                </div>
              </section>
            )}

            {active === "wishlist" && (
              <section>
                <SectionHeading>Wishlist</SectionHeading>
                {PLACEHOLDER_WISHLIST.length === 0 ? (
                  <p className="text-[11px] text-text-muted">
                    Nothing saved yet.
                  </p>
                ) : (
                  <div className="grid sm:grid-cols-4 gap-3">
                    {PLACEHOLDER_WISHLIST.map((w) => (
                      <div key={w.id}>
                        <div className="aspect-square bg-bg-surface rounded-lg" />
                        <p className="text-[11px] mt-1.5">{w.name}</p>
                        <p className="text-[10px] text-text-muted">
                          {w.priceKs.toLocaleString("en-US")} Ks
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {active === "points" && (
              <section>
                <SectionHeading>AI Points</SectionHeading>
                <div className="grid sm:grid-cols-2 gap-3 max-w-md">
                  <div className="border border-border rounded-lg p-3.5">
                    <p className="text-[10px] text-text-muted mb-1">
                      Daily points
                    </p>
                    <p className="text-xl font-bold text-accent">300</p>
                    <p className="text-[9px] text-text-faint mt-1">
                      Granted every day. Unused daily points expire at the end
                      of the day.
                    </p>
                  </div>
                  <div className="border border-border rounded-lg p-3.5">
                    <p className="text-[10px] text-text-muted mb-1">
                      Purchase points
                    </p>
                    <p className="text-xl font-bold">150</p>
                    <p className="text-[9px] text-text-faint mt-1">
                      Earned 50 points per product purchased. These never
                      expire.
                    </p>
                  </div>
                </div>
                <p className="text-[10px] text-text-muted mt-3">
                  Generating one AI image costs 100 points. Daily points are
                  spent first, then purchase points.
                </p>
              </section>
            )}

            {active === "settings" && (
              <section>
                <SectionHeading>Settings</SectionHeading>
                <div className="space-y-3 max-w-md">
                  <div className="flex items-center justify-between border border-border rounded-lg px-3.5 py-3">
                    <div>
                      <p className="text-xs font-medium">Currency</p>
                      <p className="text-[10px] text-text-muted">
                        Prices are shown in this currency across the site.
                      </p>
                    </div>
                    <button
                      onClick={toggleCurrency}
                      className="text-[11px] border border-border-light rounded-full px-3 py-1"
                    >
                      {currency}
                    </button>
                  </div>

                  <div className="flex items-center justify-between border border-border rounded-lg px-3.5 py-3">
                    <div>
                      <p className="text-xs font-medium">Theme</p>
                      <p className="text-[10px] text-text-muted">
                        Switch between dark and light appearance.
                      </p>
                    </div>
                    <button
                      onClick={toggleTheme}
                      className="text-[11px] border border-border-light rounded-full px-3 py-1 capitalize"
                    >
                      {theme}
                    </button>
                  </div>

                  <div className="flex items-center justify-between border border-border rounded-lg px-3.5 py-3">
                    <div>
                      <p className="text-xs font-medium">Notifications</p>
                      <p className="text-[10px] text-text-muted">
                        In-app notifications are always on. Email updates are
                        sent when an email is on file.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
