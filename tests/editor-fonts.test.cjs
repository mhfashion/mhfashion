const assert = require("node:assert/strict");
const test = require("node:test");
const { loadModule } = require("./helpers/load-ts-module.cjs");

const fonts = loadModule("apps/web/src/lib/editor-fonts.ts");

function entry(patch = {}) {
  return {
    slug: "padauk",
    name: "Padauk",
    shelf: "burmese",
    scripts: ["myanmar", "latin"],
    licence: { name: "OFL 1.1", url: "https://scripts.sil.org/OFL" },
    files: [{ weight: 400, style: "normal", file: "fonts/padauk/regular.woff2" }],
    ...patch,
  };
}

test("without a manifest the editor keeps the eight system fonts", () => {
  assert.deepEqual(fonts.EDITOR_SYSTEM_FONTS, [
    "Inter", "Arial", "Georgia", "Impact", "Courier New", "Trebuchet MS", "Verdana", "Times New Roman",
  ]);
  assert.equal(fonts.FONT_MANIFEST_PATH, "fonts/manifest.json");
  assert.deepEqual(fonts.parseEditorFontManifest({ fonts: [] }), { fonts: [], skipped: [] });
});

test("a good manifest keeps every field and fills the defaults", () => {
  const manifest = fonts.parseEditorFontManifest({
    version: 1,
    fonts: [entry({ scripts: undefined, files: [{ file: "fonts/padauk/regular.woff2" }] })],
  });
  assert.deepEqual(manifest.skipped, []);
  assert.equal(manifest.fonts.length, 1);
  const font = manifest.fonts[0];
  assert.equal(font.slug, "padauk");
  assert.equal(font.shelf, "burmese");
  assert.deepEqual(font.scripts, ["latin"], "a font with no scripts declared is treated as Latin");
  assert.deepEqual(font.files, [{ weight: 400, style: "normal", file: "fonts/padauk/regular.woff2" }]);
  assert.equal(font.enabled, true);
  assert.deepEqual(font.licence, { name: "OFL 1.1", url: "https://scripts.sil.org/OFL" });
});

test("an entry that cannot be trusted is skipped with a reason, never fatal", () => {
  const manifest = fonts.parseEditorFontManifest({
    fonts: [
      entry(),
      entry({ slug: "Bad Slug" }),
      entry({ slug: "no-shelf", name: "NoShelf", shelf: "comic" }),
      entry({ slug: "no-file", name: "NoFile", files: [] }),
      entry({ slug: "off-bucket", name: "OffBucket", files: [{ file: "../secret.woff2" }] }),
      entry({ slug: "absolute", name: "Absolute", files: [{ file: "https://example.com/a.woff2" }] }),
      entry({ slug: "not-woff2", name: "NotWoff2", files: [{ file: "fonts/x/regular.ttf" }] }),
      entry({ slug: "no-licence", name: "NoLicence", licence: undefined }),
      entry({ slug: "padauk", name: "Padauk Again" }),
      entry({ slug: "same-name", name: "padauk" }),
      entry({ slug: "bad-weight", name: "BadWeight", files: [{ weight: 42, file: "fonts/x/a.woff2" }] }),
    ],
  });
  assert.deepEqual(manifest.fonts.map((font) => font.slug), ["padauk"]);
  const reasons = Object.fromEntries(manifest.skipped.map((skip) => [skip.slug, skip.reason]));
  assert.match(reasons["Bad Slug"], /slug/);
  assert.match(reasons["no-shelf"], /shelf/);
  assert.match(reasons["no-file"], /woff2/);
  assert.match(reasons["off-bucket"], /woff2/);
  assert.match(reasons["absolute"], /woff2/);
  assert.match(reasons["not-woff2"], /woff2/);
  assert.match(reasons["no-licence"], /licence/);
  assert.match(reasons.padauk, /duplicate slug/);
  assert.match(reasons["same-name"], /duplicate name/);
  assert.match(reasons["bad-weight"], /woff2/);
});

test("a manifest that is not a manifest leaves the system fonts in place", () => {
  for (const raw of [null, "fonts", 42, {}, { fonts: "padauk" }]) {
    const manifest = fonts.parseEditorFontManifest(raw);
    assert.deepEqual(manifest.fonts, []);
    assert.deepEqual(manifest.skipped, [{ slug: "manifest", reason: "no fonts array" }]);
  }
});

