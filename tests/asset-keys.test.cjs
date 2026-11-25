const assert = require("node:assert/strict");
const test = require("node:test");
const { loadModule } = require("./helpers/load-ts-module.cjs");

const keys = loadModule("apps/web/src/lib/asset-keys.ts");

test("every key in the plan builds from its shape, and the shape is recognised back", () => {
  const cases = [
    ["font", { slug: "padauk", file: "padauk-400", ext: "woff2" }, "fonts/padauk/padauk-400.woff2"],
    ["font-outline", { slug: "padauk", file: "padauk-400", ext: "ttf" }, "fonts/padauk/padauk-400.ttf"],
    ["font-meta", { slug: "padauk" }, "fonts/padauk/meta.json"],
    ["design", { slug: "street-wave", file: "design", ext: "svg" }, "designs/street-wave/design.svg"],
    ["design-meta", { slug: "street-wave" }, "designs/street-wave/meta.json"],
    ["element", { slug: "arrow", file: "element", ext: "svg" }, "elements/arrow/element.svg"],
    ["element-meta", { slug: "arrow" }, "elements/arrow/meta.json"],
    ["brush", { slug: "ink", file: "tip", ext: "png" }, "brushes/ink/tip.png"],
    ["brush", { slug: "ink", file: "tip", ext: "svg" }, "brushes/ink/tip.svg"],
    ["brush-meta", { slug: "ink" }, "brushes/ink/meta.json"],
    ["text-style-meta", { slug: "neon" }, "text-styles/neon/meta.json"],
    ["texture", { slug: "grain", file: "texture", ext: "png" }, "textures/grain/texture.png"],
    ["texture-meta", { slug: "grain" }, "textures/grain/meta.json"],
    ["post", { slug: "tee-drop", ext: "svg" }, "posts/tee-drop.svg"],
    ["mockup", { kind: "product", slug: "classic-tee", file: "front-black", ext: "webp" }, "mockups/product/classic-tee/front-black.webp"],
    ["mockup-meta", { kind: "editor", slug: "classic-tee" }, "mockups/editor/classic-tee/meta.json"],
    ["model", { slug: "classic-tee", ext: "glb" }, "models/classic-tee.glb"],
    ["jersey-mockup", { slug: "home-kit" }, "jersey-mockups/home-kit/worn_photo.png"],
    ["jersey-zones", { slug: "home-kit" }, "jersey-mockups/home-kit/mapping_zones.json"],
    ["site-category", { slug: "t-shirts", ext: "webp" }, "site/categories/t-shirts.webp"],
    ["site-banner", { slug: "hero", ext: "webp" }, "site/banners/hero.webp"],
    ["snapshot", { slug: "fonts" }, "catalog/fonts.json"],
    ["upload-tmp", { id: "user-1", file: "photo", ext: "webp" }, "uploads/tmp/user-1/photo.webp"],
    ["upload", { id: "user-1", file: "photo", ext: "jpg" }, "uploads/user-1/photo.jpg"],
    ["saved-thumbnail", { id: "user-1", design: "design-1" }, "saved/user-1/design-1/thumbnail.webp"],
    ["order-file", { id: "order-1", file: "manifest", ext: "json" }, "orders/order-1/manifest.json"],
    ["licence", { slug: "padauk", file: "ofl", ext: "pdf" }, "licences/padauk/ofl.pdf"],
  ];
  for (const [shape, vars, expected] of cases) {
    const key = keys.buildAssetKey(shape, vars);
    assert.equal(key, expected, `${shape} builds ${expected}`);
    const identified = keys.identifyAssetKey(key);
    assert.ok(identified, `${key} is recognised`);
    assert.equal(identified.shape, shape, `${key} is read as ${shape}`);
  }
});

test("a key is built from names, never typed, so a bad name is refused", () => {
  assert.throws(() => keys.buildAssetKey("design", { slug: "Street Wave", file: "design", ext: "svg" }), /refused slug/);
  assert.throws(() => keys.buildAssetKey("design", { slug: "street-wave", file: "design", ext: "png" }), /accepts svg/);
  assert.throws(() => keys.buildAssetKey("upload", { id: "a b", file: "photo", ext: "webp" }), /refused id/);
  assert.throws(() => keys.buildAssetKey("font", { slug: "padauk" }), /needs file/);
  assert.throws(() => keys.buildAssetKey("mockup", { kind: "product", slug: "tee", file: "front", ext: "gif" }), /accepts webp, png, jpg/);
});

test("a key that no shape describes is refused before anything is uploaded", () => {
  for (const key of ["mockups/loose.png", "designs/street-wave.svg", "secrets/a.json", "fonts/padauk.svg", "mockups/product/tee/front.webp/extra"]) {
    assert.equal(keys.identifyAssetKey(key), null, `${key} is not a shape`);
  }
});

test("the file check gives the reason a shop needs: wrong type or too large", () => {
  assert.deepEqual(keys.checkAssetFile("designs/street-wave/design.svg", 1000), { ok: true, shape: "design" });
  assert.deepEqual(keys.checkAssetFile("designs/street-wave/design.svg", 3_000_000), {
    ok: false,
    reason: "design is limited to 2000 KB",
  });
  assert.deepEqual(keys.checkAssetFile("mockups/product/tee/front.gif", 10), { ok: false, reason: "no shape describes this key" });
  assert.equal(keys.checkAssetFile("catalog/fonts.json", 200).shape, "snapshot");
  assert.equal(keys.ASSET_SHAPES.font.bucket, "public");
  assert.equal(keys.ASSET_SHAPES.upload.bucket, "private");
});
