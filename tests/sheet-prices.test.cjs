const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function loadModule(relativePath) {
  const sourcePath = path.join(__dirname, "..", relativePath);
  const compiled = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: sourcePath,
  }).outputText;
  const loaded = { exports: {} };
  new Function("module", "exports", compiled)(loaded, loaded.exports);
  return loaded.exports;
}

const sheet = loadModule("apps/web/src/lib/sheet-prices.ts");
const admin = loadModule("apps/web/src/lib/admin-demo-data.ts");

const SHEET_CSV = [
  "Size,Material,Fit Type,Colour,Price",
  'XL,Cotton,Regular,Black,"24,000"',
  "XL,Cotton,Regular,Navy,24500",
  "2XL,Premium Cotton,Oversized,Black,Ks 28000",
].join("\n");

test("a share link becomes the CSV endpoint that needs no API key", () => {
  const url = sheet.sheetCsvUrl("https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789/edit#gid=123");
  assert.equal(url, "https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789/gviz/tq?tqx=out:csv&gid=123");
  assert.match(sheet.sheetCsvUrl("1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789"), /\/gviz\/tq\?tqx=out:csv$/);
});

test("a URL that already returns CSV is used as it is, and junk is rejected", () => {
  const csvUrl = "https://docs.google.com/spreadsheets/d/abc/export?format=csv&gid=0";
  assert.equal(sheet.sheetCsvUrl(csvUrl), csvUrl);
  assert.equal(sheet.sheetCsvUrl("not a link"), null);
  assert.equal(sheet.sheetCsvUrl(""), null);
  assert.equal(sheet.sheetCsvUrl("http://example.com/sheet.csv?format=csv"), null, "only https is accepted");
});

test("only Google hosts are fetched", () => {
  assert.equal(sheet.isGoogleSheetUrl("https://docs.google.com/spreadsheets/d/x/gviz/tq?tqx=out:csv"), true);
  assert.equal(sheet.isGoogleSheetUrl("https://evil.example.com/x"), false);
});

test("CSV quoting keeps commas and escaped quotes inside a cell", () => {
  const rows = sheet.parseCsv('a,b\n"1,000","say ""hi"""\n\n');
  assert.deepEqual(rows, [["a", "b"], ["1,000", 'say "hi"']]);
});

test("prices tolerate commas, currency text and decimals", () => {
  assert.equal(sheet.parsePriceCell("24,000"), 24000);
  assert.equal(sheet.parsePriceCell("Ks 24000"), 24000);
  assert.equal(sheet.parsePriceCell("24000.40"), 24000);
  assert.equal(sheet.parsePriceCell(""), null);
  assert.equal(sheet.parsePriceCell("free"), null);
  assert.equal(sheet.parsePriceCell("0"), null);
});

test("a priced sheet becomes one row per combination", () => {
  const result = sheet.parseSheetPrices(SHEET_CSV);
  assert.deepEqual(result.issues, []);
  assert.deepEqual(result.columns, ["size", "material", "fit", "color"]);
  assert.equal(result.rows.length, 3);
  assert.deepEqual(result.rows[0], { options: { size: "XL", material: "Cotton", fit: "Regular", color: "Black" }, priceKs: "24000" });
  assert.equal(result.rows[2].priceKs, "28000");
});

test("a missing price column or a broken row is reported, not silently dropped", () => {
  const noPrice = sheet.parseSheetPrices("Size,Colour\nXL,Black");
  assert.match(noPrice.issues[0], /No price column/);
  assert.equal(noPrice.rows.length, 0);

  const broken = sheet.parseSheetPrices("Size,Colour,Price\nXL,Black,24000\nXL,Navy,ask us\nXL,Black,25000");
  assert.equal(broken.rows.length, 1, "the unreadable row and the repeat are dropped");
  assert.match(broken.issues.join(" "), /Row 3: no usable price/);
  assert.match(broken.issues.join(" "), /already listed/);
});

