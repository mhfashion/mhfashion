const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (file) => readFileSync(path.join(root, file), "utf8");
const nyein = read("apps/web/src/app/nyein/page.tsx");
const home = read("apps/web/src/app/page.tsx");
const footer = read("apps/web/src/components/Footer.tsx");

test("the Nyein page wears the home page's UI", () => {
  for (const component of ["Header", "Footer", "CategoryRow"]) {
    assert.match(nyein, new RegExp(`import ${component} from "@/components/${component}"`), `reuses ${component}`);
    assert.match(home, new RegExp(`import ${component} from "@/components/${component}"`), `home also uses ${component}`);
  }
  assert.match(nyein, /getProductsBySubBrand\(NYEIN_BRAND\)/);
  assert.match(nyein, /NyeinPieceCard/, "the boxes are Nyein's own card");
  assert.match(nyein, /rounded-2xl bg-gradient-to-r from-\[#efffdc\]/, "the same hero gradient as home");
  assert.match(nyein, /max-w-\[1480px\]/, "and the same page width");
});

test("every Nyein box can be bought or added to the cart", () => {
  const card = read("apps/web/src/components/NyeinPieceCard.tsx");
  const pieces = read("apps/web/src/lib/nyein-pieces.ts");
  assert.match(card, /useCart\(\)/);
  assert.match(card, /addItem\(piece\)/);
  assert.match(card, /data-nyein-buy=/);
  assert.match(card, /data-nyein-cart=/);
  assert.match(card, /t\("product\.buy"\)/);
  assert.match(card, /t\("product\.addToCart"\)/);
  assert.match(card, /window\.location\.href = "\/cart"/);
  assert.doesNotMatch(card, /\/create/, "a ready-made piece never opens the editor");
  const count = (pieces.match(/slug: "/g) || []).length;
  assert.ok(count >= 8, `the shelf carries pieces to buy, found ${count}`);
  assert.match(pieces, /isCustomizable: "none"/);
  assert.match(nyein, /catalogue\.length \? catalogue : NYEIN_PIECES/, "the catalogue takes over when it has Nyein rows");
});

test("nothing on the Nyein page can be edited", () => {
  assert.doesNotMatch(nyein, /href="\/create"/, "no editor entry point");
  assert.doesNotMatch(nyein, /Start Designing/);
  assert.match(nyein, /nothing to customise/);
  assert.match(nyein, /Ready-made only/);
  assert.doesNotMatch(nyein, /AdSlotBanner/, "no admin-editable ad slots");
});

test("the footer carries every promised block, on a phone too", () => {
  for (const block of [
    "footer.shop", "footer.help", "footer.legal", "footer.newsletter",
    "footer.myanmarPayment", "footer.download", "footer.internationalPayment",
  ]) {
    assert.match(footer, new RegExp(block.replace(".", "\\.")), `footer keeps ${block}`);
  }
  for (const brand of ["KBZPay", "Wave Pay", "AYA Pay", "App Store", "Google Play", "Visa", "Mastercard", "TikTok"]) {
    assert.match(footer, new RegExp(brand), `footer lists ${brand}`);
  }
  assert.doesNotMatch(footer, /hidden md:block/, "no width hides the footer");
  assert.match(footer, /pb-\[calc\(4\.5rem\+env\(safe-area-inset-bottom\)\)\] md:pb-6/, "and the fixed bottom nav never covers its last row");
  assert.match(nyein, /<Footer \/>/);
});
