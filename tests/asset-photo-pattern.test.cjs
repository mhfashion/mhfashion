// Plan §12.2.2 and §12.2.12 items 5 and 6: the Photos and Patterns libraries, and the access rules of
// the `users/` and `tmp/` layout.
const assert = require("node:assert/strict");
const test = require("node:test");
const { loadModule } = require("./helpers/load-ts-module.cjs");

const catalogue = loadModule("apps/web/src/lib/asset-catalogue.ts");
const access = loadModule("apps/web/src/lib/asset-access.ts");
const upload = loadModule("apps/web/src/lib/asset-upload.ts");
const storeLib = loadModule("apps/web/src/lib/asset-store.ts");
const events = loadModule("apps/web/src/lib/asset-events.ts");

const NOW = new Date(Date.UTC(2026, 10, 26, 9, 0));

function photoMeta(overrides = {}) {
  return JSON.stringify({
    slug: "yangon-street",
    name: "Yangon street",
    nameMy: "ရန်ကုန်လမ်း",
    width: 1600,
    height: 1200,
    transparent: false,
    tags: ["city", "street"],
    aliases: ["downtown"],
    licence: { name: "Unsplash+", source: "https://unsplash.com/licence", commercialPrintAllowed: true, credit: "Daw Mya" },
    ...overrides,
  });
}

function photoBucket(overrides = {}) {
  return {
    "photos/yangon-street/meta.json": photoMeta(),
    "photos/yangon-street/photo.webp": "webp",
    "photos/yangon-street/thumb.webp": "webp",
    ...overrides,
  };
}

test("a complete licensed photo is offered with everything the sidebar and the canvas need", async () => {
  const store = storeLib.createMemoryAssetStore(photoBucket());
  const built = await catalogue.buildPhotoCatalogue(store, NOW);
  assert.equal(built.kind, "photos");
  assert.deepEqual(built.issues, []);
  assert.equal(built.items.length, 1);
  const [photo] = built.items;
  assert.equal(photo.slug, "yangon-street");
  assert.equal(photo.file, "photos/yangon-street/photo.webp");
  assert.equal(photo.thumb, "photos/yangon-street/thumb.webp");
  assert.equal(photo.nameMy, "ရန်ကုန်လမ်း");
  assert.deepEqual(photo.tags, ["city", "street"]);
  assert.deepEqual(photo.aliases, ["downtown"]);
  assert.equal(photo.width, 1600);
  assert.equal(photo.licence.commercialPrintAllowed, true);
  assert.equal(photo.licence.credit, "Daw Mya");
});

test("a photo without the right to print it is an issue, never an item", async () => {
  for (const [label, overrides, reason] of [
    ["no licence", { licence: undefined }, /licence is missing/],
    ["no source", { licence: { name: "Stock", commercialPrintAllowed: true } }, /licence\.source is missing/],
    ["not printable", { licence: { name: "Stock", source: "https://x", commercialPrintAllowed: false } }, /commercialPrintAllowed must be true/],
    ["no name", { name: "" }, /name is missing/],
    ["no size", { width: 0 }, /width and height/],
  ]) {
    const store = storeLib.createMemoryAssetStore(photoBucket({ "photos/yangon-street/meta.json": photoMeta(overrides) }));
    const built = await catalogue.buildPhotoCatalogue(store, NOW);
    assert.equal(built.items.length, 0, label);
    assert.match(built.issues[0].reason, reason, label);
  }
});

test("the picture and its thumbnail are both required", async () => {
  const withoutPhoto = storeLib.createMemoryAssetStore({
    "photos/yangon-street/meta.json": photoMeta(),
    "photos/yangon-street/thumb.webp": "webp",
  });
  assert.match((await catalogue.buildPhotoCatalogue(withoutPhoto, NOW)).issues[0].reason, /photo\.<webp\|png\|jpg> is missing/);

  const withoutThumb = storeLib.createMemoryAssetStore({
    "photos/yangon-street/meta.json": photoMeta(),
    "photos/yangon-street/photo.webp": "webp",
  });
  assert.match((await catalogue.buildPhotoCatalogue(withoutThumb, NOW)).issues[0].reason, /thumb\.webp is missing/);
});

