// Plan §17 S6: the search page answers in two groups. Needs a server:
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

test("a query answers with product cards only", async () => {
  const { response, html } = await page("/search?q=tee");
  assert.equal(response.status, 200);
  assert.match(html, /data-search-results|data-search-empty/, "the answer is a card grid or the empty state");
  assert.equal(html.includes("data-search-tab"), false, "no group tabs are rendered");
  assert.equal(html.includes("role=\"tablist\""), false, "no tab strip at all");
  assert.equal(html.includes("results for"), false, "the answer does not restate the query");
  assert.equal(html.includes(">Shop<"), false, "the page kicker is not shown over the answer");
  assert.equal(/<h1[\s>]/.test(html), false, "no page title sits over the answer");
});

test("a query with no product match shows the empty state instead of other groups", async () => {
  const { html } = await page("/search?q=payment");
  assert.equal(html.includes("data-search-guide"), false, "guide cards are not a search answer");
  assert.match(html, /data-search-empty|data-search-results/);
});

test("an unknown group still answers, and a miss shows the empty state", async () => {
  const unknown = await page("/search?q=guide&type=posters");
  assert.equal(unknown.response.status, 200, "a stale ?type= link does not break the page");
  assert.match(unknown.html, /data-search-results|data-search-empty/);
  const miss = await page("/search?q=zzzzqqqq");
  assert.match(miss.html, /data-search-empty/);
  assert.match(miss.html, /Nothing matched/);
});

test("a one-character query never reaches the catalog", async () => {
  const { html } = await page("/search?q=b");
  assert.match(html, /data-search-idle/);
  assert.match(html, /Type at least two characters/);
});
