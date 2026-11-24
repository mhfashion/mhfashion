#!/usr/bin/env node
// Usage: node scripts/check-font-manifest.cjs [fonts-folder]
// Checks a copy of the bucket's fonts folder before it is uploaded. Plan §12.1 part 13: the folder is
// read with the same builder the Worker runs, so what passes here is what the asset service accepts.
// Exit 1 means a font would be silently dropped, so do not upload until the reasons are fixed.
const { readdirSync, readFileSync, statSync } = require("node:fs");
const path = require("node:path");
const { loadModule } = require("../tests/helpers/load-ts-module.cjs");

const storeLib = loadModule("apps/web/src/lib/asset-store.ts");
const catalogue = loadModule("apps/web/src/lib/asset-catalogue.ts");
const fonts = loadModule("apps/web/src/lib/editor-fonts.ts");
const audit = loadModule("apps/web/src/lib/editor-font-audit.ts");

function walk(directory, root = directory) {
  const entries = [];
  for (const name of readdirSync(directory)) {
    const full = path.join(directory, name);
    const stat = statSync(full);
    if (stat.isDirectory()) entries.push(...walk(full, root));
    else entries.push({ path: path.relative(root, full).split(path.sep).join("/"), bytes: stat.size });
  }
  return entries;
}

function reportLegacy(result) {
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
  if (result.missingOutlines.length) {
    console.log(`\nMissing outline files (${result.missingOutlines.length}) — these fonts cannot be bent:`);
    for (const file of result.missingOutlines) console.log(`  ${file}`);
  }
  console.log(`\nBend (E19): ${result.bendable.length ? result.bendable.join(", ") : "no font has an outline file yet"}`);
}

async function main() {
  const folder = path.resolve(process.argv[2] ?? "fonts");
  let files;
  try {
    files = walk(folder);
  } catch {
    console.error(`No folder at ${folder}. Pass the folder that holds the font files.`);
    process.exit(1);
  }
  if (!files.length) {
    console.error(`${folder} has no files.`);
    process.exit(1);
  }

  const metas = files.filter((file) => file.path.endsWith("/meta.json"));
  const legacy = files.find((file) => file.path.endsWith("manifest.json"));

  if (!metas.length) {
    // The layout the editor reads today: one manifest.json beside the files. Keep the old audit, and
    // say plainly that the asset service wants one meta.json per font folder.
    if (!legacy) {
      console.error(`${folder} has neither a font folder with meta.json nor a manifest.json.`);
      process.exit(1);
    }
    let raw;
    try {
      raw = JSON.parse(readFileSync(path.join(folder, legacy.path), "utf8"));
    } catch (error) {
      console.error(`manifest.json is not valid JSON: ${error.message}`);
      process.exit(1);
    }
    const result = audit.auditFontLibrary(raw, files);
    reportLegacy(result);
    console.log(
      "\nThis folder uses the legacy single manifest.json. The asset service wants one meta.json per font folder; until then it reports each folder as missing a meta.json.",
    );
    process.exit(audit.fontAuditIsClean(result) ? 0 : 1);
  }

  // The builder path: seed a memory bucket with the folder and build the catalogue the Worker writes.
  const entries = {};
  for (const file of files) {
    const key = `fonts/${file.path}`;
    entries[key] = file.path.endsWith("meta.json") ? readFileSync(path.join(folder, file.path), "utf8") : "";
  }
  const store = storeLib.createMemoryAssetStore(entries);
  const built = await catalogue.buildFontCatalogue(store);
  const large = files
    .filter((file) => !file.path.endsWith("meta.json") && file.bytes > audit.FONT_FILE_WARN_BYTES)
    .map((file) => ({ file: `fonts/${file.path}`, bytes: file.bytes }));

  const total = built.items.length;
  console.log(`Picker order (${total} ${total === 1 ? "font" : "fonts"}):`);
  for (const shelf of fonts.EDITOR_FONT_SHELVES) {
    const names = built.items.filter((font) => font.shelf === shelf).map((font) => font.name);
    if (names.length) console.log(`  ${fonts.EDITOR_FONT_SHELF_LABELS[shelf].padEnd(8)} ${names.join(", ")}`);
  }
  if (!total) console.log("  (empty — the editor would show the eight system fonts)");

  if (built.issues.length) {
    console.log(`\nSkipped (${built.issues.length}) — these will not appear in the picker:`);
    for (const issue of built.issues) console.log(`  ${issue.key} — ${issue.reason}`);
  }
  if (large.length) {
    console.log(`\nLarge files (${large.length}) — over ${Math.round(audit.FONT_FILE_WARN_BYTES / 1024)} KB:`);
    for (const file of large) console.log(`  ${file.file} — ${Math.round(file.bytes / 1024)} KB`);
  }
  console.log(built.issues.length ? "\nFix the entries above before uploading." : "\nReady to upload.");
  process.exit(built.issues.length ? 1 : 0);
}

main();
