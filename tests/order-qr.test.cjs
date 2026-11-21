const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const QRCode = require("qrcode");

const loadedModules = new Map();

function loadModule(relativePath) {
  const sourcePath = path.join(__dirname, "..", relativePath);
  const cached = loadedModules.get(sourcePath);
  if (cached) return cached.exports;
  const compiled = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: sourcePath,
  }).outputText;
  const loaded = { exports: {} };
  loadedModules.set(sourcePath, loaded);
  const localRequire = (id) => {
    if (id.startsWith("@/")) return loadModule(`apps/web/src/${id.slice(2)}.ts`);
    if (id.startsWith(".")) return loadModule(`apps/web/src/lib/${id.slice(2)}.ts`);
    return require(id);
  };
  new Function("module", "exports", "require", compiled)(loaded, loaded.exports, localRequire);
  return loaded.exports;
}

const qr = loadModule("apps/web/src/lib/order-qr.ts");
const print = loadModule("apps/web/src/lib/order-print.ts");
const ORIGIN = "https://mhfashion.example";

const order = {
  id: "#MH9",
  customerName: "Thura Aung",
  customerEmail: "thura@example.com",
  customerPhone: "09 771 220 431",
  items: [{ productId: "p1", name: "Classic T-shirt", size: "M", color: "Black", quantity: 1, unitPriceKs: 21000 }],
  stage: "Pending Payment",
  payment: "KBZPay",
  placedAt: "2026-11-21T02:30:00.000Z",
  note: "",
};

test("the code points at the order in the admin panel, or says the id when there is no site", () => {
  assert.equal(qr.orderQrPayload("#MH1101", ORIGIN), `${ORIGIN}/admin/orders?order=%23MH1101`);
  assert.equal(qr.orderQrPayload("  #MH1101  ", ORIGIN), `${ORIGIN}/admin/orders?order=%23MH1101`);
  assert.equal(qr.orderQrPayload("#MH1101", undefined), "MH Fashion order #MH1101");
  assert.throws(() => qr.orderQrPayload("   ", ORIGIN), /order id/);
});

test("the QR is one self-contained vector, not an image to fetch", () => {
  const svg = qr.qrSvg("MH Fashion order #MH1101");
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.equal((svg.match(/<path/g) || []).length, 1, "every dark module shares one path");
  assert.ok(!svg.includes("<script"));
  assert.ok(!svg.includes("<image"));
  assert.match(svg, /shape-rendering="crispEdges"/, "modules must not be blurred by smoothing");
  assert.match(svg, /aria-label="QR code"/);

  const viewBox = svg.match(/viewBox="0 0 (\d+) \1"/);
  assert.ok(viewBox, "square viewBox");
  const size = QRCode.create("MH Fashion order #MH1101", { errorCorrectionLevel: "M" }).modules.size;
  assert.equal(Number(viewBox[1]), (size + 4 * 2) * 4, "modules + quiet zone at 4 units each");
});

test("the same text always draws the same code, and different text does not", () => {
  const first = qr.qrSvg("order #MH1");
  const again = qr.qrSvg("order #MH1");
  const other = qr.qrSvg("order #MH2");
  assert.equal(first, again);
  assert.notEqual(first, other);
  assert.throws(() => qr.qrSvg("  "), /something to encode/);
});

test("the drawn modules are exactly the encoder's dark modules", () => {
  const text = `${ORIGIN}/admin/orders?order=%23MH1101`;
  const { modules } = QRCode.create(text, { errorCorrectionLevel: "M" });
  const dark = modules.data.reduce((total, value) => total + (value ? 1 : 0), 0);
  const svg = qr.qrSvg(text, { moduleSize: 1, margin: 0 });
  assert.equal((svg.match(/M\d+ \d+h1v1h-1z/g) || []).length, dark);
});

test("the print sheet carries the code next to the order id", () => {
  const original = process.env.NEXT_PUBLIC_SITE_URL;
  try {
    process.env.NEXT_PUBLIC_SITE_URL = ORIGIN;
    const html = print.buildOrderPrintSheetHtml(order);
    assert.match(html, /<figure class="qr">/);
    assert.ok(html.includes("Scan to open this order"), "the caption says what scanning does");
    assert.ok(html.includes("viewBox"), "the code is drawn, not referenced");
    assert.match(html, /figure\.qr svg \{ width: 78px/);

    delete process.env.NEXT_PUBLIC_SITE_URL;
    const bare = print.buildOrderPrintSheetHtml(order);
    assert.ok(bare.includes("MH Fashion order #MH9"), "without a site the code still identifies the order");
    assert.ok(!bare.includes("Scan to open this order"));
  } finally {
    if (original === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = original;
  }
});
