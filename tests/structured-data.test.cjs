const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
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

const data = loadModule("apps/web/src/lib/structured-data.ts");
const site = loadModule("apps/web/src/lib/site.ts");
const read = (relativePath) => readFileSync(path.join(__dirname, "..", relativePath), "utf8");

const ORIGIN = "https://mhfashion.example";
const product = {
  id: "p1",
  name: "Butterfly Effect",
  slug: "butterfly-effect",
  imageUrl: "/images/butterfly.png",
  productType: "T-Shirt",
  subBrand: "MH Fashion",
  priceMinKs: 21000,
  priceMaxKs: 25000,
};

test("the payload cannot close its own script tag", () => {
  const hostile = { name: "</script><script>alert(1)</script>", note: "a & b", line: "x\u2028y\u2029z" };
  const serialized = data.serializeJsonLd(hostile);
  assert.ok(!serialized.includes("</script"), serialized);
  assert.ok(!serialized.includes("<"), "no raw < survives");
  assert.ok(!serialized.includes("\u2028") && !serialized.includes("\u2029"));
  assert.deepEqual(JSON.parse(serialized), hostile, "escaping must not change the data");
  assert.equal(data.serializeJsonLd(undefined), "null");
});

test("organization and website describe the shop and its search", () => {
  const org = data.organizationSchema(ORIGIN);
  assert.equal(org["@context"], "https://schema.org");
  assert.equal(org["@type"], "Organization");
  assert.equal(org.name, "MH Fashion");
  assert.equal(org.url, `${ORIGIN}/`);
  assert.equal(org.contactPoint[0].email.length > 3, true);

  const bare = data.organizationSchema(undefined);
  assert.equal(bare.url, undefined, "no configured origin means no url at all");

  const web = data.websiteSchema(ORIGIN);
  assert.equal(web["@type"], "WebSite");
  assert.equal(web.url, `${ORIGIN}/`);
  assert.equal(web.potentialAction["@type"], "SearchAction");
  assert.equal(web.potentialAction.target, `${ORIGIN}/search?q={search_term_string}`);
  assert.equal(web.potentialAction["query-input"], "required name=search_term_string");

  assert.equal(data.websiteSchema(undefined).potentialAction, undefined);
});

test("a product carries a price range in kyat, never a made-up single price", () => {
  const schema = data.productSchema(product, ORIGIN);
  assert.equal(schema["@type"], "Product");
  assert.equal(schema.name, "Butterfly Effect");
  assert.equal(schema.sku, "p1");
  assert.equal(schema.url, `${ORIGIN}/products/butterfly-effect`);
  assert.deepEqual(schema.image, [`${ORIGIN}/images/butterfly.png`], "a relative image is resolved against the origin");
  assert.equal(schema.category, "T-Shirt");
  assert.equal(schema.brand.name, "MH Fashion");
  assert.match(schema.description, /Butterfly Effect/);

  const offer = schema.offers;
  assert.equal(offer["@type"], "AggregateOffer");
  assert.equal(offer.priceCurrency, "MMK");
  assert.equal(offer.lowPrice, 21000);
  assert.equal(offer.highPrice, 25000);
  assert.equal(typeof offer.lowPrice, "number", "schema.org wants numbers, not formatted strings");
  assert.equal(offer.availability, "https://schema.org/InStock");

  const odd = data.productSchema({ ...product, priceMinKs: 25000, priceMaxKs: 0, imageUrl: undefined, productType: undefined }, undefined);
  assert.equal(odd.offers.lowPrice, 25000);
  assert.equal(odd.offers.highPrice, 25000, "a reversed range is repaired instead of emitted");
  assert.equal(odd.image, undefined);
  assert.equal(odd.category, undefined);
  assert.equal(odd.url, undefined, "no origin, no url");
});

test("breadcrumbs count from one and only carry absolute items when the origin is known", () => {
  const items = [
    { name: "Home", path: "/" },
    { name: "Products", path: "/products" },
    { name: "Butterfly Effect", path: "/products/butterfly-effect" },
  ];
  const schema = data.breadcrumbSchema(items, ORIGIN);
  assert.equal(schema["@type"], "BreadcrumbList");
  assert.deepEqual(schema.itemListElement.map((entry) => entry.position), [1, 2, 3]);
  assert.deepEqual(schema.itemListElement.map((entry) => entry.name), ["Home", "Products", "Butterfly Effect"]);
  assert.equal(schema.itemListElement[2].item, `${ORIGIN}/products/butterfly-effect`);

  const bare = data.breadcrumbSchema(items, undefined);
  assert.equal(bare.itemListElement[0].item, undefined);
  assert.equal(bare.itemListElement[0].name, "Home", "the trail still reads without an origin");
});

