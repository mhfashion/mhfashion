const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const ROOT = path.join(__dirname, "..");

function loadModule(relativePath, cache = new Map()) {
  const sourcePath = path.join(ROOT, relativePath);
  if (cache.has(sourcePath)) return cache.get(sourcePath);
  const compiled = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: sourcePath,
  }).outputText;
  const loaded = { exports: {} };
  cache.set(sourcePath, loaded.exports);
  const localRequire = (specifier) => {
    if (!specifier.startsWith(".")) throw new Error(`unexpected import: ${specifier}`);
    const target = path.join(path.dirname(sourcePath), `${specifier}.ts`);
    return loadModule(path.relative(ROOT, target), cache);
  };
  new Function("module", "exports", "require", compiled)(loaded, loaded.exports, localRequire);
  return loaded.exports;
}

const admin = loadModule("apps/web/src/lib/admin-demo-data.ts");
const print = loadModule("apps/web/src/lib/order-print.ts");

const NOW = new Date(2026, 10, 21, 9, 0, 0).getTime();
const data = admin.createAdminDemoData(NOW);

function orderWith(overrides = {}) {
  return {
    id: "#MH1",
    customerName: "Thura Aung",
    customerEmail: "thura.aung@example.com",
    customerPhone: "+95 9 771 220 431",
    shipTo: { name: "Thura Aung", phone: "+95 9 771 220 431", address: "No. 24, Baho Road", township: "Hlaing", city: "Yangon" },
    items: [{
      productId: "product-classic-tee",
      name: "Classic T-shirt",
      size: "M",
      color: "Black",
      quantity: 2,
      unitPriceKs: 21000,
      material: "Combed Cotton",
      gsm: 180,
      fit: "Oversized",
      sleeve: "Short Sleeve",
      printMethod: "DTF",
      design: {
        id: "design-1",
        name: "Street Vibes",
        fileName: "street-vibes-black.svg",
        svg: admin.orderDesignArtwork("Street Vibes", "#2f7d32"),
        printWidthCm: 28,
        printHeightCm: 35,
        placement: "Front",
      },
    }],
    stage: "Printing",
    payment: "KBZPay",
    placedAt: new Date(NOW).toISOString(),
    note: "",
    ...overrides,
  };
}

test("every seeded order line carries the full print spec and a design file", () => {
  assert.ok(data.orders.length > 0);
  for (const order of data.orders) {
    assert.ok(order.shipTo, `${order.id} has no shipping address`);
    assert.ok(order.shipTo.address && order.shipTo.township && order.shipTo.city);
    for (const item of order.items) {
      assert.ok(item.material, `${order.id} line has no material`);
      assert.ok(item.fit, `${order.id} line has no fit`);
      assert.ok(item.sleeve, `${order.id} line has no sleeve`);
      assert.ok(item.printMethod, `${order.id} line has no print method`);
      assert.ok(item.gsm === null || typeof item.gsm === "number", `${order.id} line has a broken GSM`);
      const design = item.design;
      assert.ok(design, `${order.id} line has no design`);
      assert.match(design.fileName, /^[a-z0-9-]+\.svg$/);
      assert.match(design.svg, /^<svg /);
      assert.ok(design.printWidthCm > 0 && design.printHeightCm > 0);
      assert.ok(["Front", "Back", "Left chest", "Sleeve"].includes(design.placement));
    }
  }
});

test("the print CSV carries every column the press needs", () => {
  const rows = print.orderPrintRows(orderWith());
  assert.deepEqual(rows[0], [...print.ORDER_PRINT_COLUMNS]);
  assert.equal(rows.length, 2);

  const line = Object.fromEntries(rows[0].map((column, index) => [column, rows[1][index]]));
  assert.equal(line.Order, "#MH1");
  assert.equal(line.Product, "Classic T-shirt");
  assert.equal(line.Colour, "Black");
  assert.equal(line.Size, "M");
  assert.equal(line.Material, "Combed Cotton");
  assert.equal(line.GSM, 180);
  assert.equal(line.Fit, "Oversized");
  assert.equal(line.Sleeve, "Short Sleeve");
  assert.equal(line.Print, "DTF");
  assert.equal(line.Placement, "Front");
  assert.equal(line["Print size (cm)"], "28 × 35");
  assert.equal(line.Quantity, 2);
  assert.equal(line["Line total (Ks)"], 42000);
  assert.equal(line.Design, "Street Vibes");
  assert.equal(line["Design file"], "street-vibes-black.svg");
});

