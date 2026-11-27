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
  name: "Hero photo",
  mediaType: "image",
  mediaUrl: "/ads/hero.jpg",
  posterUrl: "",
  fit: "cover",
  alt: "Two models in MH Signature tees",
  href: "/new",
  enabled: true,
  startsAt: "2026-11-01T00:00:00.000Z",
  endsAt: "2026-12-01T23:59:59.999Z",
};

test("an ad is a photo or a looping video, and is live only inside its window", () => {
  assert.equal(ads.adStatus(base, NOW), "Live");
  assert.equal(ads.adStatus({ ...base, enabled: false }, NOW), "Disabled");
  assert.equal(ads.adStatus({ ...base, startsAt: "2026-12-02T00:00:00.000Z" }, NOW), "Scheduled");
  assert.equal(ads.adStatus({ ...base, endsAt: "2026-11-01T00:00:00.000Z" }, NOW), "Expired");
  assert.equal(ads.adIsLive({ ...base, enabled: false }, NOW), false);
  assert.deepEqual(ads.AD_SLOTS.map((slot) => slot.id), [
    "home-hero", "home-strip", "home-lower", "new-top", "products-top", "guide-top",
  ]);
  // Every place names its page, so the board can say where a banner will appear.
  for (const slot of ads.AD_SLOTS) {
    assert.ok(slot.page.startsWith("/"), `${slot.id} has no page`);
    assert.ok(slot.label && slot.where && slot.size, `${slot.id} is missing board copy`);
    assert.equal(ads.adSlotPage(slot.id), slot.page);
  }
  assert.equal(ads.adSlotLabel("home-strip"), "Home strip");
});

test("a slot renders the newest live ad and nothing when every ad is paused", () => {
  const older = { ...base, id: "ad_old", startsAt: "2026-11-01T00:00:00.000Z" };
  const newer = { ...base, id: "ad_new", mediaType: "video", mediaUrl: "/ads/hero.mp4", startsAt: "2026-11-10T00:00:00.000Z" };
  const paused = { ...base, id: "ad_paused", enabled: false, startsAt: "2026-11-20T00:00:00.000Z" };
  const otherSlot = { ...base, id: "ad_other", slot: "home-strip" };
  assert.equal(ads.activeAdFor([older, newer, paused, otherSlot], "home-hero", NOW).id, "ad_new");
  assert.equal(ads.activeAdFor([paused], "home-hero", NOW), null);
  assert.equal(ads.activeAdFor([otherSlot], "home-hero", NOW), null);
});