test("the FAQ node is built from the copy the page renders", () => {
  const schema = data.faqSchema([
    { heading: "How do I pay?", body: ["KBZPay, Wave Pay, AYA Pay or a card."] },
    { heading: "How long is delivery?", bullets: ["Yangon: 2 days.", "Elsewhere: 3 to 5 days."] },
    { heading: "Empty question", body: [] },
    { heading: "  ", body: ["no question"] },
  ]);
  assert.equal(schema["@type"], "FAQPage");
  assert.equal(schema.mainEntity.length, 2, "a question with no answer is dropped");
  assert.deepEqual(schema.mainEntity.map((entry) => entry["@type"]), ["Question", "Question"]);
  assert.equal(schema.mainEntity[0].name, "How do I pay?");
  assert.equal(schema.mainEntity[0].acceptedAnswer.text, "KBZPay, Wave Pay, AYA Pay or a card.");
  assert.equal(schema.mainEntity[1].acceptedAnswer.text, "Yangon: 2 days. Elsewhere: 3 to 5 days.");
});

test("an article keeps its date, section and publisher", () => {
  const schema = data.articleSchema(
    {
      slug: "how-to-pick-a-size",
      title: "How to pick a size",
      excerpt: "Measure a shirt you already own.",
      seoDescription: null,
      publishedAt: "2026-09-01T09:00:00.000Z",
      coverImageUrl: "/images/guide-size.jpg",
    },
    { categoryName: "Product Guide", origin: ORIGIN },
  );
  assert.equal(schema["@type"], "Article");
  assert.equal(schema.headline, "How to pick a size");
  assert.equal(schema.description, "Measure a shirt you already own.", "the excerpt stands in when there is no SEO description");
  assert.equal(schema.datePublished, "2026-09-01T09:00:00.000Z");
  assert.equal(schema.articleSection, "Product Guide");
  assert.equal(schema.url, `${ORIGIN}/guide/how-to-pick-a-size`);
  assert.equal(schema.mainEntityOfPage, schema.url);
  assert.equal(schema.publisher.name, "MH Fashion");
  assert.deepEqual(schema.image, [`${ORIGIN}/images/guide-size.jpg`]);
});

test("the origin is only used when it is a clean https site", () => {
  const original = process.env.NEXT_PUBLIC_SITE_URL;
  const check = (value) => {
    if (value === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = value;
    return site.getSiteOrigin();
  };
  try {
    assert.equal(check(ORIGIN), ORIGIN);
    assert.equal(check("https://mhfashion.example/"), ORIGIN);
    assert.equal(check("http://mhfashion.example"), undefined, "plain http is not a canonical origin");
    assert.equal(check("https://localhost"), undefined);
    assert.equal(check("https://127.0.0.1"), undefined);
    assert.equal(check("https://mhfashion.example/shop"), undefined);
    assert.equal(check("https://user:pass@mhfashion.example"), undefined);
    assert.equal(check("not a url"), undefined);
    assert.equal(check(undefined), undefined);
  } finally {
    if (original === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = original;
  }
  assert.equal(site.absoluteUrl("/products/x", ORIGIN), `${ORIGIN}/products/x`);
  assert.equal(site.absoluteUrl("https://cdn.example/a.png", ORIGIN), "https://cdn.example/a.png");
  assert.equal(site.absoluteUrl("/products/x", undefined), undefined);
});

test("the pages emit the nodes and the component escapes them", () => {
  const component = read("apps/web/src/components/JsonLd.tsx");
  assert.match(component, /type="application\/ld\+json"/);
  assert.match(component, /serializeJsonLd\(data\)/, "the payload must go through the escaping serialiser");

  const layout = read("apps/web/src/app/layout.tsx");
  assert.match(layout, /<JsonLd data=\{organizationSchema\(\)\} \/>/);
  assert.match(layout, /<JsonLd data=\{websiteSchema\(\)\} \/>/);

  const productPage = read("apps/web/src/app/products/[slug]/page.tsx");
  assert.match(productPage, /<JsonLd data=\{productSchema\(product\)\} \/>/);
  assert.match(productPage, /<JsonLd data=\{breadcrumbSchema\(\[/);

  assert.match(read("apps/web/src/app/faq/page.tsx"), /faqSchema\(page\.sections\)/);
  assert.match(read("apps/web/src/app/guide/[slug]/page.tsx"), /articleSchema\(post, \{ categoryName: category\?\.name \}\)/);
});
