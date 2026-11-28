const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { loadModule } = require("./helpers/load-ts-module.cjs");
const ts = require("typescript");



const admin = loadModule("apps/web/src/lib/admin-demo-data.ts");
const assets = loadModule("apps/web/src/lib/post-assets.ts");

const NOW = Date.UTC(2026, 10, 21, 9, 0, 0);

function attributes(optionsByKey) {
  return admin.TSHIRT_POST_ATTRIBUTES.map((attribute) => ({
    key: attribute.key,
    label: attribute.label,
    options: optionsByKey[attribute.key] ?? [],
    enabled: Boolean(optionsByKey[attribute.key]?.length),
  }));
}

function draft(overrides = {}) {
  return {
    category: "T-Shirt",
    tags: [],
    title: "Peacock Line Tee",
    description: "Single-colour line art.",
    svg: { url: "data:image/svg+xml;utf8,%3Csvg%2F%3E", fileName: "peacock.svg", sizeBytes: 512 },
    attributes: attributes({
      size: ["S", "M", "XL"],
      material: ["Combed Cotton", "Compact Combed Cotton"],
      color: ["Black", "Navy"],
      print: ["DTF", "Sublimation"],
    }),
    prices: [
      { id: "row-1", options: { size: "M", material: "Combed Cotton", color: "Black", print: "DTF" }, priceKs: "22000" },
      { id: "row-2", options: { size: "XL", material: "Compact Combed Cotton", color: "Navy", print: "Sublimation" }, priceKs: "31000" },
    ],
    status: "Draft",
    ...overrides,
  };
}

test("the Posts module is registered and seeds attribute-priced T-shirt posts", () => {
  assert.ok(admin.ADMIN_MODULES.some((module) => module.id === "posts" && module.label === "Posts"));
  const data = admin.createAdminDemoData(NOW);
  assert.ok(data.tshirtPosts.length >= 2);
  for (const post of data.tshirtPosts) {
    assert.ok(post.svg?.url.startsWith("data:image/svg+xml;utf8,"), `${post.id} needs an SVG`);
    assert.ok(post.attributes.length >= 2);
    assert.ok(post.prices.length >= 1);
    for (const row of post.prices) {
      assert.ok(row.priceKs > 0);
      for (const attribute of post.attributes) {
        assert.ok(row.options[attribute.key], `${post.id} row ${row.id} misses ${attribute.key}`);
        assert.ok(attribute.options.includes(row.options[attribute.key]));
      }
    }
  }
});

test("the same size carries different prices when the other attributes differ", () => {
  const post = admin.tshirtPostFromDraft(draft({
    prices: [
      { id: "row-1", options: { size: "XL", material: "Combed Cotton", color: "Black", print: "DTF" }, priceKs: "24000" },
      { id: "row-2", options: { size: "XL", material: "Compact Combed Cotton", color: "Navy", print: "Sublimation" }, priceKs: "31000" },
    ],
  }), undefined, new Date(NOW));
  assert.deepEqual(post.prices.map((row) => row.priceKs), [24000, 31000]);
  assert.equal(admin.tshirtPostFromPriceKs(post), 24000);
});

test("draft validation rejects an incomplete, unpriced or duplicated combination", () => {
  assert.deepEqual(admin.validateTshirtPostDraft(draft()), []);
  assert.match(admin.validateTshirtPostDraft(draft({ title: " " })).join(" "), /title is required/i);
  assert.match(admin.validateTshirtPostDraft(draft({ title: "x".repeat(81) })).join(" "), /under 80 characters/i);
  assert.match(admin.validateTshirtPostDraft(draft({ svg: null })).join(" "), /attach the svg/i);
  assert.match(admin.validateTshirtPostDraft(draft({ attributes: attributes({}) })).join(" "), /at least one attribute/i);
  assert.match(admin.validateTshirtPostDraft(draft({ prices: [] })).join(" "), /at least one price combination/i);

  const missing = draft({ prices: [{ id: "row-1", options: { size: "M", material: "Combed Cotton", color: "Black" }, priceKs: "22000" }] });
  assert.match(admin.validateTshirtPostDraft(missing).join(" "), /needs a print method value/i);

  const unpriced = draft({ prices: [{ id: "row-1", options: { size: "M", material: "Combed Cotton", color: "Black", print: "DTF" }, priceKs: "" }] });
  assert.match(admin.validateTshirtPostDraft(unpriced).join(" "), /set a price for M · Combed Cotton · Black · DTF/i);

  const duplicated = draft({
    prices: [
      { id: "row-1", options: { size: "M", material: "Combed Cotton", color: "Black", print: "DTF" }, priceKs: "22000" },
      { id: "row-2", options: { size: "M", material: "Combed Cotton", color: "Black", print: "DTF" }, priceKs: "23000" },
    ],
  });
  assert.match(admin.validateTshirtPostDraft(duplicated).join(" "), /repeat/i);

  const tooMany = draft({ prices: Array.from({ length: 41 }, (_, index) => ({
    id: `row-${index}`,
    options: { size: "M", material: "Combed Cotton", color: "Black", print: "DTF" },
    priceKs: "22000",
  })) });
  assert.match(admin.validateTshirtPostDraft(tooMany).join(" "), /under 40 combinations/i);

  const overCap = draft({ prices: [{ id: "row-1", options: { size: "M", material: "Combed Cotton", color: "Black", print: "DTF" }, priceKs: "12000000" }] });
  assert.match(admin.validateTshirtPostDraft(overCap).join(" "), /under Ks 10,000,000/i);
});

