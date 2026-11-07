"use client";

import { useMemo, useState } from "react";
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

type SectionId = "dashboard" | "profile" | "orders" | "designs" | "wishlist" | "points" | "settings";

type Order = {
  id: string;
  date: string;
  stage: "Delivered" | "Processing" | "Cancelled";
  totalKs: number;
  items: number;
  variant: "white" | "black" | "green";
};

const ORDERS: Order[] = [
  { id: "#MH20250901", date: "Sep 1, 2025", stage: "Delivered", totalKs: 38000, items: 2, variant: "white" },
  { id: "#MH20250825", date: "Aug 25, 2025", stage: "Processing", totalKs: 24000, items: 1, variant: "black" },
  { id: "#MH20250820", date: "Aug 20, 2025", stage: "Cancelled", totalKs: 16000, items: 1, variant: "green" },
];

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
    welcome: "ပြန်လည်ကြိုဆိုပါတယ်! 👋",
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
    support: "ကျွန်ုပ်တို့၏ support team က ကူညီပေးရန် အသင့်ရှိပါတယ်",
    faqs: "မေးလေ့ရှိသောမေးခွန်းများ",
    contact: "ဆက်သွယ်ရန်",
    chat: "Live Chat",
    earn: "အမှတ်များပိုမိုရယူပါ!",
    earnSub: "ဝယ်ယူ၊ မျှဝေ၊ ပျော်ရွှင်ပါ!",
    learn: "ပိုမိုလေ့လာရန်",
    member: "Gold Member",
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

