const assert = require("node:assert/strict");
const test = require("node:test");
const { loadModule } = require("./helpers/load-ts-module.cjs");

const storeLib = loadModule("apps/web/src/lib/asset-store.ts");

test("each bucket only accepts its own prefixes", () => {
  const { isSafeAssetKey } = storeLib;
  for (const key of ["fonts/padauk/meta.json", "mockups/product/tee/front.webp", "posts/tee.svg", "site/banners/a.webp", "jersey-mockups/style/a.png"]) {
    assert.equal(isSafeAssetKey(key, "public"), true, `${key} is public`);
    assert.equal(isSafeAssetKey(key, "private"), false, `${key} must not reach the private bucket`);
  }
  for (const key of ["catalog/fonts.json", "uploads/uid/one.webp", "saved/uid/design/thumbnail.webp", "orders/o1/manifest.json", "licences/padauk/ofl.pdf"]) {
    assert.equal(isSafeAssetKey(key, "private"), true, `${key} is private`);
    assert.equal(isSafeAssetKey(key, "public"), false, `${key} must never be public`);
  }
  assert.equal(isSafeAssetKey("secrets/a.json"), false, "an unknown prefix is refused in both buckets");
});

test("the cache class follows the prefix", () => {
  const { assetCacheControl, ASSET_CACHE_CONTROL } = storeLib;
  assert.equal(assetCacheControl("fonts/padauk/padauk-400.woff2"), ASSET_CACHE_CONTROL.immutable);
  assert.equal(assetCacheControl("brushes/ink/tip.png"), ASSET_CACHE_CONTROL.immutable);
  assert.equal(assetCacheControl("textures/grain/texture.png"), ASSET_CACHE_CONTROL.immutable);
  assert.equal(assetCacheControl("mockups/product/tee/front.webp"), ASSET_CACHE_CONTROL.revalidate);
  assert.equal(assetCacheControl("designs/street/design.svg"), ASSET_CACHE_CONTROL.revalidate);
  assert.equal(assetCacheControl("orders/o1/manifest.json"), ASSET_CACHE_CONTROL.private);
});

test("a file is written with its own content type, cache class and metadata, and read back whole", async () => {
  const store = storeLib.createMemoryAssetStore();
  const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
  await store.putObject("mockups/product/tee/front.webp", bytes, {
    contentType: "image/webp",
    customMetadata: { sha256: "abc123", uploader: "owner" },
  });
  const object = await store.getObject("mockups/product/tee/front.webp");
  assert.equal(object.contentType, "image/webp");
  assert.equal(object.cacheControl, storeLib.ASSET_CACHE_CONTROL.revalidate);
  assert.equal(object.size, 4);
  assert.deepEqual([...object.body], [...bytes]);
  assert.deepEqual(object.customMetadata, { sha256: "abc123", uploader: "owner" });

  const head = await store.head("mockups/product/tee/front.webp");
  assert.equal(head.size, 4);
  assert.equal(head.contentType, "image/webp");
  assert.equal("body" in head, false, "head never carries the bytes");
  assert.equal(await store.head("mockups/product/tee/gone.webp"), null);
});

test("a caller can override the cache class, and a text object still reads as before", async () => {
  const store = storeLib.createMemoryAssetStore();
  await store.putObject("fonts/padauk/padauk-400.woff2", "woff2", {
    contentType: "font/woff2",
    cacheControl: "public, max-age=60",
  });
  assert.equal((await store.head("fonts/padauk/padauk-400.woff2")).cacheControl, "public, max-age=60");

  await store.put("fonts/padauk/meta.json", "{\"name\":\"Padauk\"}");
  assert.equal(await store.get("fonts/padauk/meta.json"), "{\"name\":\"Padauk\"}");
  const meta = await store.getObject("fonts/padauk/meta.json");
  assert.match(meta.contentType, /application\/json/);
  assert.deepEqual([...new TextDecoder().decode(meta.body)].slice(0, 1), ["{"]);
});

test("a listing covers text and binary objects, and the binary keys are listed too", async () => {
  const store = storeLib.createMemoryAssetStore({ "fonts/padauk/meta.json": "{}" });
  await store.putObject("fonts/padauk/padauk-400.woff2", "woff2", { contentType: "font/woff2" });
  const page = await store.list("fonts/");
  assert.deepEqual(page.keys, ["fonts/padauk/meta.json", "fonts/padauk/padauk-400.woff2"]);
});

test("a binary write to an unsafe key is refused like a text one", async () => {
  const store = storeLib.createMemoryAssetStore();
  await assert.rejects(() => store.putObject("../escape.png", "x", { contentType: "image/png" }), /refused asset key/);
  await assert.rejects(() => store.getObject("fonts/../secret"), /refused asset key/);
});

test("the two memory buckets keep their objects apart", async () => {
  const buckets = storeLib.createMemoryAssetBuckets({ "fonts/a/meta.json": "{}" }, { "catalog/fonts.json": "{}" });
  assert.equal(await buckets.public.get("catalog/fonts.json"), null);
  assert.equal(await buckets.private.get("fonts/a/meta.json"), null);
  assert.deepEqual((await buckets.public.list("fonts/")).keys, ["fonts/a/meta.json"]);
  assert.deepEqual((await buckets.private.list("catalog/")).keys, ["catalog/fonts.json"]);
});
