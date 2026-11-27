const assert = require("node:assert/strict");
const test = require("node:test");
const { loadModule } = require("./helpers/load-ts-module.cjs");

const storeLib = loadModule("apps/web/src/lib/asset-store.ts");
const rebuild = loadModule("apps/web/src/lib/asset-catalogue-rebuild.ts");

function bucket() {
  return {
    "fonts/padauk/meta.json": JSON.stringify({
      slug: "padauk",
      name: "Padauk",
      shelf: "burmese",
      files: [{ file: "fonts/padauk/padauk-400.woff2", weight: 400, style: "normal" }],
      licence: { name: "OFL 1.1" },
    }),
    "fonts/padauk/padauk-400.woff2": "woff2",
    "designs/street-vibes/meta.json": JSON.stringify({ slug: "street-vibes", name: "Street Vibes" }),
    "designs/street-vibes/art.svg": "<svg/>",
    "mockups/product/classic-tee/front.webp": "webp",
    "elements/orphan/arrow.svg": "<svg/>",
  };
}

test("one pass rebuilds every kind and reports what each one holds", async () => {
  const buckets = storeLib.createMemoryAssetBuckets(bucket());
  const lines = [];
  const summary = await rebuild.rebuildAssetCatalogues(buckets, new Date(2026, 10, 22), (line) => lines.push(line));

  assert.deepEqual(
    summary.kinds.map((entry) => [entry.kind, entry.items, entry.issues]),
    [
      ["fonts", 1, 0],
      ["designs", 1, 0],
      ["elements", 0, 1],
      ["photos", 0, 0],
      ["patterns", 0, 0],
      ["brushes", 0, 0],
      ["text-styles", 0, 0],
      ["mockups", 1, 0],
    ],
  );
  assert.equal(summary.written, 8);
  assert.equal(summary.issues, 1);
  assert.equal(lines.length, 8);
  assert.match(lines[0], /^assets: fonts rebuilt, 1 item, 0 issues$/);
  assert.match(lines[2], /^assets: elements rebuilt, 0 items, 1 issue$/);
  for (const kind of ["fonts", "designs", "elements", "photos", "patterns", "brushes", "text-styles", "mockups"]) {
    assert.equal(buckets.private.files.has(`catalog/${kind}.json`), true, kind);
    assert.equal(buckets.public.files.has(`catalog/${kind}.json`), false, `the ${kind} snapshot must not be public`);
  }
});

test("a second pass over an unchanged bucket writes nothing", async () => {
  const buckets = storeLib.createMemoryAssetBuckets(bucket());
  await rebuild.rebuildAssetCatalogues(buckets, new Date(2026, 10, 22), () => {});
  const writesBefore = buckets.private.writes.length;
  const summary = await rebuild.rebuildAssetCatalogues(buckets, new Date(2026, 10, 22, 12), () => {});
  assert.equal(summary.written, 0);
  assert.equal(buckets.private.writes.length, writesBefore);
  assert.equal(summary.kinds.every((entry) => entry.written === false), true);
});

test("an empty bucket still produces eight snapshots, each with no items", async () => {
  const buckets = storeLib.createMemoryAssetBuckets({});
  const summary = await rebuild.rebuildAssetCatalogues(buckets, new Date(2026, 10, 22), () => {});
  assert.equal(summary.written, 8);
  assert.equal(summary.issues, 0);
  for (const kind of summary.kinds) assert.equal(kind.items, 0, kind.kind);
});
