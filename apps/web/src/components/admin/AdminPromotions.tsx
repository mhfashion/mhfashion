"use client";

import { useMemo, useState } from "react";
import { Pencil, Percent, Plus, Search, Trash2 } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import {
  AdminBadge, AdminButton, AdminCard, AdminDrawer, AdminEmpty, AdminField,
  AdminInput, AdminSelect, AdminStat, type AdminTone,
} from "@/components/admin/AdminUi";
import { updateAdminData, useAdminDemoData } from "@/lib/admin-demo-store";
import { matchesSearchQuery } from "@/lib/search-text";
import {
  formatAdminDate, formatKs, promotionDiscountKs, promotionDraftFrom, promotionFromDraft,
  promotionStatus, removePromotion, togglePromotion, upsertPromotion, validatePromotionDraft,
  type AdminPromotion, type AdminPromotionDraft, type AdminPromotionKind, type AdminPromotionStatus,
} from "@/lib/admin-demo-data";

const STATUS_TONES: Record<AdminPromotionStatus, AdminTone> = {
  Active: "green",
  Scheduled: "blue",
  Expired: "slate",
  "Used up": "amber",
  Disabled: "red",
};

export default function AdminPromotions() {
  const data = useAdminDemoData();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AdminPromotionDraft | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [previewSubtotal, setPreviewSubtotal] = useState("50000");

  const query = search;
  const editing = editingId ? data.promotions.find((promotion) => promotion.id === editingId) ?? null : null;
  const visible = useMemo(() => data.promotions.filter((promotion) => (
    matchesSearchQuery(`${promotion.code} ${promotion.kind} ${promotionStatus(promotion)}`, query)
  )), [data.promotions, query]);

  const activeCount = data.promotions.filter((promotion) => promotionStatus(promotion) === "Active").length;
  const scheduledCount = data.promotions.filter((promotion) => promotionStatus(promotion) === "Scheduled").length;
  const redemptions = data.promotions.reduce((total, promotion) => total + promotion.used, 0);

  function startCreate() {
    setEditingId("new");
    setDraft(promotionDraftFrom());
    setErrors([]);
  }

  function startEdit(promotion: AdminPromotion) {
    setEditingId(promotion.id);
    setDraft(promotionDraftFrom(promotion));
    setErrors([]);
  }

  function closeEditor() {
    setEditingId(null);
    setDraft(null);
    setErrors([]);
  }

  function save() {
    if (!draft) return;
    const found = validatePromotionDraft(draft);
    if (found.length) {
      setErrors(found);
      return;
    }
    const promotion = promotionFromDraft(draft, editing ?? undefined);
    updateAdminData((current) => upsertPromotion(current, promotion));
    closeEditor();
  }

  function remove(promotion: AdminPromotion) {
    if (confirmId !== promotion.id) {
      setConfirmId(promotion.id);
      return;
    }
    updateAdminData((current) => removePromotion(current, promotion.id));
    setConfirmId(null);
  }

  const previewValue = Number(previewSubtotal) || 0;
  const previewDiscount = editing && draft ? promotionDiscountKs(promotionFromDraft(draft, editing), previewValue) : 0;

  return (
    <AdminShell
      active="promotions"
      title="Promotions"
      description="Discount codes with limits, validity windows and usage tracking."
      actions={<AdminButton onClick={startCreate}><Plus size={14} /> New code</AdminButton>}
      search={(
        <label className="flex h-10 w-full max-w-[420px] items-center gap-2.5 rounded-full border border-[#e6e9ed] bg-[#f8f9fb] px-3.5 text-[#8c95a1] focus-within:border-[#a5d972] focus-within:bg-white">
          <Search size={16} className="shrink-0" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search promotions" placeholder="Search code..." className="min-w-0 flex-1 bg-transparent text-[11px] text-[#252c37] outline-none placeholder:text-[#9da5af]" />
        </label>
      )}
    >
      <section aria-label="Promotion metrics" className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Active codes" value={String(activeCount)} hint="Redeemable right now" icon={<Percent size={21} />} />
        <AdminStat label="Scheduled" value={String(scheduledCount)} hint="Start in the future" icon={<Percent size={21} />} />
        <AdminStat label="Redemptions" value={redemptions.toLocaleString("en-US")} hint="Across every code" icon={<Percent size={21} />} />
        <AdminStat label="Codes" value={String(data.promotions.length)} hint="Including expired and disabled" icon={<Percent size={21} />} />
      </section>

      <AdminCard className="mt-3 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-[10px]">
            <thead className="bg-[#fafbfc] text-[9px] font-semibold text-[#828c99]">
              <tr>
                <th className="px-4 py-2.5 font-semibold sm:px-5">Code</th>
                <th className="px-3 py-2.5 font-semibold">Discount</th>
                <th className="px-3 py-2.5 font-semibold">Min spend</th>
                <th className="px-3 py-2.5 font-semibold">Usage</th>
                <th className="px-3 py-2.5 font-semibold">Validity</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 text-right font-semibold sm:px-5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f2f4]">
              {visible.length ? visible.map((promotion) => {
                const status = promotionStatus(promotion);
                const usedPercent = Math.min(100, Math.round((promotion.used / promotion.usageLimit) * 100));
                return (
                  <tr key={promotion.id} className="hover:bg-[#fafbfc]">
                    <td className="px-4 py-2.5 sm:px-5">
                      <span className="inline-flex rounded-lg border border-dashed border-[#c9d3dd] bg-[#f8fafc] px-2 py-1 font-mono text-[10px] font-bold tracking-wide text-[#394250]">{promotion.code}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-[#394250]">{promotion.kind === "percent" ? `${promotion.value}% off` : `${formatKs(promotion.value)} off`}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[#727d8a]">{promotion.minSpendKs ? formatKs(promotion.minSpendKs) : "None"}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums text-[#505a68]">{promotion.used}/{promotion.usageLimit}</span>
                        <span className="h-1.5 w-14 overflow-hidden rounded-full bg-[#edf0f3]"><span className="block h-full rounded-full bg-[#4cae22]" style={{ width: `${usedPercent}%` }} /></span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[#919aa6]">{formatAdminDate(promotion.startsAt)} → {formatAdminDate(promotion.endsAt)}</td>
                    <td className="px-3 py-2.5"><AdminBadge tone={STATUS_TONES[status]}>{status}</AdminBadge></td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right sm:px-5">
                      <div className="inline-flex items-center gap-1.5">
                        <AdminButton compact variant="secondary" onClick={() => startEdit(promotion)} aria-label={`Edit ${promotion.code}`}><Pencil size={12} /> Edit</AdminButton>
                        <AdminButton compact variant="ghost" onClick={() => updateAdminData((current) => togglePromotion(current, promotion.id))} aria-label={`${promotion.enabled ? "Disable" : "Enable"} ${promotion.code}`}>{promotion.enabled ? "Disable" : "Enable"}</AdminButton>
                        <AdminButton compact variant="danger" onClick={() => remove(promotion)} aria-label={`Delete ${promotion.code}`}><Trash2 size={12} /> {confirmId === promotion.id ? "Confirm" : "Delete"}</AdminButton>
                      </div>
                    </td>
                  </tr>
                );
              }) : <tr><td colSpan={7}><AdminEmpty title="No promotions match this search" description="Create a code to start discounting." /></td></tr>}
            </tbody>
          </table>
        </div>
      </AdminCard>

      <AdminDrawer
        open={Boolean(editingId && draft)}
        title={editingId === "new" ? "New promotion" : `Edit ${editing?.code ?? "code"}`}
        description="Codes apply to the cart subtotal; checkout stays offline until payments are connected."
        onClose={closeEditor}
        footer={(
          <div className="flex items-center justify-end gap-2">
            <AdminButton variant="secondary" onClick={closeEditor}>Cancel</AdminButton>
            <AdminButton onClick={save}>{editingId === "new" ? "Create code" : "Save changes"}</AdminButton>
          </div>
        )}
      >
        {draft ? (
          <div className="space-y-4">
            {errors.length ? (
              <ul className="space-y-1 rounded-xl border border-[#f3d2d4] bg-[#fff6f6] px-3 py-2 text-[9px] font-semibold text-[#c9424a]">
                {errors.map((error) => <li key={error}>{error}</li>)}
              </ul>
            ) : null}
            <AdminField label="Code">
              <AdminInput value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value.toUpperCase() })} placeholder="NEW10" aria-label="Promotion code" />
            </AdminField>
            <div className="grid grid-cols-2 gap-3">
              <AdminField label="Type">
                <AdminSelect value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value as AdminPromotionKind })} aria-label="Discount type">
                  <option value="percent">Percent</option>
                  <option value="amount">Fixed amount (Ks)</option>
                </AdminSelect>
              </AdminField>
              <AdminField label={draft.kind === "percent" ? "Percent off" : "Amount off (Ks)"}>
                <AdminInput value={draft.value} onChange={(event) => setDraft({ ...draft, value: event.target.value })} inputMode="numeric" placeholder={draft.kind === "percent" ? "10" : "5000"} aria-label="Discount value" />
              </AdminField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <AdminField label="Minimum spend (Ks)">
                <AdminInput value={draft.minSpendKs} onChange={(event) => setDraft({ ...draft, minSpendKs: event.target.value })} inputMode="numeric" aria-label="Minimum spend" />
              </AdminField>
              <AdminField label="Usage limit">
                <AdminInput value={draft.usageLimit} onChange={(event) => setDraft({ ...draft, usageLimit: event.target.value })} inputMode="numeric" aria-label="Usage limit" />
              </AdminField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <AdminField label="Starts">
                <AdminInput type="date" value={draft.startsAt} onChange={(event) => setDraft({ ...draft, startsAt: event.target.value })} aria-label="Start date" />
              </AdminField>
              <AdminField label="Ends">
                <AdminInput type="date" value={draft.endsAt} onChange={(event) => setDraft({ ...draft, endsAt: event.target.value })} aria-label="End date" />
              </AdminField>
            </div>

            <div className="rounded-xl border border-[#edf0f3] bg-[#fafbfc] p-3">
              <h3 className="text-[10px] font-bold text-[#5b6674]">Discount preview</h3>
              <div className="mt-2 flex items-center gap-2">
                <AdminInput value={previewSubtotal} onChange={(event) => setPreviewSubtotal(event.target.value)} inputMode="numeric" aria-label="Preview subtotal" className="h-8 w-28" />
                <span className="text-[9px] text-[#87909b]">cart subtotal</span>
              </div>
              <p className="mt-2 text-[10px] text-[#394250]">
                {editing
                  ? <>Discount: <strong>{formatKs(previewDiscount)}</strong> · Total after discount: <strong>{formatKs(Math.max(0, previewValue - previewDiscount))}</strong></>
                  : "Save the code to preview it against a cart."}
              </p>
            </div>
          </div>
        ) : null}
      </AdminDrawer>
    </AdminShell>
  );
}
