"use client";

import { useMemo, useState } from "react";
import { Coins, Crown, Gift, Image as ImageIcon, RotateCcw, Save, Sparkles, Trash2 } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import { AdminBadge, AdminButton, AdminCard, AdminDrawer, AdminEmpty, AdminField, AdminInput, AdminSelect, AdminStat } from "@/components/admin/AdminUi";
import { updateAdminData, useAdminDemoData } from "@/lib/admin-demo-store";
import { formatKs, type AdminMilestone, type AdminMilestoneTrigger, type AdminPointsRule, type AdminTier } from "@/lib/admin-demo-data";
import {
  applyRules, expireDailyPoints, imagesAffordable, loyaltyProgram, milestoneProgress, milestonesMet, nextTier,
  pointsForPurchase, removeMilestone, removeTier, resetLoyalty, saveMilestone, saveTier, sortedTiers, spendPoints,
  tierFor, tierUsage, validateLoyalty,
} from "@/lib/admin-loyalty";

const TRIGGER_LABELS: Record<AdminMilestoneTrigger, string> = {
  quantity: "Pieces in one order",
  orders: "Orders placed",
  spend: "Spend on one order (Ks)",
};

function emptyTier(): AdminTier {
  return { id: `tier-${Date.now().toString(36)}`, name: "", minSpendKs: 0, discountPercent: 0 };
}

function emptyMilestone(): AdminMilestone {
  return { id: `milestone-${Date.now().toString(36)}`, label: "", trigger: "orders", threshold: 1, benefit: "points", value: 50, enabled: true };
}

