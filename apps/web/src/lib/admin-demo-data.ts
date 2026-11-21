"use client";

import type { SheetPriceRow } from "@/lib/sheet-prices";

// Browser-local demo data for the Super Admin workspace. Nothing here is a security boundary
// or live store data: the plan requires the admin UI to stay preview-only until Supabase Auth,
// RLS and server-side role checks replace the demo session. Every module reads and writes this
// one store so the dashboard, orders, stock and reports cannot disagree with each other.

export const ADMIN_DEMO_DATA_KEY = "mh-fashion-admin-demo-data-v1";

export type AdminModuleId =
  | "dashboard"
  | "orders"
  | "products"
  | "designs"
  | "posts"
  | "customers"
  | "inventory"
  | "promotions"
  | "reports"
  | "settings";

export const ADMIN_ORDER_STAGES = [
  "Pending Payment",
  "Confirmed",
  "Processing",
  "Printing",
  "Ready to Ship",
  "Handed to Delivery",
  "Out for Delivery",
  "Delivered",
] as const;

export type AdminOrderStage = (typeof ADMIN_ORDER_STAGES)[number] | "Cancelled" | "Refunded";
export type AdminPaymentMethod = "KBZPay" | "WavePay" | "AYAPay" | "Cash on Delivery";
export type AdminProductCategory = "T-Shirt" | "Hoodie" | "Polo" | "Jersey" | "Cap" | "Accessory";
export type AdminProductStatus = "Active" | "Draft" | "Archived";
export type AdminDesignStatus = "Published" | "Draft" | "Hidden";
export type AdminPromotionKind = "percent" | "amount";
export type AdminPromotionStatus = "Active" | "Scheduled" | "Expired" | "Used up" | "Disabled";
export type AdminTeamRole = "Super Admin" | "Post Admin" | "Print Admin" | "Support";

export type AdminOrderItem = {
  productId: string;
  name: string;
  size: string;
  color: string;
  quantity: number;
  unitPriceKs: number;
};

export type AdminOrder = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: AdminOrderItem[];
  stage: AdminOrderStage;
  payment: AdminPaymentMethod;
  placedAt: string;
  note: string;
};

export type AdminProduct = {
  id: string;
  name: string;
  category: AdminProductCategory;
  fabric: string;
  gsm: number | null;
  priceKs: number;
  sizes: string[];
  status: AdminProductStatus;
};

export type AdminDesign = {
  id: string;
  name: string;
  author: string;
  product: string;
  createdAt: string;
  status: AdminDesignStatus;
  downloads: number;
};

export type AdminPostStatus = "Draft" | "Published";

export type AdminPostSvg = {
  url: string;
  fileName: string;
  sizeBytes: number;
};

export type AdminTshirtPost = {
  id: string;
  title: string;
  description: string;
  svg: AdminPostSvg | null;
  attributes: AdminTshirtPostAttribute[];
  prices: AdminTshirtPostPriceRow[];
  status: AdminPostStatus;
  createdAt: string;
  publishedAt: string | null;
};

export type AdminPromotion = {
  id: string;
  code: string;
  kind: AdminPromotionKind;
  value: number;
  minSpendKs: number;
  usageLimit: number;
  used: number;
  startsAt: string;
  endsAt: string;
  enabled: boolean;
};

export type AdminTeamMember = {
  id: string;
  name: string;
  email: string;
  role: AdminTeamRole;
  modules: AdminModuleId[];
  active: boolean;
};

export type AdminSettings = {
  storeName: string;
  supportEmail: string;
  supportPhone: string;
  usdRateKs: number;
  lowStockThreshold: number;
  freeDeliveryThresholdKs: number;
  orderNoteTemplate: string;
};

export type AdminDemoData = {
  version: 1;
  orders: AdminOrder[];
  products: AdminProduct[];
  stock: Record<string, Record<string, number>>;
  designs: AdminDesign[];
  tshirtPosts: AdminTshirtPost[];
  promotions: AdminPromotion[];
  team: AdminTeamMember[];
  settings: AdminSettings;
};

export const ADMIN_MODULES: { id: AdminModuleId; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "orders", label: "Orders" },
  { id: "products", label: "Products" },
  { id: "designs", label: "Designs" },
  { id: "posts", label: "Posts" },
  { id: "customers", label: "Customers" },
  { id: "inventory", label: "Inventory" },
  { id: "promotions", label: "Promotions" },
  { id: "reports", label: "Reports" },
  { id: "settings", label: "Settings" },
];

export const APPAREL_CATEGORIES: AdminProductCategory[] = ["T-Shirt", "Hoodie", "Polo", "Jersey"];
export const APPAREL_SIZES = ["S", "M", "L", "XL", "2XL"];
export const ONE_SIZE = ["One size"];

const DAY_MS = 24 * 60 * 60 * 1000;

export function formatKs(value: number) {
  return `Ks ${Math.round(value).toLocaleString("en-US")}`;
}

export function formatAdminDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatAdminDateTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function makeAdminId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

// ---------------------------------------------------------------- orders

export function orderTotalKs(order: AdminOrder) {
  return order.items.reduce((total, item) => total + item.unitPriceKs * item.quantity, 0);
}

export function orderUnits(order: AdminOrder) {
  return order.items.reduce((total, item) => total + item.quantity, 0);
}

export function nextOrderStage(stage: AdminOrderStage): AdminOrderStage | null {
  const index = ADMIN_ORDER_STAGES.indexOf(stage as (typeof ADMIN_ORDER_STAGES)[number]);
  if (index < 0 || index === ADMIN_ORDER_STAGES.length - 1) return null;
  return ADMIN_ORDER_STAGES[index + 1];
}

export function orderStageIndex(stage: AdminOrderStage) {
  return ADMIN_ORDER_STAGES.indexOf(stage as (typeof ADMIN_ORDER_STAGES)[number]);
}

export function isSettledOrder(order: AdminOrder) {
  return order.stage === "Cancelled" || order.stage === "Refunded";
}

export function setOrderStage(data: AdminDemoData, orderId: string, stage: AdminOrderStage): AdminDemoData {
  return {
    ...data,
    orders: data.orders.map((order) => (order.id === orderId ? { ...order, stage } : order)),
  };
}

export function setOrderNote(data: AdminDemoData, orderId: string, note: string): AdminDemoData {
  return {
    ...data,
    orders: data.orders.map((order) => (order.id === orderId ? { ...order, note: note.trim() } : order)),
  };
}