function ProductThumb({ variant }: { variant: Order["variant"] }) {
  const background = variant === "black" ? "from-slate-800 to-slate-950" : variant === "green" ? "from-[#dff1c5] to-[#b7d98d]" : "from-slate-100 to-white";
  return <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${background}`}><span className={`text-[9px] font-black leading-none ${variant === "black" ? "text-white" : "text-[#4c9d16]"}`}>MH<br />FASHION</span></div>;
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
  const formatMoney = (value: number) => `${value.toLocaleString("en-US")} ${currency}`;
  const sectionLabel = (section: (typeof SECTIONS)[number]) => t(section.labelKey) === section.labelKey ? section.fallback : t(section.labelKey);

  const sectionContent = useMemo(() => active, [active]);

  return (
    <main className="min-h-screen bg-bg">
      <Header />
      <div className="w-full px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="mx-auto grid w-full max-w-[1480px] gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="hidden xl:flex xl:flex-col xl:gap-4">
            <div className="rounded-2xl bg-gradient-to-br from-[#69b917] via-[#4a9d0f] to-[#25720b] p-5 text-center text-white shadow-sm"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/70 bg-slate-900 text-xl font-black shadow-lg">MTA</div><h2 className="mt-3 text-lg font-black">Min Thu Aung</h2><p className="text-xs text-white/80">@minthu.aung</p><span className="mt-3 inline-flex rounded-full bg-[#e7b52d] px-3 py-1 text-[10px] font-bold text-[#573600]">♛ {copy.member}</span></div>
            <nav aria-label="Account navigation" className="rounded-2xl border border-border bg-bg-surface p-2">{SECTIONS.map((section) => { const Icon = section.Icon; return <button key={section.id} onClick={() => setActive(section.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-semibold transition-colors ${active === section.id ? "bg-accent/10 text-accent" : "text-text-secondary hover:bg-bg hover:text-text-primary"}`}><Icon size={17} /> {sectionLabel(section)}{section.id === "points" && <span className="ml-auto rounded-full bg-accent px-1.5 py-0.5 text-[9px] text-accent-foreground">250</span>}</button>; })}<div className="my-2 border-t border-border" /><button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-xs font-semibold text-text-secondary hover:bg-bg"><LogOut size={17} /> {t("account.signOut")}</button></nav>
            <div className="rounded-2xl bg-gradient-to-b from-[#efffdc] to-[#d9f4bd] p-5 text-center text-[#18350d]"><Sparkles size={25} className="mx-auto text-[#6eae18]" /><h3 className="mt-3 text-base font-black">{copy.earn}</h3><p className="mt-2 text-[10px]">{copy.earnSub}</p><button className="mt-4 rounded-full bg-[#54a817] px-4 py-2 text-[10px] font-bold text-white">{copy.learn} <ArrowRight size={12} className="ml-1 inline" /></button></div>
          </aside>

          <div className="min-w-0">
            {sectionContent === "dashboard" ? (
              <>
                <section className="relative isolate mb-5 min-h-[205px] overflow-hidden rounded-2xl bg-gradient-to-r from-[#efffdb] via-[#e0f7c4] to-[#c4ee9c] px-6 py-7 text-[#172810] sm:px-9 sm:py-9"><div className="relative z-10 max-w-[58%]"><h1 className="text-3xl font-black leading-tight sm:text-4xl">{copy.welcome}</h1><p className="mt-3 text-sm text-[#355128]">{copy.welcomeSub}</p><button onClick={() => window.location.href = "/create"} className="mt-5 inline-flex items-center rounded-full bg-[#55a918] px-4 py-2.5 text-xs font-bold text-white">{copy.start} <ArrowRight size={15} className="ml-1.5" /></button></div><div className="absolute -right-8 -top-12 h-72 w-72 rounded-full bg-[#9bda45]/50" /><div className="absolute bottom-[-55px] right-[18%] hidden h-64 w-44 rotate-[-8deg] rounded-[45%] bg-white/80 shadow-xl sm:block"><div className="absolute left-1/2 top-16 -translate-x-1/2 text-center text-2xl font-black leading-none text-[#4c9d16]">MH<br /><span className="text-xs">FASHION</span></div></div><div className="absolute bottom-5 right-6 text-3xl font-black italic text-[#54a817]/80 sm:right-12">Create<br />Your Style</div></section>
                <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard Icon={ShoppingBag} label={copy.totalOrders} value="12" helper={`↑ +2 ${copy.thisMonth}`} /><StatCard Icon={Star} label={copy.points} value="250" helper={`↑ +50 ${copy.thisMonth}`} tone="yellow" /><StatCard Icon={Wallet} label={copy.wallet} value={formatMoney(12500)} helper={`↑ +${formatMoney(2000)}`} tone="blue" /><StatCard Icon={Heart} label={copy.wishlist} value="8" helper="View all →" tone="red" /></section>
                <div className="grid gap-5 lg:grid-cols-[1.25fr_0.9fr]">
                  <section className="rounded-2xl border border-border bg-bg-surface p-5"><div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-black"><ShoppingBag size={19} className="text-accent" /> {copy.recentOrders}</h2><button onClick={() => setActive("orders")} className="text-xs font-semibold text-accent">{copy.viewAllOrders} <ArrowRight size={13} className="ml-1 inline" /></button></div><div className="space-y-3">{ORDERS.map((order) => <div key={order.id} className="flex items-center gap-3 rounded-xl border border-border p-2.5"><ProductThumb variant={order.variant} /><div className="min-w-0 flex-1"><p className="text-xs font-bold">Order {order.id}</p><p className="mt-1 text-[10px] text-text-muted">{order.date} · {order.items} {order.items === 1 ? "item" : "items"}</p></div><span className={`hidden rounded-full px-2.5 py-1 text-[10px] font-bold sm:inline-flex ${order.stage === "Delivered" ? "bg-[#e4f6d0] text-[#4e9917]" : order.stage === "Processing" ? "bg-[#e6f1ff] text-[#3d7cc1]" : "bg-bg text-text-secondary"}`}>{order.stage}</span><div className="text-right"><p className="text-xs font-black">{formatMoney(order.totalKs)}</p><button onClick={() => setActive("orders")} className="mt-1 text-[10px] font-semibold text-accent">{copy.viewDetails} <ChevronRight size={12} className="inline" /></button></div></div>)}</div></section>
                  <section className="rounded-2xl border border-border bg-bg-surface p-5"><div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-black"><Star size={19} className="text-accent" /> {copy.rewards}</h2><button onClick={() => setActive("points")} className="text-xs font-semibold text-accent">{copy.viewHistory} <ArrowRight size={13} className="ml-1 inline" /></button></div><div className="flex items-center gap-5"><div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-[10px] border-accent/25 border-l-accent border-t-accent"><div className="text-center"><p className="text-2xl font-black">250</p><p className="text-[10px] text-text-muted">Points</p></div></div><div><p className="text-xs text-text-muted">{copy.nextReward}</p><p className="mt-1 text-lg font-black text-accent">{copy.pointsNeeded}</p><p className="mt-2 text-xs leading-relaxed text-text-secondary">{copy.closer}</p></div></div><button onClick={() => setActive("points")} className="mt-5 w-full rounded-full bg-accent py-2.5 text-xs font-bold text-accent-foreground">{copy.explore} <ArrowRight size={14} className="ml-1 inline" /></button></section>
                </div>
                <div className="mt-5 grid gap-5 lg:grid-cols-2"><section className="rounded-2xl border border-border bg-bg-surface p-5"><h2 className="text-lg font-black"><Settings size={18} className="mr-2 inline text-accent" />{copy.accountSettings}</h2><p className="mt-1 text-xs text-text-muted">{copy.manage}</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{[{ Icon: Pencil, label: copy.editProfile }, { Icon: ShieldCheck, label: copy.changePassword }, { Icon: Bell, label: copy.notificationSettings }, { Icon: ShieldCheck, label: copy.privacy }].map(({ Icon, label }) => <button key={label} onClick={() => setActive("settings")} className="flex items-center gap-2 rounded-xl border border-border px-3 py-3 text-left text-xs hover:border-accent"><Icon size={16} className="text-accent" /> {label}</button>)}</div></section><section className="rounded-2xl border border-border bg-bg-surface p-5"><h2 className="text-lg font-black"><HelpCircle size={18} className="mr-2 inline text-accent" />{copy.needHelp}</h2><p className="mt-1 text-xs text-text-muted">{copy.support}</p><div className="mt-4 space-y-2">{[{ Icon: HelpCircle, label: copy.faqs }, { Icon: MapPin, label: copy.contact }, { Icon: Bell, label: copy.chat }].map(({ Icon, label }) => <button key={label} className="flex w-full items-center gap-3 rounded-xl border border-border px-3 py-3 text-left text-xs hover:border-accent"><Icon size={16} className="text-accent" /> {label}<ChevronRight size={14} className="ml-auto text-text-muted" /></button>)}</div></section></div>
              </>
            ) : (
              <section className="rounded-2xl border border-border bg-bg-surface p-5 sm:p-7">
                <div className="mb-6 flex items-end justify-between border-b border-border pb-5"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent">MH Fashion Account</p><h1 className="mt-2 text-2xl font-black">{sectionLabel(SECTIONS.find((section) => section.id === active) ?? SECTIONS[0])}</h1></div><button onClick={() => setActive("dashboard")} className="text-xs font-semibold text-accent">← Dashboard</button></div>
                {active === "orders" && <div className="space-y-3">{ORDERS.map((order) => <div key={order.id} className="flex items-center gap-3 rounded-xl border border-border p-3"><ProductThumb variant={order.variant} /><div className="flex-1"><p className="text-sm font-bold">Order {order.id}</p><p className="mt-1 text-xs text-text-muted">{order.date} · {order.items} items</p></div><span className="hidden rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent sm:block">{order.stage}</span><p className="text-sm font-black">{formatMoney(order.totalKs)}</p></div>)}</div>}
                {active === "profile" && <div className="grid max-w-2xl gap-4 sm:grid-cols-2"><label className="text-xs text-text-muted">{copy.fullName}<input defaultValue="Min Thu Aung" className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary" /></label><label className="text-xs text-text-muted">{copy.email}<input defaultValue="minthu.aung@example.com" className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary" /></label><label className="text-xs text-text-muted">{copy.phone}<input defaultValue="+95 9 400 686 925" className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary" /></label><label className="text-xs text-text-muted sm:col-span-2">{copy.address}<textarea rows={3} placeholder="Street, township, city, country" className="mt-1 w-full resize-none rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary" /></label><button className="rounded-full bg-accent px-5 py-2 text-xs font-bold text-accent-foreground sm:col-span-2 sm:w-fit">{copy.save}</button></div>}
                {active === "designs" && <div className="grid gap-4 sm:grid-cols-3">{["Chaos Theory remix", "Team jersey #10"].map((name) => <div key={name} className="overflow-hidden rounded-xl border border-border"><div className="flex aspect-square items-center justify-center bg-gradient-to-br from-[#dff1c5] to-[#b7d98d] text-center text-sm font-black text-[#4c9d16]">MH<br />FASHION</div><div className="p-3"><p className="truncate text-xs font-bold">{name}</p><p className="mt-1 text-[10px] text-text-muted">T-shirt · Crew Neck · M</p><div className="mt-3 flex gap-3"><a href="/create" className="text-[10px] font-semibold text-accent">Edit</a><button className="flex items-center gap-1 text-[10px] text-text-muted"><Trash2 size={11} /> Delete</button></div></div></div>)}<a href="/create" className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-border-light text-xs text-text-muted">{copy.newDesign}</a></div>}
                {active === "wishlist" && <div className="grid gap-4 sm:grid-cols-4">{["Butterfly Effect", "Void Tee"].map((name, index) => <div key={name}><div className="flex aspect-square items-center justify-center rounded-xl bg-gradient-to-br from-[#eaf8d7] to-[#cbeaa9] text-center text-xs font-black text-[#4c9d16]">MH<br />FASHION</div><p className="mt-2 text-xs font-semibold">{name}</p><p className="mt-1 text-[10px] text-text-muted">{formatMoney(index ? 25000 : 21000)}</p></div>)}</div>}
                {active === "points" && <div className="grid max-w-2xl gap-4 sm:grid-cols-2"><div className="rounded-xl border border-border p-5"><p className="text-xs text-text-muted">{copy.daily}</p><p className="mt-2 text-3xl font-black text-accent">300</p><p className="mt-2 text-[10px] leading-relaxed text-text-muted">Granted every day. Unused daily points expire at the end of the day.</p></div><div className="rounded-xl border border-border p-5"><p className="text-xs text-text-muted">{copy.purchase}</p><p className="mt-2 text-3xl font-black">150</p><p className="mt-2 text-[10px] leading-relaxed text-text-muted">Earned 50 points per product purchased. These never expire.</p></div></div>}
                {active === "settings" && <div className="max-w-xl space-y-3"><div className="flex items-center justify-between rounded-xl border border-border p-4"><div><p className="text-sm font-semibold">Currency</p><p className="mt-1 text-xs text-text-muted">Prices are shown in this currency across the site.</p></div><button onClick={toggleCurrency} className="rounded-full border border-border-light px-3 py-1 text-xs">{currency}</button></div><div className="flex items-center justify-between rounded-xl border border-border p-4"><div><p className="text-sm font-semibold">{copy.theme}</p><p className="mt-1 text-xs text-text-muted">Switch between dark and light appearance.</p></div><button onClick={toggleTheme} className="rounded-full border border-border-light px-3 py-1 text-xs capitalize">{theme}</button></div><div className="flex items-center justify-between rounded-xl border border-border p-4"><div><p className="text-sm font-semibold">{copy.notifications}</p><p className="mt-1 text-xs text-text-muted">In-app notifications are always on.</p></div><Check size={18} className="text-accent" /></div></div>}
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
