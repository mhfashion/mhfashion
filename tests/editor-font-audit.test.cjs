const assert = require("node:assert/strict");
const test = require("node:test");
const { loadModule } = require("./helpers/load-ts-module.cjs");

const audit = loadModule("apps/web/src/lib/editor-font-audit.ts");

function font(patch = {}) {
  return {
    slug: "padauk",
    name: "Padauk",
    shelf: "burmese",
    licence: { name: "SIL Open Font License 1.1", url: "https://scripts.sil.org/OFL" },
    files: [{ weight: 400, style: "normal", file: "fonts/padauk/regular.woff2" }],
    ...patch,
  };
}

test("a folder that matches its manifest is ready to upload", () => {
  const result = audit.auditFontLibrary(
    { fonts: [font(), font({ slug: "grotesk", name: "Grotesk", shelf: "sans", files: [{ file: "fonts/grotesk/regular.woff2" }] })] },
    [{ path: "manifest.json", bytes: 900 }, { path: "padauk/regular.woff2", bytes: 200_000 }, { path: "grotesk/regular.woff2", bytes: 90_000 }],
  );
  assert.deepEqual(result.picker, [
    { shelf: "sans", label: "Sans", names: ["Grotesk"] },
    { shelf: "burmese", label: "Burmese", names: ["Padauk"] },
  ]);
  assert.deepEqual(result.skipped, []);
  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.large, []);
  assert.equal(audit.fontAuditIsClean(result), true);
});

test("a file the manifest lists but the folder does not hold is named", () => {
  const result = audit.auditFontLibrary(
    { fonts: [font({ files: [
      { weight: 400, style: "normal", file: "fonts/padauk/regular.woff2" },
      { weight: 700, style: "normal", file: "fonts/padauk/bold.woff2" },
    ] })] },
    [{ path: "padauk/regular.woff2", bytes: 200_000 }],
  );
  assert.deepEqual(result.missing, ["fonts/padauk/bold.woff2"], "the missing weight is reported, the present one is not");
  assert.equal(audit.fontAuditIsClean(result), false);
});

test("the same folder is read whether it is the bucket root or the fonts folder", () => {
  const manifest = { fonts: [font()] };
  const bucketRoot = [{ path: "fonts/padauk/regular.woff2", bytes: 100 }];
  const fontsFolder = [{ path: "padauk/regular.woff2", bytes: 100 }];
  assert.deepEqual(audit.auditFontLibrary(manifest, bucketRoot).missing, []);
  assert.deepEqual(audit.auditFontLibrary(manifest, fontsFolder).missing, []);
  assert.deepEqual(audit.auditFontLibrary(manifest, [{ path: "fonts/other/regular.woff2", bytes: 100 }]).missing, ["fonts/padauk/regular.woff2"]);
});

test("a heavy file is a warning, not a blocker", () => {
  const result = audit.auditFontLibrary(
    { fonts: [font()] },
    [{ path: "padauk/regular.woff2", bytes: audit.FONT_FILE_WARN_BYTES + 1 }],
  );
  assert.deepEqual(result.large, [{ file: "fonts/padauk/regular.woff2", bytes: audit.FONT_FILE_WARN_BYTES + 1 }]);
  assert.equal(audit.fontAuditIsClean(result), true, "size alone does not stop the upload");
});

test("an entry the editor would drop stops the upload, with the editor's own reason", () => {
  const result = audit.auditFontLibrary(
    { fonts: [font(), font({ slug: "unlicensed", name: "Unlicensed", licence: undefined })] },
    [{ path: "padauk/regular.woff2", bytes: 100 }],
  );
  assert.deepEqual(result.picker.map((group) => group.names), [["Padauk"]]);
  assert.equal(result.skipped.length, 1);
  assert.equal(result.skipped[0].slug, "unlicensed");
  assert.match(result.skipped[0].reason, /licence/);
  assert.equal(audit.fontAuditIsClean(result), false);
});