export type AdminOrderSummary = {
  count: number;
  units: number;
  revenueKs: number;
  averageOrderKs: number;
  byStage: Record<AdminOrderStage, number>;
};

export function summarizeOrders(orders: AdminOrder[]): AdminOrderSummary {
  const byStage = Object.fromEntries(
    [...ADMIN_ORDER_STAGES, "Cancelled", "Refunded"].map((stage) => [stage, 0]),
  ) as Record<AdminOrderStage, number>;
  let units = 0;
  let revenueKs = 0;
  for (const order of orders) {
    byStage[order.stage] += 1;
    units += orderUnits(order);
    if (!isSettledOrder(order)) revenueKs += orderTotalKs(order);
  }
  return {
    count: orders.length,
    units,
    revenueKs,
    averageOrderKs: orders.length ? Math.round(revenueKs / orders.length) : 0,
    byStage,
  };
}

// Orders are filed by the admin's local day, not the UTC day: an order placed at 00:30 in
// Yangon belongs to that morning's sheet, and UTC keys put it on yesterday.
export function adminDayKey(value: string | number | Date): string {
  const date = new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// Wrapped so screens can read "today" without calling Date.now() during render.
export function adminTodayKey() {
  return adminDayKey(Date.now());
}

export function adminDayLabel(dayKey: string, now = Date.now()) {
  if (!dayKey) return "";
  const today = adminDayKey(now);
  if (dayKey === today) return "Today";
  const yesterday = adminDayKey(now - DAY_MS);
  if (dayKey === yesterday) return "Yesterday";
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export const ADMIN_ORDER_DATE_PRESETS = ["Today", "Last 7 days", "Last 30 days", "All"] as const;
export type AdminOrderDatePreset = (typeof ADMIN_ORDER_DATE_PRESETS)[number];
export type AdminDateRange = { from: string; to: string };

// An empty bound is open-ended, so a hand-typed range can be one-sided.
export function orderDateRangeForPreset(preset: AdminOrderDatePreset, now = Date.now()): AdminDateRange {
  if (preset === "All") return { from: "", to: "" };
  const today = adminDayKey(now);
  if (preset === "Today") return { from: today, to: today };
  const span = preset === "Last 7 days" ? 7 : 30;
  return { from: adminDayKey(now - (span - 1) * DAY_MS), to: today };
}

export function ordersInDateRange(orders: AdminOrder[], range: AdminDateRange): AdminOrder[] {
  return orders.filter((order) => {
    const key = adminDayKey(order.placedAt);
    if (range.from && key < range.from) return false;
    if (range.to && key > range.to) return false;
    return true;
  });
}

export type AdminOrderDayGroup = {
  key: string;
  label: string;
  count: number;
  units: number;
  revenueKs: number;
};

export function orderDayGroups(orders: AdminOrder[], now = Date.now()): AdminOrderDayGroup[] {
  const groups = new Map<string, AdminOrderDayGroup>();
  for (const order of orders) {
    const key = adminDayKey(order.placedAt);
    const entry = groups.get(key) ?? { key, label: adminDayLabel(key, now), count: 0, units: 0, revenueKs: 0 };
    entry.count += 1;
    entry.units += orderUnits(order);
    if (!isSettledOrder(order)) entry.revenueKs += orderTotalKs(order);
    groups.set(key, entry);
  }
  return [...groups.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
}

export const ADMIN_ORDER_SORTS = ["Newest first", "Oldest first", "Highest total", "Lowest total"] as const;
export type AdminOrderSort = (typeof ADMIN_ORDER_SORTS)[number];

export function sortOrders(orders: AdminOrder[], sort: AdminOrderSort): AdminOrder[] {
  const placed = (order: AdminOrder) => new Date(order.placedAt).getTime();
  const sorted = [...orders];
  if (sort === "Newest first") sorted.sort((a, b) => placed(b) - placed(a));
  if (sort === "Oldest first") sorted.sort((a, b) => placed(a) - placed(b));
  if (sort === "Highest total") sorted.sort((a, b) => orderTotalKs(b) - orderTotalKs(a));
  if (sort === "Lowest total") sorted.sort((a, b) => orderTotalKs(a) - orderTotalKs(b));
  return sorted;
}

export function revenueByDay(orders: AdminOrder[], days: number, now = Date.now()) {
  const buckets: { date: string; label: string; revenueKs: number; orders: number }[] = [];
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(start.getTime() - offset * DAY_MS);
    buckets.push({
      date: adminDayKey(date),
      label: date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
      revenueKs: 0,
      orders: 0,
    });
  }
  const index = new Map(buckets.map((bucket, position) => [bucket.date, position]));
  for (const order of orders) {
    const key = adminDayKey(order.placedAt);
    const position = index.get(key);
    if (position === undefined) continue;
    buckets[position].orders += 1;
    if (!isSettledOrder(order)) buckets[position].revenueKs += orderTotalKs(order);
  }
  return buckets;
}

export function topProducts(orders: AdminOrder[], limit = 5) {
  const totals = new Map<string, { name: string; units: number; revenueKs: number }>();
  for (const order of orders) {
    if (isSettledOrder(order)) continue;
    for (const item of order.items) {
      const entry = totals.get(item.name) ?? { name: item.name, units: 0, revenueKs: 0 };
      entry.units += item.quantity;
      entry.revenueKs += item.quantity * item.unitPriceKs;
      totals.set(item.name, entry);
    }
  }
  return [...totals.values()].sort((a, b) => b.units - a.units).slice(0, limit);
}

export function paymentSplit(orders: AdminOrder[]) {
  const totals = new Map<AdminPaymentMethod, { orders: number; revenueKs: number }>();
  for (const order of orders) {
    const entry = totals.get(order.payment) ?? { orders: 0, revenueKs: 0 };
    entry.orders += 1;
    if (!isSettledOrder(order)) entry.revenueKs += orderTotalKs(order);
    totals.set(order.payment, entry);
  }
  return [...totals.entries()]
    .map(([method, value]) => ({ method, ...value }))
    .sort((a, b) => b.revenueKs - a.revenueKs);
}

// ---------------------------------------------------------------- customers

export type AdminCustomer = {
  email: string;
  name: string;
  phone: string;
  orders: number;
  units: number;
  spendKs: number;
  lastOrderAt: string;
};

export function aggregateCustomers(orders: AdminOrder[]): AdminCustomer[] {
  const customers = new Map<string, AdminCustomer>();
  for (const order of orders) {
    const entry = customers.get(order.customerEmail) ?? {
      email: order.customerEmail,
      name: order.customerName,
      phone: order.customerPhone,
      orders: 0,
      units: 0,
      spendKs: 0,
      lastOrderAt: order.placedAt,
    };
    entry.orders += 1;
    entry.units += orderUnits(order);
    if (!isSettledOrder(order)) entry.spendKs += orderTotalKs(order);
    if (new Date(order.placedAt).getTime() > new Date(entry.lastOrderAt).getTime()) {
      entry.lastOrderAt = order.placedAt;
      entry.name = order.customerName;
      entry.phone = order.customerPhone;
    }
    customers.set(order.customerEmail, entry);
  }
  return [...customers.values()].sort((a, b) => b.spendKs - a.spendKs);
}

// ---------------------------------------------------------------- stock

export function stockQuantity(data: AdminDemoData, productId: string, size: string) {
  return data.stock[productId]?.[size] ?? 0;
}

export function adjustStock(data: AdminDemoData, productId: string, size: string, delta: number): AdminDemoData {
  const current = stockQuantity(data, productId, size);
  const next = Math.max(0, Math.min(99999, current + delta));
  return {
    ...data,
    stock: {
      ...data.stock,
      [productId]: { ...(data.stock[productId] ?? {}), [size]: next },
    },
  };
}

export function setStockQuantity(data: AdminDemoData, productId: string, size: string, quantity: number): AdminDemoData {
  return adjustStock(data, productId, size, Math.round(quantity) - stockQuantity(data, productId, size));
}

export type AdminStockRow = {
  productId: string;
  product: string;
  category: AdminProductCategory;
  size: string;
  quantity: number;
  low: boolean;
  out: boolean;
};

export function stockRows(data: AdminDemoData): AdminStockRow[] {
  const threshold = data.settings.lowStockThreshold;
  return data.products.flatMap((product) => product.sizes.map((size) => {
    const quantity = stockQuantity(data, product.id, size);
    return {
      productId: product.id,
      product: product.name,
      category: product.category,
      size,
      quantity,
      low: quantity > 0 && quantity <= threshold,
      out: quantity === 0,
    };
  }));
}

export function stockSummary(data: AdminDemoData) {
  const rows = stockRows(data);
  return {
    units: rows.reduce((total, row) => total + row.quantity, 0),
    skus: rows.length,
    low: rows.filter((row) => row.low).length,
    out: rows.filter((row) => row.out).length,
  };
}

// ---------------------------------------------------------------- products

export type AdminProductDraft = {
  name: string;
  category: AdminProductCategory;
  fabric: string;
  gsm: string;
  priceKs: string;
  status: AdminProductStatus;
};

export function productDraftFrom(product?: AdminProduct): AdminProductDraft {
  return {
    name: product?.name ?? "",
    category: product?.category ?? "T-Shirt",
    fabric: product?.fabric ?? "",
    gsm: product?.gsm === null || product?.gsm === undefined ? "" : String(product.gsm),
    priceKs: product ? String(product.priceKs) : "",
    status: product?.status ?? "Draft",
  };
}

export function validateProductDraft(draft: AdminProductDraft): string[] {
  const errors: string[] = [];
  if (!draft.name.trim()) errors.push("Product name is required.");
  if (draft.name.trim().length > 60) errors.push("Product name must stay under 60 characters.");
  if (!draft.fabric.trim()) errors.push("Fabric is required.");
  const price = Number(draft.priceKs);
  if (!Number.isFinite(price) || price <= 0) errors.push("Price must be greater than zero.");
  if (price > 10000000) errors.push("Price must stay under Ks 10,000,000.");
  if (APPAREL_CATEGORIES.includes(draft.category)) {
    const gsm = Number(draft.gsm);
    if (!Number.isFinite(gsm) || gsm <= 0) errors.push("Apparel needs a GSM value.");
  }
  return errors;
}

export function productFromDraft(draft: AdminProductDraft, existing?: AdminProduct): AdminProduct {
  const apparel = APPAREL_CATEGORIES.includes(draft.category);
  const gsm = Number(draft.gsm);
  return {
    id: existing?.id ?? makeAdminId("product"),
    name: draft.name.trim(),
    category: draft.category,
    fabric: draft.fabric.trim(),
    gsm: apparel && Number.isFinite(gsm) && gsm > 0 ? gsm : null,
    priceKs: Math.round(Number(draft.priceKs)),
    sizes: apparel ? APPAREL_SIZES : ONE_SIZE,
    status: draft.status,
  };
}

export function upsertProduct(data: AdminDemoData, product: AdminProduct): AdminDemoData {
  const exists = data.products.some((item) => item.id === product.id);
  const products = exists
    ? data.products.map((item) => (item.id === product.id ? product : item))
    : [...data.products, product];
  const stock = data.stock[product.id]
    ? data.stock
    : {
        ...data.stock,
        [product.id]: Object.fromEntries(product.sizes.map((size) => [size, 0])),
      };
  return { ...data, products, stock };
}

export function removeProduct(data: AdminDemoData, productId: string): AdminDemoData {
  const stock = { ...data.stock };
  delete stock[productId];
  return { ...data, products: data.products.filter((product) => product.id !== productId), stock };
}

// ---------------------------------------------------------------- t-shirt posts

// Price depends on the whole attribute combination, not on size alone: an XL in cotton
// with DTF is not the same price as an XL in premium cotton with sublimation. A post
// therefore ticks the attributes and options it sells and then carries one price per
// combination. Combinations without a row are simply not offered.

export type AdminTshirtPostAttributeKey =
  | "size"
  | "material"
  | "fit"
  | "color"
  | "sleeve"
  | "gsm"
  | "cutting"
  | "print";

export type AdminTshirtPostAttribute = {
  key: AdminTshirtPostAttributeKey;
  label: string;
  options: string[];
};

export const TSHIRT_POST_ATTRIBUTES: AdminTshirtPostAttribute[] = [
  { key: "size", label: "Size", options: ["S", "M", "L", "XL", "2XL"] },
  { key: "material", label: "Material", options: ["Cotton", "Premium Cotton", "Polyester", "Blend"] },
  { key: "fit", label: "Fit Type", options: ["Regular", "Oversized", "Slim"] },
  { key: "color", label: "Colour", options: ["Black", "White", "Green", "Sand", "Red", "Navy"] },
  { key: "sleeve", label: "Sleeve", options: ["Short Sleeve", "Long Sleeve"] },
  { key: "gsm", label: "GSM", options: ["160 GSM", "180 GSM", "200 GSM", "240 GSM"] },
  { key: "cutting", label: "Cutting", options: ["Standard", "Raw Edge", "Raglan"] },
  { key: "print", label: "Print", options: ["DTF", "Sublimation", "Screen Print"] },
];

export function tshirtAttributeLabel(key: AdminTshirtPostAttributeKey) {
  return TSHIRT_POST_ATTRIBUTES.find((attribute) => attribute.key === key)?.label ?? key;
}

export type AdminTshirtPostPriceRow = {
  id: string;
  options: Partial<Record<AdminTshirtPostAttributeKey, string>>;
  priceKs: number;
};

export type AdminTshirtPostDraftPriceRow = {
  id: string;
  options: Partial<Record<AdminTshirtPostAttributeKey, string>>;
  priceKs: string;
};

export type AdminTshirtPostDraftAttribute = AdminTshirtPostAttribute & { enabled: boolean };

export type AdminTshirtPostDraft = {
  title: string;
  description: string;
  svg: AdminPostSvg | null;
  attributes: AdminTshirtPostDraftAttribute[];
  prices: AdminTshirtPostDraftPriceRow[];
  status: AdminPostStatus;
};

// A new post starts with the four attributes that almost every drop varies; the rest
// (sleeve, GSM, cutting, print) are one tick away when a drop needs them.
const DEFAULT_TSHIRT_DRAFT_ATTRIBUTES: AdminTshirtPostAttributeKey[] = ["size", "material", "fit", "color"];

export function tshirtPostDraftFrom(post?: AdminTshirtPost): AdminTshirtPostDraft {
  return {
    title: post?.title ?? "",
    description: post?.description ?? "",
    svg: post?.svg ?? null,
    attributes: TSHIRT_POST_ATTRIBUTES.map((attribute) => {
      const saved = post?.attributes.find((entry) => entry.key === attribute.key);
      return {
        key: attribute.key,
        label: attribute.label,
        options: saved ? [...saved.options] : [...attribute.options],
        enabled: saved ? saved.options.length > 0 : DEFAULT_TSHIRT_DRAFT_ATTRIBUTES.includes(attribute.key),
      };
    }),
    prices: (post?.prices ?? []).map((row) => ({ id: row.id, options: { ...row.options }, priceKs: String(row.priceKs) })),
    status: post?.status ?? "Draft",
  };
}

export function tshirtDraftAttributes(draft: AdminTshirtPostDraft) {
  return draft.attributes.filter((attribute) => attribute.enabled && attribute.options.length > 0);
}

export function tshirtCombinationKey(
  attributes: AdminTshirtPostAttribute[],
  options: Partial<Record<AdminTshirtPostAttributeKey, string>>,
) {
  return attributes.map((attribute) => `${attribute.key}=${options[attribute.key] ?? ""}`).join("|");
}

export function tshirtCombinationLabel(
  attributes: AdminTshirtPostAttribute[],
  options: Partial<Record<AdminTshirtPostAttributeKey, string>>,
) {
  return attributes.map((attribute) => options[attribute.key] ?? "—").join(" · ");
}

export function emptyTshirtPriceRow(attributes: AdminTshirtPostAttribute[]): AdminTshirtPostDraftPriceRow {
  return {
    id: makeAdminId("price"),
    options: Object.fromEntries(attributes.map((attribute) => [attribute.key, attribute.options[0]])),
    priceKs: "",
  };
}

// A Google Sheet defines the sold combinations: the columns it carries become the enabled
// attributes, the values become their options, and each priced line becomes one price row.
// An enabled attribute with no column cannot be priced from the sheet, so it is switched off
// rather than leaving rows that can never be complete.
export function mergeSheetPriceRows(
  attributes: AdminTshirtPostDraftAttribute[],
  rows: SheetPriceRow[],
): { attributes: AdminTshirtPostDraftAttribute[]; prices: AdminTshirtPostDraftPriceRow[]; issues: string[] } {
  const issues: string[] = [];
  const sheetColumns = new Set<AdminTshirtPostAttributeKey>();
  for (const row of rows) {
    for (const key of Object.keys(row.options) as AdminTshirtPostAttributeKey[]) {
      if (row.options[key]) sheetColumns.add(key);
    }
  }

  const nextAttributes = attributes.map((attribute) => {
    if (!sheetColumns.has(attribute.key)) {
      if (attribute.enabled) issues.push(`${attribute.label} has no column in the sheet, so it was switched off.`);
      return { ...attribute, enabled: false };
    }
    const values = [...new Set(rows.map((row) => row.options[attribute.key]).filter((value): value is string => Boolean(value)))];
    const options = [...attribute.options.filter((option) => values.includes(option)), ...values.filter((value) => !attribute.options.includes(value))];
    return { ...attribute, enabled: true, options };
  });

  const enabled = nextAttributes.filter((attribute) => attribute.enabled && attribute.options.length > 0);
  const prices = rows.map((row) => ({
    id: makeAdminId("price"),
    options: Object.fromEntries(enabled.map((attribute) => [attribute.key, row.options[attribute.key] ?? attribute.options[0]])),
    priceKs: row.priceKs,
  }));

  return { attributes: nextAttributes, prices, issues };
}

// Keeping rows complete as the admin ticks options on and off: a value that is no longer
// offered falls back to the first option still on the attribute.
export function reconcileTshirtPriceRows(
  attributes: AdminTshirtPostAttribute[],
  rows: AdminTshirtPostDraftPriceRow[],
): AdminTshirtPostDraftPriceRow[] {
  return rows.map((row) => {
    const options: Partial<Record<AdminTshirtPostAttributeKey, string>> = {};
    for (const attribute of attributes) {
      const current = row.options[attribute.key];
      options[attribute.key] = current && attribute.options.includes(current) ? current : attribute.options[0];
    }
    return { ...row, options };
  });
}

function postPriceError(value: string) {
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0) return "Prices must be zero or more.";
  if (price > 10000000) return "Prices must stay under Ks 10,000,000.";
  return null;
}

export function validateTshirtPostDraft(draft: AdminTshirtPostDraft): string[] {
  const errors: string[] = [];
  const attributes = tshirtDraftAttributes(draft);
  if (!draft.title.trim()) errors.push("Post title is required.");
  if (draft.title.trim().length > 80) errors.push("Post title must stay under 80 characters.");
  if (!draft.svg) errors.push("Attach the SVG file for this post.");
  if (!attributes.length) errors.push("Tick at least one attribute option, for example Size and Colour.");
  if (!draft.prices.length) errors.push("Add at least one price combination.");
  if (attributes.length && draft.prices.length > 40) errors.push("Keep the price list under 40 combinations.");

  const seen = new Set<string>();
  for (const row of draft.prices) {
    const missing = attributes.find((attribute) => !row.options[attribute.key]);
    if (missing) {
      errors.push(`Every price row needs a ${missing.label.toLowerCase()} value.`);
      continue;
    }
    const price = Number(row.priceKs);
    if (!Number.isFinite(price) || price <= 0) {
      errors.push(`Set a price for ${tshirtCombinationLabel(attributes, row.options)}.`);
      continue;
    }
    const problem = postPriceError(row.priceKs);
    if (problem) {
      errors.push(`${tshirtCombinationLabel(attributes, row.options)}: ${problem}`);
      continue;
    }
    const key = tshirtCombinationKey(attributes, row.options);
    if (seen.has(key)) {
      errors.push(`Two price rows repeat ${tshirtCombinationLabel(attributes, row.options)}.`);
      continue;
    }
    seen.add(key);
  }
  return errors;
}

export function tshirtPostFromDraft(draft: AdminTshirtPostDraft, existing?: AdminTshirtPost, now = new Date()): AdminTshirtPost {
  const attributes = tshirtDraftAttributes(draft);
  return {
    id: existing?.id ?? makeAdminId("post"),
    title: draft.title.trim(),
    description: draft.description.trim(),
    svg: draft.svg,
    attributes: attributes.map((attribute) => ({ key: attribute.key, label: attribute.label, options: [...attribute.options] })),
    prices: draft.prices.map((row) => ({
      id: row.id,
      options: Object.fromEntries(attributes.map((attribute) => [attribute.key, row.options[attribute.key] ?? attribute.options[0]])),
      priceKs: Math.round(Number(row.priceKs || 0)),
    })),
    status: draft.status,
    createdAt: existing?.createdAt ?? now.toISOString(),
    publishedAt: draft.status === "Published" ? existing?.publishedAt ?? now.toISOString() : null,
  };
}

export function upsertTshirtPost(data: AdminDemoData, post: AdminTshirtPost): AdminDemoData {
  const exists = data.tshirtPosts.some((item) => item.id === post.id);
  return {
    ...data,
    tshirtPosts: exists
      ? data.tshirtPosts.map((item) => (item.id === post.id ? post : item))
      : [post, ...data.tshirtPosts],
  };
}

export function removeTshirtPost(data: AdminDemoData, postId: string): AdminDemoData {
  return { ...data, tshirtPosts: data.tshirtPosts.filter((post) => post.id !== postId) };
}

export function tshirtPostFromPriceKs(post: AdminTshirtPost): number {
  if (!post.prices.length) return 0;
  return Math.min(...post.prices.map((row) => row.priceKs));
}

export function tshirtPostAttributeSummary(post: AdminTshirtPost) {
  return post.attributes
    .filter((attribute) => attribute.options.length)
    .map((attribute) => `${attribute.label}: ${attribute.options.join(", ")}`)
    .join(" · ");
}

// Posts saved before combination pricing stored a size list and colour surcharges. They are
// converted on read so an existing browser keeps its posts instead of failing the store check.
export function normalizeTshirtPost(post: AdminTshirtPost | (Record<string, unknown> & { id: string })): AdminTshirtPost {
  const legacy = post as Record<string, unknown> & {
    id: string;
    title?: string;
    description?: string;
    svg?: AdminPostSvg | null;
    status?: AdminPostStatus;
    createdAt?: string;
    publishedAt?: string | null;
    sizes?: { size: string; priceKs: number }[];
    colors?: { name: string; hex: string; priceKs: number }[];
  };
  if (Array.isArray((post as AdminTshirtPost).attributes) && Array.isArray((post as AdminTshirtPost).prices)) {
    return post as AdminTshirtPost;
  }
  const sizes = legacy.sizes ?? [];
  const colors = legacy.colors ?? [];
  const legacyAttributes: AdminTshirtPostAttribute[] = [
    { key: "size", label: "Size", options: sizes.map((entry) => entry.size) },
    { key: "color", label: "Colour", options: colors.map((entry) => entry.name) },
  ];
  const attributes = legacyAttributes.filter((attribute) => attribute.options.length);
  const prices: AdminTshirtPostPriceRow[] = sizes.flatMap((size) => (colors.length ? colors : [{ name: "", priceKs: 0 }]).map((color) => ({
    id: makeAdminId("price"),
    options: { size: size.size, ...(color.name ? { color: color.name } : {}) },
    priceKs: size.priceKs + color.priceKs,
  })));
  return {
    id: legacy.id,
    title: legacy.title ?? "Untitled post",
    description: legacy.description ?? "",
    svg: legacy.svg ?? null,
    attributes,
    prices,
    status: legacy.status ?? "Draft",
    createdAt: legacy.createdAt ?? new Date().toISOString(),
    publishedAt: legacy.publishedAt ?? null,
  };
}

// ---------------------------------------------------------------- designs

export function setDesignStatus(data: AdminDemoData, designId: string, status: AdminDesignStatus): AdminDemoData {
  return {
    ...data,
    designs: data.designs.map((design) => (design.id === designId ? { ...design, status } : design)),
  };
}

export function removeDesign(data: AdminDemoData, designId: string): AdminDemoData {
  return { ...data, designs: data.designs.filter((design) => design.id !== designId) };
}

// ---------------------------------------------------------------- promotions

export function promotionStatus(promotion: AdminPromotion, now = Date.now()): AdminPromotionStatus {
  if (!promotion.enabled) return "Disabled";
  if (promotion.used >= promotion.usageLimit) return "Used up";
  const time = now;
  if (time < new Date(promotion.startsAt).getTime()) return "Scheduled";
  if (time > new Date(promotion.endsAt).getTime()) return "Expired";
  return "Active";
}

export function promotionDiscountKs(promotion: AdminPromotion, subtotalKs: number, now = Date.now()) {
  if (promotionStatus(promotion, now) !== "Active") return 0;
  if (subtotalKs < promotion.minSpendKs) return 0;
  const raw = promotion.kind === "percent" ? Math.round((subtotalKs * promotion.value) / 100) : promotion.value;
  return Math.max(0, Math.min(subtotalKs, raw));
}

export type AdminPromotionDraft = {
  code: string;
  kind: AdminPromotionKind;
  value: string;
  minSpendKs: string;
  usageLimit: string;
  startsAt: string;
  endsAt: string;
};

export function promotionDraftFrom(promotion?: AdminPromotion, now = Date.now()): AdminPromotionDraft {
  return {
    code: promotion?.code ?? "",
    kind: promotion?.kind ?? "percent",
    value: promotion ? String(promotion.value) : "",
    minSpendKs: promotion ? String(promotion.minSpendKs) : "0",
    usageLimit: promotion ? String(promotion.usageLimit) : "100",
    startsAt: (promotion?.startsAt ?? new Date(now).toISOString()).slice(0, 10),
    endsAt: (promotion?.endsAt ?? new Date(now + 30 * DAY_MS).toISOString()).slice(0, 10),
  };
}

export function validatePromotionDraft(draft: AdminPromotionDraft): string[] {
  const errors: string[] = [];
  if (!/^[A-Z0-9-]{3,16}$/.test(draft.code.trim().toUpperCase())) {
    errors.push("Code must be 3-16 letters, digits or dashes.");
  }
  const value = Number(draft.value);
  if (!Number.isFinite(value) || value <= 0) errors.push("Discount value must be greater than zero.");
  if (draft.kind === "percent" && value > 90) errors.push("A percentage discount cannot exceed 90%.");
  const minSpend = Number(draft.minSpendKs);
  if (!Number.isFinite(minSpend) || minSpend < 0) errors.push("Minimum spend cannot be negative.");
  const limit = Number(draft.usageLimit);
  if (!Number.isFinite(limit) || limit < 1) errors.push("Usage limit must be at least 1.");
  const start = new Date(`${draft.startsAt}T00:00:00`).getTime();
  const end = new Date(`${draft.endsAt}T23:59:59`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) errors.push("Start and end dates are required.");
  else if (end <= start) errors.push("End date must be after the start date.");
  return errors;
}

export function promotionFromDraft(draft: AdminPromotionDraft, existing?: AdminPromotion): AdminPromotion {
  return {
    id: existing?.id ?? makeAdminId("promo"),
    code: draft.code.trim().toUpperCase(),
    kind: draft.kind,
    value: Number(draft.value),
    minSpendKs: Math.round(Number(draft.minSpendKs) || 0),
    usageLimit: Math.round(Number(draft.usageLimit) || 1),
    used: existing?.used ?? 0,
    startsAt: new Date(`${draft.startsAt}T00:00:00`).toISOString(),
    endsAt: new Date(`${draft.endsAt}T23:59:59`).toISOString(),
    enabled: existing?.enabled ?? true,
  };
}

export function upsertPromotion(data: AdminDemoData, promotion: AdminPromotion): AdminDemoData {
  const exists = data.promotions.some((item) => item.id === promotion.id);
  return {
    ...data,
    promotions: exists
      ? data.promotions.map((item) => (item.id === promotion.id ? promotion : item))
      : [...data.promotions, promotion],
  };
}

export function removePromotion(data: AdminDemoData, promotionId: string): AdminDemoData {
  return { ...data, promotions: data.promotions.filter((promotion) => promotion.id !== promotionId) };
}

export function togglePromotion(data: AdminDemoData, promotionId: string): AdminDemoData {
  return {
    ...data,
    promotions: data.promotions.map((promotion) => (
      promotion.id === promotionId ? { ...promotion, enabled: !promotion.enabled } : promotion
    )),
  };
}

// ---------------------------------------------------------------- team and settings

export function updateSettings(data: AdminDemoData, patch: Partial<AdminSettings>): AdminDemoData {
  return { ...data, settings: { ...data.settings, ...patch } };
}

export function canAccessModule(member: AdminTeamMember, moduleId: AdminModuleId) {
  if (!member.active) return false;
  if (member.role === "Super Admin") return true;
  return member.modules.includes(moduleId);
}

export type AdminTeamDraft = { name: string; email: string; role: AdminTeamRole; modules: AdminModuleId[] };

export function validateTeamDraft(draft: AdminTeamDraft): string[] {
  const errors: string[] = [];
  if (!draft.name.trim()) errors.push("Name is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) errors.push("A valid email is required.");
  if (draft.role !== "Super Admin" && draft.modules.length === 0) {
    errors.push("Pick at least one module for a non-super admin.");
  }
  return errors;
}

export function upsertTeamMember(data: AdminDemoData, member: AdminTeamMember): AdminDemoData {
  const exists = data.team.some((item) => item.id === member.id);
  return {
    ...data,
    team: exists ? data.team.map((item) => (item.id === member.id ? member : item)) : [...data.team, member],
  };
}

export function removeTeamMember(data: AdminDemoData, memberId: string): AdminDemoData {
  return { ...data, team: data.team.filter((member) => member.id !== memberId) };
}

// ---------------------------------------------------------------- seed data

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const SEED_CUSTOMERS = [
  { name: "Thura Aung", email: "thura.aung@example.com", phone: "+95 9 771 220 431" },
  { name: "May Thu", email: "may.thu@example.com", phone: "+95 9 250 118 664" },
  { name: "Kyaw Min", email: "kyaw.min@example.com", phone: "+95 9 449 330 127" },
  { name: "Su Hlaing", email: "su.hlaing@example.com", phone: "+95 9 780 552 019" },
  { name: "Zin Min", email: "zin.min@example.com", phone: "+95 9 512 664 883" },
  { name: "Nandar Win", email: "nandar.win@example.com", phone: "+95 9 664 210 558" },
  { name: "Aung Ko", email: "aung.ko@example.com", phone: "+95 9 331 887 402" },
  { name: "Ei Phyu", email: "ei.phyu@example.com", phone: "+95 9 902 447 163" },
  { name: "Htet Naing", email: "htet.naing@example.com", phone: "+95 9 118 330 776" },
  { name: "Phyo Wai", email: "phyo.wai@example.com", phone: "+95 9 845 662 091" },
  { name: "Moe Sandar", email: "moe.sandar@example.com", phone: "+95 9 227 901 384" },
  { name: "Ye Yint", email: "ye.yint@example.com", phone: "+95 9 663 118 240" },
];

const SEED_PRODUCTS: Omit<AdminProduct, "sizes">[] = [
  { id: "product-classic-tee", name: "Classic T-shirt", category: "T-Shirt", fabric: "Combed Cotton", gsm: 180, priceKs: 21000, status: "Active" },
  { id: "product-oversized-tee", name: "Oversized T-shirt", category: "T-Shirt", fabric: "Cotton", gsm: 220, priceKs: 27000, status: "Active" },
  { id: "product-hoodie", name: "Hoodie", category: "Hoodie", fabric: "Fleece", gsm: 320, priceKs: 42000, status: "Active" },
  { id: "product-polo", name: "Polo Shirt", category: "Polo", fabric: "Pique Cotton", gsm: 200, priceKs: 32000, status: "Active" },
  { id: "product-jersey", name: "Football Jersey", category: "Jersey", fabric: "Polyester Mesh", gsm: 160, priceKs: 38000, status: "Active" },
  { id: "product-cap", name: "Cap", category: "Cap", fabric: "Cotton Twill", gsm: null, priceKs: 18000, status: "Active" },
  { id: "product-tote", name: "Tote Bag", category: "Accessory", fabric: "Canvas", gsm: null, priceKs: 16000, status: "Draft" },
  { id: "product-phone-cover", name: "Phone Cover", category: "Accessory", fabric: "TPU", gsm: null, priceKs: 15000, status: "Active" },
];

const SEED_DESIGN_NAMES = [
  "Street Vibes",
  "Golden Peacock",
  "Mandalay Nights",
  "Retro Waves",
  "Team Spirit 09",
  "Minimal Bloom",
  "Neon Grid",
  "Mountain Trail",
];

const SEED_COLORS = ["Black", "White", "Sand", "Forest", "Navy"];

function stageForAge(days: number, roll: number): AdminOrderStage {
  if (days <= 0) return roll < 0.45 ? "Pending Payment" : "Confirmed";
  if (days <= 2) return roll < 0.5 ? "Processing" : "Printing";
  if (days <= 5) return roll < 0.5 ? "Ready to Ship" : "Handed to Delivery";
  if (days <= 8) return roll < 0.55 ? "Out for Delivery" : "Delivered";
  if (roll < 0.06) return "Cancelled";
  if (roll < 0.1) return "Refunded";
  return "Delivered";
}

function seedPostSvg(label: string, accent: string): AdminPostSvg {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><circle cx="120" cy="120" r="76" fill="none" stroke="${accent}" stroke-width="14"/><text x="120" y="132" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="30" font-weight="700" fill="${accent}">${label}</text></svg>`;
  return { url: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`, fileName: `${label.toLowerCase()}.svg`, sizeBytes: svg.length };
}

function createSeedTshirtPosts(now: number): AdminTshirtPost[] {
  const daysAgo = (days: number) => new Date(now - days * DAY_MS).toISOString();
  return [
    {
      id: "post-peacock-line",
      title: "Peacock Line Tee",
      description: "Single-colour line art printed on combed cotton.",
      svg: seedPostSvg("PEACOCK", "#236b42"),
      attributes: [
        { key: "size", label: "Size", options: ["S", "M", "L", "XL"] },
        { key: "material", label: "Material", options: ["Cotton", "Premium Cotton"] },
        { key: "fit", label: "Fit Type", options: ["Regular"] },
        { key: "color", label: "Colour", options: ["Black", "White", "Sand"] },
        { key: "print", label: "Print", options: ["DTF", "Sublimation"] },
      ],
      prices: [
        { id: "price-peacock-1", options: { size: "S", material: "Cotton", fit: "Regular", color: "Black", print: "DTF" }, priceKs: 21000 },
        { id: "price-peacock-2", options: { size: "M", material: "Cotton", fit: "Regular", color: "Black", print: "DTF" }, priceKs: 22000 },
        { id: "price-peacock-3", options: { size: "M", material: "Premium Cotton", fit: "Regular", color: "Black", print: "DTF" }, priceKs: 25000 },
        { id: "price-peacock-4", options: { size: "XL", material: "Cotton", fit: "Regular", color: "White", print: "DTF" }, priceKs: 24000 },
        { id: "price-peacock-5", options: { size: "XL", material: "Premium Cotton", fit: "Regular", color: "Sand", print: "Sublimation" }, priceKs: 31000 },
      ],
      status: "Published",
      createdAt: daysAgo(6),
      publishedAt: daysAgo(5),
    },
    {
      id: "post-mandalay-nights",
      title: "Mandalay Nights Tee",
      description: "Two-colour night market print, oversized fit.",
      svg: seedPostSvg("MANDALAY", "#b83219"),
      attributes: [
        { key: "size", label: "Size", options: ["M", "L", "2XL"] },
        { key: "fit", label: "Fit Type", options: ["Oversized"] },
        { key: "color", label: "Colour", options: ["Black", "Navy"] },
        { key: "gsm", label: "GSM", options: ["220 GSM"] },
        { key: "cutting", label: "Cutting", options: ["Raw Edge"] },
        { key: "print", label: "Print", options: ["Sublimation"] },
      ],
      prices: [
        { id: "price-mandalay-1", options: { size: "M", fit: "Oversized", color: "Black", gsm: "220 GSM", cutting: "Raw Edge", print: "Sublimation" }, priceKs: 27000 },
        { id: "price-mandalay-2", options: { size: "L", fit: "Oversized", color: "Navy", gsm: "220 GSM", cutting: "Raw Edge", print: "Sublimation" }, priceKs: 29000 },
        { id: "price-mandalay-3", options: { size: "2XL", fit: "Oversized", color: "Black", gsm: "220 GSM", cutting: "Raw Edge", print: "Sublimation" }, priceKs: 31000 },
      ],
      status: "Draft",
      createdAt: daysAgo(2),
      publishedAt: null,
    },
  ];
}

export function createAdminDemoData(now = Date.now()): AdminDemoData {
  const random = seededRandom(20261121);
  const products: AdminProduct[] = SEED_PRODUCTS.map((product) => ({
    ...product,
    sizes: APPAREL_CATEGORIES.includes(product.category) ? [...APPAREL_SIZES] : [...ONE_SIZE],
  }));

  const stock: Record<string, Record<string, number>> = {};
  for (const product of products) {
    stock[product.id] = Object.fromEntries(product.sizes.map((size) => {
      const roll = random();
      const quantity = roll < 0.12 ? 0 : roll < 0.3 ? 3 + Math.floor(random() * 7) : 18 + Math.floor(random() * 60);
      return [size, quantity];
    }));
  }

  const orders: AdminOrder[] = [];
  const orderCount = 26;
  for (let index = 0; index < orderCount; index += 1) {
    const customer = SEED_CUSTOMERS[index % SEED_CUSTOMERS.length];
    const product = products[Math.floor(random() * products.length)];
    const quantity = 1 + Math.floor(random() * 3);
    const daysAgo = Math.floor(random() * 21);
    const placedAt = new Date(now - daysAgo * DAY_MS - Math.floor(random() * DAY_MS)).toISOString();
    const payment = (["KBZPay", "WavePay", "AYAPay", "Cash on Delivery"] as AdminPaymentMethod[])[index % 4];
    const size = product.sizes[Math.floor(random() * product.sizes.length)];
    orders.push({
      id: `#MH${1100 - index}`,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      items: [{
        productId: product.id,
        name: product.name,
        size,
        color: SEED_COLORS[Math.floor(random() * SEED_COLORS.length)],
        quantity,
        unitPriceKs: product.priceKs,
      }],
      stage: stageForAge(daysAgo, random()),
      payment,
      placedAt,
      note: "",
    });
  }
  orders.sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime());

  const designs: AdminDesign[] = SEED_DESIGN_NAMES.map((name, index) => ({
    id: `design-${index + 1}`,
    name,
    author: SEED_CUSTOMERS[index % SEED_CUSTOMERS.length].name,
    product: products[index % products.length].name,
    createdAt: new Date(now - index * 2 * DAY_MS - 3600_000).toISOString(),
    status: index % 5 === 3 ? "Draft" : index % 7 === 6 ? "Hidden" : "Published",
    downloads: 12 + index * 7,
  }));

  const promotions: AdminPromotion[] = [
    {
      id: "promo-new10", code: "NEW10", kind: "percent", value: 10, minSpendKs: 30000,
      usageLimit: 200, used: 41,
      startsAt: new Date(now - 10 * DAY_MS).toISOString(),
      endsAt: new Date(now + 20 * DAY_MS).toISOString(),
      enabled: true,
    },
    {
      id: "promo-thingyan", code: "THINGYAN15", kind: "percent", value: 15, minSpendKs: 60000,
      usageLimit: 300, used: 118,
      startsAt: new Date(now - 4 * DAY_MS).toISOString(),
      endsAt: new Date(now + 9 * DAY_MS).toISOString(),
      enabled: true,
    },
    {
      id: "promo-delivery", code: "FREESHIP", kind: "amount", value: 4000, minSpendKs: 50000,
      usageLimit: 150, used: 150,
      startsAt: new Date(now - 30 * DAY_MS).toISOString(),
      endsAt: new Date(now - 2 * DAY_MS).toISOString(),
      enabled: true,
    },
    {
      id: "promo-welcome5", code: "WELCOME5", kind: "percent", value: 5, minSpendKs: 0,
      usageLimit: 500, used: 92,
      startsAt: new Date(now - 60 * DAY_MS).toISOString(),
      endsAt: new Date(now - 30 * DAY_MS).toISOString(),
      enabled: false,
    },
    {
      id: "promo-jersey", code: "JERSEY20", kind: "percent", value: 20, minSpendKs: 80000,
      usageLimit: 60, used: 0,
      startsAt: new Date(now + 5 * DAY_MS).toISOString(),
      endsAt: new Date(now + 35 * DAY_MS).toISOString(),
      enabled: true,
    },
  ];

  const team: AdminTeamMember[] = [
    {
      id: "team-owner",
      name: "MH Fashion Owner",
      email: "owner@mhfashion.com",
      role: "Super Admin",
      modules: ADMIN_MODULES.map((module) => module.id),
      active: true,
    },
    {
      id: "team-post",
      name: "Nandar Win",
      email: "nandar.win@mhfashion.com",
      role: "Post Admin",
      modules: ["dashboard", "designs", "customers", "reports"],
      active: true,
    },
    {
      id: "team-print",
      name: "Aung Ko",
      email: "aung.ko@mhfashion.com",
      role: "Print Admin",
      modules: ["dashboard", "orders", "inventory", "reports"],
      active: true,
    },
  ];

  return {
    version: 1,
    orders,
    products,
    stock,
    designs,
    tshirtPosts: createSeedTshirtPosts(now),
    promotions,
    team,
    settings: {
      storeName: "MH Fashion",
      supportEmail: "support@mhfashion.com",
      supportPhone: "+95 9 000 112 233",
      usdRateKs: 4300,
      lowStockThreshold: 12,
      freeDeliveryThresholdKs: 50000,
      orderNoteTemplate: "Checked by the print desk before hand-off.",
    },
  };
}

