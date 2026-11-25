#!/usr/bin/env node
/**
 * Publish the built-in handbook into the guide tables.
 *
 * The site reads `guide_categories` / `guide_posts` as soon as those tables
 * exist, and nothing in the app writes them, so a deployed site shows an empty
 * Guide page until this runs once. Rows carry the starter ids, so re-running
 * updates the same posts instead of duplicating them.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-guide.cjs
 *   node scripts/seed-guide.cjs --dry-run
 */
const path = require("node:path");
const { readFileSync } = require("node:fs");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const lib = path.join(root, "apps/web/src/lib");

function loadTypeScript(file, overrides = {}) {
  const source = readFileSync(file, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: file,
  }).outputText;
  const module = { exports: {} };
  const localRequire = (name) => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name.startsWith(".")) return loadTypeScript(path.resolve(path.dirname(file), `${name}.ts`), overrides);
    return require(name);
  };
  new Function("require", "module", "exports", compiled)(localRequire, module, module.exports);
  return module.exports;
}

const { guideSeedRows } = loadTypeScript(path.join(lib, "guide-seed.ts"));
const { categories, posts } = guideSeedRows();
const dryRun = process.argv.includes("--dry-run");

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

console.log(`Prepared ${categories.length} categories and ${posts.length} posts.`);

if (dryRun || !url || !key) {
  if (!dryRun) console.log("No SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY set, so nothing was written. Pass --dry-run to silence this.");
  console.log(posts.map((post) => `  ${post.category_id}  ${post.slug}`).join("\n"));
  process.exit(0);
}

const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const categoryWrite = await supabase.from("guide_categories").upsert(categories, { onConflict: "id" });
  if (categoryWrite.error) throw new Error(`guide_categories: ${categoryWrite.error.message}`);

  const postWrite = await supabase.from("guide_posts").upsert(posts, { onConflict: "id" });
  if (postWrite.error) throw new Error(`guide_posts: ${postWrite.error.message}`);

  console.log(`Published ${categories.length} categories and ${posts.length} posts.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
