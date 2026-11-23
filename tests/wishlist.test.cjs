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

const wishlist = loadModule("apps/web/src/lib/wishlist.ts");
const read = (relativePath) => readFileSync(path.join(__dirname, "..", relativePath), "utf8");

const tee = { id: "p1", name: "Butterfly Effect", slug: "butterfly-effect", priceMinKs: 21000, priceMaxKs: 25000 };
const hoodie = { id: "p2", name: "Void Hoodie", slug: "void-hoodie", priceMinKs: 32000, priceMaxKs: 32000 };

test("saving is a toggle and never duplicates a product", () => {
  let items = [];
  items = wishlist.toggleWishlistItem(items, tee);
  assert.deepEqual(items.map((item) => item.id), ["p1"]);
  assert.equal(wishlist.isWishlisted(items, "p1"), true);

  items = wishlist.toggleWishlistItem(items, tee);
  assert.deepEqual(items, [], "a second tap removes it");

  items = wishlist.toggleWishlistItem(wishlist.toggleWishlistItem([], tee), hoodie);
  assert.deepEqual(items.map((item) => item.id), ["p2", "p1"], "the newest save comes first");
});

test("stored data is validated, de-duplicated and capped", () => {
  assert.deepEqual(wishlist.normalizeWishlist(null), []);
  assert.deepEqual(wishlist.normalizeWishlist("nope"), []);
  assert.deepEqual(wishlist.normalizeWishlist([{ id: "x" }]), [], "an entry without a slug or name is dropped");
  assert.deepEqual(wishlist.normalizeWishlist([{ id: "p1", slug: "a", name: "A", priceMinKs: "12" }]), [
    { id: "p1", slug: "a", name: "A", imageUrl: undefined, isNew: false, productType: undefined, subBrand: undefined, isCustomizable: undefined, priceMinKs: 0, priceMaxKs: 0 },
  ], "a non-numeric price becomes 0 instead of NaN");

  const duplicated = wishlist.normalizeWishlist([tee, tee, hoodie]);
  assert.deepEqual(duplicated.map((item) => item.id), ["p1", "p2"]);

  const many = Array.from({ length: 140 }, (_, index) => ({ id: `p${index}`, slug: `s${index}`, name: `N${index}`, priceMinKs: 1, priceMaxKs: 1 }));
  assert.equal(wishlist.normalizeWishlist(many).length, wishlist.WISHLIST_LIMIT);
  assert.equal(wishlist.toggleWishlistItem(many, { id: "extra", slug: "extra", name: "Extra", priceMinKs: 1, priceMaxKs: 1 }).length, wishlist.WISHLIST_LIMIT);
});

test("removing takes only the requested product", () => {
  const items = [tee, hoodie];
  assert.deepEqual(wishlist.removeWishlistItem(items, "p1").map((item) => item.id), ["p2"]);
  assert.deepEqual(wishlist.removeWishlistItem(items, "missing"), items);
});

test("the store keeps the list on the device and writes only after reading", () => {
  const context = read("apps/web/src/lib/wishlist-context.tsx");
  assert.match(context, /const STORAGE_KEY = "mh-fashion-wishlist"/);
  assert.match(context, /normalizeWishlist\(JSON\.parse\(stored\)\)/);
  assert.match(context, /if \(!loaded\) return;/, "writing before the read would erase a saved list");
  assert.match(read("apps/web/src/app/layout.tsx"), /<WishlistProvider>/);
});

test("the heart on a product card and the header are wired to the store", () => {
  const card = read("apps/web/src/components/ProductCard.tsx");
  assert.match(card, /useWishlist\(\)/);
  assert.match(card, /wishlist\.toggle\(product\)/);
  assert.match(card, /data-wishlist-toggle=\{product\.id\}/);
  assert.match(card, /aria-pressed=\{favorited\}/);
  assert.ok(!/setFavorited/.test(card), "the heart must not keep a private state that the saved page cannot see");

  const header = read("apps/web/src/components/HeaderActions.tsx");
  // The header heart names how many pieces are saved, so the count is not a picture only.
  assert.match(header, /href="\/wishlist" aria-label=\{wishlistCount \? `\$\{t\("actions\.wishlist"\)\}, \$\{wishlistCount\}/);
  assert.match(header, /data-header-wishlist/);
  assert.match(header, /data-wishlist-count/);
  assert.match(read("apps/web/src/components/MobileNav.tsx"), /href="\/wishlist"/);
});

test("the saved page and the account tab read the same list", () => {
  assert.ok(existsSync(path.join(__dirname, "..", "apps/web/src/app/wishlist/page.tsx")));
  const page = read("apps/web/src/app/wishlist/page.tsx");
  for (const marker of ["data-wishlist-items", "data-wishlist-item={product.id}", "data-wishlist-empty", "data-wishlist-summary", "data-wishlist-clear"]) {
    assert.ok(page.includes(marker), `the wishlist page is missing ${marker}`);
  }
  const account = read("apps/web/src/app/account/page.tsx");
  assert.match(account, /data-account-wishlist/);
  assert.match(account, /data-account-wishlist-empty/);
  assert.match(account, /wishlist\.items\.map/);
  assert.ok(!/\{active === "wishlist" && <div className="grid gap-4 sm:grid-cols-4">\{\["Butterfly Effect"/.test(account), "the account tab must not show invented products");
});

test("the route manifest lists /wishlist", () => {
  const manifest = JSON.parse(read("apps/web/public/manus-routes.json"));
  assert.ok(manifest.routes.some((route) => route.path === "/wishlist"));
});
