// Loyalty rules (Plan §9): the points economy, the membership tiers and the milestone benefits.
// Pure rules so the admin screen and the tests share one definition of "which tier", "how many
// points" and "is this rule valid".

import {
  aggregateCustomers, createSeedLoyalty,
  type AdminDemoData, type AdminLoyalty, type AdminMilestone, type AdminPointsRule, type AdminTier,
} from "@/lib/admin-demo-data";

export type PointsBalance = { daily: number; purchased: number };

export type LoyaltyStats = { orders: number; units: number; spendKs: number };

export function loyaltyProgram(data: AdminDemoData): AdminLoyalty {
  return data.loyalty?.rules ? data.loyalty : createSeedLoyalty();
}

/** Tiers always read cheapest first, whatever order the admin left them in. */
export function sortedTiers(tiers: readonly AdminTier[]): AdminTier[] {
  return [...tiers].sort((a, b) => a.minSpendKs - b.minSpendKs || a.name.localeCompare(b.name));
}

/** The highest tier the lifetime spend reaches; the cheapest tier when nothing matches. */
export function tierFor(tiers: readonly AdminTier[], lifetimeSpendKs: number): AdminTier | null {
  const sorted = sortedTiers(tiers);
  if (!sorted.length) return null;
  let current = sorted[0];
  for (const tier of sorted) {
    if (lifetimeSpendKs >= tier.minSpendKs) current = tier;
  }
  return current;
}

export function nextTier(tiers: readonly AdminTier[], lifetimeSpendKs: number): { tier: AdminTier; remainingKs: number } | null {
  const current = tierFor(tiers, lifetimeSpendKs);
  const above = sortedTiers(tiers).find((tier) => tier.minSpendKs > (current?.minSpendKs ?? -1));
  if (!above) return null;
  return { tier: above, remainingKs: Math.max(0, above.minSpendKs - lifetimeSpendKs) };
}

/**
 * Plan §9: daily points are spent first, then the purchase points that never expire.
 * Returns what is left of each bucket, so the caller can show the shortfall.
 */
export function spendPoints(balance: PointsBalance, amount: number): { balance: PointsBalance; shortfall: number } {
  const wanted = Math.max(0, Math.trunc(amount));
  const fromDaily = Math.min(balance.daily, wanted);
  const afterDaily = wanted - fromDaily;
  const fromPurchased = Math.min(balance.purchased, afterDaily);
  return {
    balance: { daily: balance.daily - fromDaily, purchased: balance.purchased - fromPurchased },
    shortfall: wanted - fromDaily - fromPurchased,
  };
}

/** Unused daily points expire; purchase points are kept. */
export function expireDailyPoints(balance: PointsBalance): PointsBalance {
  return { daily: 0, purchased: balance.purchased };
}

export function pointsForPurchase(rules: AdminPointsRule, units: number): number {
  return Math.max(0, Math.trunc(units)) * Math.max(0, Math.trunc(rules.purchasePointsPerUnit));
}

export function imagesAffordable(rules: AdminPointsRule, balance: PointsBalance): number {
  const cost = Math.max(1, Math.trunc(rules.imageCost));
  return Math.floor((balance.daily + balance.purchased) / cost);
}

export function milestoneProgress(milestone: AdminMilestone, stats: LoyaltyStats): { met: boolean; progress: number } {
  const value = milestone.trigger === "quantity" ? stats.units : milestone.trigger === "orders" ? stats.orders : stats.spendKs;
  const threshold = Math.max(1, milestone.threshold);
  return { met: value >= threshold, progress: Math.min(1, value / threshold) };
}

export function milestonesMet(milestones: readonly AdminMilestone[], stats: LoyaltyStats): AdminMilestone[] {
  return milestones.filter((milestone) => milestone.enabled && milestoneProgress(milestone, stats).met);
}

/** Tiers ranked by how many demo customers currently sit in them. */
export function tierUsage(data: AdminDemoData): Map<string, { count: number; names: string[] }> {
  const tiers = loyaltyProgram(data).tiers;
  const usage = new Map<string, { count: number; names: string[] }>(tiers.map((tier) => [tier.id, { count: 0, names: [] }]));
  for (const customer of aggregateCustomers(data.orders)) {
    const tier = tierFor(tiers, customer.spendKs);
    if (!tier) continue;
    const entry = usage.get(tier.id);
    if (!entry) continue;
    entry.count += 1;
    entry.names.push(customer.name);
  }
  return usage;
}

