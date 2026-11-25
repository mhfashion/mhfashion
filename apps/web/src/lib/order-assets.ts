// Plan §12.2.5 item 4 and §12.2.7: at Buy the server writes the frozen copy of what the press receives,
// once. A second write to an existing order key is refused, so an order can never be half-replaced.
import { buildAssetKey } from "./asset-keys";
import type { AssetStore } from "./asset-store";

/** The documents of an order, as `Doc/PRINT-BUNDLE.md` names them (the order id goes in the file name). */
export const ORDER_DOCUMENTS = [
  "print-sheet.html",
  "invoice.html",
  "print-spec.csv",
  "measurements.csv",
  "manifest.json",
  "delivery.json",
] as const;

export type OrderDocument = (typeof ORDER_DOCUMENTS)[number];

function splitName(name: string): { file: string; ext: string } {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? { file: name.slice(0, dot), ext: name.slice(dot + 1) } : { file: name, ext: "json" };
}

/** `print-sheet.html` for order `o-1` is `print-sheet-o-1.html`; `manifest.json` keeps its plain name. */
export function orderFileName(orderId: string, document: string): string {
  const { file, ext } = splitName(document);
  if (document === "manifest.json") return document;
  return `${file}-${orderId}.${ext}`;
}

/** `orders/<order-id>/<file>`, built from the order id and the document name. */
export function orderFileKey(orderId: string, document: string): string {
  const { file, ext } = splitName(orderFileName(orderId, document));
  return buildAssetKey("order-file", { id: orderId, file, ext });
}

/** `orders/<order-id>/designs/<design-id>-<look>.svg`, and the same with `-mockup` for the photo. */
export function orderDesignKey(orderId: string, designId: string, look: string, variant: "artwork" | "mockup" = "artwork"): string {
  const file = `${designId}-${look}${variant === "mockup" ? "-mockup" : ""}`;
  return buildAssetKey("order-design", { id: orderId, file, ext: "svg" });
}

export type OrderWrite = { written: string[]; refused: string[] };

/**
 * Write every document of an order that is not there yet. A key that already exists is refused (the
 * order was written before), and the answer names both lists so the caller can report it.
 */
export async function writeOrderFiles(
  store: AssetStore,
  orderId: string,
  files: { document: string; body: string; contentType?: string }[],
): Promise<OrderWrite> {
  const written: string[] = [];
  const refused: string[] = [];
  for (const file of files) {
    const key = orderFileKey(orderId, file.document);
    if (await store.head(key)) {
      refused.push(key);
      continue;
    }
    await store.putObject(key, file.body, {
      contentType: file.contentType ?? (file.document.endsWith(".html") ? "text/html; charset=utf-8" : file.document.endsWith(".csv") ? "text/csv; charset=utf-8" : "application/json; charset=utf-8"),
      cacheControl: "private, no-store",
    });
    written.push(key);
  }
  return { written, refused };
}
