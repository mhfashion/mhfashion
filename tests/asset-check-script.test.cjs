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

const WOFF2 = Buffer.concat([Buffer.from("wOF2"), Buffer.alloc(40)]);
const SVG = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>';

function webp(width, height) {
  const body = Buffer.alloc(18);
  body.write("VP8X", 0, "ascii");
  body.writeUInt32LE(10, 4);
  body.writeUIntLE(width - 1, 12, 3);
  body.writeUIntLE(height - 1, 15, 3);
  const file = Buffer.concat([Buffer.from("RIFF", "ascii"), Buffer.alloc(4), Buffer.from("WEBP", "ascii"), body]);
  file.writeUInt32LE(file.length - 8, 4);
  return file;
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
    "fonts/padauk/padauk-400.woff2": WOFF2,
    "designs/street-wave/meta.json": JSON.stringify({ slug: "street-wave", name: "Street Wave" }),
    "designs/street-wave/design.svg": SVG,
    "mockups/product/classic-tee/front-black.webp": webp(800, 1000),
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
    "fonts/padauk/padauk-400.woff2": WOFF2,
    "designs/legacy.svg": SVG,
    "mockups/product/classic-tee/front-black.gif": "gif",
  });
  assert.equal(status, 1);
  assert.match(output, /designs\/legacy\.svg: no shape describes this key/);
  assert.match(output, /front-black\.gif: no shape describes this key/);
  assert.match(output, /no licence, so it must not ship/);
});

test("a file whose bytes are not what its name says is refused", () => {
  const png = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png, 0);
  png.writeUInt32BE(13, 8);
  png.write("IHDR", 12, "ascii");
  png.writeUInt32BE(600, 16);
  png.writeUInt32BE(600, 20);
  const { status, output } = run({
    "designs/street-wave/meta.json": JSON.stringify({ slug: "street-wave", name: "Street Wave" }),
    "designs/street-wave/design.svg": png,
    "brushes/ink/tip.png": png,
  });
  assert.equal(status, 1);
  assert.match(output, /design\.svg: the name says \.svg but the bytes are png/);
  assert.match(output, /tip\.png: 600x600 is larger than 512x512/);
});

test("a file above the size limit names its limit", () => {
  const { status, output } = run({
    "designs/street-wave/meta.json": JSON.stringify({ slug: "street-wave", name: "Street Wave" }),
    "designs/street-wave/design.svg": "x".repeat(2_000_001),
  });
  assert.equal(status, 1);
  assert.match(output, /design\.svg: design is limited to 2000 KB/);
});
