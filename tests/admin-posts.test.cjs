const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function loadModule(relativePath) {
  const sourcePath = path.join(__dirname, "..", relativePath);
  const compiled = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: sourcePath,
  }).outputText;
  const loaded = { exports: {} };
  new Function("module", "exports", compiled)(loaded, loaded.exports);
  return loaded.exports;
}

const admin = loadModule("apps/web/src/lib/admin-demo-data.ts");
const assets = loadModule("apps/web/src/lib/post-assets.ts");

const NOW = Date.UTC(2026, 10, 21, 9, 0, 0);

function draft(overrides = {}) {
  return {
    title: "Peacock Line Tee",
    description: "Single-colour line art.",
    svg: { url: "data:image/svg+xml;utf8,%3Csvg%2F%3E", fileName: "peacock.svg", sizeBytes: 512 },
    colors: [{ name: "Black", hex: "#111111", priceKs: "" }],
    sizes: [{ size: "M", priceKs: "22000" }],
    status: "Draft",
    ...overrides,
  };
}

test("the Posts module is registered with the other admin modules", () => {
  assert.ok(admin.ADMIN_MODULES.some((module) => module.id === "posts" && module.label === "Posts"));
  const data = admin.createAdminDemoData(NOW);
  assert.ok(Array.isArray(data.tshirtPosts));
  assert.ok(data.tshirtPosts.length >= 2);
});

test("the seed T-shirt posts carry an SVG, colours and per-size prices", () => {
  const data = admin.createAdminDemoData(NOW);
  for (const post of data.tshirtPosts) {
    assert.ok(post.svg, `${post.id} needs an SVG`);
    assert.match(post.svg.url, /^data:image\/svg\+xml;utf8,/);
    assert.ok(post.svg.fileName.endsWith(".svg"));
    assert.ok(post.colors.length >= 1);
    assert.ok(post.sizes.length >= 1);
    for (const size of post.sizes) assert.ok(size.priceKs > 0);
  }
  const published = data.tshirtPosts.find((post) => post.status === "Published");
  assert.ok(published?.publishedAt);
  const draftPost = data.tshirtPosts.find((post) => post.status === "Draft");
  assert.equal(draftPost?.publishedAt, null);
});

test("prices are typed per size instead of derived from a base price", () => {
  const post = admin.tshirtPostFromDraft(draft({
    sizes: [{ size: "S", priceKs: "21000" }, { size: "M", priceKs: "19500" }, { size: "XL", priceKs: "31500" }],
  }), undefined, new Date(NOW));
  assert.deepEqual(post.sizes, [
    { size: "S", priceKs: 21000 },
    { size: "M", priceKs: 19500 },
    { size: "XL", priceKs: 31500 },
  ]);
  assert.equal(admin.tshirtPostFromPriceKs(post), 19500);
});

test("a colour surcharge lifts the from-price only by its own amount", () => {
  const post = admin.tshirtPostFromDraft(draft({
    sizes: [{ size: "M", priceKs: "20000" }],
    colors: [
      { name: "Black", hex: "#111111", priceKs: "" },
      { name: "Navy", hex: "#203459", priceKs: "1500" },
    ],
  }), undefined, new Date(NOW));
  assert.deepEqual(post.colors, [
    { name: "Black", hex: "#111111", priceKs: 0 },
    { name: "Navy", hex: "#203459", priceKs: 1500 },
  ]);
  assert.equal(admin.tshirtPostFromPriceKs(post), 20000);
});

test("draft validation demands a title, an SVG, a colour, a size and every size price", () => {
  assert.deepEqual(admin.validateTshirtPostDraft(draft()), []);
  assert.match(admin.validateTshirtPostDraft(draft({ title: "  " })).join(" "), /title is required/i);
  assert.match(admin.validateTshirtPostDraft(draft({ svg: null })).join(" "), /attach the svg/i);
  assert.match(admin.validateTshirtPostDraft(draft({ colors: [] })).join(" "), /at least one colour/i);
  assert.match(admin.validateTshirtPostDraft(draft({ sizes: [] })).join(" "), /at least one size/i);
  assert.match(admin.validateTshirtPostDraft(draft({ sizes: [{ size: "M", priceKs: "" }] })).join(" "), /price for size M/i);
  assert.match(admin.validateTshirtPostDraft(draft({ sizes: [{ size: "M", priceKs: "0" }] })).join(" "), /price for size M/i);
  assert.match(admin.validateTshirtPostDraft(draft({ sizes: [{ size: "M", priceKs: "12000000" }] })).join(" "), /under Ks 10,000,000/i);
  assert.match(admin.validateTshirtPostDraft(draft({ colors: [{ name: "Black", hex: "#111111", priceKs: "-5" }] })).join(" "), /Black/);
  assert.match(admin.validateTshirtPostDraft(draft({ title: "x".repeat(81) })).join(" "), /under 80 characters/i);
});

