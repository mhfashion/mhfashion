"use client";

// Browser-local demo data for the Super Admin workspace. Nothing here is a security boundary
// or live store data: the plan requires the admin UI to stay preview-only until Supabase Auth,
// RLS and server-side role checks replace the demo session. Every module reads and writes this
// one store so the dashboard, orders, stock and reports cannot disagree with each other.

import {
  COLOR_LABELS,
  FABRIC_TYPE_OPTIONS,
  GSM_OPTIONS,
  KNIT_STRUCTURE_OPTIONS,
  MH_CUTTINGS_OPTIONS,
  PRINT_METHOD_OPTIONS,
  SIZE_OPTIONS,
} from "@/lib/editor-attributes";
import {
  DEFAULT_CASCADE_RULES,
  normalizeCascadeRules,
  type AttributeCascadeRule,
} from "@/lib/attribute-rules";
import { normalizeRefundRequests, type AdminOrderRefundRequest } from "@/lib/order-refunds";
import { normalizeLoyaltyLedger, type LoyaltyEntry } from "@/lib/loyalty-ledger";
import { normalizeSizeChart, type ProductSizeChart } from "@/lib/size-chart";
import { normalizeContactMessages, type ContactMessage } from "@/lib/contact-messages";

export const ADMIN_DEMO_DATA_KEY = "mh-fashion-admin-demo-data-v1";

export type AdminModuleId =
  | "dashboard"
  | "orders"
  | "products"
  | "designs"
  | "posts"
  | "ads"
  | "pricing"
  | "attributes"
  | "settlements"
  | "loyalty"
  | "jersey"
  | "customers"
  | "inventory"
  | "promotions"
  | "reports"
  | "messages"
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
export type AdminPaymentMethod = "KBZPay" | "WavePay" | "AYAPay" | "Visa" | "Cash on Delivery";
export type AdminProductCategory = "T-Shirt" | "Hoodie" | "Polo" | "Jersey" | "Cap" | "Accessory";
export type AdminProductStatus = "Active" | "Draft" | "Archived";
export type AdminDesignStatus = "Published" | "Draft" | "Hidden";
export type AdminPromotionKind = "percent" | "amount";
export type AdminPromotionStatus = "Active" | "Scheduled" | "Expired" | "Used up" | "Disabled";
export type AdminTeamRole = "Super Admin" | "Post Admin" | "Print Admin" | "Support";

export type AdminDesignLayer = {
  name: string;
  kind: "text" | "shape" | "image";
  /** Placement inside the print area, in artwork units (divide by unitsPerCm for centimetres). */
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  text?: string;
  /**
   * Thinnest painted stroke on a shape layer, in artwork units (divide by `unitsPerCm` for
   * centimetres). Absent for text and images, and for a shape that is only filled.
   */
  strokeWidth?: number;
  /**
   * The photo's own pixel size, for an `image` layer. The editor records it at import; a design saved
   * without it (vector artwork, or an older draft) simply carries no photo check.
   */
  pixelWidth?: number;
  pixelHeight?: number;
};

export type AdminDesignMockup = {
  /** Mockup the artwork was laid out on, e.g. "Classic T-shirt · White · 2XL". */
  name: string;
  /** Flat garment size on the mockup, in centimetres. */
  garmentWidthCm: number;
  garmentHeightCm: number;
  /** Top-left corner of the print area on the garment, in centimetres. */
  printAreaXCm: number;
  printAreaYCm: number;
};

export type AdminOrderDesign = {
  id: string;
  name: string;
  fileName: string;
  /** Print ink, so the press knows what colour to load. */
  ink: string;
  /** Inline artwork at real print size: the desk can preview and download it without a bucket. */
  svg: string;
  /** Print area on the garment. */
  printWidthCm: number;
  printHeightCm: number;
  /** Artwork units per centimetre; converts every layer position to a real size. */
  unitsPerCm: number;
  layers: AdminDesignLayer[];
  placement: "Front" | "Back" | "Left chest" | "Sleeve";
  /** Where on the garment the print area sits — without this the desk cannot align the press. */
  mockup: AdminDesignMockup;
};

export const DESIGN_UNITS_PER_CM = 10;

export type DesignLayerSize = {
  xCm: number;
  yCm: number;
  widthCm: number;
  heightCm: number;
};

/** A layer's box in centimetres, rounded to 0.1 cm for the sheet and the CSV. */
export function designLayerSize(layer: AdminDesignLayer, unitsPerCm = DESIGN_UNITS_PER_CM): DesignLayerSize {
  const scale = layer.scale > 0 ? layer.scale : 1;
  const round = (value: number) => Math.round((value / unitsPerCm) * 10) / 10;
  return {
    xCm: round(layer.x),
    yCm: round(layer.y),
    widthCm: round(layer.width * scale),
    heightCm: round(layer.height * scale),
  };
}

export type AdminOrderShipTo = {
  name: string;
  phone: string;
  address: string;
  township: string;
  city: string;
};

export type AdminOrderItem = {
  productId: string;
  name: string;
  size: string;
  color: string;
  quantity: number;
  unitPriceKs: number;
  // Print spec. Optional so orders stored before the print sheet existed still load.
  material?: string;
  gsm?: number | null;
  fit?: string;
  sleeve?: string;
  printMethod?: string;
  design?: AdminOrderDesign | null;
};

/** One run of the press sheet. The press needs to know a sheet has already been printed. */
export type AdminOrderReprint = {
  at: string;
  by: string;
};

