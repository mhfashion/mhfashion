"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, RefreshCw, Save, ShieldCheck, Trash2, UserPlus, X } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import AdminCrashLogCard from "@/components/admin/AdminCrashLog";
import {
  AdminBadge, AdminButton, AdminCard, AdminCardHeader, AdminDrawer, AdminEmpty,
  AdminField, AdminInput, AdminSelect, AdminTextarea,
} from "@/components/admin/AdminUi";
import { updateAdminData, useAdminDemoData } from "@/lib/admin-demo-store";
import { resetAdminDemoData } from "@/lib/admin-demo-store";
import { signOutDemoAdmin } from "@/lib/admin-demo-auth";
import {
  ADMIN_MODULES, makeAdminId, removeTeamMember, updateSettings, upsertTeamMember,
  validateTeamDraft, type AdminModuleId, type AdminSettings, type AdminTeamDraft,
  type AdminTeamMember, type AdminTeamRole,
} from "@/lib/admin-demo-data";

const ROLES: AdminTeamRole[] = ["Super Admin", "Post Admin", "Print Admin", "Support"];

const EMPTY_MEMBER: AdminTeamDraft = { name: "", email: "", role: "Post Admin", modules: ["dashboard", "posts"] };

export default function AdminSettings() {
  const router = useRouter();
  const data = useAdminDemoData();
  // The store snapshot is the seed data on the hydration render and this browser's saved settings a
  // moment later, so the form follows `data.settings` until the admin types. Seeding a useState with
  // `data.settings` pinned the seed values, and the next Save wrote them back over the saved ones.
  const [draft, setDraft] = useState<AdminSettings | null>(null);
  const form = draft ?? data.settings;
  const [saved, setSaved] = useState(false);
  const [settingsErrors, setSettingsErrors] = useState<string[]>([]);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [memberDraft, setMemberDraft] = useState<AdminTeamDraft>(EMPTY_MEMBER);
  const [memberErrors, setMemberErrors] = useState<string[]>([]);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  function update<K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) {
    setDraft((current) => ({ ...(current ?? data.settings), [key]: value }));
    setSaved(false);
  }

  function saveSettings() {
    const errors: string[] = [];
    if (!form.storeName.trim()) errors.push("Store name is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.supportEmail.trim())) errors.push("A valid support email is required.");
    if (!Number.isFinite(Number(form.usdRateKs)) || Number(form.usdRateKs) <= 0) errors.push("The USD rate must be greater than zero.");
    if (!Number.isFinite(Number(form.lowStockThreshold)) || Number(form.lowStockThreshold) < 0) errors.push("The low-stock threshold cannot be negative.");
    setSettingsErrors(errors);
    if (errors.length) return;
    updateAdminData((current) => updateSettings(current, {
      ...form,
      storeName: form.storeName.trim(),
      supportEmail: form.supportEmail.trim(),
      usdRateKs: Math.round(Number(form.usdRateKs)),
      lowStockThreshold: Math.round(Number(form.lowStockThreshold)),
    }));
    setDraft(null);
    setSaved(true);
  }

  function startCreateMember() {
    setMemberId("new");
    setMemberDraft(EMPTY_MEMBER);
    setMemberErrors([]);
  }

  function startEditMember(member: AdminTeamMember) {
    setMemberId(member.id);
    setMemberDraft({ name: member.name, email: member.email, role: member.role, modules: [...member.modules] });
    setMemberErrors([]);
  }

  function closeMember() {
    setMemberId(null);
    setMemberDraft(EMPTY_MEMBER);
    setMemberErrors([]);
  }

  function toggleModule(moduleId: AdminModuleId) {
    setMemberDraft((current) => ({
      ...current,
      modules: current.modules.includes(moduleId)
        ? current.modules.filter((id) => id !== moduleId)
        : [...current.modules, moduleId],
    }));
  }

  function saveMember() {
    const errors = validateTeamDraft(memberDraft);
    setMemberErrors(errors);
    if (errors.length) return;
    const existing = memberId && memberId !== "new" ? data.team.find((member) => member.id === memberId) : undefined;
    const member: AdminTeamMember = {
      id: existing?.id ?? makeAdminId("team"),
      name: memberDraft.name.trim(),
      email: memberDraft.email.trim().toLowerCase(),
      role: memberDraft.role,
      modules: memberDraft.role === "Super Admin" ? ADMIN_MODULES.map((module) => module.id) : memberDraft.modules,
      active: existing?.active ?? true,
    };
    updateAdminData((current) => upsertTeamMember(current, member));
    closeMember();
  }

  function toggleMemberActive(member: AdminTeamMember) {
    updateAdminData((current) => upsertTeamMember(current, { ...member, active: !member.active }));
  }

  function removeMember(member: AdminTeamMember) {
    if (confirmRemoveId !== member.id) {
      setConfirmRemoveId(member.id);
      return;
    }
    updateAdminData((current) => removeTeamMember(current, member.id));
    setConfirmRemoveId(null);
  }

  function resetData() {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    resetAdminDemoData();
    setConfirmReset(false);
    setDraft(null);
    setSaved(false);
  }

  function signOut() {
    signOutDemoAdmin();
    router.replace("/admin/login");
  }

  return (
    <AdminShell
      active="settings"
      title="Settings"
      description="Store profile, team permissions and the local demo data controls."
    >
      <section aria-label="Store profile" className="grid gap-3 xl:grid-cols-[1.2fr_.8fr]">
        <AdminCard className="overflow-hidden">
          <AdminCardHeader title="Store profile" description="Used by the admin header, receipts and delivery rules" actions={<AdminButton onClick={saveSettings}><Save size={14} /> Save</AdminButton>} />
          <div className="space-y-4 px-4 py-4 sm:px-5">
            {settingsErrors.length ? (
              <ul className="space-y-1 rounded-xl border border-[#f3d2d4] bg-[#fff6f6] px-3 py-2 text-[9px] font-semibold text-[#c9424a]">
                {settingsErrors.map((error) => <li key={error}>{error}</li>)}
              </ul>
            ) : null}
            {saved ? (
              <p className="flex items-center gap-1.5 rounded-xl bg-[#eef8e6] px-3 py-2 text-[9px] font-bold text-[#3f8c22]"><Check size={12} /> Settings saved to this browser.</p>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField label="Store name">
                <AdminInput value={form.storeName} onChange={(event) => update("storeName", event.target.value)} aria-label="Store name" />
              </AdminField>
              <AdminField label="Support email">
                <AdminInput value={form.supportEmail} onChange={(event) => update("supportEmail", event.target.value)} aria-label="Support email" />
              </AdminField>
              <AdminField label="Support phone">
                <AdminInput value={form.supportPhone} onChange={(event) => update("supportPhone", event.target.value)} aria-label="Support phone" />
              </AdminField>
              <AdminField label="USD rate (Ks per $1)">
                <AdminInput value={String(form.usdRateKs)} onChange={(event) => update("usdRateKs", Number(event.target.value) || 0)} inputMode="numeric" aria-label="USD rate" />
              </AdminField>
              <AdminField label="Low-stock threshold" hint="Inventory flags rows at or below this">
                <AdminInput value={String(form.lowStockThreshold)} onChange={(event) => update("lowStockThreshold", Number(event.target.value) || 0)} inputMode="numeric" aria-label="Low stock threshold" />
              </AdminField>
              <AdminField label="Stock follows a sale" hint="Off: Inventory is blank-garment stock and sales leave it alone. On: a paid order takes its pieces and a refund puts them back.">
                <label className="flex items-center gap-2 text-[11px] font-semibold">
                  <input
                    type="checkbox"
                    aria-label="Deduct stock on sale"
                    checked={form.deductStockOnSale}
                    onChange={(event) => update("deductStockOnSale", event.target.checked)}
                  />
                  Deduct the pieces of a paid order
                </label>
              </AdminField>
            </div>
            <AdminField label="Default print desk note">
              <AdminTextarea value={form.orderNoteTemplate} onChange={(event) => update("orderNoteTemplate", event.target.value)} rows={2} aria-label="Default order note" />
            </AdminField>
          </div>
        </AdminCard>

        <div className="space-y-3">
          <AdminCard className="overflow-hidden">
            <AdminCardHeader title="Demo data" description="Everything on this page lives in your browser" />
            <div className="space-y-3 px-4 py-4 sm:px-5">
              <p className="rounded-xl bg-[#f7f9fb] px-3 py-2 text-[9px] leading-4 text-[#87909b]">
                Orders, products, stock, designs, promotions and team members are stored under
                <code className="mx-1 rounded bg-white px-1 py-0.5 font-mono text-[8px]">mh-fashion-admin-demo-data-v1</code>
                in local storage. This preview is not a security boundary — Supabase Auth and server-side role checks replace it before real admin data is exposed.
              </p>
              <div className="flex flex-wrap gap-2">
                <AdminButton variant={confirmReset ? "danger" : "secondary"} onClick={resetData}><RefreshCw size={14} /> {confirmReset ? "Confirm reset" : "Reset demo data"}</AdminButton>
                <AdminButton variant="secondary" onClick={signOut}><X size={14} /> Sign out</AdminButton>
              </div>
            </div>
          </AdminCard>

          <AdminCrashLogCard />

          <AdminCard className="overflow-hidden">
            <AdminCardHeader title="Access model" description="How the plan splits admin work" />
            <ul className="space-y-2 px-4 py-4 text-[9px] leading-4 text-[#87909b] sm:px-5">
              <li><strong className="text-[#394250]">Super Admin</strong> — full access, creates every other admin and assigns modules.</li>
              <li><strong className="text-[#394250]">Post Admin</strong> — guide posts, designs and content.</li>
              <li><strong className="text-[#394250]">Print Admin</strong> — order queue, production export and stock.</li>
              <li><strong className="text-[#394250]">Support</strong> — read-only customer and order context.</li>
            </ul>
          </AdminCard>
        </div>
      </section>

      <AdminCard className="mt-3 overflow-hidden">
        <AdminCardHeader
          title="Team and permissions"
          description="Super Admin assigns the module checklist for each teammate"
          actions={<AdminButton onClick={startCreateMember}><UserPlus size={14} /> Add member</AdminButton>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[10px]">
            <thead className="bg-[#fafbfc] text-[9px] font-semibold text-[#828c99]">
              <tr>
                <th className="px-4 py-2.5 font-semibold sm:px-5">Member</th>
                <th className="px-3 py-2.5 font-semibold">Role</th>
                <th className="px-3 py-2.5 font-semibold">Modules</th>
                <th className="px-3 py-2.5 font-semibold">State</th>
                <th className="px-4 py-2.5 text-right font-semibold sm:px-5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f2f4]">
              {data.team.length ? data.team.map((member) => (
                <tr key={member.id} className="hover:bg-[#fafbfc]">
                  <td className="px-4 py-2.5 sm:px-5">
                    <span className="block font-bold text-[#303844]">{member.name}</span>
                    <span className="mt-0.5 block text-[8px] text-[#919aa6]">{member.email}</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <AdminBadge tone={member.role === "Super Admin" ? "violet" : "slate"}>{member.role}</AdminBadge>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex max-w-[260px] flex-wrap gap-1">
                      {member.role === "Super Admin"
                        ? <span className="text-[9px] font-semibold text-[#5c6673]">All modules</span>
                        : member.modules.length
                          ? member.modules.map((moduleId) => <span key={moduleId} className="rounded-md bg-[#eef1f5] px-1.5 py-0.5 text-[8px] font-semibold text-[#5c6673]">{moduleId}</span>)
                          : <span className="text-[9px] text-[#c9424a]">No modules</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">{member.active ? <AdminBadge tone="green">Active</AdminBadge> : <AdminBadge tone="red">Suspended</AdminBadge>}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right sm:px-5">
                    <div className="inline-flex items-center gap-1.5">
                      <AdminButton compact variant="secondary" onClick={() => startEditMember(member)} aria-label={`Edit ${member.name}`}>Edit</AdminButton>
                      <AdminButton compact variant="ghost" onClick={() => toggleMemberActive(member)} aria-label={`${member.active ? "Suspend" : "Reactivate"} ${member.name}`}>{member.active ? "Suspend" : "Reactivate"}</AdminButton>
                      <AdminButton compact variant="danger" onClick={() => removeMember(member)} aria-label={`Remove ${member.name}`}><Trash2 size={12} /> {confirmRemoveId === member.id ? "Confirm" : "Remove"}</AdminButton>
                    </div>
                  </td>
                </tr>
              )) : <tr><td colSpan={5}><AdminEmpty title="No team members" description="Add a teammate to assign modules." /></td></tr>}
            </tbody>
          </table>
        </div>
      </AdminCard>

      <AdminDrawer
        open={Boolean(memberId)}
        title={memberId === "new" ? "Add team member" : "Edit team member"}
        description="Module access applies the plan's per-admin permission checklist."
        onClose={closeMember}
        footer={(
          <div className="flex items-center justify-end gap-2">
            <AdminButton variant="secondary" onClick={closeMember}>Cancel</AdminButton>
            <AdminButton onClick={saveMember}><ShieldCheck size={14} /> Save member</AdminButton>
          </div>
        )}
      >
        <div className="space-y-4">
          {memberErrors.length ? (
            <ul className="space-y-1 rounded-xl border border-[#f3d2d4] bg-[#fff6f6] px-3 py-2 text-[9px] font-semibold text-[#c9424a]">
              {memberErrors.map((error) => <li key={error}>{error}</li>)}
            </ul>
          ) : null}
          <AdminField label="Name">
            <AdminInput value={memberDraft.name} onChange={(event) => setMemberDraft({ ...memberDraft, name: event.target.value })} aria-label="Member name" />
          </AdminField>
          <AdminField label="Email">
            <AdminInput value={memberDraft.email} onChange={(event) => setMemberDraft({ ...memberDraft, email: event.target.value })} aria-label="Member email" />
          </AdminField>
          <AdminField label="Role">
            <AdminSelect value={memberDraft.role} onChange={(event) => setMemberDraft({ ...memberDraft, role: event.target.value as AdminTeamRole })} aria-label="Member role">
              {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
            </AdminSelect>
          </AdminField>
          <div>
            <p className="mb-1 text-[10px] font-bold text-[#5b6674]">Modules</p>
            <div className="grid grid-cols-2 gap-1.5">
              {ADMIN_MODULES.map((module) => {
                const disabled = memberDraft.role === "Super Admin";
                const checked = disabled || memberDraft.modules.includes(module.id);
                return (
                  <label key={module.id} className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[9px] font-semibold ${checked ? "border-[#bfe0ab] bg-[#f3f9ee] text-[#3f8c22]" : "border-[#e4e8ed] bg-white text-[#6c7683]"} ${disabled ? "opacity-70" : "cursor-pointer"}`}>
                    <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggleModule(module.id)} aria-label={`${module.label} access`} className="h-3 w-3 accent-[#4cae22]" />
                    {module.label}
                  </label>
                );
              })}
            </div>
            {memberDraft.role === "Super Admin" ? <p className="mt-1 text-[9px] text-[#98a1ac]">Super Admins always have every module.</p> : null}
          </div>
        </div>
      </AdminDrawer>
    </AdminShell>
  );
}
