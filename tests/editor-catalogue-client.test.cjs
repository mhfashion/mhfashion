// Plan §12.2.2: the editor panels read the shop's Photos and Patterns catalogues, and fall back to the
// placeholders and the nine built-in patterns while the shop has none.
const assert = require("node:assert/strict");
const test = require("node:test");
const { loadModule } = require("./helpers/load-ts-module.cjs");

const photos = loadModule("apps/web/src/lib/editor-photo-library.ts");
const patterns = loadModule("apps/web/src/lib/editor-pattern-library.ts");

const PHOTO = {
  slug: "yangon-street",
  name: "Yangon street",
  nameMy: "ရန်ကုန်လမ်း",
  file: "photos/yangon-street/photo.webp",
  thumb: "photos/yangon-street/thumb.webp",
  width: 1600,
  height: 1200,
  transparent: false,
  tags: ["city", "street"],
  aliases: ["downtown"],
  licence: { name: "Unsplash+", source: "https://unsplash.com/licence", commercialPrintAllowed: true, credit: "Daw Mya" },
};

test("a catalogue photo becomes an entry the sidebar and the canvas can use", () => {
  const entry = photos.photoFromCatalogue(PHOTO, "https://cdn.example/");
  assert.equal(entry.id, "photo-yangon-street");
  assert.equal(entry.name, "Yangon street");
  assert.equal(entry.url, "https://cdn.example/photos/yangon-street/photo.webp");
  assert.equal(entry.width, 1600);
  assert.equal(entry.height, 1200);
  assert.equal(entry.credit, "Daw Mya");
  assert.equal(entry.placeholder, false, "a licensed photo is never marked as a placeholder");
  for (const word of ["ရန်ကုန်လမ်း", "city", "downtown"]) assert.match(entry.keywords, new RegExp(word));
});

test("the photo catalogue answer keeps the usable items and drops the rest", () => {
  const entries = photos.photosFromCatalogue(
    { version: 1, kind: "photos", items: [PHOTO, { slug: "broken" }, null] },
    "https://cdn.example",
  );
  assert.deepEqual(entries.map((entry) => entry.id), ["photo-yangon-street"]);
  assert.deepEqual(photos.photosFromCatalogue({ items: "nope" }), []);
  assert.deepEqual(photos.photosFromCatalogue(null), []);
});

test("a photo service that is down leaves the placeholders on screen", async () => {
  assert.deepEqual(await photos.loadPhotoLibrary(async () => { throw new Error("offline"); }), []);
  assert.deepEqual(await photos.loadPhotoLibrary(async () => ({ items: [] })), []);
  const live = await photos.loadPhotoLibrary(async () => ({ items: [PHOTO] }), "https://cdn.example");
  assert.deepEqual(live.map((entry) => entry.id), ["photo-yangon-street"]);
  // The built-in list stays marked, so the panel only warns while a placeholder is on screen.
  assert.equal(photos.MH_PHOTO_LIBRARY.every((entry) => entry.placeholder), true);
  assert.equal(photos.MH_PHOTO_LIBRARY.every((entry) => /^https:\/\//.test(entry.url)), true);
});

test("a pattern SVG becomes the same kind of shape layer as a built-in pattern", () => {
  const layer = patterns.patternFromCatalogue(
    { slug: "terrazzo", name: "Terrazzo", ink: "light", file: "patterns/terrazzo/pattern.svg" },
    '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="1" fill="#222"/></svg>',
  );
  assert.equal(layer.id, "pattern-terrazzo");
  assert.equal(layer.name, "Terrazzo");
  assert.equal(layer.paths.length, 1);
  assert.match(layer.paths[0].d, /^M 400 600 C /);
  const builtIn = patterns.MH_PATTERN_LAYERS[0];
  assert.equal(typeof builtIn.paths[0].d, "string", "a built-in pattern is the same shape");
});

test("a pattern file a shape cannot carry is skipped, and the built-ins stay", () => {
  assert.equal(patterns.patternFromCatalogue({ slug: "x", name: "X", ink: "dark", file: "patterns/x/pattern.svg" }, "<svg><text>x</text></svg>"), null);
  assert.equal(patterns.patternFromCatalogue({ slug: "x", name: "X", ink: "dark", file: "patterns/x/pattern.svg" }, ""), null);
});

test("the shop's patterns are added after the nine built-ins, with their ink", async () => {
  const loaded = await patterns.loadCataloguePatterns(
    async () => ({ items: [
      { slug: "terrazzo", name: "Terrazzo", ink: "light", file: "patterns/terrazzo/pattern.svg" },
      { slug: "broken", name: "Broken", ink: "dark", file: "patterns/broken/pattern.svg" },
    ] }),
    async (url) => (url.endsWith("terrazzo/pattern.svg")
      ? '<svg viewBox="0 0 10 10"><rect width="10" height="10" fill="#111"/></svg>'
      : "<svg><image href=\"x.png\"/></svg>"),
    "https://cdn.example",
  );
  assert.deepEqual(loaded.map((entry) => entry.layer.id), ["pattern-terrazzo"]);
  assert.equal(loaded[0].ink, "light");
  assert.equal(patterns.MH_PATTERN_LAYERS.length, 9, "the built-ins are untouched");
  assert.deepEqual(await patterns.loadCataloguePatterns(async () => { throw new Error("offline"); }, async () => ""), []);
});
