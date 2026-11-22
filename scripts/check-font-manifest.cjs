#!/usr/bin/env node
// Usage: node scripts/check-font-manifest.cjs [fonts-folder]
// Checks a copy of the bucket's fonts folder before it is uploaded. Exit 1 means the picker would
// silently drop something, so do not upload until the reasons are fixed.
const { readdirSync, readFileSync, statSync } = require("node:fs");
const path = require("node:path");
const { loadModule } = require("../tests/helpers/load-ts-module.cjs");

const audit = loadModule("apps/web/src/lib/editor-font-audit.ts");

function walk(directory, root = directory) {
  const entries = [];
  for (const name of readdirSync(directory)) {
    const full = path.join(directory, name);
    const stat = statSync(full);
    if (stat.isDirectory()) entries.push(...walk(full, root));
    else entries.push({ path: path.relative(root, full), bytes: stat.size });
  }
  return entries;
}

function main() {
  const folder = path.resolve(process.argv[2] ?? "fonts");
  let files;
  try {
    files = walk(folder);
  } catch {
    console.error(`No folder at ${folder}. Pass the folder that holds manifest.json and the font files.`);
    process.exit(1);
  }
  const manifestPath = files.find((file) => file.path.replace(/\\/g, "/").endsWith("manifest.json"));
  if (!manifestPath) {
    console.error(`${folder} has no manifest.json.`);
    process.exit(1);
  }
  let raw;
  try {
    raw = JSON.parse(readFileSync(path.join(folder, manifestPath.path), "utf8"));
  } catch (error) {
    console.error(`manifest.json is not valid JSON: ${error.message}`);
    process.exit(1);
  }

  const result = audit.auditFontLibrary(raw, files);
  const total = result.picker.reduce((count, group) => count + group.names.length, 0);
  console.log(`Picker order (${total} ${total === 1 ? "font" : "fonts"}):`);
  for (const group of result.picker) console.log(`  ${group.label.padEnd(8)} ${group.names.join(", ")}`);
  if (!result.picker.length) console.log("  (empty — the editor would show the eight system fonts)");

  if (result.skipped.length) {
    console.log(`\nSkipped (${result.skipped.length}) — these will not appear in the picker:`);
    for (const skip of result.skipped) console.log(`  ${skip.slug || "(unnamed)"} — ${skip.reason}`);
  }
  if (result.missing.length) {
    console.log(`\nMissing files (${result.missing.length}) — the picker would offer a font that 404s:`);
    for (const file of result.missing) console.log(`  ${file}`);
  }
  if (result.large.length) {
    console.log(`\nLarge files (${result.large.length}) — over ${Math.round(audit.FONT_FILE_WARN_BYTES / 1024)} KB:`);
    for (const file of result.large) console.log(`  ${file.file} — ${Math.round(file.bytes / 1024)} KB`);
  }
  console.log(audit.fontAuditIsClean(result) ? "\nReady to upload." : "\nFix the entries above before uploading.");
  process.exit(audit.fontAuditIsClean(result) ? 0 : 1);
}

main();
