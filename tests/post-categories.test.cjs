// A post is no longer a T-shirt-only thing: it is filed under a product category, the board
// groups posts by that category, and every post carries tags written in English and Burmese.
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { loadModule } = require("./helpers/load-ts-module.cjs");

const admin = loadModule("apps/web/src/lib/admin-demo-data.ts");
const read = (relativePath) => readFileSync(path.join(__dirname, "..", relativePath), "utf8");
const NOW = Date.parse("2026-11-21T08:00:00.000Z");

test("every product category can hold posts, in the board's order", () => {
  assert.deepEqual(admin.POST_CATEGORIES, [
    "T-Shirt", "Kids T-Shirt", "Hoodie", "Polo", "Jersey", "Cap", "Cup", "Accessory",
  ]);
  const data = admin.createAdminDemoData(NOW);
  for (const category of admin.POST_CATEGORIES) {
    const post = admin.tshirtPostFromDraft(
      { ...admin.tshirtPostDraftFrom(undefined, []), category, title: `${category} post`, svg: { url: "data:image/svg+xml;utf8,%3Csvg%2F%3E", fileName: "a.svg", sizeBytes: 64 }, prices: [{ id: "row", options: {}, priceKs: "1000" }] },
      undefined,
      new Date(NOW),
    );
    assert.equal(post.category, category, `${category} keeps its category`);
    assert.ok(admin.upsertTshirtPost(data, post).tshirtPosts.some((entry) => entry.id === post.id), `${category} saves`);
  }
});

test("the seeded posts cover several categories, not only T-shirts", () => {
  const data = admin.createAdminDemoData(NOW);
  const categories = new Set(data.tshirtPosts.map((post) => post.category));
  assert.ok(categories.size >= 4, `expected at least four categories, saw ${[...categories].join(", ")}`);
  assert.ok(categories.has("Hoodie"));
  assert.ok(categories.has("Kids T-Shirt"));
  assert.ok(categories.has("Cup"));
});

test("the board groups posts by category and leaves empty ones out", () => {
  const data = admin.createAdminDemoData(NOW);
  const groups = admin.groupPostsByCategory(data.tshirtPosts, data.products);
  assert.equal(groups.reduce((total, group) => total + group.posts.length, 0), data.tshirtPosts.length, "every post lands in exactly one group");
  for (const group of groups) {
    assert.ok(group.posts.length > 0, `${group.category} would not be listed when empty`);
    for (const post of group.posts) assert.equal(admin.postCategoryOf(post, data.products), group.category);
  }
  const order = groups.map((group) => group.category);
  assert.deepEqual(order, admin.POST_CATEGORIES.filter((category) => order.includes(category)), "groups follow the board's order");
});

test("a post without a stored category follows its linked product", () => {
  const data = admin.createAdminDemoData(NOW);
  const hoodie = data.products.find((product) => product.category === "Hoodie");
  assert.equal(admin.postCategoryOf({ productId: hoodie.id }, data.products), "Hoodie");
  assert.equal(admin.postCategoryOf({}, data.products), "T-Shirt", "an unlinked legacy post falls back to T-Shirt");
});

test("tags carry both languages, and a missing Burmese side falls back to English", () => {
  assert.deepEqual(admin.normalizePostTag({ en: "  New   arrival ", my: " အသစ်ရောက် " }), { en: "New arrival", my: "အသစ်ရောက်" });
  assert.deepEqual(admin.normalizePostTag({ en: "Gift" }), { en: "Gift", my: "Gift" });
  assert.equal(admin.normalizePostTag({ my: "လက်ဆောင်" }), null, "the English side is required");
  assert.equal(admin.normalizePostTag("Gift"), null);

  const tags = admin.normalizePostTags([{ en: "Gift", my: "လက်ဆောင်" }, { en: "gift", my: "ထပ်နေ" }, { en: "" }, { en: "Kids", my: "ကလေးများ" }]);
  assert.deepEqual(tags, [{ en: "Gift", my: "လက်ဆောင်" }, { en: "Kids", my: "ကလေးများ" }], "duplicates and empty tags are dropped");
});

test("adding a tag dedupes on the English side, removes by it, and respects the cap", () => {
  const gift = { en: "Gift", my: "လက်ဆောင်" };
  const tags = admin.addPostTag([], gift);
  assert.deepEqual(tags, [gift]);
  assert.deepEqual(admin.addPostTag(tags, { en: "GIFT", my: "အခြား" }), [gift], "a repeat in another case is ignored");
  assert.deepEqual(admin.removePostTag(tags, "gift"), []);

  let full = [];
  for (let index = 0; index < admin.POST_TAG_LIMIT + 3; index += 1) full = admin.addPostTag(full, { en: `tag ${index}`, my: `tag ${index}` });
  assert.equal(full.length, admin.POST_TAG_LIMIT);
});

