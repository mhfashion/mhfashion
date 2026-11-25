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

test("every shopper page carries the footer", () => {
  // Only home and Nyein had one until 2026-11-21; a Nyein box then opened a product page, a cart or a
  // 404 with nothing under the content. Every storefront route now renders the one footer.
  const { readdirSync } = require("node:fs");
  const walk = (dir) => readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const child = `${dir}/${entry.name}`;
    return entry.isDirectory() ? walk(child) : [child];
  });
  const skip = /^apps\/web\/src\/app\/(admin|create|offline|api)(\/|$)/;
  const pages = walk("apps/web/src/app").filter((file) => file.endsWith("/page.tsx") && !skip.test(file));
  assert.ok(pages.length > 20, `the sweep found only ${pages.length} pages`);
  for (const file of pages) {
    const source = read(file);
    if (/^\s*redirect\(/m.test(source)) continue; // a redirect page has no body of its own
    assert.ok(/<Footer \/>|footer=\{false\}|InfoPage/.test(source), `${file} shows no footer`);
  }
});

test("every page a Nyein box opens carries the same footer", () => {
  // The box opens /products/<slug>, and a missing piece lands on the 404 page.
  for (const file of ["apps/web/src/app/products/[slug]/page.tsx", "apps/web/src/app/products/page.tsx", "apps/web/src/app/not-found.tsx"]) {
    assert.match(read(file), /<Footer \/>/, `${file} dropped the footer`);
    assert.match(read(file), /import Footer from "@\/components\/Footer"/, `${file} does not import the one footer`);
  }
});