test("publishing stamps publishedAt once and unpublishing clears it", () => {
  const created = admin.tshirtPostFromDraft(draft({ status: "Published" }), undefined, new Date(NOW));
  assert.equal(created.publishedAt, new Date(NOW).toISOString());
  assert.equal(created.createdAt, new Date(NOW).toISOString());

  const later = new Date(NOW + 86400000);
  const edited = admin.tshirtPostFromDraft(draft({ status: "Published", title: "Renamed" }), created, later);
  assert.equal(edited.id, created.id);
  assert.equal(edited.createdAt, created.createdAt);
  assert.equal(edited.publishedAt, created.publishedAt, "re-saving keeps the original publish time");
  assert.equal(edited.title, "Renamed");

  const unpublished = admin.tshirtPostFromDraft(draft({ status: "Draft" }), created, later);
  assert.equal(unpublished.publishedAt, null);
});

test("upsert prepends new posts, replaces edited ones and delete removes them", () => {
  const start = admin.createAdminDemoData(NOW);
  const fresh = admin.tshirtPostFromDraft(draft({ title: "Fresh drop" }), undefined, new Date(NOW));
  const added = admin.upsertTshirtPost(start, fresh);
  assert.equal(added.tshirtPosts[0].id, fresh.id);
  assert.equal(added.tshirtPosts.length, start.tshirtPosts.length + 1);

  const renamed = { ...fresh, title: "Fresh drop v2" };
  const updated = admin.upsertTshirtPost(added, renamed);
  assert.equal(updated.tshirtPosts.length, added.tshirtPosts.length);
  assert.equal(updated.tshirtPosts[0].title, "Fresh drop v2");

  const removed = admin.removeTshirtPost(updated, fresh.id);
  assert.equal(removed.tshirtPosts.some((post) => post.id === fresh.id), false);
  assert.equal(removed.tshirtPosts.length, start.tshirtPosts.length);
});

test("the draft round-trips through the form without losing a price", () => {
  const post = admin.createAdminDemoData(NOW).tshirtPosts[0];
  const round = admin.tshirtPostDraftFrom(post);
  assert.equal(round.title, post.title);
  assert.deepEqual(round.sizes, post.sizes.map((size) => ({ size: size.size, priceKs: String(size.priceKs) })));
  assert.deepEqual(
    admin.tshirtPostFromDraft(round, post, new Date(NOW)),
    post,
  );
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

test("the Posts screen exposes the three post types and the T-shirt post fields", () => {
  const source = readFileSync(path.join(__dirname, "..", "apps/web/src/components/admin/AdminPosts.tsx"), "utf8");

  assert.match(source, /data-post-tab=\{entry\.id\}/);
  for (const tab of ["guide", "tshirt", "nyein"]) {
    assert.match(source, new RegExp(`\\{ id: "${tab}", label: `), `missing ${tab} tab`);
  }
  assert.match(source, /role="tablist"/);
  assert.match(source, /aria-label="T-shirt post SVG file"/);
  assert.match(source, /accept="\.svg,image\/svg\+xml"/);
  assert.match(source, /data-post-color=\{color\.name\}/);
  assert.match(source, /aria-label=\{`\$\{color\.name\} colour price`\}/);
  assert.match(source, /data-post-size=\{size\}/);
  assert.match(source, /aria-label=\{`\$\{size\} size price`\}/);
  assert.match(source, /validateTshirtPostDraft\(draft\)/);
  assert.match(source, /upsertTshirtPost\(current, post\)/);
  assert.match(source, /removeTshirtPost\(current, post\.id\)/);
  assert.match(source, /storePostSvg\(file\)/);
  assert.match(source, /tshirtPostFromPriceKs\(post\)/);
});

test("the Posts route, nav entry and manifest are wired", () => {
  assert.ok(existsSync(path.join(__dirname, "..", "apps/web/src/app/admin/posts/page.tsx")));
  const page = readFileSync(path.join(__dirname, "..", "apps/web/src/app/admin/posts/page.tsx"), "utf8");
  assert.match(page, /AdminPosts/);
  assert.match(page, /robots: \{ index: false, follow: false \}/);

  const shell = readFileSync(path.join(__dirname, "..", "apps/web/src/components/admin/AdminShell.tsx"), "utf8");
  assert.match(shell, /\{ id: "posts", label: "Posts", href: "\/admin\/posts", icon: Newspaper \}/);

  const manifest = JSON.parse(readFileSync(path.join(__dirname, "..", "apps/web/public/manus-routes.json"), "utf8"));
  assert.ok(manifest.routes.some((route) => route.path === "/admin/posts"));
});

test("old saved demo data is backfilled with the seed posts", () => {
  const source = readFileSync(path.join(__dirname, "..", "apps/web/src/lib/admin-demo-data.ts"), "utf8");
  assert.match(source, /Array\.isArray\(parsed\.tshirtPosts\)/);
  assert.match(source, /tshirtPosts: createSeedTshirtPosts\(Date\.now\(\)\)/);
});
