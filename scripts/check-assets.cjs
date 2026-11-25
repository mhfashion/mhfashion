#!/usr/bin/env node
// Usage: node scripts/check-assets.cjs <folder>
// Checks a copy of the public bucket before it is uploaded (Plan §12.2.11). The folder mirrors the
// bucket: <folder>/fonts/..., <folder>/designs/..., and so on. Every file is checked against the one
// key builder the Worker and the admin form use (`asset-keys.ts`), then the folder is read with the
// same catalogue builders the rebuild runs, so what passes here is what the asset service accepts.
// Exit 1 means something would be skipped or published wrongly; do not upload until it is fixed.
const { readdirSync, readFileSync, statSync } = require("node:fs");
const path = require("node:path");
const { loadModule } = require("../tests/helpers/load-ts-module.cjs");

const storeLib = loadModule("apps/web/src/lib/asset-store.ts");
const keyLib = loadModule("apps/web/src/lib/asset-keys.ts");
const catalogue = loadModule("apps/web/src/lib/asset-catalogue.ts");

function walk(directory, root = directory) {
  const entries = [];
  for (const name of readdirSync(directory)) {
    if (name.startsWith(".")) continue;
    const full = path.join(directory, name);
    if (statSync(full).isDirectory()) entries.push(...walk(full, root));
    else entries.push({ key: path.relative(root, full).split(path.sep).join("/"), bytes: statSync(full).size });
  }
  return entries;
}

async function main() {
  const folder = process.argv[2];
  if (!folder) {
    console.error("usage: npm run assets:check <folder>");
    process.exit(2);
  }
  let entries;
  try {
    entries = walk(folder);
  } catch (error) {
    console.error(`cannot read ${folder}: ${error.message}`);
    process.exit(2);
  }
  if (!entries.length) {
    console.error(`${folder} holds no files`);
    process.exit(2);
  }

  const problems = [];
  const files = {};
  const seen = new Map();
  for (const entry of entries) {
    const shaped = keyLib.identifyAssetKey(entry.key);
    if (!shaped) {
      problems.push(`${entry.key}: no shape describes this key (see Plan §12.2.2)`);
      continue;
    }
    const checked = keyLib.checkAssetFile(entry.key, entry.bytes);
    if (!checked.ok) {
      problems.push(`${entry.key}: ${checked.reason}`);
      continue;
    }
    const duplicate = seen.get(entry.key.toLowerCase());
    if (duplicate) problems.push(`${entry.key}: twice (also ${duplicate})`);
    seen.set(entry.key.toLowerCase(), entry.key);
    files[entry.key] = readFileSync(path.join(folder, entry.key), "utf8");
  }

  const store = storeLib.createMemoryAssetStore(files);
  for (const kind of catalogue.ASSET_CATALOGUE_KINDS) {
    const built = await catalogue.buildAssetCatalogue(store, kind);
    for (const issue of built.issues) problems.push(`${issue.key}: ${issue.reason} (${kind})`);
    console.log(`${kind.padEnd(12)} ${built.items.length} ${built.items.length === 1 ? "item" : "items"}, ${built.issues.length} ${built.issues.length === 1 ? "issue" : "issues"}`);
  }

  if (problems.length) {
    console.log(`\n${problems.length} ${problems.length === 1 ? "problem" : "problems"}:`);
    for (const problem of problems) console.log(`  ${problem}`);
    process.exit(1);
  }
  console.log("\nEverything is ready to upload.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
