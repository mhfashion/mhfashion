"use client";

import { useMemo, useState } from "react";
import { Download, Eye, EyeOff, Layers3, Search, ShieldAlert, Trash2 } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import { AdminBadge, AdminButton, AdminCard, AdminDrawer, AdminEmpty, AdminField, AdminInput, AdminStat, AdminTextarea, type AdminTone } from "@/components/admin/AdminUi";
import { getDemoAdminSession } from "@/lib/admin-demo-auth";
import { updateAdminData, useAdminDemoData } from "@/lib/admin-demo-store";
import {
  designTakedownsFor, formatAdminDate, recordDesignTakedown, removeDesign, setDesignStatus,
  type AdminDesign, type AdminDesignStatus,
} from "@/lib/admin-demo-data";

const STATUSES: AdminDesignStatus[] = ["Published", "Draft", "Hidden"];

const STATUS_TONES: Record<AdminDesignStatus, AdminTone> = {
  Published: "green",
  Draft: "amber",
  Hidden: "slate",
};

export default function AdminDesigns() {
  const data = useAdminDemoData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdminDesignStatus | "All">("All");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [takedownId, setTakedownId] = useState<string | null>(null);
  const [claimant, setClaimant] = useState("");
  const [claimNote, setClaimNote] = useState("");
  const [takedownMessage, setTakedownMessage] = useState("");

  const query = search.trim().toLowerCase();
  const visible = useMemo(() => data.designs
    .filter((design) => statusFilter === "All" || design.status === statusFilter)
    .filter((design) => `${design.name} ${design.author} ${design.product}`.toLowerCase().includes(query))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [data.designs, statusFilter, query]);

  const downloads = data.designs.reduce((total, design) => total + design.downloads, 0);
  const published = data.designs.filter((design) => design.status === "Published").length;

  function setStatus(design: AdminDesign, status: AdminDesignStatus) {
    updateAdminData((current) => setDesignStatus(current, design.id, status));
  }

  const takedownDesign = data.designs.find((design) => design.id === takedownId) ?? null;
  const takedownRecords = takedownDesign ? designTakedownsFor(data, takedownDesign.id) : [];

  function openTakedown(design: AdminDesign) {
    setTakedownId(design.id);
    setClaimant("");
    setClaimNote("");
    setTakedownMessage("");
  }

  function submitTakedown() {
    if (!takedownDesign) return;
    if (!claimant.trim()) {
      setTakedownMessage("Record who made the claim.");
      return;
    }
    const admin = getDemoAdminSession()?.name ?? "Admin";
    updateAdminData((current) => recordDesignTakedown(current, {
      designId: takedownDesign.id,
      claimant,
      note: claimNote,
      admin,
    }));
    setClaimant("");
    setClaimNote("");
    setTakedownMessage(`${takedownDesign.name} is hidden and the claim is recorded. Paid orders continue to print.`);
  }

  function remove(design: AdminDesign) {
    if (confirmId !== design.id) {
      setConfirmId(design.id);
      return;
    }
    updateAdminData((current) => removeDesign(current, design.id));
    setConfirmId(null);
  }

  return (
    <AdminShell
      active="designs"
      title="Designs"
      description="Artwork created in the editor. Publish, hide or remove designs from the community gallery."
      search={(
        <label className="flex h-10 w-full max-w-[420px] items-center gap-2.5 rounded-full border border-[#e6e9ed] bg-[#f8f9fb] px-3.5 text-[#8c95a1] focus-within:border-[#a5d972] focus-within:bg-white">
          <Search size={16} className="shrink-0" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search designs" placeholder="Search design, author or product..." className="min-w-0 flex-1 bg-transparent text-[11px] text-[#252c37] outline-none placeholder:text-[#9da5af]" />
        </label>
      )}
    >
      <section aria-label="Design metrics" className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Designs" value={String(data.designs.length)} hint="In the local demo library" icon={<Layers3 size={21} />} />
        <AdminStat label="Published" value={String(published)} hint="Visible in the gallery" icon={<Eye size={21} />} />
        <AdminStat label="Drafts" value={String(data.designs.filter((design) => design.status === "Draft").length)} hint="Not visible to shoppers" icon={<EyeOff size={21} />} />
        <AdminStat label="Downloads" value={downloads.toLocaleString("en-US")} hint="Sample count across designs" icon={<Download size={21} />} />
      </section>

      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter designs by status">
        {(["All", ...STATUSES] as (AdminDesignStatus | "All")[]).map((status) => {
          const count = status === "All" ? data.designs.length : data.designs.filter((design) => design.status === status).length;
          return (
            <button
              key={status}
              type="button"
              aria-pressed={statusFilter === status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-full border px-2.5 py-1 text-[9px] font-bold transition-colors ${statusFilter === status ? "border-[#4cae22] bg-[#eef8e6] text-[#3f8c22]" : "border-[#e4e8ed] bg-white text-[#6c7683] hover:bg-[#f7f9fb]"}`}
            >
              {status} <span className="ml-1 text-[8px] opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      <AdminCard className="mt-3 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[10px]">
            <thead className="bg-[#fafbfc] text-[9px] font-semibold text-[#828c99]">
              <tr>
                <th className="px-4 py-2.5 font-semibold sm:px-5">Design</th>
                <th className="px-3 py-2.5 font-semibold">Author</th>
                <th className="px-3 py-2.5 font-semibold">Product</th>
                <th className="px-3 py-2.5 font-semibold">Created</th>
                <th className="px-3 py-2.5 font-semibold">Downloads</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 text-right font-semibold sm:px-5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f2f4]">
              {visible.length ? visible.map((design) => (
                <tr key={design.id} className="hover:bg-[#fafbfc]">
                  <td className="px-4 py-2.5 sm:px-5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#e7f6d9] to-[#dbe9ff] text-[9px] font-black text-[#3f6a4a]">
                        {design.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
                      </span>
                      <span className="min-w-0 font-bold text-[#303844]">{design.name}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[#727d8a]">{design.author}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[#727d8a]">{design.product}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[#919aa6]">{formatAdminDate(design.createdAt)}</td>
                  <td className="px-3 py-2.5 tabular-nums text-[#505a68]">{design.downloads}</td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex flex-wrap items-center gap-1">
                      <AdminBadge tone={STATUS_TONES[design.status]}>{design.status}</AdminBadge>
                      {designTakedownsFor(data, design.id).length ? <AdminBadge tone="red">Claim</AdminBadge> : null}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right sm:px-5">
                    <div className="inline-flex items-center gap-1.5">
                      {design.status !== "Published" ? <AdminButton compact variant="secondary" onClick={() => setStatus(design, "Published")} aria-label={`Publish ${design.name}`}><Eye size={12} /> Publish</AdminButton> : null}
                      {design.status !== "Hidden" ? <AdminButton compact variant="ghost" onClick={() => setStatus(design, "Hidden")} aria-label={`Hide ${design.name}`}><EyeOff size={12} /> Hide</AdminButton> : null}
                      <AdminButton compact variant="ghost" onClick={() => openTakedown(design)} aria-label={`Record a takedown for ${design.name}`}><ShieldAlert size={12} /> Takedown</AdminButton>
                      <AdminButton compact variant="danger" onClick={() => remove(design)} aria-label={`Delete ${design.name}`}><Trash2 size={12} /> {confirmId === design.id ? "Confirm" : "Delete"}</AdminButton>
                    </div>
                  </td>
                </tr>
              )) : <tr><td colSpan={7}><AdminEmpty title="No designs match this filter" description="Try another status or search term." /></td></tr>}
            </tbody>
          </table>
        </div>
      </AdminCard>

      <AdminDrawer
        open={Boolean(takedownDesign)}
        title={takedownDesign ? `Takedown · ${takedownDesign.name}` : "Takedown"}
        description="Plan §8.1: accept the claim, hide the design and keep a short record."
        onClose={() => setTakedownId(null)}
        footer={(
          <div className="flex justify-end gap-1.5">
            <AdminButton variant="ghost" onClick={() => setTakedownId(null)}>Close</AdminButton>
            <AdminButton onClick={submitTakedown}><ShieldAlert size={13} /> Hide and record</AdminButton>
          </div>
        )}
      >
        <div className="space-y-3">
          <AdminField label="Who made the claim" hint="Name or contact email from the claim channel.">
            <AdminInput value={claimant} onChange={(event) => setClaimant(event.target.value)} aria-label="Claimant" placeholder="e.g. Studio Aye / legal@studioaye.com" />
          </AdminField>
          <AdminField label="What they claimed" hint="Kept in the record only; never shown to shoppers.">
            <AdminTextarea rows={3} value={claimNote} onChange={(event) => setClaimNote(event.target.value)} aria-label="Claim note" placeholder="The floral line art matches their 2025 print." />
          </AdminField>
          <p className="rounded-xl bg-[#f6fbf1] px-3 py-2 text-[10px] font-semibold text-[#3f8c22]">
            The design is hidden from the gallery and the editor. Orders that are already paid still print and ship — the owner confirmed this on 2026-11-21.
          </p>
          {takedownMessage ? <p role="status" className="text-[10px] font-semibold text-[#3f8c22]">{takedownMessage}</p> : null}
          <div>
            <h3 className="mb-1 text-[10px] font-bold text-[#3c4553]">Record for this design</h3>
            {takedownRecords.length ? (
              <ul className="space-y-1.5">
                {takedownRecords.map((record) => (
                  <li key={record.id} className="rounded-xl border border-[#f0f2f4] px-3 py-2 text-[10px] text-[#6c7683]">
                    <span className="block font-bold text-[#3c4553]">{record.claimant}</span>
                    {record.note ? <span className="block">{record.note}</span> : null}
                    <span className="block text-[9px] text-[#98a1ac]">{record.admin} · {new Date(record.at).toLocaleString("en-GB", { timeZone: "Asia/Yangon" })}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-[10px] text-[#98a1ac]">No claim recorded yet.</p>}
          </div>
        </div>
      </AdminDrawer>
    </AdminShell>
  );
}
