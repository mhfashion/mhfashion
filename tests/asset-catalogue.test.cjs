const assert = require("node:assert/strict");
const test = require("node:test");
const { loadModule } = require("./helpers/load-ts-module.cjs");

const storeLib = loadModule("apps/web/src/lib/asset-store.ts");
const catalogue = loadModule("apps/web/src/lib/asset-catalogue.ts");

const NOW = new Date(2026, 10, 22, 9, 0, 0);

function fontMeta(slug, overrides = {}) {
  return JSON.stringify({
    slug,
    name: overrides.name ?? `${slug} face`,
    shelf: "sans",
    scripts: ["latin"],
    files: [{ file: `fonts/${slug}/${slug}-400.woff2`, weight: 400, style: "normal" }],
    licence: { name: "OFL 1.1", url: "https://example.com/ofl" },
    ...overrides,
  });
}

function fontBucket(entries) {
  const files = {};
  for (const [slug, meta] of Object.entries(entries)) {
    files[`fonts/${slug}/meta.json`] = meta;
    files[`fonts/${slug}/${slug}-400.woff2`] = "woff2";
  }
  return files;
}

test("a font with a valid meta.json and its file becomes one catalogue item", async () => {
  const store = storeLib.createMemoryAssetStore(fontBucket({ padauk: fontMeta("padauk", { name: "Padauk" }) }));
  const result = await catalogue.buildFontCatalogue(store, NOW);
  assert.equal(result.kind, "fonts");
  assert.equal(result.generatedAt, NOW.toISOString());
  assert.deepEqual(result.items.map((font) => font.name), ["Padauk"]);
  assert.equal(result.items[0].files[0].file, "fonts/padauk/padauk-400.woff2");
  assert.deepEqual(result.issues, []);
});

test("a font folder without meta.json is reported and skipped", async () => {
  const store = storeLib.createMemoryAssetStore({ "fonts/orphan/orphan-400.woff2": "woff2" });
  const result = await catalogue.buildFontCatalogue(store, NOW);
  assert.deepEqual(result.items, []);
  assert.deepEqual(result.issues, [{ key: "fonts/orphan/", reason: "meta.json is missing" }]);
});

test("a folder with files but no meta.json is named once, not once per file", async () => {
  const store = storeLib.createMemoryAssetStore({
    "elements/arrow/arrow.svg": "<svg/>",
    "elements/arrow/arrow@2x.svg": "<svg/>",
  });
  const result = await catalogue.buildFolderCatalogue(store, "elements", NOW);
  assert.deepEqual(result.issues, [{ key: "elements/arrow/", reason: "meta.json is missing" }]);
});

test("a font whose meta.json is broken JSON is reported with its key", async () => {
  const store = storeLib.createMemoryAssetStore({ "fonts/broken/meta.json": "{not json" });
  const result = await catalogue.buildFontCatalogue(store, NOW);
  assert.deepEqual(result.items, []);
  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0].key, "fonts/broken/meta.json");
  assert.match(result.issues[0].reason, /not valid JSON/);
});

test("a font that names a file the bucket does not hold is reported and dropped", async () => {
  const store = storeLib.createMemoryAssetStore({ "fonts/gone/meta.json": fontMeta("gone") });
  const result = await catalogue.buildFontCatalogue(store, NOW);
  assert.deepEqual(result.items, []);
  assert.equal(result.issues.length, 1);
  assert.match(result.issues[0].reason, /is not in the bucket/);
});

test("two folders claiming one slug: the second is reported, the first stays", async () => {
  const meta = (folder, name) => fontMeta("padauk", { name, files: [{ file: `fonts/${folder}/padauk-400.woff2`, weight: 400, style: "normal" }] });
  const store = storeLib.createMemoryAssetStore({
    "fonts/one/meta.json": meta("one", "Padauk"),
    "fonts/one/padauk-400.woff2": "woff2",
    "fonts/two/meta.json": meta("two", "Padauk again"),
    "fonts/two/padauk-400.woff2": "woff2",
  });
  const result = await catalogue.buildFontCatalogue(store, NOW);
  assert.equal(result.items.length, 1);
  assert.equal(result.issues.length, 1);
  assert.match(result.issues[0].reason, /duplicate (slug|name)/);
});

test("a key that could escape the bucket is reported as unsafe", async () => {
  const store = storeLib.createMemoryAssetStore({
    "fonts/ok/meta.json": fontMeta("ok"),
    "fonts/ok/ok-400.woff2": "woff2",
    "fonts/a/../../escape/meta.json": fontMeta("escape"),
  });
  const result = await catalogue.buildFontCatalogue(store, NOW);
  assert.deepEqual(result.items.map((font) => font.slug), ["ok"]);
  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0].key, "fonts/a/../../escape/meta.json");
  assert.equal(result.issues[0].reason, "unsafe key");
});

test("a listing longer than one page is read to the end", async () => {
  const entries = {};
  for (const slug of ["alpha", "bravo", "charlie", "delta", "echo"]) {
    entries[slug] = fontMeta(slug, { name: slug.toUpperCase() });
  }
  const store = storeLib.createMemoryAssetStore(fontBucket(entries), { pageSize: 2 });
  const keys = await catalogue.listAllKeys(store, "fonts/");
  assert.equal(keys.length, 10);
  const result = await catalogue.buildFontCatalogue(store, NOW);
  assert.equal(result.items.length, 5);
  assert.deepEqual(result.items.map((font) => font.slug), ["alpha", "bravo", "charlie", "delta", "echo"]);
});

