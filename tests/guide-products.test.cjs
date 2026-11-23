const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const ROOT = path.join(__dirname, "..");
function loadModule(relativePath) {
  const sourcePath = path.join(ROOT, relativePath);
  const compiled = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: sourcePath,
  }).outputText;
  const loaded = { exports: {} };
  new Function("module", "exports", "require", compiled)(loaded, loaded.exports, require);
  return loaded.exports;
}

const links = loadModule("apps/web/src/lib/guide-products.ts");

function product(slug, extra = {}) {
  return { id: `id-${slug}`, name: slug.toUpperCase(), slug, priceMinKs: 1000, priceMaxKs: 2000, ...extra };
}

test("a post names its products in the order it mentions them", () => {
  const normalized = links.normalizeGuideProductLinks([
    { slug: "tee-white", note: "As shown in white" },
    { slug: "hoodie-black", note: "" },
  ]);
  assert.deepEqual(normalized, [
    { slug: "tee-white", note: "As shown in white" },
    { slug: "hoodie-black", note: "" },
  ], "order is the post's order, not the catalogue's");
});

test("a bare slug string is accepted, so an older post keeps working", () => {
  assert.deepEqual(links.normalizeGuideProductLinks(["tee-white"]), [{ slug: "tee-white", note: "" }]);
});

test("slugs are tidied, not trusted", () => {
  const normalized = links.normalizeGuideProductLinks([
    "  TEE-White ",
    "/hoodie-black/",
    "",
    "   ",
    null,
    42,
    { note: "no slug" },
    { slug: 7 },
  ]);
  assert.deepEqual(normalized.map((link) => link.slug), ["tee-white", "hoodie-black"], "blank and malformed entries are dropped");
});

test("a slug that is really a path or a sentence is refused", () => {
  const normalized = links.normalizeGuideProductLinks(["products/tee-white", "/products/tee-white", "two words", "../etc"]);
  assert.deepEqual(normalized, [], "a link must be one slug, so it cannot point somewhere else");
});

test("the same product twice is one card", () => {
  const normalized = links.normalizeGuideProductLinks([{ slug: "tee-white", note: "first" }, { slug: "TEE-WHITE", note: "second" }]);
  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].note, "first", "the first mention wins");
});

test("the list stops at the limit", () => {
  const many = Array.from({ length: 12 }, (_, index) => `product-${index}`);
  assert.equal(links.normalizeGuideProductLinks(many).length, links.GUIDE_PRODUCT_LIMIT);
});

test("a note is one tidy line, cut short", () => {
  const [link] = links.normalizeGuideProductLinks([{ slug: "tee-white", note: `  As   shown\nin white ${"x".repeat(200)}` }]);
  assert.equal(link.note.startsWith("As shown in white"), true);
  assert.equal(link.note.length, 80);
});

test("a post with no links, or garbage instead of a list, has no links", () => {
  for (const value of [undefined, null, "tee-white", 5, {}, []]) {
    assert.deepEqual(links.normalizeGuideProductLinks(value), []);
  }
});

test("resolution drops a slug the catalogue no longer holds and keeps the order", async () => {
  const catalogue = new Map([["tee-white", product("tee-white")], ["hoodie-black", product("hoodie-black")]]);
  const resolved = await links.resolveGuideProductLinks(
    [{ slug: "hoodie-black", note: "" }, { slug: "gone", note: "" }, { slug: "tee-white", note: "" }],
    async (slug) => catalogue.get(slug) ?? null,
  );
  assert.deepEqual(resolved.map((link) => link.product.slug), ["hoodie-black", "tee-white"], "no dead card is rendered");
});

test("resolution works with a lookup that answers synchronously", async () => {
  const resolved = await links.resolveGuideProductLinks([{ slug: "tee-white", note: "" }], (slug) => product(slug));
  assert.equal(resolved.length, 1);
});

test("a product link goes to the product page, encoded once", () => {
  assert.equal(links.guideProductHref("tee-white"), "/products/tee-white");
  assert.equal(links.guideProductHref(" tee white "), "/products/tee%20white");
});

test("a card is subtitled by the post's note, else by the catalogue line", () => {
  const noted = { slug: "tee-white", note: "As shown in white", product: product("tee-white", { subBrand: "MH Fashion" }) };
  assert.equal(links.guideProductSubtitle(noted), "As shown in white");
  const plain = { slug: "tee-white", note: "", product: product("tee-white", { subBrand: "Nyein" }) };
  assert.equal(links.guideProductSubtitle(plain), "Nyein");
  const bare = { slug: "tee-white", note: "", product: product("tee-white", { productType: "T-shirt" }) };
  assert.equal(links.guideProductSubtitle(bare), "T-shirt", "no line at all is better than a blank line");
});

test("the admin summary names the products, or says there are none", () => {
  assert.equal(links.guideProductLinkSummary([{ slug: "tee-white", note: "" }, { slug: "hoodie", note: "" }]), "tee-white, hoodie");
  assert.equal(links.guideProductLinkSummary([]), "No products linked");
});

test("the guide model reads product links from the row and repairs what it cannot use", () => {
  const source = readFileSync(path.join(ROOT, "apps/web/src/lib/guides.ts"), "utf8");
  assert.match(source, /productLinks: normalizeGuideProductLinks\(value\.product_links\)/, "the row's jsonb is normalised on read");
  assert.match(source, /seo_description, product_links/, "the query asks for the column");
  assert.match(source, /productLinks: GuideProductLink\[\]/, "every post carries the list, empty when it sells nothing");
  const starter = readFileSync(path.join(ROOT, "apps/web/src/lib/guide-starter.ts"), "utf8");
  assert.equal(starter.match(/productLinks: \[\]/g).length, 8, "each starter post declares an empty list");
});

test("the post page renders the section and nothing when there is nothing to show", () => {
  const page = readFileSync(path.join(ROOT, "apps/web/src/app/guide/[slug]/page.tsx"), "utf8");
  assert.match(page, /<GuideShopLook links=\{shopLook\} \/>/, "the post page places the section");
  assert.match(page, /resolveGuideProductLinks\(post\.productLinks/, "with the post's own links");
  assert.match(page, /getProductsBySlugs\(post\.productLinks\.map/, "all of a post's products in one query");
  assert.equal((page.match(/getProductsBySlugs\(/g) || []).length, 1, "not one query per slug");
  const component = readFileSync(path.join(ROOT, "apps/web/src/components/guide/GuideShopLook.tsx"), "utf8");
  assert.match(component, /if \(links\.length === 0\) return null/, "an article that sells nothing keeps its shape");
  assert.match(component, /data-guide-shop-look/);
  assert.match(component, /data-guide-product=\{link\.product\.slug\}/, "each card is identifiable");
  assert.match(component, /formatRangeKs\(link\.product\.priceMinKs/, "the price respects the currency switcher");
});

test("one query fetches the post's products instead of one per slug", () => {
  const source = readFileSync(path.join(ROOT, "apps/web/src/lib/products.ts"), "utf8");
  assert.match(source, /export async function getProductsBySlugs/, "a batch lookup exists");
  assert.match(source, /\.in\("slug", wanted\)/, "it asks for all slugs at once");
  assert.match(source, /return wanted\.flatMap/, "and returns them in the order asked");
});

test("the admin shows which products a guide post sells", () => {
  const source = readFileSync(path.join(ROOT, "apps/web/src/components/admin/AdminPosts.tsx"), "utf8");
  assert.match(source, /guideProductLinkSummary\(post\.productLinks\)/, "the guide tab row says it");
  assert.match(source, /data-guide-products/, "and it is findable");
});
