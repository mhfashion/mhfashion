const assert = require("node:assert/strict");
const test = require("node:test");
const { execFileSync } = require("node:child_process");
const { mkdirSync, mkdtempSync, rmSync, writeFileSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const SCRIPT = path.join(ROOT, "scripts", "check-font-manifest.cjs");

function run(folder) {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT, folder], { encoding: "utf8", stdio: "pipe" });
    return { code: 0, stdout, stderr: "" };
  } catch (error) {
    return { code: error.status ?? 1, stdout: error.stdout ?? "", stderr: error.stderr ?? "" };
  }
}

function fixture(build) {
  const folder = mkdtempSync(path.join(os.tmpdir(), "mh-fonts-"));
  build(folder);
  return folder;
}

function writeMeta(folder, slug, extra = {}) {
  const directory = path.join(folder, slug);
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    path.join(directory, "meta.json"),
    JSON.stringify({
      slug,
      name: slug.toUpperCase(),
      shelf: "burmese",
      files: [{ file: `fonts/${slug}/${slug}-400.woff2`, weight: 400, style: "normal" }],
      licence: { name: "OFL 1.1" },
      ...extra,
    }),
  );
  return directory;
}

test("a folder the builder accepts is ready to upload", () => {
  const folder = fixture((root) => {
    const directory = writeMeta(root, "padauk");
    writeFileSync(path.join(directory, "padauk-400.woff2"), "woff2");
  });
  try {
    const result = run(folder);
    assert.equal(result.code, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /Picker order \(1 font\)/);
    assert.match(result.stdout, /Burmese\s+PADAUK/);
    assert.match(result.stdout, /Ready to upload\./);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});

test("a font that names a file the folder does not hold fails the check", () => {
  const folder = fixture((root) => writeMeta(root, "padauk"));
  try {
    const result = run(folder);
    assert.equal(result.code, 1);
    assert.match(result.stdout, /is not in the bucket/);
    assert.match(result.stdout, /Fix the entries above before uploading\./);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});

test("a folder with no meta.json and no manifest.json is refused", () => {
  const folder = fixture((root) => writeFileSync(path.join(root, "loose.woff2"), "woff2"));
  try {
    const result = run(folder);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /neither a font folder with meta.json nor a manifest.json/);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});

test("the legacy manifest layout still passes and says the service wants meta.json", () => {
  const folder = fixture((root) => {
    mkdirSync(path.join(root, "padauk"), { recursive: true });
    writeFileSync(path.join(root, "padauk", "padauk-400.woff2"), "woff2");
    writeFileSync(
      path.join(root, "manifest.json"),
      JSON.stringify({
        fonts: [
          {
            slug: "padauk",
            name: "Padauk",
            shelf: "burmese",
            files: [{ file: "padauk/padauk-400.woff2", weight: 400 }],
            licence: { name: "OFL 1.1" },
          },
        ],
      }),
    );
  });
  try {
    const result = run(folder);
    assert.equal(result.code, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /Picker order \(1 font\)/);
    assert.match(result.stdout, /legacy single manifest\.json/);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});

test("a folder that does not exist is reported, not crashed on", () => {
  const result = run(path.join(os.tmpdir(), "mh-fonts-does-not-exist"));
  assert.equal(result.code, 1);
  assert.match(result.stderr, /No folder at/);
});