export type AdminOrder = {
  id: string;
  /** Set when the order came through checkout; a repeat submit with the same key returns this order. */
  checkoutKey?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shipTo?: AdminOrderShipTo;
  items: AdminOrderItem[];
  stage: AdminOrderStage;
  payment: AdminPaymentMethod;
  placedAt: string;
  note: string;
  /** Every run of the press sheet, oldest first; the last `MAX_ORDER_REPRINTS` are kept. */
  reprints?: AdminOrderReprint[];
  /** Refund requests the customer raised from their account, oldest first. */
  refundRequests?: AdminOrderRefundRequest[];
  /** When a paid order took its pieces out of stock, and what it actually took. */
  stockConsumedAt?: string;
  stockTaken?: { productId: string; size: string; quantity: number }[];
  /** Pieces the sale could not cover; the desk restocks rather than the clamp hiding it. */
  stockShortfall?: { productId: string; size: string; wanted: number; available: number }[];
  /** When a refund or cancellation gave the pieces back. */
  stockRestoredAt?: string;
};

const DESIGN_INKS = ["#2f7d32", "#c08a2e", "#203459", "#b83219", "#4b3f8f", "#1f7a6d", "#8a1f5c", "#33413a"];

function svgText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function designLayerSvg(layer: AdminDesignLayer, ink: string): string {
  const scale = layer.scale > 0 ? layer.scale : 1;
  const width = layer.width * scale;
  const height = layer.height * scale;
  const centerX = layer.x + width / 2;
  const centerY = layer.y + height / 2;
  const rotate = layer.rotation ? ` transform="rotate(${layer.rotation} ${centerX.toFixed(1)} ${centerY.toFixed(1)})"` : "";
  if (layer.kind === "text") {
    const label = layer.text ?? layer.name;
    // Fit the label inside its own layer box, so the file and the layout table agree.
    const size = Math.max(6, Math.min(height * 0.72, width / Math.max(1, label.length * 0.56)));
    return `<text x="${centerX.toFixed(1)}" y="${centerY.toFixed(1)}" font-family="Inter, Arial, sans-serif" font-size="${size.toFixed(1)}" font-weight="800" fill="${ink}" text-anchor="middle" dominant-baseline="middle"${rotate}>${svgText(label)}</text>`;
  }
  if (layer.kind === "image") {
    return `<rect x="${layer.x.toFixed(1)}" y="${layer.y.toFixed(1)}" width="${width.toFixed(1)}" height="${height.toFixed(1)}" fill="${ink}" opacity="0.25"${rotate} />`;
  }
  return `<rect x="${layer.x.toFixed(1)}" y="${layer.y.toFixed(1)}" width="${width.toFixed(1)}" height="${height.toFixed(1)}" rx="${(Math.min(width, height) * 0.08).toFixed(1)}" fill="${ink}" opacity="0.18"${rotate} />`;
}

/**
 * The saved design file. It is sized in centimetres and drawn from the stored layer boxes, so the
 * artwork the press opens is exactly the layout recorded on the order.
 */
export function buildDesignSvg(design: Pick<AdminOrderDesign, "name" | "ink" | "layers" | "printWidthCm" | "printHeightCm" | "unitsPerCm">): string {
  const units = design.unitsPerCm > 0 ? design.unitsPerCm : DESIGN_UNITS_PER_CM;
  const width = design.printWidthCm * units;
  const height = design.printHeightCm * units;
  const layers = design.layers.map((layer) => designLayerSvg(layer, design.ink)).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${design.printWidthCm}cm" height="${design.printHeightCm}cm" viewBox="0 0 ${width.toFixed(1)} ${height.toFixed(1)}"><title>${svgText(design.name)}</title>${layers}</svg>`;
}

function designFileSlug(name: string, color: string): string {
  const base = `${name}-${color}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${base || "design"}.svg`;
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  return hash;
}

const GARMENT_SIZES_CM: Record<string, { width: number; height: number }> = {
  S: { width: 46, height: 68 },
  M: { width: 50, height: 70 },
  L: { width: 54, height: 72 },
  XL: { width: 58, height: 74 },
  XXL: { width: 62, height: 76 },
  "2XL": { width: 62, height: 76 },
  "One size": { width: 38, height: 42 },
};

const round1 = (value: number) => Math.round(value * 10) / 10;

/** Garment size and print-area origin for a placement, in centimetres. */
export function designMockupPlacement(
  placement: AdminOrderDesign["placement"],
  printWidthCm: number,
  printHeightCm: number,
  garment: { name?: string; category?: AdminProductCategory; size?: string; color?: string } = {},
): AdminDesignMockup {
  const size = garment.size ?? "M";
  const base = GARMENT_SIZES_CM[size] ?? GARMENT_SIZES_CM.M;
  const garmentWidthCm = base.width;
  const garmentHeightCm = garment.category === "Hoodie" ? base.height + 6 : base.height;
  let x: number;
  let y: number;
  if (placement === "Left chest") {
    x = garmentWidthCm - printWidthCm - 6;
    y = garmentHeightCm * 0.16;
  } else if (placement === "Sleeve") {
    x = 4;
    y = garmentHeightCm * 0.28;
  } else {
    x = (garmentWidthCm - printWidthCm) / 2;
    y = garmentHeightCm * 0.22;
  }
  return {
    name: `${garment.name ?? "Garment"} · ${garment.color ?? "—"} · ${size}`,
    garmentWidthCm: round1(garmentWidthCm),
    garmentHeightCm: round1(garmentHeightCm),
    printAreaXCm: round1(Math.max(0, Math.min(garmentWidthCm - printWidthCm, x))),
    printAreaYCm: round1(Math.max(0, Math.min(garmentHeightCm - printHeightCm, y))),
  };
}

