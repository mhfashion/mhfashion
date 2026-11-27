const assert = require("node:assert/strict");
const test = require("node:test");
const { loadModule } = require("./helpers/load-ts-module.cjs");

const events = loadModule("apps/web/src/lib/asset-events.ts");
const storeLib = loadModule("apps/web/src/lib/asset-store.ts");
const rebuild = loadModule("apps/web/src/lib/asset-catalogue-rebuild.ts");

test("every source prefix belongs to one kind, and no rule shadows another", () => {
  const rules = events.ASSET_SOURCE_RULES;
  assert.deepEqual(rules.map((rule) => rule.kind), ["fonts", "designs", "elements", "photos", "patterns", "brushes", "text-styles", "mockups"]);
  for (const a of rules) {
    for (const b of rules) {
      if (a === b) continue;
      assert.equal(b.prefix.startsWith(a.prefix), false, `${a.prefix} must not shadow ${b.prefix}`);
    }
  }
});

test("a changed key names the catalogue it changes, and nothing else", () => {
  assert.equal(events.kindForAssetKey("fonts/padauk/meta.json"), "fonts");
  assert.equal(events.kindForAssetKey("designs/street-wave/design.svg"), "designs");
  assert.equal(events.kindForAssetKey("elements/arrow/element.svg"), "elements");
  assert.equal(events.kindForAssetKey("brushes/ink/tip.png"), "brushes");
  assert.equal(events.kindForAssetKey("text-styles/neon/meta.json"), "text-styles");
  assert.equal(events.kindForAssetKey("mockups/product/tee/front.webp"), "mockups");
  for (const key of ["orders/order-1/manifest.json", "tmp/u-1/a.webp", "users/u-1/uploads/a.webp", "catalog/fonts.json", "posts/tee.svg", "site/banners/a.webp"]) {
    assert.equal(events.kindForAssetKey(key), null, `${key} changes no catalogue`);
  }
});

test("a batch of keys becomes the sorted list of kinds to rebuild", () => {
  assert.deepEqual(
    events.kindsForAssetKeys(["mockups/product/tee/front.webp", "fonts/a/meta.json", "mockups/product/tee/back.webp", "orders/o/a.json"]),
    ["fonts", "mockups"],
  );
  assert.deepEqual(events.kindsForAssetKeys([]), []);
  assert.deepEqual(events.kindsForAssetKeys(["orders/o/a.json"]), []);
});

test("a queue message rebuilds only its kinds and leaves the other snapshots alone", async () => {
  const buckets = storeLib.createMemoryAssetBuckets({
    "fonts/padauk/meta.json": JSON.stringify({
      slug: "padauk",
      name: "Padauk",
      shelf: "sans",
      licence: { name: "OFL 1.1" },
      files: [{ file: "fonts/padauk/padauk-400.woff2", weight: 400 }],
    }),
    "fonts/padauk/padauk-400.woff2": "woff2",
  });
  const kinds = events.kindsForAssetKeys(["fonts/padauk/meta.json"]);
  const summary = await rebuild.rebuildAssetCatalogues(buckets, new Date(2026, 10, 25), () => {}, kinds);
  assert.deepEqual(summary.kinds.map((entry) => entry.kind), ["fonts"]);
  assert.equal(summary.written, 1);
  assert.equal(buckets.private.files.has("catalog/fonts.json"), true);
  for (const kind of ["designs", "elements", "photos", "patterns", "brushes", "text-styles", "mockups"]) {
    assert.equal(buckets.private.files.has(`catalog/${kind}.json`), false, `${kind} was not touched`);
  }
});