test("a photo whose licence document is not in the private bucket is not offered", async () => {
  const store = storeLib.createMemoryAssetStore(photoBucket());
  const privateStore = storeLib.createMemoryAssetStore({});
  const refused = await catalogue.buildPhotoCatalogue(store, NOW, { licences: privateStore });
  assert.equal(refused.items.length, 0);
  assert.match(refused.issues[0].reason, /licence document is missing at licences\/photos\/yangon-street\//);

  await privateStore.put("licences/photos/yangon-street/unsplash.pdf", "pdf");
  const accepted = await catalogue.buildPhotoCatalogue(store, NOW, { licences: privateStore });
  assert.equal(accepted.items.length, 1);
  assert.deepEqual(accepted.issues, []);
});

test("the rebuild hands the private bucket to the photo catalogue, so the licence check runs", async () => {
  const buckets = storeLib.createMemoryAssetBuckets(photoBucket());
  const { written, catalogue: built } = await catalogue.writeAssetCatalogue(buckets.public, buckets.private, "photos", NOW);
  assert.equal(written, true);
  assert.equal(built.items.length, 0, "no licence document yet");
  assert.match(built.issues[0].reason, /licence document is missing/);
});

test("a pattern needs its name, its ink and pattern.svg", async () => {
  const store = storeLib.createMemoryAssetStore({
    "patterns/terrazzo-light/meta.json": JSON.stringify({ slug: "terrazzo-light", name: "Light terrazzo", nameMy: "တာရာဇို", ink: "light", tags: ["stone"] }),
    "patterns/terrazzo-light/pattern.svg": "<svg/>",
    "patterns/broken/meta.json": JSON.stringify({ slug: "broken", name: "Broken", ink: "neon" }),
    "patterns/broken/pattern.svg": "<svg/>",
    "patterns/no-file/meta.json": JSON.stringify({ slug: "no-file", name: "No file" }),
  });
  const built = await catalogue.buildPatternCatalogue(store, NOW);
  assert.equal(built.kind, "patterns");
  assert.deepEqual(built.items.map((item) => [item.slug, item.ink, item.file]), [
    ["terrazzo-light", "light", "patterns/terrazzo-light/pattern.svg"],
  ]);
  const reasons = built.issues.map((issue) => issue.reason).sort();
  assert.deepEqual(reasons, ["ink must be dark, light, color", "pattern.svg is missing"]);
});

test("both new prefixes belong to one catalogue and no rule shadows another", () => {
  assert.equal(events.kindForAssetKey("photos/yangon-street/photo.webp"), "photos");
  assert.equal(events.kindForAssetKey("patterns/terrazzo-light/pattern.svg"), "patterns");
  const prefixes = events.ASSET_SOURCE_RULES.map((rule) => rule.prefix);
  for (const prefix of prefixes) {
    for (const other of prefixes) {
      if (prefix !== other) assert.equal(other.startsWith(prefix), false, `${prefix} shadows ${other}`);
    }
  }
});

test("a customer reads only their own folder, and an admin read of it is an audited event", () => {
  const owner = { id: "u-1", role: "customer" };
  const other = { id: "u-2", role: "customer" };
  const admin = { id: "a-1", role: "admin" };
  assert.equal(access.canReadPrivateAsset(owner, "users/u-1/uploads/p.webp"), true);
  assert.equal(access.canReadPrivateAsset(owner, "users/u-1/designs/d-1/thumbnail.webp"), true);
  assert.equal(access.canReadPrivateAsset(owner, "tmp/u-1/p.webp"), true);
  assert.equal(access.canReadPrivateAsset(other, "users/u-1/uploads/p.webp"), false);
  assert.equal(access.canReadPrivateAsset(other, "tmp/u-1/p.webp"), false);
  assert.equal(access.canReadPrivateAsset(admin, "users/u-1/uploads/p.webp"), true);
  assert.equal(access.isAdminCustomerFileRead(admin, "users/u-1/uploads/p.webp"), true);
  assert.equal(access.isAdminCustomerFileRead(admin, "tmp/u-1/p.webp"), true);
  assert.equal(access.isAdminCustomerFileRead(admin, "orders/o-1/manifest.json"), false);
  assert.equal(access.isAdminCustomerFileRead(owner, "users/u-1/uploads/p.webp"), false);
  assert.equal(access.ownerOfPrivateKey("users/u-1/uploads/p.webp"), "u-1");
  assert.equal(access.ownerOfPrivateKey("tmp/u-1/p.webp"), "u-1");
  assert.equal(access.ownerOfPrivateKey("orders/o-1/manifest.json"), null);
});

test("a saved design keeps its photos under users/<id>/uploads and the quota under tmp/<id>/", async () => {
  assert.equal(upload.uploadQuotaKey("u-1"), "tmp/u-1/quota.json");
  assert.equal(upload.uploadKeyFor("u-1", "a1", "webp"), "tmp/u-1/a1.webp");
  assert.equal(upload.promotionKeyFor("tmp/u-1/a1.webp"), "users/u-1/uploads/a1.webp");

  const buckets = storeLib.createMemoryAssetBuckets();
  await buckets.private.putObject("tmp/u-1/a1.webp", new Uint8Array([1, 2, 3]), { contentType: "image/webp" });
  const result = await upload.promoteUploads(buckets.private, "u-1", ["tmp/u-1/a1.webp", "tmp/u-2/b1.webp"]);
  assert.deepEqual(result.promoted, ["users/u-1/uploads/a1.webp"]);
  assert.deepEqual(result.refused, ["tmp/u-2/b1.webp"]);
  assert.equal(await buckets.private.getObject("tmp/u-1/a1.webp"), null);
});
