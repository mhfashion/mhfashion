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
  const localRequire = (id) => {
    if (id.startsWith("@/")) return loadModule(`apps/web/src/${id.slice(2)}.ts`);
    if (id.startsWith(".")) return loadModule(path.relative(path.join(__dirname, ".."), path.join(path.dirname(sourcePath), `${id}.ts`)));
    return require(id);
  };
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

test("the catalog query reads the folded search_text column and ranks the answer", async () => {
  const requests = [];
  const rows = [
    { id: "p3", name: "Abstract Butterfly Print", slug: "abstract-butterfly-print", image_url: null, is_new: false, product_type: "T-Shirt", sub_brand: "MH", is_customizable: "full" },
    { id: "p2", name: "Butterfly Hoodie", slug: "butterfly-hoodie", image_url: null, is_new: false, product_type: "Hoodie", sub_brand: "MH", is_customizable: "full" },
    { id: "p1", name: "Butterfly", slug: "butterfly", image_url: null, is_new: false, product_type: "T-Shirt", sub_brand: "MH", is_customizable: "full" },
  ];
  const server = http.createServer((request, response) => {
    requests.push(request.url);
    response.setHeader("content-type", "application/json");
    if (request.url.includes("product_price_ranges")) {
      response.end(JSON.stringify([{ product_id: "p1", price_min_ks: 21000, price_max_ks: 25000 }]));
      return;
    }
    response.end(JSON.stringify(rows));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  process.env.NEXT_PUBLIC_SUPABASE_URL = `http://127.0.0.1:${port}`;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

  try {
    const results = await products.searchProducts("butterfly");
    assert.deepEqual(results.map((product) => product.slug), ["butterfly", "butterfly-hoodie", "abstract-butterfly-print"],
      "the exact name answers first, then the name that starts with the query, then the one that contains it");
    assert.equal(results[0].priceMinKs, 21000);

    const query = requests.find((url) => url.includes("/rest/v1/products"));
    assert.ok(query, "the products table is queried");
    const decoded = decodeURIComponent(query);
    assert.match(decoded, /search_text=ilike\.%butterfly%/, "one column holds every searchable field");
    assert.match(decoded, /limit=80/, "a wider page is fetched so the ranking can choose");
    assert.equal(decoded.includes("or=("), false, "no three-column or() filter");
  } finally {
    server.close();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  }
});

test("a shop that has not run migration 0009 still searches the old columns", async () => {
  const requests = [];
  const server = http.createServer((request, response) => {
    requests.push(request.url);
    response.setHeader("content-type", "application/json");
    if (request.url.includes("search_text=")) {
      response.statusCode = 400;
      response.end(JSON.stringify({ code: "42703", message: "column products.search_text does not exist" }));
      return;
    }
    if (request.url.includes("product_price_ranges")) {
      response.end(JSON.stringify([]));
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
    assert.deepEqual(results.map((product) => product.slug), ["butterfly-effect"]);

    const fallback = requests.map((url) => decodeURIComponent(url)).find((url) => url.includes("or=("));
    assert.ok(fallback, "the client retries without the new column");
    assert.match(fallback, /name\.ilike\.%butterfly%/);
    assert.match(fallback, /sub_brand\.ilike\.%butterfly%/);
    assert.match(fallback, /product_type\.ilike\.%butterfly%/);
    assert.match(fallback, /limit=80/);
    const filter = fallback.match(/or=\(([^)]*)\)/);
    assert.ok(filter, "the fallback is a single or() filter");
    for (const clause of filter[1].split(",")) {
      assert.match(clause, /^(name|sub_brand|product_type)\.ilike\.%[^,%()]+%$/, `unsafe clause: ${clause}`);
    }
  } finally {
    server.close();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  }
});

test("a typo falls back to the trigram search and says so", async () => {
  const requests = [];
  const server = http.createServer((request, response) => {
    let body = "";
    request.on("data", (chunk) => (body += chunk));
    request.on("end", () => {
      requests.push({ url: request.url, body });
      response.setHeader("content-type", "application/json");
      if (request.url.includes("/rest/v1/rpc/search_products_fuzzy")) {
        response.end(JSON.stringify([{ id: "p1", name: "Butterfly Effect", slug: "butterfly-effect", image_url: null, is_new: false, product_type: "T-Shirt", sub_brand: "MH", is_customizable: "full" }]));
        return;
      }
      if (request.url.includes("product_price_ranges")) {
        response.end(JSON.stringify([]));
        return;
      }
      response.end(JSON.stringify([]));
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  process.env.NEXT_PUBLIC_SUPABASE_URL = `http://127.0.0.1:${port}`;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

  try {
    const outcome = await products.searchCatalog("buterfly");
    assert.deepEqual(outcome.products.map((product) => product.slug), ["butterfly-effect"]);
    assert.equal(outcome.approximate, true, "the page has to say these are close matches");
    const rpc = requests.find((entry) => entry.url.includes("search_products_fuzzy"));
    assert.ok(rpc, "the exact search found nothing, so the fuzzy function is asked");
    const payload = JSON.parse(rpc.body);
    assert.equal(payload.p_term, "buterfly");
    assert.equal(payload.p_limit, 80);
  } finally {
    server.close();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  }
});

test("the fuzzy search is not asked for a two-letter term, nor when it is missing", async () => {
  const requests = [];
  const server = http.createServer((request, response) => {
    requests.push(request.url);
    response.setHeader("content-type", "application/json");
    if (request.url.includes("/rest/v1/rpc/search_products_fuzzy")) {
      response.statusCode = 404;
      response.end(JSON.stringify({ code: "PGRST202", message: "Could not find the function public.search_products_fuzzy" }));
      return;
    }
    response.end(JSON.stringify([]));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  process.env.NEXT_PUBLIC_SUPABASE_URL = `http://127.0.0.1:${port}`;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

  try {
    const short = await products.searchCatalog("te");
    assert.deepEqual(short, { products: [], approximate: false });
    assert.equal(requests.some((url) => url.includes("search_products_fuzzy")), false, "two letters are not a typo search");

    const missing = await products.searchCatalog("buterfly");
    assert.deepEqual(missing, { products: [], approximate: false }, "a shop without migration 0010 still answers");
  } finally {
    server.close();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  }
});

test("the result groups have their own caps and live in the address", () => {
  const caps = loadModule("apps/web/src/lib/search-caps.ts");
  assert.deepEqual(caps.SEARCH_CAPS, { products: 40, guides: 10 }, "a design is posted with its product, so it is not a group");
  assert.equal(caps.readSearchType(undefined), "products");
  assert.equal(caps.readSearchType("guides"), "guides");
  assert.equal(caps.readSearchType("designs"), "products", "a designs tab is no longer a group");
  assert.equal(caps.readSearchType("posters"), "products", "an unknown group falls back to products");
  assert.equal(caps.searchHref("tee", "products"), "/search?q=tee");
  assert.equal(caps.searchHref("tee", "guides"), "/search?q=tee&type=guides");
  assert.equal(caps.searchHref("", "guides"), "/search?type=guides");
  assert.equal(caps.searchHref("", "products"), "/search");
});

test("the search page and both header fields are wired", () => {
  const read = (relativePath) => readFileSync(path.join(__dirname, "..", relativePath), "utf8");
  const page = read("apps/web/src/app/search/page.tsx");
  for (const marker of ["data-search-form", "data-search-results", "data-search-result", "data-search-empty", "data-search-idle", "SearchField", "SearchTabs", "normalizeSearchQuery", "searchCatalog", "robots: { index: false, follow: true }"]) {
    assert.ok(page.includes(marker), `search page is missing ${marker}`);
  }
  // The field and the tab strip are client components so their labels follow the chosen language.
  assert.ok(read("apps/web/src/components/SearchField.tsx").includes('name="q"'), "the field still submits q");
  assert.ok(read("apps/web/src/components/SearchField.tsx").includes('event.key !== "Escape"'), "Esc clears the field");
  assert.ok(read("apps/web/src/components/SearchTabs.tsx").includes("data-search-tab"), "the tabs keep their markers");
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

test("a product is found by a tag or its category, not only by its name", async () => {
  const row = { id: "p9", name: "Classic T-shirt", slug: "classic-tee", image_url: null, is_new: false, product_type: "T-Shirt", sub_brand: "MH Fashion", is_customizable: "full", tags: ["unisex", "summer"] };
  const server = http.createServer((request, response) => {
    response.setHeader("content-type", "application/json");
    if (request.url.includes("product_price_ranges")) return response.end(JSON.stringify([]));
    if (request.url.includes("/rest/v1/products")) return response.end(JSON.stringify([row]));
    response.end(JSON.stringify([]));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  process.env.NEXT_PUBLIC_SUPABASE_URL = `http://127.0.0.1:${port}`;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

  try {
    const byTag = await products.searchCatalog("summer");
    assert.deepEqual(byTag.products.map((product) => product.slug), ["classic-tee"], "the tag is part of the ranked text");
    assert.deepEqual(byTag.products[0].tags, ["unisex", "summer"], "the card can show what it matched");
    const byCategory = await products.searchCatalog("t-shirt");
    assert.deepEqual(byCategory.products.map((product) => product.slug), ["classic-tee"]);
    const miss = await products.searchCatalog("winter coat");
    assert.deepEqual(miss.products, [], "a word that is in neither the name, the category nor a tag does not match");
  } finally {
    server.close();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  }
});

test("a shop that has not run migration 0009 still searches without tags", async () => {
  const requests = [];
  const server = http.createServer((request, response) => {
    requests.push(request.url);
    response.setHeader("content-type", "application/json");
    if (request.url.includes("select=") && request.url.includes("tags")) {
      response.statusCode = 400;
      return response.end(JSON.stringify({ code: "42703", message: "column products.tags does not exist" }));
    }
    if (request.url.includes("product_price_ranges")) return response.end(JSON.stringify([]));
    if (request.url.includes("/rest/v1/products")) {
      return response.end(JSON.stringify([{ id: "p1", name: "Classic T-shirt", slug: "classic-tee", image_url: null, is_new: false, product_type: "T-Shirt", sub_brand: "MH", is_customizable: "full" }]));
    }
    response.end(JSON.stringify([]));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  process.env.NEXT_PUBLIC_SUPABASE_URL = `http://127.0.0.1:${port}`;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

  try {
    const outcome = await products.searchCatalog("classic");
    assert.deepEqual(outcome.products.map((product) => product.slug), ["classic-tee"]);
    assert.equal(outcome.products[0].tags, undefined);
    assert.ok(requests.filter((url) => url.includes("tags")).length >= 1, "tags were asked for first");
  } finally {
    server.close();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  }
});