/** Garment outline with the print area and every layer box, so the position is unmistakable. */
export function buildMockupDiagramSvg(design: AdminOrderDesign): string {
  const mockup = design.mockup;
  const width = mockup.garmentWidthCm;
  const height = mockup.garmentHeightCm;
  const layers = design.layers
    .map((layer) => {
      const size = designLayerSize(layer, design.unitsPerCm);
      const x = mockup.printAreaXCm + size.xCm;
      const y = mockup.printAreaYCm + size.yCm;
      return `<rect x="${x}" y="${y}" width="${size.widthCm}" height="${size.heightCm}" fill="none" stroke="${design.ink}" stroke-width="0.15" opacity="0.85" />`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${Math.round(width * 4)}" height="${Math.round(height * 4)}"><rect x="0.2" y="0.2" width="${width - 0.4}" height="${height - 0.4}" rx="2" fill="#f2f4f5" stroke="#c9d0d8" stroke-width="0.3" /><rect x="${mockup.printAreaXCm}" y="${mockup.printAreaYCm}" width="${design.printWidthCm}" height="${design.printHeightCm}" fill="none" stroke="#4cae22" stroke-width="0.3" stroke-dasharray="1 0.6" />${layers}</svg>`;
}

export function seedOrderDesign(
  name: string,
  color: string,
  seed: number,
  garment: { name?: string; category?: AdminProductCategory; size?: string; color?: string } = {},
): AdminOrderDesign {
  const placement = (["Front", "Back", "Left chest", "Sleeve"] as const)[seed % 4];
  const printWidthCm = placement === "Left chest" ? 9 : placement === "Sleeve" ? 7 : 28;
  const printHeightCm = placement === "Left chest" ? 9 : placement === "Sleeve" ? 7 : 35;
  const unitsPerCm = DESIGN_UNITS_PER_CM;
  const width = printWidthCm * unitsPerCm;
  const height = printHeightCm * unitsPerCm;
  const layers: AdminDesignLayer[] = [
    // The seeded backdrop is drawn with a 2 mm frame, so a saved design exercises the stroke path.
    { name: "Backdrop", kind: "shape", x: width * 0.2, y: height * 0.1, width: width * 0.6, height: height * 0.44, rotation: 0, scale: 1, strokeWidth: 2 * unitsPerCm },
    { name: "Title", kind: "text", text: name, x: width * 0.08, y: height * 0.62, width: width * 0.84, height: height * 0.14, rotation: 0, scale: 1 },
    { name: "Wordmark", kind: "text", text: "MH FASHION", x: width * 0.18, y: height * 0.82, width: width * 0.64, height: height * 0.07, rotation: 0, scale: 1 },
  ];
  const design: AdminOrderDesign = {
    id: `design-${(seed % SEED_DESIGN_NAMES.length) + 1}`,
    name,
    fileName: designFileSlug(name, color),
    ink: DESIGN_INKS[seed % DESIGN_INKS.length],
    svg: "",
    printWidthCm,
    printHeightCm,
    unitsPerCm,
    layers,
    placement,
    mockup: designMockupPlacement(placement, printWidthCm, printHeightCm, { color, ...garment }),
  };
  return { ...design, svg: buildDesignSvg(design) };
}

/**
 * Orders saved before the print sheet existed have no spec or artwork. Fill the gaps from the
 * product catalogue and the seed designs so opening any order still gives the press everything.
 */
export function backfillOrderPrintSpec(order: AdminOrder, products: AdminProduct[]): AdminOrder {
  const shipTo: AdminOrderShipTo = order.shipTo ?? {
    name: order.customerName,
    phone: order.customerPhone,
    address: "Address on file",
    township: "—",
    city: "Yangon",
  };
  const items = order.items.map((item, index) => {
    const design = item.design && Array.isArray(item.design.layers) && item.design.layers.length && item.design.mockup
      ? item.design
      : null;
    if (design && item.material && item.fit && item.sleeve && item.printMethod) return item;
    const product = products.find((candidate) => candidate.id === item.productId);
    const apparel = product ? APPAREL_CATEGORIES.includes(product.category) : true;
    const seed = hashString(`${order.id}-${index}`);
    const designName = SEED_DESIGN_NAMES[seed % SEED_DESIGN_NAMES.length];
    return {
      ...item,
      material: item.material ?? product?.fabric ?? "Cotton",
      gsm: item.gsm === undefined ? (product?.gsm ?? null) : item.gsm,
      fit: item.fit ?? (apparel ? "Oversized" : "Standard"),
      sleeve: item.sleeve ?? (apparel ? "Short Sleeve" : "—"),
      printMethod: item.printMethod ?? "DTF",
      design: design ?? seedOrderDesign(designName, item.color, seed, { name: product?.name, category: product?.category, size: item.size, color: item.color }),
    };
  });
  return { ...order, shipTo, items };
}

export type AdminProduct = {
  id: string;
  name: string;
  category: AdminProductCategory;
  fabric: string;
  gsm: number | null;
  priceKs: number;
  sizes: string[];
  status: AdminProductStatus;
  /** Measured chart in centimetres, per size (Plan P1 item 10). Empty until the owner measures a style. */
  sizeChart?: ProductSizeChart;
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

/**
 * Every place a banner can sit. Add an entry here and mount <AdSlotBanner slot="<id>" /> on the page:
 * the admin board lists it and the type below follows automatically.
 */
export const AD_SLOTS = [
  { id: "home-hero", label: "Home hero", page: "/", where: "Replaces the green hero while a banner is live", size: "1600 x 600" },
  { id: "home-strip", label: "Home strip", page: "/", where: "Under the category row", size: "1600 x 240" },
  { id: "home-lower", label: "Home lower", page: "/", where: "Between New Arrivals and the promo cards", size: "1600 x 240" },
  { id: "new-top", label: "New arrivals banner", page: "/new", where: "Under the Fresh Looks hero, above the grid", size: "1600 x 240" },
  { id: "products-top", label: "Shop banner", page: "/products", where: "Above the product grid", size: "1600 x 240" },
  { id: "guide-top", label: "Guide banner", page: "/guide", where: "Under the guide header, above the articles", size: "1600 x 240" },
] as const;

export type AdSlotId = (typeof AD_SLOTS)[number]["id"];

export type AdMediaType = "image" | "video";

export type AdFit = "cover" | "contain";

/**
 * An ad is one piece of media — a banner photo or a looping animation — plus when it runs.
 * There is no headline or button: the artwork carries the message (owner request 2026-11-21).
 */
export type AdminAd = {
  id: string;
  slot: AdSlotId;
  /** Internal name the admin uses to tell campaigns apart. */
  name: string;
  mediaType: AdMediaType;
  /** /path, https://… or a data:image/… URL for a picture; videos need a real URL. */
  mediaUrl: string;
  /** First frame of a video, also the fallback while it loads. */
  posterUrl: string;
  fit: AdFit;
  /** What the media shows, read by screen readers. */
  alt: string;
  /** Optional click-through; empty means the banner is not a link. */
  href: string;
  enabled: boolean;
  startsAt: string;
  endsAt: string;
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
  orderNoteTemplate: string;
  /**
   * Owner decision 2026-11-21: Inventory is blank-garment stock and does not cap sales, so a sale does
   * not move it by default. Switching this on makes a paid order consume its pieces and a refund put
   * them back (`lib/stock-movement.ts`).
   */
  deductStockOnSale: boolean;
};

/**
 * Plan §8.1: MH Fashion accepts a copyright claim, takes the design down and keeps a short record.
 * Owner answer 2026-11-21: an order that is already paid is still produced and delivered, so a
 * takedown never touches `orders` — it only stops new sales.
 */
export type AdminDesignTakedown = {
  id: string;
  designId: string;
  designName: string;
  claimant: string;
  note: string;
  admin: string;
  at: string;
};

/**
 * The canonical §4.1 attribute vocabulary. Posts may carry a narrower option list, but the chain
 * decides the order, the labels and which options new posts and the pricing grid offer.
 */
export type AdminAttributeDefinition = {
  key: AdminTshirtPostAttributeKey;
  label: string;
  options: string[];
  enabled: boolean;
};

export const ADMIN_COURIERS = ["MH Rider", "Royal Express", "City Link", "Nay Pyi Taw Gate"] as const;
export type AdminCourier = (typeof ADMIN_COURIERS)[number];
export type AdminDeliveryStatus = "In transit" | "Delivered" | "Returned";

/**
 * One delivery handed to a courier (Plan §16 P2, Delivery Settlement Report). `feeKs` is what the
 * shopper paid for shipping, `costKs` what MH Fashion owes the courier, so the margin is per row.
 */
export type AdminDelivery = {
  id: string;
  orderId: string;
  courier: AdminCourier;
  township: string;
  handedAt: string;
  status: AdminDeliveryStatus;
  feeKs: number;
  costKs: number;
  settledAt: string | null;
  settledBy: string | null;
};

/** Points economy and membership (Plan §9). */
export type AdminPointsRule = {
  dailyGrant: number;
  dailyExpiryHours: number;
  imageCost: number;
  purchasePointsPerUnit: number;
};

export type AdminTier = {
  id: string;
  name: string;
  minSpendKs: number;
  discountPercent: number;
};

export type AdminMilestoneTrigger = "quantity" | "orders" | "spend";

/** A threshold a shopper crosses on one order: how much they bought, or how many orders they placed. */
export type AdminMilestone = {
  id: string;
  label: string;
  trigger: AdminMilestoneTrigger;
  threshold: number;
  benefit: "points" | "discount";
  value: number;
  enabled: boolean;
};

export type AdminLoyalty = {
  rules: AdminPointsRule;
  tiers: AdminTier[];
  milestones: AdminMilestone[];
};

/** Jersey panel mapping (Plan §4.4): one worn photo plus a quad per garment region. */
export const JERSEY_PANEL_KEYS = ["front-left", "front-right", "left-sleeve", "right-sleeve", "collar", "back"] as const;
export type JerseyPanelKey = (typeof JERSEY_PANEL_KEYS)[number];
export const JERSEY_REQUIRED_PANELS: JerseyPanelKey[] = ["front-left", "front-right", "back"];
export type JerseyPoint = { x: number; y: number };
/** Corners run top-left, top-right, bottom-right, bottom-left, as a percentage of the worn photo. */
export type JerseyPanel = { key: JerseyPanelKey; view: "front" | "back"; corners: [JerseyPoint, JerseyPoint, JerseyPoint, JerseyPoint] };
export type JerseyStyle = {
  id: string;
  name: string;
  wornPhoto: string | null;
  panels: JerseyPanel[];
  updatedAt: string;
};

export type AdminDemoData = {
  version: 1;
  orders: AdminOrder[];
  products: AdminProduct[];
  stock: Record<string, Record<string, number>>;
  designs: AdminDesign[];
  designTakedowns: AdminDesignTakedown[];
  /** Messages written through `/contact` (Plan P1 item 10). The shop reads them in Admin → Messages. */
  contactMessages: ContactMessage[];
  attributeChain: AdminAttributeDefinition[];
  /** Plan §4.1 cascade as data, so Attribute Management can change it without a code change. */
  attributeCascade: AttributeCascadeRule[];
  deliveries: AdminDelivery[];
  loyalty: AdminLoyalty;
  /** The customer's own points events (Plan §9); the economy in `loyalty` is what they obey. */
  loyaltyLedger: LoyaltyEntry[];
  jerseyStyles: JerseyStyle[];
  tshirtPosts: AdminTshirtPost[];
  productPrices: AdminProductPriceRow[];
  priceHistory: AdminPriceHistoryEntry[];
  promotions: AdminPromotion[];
  ads: AdminAd[];
  /** How long each banner stays up when a place has several live ones. */
  adsRotationSeconds: number;
  team: AdminTeamMember[];
  settings: AdminSettings;
};

export const ADMIN_MODULES: { id: AdminModuleId; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "orders", label: "Orders" },
  { id: "products", label: "Products" },
  { id: "designs", label: "Designs" },
  { id: "posts", label: "Posts" },
  { id: "ads", label: "Ads" },
  { id: "pricing", label: "Pricing" },
  { id: "attributes", label: "Attributes" },
  { id: "settlements", label: "Settlements" },
  { id: "loyalty", label: "Loyalty" },
  { id: "jersey", label: "Jersey" },
  { id: "customers", label: "Customers" },
  { id: "inventory", label: "Inventory" },
  { id: "promotions", label: "Promotions" },
  { id: "reports", label: "Reports" },
  { id: "messages", label: "Messages" },
  { id: "settings", label: "Settings" },
];

export const APPAREL_CATEGORIES: AdminProductCategory[] = ["T-Shirt", "Hoodie", "Polo", "Jersey"];
export const APPAREL_SIZES = ["S", "M", "L", "XL", "2XL"];
export const ONE_SIZE = ["One size"];

const DAY_MS = 24 * 60 * 60 * 1000;

export function formatKs(value: number) {
  return `Ks ${Math.round(value).toLocaleString("en-US")}`;
}

/**
 * The shop keeps one clock. Timestamps are stored as UTC ISO strings and every admin screen shows
 * them in Myanmar time (UTC+6:30, no daylight saving), so a laptop in Yangon, a phone abroad and the
 * server render all print the same hour and file an order under the same day.
 */
export const YANGON_TIME_ZONE = "Asia/Yangon";

const yangonDayKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: YANGON_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
});