test("a short animation can ride along as an animated GIF instead of a video", () => {
  assert.equal(ads.looksAnimatedMedia("/ads/hero.gif"), true);
  assert.equal(ads.looksAnimatedMedia("/ads/hero.GIF?v=2"), true);
  assert.equal(ads.looksAnimatedMedia("https://cdn.example.com/loop.webp"), true);
  assert.equal(ads.looksAnimatedMedia("data:image/gif;base64,R0lGOD"), true);
  assert.equal(ads.looksAnimatedMedia("/ads/hero.jpg"), false);
  assert.equal(ads.looksAnimatedMedia("data:image/png;base64,AAA"), false);

  assert.equal(ads.adMediaKind({ mediaType: "image", mediaUrl: "/ads/hero.gif" }), "GIF");
  assert.equal(ads.adMediaKind({ mediaType: "image", mediaUrl: "/ads/hero.jpg" }), "Photo");
  assert.equal(ads.adMediaKind({ mediaType: "video", mediaUrl: "/ads/hero.mp4" }), "Video");

  // A GIF is an image, so the photo rules apply and it can even be picked from the computer.
  const gif = ads.adDraftFrom({ ...base, mediaUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=" }, NOW);
  assert.deepEqual(ads.validateAdDraft(gif), []);
});

test("the draft only accepts media the storefront can play", () => {
  const good = ads.adDraftFrom(base, NOW);
  assert.deepEqual(ads.validateAdDraft(good), []);

  assert.equal(ads.validateAdDraft({ ...good, name: "  " }).length, 1);
  assert.equal(ads.validateAdDraft({ ...good, mediaUrl: "" }).length, 1);
  assert.equal(ads.validateAdDraft({ ...good, mediaUrl: "hero.jpg" }).length, 1);
  assert.equal(ads.validateAdDraft({ ...good, mediaUrl: "data:image/png;base64,AAA" }).length, 0);
  // A picked picture is fine; a video has to be a real URL.
  assert.equal(ads.validateAdDraft({ ...good, mediaType: "video", mediaUrl: "data:image/png;base64,AAA" }).length, 1);
  assert.equal(ads.validateAdDraft({ ...good, mediaType: "video", mediaUrl: "/ads/hero.mp4" }).length, 0);
  assert.equal(ads.validateAdDraft({ ...good, posterUrl: "poster.jpg" }).length, 1);
  assert.equal(ads.validateAdDraft({ ...good, alt: "" }).length, 1);
  assert.equal(ads.validateAdDraft({ ...good, alt: "x".repeat(121) }).length, 1);
  assert.equal(ads.validateAdDraft({ ...good, href: "new" }).length, 1);
  assert.equal(ads.validateAdDraft({ ...good, href: "" }).length, 0);
  assert.equal(ads.validateAdDraft({ ...good, startsAt: "2026-12-05", endsAt: "2026-12-01" }).length, 1);
});

test("saving, pausing and deleting an ad go through the one demo store", () => {
  const data = admin.createAdminDemoData(NOW);
  assert.deepEqual(data.ads, [], "no seeded ads: the owner supplies the artwork");

  const draft = { ...ads.adDraftFrom(base, NOW), name: "  Hero photo  ", alt: "  Copy  ", posterUrl: "/ads/ignored.jpg" };
  const created = ads.adFromDraft(draft, undefined, NOW);
  assert.equal(created.name, "Hero photo");
  assert.equal(created.alt, "Copy");
  assert.equal(created.enabled, true);
  assert.equal(created.posterUrl, "", "a photo keeps no poster");
  // The window is a Yangon day, not the device's day.
  const yangonClock = (iso) => new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Yangon", hour12: false });
  assert.match(yangonClock(created.startsAt), /00:00:00$/, "an ad starts at midnight in Yangon");
  assert.match(yangonClock(created.endsAt), /23:59:59$/, "and ends at the last second of the Yangon day");
  assert.equal(ads.adDraftFrom(created, NOW).startsAt, draft.startsAt, "the input shows the same Yangon day again");
  assert.equal(ads.adDraftFrom(created, NOW).endsAt, draft.endsAt);

  const video = ads.adFromDraft({ ...draft, mediaType: "video", mediaUrl: "/ads/hero.mp4", posterUrl: "/ads/poster.jpg" }, undefined, NOW);
  assert.equal(video.posterUrl, "/ads/poster.jpg");

  const withAd = ads.upsertAd(data, created);
  assert.ok(withAd.ads.some((ad) => ad.id === created.id));
  const edited = ads.upsertAd(withAd, { ...created, alt: "Edited" });
  assert.equal(edited.ads.find((ad) => ad.id === created.id).alt, "Edited");
  assert.equal(edited.ads.length, withAd.ads.length);

  const paused = ads.toggleAd(edited, created.id);
  assert.equal(paused.ads.find((ad) => ad.id === created.id).enabled, false);
  assert.equal(ads.removeAd(paused, created.id).ads.some((ad) => ad.id === created.id), false);
});

test("a ready-made leaderboard can be shown whole instead of cropped", () => {
  assert.deepEqual(ads.AD_FITS.map((fit) => fit.id), ["cover", "contain"]);
  const draft = { ...ads.adDraftFrom(base, NOW), fit: "contain", mediaUrl: "https://example.com/728x90.gif" };
  assert.deepEqual(ads.validateAdDraft(draft), []);
  assert.equal(ads.adFromDraft(draft, undefined, NOW).fit, "contain");
  assert.equal(ads.adFromDraft({ ...draft, fit: "cover" }, undefined, NOW).fit, "cover");
  // An unknown value falls back to filling the box rather than breaking the banner.
  assert.equal(ads.adFromDraft({ ...draft, fit: "stretch" }, undefined, NOW).fit, "cover");
  assert.equal(ads.adDraftFrom(base, NOW).fit, "cover");
});

test("Ads is a registered admin module with its own route and screen", () => {
  assert.ok(admin.ADMIN_MODULES.some((module) => module.id === "ads" && module.label === "Ads"));
  // The shell's sidebar and the storefront menu share one list.
  const shell = readFileSync(path.join(__dirname, "..", "apps/web/src/components/admin/AdminShell.tsx"), "utf8");
  const nav = readFileSync(path.join(__dirname, "..", "apps/web/src/lib/admin-nav.ts"), "utf8");
  assert.match(shell, /ADMIN_NAV\.map\(\(entry\) => \(/);
  assert.match(nav, /id: "ads", label: "Ads", href: "\/admin\/ads"/);
  assert.ok(existsSync(path.join(__dirname, "..", "apps/web/src/app/admin/ads/page.tsx")));
  const page = readFileSync(path.join(__dirname, "..", "apps/web/src/app/admin/ads/page.tsx"), "utf8");
  assert.match(page, /AdminAds/);
  assert.match(page, /robots: \{ index: false, follow: false \}/);

  const source = readFileSync(path.join(__dirname, "..", "apps/web/src/components/admin/AdminAds.tsx"), "utf8");
  for (const marker of [
    'active="ads"',
    "data-ad-slot-row={slot.id}",
    "data-ad-status={status}",
    "data-ad-media={ad.mediaType}",
    "formatAdminDate(ad.startsAt)",
    "data-ad-preview",
    'aria-label="Ad media URL"',
    'aria-label="Pick an ad photo"',
    'aria-label="Ad description"',
    "Animation video",
    "Banner photo",
    "animated GIF or WebP picked as a photo loops on its own",
    "Pick a photo or an animated GIF",
    "adMediaKind(ad)",
    'aria-label="Ad fit"',
    "AD_FITS.map",
    "upsertAd",
    "toggleAd",
    "removeAd",
    "data-ad-slot-row={slot.id}",
    "data-ad-count={banners.length}",
    "data-ad-banner={ad.id}",
    "adsForSlot(data.ads, slot.id)",
    'aria-label="Seconds between banners"',
    "adsRotationSeconds",
    'aria-label={`Add a banner to ${slot.label}`}',
    'aria-label={`Edit ${ad.name}`}',
    'aria-label={`Clear ${ad.name}`}',
    'aria-label={`${ad.enabled ? "Pause" : "Enable"} ${ad.name}`}',
  ]) {
    assert.ok(source.includes(marker), `AdminAds is missing ${marker}`);
  }
});

test("a place can hold many banners, and they take turns by the clock", () => {
  const first = { ...base, id: "ad_a", slot: "home-strip", startsAt: "2026-11-01T00:00:00.000Z" };
  const second = { ...base, id: "ad_b", slot: "home-strip", startsAt: "2026-11-02T00:00:00.000Z" };
  const third = { ...base, id: "ad_c", slot: "home-strip", startsAt: "2026-11-03T00:00:00.000Z" };
  const all = [third, first, second];

  // Every banner filed under a place is listed, in the order it was added.
  assert.deepEqual(ads.adsForSlot(all, "home-strip").map((ad) => ad.id), ["ad_c", "ad_a", "ad_b"]);
  assert.deepEqual(ads.adsForSlot(all, "guide-top"), []);

  // Only live ones take part in the turn, oldest first, so the cycle is stable.
  const paused = { ...base, id: "ad_paused", slot: "home-strip", enabled: false };
  assert.deepEqual(ads.liveAdsFor([...all, paused], "home-strip", NOW).map((ad) => ad.id), ["ad_a", "ad_b", "ad_c"]);

  // One live banner stays up for as long as it runs.
  assert.equal(ads.adForMoment([first], "home-strip", NOW, 8).id, "ad_a");
  assert.equal(ads.adForMoment([first], "home-strip", NOW + 5 * 60 * 1000, 8).id, "ad_a");

  // Several live banners share the place: each turn lasts the configured number of seconds.
  const at = (ms) => ads.adForMoment([...all, paused], "home-strip", ms, 10).id;
  const turn = 10 * 1000;
  const base0 = Math.floor(NOW / turn) * turn;
  assert.equal(at(base0), "ad_a");
  assert.equal(at(base0 + turn), "ad_b");
  assert.equal(at(base0 + 2 * turn), "ad_c");
  assert.equal(at(base0 + 3 * turn), "ad_a");
  // The turn comes from the clock alone, so two visitors asking at the same moment agree.
  assert.equal(at(base0 + turn + 1), at(base0 + turn + 999));

  // A scheduled banner waits for its dates and then joins the turn.
  const later = { ...base, id: "ad_later", slot: "home-strip", startsAt: "2026-11-25T00:00:00.000Z", endsAt: "2026-12-20T23:59:59.999Z" };
  assert.equal(ads.liveAdsFor([...all, later], "home-strip", NOW).length, 3);
  assert.equal(ads.liveAdsFor([...all, later], "home-strip", Date.parse("2026-11-26T00:00:00.000Z")).length, 4);
  // Once the older three expire the place keeps showing the one still inside its window.
  const afterExpiry = Date.parse("2026-12-10T00:00:00.000Z");
  assert.deepEqual(ads.liveAdsFor([...all, later], "home-strip", afterExpiry).map((ad) => ad.id), ["ad_later"]);

  // A place with nothing live renders nothing, so the page falls back to its own markup.
  assert.equal(ads.adForMoment([paused], "home-strip", NOW, 10), null);
});

test("the speed a place changes banners is saved and clamped", () => {
  assert.equal(admin.DEFAULT_ADS_ROTATION_SECONDS, 8);
  assert.deepEqual([...admin.ADS_ROTATION_CHOICES], [4, 6, 8, 12, 20, 30]);
  assert.equal(admin.normalizeAdsRotationSeconds(12), 12);
  assert.equal(admin.normalizeAdsRotationSeconds("20"), 20);
  assert.equal(admin.normalizeAdsRotationSeconds(undefined), 8);
  assert.equal(admin.normalizeAdsRotationSeconds(0), 2);
  assert.equal(admin.normalizeAdsRotationSeconds(9999), 120);
  assert.equal(admin.createAdminDemoData().adsRotationSeconds, 8);
});

test("the board shows one row per place, and the same ad is what the storefront shows", () => {
  const hero = { ...base, id: "ad_hero", slot: "home-hero" };
  const future = { ...base, id: "ad_future", slot: "new-top", startsAt: "2026-12-05T00:00:00.000Z", endsAt: "2026-12-20T23:59:59.999Z" };
  const adsOnFile = [hero, future];

  // A live ad is what the board offers for editing, and what the storefront renders.
  assert.equal(ads.adForSlot(adsOnFile, "home-hero", NOW).id, "ad_hero");
  assert.equal(ads.activeAdFor(adsOnFile, "home-hero", NOW).id, "ad_hero");
  // A scheduled ad is editable on the board but must not render yet.
  assert.equal(ads.adForSlot(adsOnFile, "new-top", NOW).id, "ad_future");
  assert.equal(ads.activeAdFor(adsOnFile, "new-top", NOW), null);
  // A paused ad stays editable instead of vanishing from the board.
  const paused = { ...base, id: "ad_paused", slot: "products-top", enabled: false };
  assert.equal(ads.adForSlot([paused], "products-top", NOW).id, "ad_paused");
  assert.equal(ads.activeAdFor([paused], "products-top", NOW), null);
  // Empty places stay empty.
  assert.equal(ads.adForSlot(adsOnFile, "guide-top", NOW), null);
  // An expired ad is still reachable, newest first.
  const older = { ...base, id: "ad_older", slot: "guide-top", startsAt: "2026-10-01T00:00:00.000Z", endsAt: "2026-10-10T23:59:59.999Z" };
  const newer = { ...base, id: "ad_newer", slot: "guide-top", startsAt: "2026-10-11T00:00:00.000Z", endsAt: "2026-10-20T23:59:59.999Z" };
  assert.equal(ads.adForSlot([older, newer], "guide-top", NOW).id, "ad_newer");
});

test("every page with a place mounts its banner", () => {
  const read = (file) => readFileSync(path.join(__dirname, "..", "apps/web/src/app", file), "utf8");
  assert.match(read("page.tsx"), /<AdSlotBanner slot="home-hero" variant="hero">/);
  assert.match(read("page.tsx"), /<AdSlotBanner slot="home-strip" \/>/);
  assert.match(read("page.tsx"), /<AdSlotBanner slot="home-lower" \/>/);
  assert.match(read("new/page.tsx"), /<AdSlotBanner slot="new-top" \/>/);
  assert.match(read("products/page.tsx"), /<AdSlotBanner slot="products-top" \/>/);
  assert.match(read("guide/page.tsx"), /<AdSlotBanner slot="guide-top" \/>/);
});

test("the home page renders the live hero ad and falls back to the green hero", () => {
  const home = readFileSync(path.join(__dirname, "..", "apps/web/src/app/page.tsx"), "utf8");
  assert.match(home, /<AdSlotBanner slot="home-hero" variant="hero">/);
  assert.match(home, /<AdSlotBanner slot="home-strip" \/>/);
  assert.match(home, /<T k="home\.heroTitle1" \/>/);
  assert.match(readFileSync(path.join(__dirname, "..", "apps/web/src/lib/i18n.tsx"), "utf8"), /"home\.heroTitle1": "Design Your"/);

  const banner = readFileSync(path.join(__dirname, "..", "apps/web/src/components/AdSlotBanner.tsx"), "utf8");
  for (const marker of ["data-ad-image", "data-ad-video", "autoPlay", "muted", "loop", "playsInline", "data-ad-slot-banner={slot}", "children ?? null", 'ad.fit === "contain" ? "block h-auto w-full" : "h-full w-full object-cover"']) {
    assert.ok(banner.includes(marker), `AdSlotBanner is missing ${marker}`);
  }

  const store = readFileSync(path.join(__dirname, "..", "apps/web/src/lib/storefront-ads.ts"), "utf8");
  assert.match(store, /"mh-fashion-admin-demo-data-v1"/);
  assert.match(store, /adForMoment\(store\.ads, slot, now, store\.rotationSeconds\)/);
  assert.match(store, /rotationSeconds: normalizeAdsRotationSeconds\(parsed\.adsRotationSeconds\)/);
  assert.match(store, /addEventListener\("storage"/);
});
