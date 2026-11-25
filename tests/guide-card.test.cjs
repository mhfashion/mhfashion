const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.join(__dirname, "..");
const card = readFileSync(path.join(ROOT, "apps/web/src/components/guide/GuideCard.tsx"), "utf8");
const page = readFileSync(path.join(ROOT, "apps/web/src/app/guide/page.tsx"), "utf8");
const articlePage = readFileSync(path.join(__dirname, "../apps/web/src/app/guide/[slug]/page.tsx"), "utf8");
const productCard = readFileSync(path.join(ROOT, "apps/web/src/components/ProductCard.tsx"), "utf8");

test("a guide card is the same square box as a product card", () => {
  assert.match(card, /aspect-square/, "the guide card is not square");
  assert.match(card, /rounded-xl border border-border bg-bg-surface p-1\.5/, "the card padding no longer matches the product card");
  assert.match(productCard, /aspect-square/, "the product card stopped being square, so the comparison is stale");
});

test("the tall cover band and the excerpt are gone from the guide card", () => {
  assert.equal(card.includes("aspect-[1.9/1]"), false, "the tall cover band is back");
  assert.equal(card.includes("{post.excerpt}"), false, "the excerpt is back and makes the card taller than a product tile");
  assert.match(card, /line-clamp-2/, "the title needs its two-line clamp");
});

test("the guide grid matches the product grid", () => {
  assert.match(page, /grid grid-cols-2 gap-2\.5 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4/);
});

test("the Other Guide row opens a list of posts, not one article", () => {
  assert.equal(page.split("data-guide-editor").length - 1, 2, "expected the sidebar row and the phone chip");
  assert.doesNotMatch(page, /href="\/guide\/editor-guide"/, "the row is not a link to the editor article");
  assert.match(page, /const otherGuideHref = otherGuide \? guideUrl\(otherGuide\.slug, query\) : guideUrl\("", query\);/, "the row lists the catch-all category, or every post");
  assert.match(articlePage, /const otherGuideHref = otherGuide \? `\/guide\?category=\$\{encodeURIComponent\(otherGuide\.slug\)\}#articles` : "\/guide#articles";/);
});

test("the guide page has no Clear control", () => {
  assert.doesNotMatch(page, />\s*Clear</, "the filter reset came back");
  assert.doesNotMatch(page, /aria-label="Clear/);
});

test("the guide menu never shows two Editor Guides", () => {
  // The category list already carries Editor Guide, so the extra row is the catch-all one, named by the catalogue.
  assert.equal(page.split(">Editor Guide</span>").length - 1, 0, "the phone chip still reads Editor Guide");
  assert.equal((page.match(/otherGuideName/g) || []).length >= 2, true, "the row is rendered from the catalogue name");
  assert.equal((articlePage.match(/otherGuideName/g) || []).length >= 2, true, "the article page's row takes the catalogue name too");
});

test("the guide hero stays compact", () => {
  assert.match(page, /min-h-\[96px\]/, "the phone hero grew back");
  assert.match(page, /sm:min-h-\[124px\]/);
  assert.equal(page.includes("lg:min-h-[196px]"), false, "the tall desktop hero is back");
});
