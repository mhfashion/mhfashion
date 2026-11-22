const assert = require("node:assert/strict");
const test = require("node:test");
const { loadModule } = require("./helpers/load-ts-module.cjs");

const designExport = loadModule("apps/web/src/lib/design-export.ts");

test("the print area is the same size in centimetres as on the press sheet", () => {
  assert.equal(designExport.PRINT_AREA_WIDTH_CM, 38.1, "4500 px at 300 dpi is 15 in");
  assert.equal(designExport.PRINT_AREA_HEIGHT_CM, 45.72, "5400 px at 300 dpi is 18 in");
  assert.equal(designExport.EXPORT_DPI, 300);
});

test("the downloaded PNG carries the press resolution", () => {
  assert.deepEqual(designExport.exportPixelSize(38.1, 45.72), { width: 4500, height: 5400 });
  assert.deepEqual(designExport.exportPixelSize(38.1, 45.72, 150), { width: 2250, height: 2700 });
  assert.deepEqual(designExport.exportPixelSize(0, 0), { width: 1, height: 1 }, "an empty size still makes a valid canvas");
  // The round trip the measurement CSV relies on: 4500 px wide is 38.1 cm at 300 dpi.
  assert.equal(designExport.pixelsToCentimetres(4500), 38.1);
  assert.equal(designExport.pixelsToCentimetres(5400), 45.72);
  assert.equal(designExport.pixelsToCentimetres(4500, 150), 76.2);
});

test("a hosted font travels inside the download", () => {
  const withFonts = designExport.designExportDocument({
    inner: '<g><text font-family="Padauk">Hi</text></g>',
    title: "MH Fashion T-Shirt design",
    fontCss: "@font-face{font-family:'Padauk';src:url('data:font/woff2;base64,AAAA') format('woff2');}",
  });
  assert.match(withFonts, /<title>MH Fashion T-Shirt design<\/title><defs><style type="text\/css"><!\[CDATA\[@font-face/);
  assert.ok(withFonts.indexOf("<style") < withFonts.indexOf("<g>"), "the faces come before the artwork");
  assert.ok(withFonts.includes("data:font/woff2;base64,AAAA"));
  assert.ok(!designExport.designExportDocument({ inner: "", title: "x" }).includes("<style"), "no fonts, no style block");
  assert.ok(!designExport.designExportDocument({ inner: "", title: "x", fontCss: "   " }).includes("<style"));

  // A stray `]]>` inside the CSS cannot close the CDATA section early.
  const hostile = designExport.designExportDocument({ inner: "", title: "x", fontCss: "a]]>b" });
  assert.ok(hostile.includes("<![CDATA[a]]]]><![CDATA[>b]]>"));
});

test("the exported document is sized in centimetres and holds only the artwork", () => {
  const svg = designExport.designExportDocument({ inner: "<g><rect width=\"10\" height=\"10\" /></g>", title: "MH Fashion T-Shirt design" });
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="38\.1cm" height="45\.72cm" viewBox="0 0 1000 1200">/);
  assert.match(svg, /<title>MH Fashion T-Shirt design<\/title>/);
  assert.match(svg, /<g><rect width="10" height="10" \/><\/g>/, "the artwork is copied through untouched");
  assert.equal(svg.match(/<svg/g).length, 1, "one root element, so the file opens on its own");

  const escaped = designExport.designExportDocument({ inner: "", title: "R&D <draft> \"quoted\"" });
  assert.match(escaped, /<title>R&amp;D &lt;draft&gt; &quot;quoted&quot;<\/title>/);

  const custom = designExport.designExportDocument({ inner: "", title: "Phone", widthCm: 7, heightCm: 14 });
  assert.match(custom, /width="7cm" height="14cm"/, "another print area can be asked for");
});

test("the file name is readable and safe on every platform", () => {
  assert.equal(designExport.designExportFileName("MH Fashion T-Shirt", "png"), "mh-fashion-t-shirt.png");
  assert.equal(designExport.designExportFileName("  Street / Vibes  ", "svg"), "street-vibes.svg");
  assert.equal(designExport.designExportFileName("", "png"), "mh-fashion-design.png");
  assert.equal(designExport.designExportFileName("!!!", "svg"), "mh-fashion-design.svg");
});

test("the rasteriser gets a data URL the browser can load", () => {
  const url = designExport.svgDataUrl('<svg width="1cm" fill="#fff"><text>a & b</text></svg>');
  assert.ok(url.startsWith("data:image/svg+xml;charset=utf-8,"));
  assert.equal(decodeURIComponent(url.split(",")[1]), '<svg width="1cm" fill="#fff"><text>a & b</text></svg>', "the markup survives the round trip");
  assert.ok(!url.includes("#"), "a raw # would end the URL at the colour");
});

test("nothing to export is reported, not written", () => {
  assert.equal(designExport.serializeArtworkSvg(null), "", "no canvas yet");
  assert.equal(designExport.downloadDesignSvg("", "MH Fashion"), "failed", "an empty document is refused instead of saving a broken file");
});