export default function AdminLoyalty() {
  const data = useAdminDemoData();
  const program = loyaltyProgram(data);
  const tiers = sortedTiers(program.tiers);
  const usage = useMemo(() => tierUsage(data), [data]);
  const issues = validateLoyalty(program);

  const [rules, setRules] = useState<AdminPointsRule>(program.rules);
  const [rulesMessage, setRulesMessage] = useState("");
  const [rulesIssues, setRulesIssues] = useState<string[]>([]);
  const [tierDraft, setTierDraft] = useState<AdminTier | null>(null);
  const [milestoneDraft, setMilestoneDraft] = useState<AdminMilestone | null>(null);
  const [draftIssues, setDraftIssues] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  // Preview: a shopper with this lifetime spend placing one basket.
  const [previewSpend, setPreviewSpend] = useState("600000");
  const [previewUnits, setPreviewUnits] = useState("2");
  const [previewOrders, setPreviewOrders] = useState("3");

  const previewSpendKs = Number(previewSpend) || 0;
  const previewUnitsCount = Number(previewUnits) || 0;
  const previewOrderCount = Number(previewOrders) || 0;
  const previewTier = tierFor(tiers, previewSpendKs);
  const previewNext = nextTier(tiers, previewSpendKs);
  const previewStats = { orders: previewOrderCount, units: previewUnitsCount, spendKs: previewSpendKs };
  const previewPoints = pointsForPurchase(rules, previewUnitsCount);
  const previewMilestones = milestonesMet(program.milestones, previewStats);
  const previewBalance = { daily: rules.dailyGrant, purchased: previewPoints };

  function saveRules() {
    let failed: string[] = [];
    updateAdminData((current) => {
      const result = applyRules(current, rules);
      failed = result.issues;
      return result.data;
    });
    setRulesIssues(failed);
    setRulesMessage(failed.length ? "" : "Points economy saved.");
  }

  function commitTier() {
    if (!tierDraft) return;
    let failed: string[] = [];
    updateAdminData((current) => {
      const result = saveTier(current, { ...tierDraft, name: tierDraft.name.trim() });
      failed = result.issues;
      return result.data;
    });
    setDraftIssues(failed);
    if (!failed.length) {
      setTierDraft(null);
      setMessage(`${tierDraft.name.trim() || "Tier"} saved.`);
    }
  }

  function commitMilestone() {
    if (!milestoneDraft) return;
    let failed: string[] = [];
    updateAdminData((current) => {
      const result = saveMilestone(current, { ...milestoneDraft, label: milestoneDraft.label.trim() });
      failed = result.issues;
      return result.data;
    });
    setDraftIssues(failed);
    if (!failed.length) {
      setMilestoneDraft(null);
      setMessage(`${milestoneDraft.label.trim() || "Milestone"} saved.`);
    }
  }

  function deleteTier(tier: AdminTier) {
    let failed: string[] = [];
    updateAdminData((current) => {
      const result = removeTier(current, tier.id);
      failed = result.issues;
      return result.data;
    });
    setMessage(failed.length ? "" : `${tier.name} removed.`);
    if (failed.length) setMessage(failed[0]);
  }

  const customersInTiers = [...usage.values()].reduce((total, entry) => total + entry.count, 0);

  return (
    <AdminShell
      active="loyalty"
      title="Loyalty"
      description="The points economy, the membership tiers and the milestone benefits — Plan §9."
      actions={(
        <AdminButton
          variant="secondary"
          onClick={() => {
            updateAdminData((current) => resetLoyalty(current));
            setRules(program.rules);
            setRulesMessage("Loyalty reset to the §9 defaults.");
            setRulesIssues([]);
          }}
        >
          <RotateCcw size={13} /> Reset to §9 defaults
        </AdminButton>
      )}
    >
      <section aria-label="Loyalty metrics" className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Daily points" value={String(program.rules.dailyGrant)} hint={`Expire after ${program.rules.dailyExpiryHours}h`} icon={<Sparkles size={21} />} />
        <AdminStat label="AI image" value={`${program.rules.imageCost} pts`} hint={`${imagesAffordable(program.rules, { daily: program.rules.dailyGrant, purchased: 0 })} free per day`} icon={<ImageIcon size={21} />} />
        <AdminStat label="Per piece" value={`${program.rules.purchasePointsPerUnit} pts`} hint="Kept, never expires" icon={<Coins size={21} />} />
        <AdminStat label="Tiers" value={String(tiers.length)} hint={`${customersInTiers} demo customers placed`} icon={<Crown size={21} />} />
      </section>

      {issues.length ? (
        <div role="alert" className="mt-3 rounded-2xl border border-[#f0d3d3] bg-[#fdf3f3] px-4 py-3">
          {issues.map((issue) => <p key={issue} className="text-[10px] font-semibold text-[#a33]">{issue}</p>)}
        </div>
      ) : null}

      <AdminCard className="mt-3">
        <div className="px-4 py-3 sm:px-5">
          <h2 className="text-[11px] font-bold text-[#303844]">Points economy</h2>
          <p className="mt-1 text-[10px] text-[#6c7683]">Daily points are spent first; purchase points are kept until they are used.</p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AdminField label="Daily grant" hint="Granted once per shopper per day.">
              <AdminInput
                aria-label="Daily grant"
                type="number"
                min={0}
                inputMode="numeric"
                value={String(rules.dailyGrant)}
                onChange={(event) => setRules({ ...rules, dailyGrant: Number(event.target.value) || 0 })}
              />
            </AdminField>
            <AdminField label="Daily points expire after" hint="Hours. Unused daily points are cleared.">
              <AdminInput
                aria-label="Daily expiry hours"
                type="number"
                min={1}
                inputMode="numeric"
                value={String(rules.dailyExpiryHours)}
                onChange={(event) => setRules({ ...rules, dailyExpiryHours: Number(event.target.value) || 0 })}
              />
            </AdminField>
            <AdminField label="Cost per AI image" hint="Points charged for one generated image.">
              <AdminInput
                aria-label="Image cost"
                type="number"
                min={1}
                inputMode="numeric"
                value={String(rules.imageCost)}
                onChange={(event) => setRules({ ...rules, imageCost: Number(event.target.value) || 0 })}
              />
            </AdminField>
            <AdminField label="Points per purchased piece" hint="Never expires.">
              <AdminInput
                aria-label="Purchase points per unit"
                type="number"
                min={0}
                inputMode="numeric"
                value={String(rules.purchasePointsPerUnit)}
                onChange={(event) => setRules({ ...rules, purchasePointsPerUnit: Number(event.target.value) || 0 })}
              />
            </AdminField>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <AdminButton onClick={saveRules} aria-label="Save the points economy"><Save size={13} /> Save points economy</AdminButton>
            <span className="text-[10px] text-[#98a1ac]">
              {rules.imageCost > 0 ? `${Math.floor(rules.dailyGrant / rules.imageCost)} free images from the daily grant` : "No free images"}
            </span>
          </div>
          {rulesIssues.length ? (
            <div role="alert" className="mt-2 rounded-xl border border-[#f0d3d3] bg-[#fdf3f3] px-3 py-2">
              {rulesIssues.map((issue) => <p key={issue} className="text-[10px] font-semibold text-[#a33]">{issue}</p>)}
            </div>
          ) : null}
          {rulesMessage ? <p role="status" className="mt-2 text-[10px] font-semibold text-[#3f8c22]">{rulesMessage}</p> : null}
        </div>
      </AdminCard>

      <AdminCard className="mt-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f0f2f4] px-4 py-3 sm:px-5">
          <div>
            <h2 className="text-[11px] font-bold text-[#303844]">Membership tiers</h2>
            <p className="mt-0.5 text-[10px] text-[#6c7683]">Lifetime spend decides the tier; the discount applies to every order.</p>
          </div>
          <AdminButton compact variant="secondary" onClick={() => { setTierDraft(emptyTier()); setDraftIssues([]); }} aria-label="Add a tier">Add tier</AdminButton>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-[10px]">
            <thead className="bg-[#fafbfc] text-[9px] font-semibold text-[#828c99]">
              <tr>
                <th className="px-4 py-2.5">Tier</th>
                <th className="px-3 py-2.5 text-right">Minimum lifetime spend</th>
                <th className="px-3 py-2.5 text-right">Discount</th>
                <th className="px-3 py-2.5 text-right">Demo customers</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f2f4]">
              {tiers.map((tier) => {
                const held = usage.get(tier.id);
                return (
                  <tr key={tier.id} data-tier={tier.id} className="hover:bg-[#fafbfc]">
                    <td className="px-4 py-2">
                      <span className="font-bold text-[#303844]" data-tier-name>{tier.name}</span>
                      {tier.minSpendKs === 0 ? <span className="ml-2 text-[9px] text-[#98a1ac]">everyone starts here</span> : null}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatKs(tier.minSpendKs)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{tier.discountPercent}%</td>
                    <td className="px-3 py-2 text-right tabular-nums">{held?.count ?? 0}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <AdminButton compact variant="secondary" onClick={() => { setTierDraft({ ...tier }); setDraftIssues([]); }} aria-label={`Edit ${tier.name}`}>Edit</AdminButton>
                        <button
                          type="button"
                          aria-label={`Remove ${tier.name}`}
                          onClick={() => deleteTier(tier)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e4e8ed] text-[#a33]"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!tiers.length ? <tr><td colSpan={5}><AdminEmpty title="No tiers yet" description="Add a tier that starts at Ks 0 first." /></td></tr> : null}
            </tbody>
          </table>
        </div>
      </AdminCard>

      <AdminCard className="mt-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f0f2f4] px-4 py-3 sm:px-5">
          <div>
            <h2 className="text-[11px] font-bold text-[#303844]">Milestone benefits</h2>
            <p className="mt-0.5 text-[10px] text-[#6c7683]">A threshold on one order or on the shopper&apos;s history, and what they get for crossing it.</p>
          </div>
          <AdminButton compact variant="secondary" onClick={() => { setMilestoneDraft(emptyMilestone()); setDraftIssues([]); }} aria-label="Add a milestone">Add milestone</AdminButton>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[10px]">
            <thead className="bg-[#fafbfc] text-[9px] font-semibold text-[#828c99]">
              <tr>
                <th className="px-4 py-2.5">Milestone</th>
                <th className="px-3 py-2.5">Trigger</th>
                <th className="px-3 py-2.5 text-right">Threshold</th>
                <th className="px-3 py-2.5">Benefit</th>
                <th className="px-3 py-2.5">State</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f2f4]">
              {program.milestones.map((milestone) => (
                <tr key={milestone.id} data-milestone={milestone.id} className="hover:bg-[#fafbfc]">
                  <td className="px-4 py-2 font-bold text-[#303844]">{milestone.label}</td>
                  <td className="px-3 py-2 text-[#4b5563]">{TRIGGER_LABELS[milestone.trigger]}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{milestone.trigger === "spend" ? formatKs(milestone.threshold) : milestone.threshold}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#f3f5f7] px-2 py-0.5 text-[9px] font-semibold text-[#4b5563]">
                      <Gift size={10} /> {milestone.benefit === "points" ? `${milestone.value} pts` : `${milestone.value}% off`}
                    </span>
                  </td>
                  <td className="px-3 py-2"><AdminBadge tone={milestone.enabled ? "green" : "slate"}>{milestone.enabled ? "On" : "Off"}</AdminBadge></td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <AdminButton compact variant="secondary" onClick={() => { setMilestoneDraft({ ...milestone }); setDraftIssues([]); }} aria-label={`Edit ${milestone.label}`}>Edit</AdminButton>
                      <button
                        type="button"
                        aria-label={`Delete ${milestone.label}`}
                        onClick={() => {
                          updateAdminData((current) => removeMilestone(current, milestone.id));
                          setMessage(`${milestone.label} removed.`);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e4e8ed] text-[#a33]"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!program.milestones.length ? <tr><td colSpan={6}><AdminEmpty title="No milestones yet" description="Add one to reward a first order or a big basket." /></td></tr> : null}
            </tbody>
          </table>
        </div>
        {message ? <p data-loyalty-message role="status" className="border-t border-[#f0f2f4] px-4 py-2 text-[10px] font-semibold text-[#3f8c22]">{message}</p> : null}
      </AdminCard>

      <AdminCard className="mt-3">
        <div className="px-4 py-3 sm:px-5">
          <h2 className="text-[11px] font-bold text-[#303844]">Check a shopper</h2>
          <p className="mt-0.5 text-[10px] text-[#6c7683]">Nothing is written; this reads the saved rules.</p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <AdminField label="Lifetime spend (Ks)">
              <AdminInput aria-label="Preview lifetime spend" type="number" min={0} inputMode="numeric" value={previewSpend} onChange={(event) => setPreviewSpend(event.target.value)} />
            </AdminField>
            <AdminField label="Pieces in this basket">
              <AdminInput aria-label="Preview basket units" type="number" min={0} inputMode="numeric" value={previewUnits} onChange={(event) => setPreviewUnits(event.target.value)} />
            </AdminField>
            <AdminField label="Orders placed">
              <AdminInput aria-label="Preview order count" type="number" min={0} inputMode="numeric" value={previewOrders} onChange={(event) => setPreviewOrders(event.target.value)} />
            </AdminField>
          </div>
          <div data-loyalty-preview className="mt-3 grid grid-cols-1 gap-2 text-[10px] text-[#4b5563] sm:grid-cols-2">
            <p>Tier: <span className="font-bold text-[#303844]">{previewTier ? `${previewTier.name} (${previewTier.discountPercent}% off)` : "none"}</span></p>
            <p>{previewNext ? `${formatKs(previewNext.remainingKs)} more to reach ${previewNext.tier.name}` : "Top tier reached"}</p>
            <p>Points from this basket: <span className="font-bold text-[#303844]">{previewPoints}</span></p>
            <p>Daily grant: <span className="font-bold text-[#303844]">{rules.dailyGrant}</span> · images affordable: <span className="font-bold text-[#303844]">{imagesAffordable(rules, previewBalance)}</span></p>
            <p className="sm:col-span-2">
              Milestones met: {previewMilestones.length ? previewMilestones.map((milestone) => `${milestone.label} (${milestone.benefit === "points" ? `${milestone.value} pts` : `${milestone.value}% off`})`).join(", ") : "none"}
            </p>
            <p className="sm:col-span-2 text-[#98a1ac]">
              Spent example: one image leaves {spendPoints(previewBalance, rules.imageCost).balance.daily} daily and {spendPoints(previewBalance, rules.imageCost).balance.purchased} kept points
              {spendPoints(previewBalance, rules.imageCost).shortfall ? ` (${spendPoints(previewBalance, rules.imageCost).shortfall} short)` : ""}; after {rules.dailyExpiryHours}h unused daily points drop to {expireDailyPoints(previewBalance).daily}.
            </p>
            <p className="sm:col-span-2 text-[#98a1ac]">
              Open milestones: {program.milestones.filter((milestone) => milestone.enabled && !milestoneProgress(milestone, previewStats).met).map((milestone) => `${milestone.label} ${Math.round(milestoneProgress(milestone, previewStats).progress * 100)}%`).join(", ") || "none"}
            </p>
          </div>
        </div>
      </AdminCard>

      <AdminDrawer
        open={Boolean(tierDraft)}
        title={tierDraft && tiers.some((tier) => tier.id === tierDraft.id) ? `Edit ${tierDraft.name || "tier"}` : "Add a tier"}
        description="Lifetime spend decides the tier; the discount applies to every order."
        onClose={() => setTierDraft(null)}
        footer={(
          <div className="flex justify-end gap-1.5">
            <AdminButton variant="ghost" onClick={() => setTierDraft(null)}>Cancel</AdminButton>
            <AdminButton onClick={commitTier} aria-label="Save tier"><Save size={13} /> Save tier</AdminButton>
          </div>
        )}
      >
        {tierDraft ? (
          <div className="space-y-3">
            <AdminField label="Name" hint="Shown to the shopper on their account.">
              <AdminInput aria-label="Tier name" value={tierDraft.name} onChange={(event) => setTierDraft({ ...tierDraft, name: event.target.value })} />
            </AdminField>
            <AdminField label="Minimum lifetime spend (Ks)" hint="A shopper at or above this spend sits in the tier.">
              <AdminInput aria-label="Tier minimum spend" type="number" min={0} inputMode="numeric" value={String(tierDraft.minSpendKs)} onChange={(event) => setTierDraft({ ...tierDraft, minSpendKs: Number(event.target.value) || 0 })} />
            </AdminField>
            <AdminField label="Discount (%)" hint="Applied to every order for this tier.">
              <AdminInput aria-label="Tier discount" type="number" min={0} max={100} inputMode="numeric" value={String(tierDraft.discountPercent)} onChange={(event) => setTierDraft({ ...tierDraft, discountPercent: Number(event.target.value) || 0 })} />
            </AdminField>
            {draftIssues.length ? (
              <div role="alert" className="rounded-xl border border-[#f0d3d3] bg-[#fdf3f3] px-3 py-2">
                {draftIssues.map((issue) => <p key={issue} className="text-[10px] font-semibold text-[#a33]">{issue}</p>)}
              </div>
            ) : null}
          </div>
        ) : null}
      </AdminDrawer>

      <AdminDrawer
        open={Boolean(milestoneDraft)}
        title={milestoneDraft && program.milestones.some((milestone) => milestone.id === milestoneDraft.id) ? `Edit ${milestoneDraft.label || "milestone"}` : "Add a milestone"}
        description="A threshold on one order or on the shopper's history, and the benefit for crossing it."
        onClose={() => setMilestoneDraft(null)}
        footer={(
          <div className="flex justify-end gap-1.5">
            <AdminButton variant="ghost" onClick={() => setMilestoneDraft(null)}>Cancel</AdminButton>
            <AdminButton onClick={commitMilestone} aria-label="Save milestone"><Save size={13} /> Save milestone</AdminButton>
          </div>
        )}
      >
        {milestoneDraft ? (
          <div className="space-y-3">
            <AdminField label="Label">
              <AdminInput aria-label="Milestone label" value={milestoneDraft.label} onChange={(event) => setMilestoneDraft({ ...milestoneDraft, label: event.target.value })} />
            </AdminField>
            <AdminField label="Trigger" hint="What is counted before the threshold is compared.">
              <AdminSelect aria-label="Milestone trigger" value={milestoneDraft.trigger} onChange={(event) => setMilestoneDraft({ ...milestoneDraft, trigger: event.target.value as AdminMilestoneTrigger })}>
                {(Object.keys(TRIGGER_LABELS) as AdminMilestoneTrigger[]).map((trigger) => <option key={trigger} value={trigger}>{TRIGGER_LABELS[trigger]}</option>)}
              </AdminSelect>
            </AdminField>
            <AdminField label="Threshold">
              <AdminInput aria-label="Milestone threshold" type="number" min={1} inputMode="numeric" value={String(milestoneDraft.threshold)} onChange={(event) => setMilestoneDraft({ ...milestoneDraft, threshold: Number(event.target.value) || 0 })} />
            </AdminField>
            <AdminField label="Benefit">
              <AdminSelect aria-label="Milestone benefit" value={milestoneDraft.benefit} onChange={(event) => setMilestoneDraft({ ...milestoneDraft, benefit: event.target.value as "points" | "discount" })}>
                <option value="points">Points</option>
                <option value="discount">Discount (%)</option>
              </AdminSelect>
            </AdminField>
            <AdminField label={milestoneDraft.benefit === "points" ? "Points granted" : "Discount (%)"}>
              <AdminInput aria-label="Milestone value" type="number" min={1} inputMode="numeric" value={String(milestoneDraft.value)} onChange={(event) => setMilestoneDraft({ ...milestoneDraft, value: Number(event.target.value) || 0 })} />
            </AdminField>
            <label className="flex items-center gap-2 text-[10px] font-semibold text-[#3c4553]">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#4cae22] [color-scheme:light]"
                checked={milestoneDraft.enabled}
                onChange={(event) => setMilestoneDraft({ ...milestoneDraft, enabled: event.target.checked })}
                aria-label="Milestone enabled"
              />
              Active
            </label>
            {draftIssues.length ? (
              <div role="alert" className="rounded-xl border border-[#f0d3d3] bg-[#fdf3f3] px-3 py-2">
                {draftIssues.map((issue) => <p key={issue} className="text-[10px] font-semibold text-[#a33]">{issue}</p>)}
              </div>
            ) : null}
          </div>
        ) : null}
      </AdminDrawer>
    </AdminShell>
  );
}
