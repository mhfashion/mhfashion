const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const lib = path.join(root, "apps/web/src/lib");

// Compile the existing TS modules in memory; no new runtime dependency or
// build artifact is needed. Only external services are replaced by fixtures.
function loadTypeScript(file, overrides = {}) {
  const source = readFileSync(file, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: file,
  }).outputText;
  const module = { exports: {} };
  const localRequire = (name) => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name.startsWith(".")) {
      return loadTypeScript(path.resolve(path.dirname(file), `${name}.ts`), overrides);
    }
    return require(name);
  };
  new Function("require", "module", "exports", compiled)(localRequire, module, module.exports);
  return module.exports;
}

function useEnvironment(t, values) {
  const original = {};
  for (const key of Object.keys(values)) {
    original[key] = process.env[key];
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  }
  t.after(() => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

const metadataModule = () => loadTypeScript(path.join(lib, "guide-metadata.ts"));

test("guide metadata omits guessed canonical origins", (t) => {
  useEnvironment(t, { NEXT_PUBLIC_SITE_URL: undefined });
  const metadata = metadataModule().guideMetadata({ title: "Guide", description: "Handbook", path: "/guide" });
  assert.equal(metadata.alternates, undefined);
  assert.equal(metadata.openGraph.url, undefined);
  assert.equal(metadata.twitter.card, "summary");
});

test("guide metadata uses an explicit production HTTPS origin", (t) => {
  useEnvironment(t, { NEXT_PUBLIC_SITE_URL: "https://store.example.com/" });
  const metadata = metadataModule().guideMetadata({ title: "Article", description: "Handbook", path: "/guide/example", article: true, noindex: true });
  assert.equal(metadata.alternates.canonical, "https://store.example.com/guide/example");
  assert.equal(metadata.openGraph.url, metadata.alternates.canonical);
  assert.equal(metadata.openGraph.type, "article");
  assert.deepEqual(metadata.robots, { index: false, follow: true });
});

test("guide canonical origin rejects internal, non-HTTPS and credential URLs", (t) => {
  useEnvironment(t, { NEXT_PUBLIC_SITE_URL: undefined });
  for (const value of ["http://store.example.com", "https://localhost", "https://127.0.0.1", "https://user:secret@store.example.com", "https://store.example.com/path", "https://store.example.com?q=x", "not a url"]) {
    process.env.NEXT_PUBLIC_SITE_URL = value;
    assert.equal(metadataModule().getGuideSiteOrigin(), undefined, value);
  }
});

function loadGuides(results = {}, options = {}) {
  const calls = [];
  const overrides = {
    react: { cache: (fn) => fn },
    "@supabase/supabase-js": {
      createClient: () => {
        if (options.throwOnCreate) throw new Error("Invalid configuration fixture");
        return {
          from: (table) => {
            const result = results[table] ?? { data: [], error: null };
            let query;
            query = new Proxy({}, {
              get: (_target, method) => {
                if (method === "then") return Promise.resolve(result).then.bind(Promise.resolve(result));
                return (...args) => { calls.push({ table, method, args }); return query; };
              },
            });
            return query;
          },
        };
      },
    },
  };
  return { ...loadTypeScript(path.join(lib, "guides.ts"), overrides), calls };
}

function configureSupabase(t) {
  useEnvironment(t, { NEXT_PUBLIC_SUPABASE_URL: "https://fixture.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "fixture-anon-key" });
}

function suppressExpectedErrors(t) {
  const original = console.error;
  console.error = () => {};
  t.after(() => { console.error = original; });
}

const starter = () => loadTypeScript(path.join(lib, "guide-starter.ts")).GUIDE_STARTER_CATALOG;

function livePost(post, category) {
  return {
    id: post.id, category_id: category.id, slug: post.slug, title: post.title,
    excerpt: post.excerpt, sections: post.sections, reading_minutes: post.readingMinutes,
    featured: post.featured, published_at: post.publishedAt,
    seo_title: post.seoTitle, seo_description: post.seoDescription,
  };
}

test("starter handbook has four categories and eight valid article links", async (t) => {
  useEnvironment(t, { NEXT_PUBLIC_SUPABASE_URL: undefined, NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined });
  const guides = loadGuides();
  const catalog = await guides.getGuideCatalog();
  assert.equal(catalog.source, "starter");
  assert.equal(catalog.categories.length, 4);
  assert.equal(catalog.posts.length, 8);
  assert.equal(new Set(catalog.posts.map((post) => post.slug)).size, 8);
  for (const post of catalog.posts) {
    assert.match(post.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(catalog.categories.some((category) => category.slug === post.categorySlug));
    assert.ok(post.sections.length > 0);
    assert.equal((await guides.getGuidePostBySlug(post.slug)).id, post.id);
  }
  assert.equal(await guides.getGuidePostBySlug("does-not-exist"), null);
});

test("guide search normalizes whitespace and case and searches article body", () => {
  const guides = loadGuides();
  const catalog = starter();
  assert.equal(guides.filterGuidePosts(catalog.posts, " PAYMENT-GUIDE ", "").length, 2);
  assert.ok(guides.filterGuidePosts(catalog.posts, "", "  KBZPAY  ").some((post) => post.slug === "payment-options-at-checkout"));
  assert.ok(guides.filterGuidePosts(catalog.posts, "product-guide", "  Combed   Cotton  ").length > 0);
  assert.equal(guides.filterGuidePosts(catalog.posts, "delivery-guide", "KBZPAY").length, 0);
  assert.equal(guides.filterGuidePosts(catalog.posts, "", "unfindable-keyword").length, 0);
});

test("successful empty live catalog never resurrects starter posts", async (t) => {
  configureSupabase(t);
  const catalog = await loadGuides().getGuideCatalog();
  assert.deepEqual(catalog, { categories: [], posts: [], source: "supabase" });
});

test("only explicit missing-table error codes allow starter fallback", async (t) => {
  configureSupabase(t);
  suppressExpectedErrors(t);
  for (const code of ["42P01", "PGRST205"]) {
    const catalog = await loadGuides({ guide_posts: { data: null, error: { code, message: "Fixture" } } }).getGuideCatalog();
    assert.equal(catalog.source, "starter");
  }
  for (const code of ["42501", "PGRST301", "08006", "PGRST116"]) {
    const catalog = await loadGuides({ guide_posts: { data: null, error: { code, message: "Fixture" } } }).getGuideCatalog();
    assert.deepEqual(catalog, { categories: [], posts: [], source: "unavailable" });
  }
});

test("invalid Supabase configuration is a controlled unavailable state", async (t) => {
  configureSupabase(t);
  suppressExpectedErrors(t);
  const catalog = await loadGuides({}, { throwOnCreate: true }).getGuideCatalog();
  assert.equal(catalog.source, "unavailable");
  assert.equal(catalog.posts.length, 0);
});

test("live loader filters publication state and ignores malformed or uncategorized posts", async (t) => {
  configureSupabase(t);
  const data = starter();
  const category = data.categories[0];
  const valid = livePost(data.posts[0], category);
  const malformed = { ...valid, id: "bad", slug: "bad-post", sections: [{ heading: "Bad", paragraphs: [null] }] };
  const hiddenCategory = { ...valid, id: "hidden", slug: "hidden-post", category_id: "not-public" };
  const guides = loadGuides({
    guide_categories: { data: [category], error: null },
    guide_posts: { data: [valid, malformed, hiddenCategory], error: null },
  });
  const catalog = await guides.getGuideCatalog();
  assert.equal(catalog.source, "supabase");
  assert.equal(catalog.posts.length, 1);
  assert.equal(catalog.posts[0].slug, valid.slug);
  for (const table of ["guide_categories", "guide_posts"]) {
    assert.ok(guides.calls.some((call) => call.table === table && call.method === "eq" && call.args[0] === "status" && call.args[1] === "published"));
    assert.ok(guides.calls.some((call) => call.table === table && call.method === "lte" && call.args[0] === "published_at"));
    assert.ok(guides.calls.some((call) => call.table === table && call.method === "not" && call.args[0] === "published_at"));
  }
});
