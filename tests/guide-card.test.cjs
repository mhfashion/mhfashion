const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.join(__dirname, "..");
const card = readFileSync(path.join(ROOT, "apps/web/src/components/guide/GuideCard.tsx"), "utf8");
const page = readFileSync(path.join(ROOT, "apps/web/src/app/guide/page.tsx"), "utf8");
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

test("the guide menu box carries an Editor Guide entry", () => {
  assert.equal(page.split("data-guide-editor").length - 1, 2, "expected the sidebar row and the phone chip");
  assert.match(page, /href="\/guide\/editor-guide"/);
});

test("the guide hero stays compact", () => {
  assert.match(page, /min-h-\[96px\]/, "the phone hero grew back");
  assert.match(page, /sm:min-h-\[124px\]/);
  assert.equal(page.includes("lg:min-h-[196px]"), false, "the tall desktop hero is back");
});
