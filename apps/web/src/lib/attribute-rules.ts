// The Plan §4.1 cascade as data, so the Super Admin can change it from Attribute Management instead
// of a code change. A rule says: while `source` holds `value`, the `target` attribute offers only
// `allowed`. Rules apply between adjacent attributes in the chain, which is the cascade the shop has
// today (Print Method → Fabric Type → Knit Structure).
//
// The pricing grid enumerates combinations through these rules, so an admin change and the price book
// cannot disagree. The design editor keeps the built-in cascade from `editor-attributes.ts` (owner
// directive 1: the editor uses its own list), which is why the admin screen says so.

export type AttributeCascadeRule = {
  /** The attribute that is narrowed, by stored key (e.g. "material"). */
  target: string;
  /** The earlier attribute that narrows it (e.g. "print"). */
  source: string;
  /** The `source` value that narrows it (e.g. "Sublimation"). */
  value: string;
  /** The `target` values still offered while the rule matches. */
  allowed: string[];
};

/** The three rules the shop shipped with, one per source value so each is edited on its own. */
export const DEFAULT_CASCADE_RULES: AttributeCascadeRule[] = [
  { target: "material", source: "print", value: "Sublimation", allowed: ["Polyester"] },
  { target: "knit", source: "material", value: "Polyester", allowed: ["Interlock", "Air Layer"] },
  { target: "knit", source: "material", value: "Combed Cotton", allowed: ["Single Jersey", "Interlock"] },
  { target: "knit", source: "material", value: "Compact Combed Cotton", allowed: ["Single Jersey", "Interlock"] },
];

export type CascadeOptions = Record<string, string | undefined>;

/** Every rule that applies to `target` given the options already chosen. */
export function cascadeRulesFor(
  rules: readonly AttributeCascadeRule[],
  target: string,
  options: CascadeOptions,
): AttributeCascadeRule[] {
  return rules.filter((rule) => rule.target === target && options[rule.source] === rule.value);
}

/** True when no rule excludes the chosen value, or when nothing earlier has been chosen yet. */
export function cascadeAllows(
  rules: readonly AttributeCascadeRule[],
  target: string,
  options: CascadeOptions,
): boolean {
  const value = options[target];
  if (!value) return true;
  return cascadeRulesFor(rules, target, options).every((rule) => rule.allowed.includes(value));
}

/** The values of `target` still offered, in the order the caller lists them. */
export function cascadeOptions(
  rules: readonly AttributeCascadeRule[],
  target: string,
  options: CascadeOptions,
  available: readonly string[],
): string[] {
  const allowed = cascadeRulesFor(rules, target, options).map((rule) => rule.allowed);
  if (!allowed.length) return [...available];
  return available.filter((value) => allowed.every((list) => list.includes(value)));
}

export type CascadeRuleIssue = { rule: string; message: string };

/**
 * A rule must name attributes the chain holds, values both of them actually offer, and at least one
 * value for the target. An empty `allowed` list is refused: it would hide the target entirely, which
 * is the on/off switch's job, not a rule's. The chain's column order does not decide what narrows what —
 * the rules do, so a chain can be reordered without silently changing the cascade.
 */
export function cascadeRuleIssues(
  rules: readonly AttributeCascadeRule[],
  chain: readonly { key: string; label: string; options: string[] }[],
): CascadeRuleIssue[] {
  const issues: CascadeRuleIssue[] = [];
  const seen = new Set<string>();
  for (const rule of rules) {
    const label = `${rule.source} ${rule.value} → ${rule.target}`;
    const source = chain.find((attribute) => attribute.key === rule.source);
    const target = chain.find((attribute) => attribute.key === rule.target);
    if (!source || !target) {
      issues.push({ rule: label, message: "The rule names an attribute the chain does not hold." });
      continue;
    }
    if (!source.options.includes(rule.value)) {
      issues.push({ rule: label, message: `${source.label} no longer offers ${rule.value}.` });
      continue;
    }
    if (!rule.allowed.length) {
      issues.push({ rule: label, message: "The rule leaves nothing offered; switch the attribute off instead." });
      continue;
    }
    const unknown = rule.allowed.filter((value) => !target.options.includes(value));
    if (unknown.length) {
      issues.push({ rule: label, message: `${target.label} does not offer ${unknown.join(", ")}.` });
      continue;
    }
    const key = `${rule.target}|${rule.source}|${rule.value}`;
    if (seen.has(key)) {
      issues.push({ rule: label, message: "Another rule already narrows the same value." });
      continue;
    }
    seen.add(key);
  }
  return issues;
}

/** Rules a saved draft may hold: unknown shapes and empty `allowed` lists are dropped, not repaired. */
export function normalizeCascadeRules(raw: unknown): AttributeCascadeRule[] {
  if (!Array.isArray(raw)) return DEFAULT_CASCADE_RULES.map((rule) => ({ ...rule, allowed: [...rule.allowed] }));
  const rules: AttributeCascadeRule[] = [];
  for (const entry of raw) {
    const rule = entry as Partial<AttributeCascadeRule> | null;
    if (!rule || typeof rule.target !== "string" || typeof rule.source !== "string" || typeof rule.value !== "string") continue;
    if (!Array.isArray(rule.allowed)) continue;
    const allowed = rule.allowed.filter((value): value is string => typeof value === "string" && value.length > 0);
    if (!allowed.length) continue;
    rules.push({ target: rule.target, source: rule.source, value: rule.value, allowed });
  }
  return rules;
}

/** One rule per (target, source, value): setting a value's list replaces the rule it had. */
export function setCascadeRule(
  rules: readonly AttributeCascadeRule[],
  next: AttributeCascadeRule,
): AttributeCascadeRule[] {
  const others = rules.filter((rule) => !(rule.target === next.target && rule.source === next.source && rule.value === next.value));
  return [...others, { ...next, allowed: [...next.allowed] }];
}

export function removeCascadeRule(
  rules: readonly AttributeCascadeRule[],
  target: string,
  source: string,
  value: string,
): AttributeCascadeRule[] {
  return rules.filter((rule) => !(rule.target === target && rule.source === source && rule.value === value));
}
