const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.join(__dirname, "..");
const detail = readFileSync(path.join(ROOT, "apps/web/src/components/ProductDetailClient.tsx"), "utf8");

test("the product page no longer advertises delivery, payment or support promises", () => {
  for (const claim of ["Free Delivery", "Secure Payment", "Easy Returns", "24/7 Support", "Seol Support"]) {
    assert.equal(detail.includes(claim), false, `${claim} is still on the product page`);
  }
});

test("removing the badges left no dead icon imports", () => {
  for (const icon of ["Truck", "ShieldCheck", "RotateCcw", "UserRound", "Sparkles"]) {
    assert.equal(detail.includes(icon), false, `${icon} is imported but unused`);
  }
});

test("the product page still carries the buying controls and the policy tabs", () => {
  for (const marker of ["data-add-to-cart", "data-buy-now", "Shipping & Returns", "Size Guide"]) {
    assert.ok(detail.includes(marker), `${marker} disappeared from the product page`);
  }
});
