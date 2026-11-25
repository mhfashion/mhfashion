const assert = require("node:assert/strict");
const test = require("node:test");
const origin = process.env.GUIDE_TEST_ORIGIN || "http://127.0.0.1:3000";

async function page(path, userAgent) {
  const response = await fetch(`${origin}${path}`, {
    headers: userAgent ? { "User-Agent": userAgent } : {},
  });
  const html = await response.text();
  const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  // The menu box links the Editor Guide on every page; only the article grid should be counted.
  const grid = visible.replace(/<a\b[^>]*data-guide-editor[^>]*>[\s\S]*?<\/a>/g, "");
  const articleLinks = [...grid.matchAll(/href="(\/guide\/[^"?#]+)"/g)].map((match) => match[1]);
  return { response, html, visible, articleLinks };
}

test("guide landing serves article content and categories without JavaScript", async () => {
  const result = await page("/guide");
  assert.equal(result.response.status, 200);
  assert.match(result.visible, /Product Guide/);
  assert.match(result.visible, /Payment Guide/);
  assert.match(result.visible, /How MH Fashion products are organized/);
  assert.match(result.visible, /Editor Guide/);
  const menuRows = [...result.visible.matchAll(/<a\b[^>]*data-guide-editor[^>]*>/g)].map((match) => match[0]);
  assert.ok(menuRows.length >= 1, "the Other Guide row is missing from the guide menu");
  for (const row of menuRows) {
    assert.ok(!row.includes('href="/guide/editor-guide"'), "the Other Guide row must list posts, not open one article");
    assert.match(row, /href="\/guide(\?category=[^"]*)?#articles"/, "the row opens a post list");
  }
  assert.equal(new Set(result.articleLinks).size, 12);
  assert.match(result.visible, /<h1\b/);
  assert.match(result.html, /MH Fashion Guide — Products, Design &amp; Payment/);
  // The owner asked for "See more" under the boxes instead of a "View All Posts" link in the header.
  assert.doesNotMatch(result.visible, /View All Posts/);
  assert.match(result.visible, /data-guide-see-more/, "the grid has no See more control");
  assert.match(result.html, /<noscript>/, "without JavaScript nothing would reveal the rest of the grid");
  const more = [...result.visible.matchAll(/data-guide-card="(shown|more)"/g)].map((match) => match[1]);
  assert.equal(more.filter((state) => state === "shown").length, 8, "the first page of the grid changed size");
  assert.equal(more.filter((state) => state === "more").length, 4);
});

test("guide category and text search compose on the server", async () => {
  const category = await page("/guide?category=payment-guide");
  assert.equal(category.response.status, 200);
  assert.equal(new Set(category.articleLinks).size, 2);
  assert.ok(category.articleLinks.every((href) => href.includes("payment")));
  const query = await page("/guide?category=payment-guide&q=KBZPay");
  assert.equal(query.response.status, 200);
  assert.deepEqual([...new Set(query.articleLinks)], ["/guide/payment-options-at-checkout"]);
  assert.ok(!/>\s*Clear</.test(query.visible), "the guide filter header should carry no Clear control");
  const empty = await page("/guide?q=keyword-that-does-not-exist");
  assert.equal(empty.response.status, 200);
  assert.match(empty.visible, /No guides match your search/);
  assert.equal(empty.articleLinks.length, 0);
});

test("article serves full text, table of contents, related guides and crawler metadata", async () => {
  const result = await page("/guide/payment-options-at-checkout", "facebookexternalhit/1.1");
  assert.equal(result.response.status, 200);
  assert.match(result.visible, /Planned provider choices/);
  // The owner removed the small "On this page" box beside the article so the article takes the full width.
  assert.doesNotMatch(result.visible, /On this page/);
  assert.doesNotMatch(result.visible, /lg:grid-cols-\[minmax\(0,1fr\)_230px\]/, "the table-of-contents column is back");
  assert.match(result.visible, /Cash on delivery is not part of the plan/);
  assert.match(result.visible, /Keep exploring/);
  // Posts carry photos: one at the top of the article and one inside its first section, each captioned.
  const figures = [...result.visible.matchAll(/data-guide-figure/g)];
  assert.ok(figures.length >= 2, `the article shows ${figures.length} photos`);
  assert.match(result.visible, /<figcaption[^>]*>[^<]+<\/figcaption>/, "a photo has no caption");
  // The other posts under the article are related to it and never the article itself.
  const relatedSection = result.visible.split(/id="related-heading"/)[1] ?? "";
  const relatedLinks = [...new Set([...relatedSection.matchAll(/href="(\/guide\/[^"?#]+)"/g)].map((match) => match[1]))];
  assert.ok(relatedLinks.length >= 3, `only ${relatedLinks.length} related cards under the article`);
  assert.ok(!relatedLinks.includes("/guide/payment-options-at-checkout"), "the article links itself as related");
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
  assert.deepEqual(manifest.routes.map((route) => route.path), [
    "/",
    "/about",
    "/account",
    "/admin",
    "/admin/attributes",
    "/admin/customers",
    "/admin/designs",
    "/admin/inventory",
    "/admin/login",
    "/admin/loyalty",
    "/admin/orders",
    "/admin/posts",
    "/admin/products",
    "/admin/promotions",
    "/admin/reports",
    "/admin/settings",
    "/admin/settlements",
    "/best-sellers",
    "/cart",
    "/checkout",
    "/collections",
    "/contact",
    "/cookie-policy",
    "/create",
    "/faq",
    "/guide",
    "/guide/:slug",
    "/mh-fashion",
    "/new",
    "/nyein",
    "/popular",
    "/privacy",
    "/products",
    "/products/:slug",
    "/returns",
    "/search",
    "/shipping",
    "/size-guide",
    "/terms",
    "/wishlist",
  ]);
});
