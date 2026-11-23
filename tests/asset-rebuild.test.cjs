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
    "mockups/classic-tee/front.webp": "webp",
    "elements/orphan/arrow.svg": "<svg/>",
  };
}

test("one pass rebuilds every kind and reports what each one holds", async () => {
  const store = storeLib.createMemoryAssetStore(bucket());
  const lines = [];
  const summary = await rebuild.rebuildAssetCatalogues(store, new Date(2026, 10, 22), (line) => lines.push(line));

  assert.deepEqual(
    summary.kinds.map((entry) => [entry.kind, entry.items, entry.issues]),
    [
      ["fonts", 1, 0],
      ["designs", 1, 0],
      ["elements", 0, 1],
      ["brushes", 0, 0],
      ["text-styles", 0, 0],
      ["mockups", 1, 0],
    ],
  );
  assert.equal(summary.written, 6);
  assert.equal(summary.issues, 1);
  assert.equal(lines.length, 6);
  assert.match(lines[0], /^assets: fonts rebuilt, 1 item, 0 issues$/);
  assert.match(lines[2], /^assets: elements rebuilt, 0 items, 1 issue$/);
  for (const kind of ["fonts", "designs", "elements", "brushes", "text-styles", "mockups"]) {
    assert.equal(store.files.has(`catalog/${kind}.json`), true, kind);
  }
});

test("a second pass over an unchanged bucket writes nothing", async () => {
  const store = storeLib.createMemoryAssetStore(bucket());
  await rebuild.rebuildAssetCatalogues(store, new Date(2026, 10, 22), () => {});
  const writesBefore = store.writes.length;
  const summary = await rebuild.rebuildAssetCatalogues(store, new Date(2026, 10, 22, 12), () => {});
  assert.equal(summary.written, 0);
  assert.equal(store.writes.length, writesBefore);
  assert.equal(summary.kinds.every((entry) => entry.written === false), true);
});

test("an empty bucket still produces six snapshots, each with no items", async () => {
  const store = storeLib.createMemoryAssetStore({});
  const summary = await rebuild.rebuildAssetCatalogues(store, new Date(2026, 10, 22), () => {});
  assert.equal(summary.written, 6);
  assert.equal(summary.issues, 0);
  for (const kind of summary.kinds) assert.equal(kind.items, 0, kind.kind);
});
