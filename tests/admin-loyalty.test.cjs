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
const loyalty = loadModule("apps/web/src/lib/admin-loyalty.ts");

const NOW = Date.UTC(2026, 10, 21, 9, 0, 0);
const data = admin.createAdminDemoData(NOW);

test("the seeded rules are the §9 economy", () => {
  const program = loyalty.loyaltyProgram(data);
  assert.deepEqual(program.rules, { dailyGrant: 300, dailyExpiryHours: 24, imageCost: 100, purchasePointsPerUnit: 50 });
  assert.equal(loyalty.imagesAffordable(program.rules, { daily: 300, purchased: 0 }), 3, "300 / 100 = 3 free images a day");
  assert.deepEqual(loyalty.validateLoyalty(program), []);
  assert.deepEqual(program.tiers.map((tier) => tier.name), ["Member", "Silver", "Gold"]);
  assert.equal(program.tiers[0].minSpendKs, 0, "a new shopper always has a tier");
});

test("lifetime spend picks the highest tier it reaches", () => {
  const tiers = loyalty.loyaltyProgram(data).tiers;
  assert.equal(loyalty.tierFor(tiers, 0).name, "Member");
  assert.equal(loyalty.tierFor(tiers, 99_999).name, "Member");
  assert.equal(loyalty.tierFor(tiers, 100_000).name, "Silver", "the boundary is inclusive");
  assert.equal(loyalty.tierFor(tiers, 250_000).name, "Gold");
  assert.equal(loyalty.tierFor([], 1000), null);
  assert.deepEqual(loyalty.nextTier(tiers, 120_000), { tier: tiers.find((tier) => tier.name === "Gold"), remainingKs: 80_000 });
  assert.equal(loyalty.nextTier(tiers, 900_000), null, "the top tier has nothing above it");
  // Order does not matter: an admin may leave the rows shuffled.
  assert.equal(loyalty.tierFor([...tiers].reverse(), 150_000).name, "Silver");
});

test("daily points are spent before the purchase points", () => {
  const balance = { daily: 300, purchased: 50 };
  assert.deepEqual(loyalty.spendPoints(balance, 100).balance, { daily: 200, purchased: 50 }, "a 100-point image comes from the daily grant");
  assert.deepEqual(loyalty.spendPoints(balance, 320).balance, { daily: 0, purchased: 30 }, "past the daily grant it eats into the kept points");
  assert.deepEqual(loyalty.spendPoints(balance, 400), { balance: { daily: 0, purchased: 0 }, shortfall: 50 }, "the shortfall is reported, not hidden");
  assert.deepEqual(loyalty.expireDailyPoints(balance), { daily: 0, purchased: 50 }, "unused daily points expire, kept points do not");
});

test("purchase points follow the rule and ignore nonsense counts", () => {
  const { rules } = loyalty.loyaltyProgram(data);
  assert.equal(loyalty.pointsForPurchase(rules, 3), 150);
  assert.equal(loyalty.pointsForPurchase(rules, 0), 0);
  assert.equal(loyalty.pointsForPurchase(rules, -2), 0);
});

test("milestones compare the trigger they declare", () => {
  const program = loyalty.loyaltyProgram(data);
  const three = program.milestones.find((milestone) => milestone.id === "milestone-three-pieces");
  assert.deepEqual(loyalty.milestoneProgress(three, { orders: 1, units: 2, spendKs: 0 }), { met: false, progress: 2 / 3 });
  assert.deepEqual(loyalty.milestoneProgress(three, { orders: 1, units: 3, spendKs: 0 }), { met: true, progress: 1 });
  const spend = program.milestones.find((milestone) => milestone.id === "milestone-100k");
  assert.equal(loyalty.milestoneProgress(spend, { orders: 9, units: 9, spendKs: 120_000 }).met, true);
  assert.equal(loyalty.milestoneProgress(spend, { orders: 9, units: 9, spendKs: 99_999 }).met, false);
  assert.deepEqual(loyalty.milestonesMet(program.milestones, { orders: 1, units: 1, spendKs: 0 }).map((milestone) => milestone.id), ["milestone-first-order"]);
  const disabled = program.milestones.map((milestone) => (milestone.id === "milestone-first-order" ? { ...milestone, enabled: false } : milestone));
  assert.deepEqual(loyalty.milestonesMet(disabled, { orders: 1, units: 1, spendKs: 0 }), []);
});

