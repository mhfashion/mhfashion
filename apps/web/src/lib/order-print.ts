import type { AdminOrder, AdminOrderDesign, AdminOrderItem } from "./admin-demo-data";
import {
  DESIGN_UNITS_PER_CM, buildMockupDiagramSvg, designLayerSize, formatAdminDateTime, formatKs,
  orderTotalKs, orderUnits,
} from "./admin-demo-data";
import { createZip, type ZipEntry } from "./zip";
import { deliveryFileName, deliveryQuoteJson } from "./delivery";

/**
 * Everything the print desk needs, one row per order line. Kept next to the print sheet so the
 * CSV export and the sheet cannot drift apart.
 */
export const ORDER_PRINT_COLUMNS = [
  "Order", "Placed", "Stage", "Payment",
  "Product", "Colour", "Size", "Material", "GSM", "Fit", "Sleeve", "Print", "Placement", "Print size (cm)",
  "Quantity", "Unit price (Ks)", "Line total (Ks)", "Design", "Design file", "Ink",
  "Print area (cm)", "Units/cm", "Layers", "Layer layout",
  "Mockup", "Garment (cm)", "Print area at (cm)",
] as const;

/** "Backdrop shape 5.6,3.5 16.8×15.4cm r0 s1" — the layer measurements in one CSV cell. */
export function designLayoutSummary(design: AdminOrderDesign): string {
  const units = design.unitsPerCm || DESIGN_UNITS_PER_CM;
  return design.layers
    .map((layer) => {
      const size = designLayerSize(layer, units);
      return `${layer.name} ${layer.kind} ${size.xCm},${size.yCm} ${size.widthCm}×${size.heightCm}cm r${layer.rotation} s${layer.scale}`;
    })
    .join(" | ");
}

export function orderItemPrintValues(order: AdminOrder, item: AdminOrderItem): (string | number)[] {
  return [
    order.id,
    formatAdminDateTime(order.placedAt),
    order.stage,
    order.payment,
    item.name,
    item.color,
    item.size,
    item.material ?? "—",
    item.gsm === null || item.gsm === undefined ? "—" : item.gsm,
    item.fit ?? "—",
    item.sleeve ?? "—",
    item.printMethod ?? "—",
    item.design?.placement ?? "—",
    item.design ? `${item.design.printWidthCm} × ${item.design.printHeightCm}` : "—",
    item.quantity,
    item.unitPriceKs,
    item.unitPriceKs * item.quantity,
    item.design?.name ?? "No design",
    item.design?.fileName ?? "—",
    item.design?.ink ?? "—",
    item.design ? `${item.design.printWidthCm} × ${item.design.printHeightCm}` : "—",
    item.design?.unitsPerCm ?? "—",
    item.design?.layers.length ?? 0,
    item.design ? designLayoutSummary(item.design) : "—",
    item.design?.mockup.name ?? "—",
    item.design ? `${item.design.mockup.garmentWidthCm} × ${item.design.mockup.garmentHeightCm}` : "—",
    item.design ? `${item.design.mockup.printAreaXCm} from left, ${item.design.mockup.printAreaYCm} from top` : "—",
  ];
}

export function orderPrintRows(order: AdminOrder): (string | number)[][] {
  return [[...ORDER_PRINT_COLUMNS], ...order.items.map((item) => orderItemPrintValues(order, item))];
}

