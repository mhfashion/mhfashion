const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const { loadModule } = require("./helpers/load-ts-module.cjs");
const seed = loadModule("apps/web/src/lib/guide-seed.ts");
const starter = loadModule("apps/web/src/lib/guide-starter.ts").GUIDE_STARTER_CATALOG;

const publishedAt = "2026-11-24T00:00:00.000Z";

test("the seed rows carry the whole starter handbook", () => {
  const { categories, posts } = seed.guideSeedRows(starter, publishedAt);
  assert.equal(categories.length, 6);
  assert.equal(posts.length, 12);
  assert.deepEqual(
    categories.map((row) => row.slug),
    ["editor-guide", "size-guide", "product-guide", "design-guide", "payment-guide", "delivery-guide"],
  );
});

test("seeded rows are published and keep the starter ids so re-running updates in place", () => {
  const { categories, posts } = seed.guideSeedRows(starter, publishedAt);
  for (const row of categories) {
    assert.equal(row.status, "published");
    assert.equal(row.published_at, publishedAt);
    assert.equal(row.created_at, publishedAt);
    assert.equal(row.id, starter.categories.find((category) => category.slug === row.slug).id);
  }
  for (const row of posts) {
    assert.equal(row.status, "published");
    assert.equal(row.published_at, publishedAt);
    assert.equal(row.id, starter.posts.find((post) => post.slug === row.slug).id);
  }
});

test("every seeded post points at a category that is seeded with it", () => {
  const { categories, posts } = seed.guideSeedRows(starter, publishedAt);
  const ids = new Set(categories.map((row) => row.id));
  for (const row of posts) {
    assert.ok(ids.has(row.category_id), `${row.slug} points at ${row.category_id}`);
  }
});

test("seeded posts keep their body, reading time and product links", () => {
  const { posts } = seed.guideSeedRows(starter, publishedAt);
  for (const row of posts) {
    const source = starter.posts.find((post) => post.slug === row.slug);
    assert.deepEqual(row.sections, source.sections);
    assert.equal(row.reading_minutes, source.readingMinutes);
    assert.deepEqual(row.product_links, source.productLinks);
    assert.equal(row.title, source.title);
  }
});

test("a post pointing at an unknown category is refused instead of written orphaned", () => {
  const orphan = {
    ...starter,
    posts: [{ ...starter.posts[0], categorySlug: "no-such-category" }],
  };
  assert.throws(() => seed.guideSeedRows(orphan, publishedAt), /unknown category/);
});
