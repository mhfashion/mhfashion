const assert = require("node:assert/strict");
const test = require("node:test");
const { spawnSync } = require("node:child_process");
const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const SCRIPT = path.join(ROOT, "scripts/check-assets.cjs");

function fixture(files) {
  const folder = mkdtempSync(path.join(os.tmpdir(), "assets-check-"));
  for (const [key, body] of Object.entries(files)) {
    const full = path.join(folder, key);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, body);
  }
  return folder;
}

const FONT_META = JSON.stringify({
  slug: "padauk",
  name: "Padauk",
  shelf: "sans",
  licence: { name: "OFL 1.1" },
  files: [{ file: "fonts/padauk/padauk-400.woff2", weight: 400 }],
});

function run(files) {
  const folder = fixture(files);
  try {
    const result = spawnSync(process.execPath, [SCRIPT, folder], { encoding: "utf8" });
    return { status: result.status, output: `${result.stdout}${result.stderr}` };
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}

test("the pre-upload check passes a folder the catalogue accepts", () => {
  const { status, output } = run({
    "fonts/padauk/meta.json": FONT_META,
    "fonts/padauk/padauk-400.woff2": "woff2",
    "designs/street-wave/meta.json": JSON.stringify({ slug: "street-wave", name: "Street Wave" }),
    "designs/street-wave/design.svg": "<svg/>",
    "mockups/product/classic-tee/front-black.webp": "webp",
  });
  assert.equal(status, 0, output);
  assert.match(output, /Everything is ready to upload\./);
  assert.match(output, /mockups\s+1 item, 0 issues/);
});

test("a file that no shape describes, a retired design form and a licence-less font are refused", () => {
  const { status, output } = run({
    "fonts/padauk/meta.json": JSON.stringify({
      slug: "padauk",
      name: "Padauk",
      shelf: "sans",
      files: [{ file: "fonts/padauk/padauk-400.woff2", weight: 400 }],
    }),
    "fonts/padauk/padauk-400.woff2": "woff2",
    "designs/legacy.svg": "<svg/>",
    "mockups/product/classic-tee/front-black.gif": "gif",
  });
  assert.equal(status, 1);
  assert.match(output, /designs\/legacy\.svg: no shape describes this key/);
  assert.match(output, /front-black\.gif: no shape describes this key/);
  assert.match(output, /no licence, so it must not ship/);
});

test("a file above the size limit names its limit", () => {
  const { status, output } = run({
    "designs/street-wave/meta.json": JSON.stringify({ slug: "street-wave", name: "Street Wave" }),
    "designs/street-wave/design.svg": "x".repeat(2_000_001),
  });
  assert.equal(status, 1);
  assert.match(output, /design\.svg: design is limited to 2000 KB/);
});