// ---------------------------------------------------------------- browser storage

let cache: AdminDemoData | null = null;
const listeners = new Set<() => void>();

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readAdminDemoData(): AdminDemoData {
  if (cache) return cache;
  if (!isBrowser()) {
    cache = createAdminDemoData();
    return cache;
  }
  try {
    const raw = window.localStorage.getItem(ADMIN_DEMO_DATA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AdminDemoData;
      if (parsed && parsed.version === 1 && Array.isArray(parsed.orders) && Array.isArray(parsed.products)) {
        // Entries saved before the Posts module existed have no tshirtPosts key.
        cache = Array.isArray(parsed.tshirtPosts)
          ? { ...parsed, tshirtPosts: parsed.tshirtPosts.map(normalizeTshirtPost) }
          : { ...parsed, tshirtPosts: createSeedTshirtPosts(Date.now()) };
        return cache;
      }
    }
  } catch {
    // A corrupt entry is replaced by a fresh demo set below.
  }
  cache = createAdminDemoData();
  writeAdminDemoData(cache);
  return cache;
}

export function writeAdminDemoData(data: AdminDemoData) {
  cache = data;
  if (isBrowser()) {
    try {
      window.localStorage.setItem(ADMIN_DEMO_DATA_KEY, JSON.stringify(data));
    } catch {
      // Storage can be full or blocked; the in-memory cache still drives this session.
    }
  }
  for (const listener of listeners) listener();
}

export function updateAdminDemoData(update: (current: AdminDemoData) => AdminDemoData) {
  writeAdminDemoData(update(readAdminDemoData()));
}

export function resetAdminDemoData() {
  writeAdminDemoData(createAdminDemoData());
}

export function subscribeAdminDemoData(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
