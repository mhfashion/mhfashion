import QRCode from "qrcode";
import { getSiteOrigin } from "@/lib/site";

/**
 * What the printed QR carries. With a configured origin it is a link that opens the order in the
 * orders board, which is what a phone on the shop floor can act on; without one it falls back to the
 * order id as text, because a relative URL is useless to a scanner.
 */
export function orderQrPayload(orderId: string, origin: string | undefined = getSiteOrigin()): string {
  const id = orderId.trim();
  if (!id) throw new Error("orderQrPayload needs an order id");
  if (!origin) return `MH Fashion order ${id}`;
  return `${origin}/admin/orders?order=${encodeURIComponent(id)}`;
}

export type QrSvgOptions = {
  /** Size of one module in SVG units; the sheet prints at 96dpi, so 4 gives a ~5.3mm code at version 3. */
  moduleSize?: number;
  /** Quiet zone in modules. Below 4 the scanner needs help. */
  margin?: number;
};

/**
 * A vector QR: crisp at print resolution, no canvas, no data URL, and nothing to fetch. Dark modules
 * are one path, so a 33x33 code stays a single element.
 */
export function qrSvg(text: string, options: QrSvgOptions = {}): string {
  const value = text.trim();
  if (!value) throw new Error("qrSvg needs something to encode");
  const moduleSize = Math.max(1, Math.round(options.moduleSize ?? 4));
  const margin = Math.max(0, Math.round(options.margin ?? 4));

  const { modules } = QRCode.create(value, { errorCorrectionLevel: "M" });
  const size = modules.size;
  const total = (size + margin * 2) * moduleSize;

  let path = "";
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      if (!modules.data[row * size + column]) continue;
      const x = (column + margin) * moduleSize;
      const y = (row + margin) * moduleSize;
      path += `M${x} ${y}h${moduleSize}v${moduleSize}h-${moduleSize}z`;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${total}" viewBox="0 0 ${total} ${total}" role="img" aria-label="QR code"><rect width="${total}" height="${total}" fill="#ffffff"/><path d="${path}" fill="#000000" shape-rendering="crispEdges"/></svg>`;
}
