const assert = require("node:assert/strict");
const test = require("node:test");
const { loadModule } = require("./helpers/load-ts-module.cjs");

const storeLib = loadModule("apps/web/src/lib/asset-store.ts");
const catalogue = loadModule("apps/web/src/lib/asset-catalogue.ts");
const routes = loadModule("apps/web/src/lib/asset-routes.ts");

function fontBucket() {
  return {
    "fonts/padauk/meta.json": JSON.stringify({
      slug: "padauk",
      name: "Padauk",
      shelf: "burmese",
      files: [{ file: "fonts/padauk/padauk-400.woff2", weight: 400, style: "normal" }],
      licence: { name: "OFL 1.1" },
    }),
    "fonts/padauk/padauk-400.woff2": "woff2",
  };
}

async function storeWith(kind, files, snapshotKind = kind) {
  const store = storeLib.createMemoryAssetStore(files);
  await catalogue.writeAssetCatalogue(store, snapshotKind);
  return store;
}

test("the fonts route answers in the shape the editor's parser already takes", async () => {
  const store = await storeWith("fonts", fontBucket());
  const result = await routes.catalogueResponse(store, "fonts", null);
  assert.equal(result.status, 200);
  const payload = JSON.parse(result.body);
  assert.equal(payload.fonts.length, 1);
  assert.equal(payload.fonts[0].name, "Padauk");
  assert.deepEqual(payload.skipped, []);
  assert.equal(result.headers["content-type"], "application/json; charset=utf-8");
  assert.equal(result.headers["cache-control"], "public, max-age=60, stale-while-revalidate=600");
  assert.match(result.headers.etag, /^"[0-9a-f]{8}"$/);
});

test("a matching If-None-Match answers 304 with no body and the same headers", async () => {
  const store = await storeWith("fonts", fontBucket());
  const first = await routes.catalogueResponse(store, "fonts", null);
  const second = await routes.catalogueResponse(store, "fonts", first.headers.etag);
  assert.equal(second.status, 304);
  assert.equal(second.body, "");
  assert.equal(second.headers.etag, first.headers.etag);
  assert.equal(second.headers["cache-control"], first.headers["cache-control"]);
});

test("a weak or listed If-None-Match still matches", async () => {
  const store = await storeWith("fonts", fontBucket());
  const first = await routes.catalogueResponse(store, "fonts", null);
  assert.equal((await routes.catalogueResponse(store, "fonts", `W/${first.headers.etag}`)).status, 304);
  assert.equal((await routes.catalogueResponse(store, "fonts", `"00000000", ${first.headers.etag}`)).status, 304);
  assert.equal((await routes.catalogueResponse(store, "fonts", "*")).status, 304);
  assert.equal((await routes.catalogueResponse(store, "fonts", '"deadbeef"')).status, 200);
});

test("without a bound bucket the route answers an empty list and says why", async () => {
  const result = await routes.catalogueResponse(null, "fonts", null);
  assert.equal(result.status, 200);
  const payload = JSON.parse(result.body);
  assert.deepEqual(payload.fonts, []);
  assert.equal(payload.skipped.length, 1);
  assert.match(payload.skipped[0].reason, /not bound in this environment/);
});

test("a bound bucket with no snapshot answers an empty list and says why", async () => {
  const store = storeLib.createMemoryAssetStore({});
  const result = await routes.catalogueResponse(store, "designs", null);
  const payload = JSON.parse(result.body);
  assert.deepEqual(payload.items, []);
  assert.equal(payload.issues[0].key, "catalog/designs.json");
  assert.match(payload.issues[0].reason, /no snapshot has been built yet/);
});

test("the other kinds serve the catalogue itself, not a wrapped list", async () => {
  const store = await storeWith("designs", {
    "designs/street-vibes/meta.json": JSON.stringify({ slug: "street-vibes", name: "Street Vibes", files: ["designs/street-vibes/art.svg"] }),
    "designs/street-vibes/art.svg": "<svg/>",
  });
  const result = await routes.catalogueResponse(store, "designs", null);
  const payload = JSON.parse(result.body);
  assert.equal(payload.kind, "designs");
  assert.equal(payload.items[0].slug, "street-vibes");
  assert.equal("fonts" in payload, false);
});

test("the mockup route names the files that exist for one product", async () => {
  const store = await storeWith("mockups", {
    "mockups/classic-tee/front-black.webp": "webp",
    "mockups/classic-tee/back-white.webp": "webp",
  });
  const result = await routes.mockupResponse(store, "classic-tee", null);
  assert.equal(result.status, 200);
  assert.deepEqual(JSON.parse(result.body), {
    slug: "classic-tee",
    files: ["mockups/classic-tee/back-white.webp", "mockups/classic-tee/front-black.webp"],
  });
  assert.equal((await routes.mockupResponse(store, "classic-tee", result.headers.etag)).status, 304);
});

test("an unknown product and an impossible slug are answered, never guessed", async () => {
  const store = await storeWith("mockups", { "mockups/classic-tee/front.webp": "webp" });
  const missing = await routes.mockupResponse(store, "hoodie", null);
  assert.equal(missing.status, 404);
  assert.equal(JSON.parse(missing.body).error, "no_mockups");
  assert.equal(missing.headers["cache-control"], "no-store");
  const bad = await routes.mockupResponse(store, "../secrets", null);
  assert.equal(bad.status, 400);
  assert.equal(JSON.parse(bad.body).error, "invalid_slug");
});

test("only the six known kinds are routable", () => {
  for (const kind of ["fonts", "designs", "elements", "brushes", "text-styles", "mockups"]) {
    assert.equal(routes.isAssetCatalogueKind(kind), true, kind);
  }
  for (const kind of ["catalog", "fonts/", "", "../fonts", "FONTS"]) {
    assert.equal(routes.isAssetCatalogueKind(kind), false, kind);
  }
});

test("the etag follows the body", () => {
  assert.equal(routes.bodyEtag("abc"), routes.bodyEtag("abc"));
  assert.notEqual(routes.bodyEtag("abc"), routes.bodyEtag("abd"));
  assert.match(routes.bodyEtag(""), /^"[0-9a-f]{8}"$/);
});
