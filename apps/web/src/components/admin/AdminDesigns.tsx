"use client";

import { useMemo, useState } from "react";
import { Download, Eye, EyeOff, Layers3, Search, Trash2 } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import { AdminBadge, AdminButton, AdminCard, AdminEmpty, AdminStat, type AdminTone } from "@/components/admin/AdminUi";
import { updateAdminData, useAdminDemoData } from "@/lib/admin-demo-store";
import {
  formatAdminDate, removeDesign, setDesignStatus,
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
                  <td className="px-3 py-2.5"><AdminBadge tone={STATUS_TONES[design.status]}>{design.status}</AdminBadge></td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right sm:px-5">
                    <div className="inline-flex items-center gap-1.5">
                      {design.status !== "Published" ? <AdminButton compact variant="secondary" onClick={() => setStatus(design, "Published")} aria-label={`Publish ${design.name}`}><Eye size={12} /> Publish</AdminButton> : null}
                      {design.status !== "Hidden" ? <AdminButton compact variant="ghost" onClick={() => setStatus(design, "Hidden")} aria-label={`Hide ${design.name}`}><EyeOff size={12} /> Hide</AdminButton> : null}
                      <AdminButton compact variant="danger" onClick={() => remove(design)} aria-label={`Delete ${design.name}`}><Trash2 size={12} /> {confirmId === design.id ? "Confirm" : "Delete"}</AdminButton>
                    </div>
                  </td>
                </tr>
              )) : <tr><td colSpan={7}><AdminEmpty title="No designs match this filter" description="Try another status or search term." /></td></tr>}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </AdminShell>
  );
}
