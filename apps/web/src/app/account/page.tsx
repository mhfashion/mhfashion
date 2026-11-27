"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Check,
  ChevronRight,
  CreditCard,
  Heart,
  HelpCircle,
  LogOut,
  MapPin,
  Package,
  Palette,
  Pencil,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Trash2,
  User,
  Wallet,
} from "lucide-react";
import Header from "@/components/Header";
import { useCurrency } from "@/lib/currency-context";
import { useTheme } from "@/lib/theme-context";
import { useI18n } from "@/lib/i18n";
import { useWishlist } from "@/lib/wishlist-context";
import { updateAdminData, useAdminDemoData } from "@/lib/admin-demo-store";
import {
  earnDaily, lifetimeSpendKs, loyaltyHistory, milestoneProgress, nextTier, pointsBalance, tierFor,
} from "@/lib/loyalty-ledger";
import {
  REFUND_REASONS,
  latestRefundRequest,
  refundBlocker,
  refundReasonLabel,
  requestRefund,
  type RefundReasonId,
} from "@/lib/order-refunds";
import {
  formatOrderDate, myOrders, orderItemDetail, orderStageTone, orderTotalKs, orderUnits, STAGE_TONE_CLASS,
} from "@/lib/my-orders";
import type { AdminOrder } from "@/lib/admin-demo-data";

type SectionId = "dashboard" | "profile" | "orders" | "designs" | "wishlist" | "points" | "settings";

const SECTIONS: { id: SectionId; labelKey: string; fallback: string; Icon: typeof User }[] = [
  { id: "dashboard", labelKey: "account.dashboard", fallback: "Dashboard", Icon: Package },
  { id: "orders", labelKey: "account.orders", fallback: "My Orders", Icon: ShoppingBag },
  { id: "designs", labelKey: "account.designs", fallback: "My Designs", Icon: Palette },
  { id: "points", labelKey: "account.points", fallback: "My Points", Icon: Star },
  { id: "wishlist", labelKey: "account.wishlist", fallback: "Wishlist", Icon: Heart },
  { id: "settings", labelKey: "account.settings", fallback: "Account Settings", Icon: Settings },
];

const COPY = {
  en: {
    welcome: "Welcome Back! 👋",
    welcomeSub: "Let's design something amazing together!",
    start: "Start Designing",
    totalOrders: "Total Orders",
    points: "My Points",
    wallet: "Wallet Balance",
    wishlist: "Wishlist",
    thisMonth: "this month",
    recentOrders: "Recent Orders",
    viewAllOrders: "View All Orders",
    viewDetails: "View Details",
    rewards: "My Points",
    viewHistory: "View History",
    nextReward: "Next Reward",
    pointsNeeded: "500 Points",
    closer: "You are 50% closer to get a special discount!",
    explore: "Explore Rewards",
    accountSettings: "Account Settings",
    manage: "Manage your account information",
    editProfile: "Edit Profile",
    changePassword: "Change Password",
    notificationSettings: "Notification Settings",
    privacy: "Privacy & Security",
    needHelp: "Need Help?",
    support: "Our support team is here to help you",
    faqs: "FAQs",
    contact: "Contact Us",
    chat: "Live Chat",
    earn: "Earn More Points!",
    earnSub: "Shop, Share & Enjoy!",
    learn: "Learn More",
    member: "Gold Member",
    profile: "Profile",
    fullName: "Full name",
    email: "Email",
    phone: "Phone number",
    address: "Delivery address",
    save: "Save changes",
    empty: "Nothing saved yet.",
    newDesign: "+ New design",
    daily: "Daily points",
    purchase: "Purchase points",
    theme: "Theme",
    notifications: "Notifications",
  },
  my: {
    welcome: "ပြန်လည်ကြိုဆိုပါတယ်!",
    welcomeSub: "အံ့သြဖွယ်ဒီဇိုင်းတစ်ခုကို အတူဖန်တီးကြရအောင်!",
    start: "ဒီဇိုင်းစတင်ရန်",
    totalOrders: "အော်ဒါစုစုပေါင်း",
    points: "ကျွန်ုပ်၏အမှတ်များ",
    wallet: "ပိုက်ဆံအိတ်လက်ကျန်",
    wishlist: "ဆန္ဒစာရင်း",
    thisMonth: "ဒီလ",
    recentOrders: "လတ်တလောအော်ဒါများ",
    viewAllOrders: "အော်ဒါအားလုံးကြည့်ရန်",
    viewDetails: "အသေးစိတ်ကြည့်ရန်",
    rewards: "ကျွန်ုပ်၏အမှတ်များ",
    viewHistory: "မှတ်တမ်းကြည့်ရန်",
    nextReward: "နောက်ထပ်ဆု",
    pointsNeeded: "အမှတ် ၅၀၀",
    closer: "အထူးလျှော့စျေးရရန် ၅၀% နီးကပ်နေပါပြီ!",
    explore: "ဆုများကြည့်ရန်",
    accountSettings: "အကောင့်ဆက်တင်များ",
    manage: "သင့်အကောင့်အချက်အလက်ကို စီမံရန်",
    editProfile: "ပရိုဖိုင်ပြင်ရန်",
    changePassword: "စကားဝှက်ပြောင်းရန်",
    notificationSettings: "အသိပေးချက်ဆက်တင်များ",
    privacy: "ကိုယ်ရေးကိုယ်တာနှင့် လုံခြုံရေး",
    needHelp: "အကူအညီလိုပါသလား?",
    support: "ကျွန်ုပ်တို့၏ ပံ့ပိုးကူညီရေး အဖွဲ့က ကူညီပေးရန် အသင့်ရှိပါတယ်",
    faqs: "မေးလေ့ရှိသောမေးခွန်းများ",
    contact: "ဆက်သွယ်ရန်",
    chat: "Live Chat",
    earn: "အမှတ်များပိုမိုရယူပါ!",
    earnSub: "ဝယ်ယူ၊ မျှဝေ၊ ပျော်ရွှင်ပါ!",
    learn: "ပိုမိုလေ့လာရန်",
    member: "ရွှေအဖွဲ့ဝင်",
    profile: "ကိုယ်ရေးအချက်အလက်",
    fullName: "အမည်အပြည့်အစုံ",
    email: "အီးမေးလ်",
    phone: "ဖုန်းနံပါတ်",
    address: "ပို့ဆောင်မည့်လိပ်စာ",
    save: "ပြောင်းလဲမှုများ သိမ်းရန်",
    empty: "သိမ်းဆည်းထားသည် မရှိသေးပါ။",
    newDesign: "+ ဒီဇိုင်းအသစ်",
    daily: "နေ့စဉ်အမှတ်များ",
    purchase: "ဝယ်ယူမှုအမှတ်များ",
    theme: "အပြင်အဆင်",
    notifications: "အသိပေးချက်များ",
  },
} as const;

