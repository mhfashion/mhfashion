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
    return loadModule(path.relative(ROOT, path.join(path.dirname(sourcePath), `${specifier}.ts`)), cache);
  };
  new Function("module", "exports", "require", compiled)(loaded, loaded.exports, localRequire);
  return loaded.exports;
}

const admin = loadModule("apps/web/src/lib/admin-demo-data.ts");
const print = loadModule("apps/web/src/lib/order-print.ts");
const zipLib = loadModule("apps/web/src/lib/zip.ts");

const data = admin.createAdminDemoData(Date.now());

/** Minimal ZIP reader: enough to prove the archive a browser would download is well formed. */
function readZip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let index = bytes.length - 22; index >= 0; index -= 1) {
    if (view.getUint32(index, true) === 0x06054b50) {
      end = index;
      break;
    }
  }
  assert.notEqual(end, -1, "no end-of-central-directory record");
  const count = view.getUint16(end + 10, true);
  let cursor = view.getUint32(end + 16, true);
  const files = [];
  for (let index = 0; index < count; index += 1) {
    assert.equal(view.getUint32(cursor, true), 0x02014b50, "bad central directory entry");
    const method = view.getUint16(cursor + 10, true);
    const crc = view.getUint32(cursor + 16, true);
    const size = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));

    assert.equal(view.getUint32(localOffset, true), 0x04034b50, "bad local header");
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const content = bytes.subarray(start, start + size);
    assert.equal(method, 0, `${name} is not stored`);
    assert.equal(zipLib.crc32(content), crc, `${name} fails its CRC`);

    files.push({ name, size, content: new TextDecoder().decode(content) });
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

test("crc32 matches the reference value for a known string", () => {
  assert.equal(zipLib.crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
});

test("the order archive is a valid ZIP with a file per design", () => {
  const order = data.orders[0];
  const bytes = print.buildOrderArchive(order);
  assert.equal(new DataView(bytes.buffer, bytes.byteOffset).getUint32(0, true), 0x04034b50);

  const files = readZip(bytes);
  const names = files.map((file) => file.name);
  assert.equal(new Set(names).size, names.length, "duplicate entries");

  const stem = print.orderFileStem(order);
  assert.ok(names.includes(`print-sheet-${stem}.html`));
  assert.ok(names.includes(`print-spec-${stem}.csv`));
  assert.ok(names.includes("manifest.json"));

  const designs = print.orderDesignFiles(order);
  assert.ok(designs.length > 0);
  for (const design of designs) {
    assert.ok(names.includes(`designs/${design.fileName}`), `missing ${design.fileName}`);
    assert.ok(names.includes(`designs/${design.fileName.replace(/\.svg$/, "")}-mockup.svg`));
    const file = files.find((entry) => entry.name === `designs/${design.fileName}`);
    assert.equal(file.content, design.svg, "the SVG is written byte for byte");
    assert.match(file.content, /^<svg /);
    assert.ok(file.content.includes(`width="${design.printWidthCm}cm"`));
  }
});

test("the manifest carries the measurements the press needs", () => {
  const order = data.orders[0];
  const files = readZip(print.buildOrderArchive(order));
  const manifest = JSON.parse(files.find((file) => file.name === "manifest.json").content);

  assert.equal(manifest.order.id, order.id);
  assert.equal(manifest.order.customer.phone, order.customerPhone);
  assert.ok(manifest.order.shipTo.address);
  const item = manifest.items[0];
  assert.equal(item.product, order.items[0].name);
  assert.equal(item.size, order.items[0].size);
  assert.equal(item.material, order.items[0].material);
  assert.equal(item.gsm, order.items[0].gsm);

  const design = item.design;
  assert.equal(design.printWidthCm, order.items[0].design.printWidthCm);
  assert.ok(design.mockup.printAreaXCm >= 0);
  assert.equal(design.file, `designs/${order.items[0].design.fileName}`);
  assert.equal(design.layers.length, order.items[0].design.layers.length);
  for (const layer of design.layers) {
    assert.equal(typeof layer.xCm, "number");
    assert.equal(typeof layer.widthCm, "number");
    assert.ok(layer.widthCm > 0 && layer.heightCm > 0);
  }
  // The manifest points at files that really exist in the archive.
  const names = files.map((file) => file.name);
  assert.ok(names.includes(design.file));
  assert.ok(names.includes(design.mockupFile));
});

test("the archive also holds the printable sheet and the spec CSV", () => {
  const order = data.orders[0];
  const files = readZip(print.buildOrderArchive(order));
  const sheet = files.find((file) => file.name.endsWith(".html")).content;
  assert.ok(sheet.includes(order.id));
  assert.ok(sheet.includes("Print sheet"));
  assert.ok(sheet.includes(order.customerPhone));

  const csv = files.find((file) => file.name.endsWith(".csv")).content;
  const [header, first] = csv.split("\r\n");
  assert.equal(header, print.ORDER_PRINT_COLUMNS.join(","));
  assert.ok(first.startsWith(order.id));
});

test("an order without designs still archives its sheet and manifest", () => {
  const bare = {
    ...data.orders[0],
    items: [{ productId: "p", name: "Tote Bag", size: "One size", color: "Natural", quantity: 1, unitPriceKs: 16000 }],
  };
  const files = readZip(print.buildOrderArchive(bare));
  assert.deepEqual(files.map((file) => file.name).sort(), [
    `print-sheet-${print.orderFileStem(bare)}.html`,
    `print-spec-${print.orderFileStem(bare)}.csv`,
    "manifest.json",
  ].sort());
  const manifest = JSON.parse(files.find((file) => file.name === "manifest.json").content);
  assert.equal(manifest.items[0].design, null);
});

test("the drawer offers the ZIP next to the single SVG download", () => {
  const drawer = readFileSync(path.join(ROOT, "apps/web/src/components/admin/AdminOrders.tsx"), "utf8");
  assert.match(drawer, /downloadOrderArchive\(selected\)/);
  assert.match(drawer, /Print files ZIP/);
  assert.match(drawer, /downloadDesignFile\(design\)/);
});