test("validation catches the rules an admin can break", () => {
  const program = loyalty.loyaltyProgram(data);
  const broken = {
    ...program,
    rules: { ...program.rules, imageCost: 0, dailyExpiryHours: 0 },
    tiers: [
      { id: "a", name: "Member", minSpendKs: 5_000, discountPercent: 0 },
      { id: "b", name: "member", minSpendKs: 9_000, discountPercent: 140 },
    ],
    milestones: [
      { id: "m1", label: "", trigger: "orders", threshold: 0, benefit: "points", value: 0, enabled: true },
      { id: "m2", label: "Twice", trigger: "orders", threshold: 1, benefit: "discount", value: 150, enabled: true },
      { id: "m3", label: "Again", trigger: "orders", threshold: 1, benefit: "points", value: 10, enabled: true },
    ],
  };
  const issues = loyalty.validateLoyalty(broken).join("\n");
  assert.match(issues, /AI image must cost at least one point/);
  assert.match(issues, /at least one hour/);
  assert.match(issues, /Two tiers are called "member"/);
  assert.match(issues, /cheapest tier must start at Ks 0/);
  assert.match(issues, /discount must be between 0 and 100/);
  assert.match(issues, /needs a label/);
  assert.match(issues, /threshold must be at least 1/);
  assert.match(issues, /benefit must be at least 1/);
  assert.match(issues, /a discount cannot exceed 100%/);
  assert.match(issues, /same orders threshold \(1\)/);
});

test("saving refuses a broken program and keeps the input untouched", () => {
  const result = loyalty.applyRules(data, { ...loyalty.loyaltyProgram(data).rules, imageCost: 0 });
  assert.equal(result.data, data);
  assert.match(result.issues[0], /AI image/);

  const saved = loyalty.applyRules(data, { ...loyalty.loyaltyProgram(data).rules, dailyGrant: 400 });
  assert.deepEqual(saved.issues, []);
  assert.equal(saved.data.loyalty.rules.dailyGrant, 400);
  assert.equal(data.loyalty.rules.dailyGrant, 300);
});

test("a tier holding demo customers cannot be deleted", () => {
  const usage = loyalty.tierUsage(data);
  const member = usage.get("tier-member");
  assert.ok(member.count > 0);
  assert.equal([...usage.values()].reduce((total, entry) => total + entry.count, 0), admin.aggregateCustomers(data.orders).length);

  const blocked = loyalty.removeTier(data, "tier-member");
  assert.equal(blocked.data, data);
  assert.match(blocked.issues[0], new RegExp(`${member.count} customers sit in this tier`));

  const empty = loyalty.saveTier(data, { id: "tier-platinum", name: "Platinum", minSpendKs: 9_000_000, discountPercent: 10 });
  assert.deepEqual(empty.issues, []);
  assert.equal(loyalty.removeTier(empty.data, "tier-platinum").data.loyalty.tiers.length, 3, "an unused tier deletes");
});

test("milestones save, validate and delete", () => {
  const program = loyalty.loyaltyProgram(data);
  const duplicate = loyalty.saveMilestone(data, { ...program.milestones[0], id: "milestone-copy", label: "Copy" });
  assert.match(duplicate.issues[0], /same orders threshold/);

  const added = loyalty.saveMilestone(data, { id: "milestone-five", label: "Five pieces", trigger: "quantity", threshold: 5, benefit: "points", value: 200, enabled: true });
  assert.deepEqual(added.issues, []);
  assert.equal(added.data.loyalty.milestones.length, program.milestones.length + 1);
  assert.equal(loyalty.removeMilestone(added.data, "milestone-five").loyalty.milestones.length, program.milestones.length);
  assert.deepEqual(loyalty.resetLoyalty(added.data).loyalty, admin.createSeedLoyalty());
});

test("Loyalty is registered, routed and states the §9 rules", () => {
  assert.ok(admin.ADMIN_MODULES.some((module) => module.id === "loyalty" && module.label === "Loyalty"));
  const shell = readFileSync(path.join(__dirname, "..", "apps/web/src/components/admin/AdminShell.tsx"), "utf8");
  assert.match(shell, /id: "loyalty", label: "Loyalty", href: "\/admin\/loyalty"/);
  assert.ok(existsSync(path.join(__dirname, "..", "apps/web/src/app/admin/loyalty/page.tsx")));
  const source = readFileSync(path.join(__dirname, "..", "apps/web/src/components/admin/AdminLoyalty.tsx"), "utf8");
  for (const marker of [
    "data-tier-name",
    "data-milestone",
    "data-loyalty-preview",
    "data-loyalty-message",
    'aria-label="Daily grant"',
    'aria-label="Daily expiry hours"',
    'aria-label="Image cost"',
    'aria-label="Purchase points per unit"',
    'aria-label="Tier name"',
    'aria-label="Tier minimum spend"',
    'aria-label="Tier discount"',
    'aria-label="Milestone trigger"',
    'aria-label="Milestone threshold"',
    'aria-label="Milestone benefit"',
    "Daily points are spent first",
    "Reset to §9 defaults",
  ]) {
    assert.ok(source.includes(marker), `AdminLoyalty is missing ${marker}`);
  }
});
