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
  // Everything but the full footer: that one belongs to the home page alone (Plan, 2026-11-12).
  for (const component of ["Header", "CategoryRow"]) {
    assert.match(nyein, new RegExp(`import ${component} from "@/components/${component}"`), `reuses ${component}`);
    assert.match(home, new RegExp(`import ${component} from "@/components/${component}"`), `home also uses ${component}`);
  }
  assert.match(nyein, /getProductsBySubBrand\(NYEIN_BRAND\)/);
  assert.match(nyein, /import ProductStrip from "@\/components\/ProductStrip"/, "the boxes are the shop's own product card");
  assert.match(nyein, /rounded-2xl bg-gradient-to-r from-\[#efffdc\]/, "the same hero gradient as home");
  assert.match(nyein, /max-w-\[1480px\]/, "and the same page width");
});

test("every Nyein box is the home page's own product box", () => {
  const strip = read("apps/web/src/components/ProductStrip.tsx");
  const card = read("apps/web/src/components/ProductCard.tsx");
  const pieces = read("apps/web/src/lib/nyein-pieces.ts");
  // One shelf component for both pages, so the two can never drift apart again.
  assert.match(strip, /import ProductCard from "@\/components\/ProductCard"/);
  assert.match(home, /import ProductStrip from "@\/components\/ProductStrip"/);
  assert.match(card, /const productUrl = href \?\? `\/products\/\$\{product\.slug\}`/);
  assert.match(card, /t\("product\.buy"\)/);
  assert.doesNotMatch(strip, /\/create/, "a ready-made piece never opens the editor");
  assert.doesNotMatch(card, /\/create/, "and neither does a shop product");
  const count = (pieces.match(/slug: "/g) || []).length;
  assert.ok(count >= 8, `the shelf carries pieces to buy, found ${count}`);
  assert.match(pieces, /isCustomizable: "none"/);
  assert.match(nyein, /catalogue\.length \? catalogue : NYEIN_PIECES/, "the catalogue takes over when it has Nyein rows");
});

test("nothing on the Nyein page can be edited", () => {
  assert.doesNotMatch(nyein, /href="\/create"/, "no editor entry point");
  assert.doesNotMatch(nyein, /Start Designing/);
  const dictionary = readFileSync(path.join(__dirname, "..", "apps/web/src/lib/i18n.tsx"), "utf8");
  assert.match(nyein, /k="nyein\.lead"/, "the hero says nothing is customisable");
  assert.match(dictionary, /"nyein\.lead": "For those who don't follow the crowd[^"]*nothing to customise/);
  assert.match(nyein, /k="nyein\.readyOnly"/, "the card is labelled ready-made only");
  assert.match(dictionary, /"nyein\.readyOnly": "Ready-made only"/);
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
  assert.match(home, /<Footer \/>/);
});

test("the full footer renders on the home page alone", () => {
  // The owner's rule: the complete links/payment footer is the home page's, and every other screen ends with the
  // compact CopyrightBar from the root layout. Moving the full footer onto /nyein, then onto every shopper page,
  // was the same mistake twice - both reverted.
  const { readdirSync } = require("node:fs");
  const walk = (dir) => readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const child = `${dir}/${entry.name}`;
    return entry.isDirectory() ? walk(child) : [child];
  });
  const owners = walk("apps/web/src/app")
    .filter((file) => file.endsWith(".tsx") && /<Footer \/>/.test(read(file)))
    .sort();
  assert.deepEqual(owners, ["apps/web/src/app/page.tsx"], "only the home page mounts the full footer");
  assert.match(read("apps/web/src/app/layout.tsx"), /<CopyrightBar \/>/, "the other screens keep the copyright strip");
});
