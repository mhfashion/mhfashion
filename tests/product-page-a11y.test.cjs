// The product page needs a catalogue to render, and the local build has none, so these are asserted
// against the component source: a shopper who cannot see the highlighted swatch has to be told which
// size, colour and price are selected, and a changed total has to be spoken.
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = readFileSync(path.join(__dirname, "..", "apps/web/src/components/ProductDetailClient.tsx"), "utf8");

const optionButton = source.slice(source.indexOf("function OptionButton"), source.indexOf("function OptionGroup"));

test("a size/material/fit/sleeve/GSM option states whether it is the chosen one", () => {
  assert.match(optionButton, /aria-pressed=\{selected\}/, "OptionButton does not expose its selected state");
});

test("a colour swatch states whether it is the chosen one", () => {
  const swatches = source.slice(source.indexOf("colors.map"), source.indexOf("colors.map") + 400);
  assert.match(swatches, /aria-pressed=\{selectedColor === color\.name\}/, "colour swatches do not expose their selected state");
});

test("choosing a variant announces the new price", () => {
  const price = source.match(/<span[^>]*data-product-price[^>]*>/);
  assert.ok(price, "the price span lost its data-product-price marker");
  assert.match(price[0], /aria-live="polite"/, "the price changes silently");
});

test("pressing the quantity buttons announces the new quantity", () => {
  const quantity = source.match(/<span[^>]*data-product-quantity[^>]*>/);
  assert.ok(quantity, "the quantity span lost its data-product-quantity marker");
  assert.match(quantity[0], /aria-live="polite"/, "the quantity changes silently");
});

test("the buying controls and the variant warning are still wired", () => {
  for (const marker of ["data-add-to-cart", "data-buy-now", "data-variant-warning", 'role="status"']) {
    assert.ok(source.includes(marker), `${marker} disappeared from the product page`);
  }
});
