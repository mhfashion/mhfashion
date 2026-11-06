const assert = require("node:assert/strict");
const test = require("node:test");
const origin = process.env.GUIDE_TEST_ORIGIN || "http://127.0.0.1:3000";

async function page(path, userAgent) {
  const response = await fetch(`${origin}${path}`, {
    headers: userAgent ? { "User-Agent": userAgent } : {},
  });
  const html = await response.text();
  const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  const articleLinks = [...visible.matchAll(/href="(\/guide\/[^"?#]+)"/g)].map((match) => match[1]);
  return { response, html, visible, articleLinks };
}

test("guide landing serves article content and categories without JavaScript", async () => {
  const result = await page("/guide");
  assert.equal(result.response.status, 200);
  assert.match(result.visible, /Product Guide/);
  assert.match(result.visible, /Payment Guide/);
  assert.match(result.visible, /Starter handbook/);
  assert.equal(new Set(result.articleLinks).size, 8);
  assert.match(result.visible, /<h1\b/);
  assert.match(result.html, /MH Fashion Guide — Products, Design &amp; Payment/);
});

test("guide category and text search compose on the server", async () => {
  const category = await page("/guide?category=payment-guide");
  assert.equal(category.response.status, 200);
  assert.equal(new Set(category.articleLinks).size, 2);
  assert.ok(category.articleLinks.every((href) => href.includes("payment")));
  const query = await page("/guide?category=payment-guide&q=KBZPay");
  assert.equal(query.response.status, 200);
  assert.deepEqual([...new Set(query.articleLinks)], ["/guide/payment-options-at-checkout"]);
  assert.match(query.visible, /Clear filters/);
  const empty = await page("/guide?q=keyword-that-does-not-exist");
  assert.equal(empty.response.status, 200);
  assert.match(empty.visible, /No guides match your search/);
  assert.equal(empty.articleLinks.length, 0);
});

test("article serves full text, table of contents, related guides and crawler metadata", async () => {
  const result = await page("/guide/payment-options-at-checkout", "facebookexternalhit/1.1");
  assert.equal(result.response.status, 200);
  assert.match(result.visible, /Planned provider choices/);
  assert.match(result.visible, /On this page/);
  assert.match(result.visible, /Cash on delivery is not part of the plan/);
  assert.match(result.visible, /Keep exploring/);
  const head = result.html.split("</head>")[0];
  assert.match(head, /<title>MH Fashion payment and checkout guide<\/title>/);
  assert.match(head, /name="description"/);
  assert.match(head, /property="og:type" content="article"/);
});

test("unknown guide article is a real 404 rather than a soft 404", async () => {
  const result = await page("/guide/a-guide-that-does-not-exist", "facebookexternalhit/1.1");
  assert.equal(result.response.status, 404);
  assert.match(result.html, /noindex/);
});

test("route manifest is served as JSON and matches implemented pages", async () => {
  const response = await fetch(`${origin}/manus-routes.json`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /json/);
  const manifest = await response.json();
  assert.deepEqual(manifest.routes.map((route) => route.path), ["/", "/account", "/create", "/guide", "/guide/:slug"]);
});