export function formatAdminDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { timeZone: YANGON_TIME_ZONE, day: "2-digit", month: "short", year: "numeric" });
}

export function formatAdminDateTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", { timeZone: YANGON_TIME_ZONE, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
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

export const MAX_ORDER_REPRINTS = 20;

/**
 * Records one run of the press sheet. A second run is a reprint: the shop needs to see who sent it
 * to the printer and when, so a wrong file cannot be blamed on the press without a record.
 */
export function recordOrderReprint(order: AdminOrder, by: string, at: Date = new Date()): AdminOrder {
  const entry: AdminOrderReprint = { at: at.toISOString(), by: by.trim() || "Admin" };
  return { ...order, reprints: [...(order.reprints ?? []), entry].slice(-MAX_ORDER_REPRINTS) };
}

/** How many times the press sheet has been sent to a printer; 0 means it has not been printed yet. */
export function orderPrintRuns(order: AdminOrder) {
  return order.reprints?.length ?? 0;
}

export function lastOrderReprint(order: AdminOrder): AdminOrderReprint | null {
  const list = order.reprints ?? [];
  return list.length ? list[list.length - 1] : null;
}

export function replaceOrder(data: AdminDemoData, order: AdminOrder): AdminDemoData {
  return { ...data, orders: data.orders.map((entry) => (entry.id === order.id ? order : entry)) };
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

// Orders are filed by the Yangon day, not the UTC day: an order placed at 00:30 in Yangon belongs to
// that morning's sheet, and UTC keys put it on yesterday. Reading the day from the device clock filed
// the same order differently on a phone that had travelled or a server rendering in UTC.
export function adminDayKey(value: string | number | Date): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return yangonDayKeyFormat.format(date);
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
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" });
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
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const stamp = now - offset * DAY_MS;
    buckets.push({
      date: adminDayKey(stamp),
      label: new Date(stamp).toLocaleDateString("en-GB", { timeZone: YANGON_TIME_ZONE, day: "2-digit", month: "short" }),
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
  | "knit"
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

// Labels follow Plan §4.1 (Print Method / Fabric Type / Knit Structure / MH Cuttings). The
// stored keys are unchanged so existing posts keep their combinations.
// The price book's vocabulary comes from `editor-attributes`, the module the editor header reads,
// so a size or colour offered in one place is never missing in the other (plan E15, interim until
// Attribute Management drives both from the database). Fit and Sleeve are price-book only.
export const TSHIRT_POST_ATTRIBUTES: AdminTshirtPostAttribute[] = [
  { key: "size", label: "Size", options: [...SIZE_OPTIONS] },
  { key: "material", label: "Fabric Type", options: [...FABRIC_TYPE_OPTIONS] },
  { key: "knit", label: "Knit Structure", options: [...KNIT_STRUCTURE_OPTIONS] },
  { key: "fit", label: "Fit Type", options: ["Regular", "Oversized", "Slim"] },
  { key: "color", label: "Color", options: [...COLOR_LABELS] },
  { key: "sleeve", label: "Sleeve", options: ["Short Sleeve", "Long Sleeve"] },
  { key: "gsm", label: "GSM", options: [...GSM_OPTIONS] },
  { key: "cutting", label: "MH Cuttings", options: [...MH_CUTTINGS_OPTIONS] },
  { key: "print", label: "Print Method", options: [...PRINT_METHOD_OPTIONS] },
];

/** Built-in chain used for new demo data and as the reset target. */
export function createSeedAttributeChain(): AdminAttributeDefinition[] {
  return TSHIRT_POST_ATTRIBUTES.map((attribute) => ({
    key: attribute.key,
    label: attribute.label,
    options: [...attribute.options],
    enabled: DEFAULT_TSHIRT_DRAFT_ATTRIBUTES.includes(attribute.key),
  }));
}

export function tshirtAttributeLabel(key: AdminTshirtPostAttributeKey) {
  return TSHIRT_POST_ATTRIBUTES.find((attribute) => attribute.key === key)?.label ?? key;
}

export type AdminTshirtPostPriceRow = {
  id: string;
  options: Partial<Record<AdminTshirtPostAttributeKey, string>>;
  priceKs: number;
  /** Bumped on every save; a save carrying an older version is rejected (Plan §4.5.1). */
  version?: number;
  updatedBy?: string;
  updatedAt?: string;
};

/** Product scope prices one row per stocked size; the catalogue price seeds it. */
export type AdminProductPriceRow = {
  productId: string;
  size: string;
  priceKs: number;
  version: number;
  updatedBy: string;
  updatedAt: string;
};

export type AdminPriceHistoryEntry = {
  id: string;
  scopeKind: "post" | "product";
  scopeId: string;
  options: Partial<Record<AdminTshirtPostAttributeKey, string>>;
  oldPriceKs: number | null;
  newPriceKs: number;
  actor: string;
  at: string;
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
// Stored posts keep their old option strings ("Cotton", "Standard", "Screen Print"). They are
// mapped onto the §4.1 vocabulary on read so a saved post does not show a value the chain no
// longer offers.
const LEGACY_POST_OPTION_VALUES: Record<string, string> = {
  Cotton: "Combed Cotton",
  "Premium Cotton": "Compact Combed Cotton",
  Blend: "Combed Cotton",
  Standard: "Crew Neck",
  "Raw Edge": "V-Neck",
  Raglan: "Round Neck",
  "Screen Print": "DTF",
};

export function normalizeTshirtPostOptions(post: AdminTshirtPost): AdminTshirtPost {
  let changed = false;
  const attributes = post.attributes.map((attribute) => {
    const known = TSHIRT_POST_ATTRIBUTES.find((entry) => entry.key === attribute.key);
    if (!known) return attribute;
    const options = [...new Set(attribute.options.map((option) => LEGACY_POST_OPTION_VALUES[option] ?? option))]
      .filter((option) => known.options.includes(option) || attribute.key === "gsm");
    const next = { ...attribute, label: known.label, options: options.length ? options : known.options };
    if (next.label !== attribute.label || next.options.join("\u0000") !== attribute.options.join("\u0000")) changed = true;
    return next;
  });
  const prices = post.prices.map((row) => {
    const options = Object.fromEntries(
      Object.entries(row.options).map(([key, value]) => [key, (value && LEGACY_POST_OPTION_VALUES[value]) || value]),
    );
    if (Object.keys(options).some((key) => options[key] !== row.options[key as AdminTshirtPostAttributeKey])) changed = true;
    return { ...row, options };
  });
  // Identity stays stable for an already-normalised post, so the store does not hand out a new
  // object on every read.
  return changed ? { ...post, attributes, prices } : post;
}

export function tshirtPostDraftFrom(
  post?: AdminTshirtPost,
  chain: AdminTshirtPostAttribute[] = TSHIRT_POST_ATTRIBUTES,
): AdminTshirtPostDraft {
  return {
    title: post?.title ?? "",
    description: post?.description ?? "",
    svg: post?.svg ?? null,
    attributes: chain.map((attribute) => {
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
    return normalizeTshirtPostOptions(post as AdminTshirtPost);
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
  return normalizeTshirtPostOptions({
    id: legacy.id,
    title: legacy.title ?? "Untitled post",
    description: legacy.description ?? "",
    svg: legacy.svg ?? null,
    attributes,
    prices,
    status: legacy.status ?? "Draft",
    createdAt: legacy.createdAt ?? new Date().toISOString(),
    publishedAt: legacy.publishedAt ?? null,
  });
}

// ---------------------------------------------------------------- designs

/** Hides the design and keeps the claim record. Paid orders are deliberately left untouched. */
export function recordDesignTakedown(
  data: AdminDemoData,
  entry: { designId: string; claimant: string; note: string; admin: string; at?: string },
): AdminDemoData {
  const design = data.designs.find((candidate) => candidate.id === entry.designId);
  if (!design) return data;
  const record: AdminDesignTakedown = {
    id: `takedown-${entry.designId}-${Date.parse(entry.at ?? "") || Date.now()}`,
    designId: design.id,
    designName: design.name,
    claimant: entry.claimant.trim(),
    note: entry.note.trim(),
    admin: entry.admin,
    at: entry.at ?? new Date().toISOString(),
  };
  return {
    ...setDesignStatus(data, design.id, "Hidden"),
    designTakedowns: [record, ...data.designTakedowns],
  };
}

export function designTakedownsFor(data: AdminDemoData, designId: string): AdminDesignTakedown[] {
  return data.designTakedowns.filter((entry) => entry.designId === designId);
}

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
    // The date input works in Yangon days, whatever zone the device is set to.
    startsAt: promotion ? adminDayKey(promotion.startsAt) : adminDayKey(now),
    endsAt: promotion ? adminDayKey(promotion.endsAt) : adminDayKey(now + 30 * DAY_MS),
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
  const start = new Date(`${draft.startsAt}T00:00:00+06:30`).getTime();
  const end = new Date(`${draft.endsAt}T23:59:59+06:30`).getTime();
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
    // A promotion runs from midnight to midnight in Yangon, not in the device's zone.
    startsAt: new Date(`${draft.startsAt}T00:00:00+06:30`).toISOString(),
    endsAt: new Date(`${draft.endsAt}T23:59:59+06:30`).toISOString(),
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

const SEED_TOWNSHIPS = ["Hlaing", "Mayangone", "Chan Aye Thar Zan", "Pyigyidagun", "Mingalar Taung Nyunt"];
const SEED_ADDRESSES = [
  "No. 24, 3rd floor, Baho Road",
  "Room 7B, Inya Condo, Pyay Road",
  "No. 118, 62nd Street",
  "No. 9, Yadanar Lane, 78th Street",
  "No. 45/A, Thiri Mingalar 4th Street",
];

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

/** Two worn jerseys with the quads the catalog preview and the post-edit mockup share. */
export function createSeedJerseyStyles(now: number): JerseyStyle[] {
  const stamp = new Date(now).toISOString();
  const front = (left: number, right: number, top: number, bottom: number) => [
    { x: left, y: top }, { x: right, y: top }, { x: right, y: bottom }, { x: left, y: bottom },
  ] as JerseyPanel["corners"];
  return [
    {
      id: "jersey-home",
      name: "MH Sport Home",
      wornPhoto: "jersey-mockups/jersey-home/worn_photo.png",
      updatedAt: stamp,
      panels: [
        { key: "front-left", view: "front", corners: front(30, 49, 30, 62) },
        { key: "front-right", view: "front", corners: front(51, 70, 30, 62) },
        { key: "left-sleeve", view: "front", corners: front(17, 29, 26, 44) },
        { key: "right-sleeve", view: "front", corners: front(71, 83, 26, 44) },
        { key: "collar", view: "front", corners: front(42, 58, 22, 29) },
        { key: "back", view: "back", corners: front(28, 72, 28, 70) },
      ],
    },
    {
      id: "jersey-away",
      name: "MH Sport Away",
      wornPhoto: "jersey-mockups/jersey-away/worn_photo.png",
      updatedAt: stamp,
      panels: [
        { key: "front-left", view: "front", corners: front(29, 48, 31, 63) },
        { key: "front-right", view: "front", corners: front(52, 71, 31, 63) },
        { key: "left-sleeve", view: "front", corners: front(16, 28, 27, 45) },
        { key: "right-sleeve", view: "front", corners: front(72, 84, 27, 45) },
        { key: "collar", view: "front", corners: front(41, 59, 23, 30) },
        { key: "back", view: "back", corners: front(27, 73, 29, 71) },
      ],
    },
  ];
}

/** Plan §9: 300 daily (they expire), 100 per generated image, +50 per purchased piece (kept). */
export function createSeedLoyalty(): AdminLoyalty {
  return {
    rules: { dailyGrant: 300, dailyExpiryHours: 24, imageCost: 100, purchasePointsPerUnit: 50 },
    tiers: [
      { id: "tier-member", name: "Member", minSpendKs: 0, discountPercent: 0 },
      { id: "tier-silver", name: "Silver", minSpendKs: 100_000, discountPercent: 3 },
      { id: "tier-gold", name: "Gold", minSpendKs: 200_000, discountPercent: 6 },
    ],
    milestones: [
      { id: "milestone-first-order", label: "First order", trigger: "orders", threshold: 1, benefit: "points", value: 100, enabled: true },
      { id: "milestone-three-pieces", label: "Three pieces in one order", trigger: "quantity", threshold: 3, benefit: "points", value: 150, enabled: true },
      { id: "milestone-100k", label: "Spend Ks 100,000", trigger: "spend", threshold: 100000, benefit: "discount", value: 5, enabled: true },
    ],
  };
}

const DELIVERY_STAGES: AdminOrderStage[] = ["Handed to Delivery", "Out for Delivery", "Delivered", "Refunded"];

function createSeedDeliveries(orders: AdminOrder[]): AdminDelivery[] {
  const handed = orders.filter((order) => DELIVERY_STAGES.includes(order.stage));
  return handed.map((order, index) => {
    const courier = ADMIN_COURIERS[index % ADMIN_COURIERS.length];
    const units = order.items.reduce((total, item) => total + item.quantity, 0);
    const feeKs = 2000 + units * 500;
    const costKs = courier === "MH Rider" ? 1200 + units * 350 : 1500 + units * 400;
    const handedAt = new Date(new Date(order.placedAt).getTime() + 36 * 3600_000).toISOString();
    const status: AdminDeliveryStatus = order.stage === "Refunded" ? "Returned" : order.stage === "Delivered" ? "Delivered" : "In transit";
    const settled = index % 3 === 0;
    return {
      id: `delivery-${order.id.replace("#", "")}`,
      orderId: order.id,
      courier,
      township: order.shipTo?.township ?? "Yangon",
      handedAt,
      status,
      feeKs,
      costKs,
      settledAt: settled ? new Date(new Date(handedAt).getTime() + 3 * 24 * 3600_000).toISOString() : null,
      settledBy: settled ? "MH Fashion Owner" : null,
    };
  });
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
        { key: "material", label: "Fabric Type", options: ["Combed Cotton", "Compact Combed Cotton"] },
        { key: "fit", label: "Fit Type", options: ["Regular"] },
        { key: "color", label: "Colour", options: ["Black", "White", "Sand"] },
        { key: "print", label: "Print Method", options: ["DTF", "Sublimation"] },
      ],
      prices: [
        { id: "price-peacock-1", options: { size: "S", material: "Combed Cotton", fit: "Regular", color: "Black", print: "DTF" }, priceKs: 21000 },
        { id: "price-peacock-2", options: { size: "M", material: "Combed Cotton", fit: "Regular", color: "Black", print: "DTF" }, priceKs: 22000 },
        { id: "price-peacock-3", options: { size: "M", material: "Compact Combed Cotton", fit: "Regular", color: "Black", print: "DTF" }, priceKs: 25000 },
        { id: "price-peacock-4", options: { size: "XL", material: "Combed Cotton", fit: "Regular", color: "White", print: "DTF" }, priceKs: 24000 },
        // Sublimation is polyester-only (§4.1), so the seeded rows stay on DTF.
        { id: "price-peacock-5", options: { size: "XL", material: "Compact Combed Cotton", fit: "Regular", color: "Sand", print: "DTF" }, priceKs: 31000 },
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
        { key: "gsm", label: "GSM", options: ["240 GSM"] },
        { key: "cutting", label: "MH Cuttings", options: ["V-Neck"] },
        { key: "print", label: "Print Method", options: ["Sublimation"] },
      ],
      prices: [
        { id: "price-mandalay-1", options: { size: "M", fit: "Oversized", color: "Black", gsm: "240 GSM", cutting: "V-Neck", print: "Sublimation" }, priceKs: 27000 },
        { id: "price-mandalay-2", options: { size: "L", fit: "Oversized", color: "Navy", gsm: "240 GSM", cutting: "V-Neck", print: "Sublimation" }, priceKs: 29000 },
        { id: "price-mandalay-3", options: { size: "2XL", fit: "Oversized", color: "Black", gsm: "240 GSM", cutting: "V-Neck", print: "Sublimation" }, priceKs: 31000 },
      ],
      status: "Draft",
      createdAt: daysAgo(2),
      publishedAt: null,
    },
  ];
}

/** Default time each banner stays up when a place holds several live ones. */
export const DEFAULT_ADS_ROTATION_SECONDS = 8;
export const ADS_ROTATION_CHOICES = [4, 6, 8, 12, 20, 30] as const;

export function normalizeAdsRotationSeconds(value: unknown): number {
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return DEFAULT_ADS_ROTATION_SECONDS;
  return Math.min(120, Math.max(2, Math.round(seconds)));
}

/** No seeded ads: an ad is artwork the owner supplies, so the module starts empty. */
export function createSeedAds(): AdminAd[] {
  return [];
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
    const color = SEED_COLORS[Math.floor(random() * SEED_COLORS.length)];
    const designName = SEED_DESIGN_NAMES[Math.floor(random() * SEED_DESIGN_NAMES.length)];
    const apparel = APPAREL_CATEGORIES.includes(product.category);
    orders.push({
      id: `#MH${1100 - index}`,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      shipTo: {
        name: customer.name,
        phone: customer.phone,
        address: SEED_ADDRESSES[index % SEED_ADDRESSES.length],
        township: SEED_TOWNSHIPS[index % SEED_TOWNSHIPS.length],
        city: index % 3 === 0 ? "Mandalay" : "Yangon",
      },
      items: [{
        productId: product.id,
        name: product.name,
        size,
        color,
        quantity,
        unitPriceKs: product.priceKs,
        material: product.fabric,
        gsm: product.gsm,
        fit: apparel ? (index % 2 === 0 ? "Oversized" : "Regular") : "Standard",
        sleeve: apparel ? (index % 3 === 0 ? "Long Sleeve" : "Short Sleeve") : "—",
        printMethod: (["DTF", "Sublimation", "Screen print"] as const)[index % 3],
        design: seedOrderDesign(designName, color, index + 1, { name: product.name, category: product.category, size, color }),
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

  const productPrices: AdminProductPriceRow[] = products.flatMap((product) => product.sizes.map((size) => ({
    productId: product.id,
    size,
    priceKs: product.priceKs,
    version: 1,
    updatedBy: "Seed",
    updatedAt: new Date(now - 30 * DAY_MS).toISOString(),
  })));

  return {
    version: 1,
    orders,
    products,
    stock,
    designs,
    designTakedowns: [],
    contactMessages: [],
    attributeChain: createSeedAttributeChain(),
    attributeCascade: DEFAULT_CASCADE_RULES.map((rule) => ({ ...rule, allowed: [...rule.allowed] })),
    deliveries: createSeedDeliveries(orders),
    loyalty: createSeedLoyalty(),
    loyaltyLedger: [],
    jerseyStyles: createSeedJerseyStyles(now),
    tshirtPosts: createSeedTshirtPosts(now).map(normalizeTshirtPostOptions),
    productPrices,
    priceHistory: [],
    promotions,
    ads: createSeedAds(),
    adsRotationSeconds: DEFAULT_ADS_ROTATION_SECONDS,
    team,
    settings: {
      storeName: "MH Fashion",
      supportEmail: "support@mhfashion.com",
      supportPhone: "+95 9 000 112 233",
      usdRateKs: 4300,
      lowStockThreshold: 12,
      orderNoteTemplate: "Checked by the print desk before hand-off.",
      deductStockOnSale: false,
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
        const products = (Array.isArray(parsed.products) ? parsed.products : []).map((product) => ({
          ...product,
          sizeChart: normalizeSizeChart(product.sizeChart),
        }));
        const orders = parsed.orders.map((order) => ({
          ...backfillOrderPrintSpec(order, products),
          refundRequests: normalizeRefundRequests(order.refundRequests),
        }));
        cache = {
          ...parsed,
          designTakedowns: Array.isArray(parsed.designTakedowns) ? parsed.designTakedowns : [],
          contactMessages: normalizeContactMessages(parsed.contactMessages),
          attributeChain: Array.isArray(parsed.attributeChain) && parsed.attributeChain.length
            ? parsed.attributeChain
            : createSeedAttributeChain(),
          attributeCascade: normalizeCascadeRules(parsed.attributeCascade),
          deliveries: Array.isArray(parsed.deliveries) ? parsed.deliveries : createSeedDeliveries(orders),
          loyalty: parsed.loyalty?.rules && Array.isArray(parsed.loyalty.tiers) && Array.isArray(parsed.loyalty.milestones)
            ? parsed.loyalty
            : createSeedLoyalty(),
          loyaltyLedger: normalizeLoyaltyLedger(
            parsed.loyaltyLedger,
            parsed.loyalty?.rules ?? createSeedLoyalty().rules,
          ),
          // Settings saved before a field existed take the seed value for it, so an older store cannot
          // read `deductStockOnSale` as undefined and quietly skip the rule.
          settings: { ...createAdminDemoData().settings, ...(parsed.settings ?? {}) },
          jerseyStyles: Array.isArray(parsed.jerseyStyles) && parsed.jerseyStyles.length
            ? parsed.jerseyStyles
            : createSeedJerseyStyles(Date.now()),
          productPrices: Array.isArray(parsed.productPrices) ? parsed.productPrices : [],
          priceHistory: Array.isArray(parsed.priceHistory) ? parsed.priceHistory : [],
          // Ads saved before the media-only model (headline/body) are dropped rather than half-rendered.
          ads: Array.isArray(parsed.ads)
            ? parsed.ads.filter((ad) => ad?.mediaType === "image" || ad?.mediaType === "video")
            : createSeedAds(),
          adsRotationSeconds: normalizeAdsRotationSeconds(parsed.adsRotationSeconds),
          orders,
          tshirtPosts: Array.isArray(parsed.tshirtPosts)
            ? parsed.tshirtPosts.map(normalizeTshirtPost)
            : createSeedTshirtPosts(Date.now()).map(normalizeTshirtPostOptions),
        };
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