function OrderStageBadge({ stage }: { stage: string }) {
  return <span data-order-stage={stage} className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${STAGE_TONE_CLASS[orderStageTone(stage)]}`}>{stage}</span>;
}

function AccountOrderCard({ order, formatMoney, detailed = false }: { order: AdminOrder; formatMoney: (value: number) => string; detailed?: boolean }) {
  const { t } = useI18n();
  const units = orderUnits(order);
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState<RefundReasonId>(REFUND_REASONS[0].id);
  const [note, setNote] = useState("");
  const [problems, setProblems] = useState<string[]>([]);
  const latest = latestRefundRequest(order);
  const blocker = refundBlocker(order);

  function send() {
    let failed: string[] = [];
    updateAdminData((store) => {
      const target = store.orders.find((entry) => entry.id === order.id);
      if (!target) return store;
      const result = requestRefund(target, {
        reason,
        note,
        at: new Date().toISOString(),
        id: `rf-${Date.now().toString(36)}`,
      });
      failed = result.issues;
      if (failed.length) return store;
      return { ...store, orders: store.orders.map((entry) => (entry.id === order.id ? result.order : entry)) };
    });
    setProblems(failed);
    if (!failed.length) {
      setAsking(false);
      setNote("");
    }
  }

  return (
    <div data-account-order={order.id} className="rounded-xl border border-border p-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-1 basis-full items-center gap-3 sm:basis-0">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#eaf8d7] to-[#cbeaa9] text-center text-[8px] font-black leading-tight text-[#4c9d16]">MH<br />FASHION</div>
          <div className="min-w-0">
            <p className="text-sm font-bold">Order {order.id}</p>
            <p className="mt-1 text-xs text-text-muted">{formatOrderDate(order.placedAt)} · {units} {units === 1 ? "item" : "items"} · {order.payment}</p>
          </div>
        </div>
        <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
          <OrderStageBadge stage={order.stage} />
          <p className="text-sm font-black">{formatMoney(orderTotalKs(order))}</p>
        </div>
      </div>
      {detailed ? (
        <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
          {order.items.map((item, index) => {
            const detail = orderItemDetail(item);
            return (
              <li key={`${item.productId}-${index}`} className="flex items-baseline justify-between gap-3 text-xs">
                <span className="min-w-0 break-words">
                  {item.name} <span className="text-text-muted">× {Math.max(1, item.quantity)}</span>
                  {detail ? <span className="text-text-muted"> · {detail}</span> : null}
                </span>
                <span className="shrink-0 font-semibold">{formatMoney(item.unitPriceKs * Math.max(1, item.quantity))}</span>
              </li>
            );
          })}
          {order.note ? <li className="text-[11px] text-text-muted">Note: {order.note}</li> : null}
        </ul>
      ) : null}
      {latest ? (
        <div data-account-refund={latest.status} className="mt-3 rounded-xl border border-border bg-bg p-3">
          <p className="text-[11px] font-bold">
            Refund request · {refundReasonLabel(latest.reason)} · <span className="text-accent">{latest.status}</span>
          </p>
          {latest.note ? <p className="mt-1 text-[11px] text-text-secondary">{latest.note}</p> : null}
          {latest.reply ? <p className="mt-1 text-[11px] text-text-secondary">MH Fashion: {latest.reply}</p> : null}
          {latest.status === "Requested" ? <p className="mt-1 text-[10px] text-text-muted">{t("account.refundReply")}</p> : null}
        </div>
      ) : null}
      {blocker && !latest ? <p className="mt-3 text-[10px] text-text-muted">{blocker}</p> : null}
      {detailed && !blocker ? (
        asking ? (
          <div className="mt-3 rounded-xl border border-border bg-bg p-3" data-account-refund-form>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-text-muted">
              {t("account.refundReason")}
              <select aria-label="Refund reason" value={reason} onChange={(event) => setReason(event.target.value as RefundReasonId)} className="mt-1 w-full rounded-lg border border-border bg-bg-surface px-2 py-2 text-xs font-semibold">
                {REFUND_REASONS.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
              </select>
            </label>
            <label className="mt-2 block text-[10px] font-bold uppercase tracking-wide text-text-muted">
              {t("account.refundDetail")}
              <textarea aria-label="Refund note" rows={3} value={note} onChange={(event) => setNote(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-bg-surface px-2 py-2 text-xs" placeholder="A photo helps; attach it in the reply or send it through the contact page." />
            </label>
            <p className="mt-2 text-[10px] text-text-muted">
              Printed pieces are made for one order, so a refund covers a misprint, a wrong item or damage — not a change of mind.{" "}
              <Link href="/returns" className="font-semibold text-accent">{t("account.refundPolicy")}</Link>
            </p>
            {problems.map((problem) => <p key={problem} role="alert" className="mt-1 text-[10px] font-semibold text-[#a33]">{problem}</p>)}
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={send} className="rounded-full bg-accent px-3 py-2 text-[11px] font-bold text-accent-foreground">{t("account.refundSend")}</button>
              <button type="button" onClick={() => { setAsking(false); setProblems([]); }} className="rounded-full border border-border px-3 py-2 text-[11px] font-bold">{t("actions.cancel")}</button>
            </div>
          </div>
        ) : (
          <button type="button" data-account-refund-open onClick={() => setAsking(true)} className="mt-3 text-[11px] font-bold text-accent">{t("account.refundRequest")}</button>
        )
      ) : null}
    </div>
  );
}

function StatCard({ Icon, label, value, helper, tone = "green" }: { Icon: typeof Package; label: string; value: string; helper?: string; tone?: "green" | "yellow" | "blue" | "red" }) {
  const tones = { green: "bg-[#eaf8d7] text-[#54a817]", yellow: "bg-[#fff5d9] text-[#d79e00]", blue: "bg-[#e6f1ff] text-[#3e81c9]", red: "bg-[#ffe9e5] text-[#df4937]" };
  return <div className="rounded-2xl border border-border bg-bg-surface p-4"><div className="flex items-start gap-3"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}><Icon size={22} /></span><div className="min-w-0"><p className="text-xs text-text-secondary">{label}</p><p className="mt-1 text-xl font-black tracking-tight">{value}</p>{helper && <p className="mt-1 text-[10px] text-text-muted">{helper}</p>}</div></div></div>;
}

export default function AccountPage() {
  const [active, setActive] = useState<SectionId>("dashboard");
  const { currency, toggleCurrency } = useCurrency();
  const { theme, toggleTheme } = useTheme();
  const { locale, t } = useI18n();
  const copy = COPY[locale];
  const my = locale === "my";
  const formatMoney = (value: number) => `${value.toLocaleString("en-US")} ${currency}`;
  const wishlist = useWishlist();
  const store = useAdminDemoData();
  const orders = useMemo(() => myOrders(store.orders), [store.orders]);

  // The clock is read after mount so the server render and the first client render agree; the ledger is
  // empty on both, so the points read 0 until the browser has the store.
  const [now, setNow] = useState("");
  useEffect(() => setNow(new Date().toISOString()), []);
  useEffect(() => {
    if (!now) return;
    updateAdminData((current) => {
      const result = earnDaily(current.loyaltyLedger ?? [], current.loyalty.rules, now);
      return result.granted ? { ...current, loyaltyLedger: result.ledger } : current;
    });
  }, [now]);

  const ledger = store.loyaltyLedger ?? [];
  const points = pointsBalance(ledger, now || "1970-01-01T00:00:00.000Z");
  const spendKs = lifetimeSpendKs(orders);
  const tier = tierFor(spendKs, store.loyalty.tiers);
  const nextTierInfo = nextTier(spendKs, store.loyalty.tiers);
  const milestones = milestoneProgress(orders, store.loyalty.milestones.filter((milestone) => milestone.enabled));
  const history = loyaltyHistory(ledger, now || "1970-01-01T00:00:00.000Z").slice(0, 8);
  const dailyPoints = store.loyalty.rules.dailyGrant;
  const purchasePoints = store.loyalty.rules.purchasePointsPerUnit;
  const sectionLabel = (section: (typeof SECTIONS)[number]) => t(section.labelKey) === section.labelKey ? section.fallback : t(section.labelKey);

  const sectionContent = useMemo(() => active, [active]);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const lastSection = useRef(active);

  // Switching sections swaps the whole panel in place, so the focus has to follow it or a keyboard user
  // is left standing on a nav button with no idea what the page now shows.
  useEffect(() => {
    if (lastSection.current === active) return;
    lastSection.current = active;
    requestAnimationFrame(() => headingRef.current?.focus());
  }, [active]);

  return (
    <main className="min-h-screen bg-bg">
      <Header />
      <div className="w-full px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="mx-auto grid w-full max-w-[1480px] gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="hidden xl:flex xl:flex-col xl:gap-4">
            <div className="rounded-2xl bg-gradient-to-br from-[#69b917] via-[#4a9d0f] to-[#25720b] p-5 text-center text-white shadow-sm"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/70 bg-slate-900 text-xl font-black shadow-lg">MTA</div><h2 className="mt-3 text-lg font-black">Min Thu Aung</h2><p className="text-xs text-white/80">@minthu.aung</p><span className="mt-3 inline-flex rounded-full bg-[#e7b52d] px-3 py-1 text-[10px] font-bold text-[#573600]">♛ {copy.member}</span></div>
            <nav aria-label="Account navigation" className="rounded-2xl border border-border bg-bg-surface p-2">{SECTIONS.map((section) => { const Icon = section.Icon; return <button key={section.id} onClick={() => setActive(section.id)} aria-current={active === section.id ? "page" : undefined} className={`flex h-[42px] w-full items-center gap-3 rounded-xl px-3 text-left text-xs font-semibold transition-colors ${active === section.id ? "bg-accent/10 text-accent" : "text-text-secondary hover:bg-bg hover:text-text-primary"}`}><Icon size={17} /> <span className="min-w-0 truncate">{sectionLabel(section)}</span>{section.id === "points" && <span data-account-points-badge className="ml-auto rounded-full bg-accent px-1.5 py-0.5 text-[9px] text-accent-foreground">{points.total}</span>}</button>; })}<div className="my-2 border-t border-border" /><button className="flex h-[42px] w-full items-center gap-3 rounded-xl px-3 text-xs font-semibold text-text-secondary hover:bg-bg"><LogOut size={17} /> <span className="min-w-0 truncate">{t("account.signOut")}</span></button></nav>
            <div className="rounded-2xl bg-gradient-to-b from-[#efffdc] to-[#d9f4bd] p-5 text-center text-[#18350d]"><Sparkles size={25} className="mx-auto text-[#6eae18]" /><h3 className="mt-3 text-base font-black">{copy.earn}</h3><p className="mt-2 text-[10px]">{copy.earnSub}</p><button className="mt-4 inline-flex h-8 items-center rounded-full bg-[#54a817] px-4 text-[10px] font-bold text-white">{copy.learn} <ArrowRight size={12} className="ml-1 inline" /></button></div>
          </aside>

          <div className="min-w-0">
            <section className="mb-4 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#69b917] to-[#3d8d0d] p-4 text-white shadow-sm xl:hidden">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-white/70 bg-slate-900 text-sm font-black shadow-lg">MTA</div>
              <div className="min-w-0 flex-1"><h2 className="truncate text-sm font-black">Min Thu Aung</h2><p className="mt-0.5 text-[10px] text-white/75">@minthu.aung</p><span className="mt-2 inline-flex rounded-full bg-[#e7b52d] px-2.5 py-1 text-[9px] font-bold text-[#573600]">♛ {copy.member}</span></div>
              <button type="button" onClick={() => setActive("settings")} aria-label={copy.accountSettings} className="rounded-full bg-white/15 p-2"><Settings size={16} /></button>
            </section>
            {sectionContent === "dashboard" ? (
              <>
                <section className="relative isolate mb-5 min-h-[205px] overflow-hidden rounded-2xl bg-gradient-to-r from-[#efffdb] via-[#e0f7c4] to-[#c4ee9c] px-6 py-7 text-[#172810] sm:px-9 sm:py-9"><div className="relative z-10 max-w-[58%]"><h1 ref={headingRef} tabIndex={-1} className="text-3xl font-black leading-tight sm:text-4xl">{copy.welcome}</h1><p className="mt-3 text-sm text-[#355128]">{copy.welcomeSub}</p><button onClick={() => window.location.href = "/create"} className="mt-5 inline-flex h-9 items-center rounded-full bg-[#55a918] px-4 text-xs font-bold text-white">{copy.start} <ArrowRight size={15} className="ml-1.5" /></button></div><div className="absolute -right-8 -top-12 h-72 w-72 rounded-full bg-[#9bda45]/50" /><div className="absolute bottom-[-55px] right-[18%] hidden h-64 w-44 rotate-[-8deg] rounded-[45%] bg-white/80 shadow-xl sm:block"><div className="absolute left-1/2 top-16 -translate-x-1/2 text-center text-2xl font-black leading-none text-[#4c9d16]">MH<br /><span className="text-xs">FASHION</span></div></div><div className="absolute bottom-5 right-6 text-3xl font-black italic text-[#54a817]/80 sm:right-12">{t("account.createMark1")}<br />{t("account.createMark2")}</div></section>
                <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard Icon={ShoppingBag} label={copy.totalOrders} value={String(orders.length)} helper={orders.length ? copy.recentOrders : copy.viewAllOrders} /><StatCard Icon={Star} label={copy.points} value={String(points.total)} helper={points.permanent ? (my ? `သိမ်းထား ${points.permanent} + နေ့စဉ် ${points.daily}` : `${points.permanent} kept + ${points.daily} daily`) : (my ? `နေ့စဉ် ${points.daily}` : `${points.daily} daily`)} tone="yellow" /><StatCard Icon={Wallet} label={copy.wallet} value={formatMoney(12500)} helper={`↑ +${formatMoney(2000)}`} tone="blue" /><StatCard Icon={Heart} label={copy.wishlist} value={String(wishlist.count)} helper={my ? "အားလုံး ကြည့်ရန် →" : "View all →"} tone="red" /></section>
                <div className="grid gap-5 lg:grid-cols-[1.25fr_0.9fr]">
                  <section className="rounded-2xl border border-border bg-bg-surface p-5"><div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-black"><ShoppingBag size={19} className="text-accent" /> {copy.recentOrders}</h2><button onClick={() => setActive("orders")} className="text-xs font-semibold text-accent">{copy.viewAllOrders} <ArrowRight size={13} className="ml-1 inline" /></button></div>{orders.length ? (
                    <div className="space-y-3">{orders.slice(0, 3).map((order) => <AccountOrderCard key={order.id} order={order} formatMoney={formatMoney} />)}</div>
                  ) : (
                    <div data-account-recent-orders-empty className="rounded-xl border border-dashed border-border p-5 text-center">
                      <p className="text-xs text-text-muted">{t("account.ordersEmpty")}</p>
                      <Link href="/products" className="mt-3 inline-flex h-8 items-center rounded-full bg-accent px-4 text-[11px] font-bold text-accent-foreground">{t("actions.browseProducts")}</Link>
                    </div>
                  )}</section>
                  <section className="rounded-2xl border border-border bg-bg-surface p-5"><div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-black"><Star size={19} className="text-accent" /> {copy.rewards}</h2><button onClick={() => setActive("points")} className="text-xs font-semibold text-accent">{copy.viewHistory} <ArrowRight size={13} className="ml-1 inline" /></button></div><div className="flex items-center gap-5"><div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-[10px] border-accent/25 border-l-accent border-t-accent"><div className="text-center"><p data-account-points-total className="text-2xl font-black">{points.total}</p><p className="text-[10px] text-text-muted">{t("account.pointsLabel")}</p></div></div><div><p className="text-xs text-text-muted">{copy.nextReward}</p><p className="mt-1 text-lg font-black text-accent">{nextTierInfo ? (my ? `${nextTierInfo.tier.name} · ${formatMoney(nextTierInfo.remainingKs)} လိုသေးသည်` : `${nextTierInfo.tier.name} · ${formatMoney(nextTierInfo.remainingKs)} to go`) : (my ? `${tier?.name ?? "အဖွဲ့ဝင်"} · ${tier?.discountPercent ?? 0}% လျှော့` : `${tier?.name ?? "Member"} · ${tier?.discountPercent ?? 0}% off`)}</p><p className="mt-2 text-xs leading-relaxed text-text-secondary">{points.expiresAt ? (my ? `နေ့စဉ်အမှတ် ${points.daily} သည် ${formatOrderDate(points.expiresAt)} တွင် သက်တမ်းကုန်မည်။` : `${points.daily} daily points lapse at ${formatOrderDate(points.expiresAt)}.`) : copy.closer}</p></div></div><button onClick={() => setActive("points")} className="mt-5 flex h-9 w-full items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">{copy.explore} <ArrowRight size={14} className="ml-1 inline" /></button></section>
                </div>
                <div className="mt-5 grid gap-5 lg:grid-cols-2"><section className="rounded-2xl border border-border bg-bg-surface p-5"><h2 className="text-lg font-black"><Settings size={18} className="mr-2 inline text-accent" />{copy.accountSettings}</h2><p className="mt-1 text-xs text-text-muted">{copy.manage}</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{[{ Icon: Pencil, label: copy.editProfile }, { Icon: ShieldCheck, label: copy.changePassword }, { Icon: Bell, label: copy.notificationSettings }, { Icon: ShieldCheck, label: copy.privacy }].map(({ Icon, label }) => <button key={label} onClick={() => setActive("settings")} className="flex h-[42px] items-center gap-2 rounded-xl border border-border px-3 text-left text-xs hover:border-accent"><Icon size={16} className="text-accent" /> {label}</button>)}</div></section><section className="rounded-2xl border border-border bg-bg-surface p-5"><h2 className="text-lg font-black"><HelpCircle size={18} className="mr-2 inline text-accent" />{copy.needHelp}</h2><p className="mt-1 text-xs text-text-muted">{copy.support}</p><div className="mt-4 space-y-2">{[{ Icon: HelpCircle, label: copy.faqs }, { Icon: MapPin, label: copy.contact }, { Icon: Bell, label: copy.chat }].map(({ Icon, label }) => <button key={label} className="flex h-[42px] w-full items-center gap-3 rounded-xl border border-border px-3 text-left text-xs hover:border-accent"><Icon size={16} className="text-accent" /> {label}<ChevronRight size={14} className="ml-auto text-text-muted" /></button>)}</div></section></div>
              </>
            ) : (
              <section className="rounded-2xl border border-border bg-bg-surface p-5 sm:p-7">
                <div className="mb-6 flex items-end justify-between border-b border-border pb-5"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent">{t("account.eyebrow")}</p><h1 ref={headingRef} tabIndex={-1} className="mt-2 text-2xl font-black">{sectionLabel(SECTIONS.find((section) => section.id === active) ?? SECTIONS[0])}</h1></div><button onClick={() => setActive("dashboard")} className="text-xs font-semibold text-accent">← {t("account.dashboard")}</button></div>
                {active === "orders" && (orders.length ? (
                  <div data-account-orders>
                    <p className="mb-3 text-xs text-text-muted">{my ? `ဒီစက်မှာ အော်ဒါ ${orders.length} ခု မှာယူထားသည်။` : `${orders.length} ${orders.length === 1 ? "order" : "orders"} placed on this device.`}</p>
                    <div className="space-y-3">{orders.map((order) => <AccountOrderCard key={order.id} order={order} formatMoney={formatMoney} detailed />)}</div>
                  </div>
                ) : (
                  <div data-account-orders-empty className="rounded-xl border border-border p-6 text-center">
                    <p className="text-sm font-semibold">{t("account.ordersNone")}</p>
                    <p className="mx-auto mt-1 max-w-sm text-xs text-text-muted">{t("account.ordersHelp")}</p>
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                      <Link href="/products" className="rounded-full bg-accent px-4 py-2 text-[11px] font-bold text-accent-foreground">{t("actions.browseProducts")}</Link>
                      <Link href="/new" className="rounded-full border border-border px-4 py-2 text-[11px] font-bold">{t("nav.newArrivals")}</Link>
                    </div>
                  </div>
                ))}
                {active === "profile" && <div className="grid max-w-2xl gap-4 sm:grid-cols-2"><label className="text-xs text-text-muted">{copy.fullName}<input defaultValue="Min Thu Aung" className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary" /></label><label className="text-xs text-text-muted">{copy.email}<input defaultValue="minthu.aung@example.com" className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary" /></label><label className="text-xs text-text-muted">{copy.phone}<input defaultValue="+95 9 400 686 925" className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary" /></label><label className="text-xs text-text-muted sm:col-span-2">{copy.address}<textarea rows={3} placeholder={t("account.addressPlaceholder")} className="mt-1 w-full resize-none rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary" /></label><button className="rounded-full bg-accent px-5 py-2 text-xs font-bold text-accent-foreground sm:col-span-2 sm:w-fit">{copy.save}</button></div>}
                {active === "designs" && <div className="grid gap-4 sm:grid-cols-3">{["Chaos Theory remix", "Team jersey #10"].map((name) => <div key={name} className="overflow-hidden rounded-xl border border-border"><div className="flex aspect-square items-center justify-center bg-gradient-to-br from-[#dff1c5] to-[#b7d98d] text-center text-sm font-black text-[#4c9d16]">MH<br />FASHION</div><div className="p-3"><p className="truncate text-xs font-bold">{name}</p><p className="mt-1 text-[10px] text-text-muted">T-shirt · Crew Neck · M</p><div className="mt-3 flex gap-3"><a href="/create" className="text-[10px] font-semibold text-accent">Edit</a><button className="flex items-center gap-1 text-[10px] text-text-muted"><Trash2 size={11} /> Delete</button></div></div></div>)}<a href="/create" className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-border-light text-xs text-text-muted">{copy.newDesign}</a></div>}
                {active === "wishlist" && (
                  wishlist.count ? (
                    <div data-account-wishlist>
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs text-text-muted">{my ? `ဒီစက်မှာ ${wishlist.count} ခု သိမ်းထားသည်။` : `${wishlist.count} ${wishlist.count === 1 ? "item" : "items"} saved on this device.`}</p>
                        <Link href="/wishlist" className="text-xs font-bold text-accent">{t("account.openWishlist")}</Link>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-4">
                        {wishlist.items.map((product) => (
                          <Link key={product.id} href={`/products/${product.slug}`} data-account-wishlist-item={product.id} className="group">
                            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-border bg-bg-surface p-2 text-center text-xs font-black text-[#4c9d16]">
                              {product.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                              ) : (
                                <>MH<br />FASHION</>
                              )}
                            </div>
                            <p className="mt-2 truncate text-xs font-semibold group-hover:text-accent">{product.name}</p>
                            <p className="mt-1 text-[10px] text-text-muted">
                              {formatMoney(product.priceMinKs)}
                              {product.priceMaxKs > product.priceMinKs ? ` – ${formatMoney(product.priceMaxKs)}` : ""}
                            </p>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div data-account-wishlist-empty className="rounded-xl border border-border p-6 text-center">
                      <p className="text-sm font-semibold">{t("account.emptyWishlistTitle")}</p>
                      <p className="mt-1 text-xs text-text-muted">{t("account.wishlistHelp")}</p>
                      <Link href="/products" className="mt-3 inline-flex h-8 items-center rounded-full bg-accent px-4 text-[11px] font-bold text-accent-foreground">{t("actions.browseProducts")}</Link>
                    </div>
                  )
                )}
                {active === "points" && (
                  <div data-account-points className="max-w-2xl space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl border border-border p-5">
                        <p className="text-xs text-text-muted">{copy.daily}</p>
                        <p className="mt-2 text-3xl font-black text-accent">{dailyPoints}</p>
                        <p className="mt-2 text-[10px] leading-relaxed text-text-muted">
                          {my ? `တစ်ရက်လျှင် တစ်ကြိမ် ပေးအပ်သည်၊ မသုံးလိုက်သော နေ့စဉ်အမှတ်များ ${store.loyalty.rules.dailyExpiryHours} နာရီအကြာတွင် သက်တမ်းကုန်သည်။` : `Granted once a day and unused daily points expire after ${store.loyalty.rules.dailyExpiryHours} hours.`}
                          {points.expiresAt ? (my ? ` သင့်တွင် ${points.daily} ရှိပြီး ${formatOrderDate(points.expiresAt)} တွင် သက်တမ်းကုန်မည်။` : ` You have ${points.daily} that lapse at ${formatOrderDate(points.expiresAt)}.`) : ""}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border p-5">
                        <p className="text-xs text-text-muted">{copy.purchase}</p>
                        <p className="mt-2 text-3xl font-black">{points.permanent}</p>
                        <p className="mt-2 text-[10px] leading-relaxed text-text-muted">{my ? `ဝယ်ယူသော ပစ္စည်း တစ်ခုစီအတွက် ${purchasePoints} အမှတ် ရသည်။ သက်တမ်း မကုန်ပါ။` : `Earned ${purchasePoints} points per piece bought. These never expire.`}</p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-border p-5">
                      <p className="text-xs font-bold">{my ? `အဆင့် · ${tier?.name ?? "အဖွဲ့ဝင်"} · ${tier?.discountPercent ?? 0}% လျှော့` : `Tier · ${tier?.name ?? "Member"} · ${tier?.discountPercent ?? 0}% off`}</p>
                      <p className="mt-1 text-[10px] text-text-muted">
                        {my ? `MH Fashion နှင့် စုစုပေါင်း ${formatMoney(spendKs)} သုံးထားသည်။` : `${formatMoney(spendKs)} kept with MH Fashion.`}
                        {nextTierInfo ? (my ? ` ${nextTierInfo.tier.name} သည် ${formatMoney(nextTierInfo.tier.minSpendKs)} မှ စတင်သည်။` : ` ${nextTierInfo.tier.name} starts at ${formatMoney(nextTierInfo.tier.minSpendKs)}.`) : (my ? " ဤအဆင့်သည် အမြင့်ဆုံးဖြစ်သည်။" : " That is the top tier.")}
                      </p>
                      {milestones.length ? (
                        <ul className="mt-3 space-y-1.5">
                          {milestones.map((entry) => (
                            <li key={entry.milestone.id} className="flex items-center justify-between gap-2 text-[11px]">
                              <span className={entry.reached ? "font-semibold text-accent" : "text-text-secondary"}>{entry.reached ? "✓ " : ""}{entry.milestone.label}</span>
                              <span className="shrink-0 text-[10px] text-text-muted">{entry.reached ? (my ? "ရောက်ပြီး" : "Reached") : `${entry.current.toLocaleString("en-US")} / ${entry.target.toLocaleString("en-US")}`}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                    <div className="rounded-xl border border-border p-5">
                      <p className="text-xs font-bold">{t("account.history")}</p>
                      {history.length ? (
                        <ul className="mt-2 divide-y divide-border text-[11px]">
                          {history.map((entry) => (
                            <li key={entry.id} className="flex items-center justify-between gap-2 py-1.5">
                              <span className="min-w-0 text-text-secondary">
                                {entry.kind === "daily" ? (my ? "နေ့စဉ်အမှတ်" : "Daily points") : my ? `ဝယ်ယူသည် ${entry.orderId ?? "အော်ဒါ"}` : `Bought ${entry.orderId ?? "an order"}`}
                                <span className="ml-1 text-text-muted">· {formatOrderDate(entry.at)}</span>
                                {entry.expired ? <span className="ml-1 text-[10px] text-[#a33]">{t("account.expired")}</span> : null}
                              </span>
                              <span className={`shrink-0 font-semibold ${entry.expired ? "text-text-muted line-through" : "text-accent"}`}>+{entry.points}</span>
                            </li>
                          ))}
                        </ul>
                      ) : <p className="mt-1 text-[10px] text-text-muted">{my ? `အမှတ် မရှိသေးပါ။ ဒီစာမျက်နှာကို ပထမဆုံး ဖွင့်တဲ့အခါ နေ့စဉ်အမှတ် ရပါမည်၊ ဝယ်ယူတဲ့ ပစ္စည်း တစ်ခုစီက ${purchasePoints} ထပ်တိုးပါသည်။` : `No points yet. The daily grant lands the first time you open this page, and each bought piece adds ${purchasePoints}.`}</p>}
                    </div>
                  </div>
                )}
                {active === "settings" && <div className="max-w-xl space-y-3"><div className="flex items-center justify-between rounded-xl border border-border p-4"><div><p className="text-sm font-semibold">{t("account.currency")}</p><p className="mt-1 text-xs text-text-muted">{t("account.currencyHelp")}</p></div><button onClick={toggleCurrency} className="rounded-full border border-border-light px-3 py-1 text-xs">{currency}</button></div><div className="flex items-center justify-between rounded-xl border border-border p-4"><div><p className="text-sm font-semibold">{copy.theme}</p><p className="mt-1 text-xs text-text-muted">{t("account.themeHelp")}</p></div><button onClick={toggleTheme} className="rounded-full border border-border-light px-3 py-1 text-xs capitalize">{theme}</button></div><div className="flex items-center justify-between rounded-xl border border-border p-4"><div><p className="text-sm font-semibold">{copy.notifications}</p><p className="mt-1 text-xs text-text-muted">{t("account.notificationsHelp")}</p></div><Check size={18} className="text-accent" /></div></div>}
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
