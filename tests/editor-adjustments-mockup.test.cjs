// Plan E22: the owner reviews a visual mock-up before the panel is rebuilt. The mock-up is one
// self-contained page at /editor-adjustments-mockup.html, so these tests hold it to the shape the
// plan promises: every switch, every control the plan lists, no text under 11px, an 18-20rem
// desktop panel, and a phone sheet with three heights.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const file = path.join(__dirname, "..", "apps", "web", "public", "editor-adjustments-mockup.html");
const html = fs.readFileSync(file, "utf8");

test("the mock-up is one self-contained page, so it opens from a file or from the site", () => {
  assert.doesNotMatch(html, /<script[^>]+src=/i, "no external script");
  assert.doesNotMatch(html, /<link[^>]+rel=["']?stylesheet/i, "no external stylesheet");
  assert.doesNotMatch(html, /@import/i, "no imported CSS");
  assert.doesNotMatch(html, /<img[^>]+src=/i, "no remote images");
  assert.match(html, /<style>/, "the styles are inline");
});

test("the three switches cover every state the plan asks the owner to review", () => {
  for (const set of ["lang", "theme", "device"]) {
    const values = [...html.matchAll(new RegExp(`data-set="${set}" data-value="([a-z]+)"`, "g"))].map((m) => m[1]);
    assert.deepEqual(values, set === "lang" ? ["en", "mm"] : set === "theme" ? ["dark", "light"] : ["desktop", "phone"], set);
  }
  assert.match(html, /\[data-lang="en"\] \.mm, \[data-lang="mm"\] \.en \{ display: none; \}/, "one language shows at a time");
});

test("the Arrange section carries every control the plan lists", () => {
  const labels = [
    "X in centimetres", "Y in centimetres", "Width in centimetres", "Height in centimetres",
    "Rotation", "Rotation in degrees", "Lock proportions", "Align left", "Align centre", "Align right",
    "Rotate 90 degrees", "Reset transform", "Distribute horizontally", "Distribute vertically",
    "Flip horizontal", "Flip vertical",
  ];
  for (const label of labels) assert.ok(html.includes(`aria-label="${label}"`), label);
  assert.match(html, /<small>cm<\/small>/, "the size fields say centimetres");
  assert.match(html, /372 × 273 px/, "pixels sit beside the centimetres");
});

test("one colour control serves every place: palette, recents, hex and an eyedropper", () => {
  assert.match(html, /role="dialog" aria-label="Colour picker"/);
  assert.match(html, /Shop palette/);
  assert.match(html, /Last six/);
  assert.match(html, /aria-label="Hex colour"/);
  assert.match(html, /aria-label="Pick a colour from the canvas"/);
  assert.doesNotMatch(html, /<input type="color"/, "no native colour inputs, which is what the panel has today");
});

test("the remaining sections carry the controls the plan lists", () => {
  const labels = [
    "Blend mode", "Opacity", "Fill", "Letter case", "Weight", "Shadow", "Outline", "Glow", "Extrude",
    "Show the photo before adjustments", "Photo view", "Exposure", "Contrast", "Saturation", "Temperature",
    "One-tap looks", "Layer name", "Duplicate layer", "Lock layer", "Delete layer", "Close adjustments",
  ];
  for (const label of labels) assert.ok(html.includes(`aria-label="${label}"`), label);
  assert.match(html, /Copy<\/span><span class="mm">/, "copy style is present");
  assert.match(html, /Paste<\/span><span class="mm">/, "paste style is present");
  for (const name of ["Reset arrangement", "Reset style", "Reset text", "Reset photo", "Reset layer"]) {
    assert.ok(html.includes(`aria-label="${name}"`), `${name}: every section header has a reset`);
  }
});

test("no text in the panel is smaller than 11px, and the panel is 18-20rem wide", () => {
  const sizes = [...html.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
  assert.ok(sizes.length > 0);
  for (const size of sizes) assert.ok(size >= 11, `${size}px is below the plan's 11px floor`);
  assert.match(html, /\.panel \{[\s\S]*?width: 320px/, "320px is 20rem, inside the 18-20rem range");
  assert.doesNotMatch(html, /min\(16rem/, "the current 16rem panel is what the plan widens");
  assert.match(html, /--row: 32px/, "one 32px row family");
  assert.match(html, /font: 12px\/1\.5/, "12px body with line height 1.5, so Myanmar marks are not clipped");
});

test("the phone view is a bottom sheet with a drag handle and three heights", () => {
  for (const size of ["peek", "half", "full"]) {
    assert.ok(html.includes(`data-sheet="${size}"`), size);
    assert.match(html, new RegExp(`\\[data-sheet="${size}"\\] \\.panel \\{ height:`), `${size} height rule`);
  }
  assert.match(html, /\.grabber/, "a drag handle");
  assert.match(html, /min-height: 44px/, "44px targets on a phone");
  assert.match(html, /aspect-ratio: 4 \/ 3/, "a canvas that the half-height sheet leaves clear");
});

test("the Myanmar labels are present and both languages say this is a mock-up", () => {
  const myanmar = [...html.matchAll(/<span class="mm">([^<]*)<\/span>/g)].map((m) => m[1]);
  const burmese = myanmar.filter((text) => /[\u1000-\u109F]/.test(text));
  assert.ok(burmese.length >= 60, `only ${burmese.length} Myanmar labels`);
  assert.match(html, /not the live editor/i);
  assert.match(html, /တကယ့် editor မဟုတ်ပါ/);
  assert.match(html, /copywriter finalises it/, "the Myanmar copy is flagged as a first pass");
});
