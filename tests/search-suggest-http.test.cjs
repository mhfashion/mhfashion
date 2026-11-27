// Plan §17 S6/S8: the header's five suggestions and the search log. Needs a server:
//   npm run start --workspace=apps/web -- --port 3000
// then `node --test tests/search-suggest-http.test.cjs` (SEARCH_TEST_ORIGIN overrides the address).
const assert = require("node:assert/strict");
const test = require("node:test");

const origin = process.env.SEARCH_TEST_ORIGIN || "http://127.0.0.1:3000";

async function suggest(query) {
  const response = await fetch(`${origin}/api/search/suggest?q=${encodeURIComponent(query)}`);
  return { response, body: await response.json() };
}

test("a two-letter query answers with at most five suggestions, each with a link", async () => {
  const { response, body } = await suggest("street");
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body.suggestions));
  assert.ok(body.suggestions.length <= 5, `expected at most 5, got ${body.suggestions.length}`);
  for (const suggestion of body.suggestions) {
    assert.ok(["product", "guide", "design"].includes(suggestion.kind), `unexpected kind ${suggestion.kind}`);
    assert.ok(suggestion.title, "a suggestion needs a title");
    assert.ok(suggestion.href.startsWith("/"), "a suggestion needs a link");
  }
});

test("one character is not a search, and neither is an empty query", async () => {
  for (const query of ["", "a", "  "]) {
    const { response, body } = await suggest(query);
    assert.equal(response.status, 200);
    assert.deepEqual(body.suggestions, [], `"${query}" should suggest nothing`);
    assert.deepEqual(body.counts, { products: 0, guides: 0, designs: 0 });
  }
});

test("punctuation that would break a PostgREST filter does not break the route", async () => {
  for (const query of ["a,b", "tee(black)", "50%", "it's", "အင်္ကျီ"]) {
    const { response, body } = await suggest(query);
    assert.equal(response.status, 200, `"${query}" failed`);
    assert.ok(Array.isArray(body.suggestions));
  }
});

test("a query nothing answers comes back empty rather than failing", async () => {
  const { response, body } = await suggest("zzzzqqqq");
  assert.equal(response.status, 200);
  assert.deepEqual(body.suggestions, []);
});

test("the admin search log reports whether it is connected", async () => {
  const response = await fetch(`${origin}/api/admin/search-misses?days=7&limit=10`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(typeof body.configured, "boolean");
  assert.ok(Array.isArray(body.misses));
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    assert.equal(body.configured, false, "without a service-role key the panel must say so");
  }
});