test("a tag needs English text and stays short", () => {
  assert.deepEqual(admin.postTagErrors({ en: "Gift", my: "လက်ဆောင်" }), []);
  assert.match(admin.postTagErrors({ en: " ", my: "လက်ဆောင်" }).join(" "), /English/);
  assert.match(admin.postTagErrors({ en: "x".repeat(admin.POST_TAG_MAX_LENGTH + 1), my: "" }).join(" "), /English tag/);
  assert.match(admin.postTagErrors({ en: "Gift", my: "x".repeat(admin.POST_TAG_MAX_LENGTH + 1) }).join(" "), /Burmese tag/);
});

test("a draft keeps its category and tags through save and reload", () => {
  const base = admin.tshirtPostDraftFrom(undefined, []);
  const draft = {
    ...base,
    category: "Hoodie",
    tags: [{ en: "Premium", my: "ပရီမီယံ" }],
    title: "Lantern Hoodie",
    svg: { url: "data:image/svg+xml;utf8,%3Csvg%2F%3E", fileName: "lantern.svg", sizeBytes: 128 },
    prices: [{ id: "row-1", options: {}, priceKs: "42000" }],
  };
  const post = admin.tshirtPostFromDraft(draft, undefined, new Date(NOW));
  assert.equal(post.category, "Hoodie");
  assert.deepEqual(post.tags, [{ en: "Premium", my: "ပရီမီယံ" }]);

  const back = admin.tshirtPostDraftFrom(post, []);
  assert.equal(back.category, "Hoodie");
  assert.deepEqual(back.tags, post.tags);

  const legacy = admin.normalizeTshirtPost({ ...post, category: undefined, tags: undefined });
  assert.equal(legacy.category, "T-Shirt", "a stored post without a category is normalised");
  assert.deepEqual(legacy.tags, []);
});

test("validation refuses a post with no category, too many tags or an empty English tag", () => {
  const base = {
    ...admin.tshirtPostDraftFrom(undefined, [{ key: "size", label: "Size", options: ["M", "L"] }]),
    title: "Post",
    svg: { url: "data:image/svg+xml;utf8,%3Csvg%2F%3E", fileName: "a.svg", sizeBytes: 64 },
    prices: [{ id: "row-1", options: { size: "M" }, priceKs: "1000" }],
    tags: [],
  };
  assert.deepEqual(admin.validateTshirtPostDraft(base), []);
  assert.match(admin.validateTshirtPostDraft({ ...base, category: "" }).join(" "), /category/i);
  assert.match(admin.validateTshirtPostDraft({ ...base, tags: [{ en: " ", my: "x" }] }).join(" "), /English/);
  assert.match(
    admin.validateTshirtPostDraft({ ...base, tags: Array.from({ length: admin.POST_TAG_LIMIT + 1 }, (_, index) => ({ en: `t${index}`, my: `t${index}` })) }).join(" "),
    /up to 8 tags/i,
  );
});

test("the post board lists every category, groups rows and edits tags in both languages", () => {
  const screen = read("apps/web/src/components/admin/AdminPosts.tsx");
  assert.match(screen, /POST_CATEGORIES/, "the category list comes from the model, not a local copy");
  assert.match(screen, /data-post-category-filter/, "a category filter sits above the table");
  assert.match(screen, /data-post-category-group=/, "rows are grouped under a category heading");
  assert.match(screen, /data-post-category-new=/, "each group can start a post in its own category");
  assert.match(screen, /groupPostsByCategory\(filtered, data\.products\)/);
  assert.match(screen, /data-post-category\b/, "the drawer picks the category");
  assert.match(screen, /entry\.category === draft\.category/, "the product list follows the chosen category");
  assert.match(screen, /data-post-tag-en-input/);
  assert.match(screen, /data-post-tag-my-input/);
  assert.match(screen, /data-post-tag-add/);
  assert.match(screen, /data-post-tag-suggest/);
  assert.match(screen, /postTagsText\(post\)/, "search reads both languages of every tag");
  assert.match(screen, /data-post-row-tags=/, "the table shows each post's tags");
  assert.doesNotMatch(screen, /New T-shirt post/, "the screen no longer speaks of T-shirt-only posts");
});
