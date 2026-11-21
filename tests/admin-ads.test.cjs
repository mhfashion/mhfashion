const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
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
  const localRequire = (id) => (id.startsWith("@/") ? loadModule(`apps/web/src/${id.slice(2)}.ts`) : require(id));
  new Function("module", "exports", "require", compiled)(loaded, loaded.exports, localRequire);
  return loaded.exports;
}

const admin = loadModule("apps/web/src/lib/admin-demo-data.ts");
const ads = loadModule("apps/web/src/lib/admin-ads.ts");

const NOW = Date.parse("2026-11-21T00:00:00.000Z");
const base = {
  id: "ad_test",
  slot: "home-hero",
  name: "Test campaign",
  headline: "A headline",
  body: "A body",
  ctaLabel: "Shop",
  ctaHref: "/new",
  imageUrl: "",
  enabled: true,
  startsAt: "2026-11-01T00:00:00.000Z",
  endsAt: "2026-12-01T23:59:59.999Z",
};

test("an ad is live only while it is enabled and inside its window", () => {
  assert.equal(ads.adStatus(base, NOW), "Live");
  assert.equal(ads.adStatus({ ...base, enabled: false }, NOW), "Disabled");
  assert.equal(ads.adStatus({ ...base, startsAt: "2026-12-02T00:00:00.000Z" }, NOW), "Scheduled");
  assert.equal(ads.adStatus({ ...base, endsAt: "2026-11-01T00:00:00.000Z" }, NOW), "Expired");
  assert.equal(ads.adIsLive({ ...base, enabled: false }, NOW), false);
});

test("a slot renders the newest live ad and nothing when every ad is paused", () => {
  const older = { ...base, id: "ad_old", startsAt: "2026-11-01T00:00:00.000Z" };
  const newer = { ...base, id: "ad_new", startsAt: "2026-11-10T00:00:00.000Z" };
  const paused = { ...base, id: "ad_paused", enabled: false, startsAt: "2026-11-20T00:00:00.000Z" };
  const otherSlot = { ...base, id: "ad_other", slot: "guide-rail" };
  assert.equal(ads.activeAdFor([older, newer, paused, otherSlot], "home-hero", NOW).id, "ad_new");
  assert.equal(ads.activeAdFor([paused], "home-hero", NOW), null);
  assert.equal(ads.activeAdFor([otherSlot], "home-hero", NOW), null);
});

test("the ad draft rejects copy that cannot be published", () => {
  const good = ads.adDraftFrom(base, NOW);
  assert.deepEqual(ads.validateAdDraft(good), []);
  assert.equal(ads.validateAdDraft({ ...good, name: "  " }).length, 1);
  assert.equal(ads.validateAdDraft({ ...good, headline: "" }).length, 1);
  assert.equal(ads.validateAdDraft({ ...good, headline: "x".repeat(61) }).length, 1);
  assert.equal(ads.validateAdDraft({ ...good, body: "x".repeat(161) }).length, 1);
  assert.equal(ads.validateAdDraft({ ...good, ctaHref: "shop" }).length, 1);
  assert.equal(ads.validateAdDraft({ ...good, imageUrl: "photo.jpg" }).length, 1);
  assert.equal(ads.validateAdDraft({ ...good, startsAt: "2026-12-05", endsAt: "2026-12-01" }).length, 1);
});

test("saving, pausing and deleting an ad go through the one demo store", () => {
  const data = admin.createAdminDemoData(NOW);
  const draft = { ...ads.adDraftFrom(base, NOW), name: "  Draft campaign  ", headline: "  Copy  " };
  const created = ads.adFromDraft(draft, undefined, NOW);
  assert.equal(created.name, "Draft campaign");
  assert.equal(created.headline, "Copy");
  assert.equal(created.enabled, true);
  assert.match(created.startsAt, /T00:00:00\.000Z$/);

  const withAd = ads.upsertAd(data, created);
  assert.ok(withAd.ads.some((ad) => ad.id === created.id));
  const edited = ads.upsertAd(withAd, { ...created, headline: "Edited" });
  assert.equal(edited.ads.find((ad) => ad.id === created.id).headline, "Edited");
  assert.equal(edited.ads.length, withAd.ads.length);

  const paused = ads.toggleAd(edited, created.id);
  assert.equal(paused.ads.find((ad) => ad.id === created.id).enabled, false);
  assert.equal(ads.removeAd(paused, created.id).ads.some((ad) => ad.id === created.id), false);
});

test("the seed campaigns cover the slots with valid copy", () => {
  const seeded = admin.createAdminDemoData(NOW).ads;
  assert.ok(seeded.length >= 3);
  assert.equal(new Set(seeded.map((ad) => ad.id)).size, seeded.length);
  for (const ad of seeded) {
    assert.deepEqual(ads.validateAdDraft(ads.adDraftFrom(ad, NOW)), [], ad.id);
    assert.ok(ads.AD_SLOTS.some((slot) => slot.id === ad.slot), `${ad.id} uses a known slot`);
  }
  assert.ok(seeded.some((ad) => ads.adStatus(ad, NOW) === "Live"));
  assert.ok(seeded.some((ad) => ads.adStatus(ad, NOW) === "Disabled"));
  assert.equal(ads.AD_SLOTS.length, 5);
  assert.equal(ads.adSlotLabel("home-hero"), "Home hero");
});

test("Ads is a registered admin module with its own route and screen", () => {
  assert.ok(admin.ADMIN_MODULES.some((module) => module.id === "ads" && module.label === "Ads"));
  const shell = readFileSync(path.join(__dirname, "..", "apps/web/src/components/admin/AdminShell.tsx"), "utf8");
  assert.match(shell, /id: "ads", label: "Ads", href: "\/admin\/ads", icon: Megaphone/);
  assert.ok(existsSync(path.join(__dirname, "..", "apps/web/src/app/admin/ads/page.tsx")));
  const page = readFileSync(path.join(__dirname, "..", "apps/web/src/app/admin/ads/page.tsx"), "utf8");
  assert.match(page, /AdminAds/);
  assert.match(page, /robots: \{ index: false, follow: false \}/);

  const source = readFileSync(path.join(__dirname, "..", "apps/web/src/components/admin/AdminAds.tsx"), "utf8");
  for (const marker of [
    'active="ads"',
    "data-admin-ad={ad.id}",
    "data-ad-status={status}",
    "data-ad-preview",
    'aria-label="Create an ad"',
    'aria-label="Ad headline"',
    'aria-label="Ad link"',
    'aria-label="Ad start date"',
    'aria-label="Ad end date"',
    "upsertAd",
    "toggleAd",
    "removeAd",
  ]) {
    assert.ok(source.includes(marker), `AdminAds is missing ${marker}`);
  }
});
