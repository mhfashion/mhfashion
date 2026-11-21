const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function loadModule(relativePath) {
  const sourcePath = path.join(__dirname, "..", relativePath);
  const compiled = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: sourcePath,
  }).outputText;
  const loaded = { exports: {} };
  new Function("module", "exports", compiled)(loaded, loaded.exports);
  return loaded.exports;
}

const mockup = loadModule("apps/web/src/lib/product-mockup.ts");
const draft = loadModule("apps/web/src/lib/design-draft.ts");

test("looks are slugified so a colour name is safe in an object key", () => {
  assert.equal(mockup.mockupSegment("Premium Cotton"), "premium-cotton");
  assert.equal(mockup.mockupSegment("  Navy "), "navy");
  assert.equal(mockup.mockupSegment("Short Sleeve"), "short-sleeve");
  assert.equal(mockup.mockupSegment(""), null);
  assert.equal(mockup.mockupSegment(null), null);
  assert.equal(mockup.mockupSegment("!!!"), null);
});

test("the lookup walks from the most specific look to the default", () => {
  assert.deepEqual(
    mockup.mockupKeys("chaos-theory", { color: "Black", fit: "Oversized", sleeve: "Short Sleeve" }),
    ["black-oversized-short-sleeve", "black-oversized", "black-short-sleeve", "black", "default"],
  );
  assert.deepEqual(mockup.mockupKeys("chaos-theory", { color: "Navy" }), ["navy", "default"]);
  assert.deepEqual(mockup.mockupKeys("chaos-theory", {}), ["default"]);
  assert.deepEqual(mockup.mockupKeys("", { color: "Navy" }), []);
});

test("size never enters the key: M and XL share one photo", () => {
  const medium = mockup.mockupKeys("tee", { color: "Black", fit: "Regular", sleeve: "Short Sleeve", size: "M" });
  const extraLarge = mockup.mockupKeys("tee", { color: "Black", fit: "Regular", sleeve: "Short Sleeve", size: "XL" });
  assert.deepEqual(medium, extraLarge);
});

test("candidates are R2 URLs, then the catalog image", () => {
  const urls = mockup.mockupCandidates("chaos-theory", { color: "Black", fit: "Oversized" }, {
    base: "https://cdn.example.com/",
    extensions: ["webp", "png"],
    fallback: "https://catalog.example.com/chaos.jpg",
  });
  assert.deepEqual(urls, [
    "https://cdn.example.com/mockups/product/chaos-theory/black-oversized.webp",
    "https://cdn.example.com/mockups/product/chaos-theory/black-oversized.png",
    "https://cdn.example.com/mockups/product/chaos-theory/black.webp",
    "https://cdn.example.com/mockups/product/chaos-theory/black.png",
    "https://cdn.example.com/mockups/product/chaos-theory/default.webp",
    "https://cdn.example.com/mockups/product/chaos-theory/default.png",
    // photos uploaded before the product/editor split
    "https://cdn.example.com/mockups/chaos-theory/black-oversized.webp",
    "https://cdn.example.com/mockups/chaos-theory/black-oversized.png",
    "https://cdn.example.com/mockups/chaos-theory/black.webp",
    "https://cdn.example.com/mockups/chaos-theory/black.png",
    "https://cdn.example.com/mockups/chaos-theory/default.webp",
    "https://cdn.example.com/mockups/chaos-theory/default.png",
    "https://catalog.example.com/chaos.jpg",
  ]);
});

test("without an R2 bucket the catalog image is still the only candidate", () => {
  assert.deepEqual(
    mockup.mockupCandidates("tee", { color: "Black" }, { base: "", fallback: "https://catalog/tee.jpg" }),
    ["https://catalog/tee.jpg"],
  );
  assert.deepEqual(mockup.mockupCandidates("tee", { color: "Black" }, { base: "" }), []);
});