test("price rows follow the ticked options instead of keeping a stale value", () => {
  const rows = [{ id: "row-1", options: { size: "XL", material: "Blend", color: "Navy", print: "DTF" }, priceKs: "26000" }];
  const reconciled = admin.reconcileTshirtPriceRows([
    { key: "size", label: "Size", options: ["M", "L"] },
    { key: "material", label: "Fabric Type", options: ["Combed Cotton"] },
    { key: "color", label: "Color", options: ["Black", "Navy"] },
    { key: "print", label: "Print", options: ["DTF"] },
    { key: "gsm", label: "GSM", options: ["180 GSM", "220 GSM"] },
  ], rows);
  assert.deepEqual(reconciled[0].options, { size: "M", material: "Combed Cotton", color: "Navy", print: "DTF", gsm: "180 GSM" });
  assert.equal(reconciled[0].priceKs, "26000");
});

test("a new price row starts complete so only the price needs typing", () => {
  const active = admin.tshirtDraftAttributes(draft()).map(({ key, label, options }) => ({ key, label, options }));
  const row = admin.emptyTshirtPriceRow(active);
  assert.deepEqual(row.options, { size: "S", material: "Combed Cotton", color: "Black", print: "DTF" });
  assert.equal(row.priceKs, "");
});

test("publishing stamps publishedAt once and unpublishing clears it", () => {
  const created = admin.tshirtPostFromDraft(draft({ status: "Published" }), undefined, new Date(NOW));
  assert.equal(created.publishedAt, new Date(NOW).toISOString());
  assert.equal(created.createdAt, new Date(NOW).toISOString());

  const later = new Date(NOW + 86400000);
  const edited = admin.tshirtPostFromDraft(draft({ status: "Published", title: "Renamed" }), created, later);
  assert.equal(edited.id, created.id);
  assert.equal(edited.createdAt, created.createdAt);
  assert.equal(edited.publishedAt, created.publishedAt);
  assert.equal(edited.title, "Renamed");

  assert.equal(admin.tshirtPostFromDraft(draft({ status: "Draft" }), created, later).publishedAt, null);
});

test("upsert prepends new posts, replaces edited ones and delete removes them", () => {
  const start = admin.createAdminDemoData(NOW);
  const fresh = admin.tshirtPostFromDraft(draft({ title: "Fresh drop" }), undefined, new Date(NOW));
  const added = admin.upsertTshirtPost(start, fresh);
  assert.equal(added.tshirtPosts[0].id, fresh.id);
  assert.equal(added.tshirtPosts.length, start.tshirtPosts.length + 1);

  const updated = admin.upsertTshirtPost(added, { ...fresh, title: "Fresh drop v2" });
  assert.equal(updated.tshirtPosts.length, added.tshirtPosts.length);
  assert.equal(updated.tshirtPosts[0].title, "Fresh drop v2");

  const removed = admin.removeTshirtPost(updated, fresh.id);
  assert.equal(removed.tshirtPosts.some((post) => post.id === fresh.id), false);
  assert.equal(removed.tshirtPosts.length, start.tshirtPosts.length);
});

test("a saved post round-trips through the drawer without losing a price", () => {
  const post = admin.createAdminDemoData(NOW).tshirtPosts[0];
  const round = admin.tshirtPostDraftFrom(post);
  assert.equal(round.title, post.title);
  assert.deepEqual(
    admin.tshirtPostFromDraft(round, post, new Date(NOW)),
    post,
  );
});

test("posts saved with per-size prices are converted to combinations", () => {
  const legacy = {
    id: "post-legacy",
    title: "Legacy tee",
    description: "",
    svg: null,
    colors: [{ name: "Black", hex: "#111111", priceKs: 0 }, { name: "Navy", hex: "#203459", priceKs: 1000 }],
    sizes: [{ size: "M", priceKs: 20000 }, { size: "XL", priceKs: 23000 }],
    status: "Published",
    createdAt: new Date(NOW).toISOString(),
    publishedAt: new Date(NOW).toISOString(),
  };
  const converted = admin.normalizeTshirtPost(legacy);
  assert.deepEqual(converted.attributes, [
    { key: "size", label: "Size", options: ["M", "XL"] },
    { key: "color", label: "Color", options: ["Black", "Navy"] },
  ]);
  assert.deepEqual(converted.prices.map((row) => [row.options.size, row.options.color, row.priceKs]), [
    ["M", "Black", 20000],
    ["M", "Navy", 21000],
    ["XL", "Black", 23000],
    ["XL", "Navy", 24000],
  ]);
  assert.equal(converted.title, "Legacy tee");

  const current = admin.createAdminDemoData(NOW).tshirtPosts[0];
  assert.equal(admin.normalizeTshirtPost(current), current);
});

