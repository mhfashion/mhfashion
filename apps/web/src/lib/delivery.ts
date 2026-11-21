import type { AdminOrder, AdminOrderItem } from "@/lib/admin-demo-data";

/**
 * The JSON MH Delivery receives to price a job. Everything the courier needs to quote is in
 * here — who receives it, where, how to reach them and how heavy the parcel is — so the quote
 * request never depends on the browser having the order drawer open.
 *
 * Shape is a superset of what MH Delivery asked for: `consignee` carries the name, phone and
 * the address broken into line / township / city, `parcels[].items` carries what is being
 * shipped, and `totals` carries the cash-on-delivery amount.
 */
export const MH_DELIVERY_QUOTE_ENDPOINT = process.env.NEXT_PUBLIC_MH_DELIVERY_URL ?? "";

export type DeliveryAddress = {
  line1: string;
  township: string;
  city: string;
};

export type DeliveryConsignee = {
  name: string;
  phone: string;
  email: string;
  address: DeliveryAddress;
};

export type DeliveryParcelItem = {
  product: string;
  productId: string;
  size: string;
  colour: string;
  quantity: number;
  weightGrams: number;
};

export type DeliveryParcel = {
  items: DeliveryParcelItem[];
  units: number;
  weightGrams: number;
  /** Largest side in cm — couriers price bulky parcels differently. */
  longestSideCm: number;
};

export type DeliveryQuoteRequest = {
  reference: string;
  requestedAt: string;
  merchant: { name: string; phone: string; address: string };
  consignee: DeliveryConsignee;
  parcels: DeliveryParcel[];
  totals: { units: number; weightGrams: number; codAmountKs: number; cod: boolean };
  payment: string;
  notes: string;
};

/** Rough shipping weight per piece, by product type. Only used when the catalogue is silent. */
const UNIT_WEIGHT_GRAMS: Record<string, number> = {
  "t-shirt": 250,
  hoodie: 550,
  bag: 300,
  cup: 400,
  cap: 150,
  "phone cover": 120,
};

export const DEFAULT_UNIT_WEIGHT_GRAMS = 300;

/** Parcel packing: a folded garment is about 30 x 25 cm, a cup or bag box is bigger. */
const LONGEST_SIDE_CM: Record<string, number> = {
  "t-shirt": 30,
  hoodie: 36,
  bag: 38,
  cup: 34,
  cap: 28,
  "phone cover": 20,
};

export const DEFAULT_LONGEST_SIDE_CM = 32;

function productKey(item: AdminOrderItem): string {
  return (item.name ?? "").trim().toLowerCase();
}

export function unitWeightGrams(item: Pick<AdminOrderItem, "name">): number {
  return UNIT_WEIGHT_GRAMS[productKey(item as AdminOrderItem)] ?? DEFAULT_UNIT_WEIGHT_GRAMS;
}

export function longestSideCm(item: Pick<AdminOrderItem, "name">): number {
  return LONGEST_SIDE_CM[productKey(item as AdminOrderItem)] ?? DEFAULT_LONGEST_SIDE_CM;
}

export const MH_DELIVERY_MERCHANT = {
  name: "MH Fashion",
  phone: "+95 9 000 112 233",
  address: "Yangon, Myanmar",
} as const;

export function buildDeliveryQuoteRequest(
  order: AdminOrder,
  options: { merchant?: DeliveryQuoteRequest["merchant"]; requestedAt?: string } = {},
): DeliveryQuoteRequest {
  const shipTo = order.shipTo;
  const items = order.items.map((item) => ({
    product: item.name,
    productId: item.productId,
    size: item.size,
    colour: item.color,
    quantity: item.quantity,
    weightGrams: unitWeightGrams(item) * item.quantity,
  }));

  const units = items.reduce((total, item) => total + item.quantity, 0);
  const weightGrams = items.reduce((total, item) => total + item.weightGrams, 0);

  return {
    reference: order.id,
    requestedAt: options.requestedAt ?? new Date().toISOString(),
    merchant: options.merchant ?? { ...MH_DELIVERY_MERCHANT },
    consignee: {
      name: shipTo?.name ?? order.customerName,
      phone: shipTo?.phone ?? order.customerPhone,
      email: order.customerEmail,
      address: {
        line1: shipTo?.address ?? "",
        township: shipTo?.township ?? "",
        city: shipTo?.city ?? "",
      },
    },
    parcels: [
      {
        items,
        units,
        weightGrams,
        longestSideCm: Math.max(0, ...order.items.map((item) => longestSideCm(item))),
      },
    ],
    totals: {
      units,
      weightGrams,
      cod: order.payment === "Cash on Delivery",
      codAmountKs: order.payment === "Cash on Delivery" ? orderTotal(order) : 0,
    },
    payment: order.payment,
    notes: order.note,
  };
}

/** Same payload as a file, ready to hand to MH Delivery. */
export function deliveryQuoteJson(order: AdminOrder): string {
  return JSON.stringify(buildDeliveryQuoteRequest(order), null, 2);
}

export function deliveryFileName(order: AdminOrder): string {
  return `delivery-${order.id.replace(/[^A-Za-z0-9-]+/g, "").toLowerCase() || "order"}.json`;
}

export function downloadDeliveryJson(order: AdminOrder): void {
  const blob = new Blob([deliveryQuoteJson(order)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = deliveryFileName(order);
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function orderTotal(order: AdminOrder): number {
  return order.items.reduce((total, item) => total + item.unitPriceKs * item.quantity, 0);
}