test("the print area stays inside the mockup box", () => {
  const area = mockup.PRODUCT_PRINT_AREA;
  assert.ok(area.left >= 0 && area.top >= 0);
  assert.ok(area.left + area.width <= 1);
  assert.ok(area.top + area.height <= 1);
  assert.ok(area.width > 0 && area.height > 0);
});

test("a shared SVG beats the editor draft, and an empty draft is no overlay", () => {
  const layers = [{ id: "layer-1", strokes: [{ points: [{ x: 0.4, y: 0.4 }] }] }];
  assert.deepEqual(draft.resolveDesignOverlay({ svgUrl: "https://cdn/design.svg", draft: layers }), {
    kind: "svg",
    url: "https://cdn/design.svg",
  });
  assert.deepEqual(draft.resolveDesignOverlay({ svgUrl: "   ", draft: layers }), { kind: "layers", layers });
  assert.equal(draft.resolveDesignOverlay({ draft: [] }), null);
  assert.equal(draft.resolveDesignOverlay({ draft: [{ id: "layer-1", strokes: [] }] }), null);
  assert.equal(draft.resolveDesignOverlay({}), null);
});

test("a draft counts as artwork when it has a stroke, text, image or shape", () => {
  assert.equal(draft.designLayersHaveArtwork([{ id: "a", strokes: [{ points: [{ x: 1, y: 1 }] }] }]), true);
  assert.equal(draft.designLayersHaveArtwork([{ id: "a", strokes: [], text: { value: "MH" } }]), true);
  assert.equal(draft.designLayersHaveArtwork([{ id: "a", strokes: [], image: { src: "data:," } }]), true);
  assert.equal(draft.designLayersHaveArtwork([{ id: "a", strokes: [], shape: { paths: [{ d: "M 0 0" }] } }]), true);
  assert.equal(draft.designLayersHaveArtwork([{ id: "a", strokes: [] }]), false);
  assert.equal(draft.designLayersHaveArtwork(null), false);
});

test("the product page renders the mockup from the selection with the design on top", () => {
  const client = readFileSync(path.join(__dirname, "..", "apps/web/src/components/ProductDetailClient.tsx"), "utf8");
  assert.match(client, /<ProductMockupPreview/);
  assert.match(client, /selection=\{\{ color: selectedColor, fit: selectedFit, sleeve: selectedSleeve, size: selectedSize \}\}/);
  assert.match(client, /design=\{design\}/);
  // A ready-made product (is_customizable = "none") must not paint the editor draft.
  assert.match(client, /resolveDesignOverlay\(\{\s*svgUrl: shared \?\? product\.designSvgUrl,\s*draft: designEditable \? readDesignDraft\(\) : null,\s*\}\)/);
  assert.match(client, /lg:grid-cols-\[minmax\(0,640px\)_minmax\(0,1fr\)\]/);
  assert.match(client, /colours=\{colors\}/);
  assert.match(client, /onSelectColour=\{setSelectedColor\}/);
  assert.equal(/activeImage/.test(client), false, "the fake 4-image carousel is gone");

  const preview = readFileSync(path.join(__dirname, "..", "apps/web/src/components/ProductMockupPreview.tsx"), "utf8");
  assert.match(preview, /mockupCandidates\(slug/);
  assert.match(preview, /data-product-mockup=\{src\}/);
  assert.match(preview, /onError=\{advance\}/);
  assert.match(preview, /image\.complete && image\.naturalWidth === 0/);
  assert.match(preview, /data-design-overlay=\{design\.kind\}/);
  // the thumbnail strip the product page lost: one tile per colour, photo or swatch
  assert.match(preview, /data-product-thumbs/);
  assert.match(preview, /data-product-thumb=\{name\}/);
  assert.match(preview, /data-thumb-swatch=\{name\}/);
  assert.match(preview, /includeDefault: false/);
  // hover zoom and the tap-to-enlarge dialog
  assert.match(preview, /data-product-zoom-layer/);
  assert.match(preview, /data-product-lightbox/);
  assert.match(preview, /pointerType !== "mouse"/);
  assert.match(preview, /transform: zoom\.active \? `scale\(\$\{ZOOM_SCALE\}\)` : "scale\(1\)"/);
  // the photo box is wider than it is tall, and short on phones
  assert.match(preview, /h-\[170px\] overflow-hidden rounded-2xl .* sm:aspect-\[16\/10\] sm:h-auto/);
  // thumbnails ride beside the photo instead of under it
  assert.match(preview, /absolute inset-y-0 left-0 flex w-11 flex-col gap-1\.5 overflow-y-auto/);
  assert.match(preview, /ml-12 sm:ml-16/);
  assert.equal(/mt-2 grid grid-cols-6/.test(preview), false, "no strip under the photo");
  assert.match(preview, /PRODUCT_PRINT_AREA/);
  assert.match(preview, /<EditorArtworkLayers layers=\{design\.layers\} \/>/);
});

test("the editor keeps its open design so the product page can preview it", () => {
  const canvas = readFileSync(path.join(__dirname, "..", "apps/web/src/components/EditorCanvas.tsx"), "utf8");
  assert.match(canvas, /saveDesignDraft\(layers\)/);
  assert.match(canvas, /window\.setTimeout\(\(\) => saveDesignDraft\(layers\), 400\)/);
  assert.match(canvas, /\}, \[layers\]\);/);
});