test("the snapshot is written once and not rewritten while the bucket is unchanged", async () => {
  const store = storeLib.createMemoryAssetStore(fontBucket({ padauk: fontMeta("padauk", { name: "Padauk" }) }));
  const first = await catalogue.writeAssetCatalogue(store, "fonts", NOW);
  assert.equal(first.written, true);
  assert.equal(store.files.has("catalog/fonts.json"), true);
  const stored = JSON.parse(store.files.get("catalog/fonts.json"));
  assert.equal(stored.items.length, 1);
  assert.equal(stored.generatedAt, NOW.toISOString());

  const later = new Date(2026, 10, 22, 10, 0, 0);
  const second = await catalogue.writeAssetCatalogue(store, "fonts", later);
  assert.equal(second.written, false);
  assert.equal(store.writes.filter((key) => key === "catalog/fonts.json").length, 1);
  assert.equal(JSON.parse(store.files.get("catalog/fonts.json")).generatedAt, NOW.toISOString());
});

test("a changed bucket rewrites the snapshot", async () => {
  const store = storeLib.createMemoryAssetStore(fontBucket({ padauk: fontMeta("padauk", { name: "Padauk" }) }));
  await catalogue.writeAssetCatalogue(store, "fonts", NOW);
  store.files.set("fonts/padauk/meta.json", fontMeta("padauk", { name: "Padauk New" }));
  const second = await catalogue.writeAssetCatalogue(store, "fonts", NOW);
  assert.equal(second.written, true);
  assert.equal(JSON.parse(store.files.get("catalog/fonts.json")).items[0].name, "Padauk New");
});

test("a design folder becomes an item with its files and the rest of its meta", async () => {
  const store = storeLib.createMemoryAssetStore({
    "designs/street-vibes/meta.json": JSON.stringify({ slug: "street-vibes", name: "Street Vibes", artist: "MH", files: ["designs/street-vibes/art.svg"] }),
    "designs/street-vibes/art.svg": "<svg/>",
    "designs/street-vibes/preview.png": "png",
  });
  const result = await catalogue.buildFolderCatalogue(store, "designs", NOW);
  assert.equal(result.items.length, 1);
  assert.deepEqual(result.items[0].files, ["designs/street-vibes/art.svg"]);
  assert.equal(result.items[0].meta.artist, "MH");
  assert.equal("slug" in result.items[0].meta, false);
});

test("a design without a name or with a bad slug is reported", async () => {
  const store = storeLib.createMemoryAssetStore({
    "designs/no-name/meta.json": JSON.stringify({ slug: "no-name", files: [] }),
    "designs/Bad_Slug/meta.json": JSON.stringify({ name: "Bad" }),
  });
  const result = await catalogue.buildFolderCatalogue(store, "designs", NOW);
  assert.deepEqual(result.items, []);
  assert.equal(result.issues.length, 2);
  assert.deepEqual(result.issues.map((issue) => issue.reason).sort(), ["name is missing", "slug must be lowercase words joined by -"]);
});

test("a mockup folder lists the looks that exist and skips its meta.json", async () => {
  const store = storeLib.createMemoryAssetStore({
    "mockups/classic-tee/meta.json": JSON.stringify({ name: "Classic Tee" }),
    "mockups/classic-tee/front-black.webp": "webp",
    "mockups/classic-tee/back-white.webp": "webp",
    "mockups/loose.png": "png",
  });
  const result = await catalogue.buildMockupCatalogue(store, NOW);
  assert.deepEqual(result.items, [{ slug: "classic-tee", files: ["mockups/classic-tee/back-white.webp", "mockups/classic-tee/front-black.webp"] }]);
  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0].key, "mockups/loose.png");
});

test("a corrupt snapshot reads as absent, so a reader falls back instead of throwing", async () => {
  const store = storeLib.createMemoryAssetStore({ "catalog/designs.json": "{oops" });
  assert.equal(await catalogue.readAssetCatalogue(store, "designs"), null);
});

test("the store refuses every key that could leave the bucket", async () => {
  for (const key of ["/fonts/a.woff2", "fonts/../a.woff2", "https://example.com/a.woff2", "fonts//a.woff2", "fonts/a.woff2/", "other/a.woff2", "", " fonts/a.woff2", "fonts\\a.woff2"]) {
    assert.equal(storeLib.isSafeAssetKey(key), false, `${key} must be refused`);
  }
  for (const key of ["fonts/padauk/meta.json", "catalog/fonts.json", "mockups/classic-tee/front.webp"]) {
    assert.equal(storeLib.isSafeAssetKey(key), true, `${key} must be allowed`);
  }
  const store = storeLib.createMemoryAssetStore();
  await assert.rejects(() => store.get("fonts/../secret.txt"), /refused asset key/);
  await assert.rejects(() => store.put("fonts/../secret.txt", "x"), /refused asset key/);
});