export function validateLoyalty(program: AdminLoyalty): string[] {
  const issues: string[] = [];
  const { rules, tiers, milestones } = program;
  if (rules.dailyGrant < 0) issues.push("The daily grant cannot be negative.");
  if (rules.dailyExpiryHours < 1) issues.push("Daily points must expire after at least one hour.");
  if (rules.imageCost < 1) issues.push("An AI image must cost at least one point.");
  if (rules.purchasePointsPerUnit < 0) issues.push("Purchase points cannot be negative.");

  if (!tiers.length) issues.push("Keep at least one tier.");
  const names = new Set<string>();
  for (const tier of sortedTiers(tiers)) {
    const name = tier.name.trim().toLowerCase();
    if (!name) issues.push("Every tier needs a name.");
    else if (names.has(name)) issues.push(`Two tiers are called "${tier.name}".`);
    names.add(name);
    if (tier.minSpendKs < 0) issues.push(`${tier.name}: the minimum spend cannot be negative.`);
    if (tier.discountPercent < 0 || tier.discountPercent > 100) issues.push(`${tier.name}: the discount must be between 0 and 100%.`);
  }
  if (tiers.length && Math.min(...tiers.map((tier) => tier.minSpendKs)) > 0) {
    issues.push("The cheapest tier must start at Ks 0, or a new shopper has no tier.");
  }

  const ids = new Set<string>();
  for (const milestone of milestones) {
    if (ids.has(milestone.id)) issues.push(`Duplicate milestone id "${milestone.id}".`);
    ids.add(milestone.id);
    if (!milestone.label.trim()) issues.push("Every milestone needs a label.");
    if (milestone.threshold < 1) issues.push(`${milestone.label || "Milestone"}: the threshold must be at least 1.`);
    if (milestone.value < 1) issues.push(`${milestone.label || "Milestone"}: the benefit must be at least 1.`);
    if (milestone.benefit === "discount" && milestone.value > 100) issues.push(`${milestone.label || "Milestone"}: a discount cannot exceed 100%.`);
  }
  const seen = new Set<string>();
  for (const milestone of milestones) {
    const key = `${milestone.trigger}:${milestone.threshold}`;
    if (seen.has(key)) issues.push(`Two milestones trigger at the same ${milestone.trigger} threshold (${milestone.threshold}).`);
    seen.add(key);
  }
  return issues;
}

export function applyRules(data: AdminDemoData, rules: AdminPointsRule): { data: AdminDemoData; issues: string[] } {
  const program = loyaltyProgram(data);
  const issues = validateLoyalty({ ...program, rules });
  if (issues.length) return { data, issues };
  return { data: { ...data, loyalty: { ...program, rules } }, issues: [] };
}

/** Saves a tier. Removing a tier that demo customers sit in is refused, so nobody loses a rank. */
export function saveTier(data: AdminDemoData, tier: AdminTier): { data: AdminDemoData; issues: string[] } {
  const program = loyaltyProgram(data);
  const exists = program.tiers.some((entry) => entry.id === tier.id);
  const tiers = exists ? program.tiers.map((entry) => (entry.id === tier.id ? tier : entry)) : [...program.tiers, tier];
  const issues = validateLoyalty({ ...program, tiers });
  if (issues.length) return { data, issues };
  return { data: { ...data, loyalty: { ...program, tiers } }, issues: [] };
}

export function removeTier(data: AdminDemoData, id: string): { data: AdminDemoData; issues: string[] } {
  const program = loyaltyProgram(data);
  const usage = tierUsage(data).get(id);
  if (usage?.count) {
    return { data, issues: [`${usage.count} customer${usage.count === 1 ? "" : "s"} sit in this tier (${usage.names.slice(0, 3).join(", ")}${usage.count > 3 ? "…" : ""}). Move them first.`] };
  }
  const tiers = program.tiers.filter((tier) => tier.id !== id);
  const issues = validateLoyalty({ ...program, tiers });
  if (issues.length) return { data, issues };
  return { data: { ...data, loyalty: { ...program, tiers } }, issues: [] };
}

export function saveMilestone(data: AdminDemoData, milestone: AdminMilestone): { data: AdminDemoData; issues: string[] } {
  const program = loyaltyProgram(data);
  const exists = program.milestones.some((entry) => entry.id === milestone.id);
  const milestones = exists
    ? program.milestones.map((entry) => (entry.id === milestone.id ? milestone : entry))
    : [...program.milestones, milestone];
  const issues = validateLoyalty({ ...program, milestones });
  if (issues.length) return { data, issues };
  return { data: { ...data, loyalty: { ...program, milestones } }, issues: [] };
}

export function removeMilestone(data: AdminDemoData, id: string): AdminDemoData {
  const program = loyaltyProgram(data);
  return { ...data, loyalty: { ...program, milestones: program.milestones.filter((milestone) => milestone.id !== id) } };
}

export function resetLoyalty(data: AdminDemoData): AdminDemoData {
  return { ...data, loyalty: createSeedLoyalty() };
}
