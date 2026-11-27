// Plan §17 S6: the search page answers in three groups. Needs a server:
//   npm run start --workspace=apps/web -- --port 3000
// then `node --test tests/search-http.test.cjs` (SEARCH_TEST_ORIGIN overrides the address).
const assert = require("node:assert/strict");
const test = require("node:test");

const origin = process.env.SEARCH_TEST_ORIGIN || "http://127.0.0.1:3000";

async function page(path) {
  const response = await fetch(`${origin}${path}`);
  const html = await response.text();
  return { response, html };
}

function tabCount(html, type) {
  const match = html.match(new RegExp(`data-search-tab="${type}"[^>]*data-search-tab-count="(\\d+)"`));
  return match ? Number(match[1]) : null;
}

test("a query answers with the three group tabs and their counts", async () => {
  const { response, html } = await page("/search?q=guide");
  assert.equal(response.status, 200);
  for (const type of ["products", "guides", "designs"]) {
    assert.ok(html.includes(`data-search-tab="${type}"`), `the ${type} tab is missing`);
    assert.ok(tabCount(html, type) !== null, `the ${type} tab has no count`);
  }
  assert.ok(tabCount(html, "guides") > 0, "the handbook has guide posts for “guide”");
  assert.match(html, /role="tablist"/);
  assert.match(html, /aria-selected="true"/);
});

test("the guides tab lists guide articles that link to their own page", async () => {
  const { html } = await page("/search?q=payment&type=guides");
  const cards = [...html.matchAll(/<a\b[^>]*data-search-guide[^>]*href="(\/guide\/[^"?]+)"/g)].map((match) => match[1]);
  assert.ok(cards.length > 0, "no guide card was rendered");
  assert.ok(cards.length <= 10, "the guides group is capped at 10");
  for (const href of cards) assert.match(href, /^\/guide\/[a-z0-9-]+$/);
  assert.match(html, /data-search-group="guides"/);
});

test("the designs tab lists the editor design templates and is capped at 12", async () => {
  const { html } = await page("/search?q=wave&type=designs");
  const designs = [...html.matchAll(/data-search-design="([^"]+)"/g)].map((match) => match[1]);
  assert.ok(designs.length > 0, "no design was rendered");
  assert.ok(designs.length <= 12, "the designs group is capped at 12");
  assert.match(html, /href="\/create"/);
});

test("an unknown group falls back to products, and a miss shows the empty state", async () => {
  const unknown = await page("/search?q=guide&type=posters");
  const tab = unknown.html.match(/<a\b[^>]*data-search-tab="products"[^>]*>/)?.[0] ?? "";
  assert.match(tab, /aria-selected="true"/, "an unknown group falls back to products");
  const miss = await page("/search?q=zzzzqqqq");
  assert.match(miss.html, /data-search-empty/);
  assert.match(miss.html, /Nothing matched/);
});

test("a one-character query never reaches the catalog", async () => {
  const { html } = await page("/search?q=b");
  assert.match(html, /data-search-idle/);
  assert.match(html, /Type at least two characters/);
});