test("SVG uploads accept only .svg files and hand back a data URL", async () => {
  assert.equal(assets.isSvgFile({ name: "print.svg", type: "" }), true);
  assert.equal(assets.isSvgFile({ name: "print.SVG", type: "" }), true);
  assert.equal(assets.isSvgFile({ name: "print.png", type: "image/png" }), false);

  const file = new File(["<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>"], "peacock.svg", { type: "image/svg+xml" });
  const stored = await assets.storePostSvg(file);
  assert.equal(stored.fileName, "peacock.svg");
  assert.match(stored.url, /^data:image\/svg\+xml;utf8,/);
  assert.equal(decodeURIComponent(stored.url.split(",")[1]), "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>");
  assert.equal(stored.sizeBytes, file.size);

  await assert.rejects(() => assets.storePostSvg({ name: "print.png", type: "image/png", size: 10, text: async () => "" }), /\.svg/);
  await assert.rejects(() => assets.storePostSvg({ name: "big.svg", type: "image/svg+xml", size: assets.MAX_POST_SVG_BYTES + 1, text: async () => "<svg/>" }), /2 MB/);
  await assert.rejects(() => assets.storePostSvg({ name: "empty.svg", type: "image/svg+xml", size: 1, text: async () => "   " }), /empty/);
});

test("the Posts screen exposes the three post types and combination pricing", () => {
  const source = readFileSync(path.join(__dirname, "..", "apps/web/src/components/admin/AdminPosts.tsx"), "utf8");

  assert.match(source, /data-post-tab=\{entry\.id\}/);
  for (const tab of ["guide", "tshirt", "nyein"]) {
    assert.match(source, new RegExp(`\\{ id: "${tab}", label: `), `missing ${tab} tab`);
  }
  assert.match(source, /role="tablist"/);
  assert.match(source, /aria-label="T-shirt post SVG file"/);
  assert.match(source, /accept="\.svg,image\/svg\+xml"/);
  assert.match(source, /data-post-attribute=\{attribute\.key\}/);
  assert.match(source, /data-post-option=\{`\$\{attribute\.key\}:\$\{option\}`\}/);
  assert.match(source, /data-post-price-row=\{row\.id\}/);
  assert.match(source, /aria-label=\{`Row \$\{index \+ 1\} \$\{attribute\.label\}`\}/);
  assert.match(source, /aria-label=\{`Row \$\{index \+ 1\} price`\}/);
  assert.match(source, /aria-label="Add combination"/);
  assert.match(source, /validateTshirtPostDraft\(draft\)/);
  assert.match(source, /upsertTshirtPost\(current, post\)/);
  assert.match(source, /removeTshirtPost\(current, post\.id\)/);
  assert.match(source, /storePostSvg\(file\)/);
  assert.match(source, /tshirtPostFromPriceKs\(post\)/);
  assert.match(source, /reconcileTshirtPriceRows/);
});

test("the Posts route, nav entry and manifest are wired", () => {
  assert.ok(existsSync(path.join(__dirname, "..", "apps/web/src/app/admin/posts/page.tsx")));
  const page = readFileSync(path.join(__dirname, "..", "apps/web/src/app/admin/posts/page.tsx"), "utf8");
  assert.match(page, /AdminPosts/);
  assert.match(page, /robots: \{ index: false, follow: false \}/);

  // The shell's sidebar and the storefront menu share one list.
  const shell = readFileSync(path.join(__dirname, "..", "apps/web/src/components/admin/AdminShell.tsx"), "utf8");
  const nav = readFileSync(path.join(__dirname, "..", "apps/web/src/lib/admin-nav.ts"), "utf8");
  assert.match(shell, /ADMIN_NAV\.map\(\(entry\) => \(/);
  assert.match(nav, /id: "posts", label: "Posts", href: "\/admin\/posts"/);

  const manifest = JSON.parse(readFileSync(path.join(__dirname, "..", "apps/web/public/manus-routes.json"), "utf8"));
  assert.ok(manifest.routes.some((route) => route.path === "/admin/posts"));
});

test("saved demo data without posts is backfilled and legacy posts are normalised", () => {
  const source = readFileSync(path.join(__dirname, "..", "apps/web/src/lib/admin-demo-data.ts"), "utf8");
  assert.match(source, /Array\.isArray\(parsed\.tshirtPosts\)/);
  assert.match(source, /parsed\.tshirtPosts\.map\(normalizeTshirtPost\)/);
  assert.match(source, /tshirtPosts: Array\.isArray\(parsed\.tshirtPosts\)\s*\?\s*parsed\.tshirtPosts\.map\(normalizeTshirtPost\)\s*:\s*createSeedTshirtPosts\(Date\.now\(\)\)/s);
});
