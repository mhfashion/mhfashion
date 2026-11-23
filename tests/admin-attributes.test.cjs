const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const loadedModules = new Map();

function loadModule(relativePath) {
  const sourcePath = path.join(__dirname, "..", relativePath);
  const cached = loadedModules.get(sourcePath);
  if (cached) return cached.exports;
  const compiled = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: sourcePath,
  }).outputText;
  const loaded = { exports: {} };
  loadedModules.set(sourcePath, loaded);
  const localRequire = (id) => (id.startsWith("@/") ? loadModule(`apps/web/src/${id.slice(2)}.ts`) : require(id));
  new Function("module", "exports", "require", compiled)(loaded, loaded.exports, localRequire);
  return loaded.exports;
}

const admin = loadModule("apps/web/src/lib/admin-demo-data.ts");
const chainLib = loadModule("apps/web/src/lib/admin-attributes.ts");

const NOW = Date.UTC(2026, 10, 21, 9, 0, 0);
const data = admin.createAdminDemoData(NOW);

test("the seeded chain is the §4.1 vocabulary with the four default attributes on", () => {
  const chain = chainLib.attributeChain(data);
  assert.deepEqual(chain.map((attribute) => attribute.label), [
    "Size", "Fabric Type", "Knit Structure", "Fit Type", "Color", "Sleeve", "GSM", "MH Cuttings", "Print Method",
  ]);
  assert.deepEqual(chain.filter((attribute) => attribute.enabled).map((attribute) => attribute.key), ["size", "material", "fit", "color"]);
  assert.deepEqual(chainLib.chainIssues(data), []);
  assert.deepEqual(chainLib.chainAsPostAttributes(data).map((attribute) => attribute.key), ["size", "material", "fit", "color"]);
});

test("renaming an attribute keeps the key and changes only the label", () => {
  const result = chainLib.applyChainPatch(data, "material", { label: "Fabric" });
  assert.deepEqual(result.issues, []);
  const renamed = result.data.attributeChain.find((attribute) => attribute.key === "material");
  assert.equal(renamed.label, "Fabric");
  assert.deepEqual(renamed.options, data.attributeChain.find((attribute) => attribute.key === "material").options);
  assert.equal(chainLib.chainLabel(result.data, "material"), "Fabric");
  assert.equal(data.attributeChain.find((attribute) => attribute.key === "material").label, "Fabric Type", "input is not mutated");
});

test("a duplicate or empty label is refused", () => {
  assert.match(chainLib.applyChainPatch(data, "material", { label: "Color" }).issues[0], /already the Color label/);
  assert.match(chainLib.applyChainPatch(data, "material", { label: "   " }).issues[0], /cannot be empty/);
});

test("an option that still prices rows cannot be removed", () => {
  const result = chainLib.applyChainPatch(data, "material", { options: ["Compact Combed Cotton", "Polyester"] });
  assert.equal(result.data, data, "nothing is written");
  assert.match(result.issues[0], /"Combed Cotton" still prices 3 rows in Peacock Line Tee/);

  const unused = chainLib.chainUsage(data, "material", "Polyester");
  assert.deepEqual(unused.pricedPosts, []);
  const removable = chainLib.applyChainPatch(data, "material", { options: ["Combed Cotton", "Compact Combed Cotton"] });
  assert.deepEqual(removable.issues, [], "an unused option can go");
  assert.deepEqual(removable.data.attributeChain.find((attribute) => attribute.key === "material").options, ["Combed Cotton", "Compact Combed Cotton"]);
});

test("an attribute that prices rows cannot be switched off", () => {
  const result = chainLib.applyChainPatch(data, "material", { enabled: false });
  assert.equal(result.data, data);
  assert.match(result.issues[0], /prices 5 rows across posts/);

  const spare = chainLib.applyChainPatch(data, "knit", { enabled: false });
  assert.deepEqual(spare.issues, [], "an attribute with no prices switches off cleanly");
});