test("colour thumbnails skip the generic default look", () => {
  const all = mockup.mockupCandidates("chaos-theory", { color: "Navy" }, { base: "https://cdn.test", extensions: ["webp"], legacy: false });
  assert.deepEqual(all, ["https://cdn.test/mockups/product/chaos-theory/navy.webp", "https://cdn.test/mockups/product/chaos-theory/default.webp"]);

  const thumbs = mockup.mockupCandidates("chaos-theory", { color: "Navy" }, { base: "https://cdn.test", extensions: ["webp"], includeDefault: false, legacy: false });
  assert.deepEqual(thumbs, ["https://cdn.test/mockups/product/chaos-theory/navy.webp"]);

  const unknown = mockup.mockupCandidates("chaos-theory", { color: "Purple" }, { base: "https://cdn.test", extensions: ["webp"], includeDefault: false, legacy: false });
  assert.deepEqual(unknown, ["https://cdn.test/mockups/product/chaos-theory/purple.webp"], "no default look to mask the miss");
});

test("the editor and the catalogue read different mockup folders", () => {
  const product = mockup.mockupCandidates("chaos-theory", { color: "Black" }, { base: "https://cdn.test", extensions: ["webp"], legacy: false });
  assert.deepEqual(product, [
    "https://cdn.test/mockups/product/chaos-theory/black.webp",
    "https://cdn.test/mockups/product/chaos-theory/default.webp",
  ]);

  const editor = mockup.editorMockupCandidates("chaos-theory", { color: "Black", gsm: "180 GSM" }, { base: "https://cdn.test", extensions: ["webp"] });
  assert.deepEqual(editor, [
    "https://cdn.test/mockups/editor/chaos-theory/black-180-gsm.webp",
    "https://cdn.test/mockups/editor/chaos-theory/black.webp",
    "https://cdn.test/mockups/editor/chaos-theory/180-gsm.webp",
    "https://cdn.test/mockups/editor/chaos-theory/default.webp",
  ]);

  // The editor never falls back to the catalogue layout: a 4:5 photo does not fit a square panel.
  assert.equal(editor.some((url) => /\/mockups\/chaos-theory\//.test(url)), false);
});

test("editor look keys ignore fit and sleeve", () => {
  assert.deepEqual(
    mockup.editorMockupKeys("tee", { color: "White", gsm: "160 GSM" }),
    ["white-160-gsm", "white", "160-gsm", "default"],
  );
  assert.deepEqual(mockup.editorMockupKeys("tee", {}), ["default"]);
  assert.deepEqual(mockup.editorMockupKeys("", { color: "White" }), []);
});

test("without a bucket the editor asks for nothing", () => {
  assert.deepEqual(mockup.editorMockupCandidates("tee", { color: "White" }, { base: "" }), []);
});