test("the sheet's columns decide which attributes are sold", () => {
  const attributes = admin.TSHIRT_POST_ATTRIBUTES.map((attribute) => ({
    ...attribute,
    enabled: ["size", "material", "fit", "color", "sleeve"].includes(attribute.key),
  }));
  const { rows } = sheet.parseSheetPrices(SHEET_CSV);
  const merged = admin.mergeSheetPriceRows(attributes, rows);

  const enabled = merged.attributes.filter((attribute) => attribute.enabled).map((attribute) => attribute.key);
  assert.deepEqual(enabled, ["size", "material", "fit", "color"]);
  assert.match(merged.issues.join(" "), /Sleeve has no column/, "an attribute with no column cannot be priced from the sheet");

  const size = merged.attributes.find((attribute) => attribute.key === "size");
  assert.deepEqual(size.options, ["XL", "2XL"], "options follow the sheet, and XL is not duplicated");
  assert.equal(merged.prices.length, 3);
  assert.deepEqual(merged.prices[0].options, { size: "XL", material: "Cotton", fit: "Regular", color: "Black" });
  assert.equal(merged.prices[0].priceKs, "24000");
  assert.ok(merged.prices.every((row) => row.id), "every row gets an id");
});

test("the post editor posts the link to the route handler and merges the result", () => {
  const editor = readFileSync(path.join(__dirname, "..", "apps/web/src/components/admin/AdminPosts.tsx"), "utf8");
  assert.match(editor, /fetch\("\/api\/admin\/tshirt-prices"/);
  assert.match(editor, /mergeSheetPriceRows\(draft\.attributes, payload\.rows\)/);
  assert.match(editor, /data-post-sheet-url/);
  assert.match(editor, /data-post-sheet-result=\{sheetMessage\.tone\}/);

  const route = readFileSync(path.join(__dirname, "..", "apps/web/src/app/api/admin/tshirt-prices/route.ts"), "utf8");
  assert.match(route, /isGoogleSheetUrl\(csvUrl\)/, "the route must not fetch arbitrary hosts");
  assert.match(route, /readSheetPrices\(csvUrl\)/);
  assert.match(readFileSync(path.join(__dirname, "..", "apps/web/src/lib/sheet-prices.ts"), "utf8"), /parseSheetPrices\(csv\)/);
});

test("the fetch is stubbed so the route's error paths are covered", async () => {
  const good = await sheet.readSheetPrices("https://docs.google.com/x", async () => new Response(SHEET_CSV));
  assert.equal(good.ok, true);
  assert.equal(good.result.rows.length, 3);

  const forbidden = await sheet.readSheetPrices("https://docs.google.com/x", async () => new Response("nope", { status: 403 }));
  assert.equal(forbidden.ok, false);
  assert.equal(forbidden.status, 502);
  assert.match(forbidden.error, /anyone with the link/);

  const signIn = await sheet.readSheetPrices("https://docs.google.com/x", async () => new Response("<!DOCTYPE html><html>Sign in</html>"));
  assert.equal(signIn.ok, false);
  assert.match(signIn.error, /not shared publicly/);

  const offline = await sheet.readSheetPrices("https://docs.google.com/x", async () => { throw new Error("offline"); });
  assert.equal(offline.ok, false);
  assert.match(offline.error, /could not be reached/);
});

function loadRoute(stubs) {
  const sourcePath = path.join(__dirname, "..", "apps/web/src/app/api/admin/tshirt-prices/route.ts");
  const compiled = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: sourcePath,
  }).outputText;
  const loaded = { exports: {} };
  new Function("module", "exports", "require", compiled)(loaded, loaded.exports, (id) => {
    if (id === "@/lib/sheet-prices") return stubs;
    throw new Error(`unexpected import ${id}`);
  });
  return loaded.exports;
}

test("the route handler answers with rows, 400 and 502 as appropriate", async () => {
  const route = loadRoute({ ...sheet, readSheetPrices: async () => ({ ok: true, result: sheet.parseSheetPrices(SHEET_CSV) }) });

  const okResponse = await route.POST(new Request("http://localhost/api/admin/tshirt-prices", {
    method: "POST",
    body: JSON.stringify({ sheetUrl: "https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789/edit" }),
  }));
  assert.equal(okResponse.status, 200);
  const payload = await okResponse.json();
  assert.equal(payload.rows.length, 3);

  const junk = await route.POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ sheetUrl: "nope" }) }));
  assert.equal(junk.status, 400);
  assert.match((await junk.json()).error, /does not look like/);

  const failing = loadRoute({ ...sheet, readSheetPrices: async () => ({ ok: false, status: 502, error: "Google Sheets returned 404." }) });
  const failed = await failing.POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ sheetUrl: "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789" }) }));
  assert.equal(failed.status, 502);
  assert.match((await failed.json()).error, /404/);
});