/** Design files the print desk has to open for this order, de-duplicated by file name. */
export function orderDesignFiles(order: AdminOrder): AdminOrderDesign[] {
  const seen = new Set<string>();
  const files: AdminOrderDesign[] = [];
  for (const item of order.items) {
    const design = item.design;
    if (!design || seen.has(design.fileName)) continue;
    seen.add(design.fileName);
    files.push(design);
  }
  return files;
}

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? "—")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function specRows(item: AdminOrderItem): [string, string][] {
  const design = item.design;
  return [
    ["Product", item.name],
    ["Colour", item.color],
    ["Size", item.size],
    ["Material", item.material ?? "—"],
    ["GSM", item.gsm === null || item.gsm === undefined ? "—" : String(item.gsm)],
    ["Fit", item.fit ?? "—"],
    ["Sleeve", item.sleeve ?? "—"],
    ["Print method", item.printMethod ?? "—"],
    ["Placement", design?.placement ?? "—"],
    ["Print size", design ? `${design.printWidthCm} × ${design.printHeightCm} cm` : "—"],
    ["Ink", design?.ink ?? "—"],
    ["Artwork units", design ? `${design.unitsPerCm} per cm` : "—"],
    ["Mockup", design?.mockup.name ?? "—"],
    ["Garment size", design ? `${design.mockup.garmentWidthCm} × ${design.mockup.garmentHeightCm} cm` : "—"],
    ["Print area at", design ? `${design.mockup.printAreaXCm} cm from left · ${design.mockup.printAreaYCm} cm from top` : "—"],
    ["Quantity", String(item.quantity)],
    ["Design", design?.name ?? "No design"],
    ["Design file", design?.fileName ?? "—"],
  ];
}

/**
 * A standalone, printable A4 sheet: identity, shipping, the full spec of every line and the
 * design artwork itself, so the file can be checked before it reaches the press.
 */