test("an order without a design still exports a complete row", () => {
  const bare = orderWith({ items: [{ productId: "p", name: "Tote Bag", size: "One size", color: "Natural", quantity: 1, unitPriceKs: 16000 }] });
  const [, line] = print.orderPrintRows(bare);
  assert.deepEqual(line.slice(7, 14), ["—", "—", "—", "—", "—", "—", "—"]);
  assert.equal(line[17], "No design");
  assert.equal(line[18], "—");
});

test("the print sheet contains the whole spec, the shipping address and the artwork", () => {
  const order = orderWith();
  const html = print.buildOrderPrintSheetHtml(order);
  for (const fragment of [
    "#MH1", "Thura Aung", "No. 24, Baho Road", "Hlaing", "Yangon",
    "Classic T-shirt", "Black", "M", "Combed Cotton", "180", "Oversized", "Short Sleeve",
    "DTF", "Front", "28 × 35 cm", "Street Vibes", "street-vibes-black.svg",
    "MH FASHION", "Print sheet",
  ]) {
    assert.ok(html.includes(fragment), `print sheet is missing ${fragment}`);
  }
  // The artwork itself rides along, encoded, so the file can be checked before printing.
  assert.ok(html.includes(encodeURIComponent(order.items[0].design.svg)));
  assert.ok(html.includes("data:image/svg+xml"));
  assert.ok(html.includes("Design files (1)"));
  assert.match(html, /@page \{ size: A4/);
});

test("the print sheet escapes text instead of injecting it", () => {
  const order = orderWith({ customerName: '<script>alert("x")</script>', note: "<b>bold</b>" });
  const html = print.buildOrderPrintSheetHtml(order);
  assert.equal(html.includes("<script>alert"), false);
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("&lt;b&gt;bold&lt;/b&gt;"));
});

test("design files are listed once per file name", () => {
  const design = orderWith().items[0].design;
  const order = orderWith({
    items: [
      { ...orderWith().items[0] },
      { ...orderWith().items[0], size: "L" },
    ],
  });
  assert.equal(print.orderDesignFiles(order).length, 1);
  assert.equal(print.orderDesignFiles(order)[0].fileName, design.fileName);
  assert.equal(print.orderDesignFiles(orderWith({ items: [{ ...orderWith().items[0], design: null }] })).length, 0);
});

test("the order drawer shows the print sheet and can open and save the files", () => {
  const drawer = readFileSync(path.join(ROOT, "apps/web/src/components/admin/AdminOrders.tsx"), "utf8");
  assert.match(drawer, /data-order-print-sheet/);
  assert.match(drawer, /Print sheet/);
  assert.match(drawer, /openOrderPrintSheet\(selected\)/);
  assert.match(drawer, /downloadDesignFile\(design\)/);
  assert.match(drawer, /data-order-design-preview/);
  assert.match(drawer, /orderPrintRows\(selected\)/);
  assert.match(drawer, /selected\.shipTo/);
  assert.equal(/productionRows/.test(drawer), false, "the old thin CSV is gone");
});

test("orders saved before the print sheet existed are backfilled on read", () => {
  const legacy = {
    ...orderWith({ shipTo: undefined }),
    items: [{ productId: "product-classic-tee", name: "Classic T-shirt", size: "L", color: "Navy", quantity: 1, unitPriceKs: 21000 }],
  };
  const filled = admin.backfillOrderPrintSpec(legacy, data.products);
  const item = filled.items[0];
  assert.equal(item.material, "Combed Cotton");
  assert.equal(item.gsm, 180);
  assert.equal(item.fit, "Oversized");
  assert.equal(item.sleeve, "Short Sleeve");
  assert.equal(item.printMethod, "DTF");
  assert.ok(item.design && item.design.svg.startsWith("<svg "));
  assert.match(item.design.fileName, /-navy\.svg$/);
  assert.deepEqual(filled.shipTo, {
    name: legacy.customerName,
    phone: legacy.customerPhone,
    address: "Address on file",
    township: "—",
    city: "Yangon",
  });

  // A complete order is left alone.
  const complete = orderWith();
  const untouched = admin.backfillOrderPrintSpec(complete, data.products);
  assert.equal(untouched.items[0], complete.items[0]);
  assert.equal(untouched.items[0].design.name, "Street Vibes");
});
