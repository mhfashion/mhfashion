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

const NOW = Date.UTC(2026, 10, 21, 9, 0, 0);
const AT = new Date(NOW).toISOString();
const data = admin.createAdminDemoData(NOW);

test("a takedown hides the design and keeps the claim record", () => {
  const design = data.designs.find((entry) => entry.status === "Published");
  const next = admin.recordDesignTakedown(data, {
    designId: design.id,
    claimant: "Studio Aye / legal@studioaye.com",
    note: "Floral line art matches their 2025 print.",
    admin: "Admin Test",
    at: AT,
  });

  const hidden = next.designs.find((entry) => entry.id === design.id);
  assert.equal(hidden.status, "Hidden");
  assert.equal(next.designTakedowns.length, 1);
  const [record] = next.designTakedowns;
  assert.equal(record.designId, design.id);
  assert.equal(record.designName, design.name);
  assert.equal(record.claimant, "Studio Aye / legal@studioaye.com");
  assert.equal(record.note, "Floral line art matches their 2025 print.");
  assert.equal(record.admin, "Admin Test");
  assert.equal(record.at, AT);
  assert.deepEqual(admin.designTakedownsFor(next, design.id), [record]);
  assert.deepEqual(admin.designTakedownsFor(next, "design-does-not-exist"), []);
});

test("a takedown never touches an order that is already paid (owner answer 2026-11-21)", () => {
  const design = data.designs[0];
  const before = JSON.parse(JSON.stringify(data.orders));
  const next = admin.recordDesignTakedown(data, {
    designId: design.id, claimant: "Claimant", note: "", admin: "Admin Test", at: AT,
  });
  assert.deepEqual(next.orders, before, "orders must be left exactly as they were");
  assert.deepEqual(data.orders, before, "the input data is not mutated");
  assert.equal(data.designs.find((entry) => entry.id === design.id).status, design.status);
});

test("recording a claim twice keeps both records and leaves one hidden design", () => {
  const design = data.designs[1];
  const first = admin.recordDesignTakedown(data, { designId: design.id, claimant: "A", note: "", admin: "Admin", at: AT });
  const second = admin.recordDesignTakedown(first, {
    designId: design.id, claimant: "B", note: "Second claim", admin: "Admin", at: new Date(NOW + 60_000).toISOString(),
  });
  assert.equal(second.designTakedowns.length, 2);
  assert.deepEqual(second.designTakedowns.map((entry) => entry.claimant), ["B", "A"]);
  assert.equal(second.designs.filter((entry) => entry.id === design.id).length, 1);
  assert.equal(second.designs.find((entry) => entry.id === design.id).status, "Hidden");
});

test("an unknown design id changes nothing", () => {
  const next = admin.recordDesignTakedown(data, { designId: "nope", claimant: "A", note: "", admin: "Admin", at: AT });
  assert.equal(next, data);
});

test("the seed carries an empty takedown log and stored data is backfilled", () => {
  assert.deepEqual(data.designTakedowns, []);
  const source = readFileSync(path.join(__dirname, "..", "apps/web/src/lib/admin-demo-data.ts"), "utf8");
  assert.match(source, /designTakedowns: Array\.isArray\(parsed\.designTakedowns\) \? parsed\.designTakedowns : \[\]/);
});

test("there is no separate Designs module: the design ships with the product", () => {
  const root = path.join(__dirname, "..", "apps/web/src");
  assert.equal(existsSync(path.join(root, "components/admin/AdminDesigns.tsx")), false, "the Designs screen is deleted");
  assert.equal(existsSync(path.join(root, "app/admin/designs/page.tsx")), false, "the Designs route is deleted");
  const nav = readFileSync(path.join(root, "lib/admin-nav.ts"), "utf8");
  assert.equal(nav.includes('"designs"'), false, "the sidebar has no Designs entry");
  const editor = readFileSync(path.join(root, "components/admin/AdminProducts.tsx"), "utf8");
  for (const marker of ['aria-label="Design name"', 'aria-label="Artwork file URL"', "posted together with the product"]) {
    assert.ok(editor.includes(marker), `the product editor is missing ${marker}`);
  }
});

test("the plan records the owner's takedown answer", () => {
  const plan = readFileSync(path.join(__dirname, "..", "Plan/PLAN.md"), "utf8");
  assert.match(plan, /a takedown never stops an order that is already paid/);
  assert.equal(plan.includes("Proposed, awaiting owner confirmation:** an order already paid"), false);
});