export function buildOrderPrintSheetHtml(order: AdminOrder): string {
  const shipTo = order.shipTo;
  const items = order.items.map((item, index) => {
    const design = item.design;
    const rows = specRows(item)
      .map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`)
      .join("");
    const artwork = design
      ? `<img class="art" alt="${escapeHtml(design.fileName)}" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(design.svg)}" />`
      : `<p class="empty">No design file attached</p>`;
    const placementFigure = design
      ? `<figure class="design"><img class="mockup" alt="Print position on ${escapeHtml(design.mockup.name)}" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildMockupDiagramSvg(design))}" /><figcaption>${escapeHtml(design.placement)} · print at ${design.mockup.printAreaXCm} cm from left, ${design.mockup.printAreaYCm} cm from top</figcaption></figure>`
      : "";
    const layoutRows = design
      ? design.layers
        .map((layer) => {
          const size = designLayerSize(layer, design.unitsPerCm);
          return `<tr><td>${escapeHtml(layer.name)}</td><td>${escapeHtml(layer.kind)}</td><td>${size.xCm}</td><td>${size.yCm}</td><td>${size.widthCm} × ${size.heightCm}</td><td>${layer.rotation}°</td><td>${layer.scale}</td></tr>`;
        })
        .join("")
      : "";
    const layout = design
      ? `<h3>Layout · print area ${design.printWidthCm} × ${design.printHeightCm} cm (${design.unitsPerCm} units/cm)</h3>
        <table class="layout"><thead><tr><th>Layer</th><th>Type</th><th>X (cm)</th><th>Y (cm)</th><th>W × H (cm)</th><th>Rotation</th><th>Scale</th></tr></thead><tbody>${layoutRows}</tbody></table>`
      : "";
    return `<section class="item">
      <h2>Line ${index + 1} · ${escapeHtml(item.name)} · ${escapeHtml(item.color)} / ${escapeHtml(item.size)} · ×${item.quantity}</h2>
      <div class="line">
        <table class="spec">${rows}</table>
        <figure class="design">
          ${artwork}
          <figcaption>${design ? `${escapeHtml(design.name)}<br /><b>${escapeHtml(design.fileName)}</b>` : "—"}</figcaption>
        </figure>
        ${placementFigure}
      </div>
      ${layout}
    </section>`;
  }).join("");

  const files = orderDesignFiles(order);
  const fileList = files.length
    ? `<ul>${files.map((design) => `<li><b>${escapeHtml(design.fileName)}</b> — ${escapeHtml(design.name)} (${design.printWidthCm} × ${design.printHeightCm} cm, ${escapeHtml(design.placement)})</li>`).join("")}</ul>`
    : `<p class="empty">No design files on this order.</p>`;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>Print sheet ${escapeHtml(order.id)}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 11px/1.45 "Inter", Arial, sans-serif; color: #1d232b; }
  header { border-bottom: 2px solid #1d232b; padding-bottom: 8px; margin-bottom: 12px; }
  .brand { font-size: 16px; font-weight: 800; letter-spacing: .12em; }
  h1 { font-size: 18px; margin: 4px 0 2px; }
  .meta { color: #5c6673; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
  .card { border: 1px solid #d8dde3; border-radius: 6px; padding: 8px 10px; }
  .card h2 { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #6b7481; margin: 0 0 6px; }
  section.item { border: 1px solid #d8dde3; border-radius: 6px; padding: 10px; margin-bottom: 10px; page-break-inside: avoid; }
  section.item h2 { font-size: 12px; margin: 0 0 8px; }
  .line { display: flex; gap: 12px; align-items: flex-start; }
  table.spec { border-collapse: collapse; flex: 1; }
  table.spec th, table.spec td { text-align: left; padding: 2px 6px; border-bottom: 1px solid #eef1f4; vertical-align: top; }
  table.spec th { width: 42%; color: #6b7481; font-weight: 600; }
  figure.design { margin: 0; width: 150px; text-align: center; }
  figure.design .art { width: 140px; height: auto; border: 1px dashed #c9d0d8; }
  figure.design .mockup { width: 90px; height: auto; border: 1px solid #e2e7ec; }
  figure.design figcaption { font-size: 9px; color: #4a5461; margin-top: 4px; word-break: break-all; }
  .files li { margin-bottom: 2px; }
  h3 { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: #6b7481; margin: 10px 0 4px; }
  table.layout { width: 100%; border-collapse: collapse; font-size: 10px; }
  table.layout th, table.layout td { text-align: left; padding: 2px 6px; border-bottom: 1px solid #eef1f4; }
  table.layout th { color: #6b7481; font-weight: 600; }
  footer { margin-top: 10px; border-top: 1px solid #d8dde3; padding-top: 6px; color: #5c6673; }
  .totals { display: flex; justify-content: space-between; font-weight: 700; font-size: 12px; }
  .empty { color: #9aa2ae; font-style: italic; }
  .printbar { margin-bottom: 10px; }
  .printbar button { font: inherit; padding: 6px 12px; border-radius: 999px; border: 1px solid #4cae22; background: #eef8e6; color: #3f8c22; font-weight: 700; cursor: pointer; }
  @media print { .printbar { display: none; } }
</style></head>
<body>
<div class="printbar"><button type="button" onclick="window.print()">Print this sheet</button></div>
<header>
  <div class="brand">MH FASHION</div>
  <h1>Print sheet · Order ${escapeHtml(order.id)}</h1>
  <p class="meta">${escapeHtml(formatAdminDateTime(order.placedAt))} · ${escapeHtml(order.stage)} · ${escapeHtml(order.payment)}</p>
</header>
<div class="grid">
  <div class="card">
    <h2>Customer</h2>
    <p>${escapeHtml(order.customerName)}<br />${escapeHtml(order.customerEmail)}<br />${escapeHtml(order.customerPhone)}</p>
  </div>
  <div class="card">
    <h2>Ship to</h2>
    <p>${shipTo ? `${escapeHtml(shipTo.name)} · ${escapeHtml(shipTo.phone)}<br />${escapeHtml(shipTo.address)}<br />${escapeHtml(shipTo.township)}, ${escapeHtml(shipTo.city)}` : `${escapeHtml(order.customerName)}<br />${escapeHtml(order.customerPhone)}`}</p>
  </div>
</div>
${items}
<div class="card">
  <h2>Design files (${files.length})</h2>
  ${fileList}
</div>
<footer>
  <p class="totals"><span>${orderUnits(order)} unit${orderUnits(order) === 1 ? "" : "s"} · ${order.items.length} line${order.items.length === 1 ? "" : "s"}</span><span>${escapeHtml(formatKs(orderTotalKs(order)))}</span></p>
  ${order.note ? `<p><b>Print desk note:</b> ${escapeHtml(order.note)}</p>` : ""}
</footer>
</body></html>`;
}

/**
 * A printable receipt for the customer: what they bought, what it cost and where it goes. The
 * delivery line stays blank on purpose — the fee comes from MH Delivery, not from this sheet.
 */
export function buildOrderInvoiceHtml(order: AdminOrder): string {
  const shipTo = order.shipTo;
  const rows = order.items
    .map((item) => `<tr><td>${escapeHtml(item.name)}<br /><span class="sub">${escapeHtml(item.color)} · ${escapeHtml(item.size)}${item.material ? ` · ${escapeHtml(item.material)}` : ""}</span></td><td class="num">${item.quantity}</td><td class="num">${escapeHtml(formatKs(item.unitPriceKs))}</td><td class="num">${escapeHtml(formatKs(item.unitPriceKs * item.quantity))}</td></tr>`)
    .join("");
  const total = orderTotalKs(order);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>Receipt ${escapeHtml(order.id)}</title>
<style>
  @page { size: A5; margin: 10mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 11px/1.5 "Inter", Arial, sans-serif; color: #1d232b; }
  header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1d232b; padding-bottom: 8px; }
  .brand { font-size: 16px; font-weight: 800; letter-spacing: .12em; }
  h1 { font-size: 14px; margin: 6px 0 0; }
  .meta { color: #5c6673; text-align: right; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th, td { text-align: left; padding: 5px 4px; border-bottom: 1px solid #eef1f4; vertical-align: top; }
  th { font-size: 9px; text-transform: uppercase; letter-spacing: .07em; color: #6b7481; }
  .num { text-align: right; white-space: nowrap; }
  .sub { color: #6b7481; font-size: 10px; }
  .totals { margin-top: 10px; }
  .totals div { display: flex; justify-content: space-between; padding: 2px 0; }
  .totals .grand { border-top: 2px solid #1d232b; margin-top: 4px; padding-top: 5px; font-weight: 800; font-size: 13px; }
  .note { color: #5c6673; margin-top: 10px; }
  .printbar { margin-bottom: 8px; }
  .printbar button { font: inherit; padding: 5px 12px; border-radius: 999px; border: 1px solid #4cae22; background: #eef8e6; color: #3f8c22; font-weight: 700; cursor: pointer; }
  @media print { .printbar { display: none; } }
</style></head>
<body>
<div class="printbar"><button type="button" onclick="window.print()">Print / save as PDF</button></div>
<header>
  <div>
    <div class="brand">MH FASHION</div>
    <h1>Receipt · ${escapeHtml(order.id)}</h1>
  </div>
  <div class="meta">
    ${escapeHtml(formatAdminDateTime(order.placedAt))}<br />
    ${escapeHtml(order.stage)}<br />
    ${escapeHtml(order.payment)}
  </div>
</header>
<table>
  <thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Amount</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="totals">
  <div><span>Subtotal</span><span>${escapeHtml(formatKs(total))}</span></div>
  <div><span>Delivery</span><span>Quoted by MH Delivery</span></div>
  <div class="grand"><span>Total paid</span><span>${escapeHtml(formatKs(total))}</span></div>
</div>
<p class="note">
  ${shipTo ? `<b>Deliver to</b><br />${escapeHtml(shipTo.name)} · ${escapeHtml(shipTo.phone)}<br />${escapeHtml(shipTo.address)}<br />${escapeHtml(shipTo.township)}, ${escapeHtml(shipTo.city)}` : `<b>Deliver to</b><br />${escapeHtml(order.customerName)}<br />${escapeHtml(order.customerPhone)}`}
</p>
<p class="note">Thank you for ordering from MH Fashion. Keep this receipt for exchanges within 7 days.</p>
</body></html>`;
}

/** Opens the receipt in a new window; the browser's print dialog saves it as a PDF. */
export function openOrderInvoice(order: AdminOrder): void {
  const win = window.open("", "_blank", "width=760,height=900");
  if (!win) return;
  win.document.write(buildOrderInvoiceHtml(order));
  win.document.close();
  win.focus();
  win.setTimeout(() => win.print(), 300);
}

/** Opens the sheet in a new window and sends it straight to the printer dialog. */
export function openOrderPrintSheet(order: AdminOrder): void {
  const win = window.open("", "_blank", "width=900,height=1000");
  if (!win) return;
  win.document.write(buildOrderPrintSheetHtml(order));
  win.document.close();
  win.focus();
  win.setTimeout(() => win.print(), 300);
}

/** Saves one design file so the press can open it in Illustrator or a RIP. */
export function downloadDesignFile(design: AdminOrderDesign): void {
  const blob = new Blob([design.svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = design.fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Inline preview URL for the drawer thumbnail (no object URL to clean up). */
export function designPreviewSrc(design: AdminOrderDesign): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(design.svg)}`;
}

/** Folder-safe file name for an order, e.g. "MH1086". */
export function orderFileStem(order: AdminOrder): string {
  return order.id.replace(/[^A-Za-z0-9-]+/g, "").toLowerCase() || "order";
}

/**
 * Everything the print desk receives for one order: each design as an SVG (plus its mockup
 * diagram), the printable sheet, the spec CSV and a JSON manifest of the measurements.
 */
export function orderArchiveEntries(order: AdminOrder): ZipEntry[] {
  const designs = orderDesignFiles(order);
  const entries: ZipEntry[] = [
    { name: `print-sheet-${orderFileStem(order)}.html`, data: buildOrderPrintSheetHtml(order) },
    { name: `invoice-${orderFileStem(order)}.html`, data: buildOrderInvoiceHtml(order) },
    { name: `print-spec-${orderFileStem(order)}.csv`, data: orderPrintRows(order).map((row) => row.map(csvCell).join(",")).join("\r\n") },
    { name: "manifest.json", data: JSON.stringify(orderManifest(order), null, 2) },
    { name: deliveryFileName(order), data: deliveryQuoteJson(order) },
  ];
  for (const design of designs) {
    entries.push({ name: `designs/${design.fileName}`, data: design.svg });
    entries.push({ name: `designs/${design.fileName.replace(/\.svg$/i, "")}-mockup.svg`, data: buildMockupDiagramSvg(design) });
  }
  return entries;
}

function csvCell(value: string | number): string {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** The order as data, with each design pointing at the file in the same archive. */
export function orderManifest(order: AdminOrder) {
  return {
    order: {
      id: order.id,
      placedAt: order.placedAt,
      stage: order.stage,
      payment: order.payment,
      note: order.note,
      customer: { name: order.customerName, email: order.customerEmail, phone: order.customerPhone },
      shipTo: order.shipTo ?? null,
      totals: { units: orderUnits(order), amountKs: orderTotalKs(order) },
    },
    items: order.items.map((item) => ({
      product: item.name,
      productId: item.productId,
      colour: item.color,
      size: item.size,
      quantity: item.quantity,
      unitPriceKs: item.unitPriceKs,
      material: item.material ?? null,
      gsm: item.gsm ?? null,
      fit: item.fit ?? null,
      sleeve: item.sleeve ?? null,
      printMethod: item.printMethod ?? null,
      design: item.design
        ? {
            name: item.design.name,
            ink: item.design.ink,
            placement: item.design.placement,
            printWidthCm: item.design.printWidthCm,
            printHeightCm: item.design.printHeightCm,
            unitsPerCm: item.design.unitsPerCm,
            mockup: item.design.mockup,
            file: `designs/${item.design.fileName}`,
            mockupFile: `designs/${item.design.fileName.replace(/\.svg$/i, "")}-mockup.svg`,
            layers: item.design.layers.map((layer) => ({ ...layer, ...designLayerSize(layer, item.design!.unitsPerCm) })),
          }
        : null,
    })),
  };
}

export function buildOrderArchive(order: AdminOrder): Uint8Array {
  return createZip(orderArchiveEntries(order));
}

/** Saves the whole order — design SVGs, sheet, CSV and manifest — as one ZIP. */
export function downloadOrderArchive(order: AdminOrder): void {
  const bytes = buildOrderArchive(order);
  const blob = new Blob([bytes as BlobPart], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${orderFileStem(order)}-print-files.zip`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
