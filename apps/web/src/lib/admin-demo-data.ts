"use client";

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

export type AdminTshirtPostSize = {
  size: string;
  priceKs: number;
};

// A colour carries its own optional surcharge: the storefront already prices colour
// separately, so a post has to be able to say "Navy +Ks 1,000" per colour.
export type AdminTshirtPostColor = {
  name: string;
  hex: string;
  priceKs: number;
};

export type AdminTshirtPost = {
  id: string;
  title: string;
  description: string;
  svg: AdminPostSvg | null;
  colors: AdminTshirtPostColor[];
  sizes: AdminTshirtPostSize[];
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

export function revenueByDay(orders: AdminOrder[], days: number, now = Date.now()) {
  const buckets: { date: string; label: string; revenueKs: number; orders: number }[] = [];
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(start.getTime() - offset * DAY_MS);
    buckets.push({
      date: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
      revenueKs: 0,
      orders: 0,
    });
  }
  const index = new Map(buckets.map((bucket, position) => [bucket.date, position]));
  for (const order of orders) {
    const key = new Date(order.placedAt).toISOString().slice(0, 10);
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

// The six colours the storefront offers for shirts. A post ticks the ones it sells.
export const TSHIRT_POST_COLORS: { name: string; hex: string }[] = [
  { name: "Black", hex: "#111111" },
  { name: "White", hex: "#ffffff" },
  { name: "Green", hex: "#236b42" },
  { name: "Sand", hex: "#d4b78b" },
  { name: "Red", hex: "#b83219" },
  { name: "Navy", hex: "#203459" },
];

export const TSHIRT_POST_SIZES = APPAREL_SIZES;

export type AdminTshirtPostDraft = {
  title: string;
  description: string;
  svg: AdminPostSvg | null;
  colors: { name: string; hex: string; priceKs: string }[];
  sizes: { size: string; priceKs: string }[];
  status: AdminPostStatus;
};

export function tshirtPostDraftFrom(post?: AdminTshirtPost): AdminTshirtPostDraft {
  return {
    title: post?.title ?? "",
    description: post?.description ?? "",
    svg: post?.svg ?? null,
    colors: (post?.colors ?? []).map((color) => ({ name: color.name, hex: color.hex, priceKs: color.priceKs ? String(color.priceKs) : "" })),
    sizes: (post?.sizes ?? []).map((size) => ({ size: size.size, priceKs: String(size.priceKs) })),
    status: post?.status ?? "Draft",
  };
}

function postPriceError(value: string) {
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0) return "Prices must be zero or more.";
  if (price > 10000000) return "Prices must stay under Ks 10,000,000.";
  return null;
}

export function validateTshirtPostDraft(draft: AdminTshirtPostDraft): string[] {
  const errors: string[] = [];
  if (!draft.title.trim()) errors.push("Post title is required.");
  if (draft.title.trim().length > 80) errors.push("Post title must stay under 80 characters.");
  if (!draft.svg) errors.push("Attach the SVG file for this post.");
  if (!draft.colors.length) errors.push("Tick at least one colour.");
  if (!draft.sizes.length) errors.push("Tick at least one size.");
  for (const size of draft.sizes) {
    const price = Number(size.priceKs);
    if (!Number.isFinite(price) || price <= 0) {
      errors.push(`Set a price for size ${size.size}.`);
      continue;
    }
    const problem = postPriceError(size.priceKs);
    if (problem) errors.push(`${size.size}: ${problem}`);
  }
  for (const color of draft.colors) {
    if (!color.priceKs.trim()) continue;
    const problem = postPriceError(color.priceKs);
    if (problem) errors.push(`${color.name}: ${problem}`);
  }
  return errors;
}

export function tshirtPostFromDraft(draft: AdminTshirtPostDraft, existing?: AdminTshirtPost, now = new Date()): AdminTshirtPost {
  const publishedAt = draft.status === "Published"
    ? existing?.publishedAt ?? now.toISOString()
    : null;
  return {
    id: existing?.id ?? makeAdminId("post"),
    title: draft.title.trim(),
    description: draft.description.trim(),
    svg: draft.svg,
    colors: draft.colors.map((color) => ({ name: color.name, hex: color.hex, priceKs: Math.round(Number(color.priceKs || 0)) })),
    sizes: draft.sizes.map((size) => ({ size: size.size, priceKs: Math.round(Number(size.priceKs || 0)) })),
    status: draft.status,
    createdAt: existing?.createdAt ?? now.toISOString(),
    publishedAt,
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

// Cheapest combination a shopper can buy, so the list can show "from Ks 21,000".
export function tshirtPostFromPriceKs(post: AdminTshirtPost): number {
  if (!post.sizes.length) return 0;
  const colourFloor = post.colors.length ? Math.min(...post.colors.map((color) => color.priceKs)) : 0;
  return Math.min(...post.sizes.map((size) => size.priceKs)) + colourFloor;
}

export function tshirtPostSizeLabel(post: AdminTshirtPost) {
  return post.sizes.map((size) => `${size.size} ${formatKs(size.priceKs)}`).join(" · ");
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
      colors: [
        { name: "Black", hex: "#111111", priceKs: 0 },
        { name: "White", hex: "#ffffff", priceKs: 500 },
        { name: "Sand", hex: "#d4b78b", priceKs: 500 },
      ],
      sizes: [
        { size: "S", priceKs: 21000 },
        { size: "M", priceKs: 22000 },
        { size: "L", priceKs: 23000 },
        { size: "XL", priceKs: 24000 },
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
      colors: [
        { name: "Black", hex: "#111111", priceKs: 0 },
        { name: "Navy", hex: "#203459", priceKs: 1000 },
      ],
      sizes: [
        { size: "M", priceKs: 27000 },
        { size: "L", priceKs: 28000 },
        { size: "2XL", priceKs: 30000 },
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
          ? parsed
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
