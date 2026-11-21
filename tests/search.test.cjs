const assert = require("node:assert/strict");
const http = require("node:http");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const loadedModules = new Map();

function loadModule(relativePath) {
  const sourcePath = path.join(__dirname, "..", relativePath);
  const cached = loadedModules.get(sourcePath);
  if (cached) return cached.exports;
  const compiled = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: sourcePath,
  }).outputText;
  const loaded = { exports: {} };
  loadedModules.set(sourcePath, loaded);
  const localRequire = (id) => (id.startsWith("@/") ? loadModule(`apps/web/src/${id.slice(2)}.ts`) : require(id));
  new Function("module", "exports", "require", compiled)(loaded, loaded.exports, localRequire);
  return loaded.exports;
}

const products = loadModule("apps/web/src/lib/products.ts");

test("the search term is reduced to something PostgREST cannot misread", () => {
  const normalize = products.normalizeSearchQuery;
  assert.equal(normalize("  butterfly   effect "), "butterfly effect");
  assert.equal(normalize("t-shirt"), "t-shirt");
  assert.equal(normalize("a,b(c)*d"), "a b c d", "commas and brackets break or() and are removed");
  assert.equal(normalize("100%"), "100", "a bare % would turn into a wildcard");
  assert.equal(normalize("under_score"), "under score");
  assert.equal(normalize("quote'&.+"), "quote'&.+", "safe marks survive");
  assert.equal(normalize(null), "");
  assert.equal(normalize(undefined), "");
  assert.equal(normalize("x".repeat(200)).length, 60);
  assert.equal(normalize("အင်္ကျီ"), "အင်္ကျီ", "Myanmar text is kept");
});

test("a one-character or empty term never reaches the catalog", async () => {
  assert.deepEqual(await products.searchProducts(""), []);
  assert.deepEqual(await products.searchProducts("a"), []);
  assert.deepEqual(await products.searchProducts("   "), []);
});

test("the catalog query asks for name, line and product type in one request", async () => {
  const requests = [];
  const server = http.createServer((request, response) => {
    requests.push(request.url);
    response.setHeader("content-type", "application/json");
    if (request.url.includes("product_price_ranges")) {
      response.end(JSON.stringify([{ product_id: "p1", price_min_ks: 21000, price_max_ks: 25000 }]));
      return;
    }
    response.end(JSON.stringify([{ id: "p1", name: "Butterfly Effect", slug: "butterfly-effect", image_url: null, is_new: true, product_type: "T-Shirt", sub_brand: "MH", is_customizable: "full" }]));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  process.env.NEXT_PUBLIC_SUPABASE_URL = `http://127.0.0.1:${port}`;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

  try {
    const results = await products.searchProducts("butterfly");
    assert.equal(results.length, 1);
    assert.equal(results[0].slug, "butterfly-effect");
    assert.equal(results[0].priceMinKs, 21000);

    const query = requests.find((url) => url.includes("/rest/v1/products"));
    assert.ok(query, "the products table is queried");
    const decoded = decodeURIComponent(query);
    assert.match(decoded, /name\.ilike\.%butterfly%/);
    assert.match(decoded, /sub_brand\.ilike\.%butterfly%/);
    assert.match(decoded, /product_type\.ilike\.%butterfly%/);
    assert.match(decoded, /limit=40/);
    const filter = decoded.match(/or=\(([^)]*)\)/);
    assert.ok(filter, "the query is a single or() filter");
    for (const clause of filter[1].split(",")) {
      assert.match(clause, /^(name|sub_brand|product_type)\.ilike\.%[^,%()]+%$/, `unsafe clause: ${clause}`);
    }
  } finally {
    server.close();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  }
});

test("the search page and both header fields are wired", () => {
  const read = (relativePath) => readFileSync(path.join(__dirname, "..", relativePath), "utf8");
  const page = read("apps/web/src/app/search/page.tsx");
  for (const marker of ["data-search-form", "data-search-results", "data-search-result", "data-search-empty", "data-search-idle", 'name="q"', "normalizeSearchQuery", "searchProducts", "robots: { index: false, follow: true }"]) {
    assert.ok(page.includes(marker), `search page is missing ${marker}`);
  }
  const header = read("apps/web/src/components/HeaderActions.tsx");
  assert.match(header, /data-header-search="desktop"/);
  assert.match(header, /data-header-search="compact"/);
  assert.match(header, /router\.push\(`\/search\?q=\$\{encodeURIComponent\(term\)\}`\)/);

  const mobileNav = read("apps/web/src/components/MobileNav.tsx");
  assert.match(mobileNav, /<form action="\/search" method="get" role="search" data-header-search="mobile"/, "the phone search must not submit to another page");
  assert.ok(!/action="\/mh-fashion" method="get"[^>]*data-header-search/.test(mobileNav));
  assert.equal((header.match(/value=\{searchTerm\}/g) || []).length, 2, "both search inputs are controlled");
  assert.equal((header.match(/<input/g) || []).length, 2, "the header has exactly two search inputs");
});

test("the route manifest lists /search", () => {
  const manifest = JSON.parse(readFileSync(path.join(__dirname, "..", "apps/web/public/manus-routes.json"), "utf8"));
  assert.ok(manifest.routes.some((route) => route.path === "/search"));
});
