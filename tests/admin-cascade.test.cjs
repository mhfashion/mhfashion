const assert = require("node:assert/strict");
const test = require("node:test");
const { loadModule } = require("./helpers/load-ts-module.cjs");

const rulesLib = loadModule("apps/web/src/lib/attribute-rules.ts");
const demoData = loadModule("apps/web/src/lib/admin-demo-data.ts");
const attributes = loadModule("apps/web/src/lib/admin-attributes.ts");
const combos = loadModule("apps/web/src/lib/pricing-combinations.ts");

const NOW = Date.UTC(2026, 10, 22);
const fresh = () => demoData.createAdminDemoData(NOW);

test("the shipped rules are the documented 4.1 cascade", () => {
  const rules = rulesLib.DEFAULT_CASCADE_RULES;
  assert.deepEqual(rulesLib.cascadeOptions(rules, "material", { print: "Sublimation" }, ["Combed Cotton", "Compact Combed Cotton", "Polyester"]), ["Polyester"]);
  assert.deepEqual(rulesLib.cascadeOptions(rules, "material", { print: "DTF" }, ["Combed Cotton", "Compact Combed Cotton", "Polyester"]), ["Combed Cotton", "Compact Combed Cotton", "Polyester"]);
  assert.deepEqual(rulesLib.cascadeOptions(rules, "knit", { material: "Polyester" }, ["Single Jersey", "Interlock", "Air Layer"]), ["Interlock", "Air Layer"]);
  assert.deepEqual(rulesLib.cascadeOptions(rules, "knit", { material: "Combed Cotton" }, ["Single Jersey", "Interlock", "Air Layer"]), ["Single Jersey", "Interlock"]);
  // Nothing chosen yet: every value is still offered.
  assert.deepEqual(rulesLib.cascadeOptions(rules, "knit", {}, ["Single Jersey", "Interlock", "Air Layer"]), ["Single Jersey", "Interlock", "Air Layer"]);
});

test("a combination exists only when no rule excludes it", () => {
  assert.equal(combos.isValidCombination({ print: "Sublimation", material: "Polyester", knit: "Interlock" }), true);
  assert.equal(combos.isValidCombination({ print: "Sublimation", material: "Combed Cotton" }), false);
  assert.equal(combos.isValidCombination({ material: "Polyester", knit: "Single Jersey" }), false);
  assert.equal(combos.isValidCombination({ material: "Combed Cotton", knit: "Single Jersey" }), true);
  // A key no rule mentions is never excluded.
  assert.equal(combos.isValidCombination({ color: "White", size: "XL" }), true);
});

test("the grid enumerates through the rules it is handed", () => {
  const chain = [
    { key: "print", label: "Print Method", options: ["DTF", "Sublimation"] },
    { key: "material", label: "Fabric Type", options: ["Combed Cotton", "Polyester"] },
    { key: "knit", label: "Knit Structure", options: ["Single Jersey", "Interlock"] },
  ];
  const shipped = combos.combinationsFor(chain);
  // 2 print x 2 fabric x 2 knit = 8, minus Sublimation/Combed Cotton (2 knits) and Polyester/Single Jersey (2 prints).
  assert.equal(shipped.length, 4);
  const opened = combos.combinationsFor(chain, rulesLib.removeCascadeRule(rulesLib.DEFAULT_CASCADE_RULES, "material", "print", "Sublimation"));
  assert.equal(opened.length, 6);
});

test("an admin rule change is refused when it would orphan a priced row", () => {
  const data = fresh();
  const post = data.tshirtPosts[0];
  const priced = { ...post, prices: [...post.prices, { key: "print=DTF|material=Combed Cotton|knit=Single Jersey", options: { print: "DTF", material: "Combed Cotton", knit: "Single Jersey" }, priceKs: 18000 }] };
  const withRow = { ...data, tshirtPosts: [priced, ...data.tshirtPosts.slice(1)] };
  const refused = attributes.setCascadeAllowed(withRow, "knit", "material", "Combed Cotton", ["Interlock"]);
  assert.equal(refused.data, withRow, "the store is returned untouched");
  assert.match(refused.issues[0], new RegExp(`${post.title} still prices 1 row`));

  // The same change is allowed once the row is gone.
  const allowed = attributes.setCascadeAllowed(data, "knit", "material", "Combed Cotton", ["Interlock"]);
  assert.deepEqual(allowed.issues, []);
  assert.deepEqual(rulesLib.cascadeOptions(allowed.data.attributeCascade, "knit", { material: "Combed Cotton" }, ["Single Jersey", "Interlock"]), ["Interlock"]);
});

test("a rule cannot hide everything, name an unknown value, or narrow an earlier attribute", () => {
  const data = fresh();
  assert.match(attributes.setCascadeAllowed(data, "knit", "material", "Polyester", []).issues[0], /would offer nothing/);
  assert.match(attributes.setCascadeAllowed(data, "knit", "material", "Wool", ["Interlock"]).issues[0], /no longer offers Wool/);
  assert.match(attributes.setCascadeAllowed(data, "nope", "material", "Polyester", ["Interlock"]).issues[0], /chain does not hold/);
  // An option the target does not offer is dropped rather than stored.
  const cleaned = attributes.setCascadeAllowed(data, "knit", "material", "Polyester", ["Interlock", "Cashmere"]);
  assert.deepEqual(cleaned.issues, []);
  assert.deepEqual(cleaned.data.attributeCascade.find((rule) => rule.target === "knit" && rule.value === "Polyester").allowed, ["Interlock"]);
});

