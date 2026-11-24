const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const entries = (dir) => (fs.existsSync(path.join(root, dir)) ? fs.readdirSync(path.join(root, dir)).sort() : null);

test("Plan holds exactly one file, PLAN.md", () => {
  assert.deepEqual(entries("Plan"), ["PLAN.md"]);
});

test("SQL holds only numbered .sql files, each number used once and in rising order", () => {
  const files = entries("SQL");
  assert.ok(files && files.length > 0, "SQL folder must exist and hold migrations");
  const numbers = [];
  for (const file of files) {
    assert.match(file, /^\d{4}_[a-z0-9_]+\.sql$/, `${file} is not NNNN_name.sql`);
    numbers.push(Number(file.slice(0, 4)));
  }
  for (let index = 1; index < numbers.length; index += 1) {
    assert.ok(numbers[index] > numbers[index - 1], "SQL numbers must rise without repeats");
  }
});

test("Worker, once it exists, holds exactly one TypeScript file", () => {
  const files = entries("Worker");
  if (files === null) return;
  assert.equal(files.length, 1, "Worker holds exactly one file");
  assert.match(files[0], /^[a-z0-9-]+\.ts$/);
});

test("Doc holds only Markdown and every file is listed in Doc/README.md", () => {
  const files = entries("Doc");
  assert.ok(files.includes("README.md"), "Doc/README.md is the index");
  const readme = fs.readFileSync(path.join(root, "Doc/README.md"), "utf8");
  for (const file of files) {
    assert.match(file, /\.md$/, `${file} is not a Markdown document`);
    if (file !== "README.md") assert.ok(readme.includes("`" + file + "`"), `${file} is missing from Doc/README.md`);
  }
});

test("the repository root holds only the allowed entries", () => {
  const allowed = new Set([
    ".git", ".github", ".gitignore", ".next", "AGENTS.md", "Doc", "Plan", "README.md", "SQL", "Worker", "apps",
    "node_modules", "package-lock.json", "package.json", "scripts", "tests", "wrangler.assets.jsonc",
  ]);
  for (const entry of fs.readdirSync(root)) {
    assert.ok(allowed.has(entry), `${entry} does not belong at the repository root`);
  }
});

test("no plan, TODO or notes file is left outside Plan/PLAN.md", () => {
  const stray = fs.readdirSync(root).filter((name) => /^(PLAN|TODO|NOTES)/i.test(name) && name !== "Plan");
  assert.deepEqual(stray, []);
});
