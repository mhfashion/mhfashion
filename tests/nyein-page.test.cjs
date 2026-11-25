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
  for (const component of ["Header", "Footer", "CategoryRow", "ProductCard"]) {
    assert.match(nyein, new RegExp(`import ${component} from "@/components/${component}"`), `reuses ${component}`);
    assert.match(home, new RegExp(`import ${component} from "@/components/${component}"`), `home also uses ${component}`);
  }
  assert.match(nyein, /getProductsBySubBrand\(NYEIN_BRAND\)/);
  assert.match(nyein, /rounded-2xl bg-gradient-to-r from-\[#efffdc\]/, "the same hero gradient as home");
  assert.match(nyein, /max-w-\[1480px\]/, "and the same page width");
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
  assert.match(footer, /alwaysVisible \? "block" : "hidden md:block"/, "the phone shows it when asked");
  assert.match(nyein, /<Footer alwaysVisible \/>/, "and the Nyein page asks");
});