test("turning every value back on removes the rule instead of storing a useless one", () => {
  const data = fresh();
  const off = attributes.setCascadeAllowed(data, "knit", "material", "Polyester", ["Interlock"]);
  assert.deepEqual(off.issues, []);
  assert.deepEqual(rulesLib.cascadeOptions(off.data.attributeCascade, "knit", { material: "Polyester" }, ["Single Jersey", "Interlock", "Air Layer"]), ["Interlock"]);

  const backOn = attributes.setCascadeAllowed(off.data, "knit", "material", "Polyester", ["Interlock", "Air Layer", "Single Jersey"]);
  assert.deepEqual(backOn.issues, []);
  assert.equal(backOn.data.attributeCascade.some((rule) => rule.target === "knit" && rule.value === "Polyester"), false);
  assert.deepEqual(rulesLib.cascadeOptions(backOn.data.attributeCascade, "knit", { material: "Polyester" }, ["Single Jersey", "Interlock", "Air Layer"]), ["Single Jersey", "Interlock", "Air Layer"]);
});

test("reset puts the shipped rules back", () => {
  const data = fresh();
  const changed = attributes.setCascadeAllowed(data, "material", "print", "Sublimation", ["Polyester", "Combed Cotton"]).data;
  assert.equal(attributes.cascadeRules(changed).length, 4);
  const reset = attributes.resetCascadeRules(changed);
  assert.deepEqual(reset.attributeCascade, rulesLib.DEFAULT_CASCADE_RULES);
});

test("rule validation catches every way a rule can be wrong", () => {
  const chain = [
    { key: "print", label: "Print Method", options: ["DTF", "Sublimation"] },
    { key: "material", label: "Fabric Type", options: ["Combed Cotton", "Polyester"] },
  ];
  assert.deepEqual(rulesLib.cascadeRuleIssues(rulesLib.DEFAULT_CASCADE_RULES.filter((rule) => rule.target === "material"), chain), []);
  const messages = (rules) => rulesLib.cascadeRuleIssues(rules, chain).map((issue) => issue.message).join(" | ");
  assert.match(messages([{ target: "nope", source: "print", value: "DTF", allowed: ["Polyester"] }]), /chain does not hold/);
  assert.match(messages([{ target: "material", source: "print", value: "Screen", allowed: ["Polyester"] }]), /no longer offers Screen/);
  assert.match(messages([{ target: "material", source: "print", value: "DTF", allowed: [] }]), /leaves nothing offered/);
  assert.match(messages([{ target: "material", source: "print", value: "DTF", allowed: ["Wool"] }]), /does not offer Wool/);
  assert.match(messages([
    { target: "material", source: "print", value: "DTF", allowed: ["Polyester"] },
    { target: "material", source: "print", value: "DTF", allowed: ["Combed Cotton"] },
  ]), /already narrows the same value/);
});

test("a saved draft keeps its rules, gains the defaults when it has none, and drops junk", () => {
  const data = fresh();
  const changed = attributes.setCascadeAllowed(data, "knit", "material", "Combed Cotton", ["Interlock"]).data;
  assert.deepEqual(rulesLib.normalizeCascadeRules(JSON.parse(JSON.stringify(changed.attributeCascade))), changed.attributeCascade);
  assert.deepEqual(rulesLib.normalizeCascadeRules(undefined), rulesLib.DEFAULT_CASCADE_RULES);
  // An empty list is a choice, not a missing field: it means "no rule narrows anything".
  assert.deepEqual(rulesLib.normalizeCascadeRules([]), []);

  assert.deepEqual(rulesLib.normalizeCascadeRules([
    null,
    { target: "knit", source: "material", value: "Polyester" },
    { target: "knit", source: "material", value: "Polyester", allowed: [] },
    { target: "knit", source: "material", value: "Polyester", allowed: [7, "Interlock"] },
  ]), [{ target: "knit", source: "material", value: "Polyester", allowed: ["Interlock"] }]);
});

test("the demo store ships the rules, so the admin screen has something to edit", () => {
  const data = fresh();
  assert.deepEqual(data.attributeCascade, rulesLib.DEFAULT_CASCADE_RULES);
  assert.deepEqual(attributes.cascadeRules(data), rulesLib.DEFAULT_CASCADE_RULES);
  // A store saved before the rules existed still reads as the documented cascade...
  const legacy = { ...data };
  delete legacy.attributeCascade;
  assert.deepEqual(attributes.cascadeRules(legacy), rulesLib.DEFAULT_CASCADE_RULES);
  // ...while an admin who removed every rule keeps that choice.
  assert.deepEqual(attributes.cascadeRules({ ...data, attributeCascade: [] }), []);
});