test("font files resolve against the bucket address and nothing else", () => {
  assert.equal(fonts.fontFileUrl("https://cdn.example.com/", "fonts/padauk/regular.woff2"), "https://cdn.example.com/fonts/padauk/regular.woff2");
  assert.equal(fonts.fontFileUrl("https://cdn.example.com", "/fonts/padauk/regular.woff2"), "https://cdn.example.com/fonts/padauk/regular.woff2");
  assert.equal(fonts.fontFileUrl("  ", "fonts/padauk/regular.woff2"), "fonts/padauk/regular.woff2");
  assert.equal(fonts.fontFileUrl("https://cdn.example.com", "https://other.example.com/a.woff2"), "https://other.example.com/a.woff2");
});

test("@font-face carries the family, the file and the script ranges", () => {
  const [font] = fonts.parseEditorFontManifest({ fonts: [entry({ files: [
    { weight: 400, style: "normal", file: "fonts/padauk/regular.woff2" },
    { weight: 700, style: "normal", file: "fonts/padauk/bold.woff2" },
  ] })] }).fonts;
  const css = fonts.fontFaceCss(font, "https://cdn.example.com");
  const blocks = css.split("@font-face{").filter(Boolean);
  assert.equal(blocks.length, 2, "one block per weight");
  assert.match(blocks[0], /font-family:'Padauk';/);
  assert.match(blocks[0], /font-weight:400;/);
  assert.match(blocks[1], /font-weight:700;/);
  assert.match(blocks[0], /font-display:swap;/);
  assert.match(blocks[0], /src:url\('https:\/\/cdn\.example\.com\/fonts\/padauk\/regular\.woff2'\) format\('woff2'\);/);
  assert.match(blocks[0], /unicode-range:[^;]*U\+0000-00FF/, "the Latin range is declared");
  assert.match(blocks[0], /unicode-range:[^;]*U\+1000-109F/, "the Myanmar range is declared");
  assert.ok(!css.includes("@font-face{@font-face"), "blocks are joined, not nested");
});

test("a quote in a font name cannot break the stylesheet", () => {
  const [font] = fonts.parseEditorFontManifest({ fonts: [entry({ name: "Shop's Font" })] }).fonts;
  assert.match(fonts.fontFaceCss(font, ""), /font-family:'Shop\\'s Font';/);
});

test("only the fonts the artwork uses are loaded, and only while they are switched on", () => {
  const manifest = fonts.parseEditorFontManifest({
    fonts: [
      entry({ slug: "padauk", name: "Padauk" }),
      entry({ slug: "noto-myanmar", name: "Noto Sans Myanmar" }),
      entry({ slug: "retired", name: "Retired", enabled: false }),
    ],
  }).fonts;
  assert.deepEqual(
    fonts.fontsInUse(manifest, ["Padauk", "'Noto Sans Myanmar', sans-serif", "Padauk"]).map((font) => font.name),
    ["Padauk", "Noto Sans Myanmar"],
    "order follows the manifest and repeats collapse",
  );
  assert.deepEqual(fonts.fontsInUse(manifest, ["Retired"]), [], "a switched-off font falls back to the stack");
  assert.deepEqual(fonts.fontsInUse(manifest, ["Inter", "", null, undefined]), []);
  assert.deepEqual(fonts.fontsInUse(manifest, []), []);
});

test("the picker lists the shelves in order and drops the empty ones", () => {
  const manifest = fonts.parseEditorFontManifest({
    fonts: [
      entry({ slug: "padauk", name: "Padauk", shelf: "burmese" }),
      entry({ slug: "grotesk", name: "Grotesk", shelf: "sans" }),
      entry({ slug: "garamond", name: "Garamond", shelf: "serif" }),
      entry({ slug: "off", name: "Off", shelf: "script", enabled: false }),
    ],
  }).fonts;
  assert.deepEqual(fonts.fontShelfGroups(manifest), [
    { shelf: "sans", label: "Sans", names: ["Grotesk"] },
    { shelf: "serif", label: "Serif", names: ["Garamond"] },
    { shelf: "burmese", label: "Burmese", names: ["Padauk"] },
  ]);
  assert.deepEqual(fonts.editorFontNames(manifest), ["Grotesk", "Garamond", "Padauk"]);
});

test("a stored family stack resolves to the family name the picker shows", () => {
  assert.equal(fonts.fontFamilyName("'Inter', system-ui, sans-serif"), "Inter");
  assert.equal(fonts.fontFamilyName('"Padauk", serif'), "Padauk");
  assert.equal(fonts.fontFamilyName("Georgia"), "Georgia");
  assert.equal(fonts.fontFamilyName(""), "");
});