test("adding an option and moving an attribute are chain edits", () => {
  const added = chainLib.applyChainPatch(data, "material", {
    options: [...data.attributeChain.find((attribute) => attribute.key === "material").options, "Linen Blend"],
  });
  assert.deepEqual(added.issues, []);
  assert.ok(added.data.attributeChain.find((attribute) => attribute.key === "material").options.includes("Linen Blend"));

  const moved = chainLib.moveAttribute(data, "color", -1);
  assert.deepEqual(moved.attributeChain.map((attribute) => attribute.key).slice(2, 5), ["knit", "color", "fit"]);
  assert.deepEqual(chainLib.moveAttribute(data, "size", -1), data, "the first attribute cannot move up");
  assert.deepEqual(chainLib.moveAttribute(data, "print", 1), data, "the last attribute cannot move down");
});

test("reset restores the built-in chain", () => {
  const edited = chainLib.applyChainPatch(data, "material", { label: "Fabric" }).data;
  const reset = chainLib.resetAttributeChain(edited);
  assert.deepEqual(reset.attributeChain.map((attribute) => attribute.label), admin.TSHIRT_POST_ATTRIBUTES.map((attribute) => attribute.label));
  assert.deepEqual(chainLib.attributeChain({ ...data, attributeChain: [] }).map((attribute) => attribute.label), admin.TSHIRT_POST_ATTRIBUTES.map((attribute) => attribute.label));
});

test("the chain drives new post drafts and the pricing grid labels", () => {
  const renamed = chainLib.applyChainPatch(data, "material", { label: "Fabric" }).data;
  const draft = admin.tshirtPostDraftFrom(undefined, chainLib.chainAsPostAttributes(renamed));
  assert.deepEqual(draft.attributes.map((attribute) => attribute.label), ["Size", "Fabric", "Fit Type", "Color"]);
  assert.deepEqual(draft.attributes.map((attribute) => attribute.enabled), [true, true, true, true]);
  // A stored post keeps its own options; only the label follows the chain.
  const pricing = loadModule("apps/web/src/lib/admin-pricing.ts");
  const labels = pricing.scopeAttributes(renamed, { kind: "post", id: "post-peacock-line" }).map((attribute) => attribute.label);
  assert.ok(labels.includes("Fabric"), labels.join(","));
  let reordered = data;
  for (let step = 0; step < 8; step += 1) reordered = chainLib.moveAttribute(reordered, "print", -1);
  const order = pricing.scopeAttributes(reordered, { kind: "post", id: "post-peacock-line" }).map((attribute) => attribute.key);
  assert.deepEqual(order, ["print", "size", "material", "fit", "color"], "column order follows the chain");
});

test("Attribute Management is registered, routed and linked from Pricing", () => {
  assert.ok(admin.ADMIN_MODULES.some((module) => module.id === "attributes" && module.label === "Attributes"));
  const shell = readFileSync(path.join(__dirname, "..", "apps/web/src/components/admin/AdminShell.tsx"), "utf8");
  assert.match(shell, /id: "attributes", label: "Attributes", href: "\/admin\/attributes"/);
  assert.ok(existsSync(path.join(__dirname, "..", "apps/web/src/app/admin/attributes/page.tsx")));
  const pricing = readFileSync(path.join(__dirname, "..", "apps/web/src/components/admin/AdminPricing.tsx"), "utf8");
  assert.match(pricing, /href="\/admin\/attributes"/);
  assert.match(pricing, /Open Attribute Management/);
});

test("the Attributes screen edits the cascade as data and states the editor boundary", () => {
  const source = readFileSync(path.join(__dirname, "..", "apps/web/src/components/admin/AdminAttributes.tsx"), "utf8");
  for (const marker of [
    "data-attribute-label",
    "data-attribute-options",
    'aria-label="Attribute label"',
    'aria-label="New option"',
    "Reset to built-in",
    "Cascade rules",
    "data-cascade-pair",
    'aria-label="Reset cascade rules"',
    "Existing posts keep the options they were published with.",
    "keeps the built-in list (owner directive 1)",
  ]) {
    assert.ok(source.includes(marker), `AdminAttributes is missing ${marker}`);
  }
  assert.match(source, /Change those prices first/);
  // The rules come from the store, so the screen holds no hardcoded cascade words.
  assert.doesNotMatch(source, /"Sublimation"|"Polyester"/);
  assert.match(source, /cascadeOptions\(rules/);
  assert.match(source, /setCascadeAllowed\(store/);
});
