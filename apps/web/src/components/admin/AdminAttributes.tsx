"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, CircleAlert, Layers3, Plus, RotateCcw, Save, Tag, Trash2 } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import { AdminBadge, AdminButton, AdminCard, AdminDrawer, AdminEmpty, AdminField, AdminInput, AdminStat } from "@/components/admin/AdminUi";
import { updateAdminData, useAdminDemoData } from "@/lib/admin-demo-store";
import { type AdminAttributeDefinition, type AdminTshirtPostAttributeKey } from "@/lib/admin-demo-data";
import {
  applyChainPatch, attributeChain, chainIssues, chainUsage, moveAttribute, resetAttributeChain,
} from "@/lib/admin-attributes";

export default function AdminAttributes() {
  const data = useAdminDemoData();
  const chain = attributeChain(data);
  const issues = chainIssues(data);
  const [editing, setEditing] = useState<AdminTshirtPostAttributeKey | null>(null);
  const [label, setLabel] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");
  const [message, setMessage] = useState("");
  const [problems, setProblems] = useState<string[]>([]);

  const active = editing ? chain.find((attribute) => attribute.key === editing) ?? null : null;

  function openEditor(attribute: AdminAttributeDefinition) {
    setEditing(attribute.key);
    setLabel(attribute.label);
    setOptions([...attribute.options]);
    setNewOption("");
    setMessage("");
    setProblems([]);
  }

  function commit(nextLabel: string, nextOptions: string[], enabled: boolean) {
    if (!editing) return;
    let failed: string[] = [];
    updateAdminData((current) => {
      const result = applyChainPatch(current, editing, { label: nextLabel, options: nextOptions, enabled });
      failed = result.issues;
      return result.data;
    });
    setProblems(failed);
    if (!failed.length) setMessage("Saved.");
    return failed.length === 0;
  }

  function toggleEnabled(attribute: AdminAttributeDefinition) {
    let failed: string[] = [];
    updateAdminData((current) => {
      const result = applyChainPatch(current, attribute.key, { enabled: !attribute.enabled });
      failed = result.issues;
      return result.data;
    });
    setProblems(failed);
    setMessage(failed.length ? "" : `${attribute.label} ${attribute.enabled ? "switched off" : "switched on"}.`);
  }

  function addOption() {
    if (!editing) return;
    const value = newOption.trim();
    if (!value) return;
    if (options.includes(value)) {
      setProblems([`"${value}" is already an option.`]);
      return;
    }
    setOptions((current) => [...current, value]);
    setNewOption("");
    setProblems([]);
  }

  function removeOption(option: string) {
    const usage = chainUsage(data, editing as AdminTshirtPostAttributeKey, option);
    if (usage.pricedRows) {
      setProblems([`"${option}" still prices ${usage.pricedRows} row${usage.pricedRows === 1 ? "" : "s"} in ${usage.pricedPosts.join(", ")}. Change those prices first.`]);
      return;
    }
    setOptions((current) => current.filter((value) => value !== option));
    setProblems([]);
  }

  const enabledCount = chain.filter((attribute) => attribute.enabled).length;
  const pricedRows = data.tshirtPosts.reduce((total, post) => total + post.prices.length, 0);

  return (
    <AdminShell
      active="attributes"
      title="Attributes"
      description="The §4.1 chain: order, labels and the options every post and price row is built from."
      actions={(
        <AdminButton
          variant="secondary"
          onClick={() => {
            updateAdminData((current) => resetAttributeChain(current));
            setMessage("Chain reset to the built-in §4.1 list.");
            setProblems([]);
          }}
        >
          <RotateCcw size={13} /> Reset to built-in
        </AdminButton>
      )}
    >
      <section aria-label="Attribute metrics" className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-3">
        <AdminStat label="Attributes" value={String(chain.length)} hint={`${enabledCount} switched on`} icon={<Layers3 size={21} />} />
        <AdminStat label="Options" value={String(chain.reduce((total, attribute) => total + attribute.options.length, 0))} hint="Across the whole chain" icon={<Tag size={21} />} />
        <AdminStat label="Priced rows" value={String(pricedRows)} hint="Must keep their options" icon={<CircleAlert size={21} />} />
      </section>

      {issues.length ? (
        <div role="alert" className="mt-3 rounded-2xl border border-[#f0d3d3] bg-[#fdf3f3] px-4 py-3">
          {issues.map((issue) => (
            <p key={`${issue.key}-${issue.message}`} className="text-[10px] font-semibold text-[#a33]">{issue.message}</p>
          ))}
        </div>
      ) : null}

      <AdminCard className="mt-3">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-[10px]">
            <thead className="bg-[#fafbfc] text-[9px] font-semibold text-[#828c99]">
              <tr>
                <th className="px-4 py-2.5">Order</th>
                <th className="px-3 py-2.5">Attribute</th>
                <th className="px-3 py-2.5">Options</th>
                <th className="px-3 py-2.5">State</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f2f4]">
              {chain.map((attribute, index) => (
                <tr key={attribute.key} className="hover:bg-[#fafbfc]">
                  <td className="px-4 py-2 tabular-nums text-[#98a1ac]">{index + 1}</td>
                  <td className="px-3 py-2">
                    <span className="block font-bold text-[#303844]" data-attribute-label={attribute.key}>{attribute.label}</span>
                    <span className="block text-[9px] text-[#98a1ac]">{attribute.key}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="flex flex-wrap gap-1">
                      {attribute.options.map((option) => (
                        <span key={option} className="rounded-full bg-[#f3f5f7] px-2 py-0.5 text-[9px] font-semibold text-[#6c7683]">{option}</span>
                      ))}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <AdminBadge tone={attribute.enabled ? "green" : "slate"}>{attribute.enabled ? "On" : "Off"}</AdminBadge>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <button type="button" aria-label={`Move ${attribute.label} up`} disabled={index === 0} onClick={() => updateAdminData((current) => moveAttribute(current, attribute.key, -1))} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e4e8ed] text-[#6c7683] disabled:opacity-40"><ArrowUp size={12} /></button>
                      <button type="button" aria-label={`Move ${attribute.label} down`} disabled={index === chain.length - 1} onClick={() => updateAdminData((current) => moveAttribute(current, attribute.key, 1))} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e4e8ed] text-[#6c7683] disabled:opacity-40"><ArrowDown size={12} /></button>
                      <AdminButton compact variant="secondary" onClick={() => toggleEnabled(attribute)} aria-label={`${attribute.enabled ? "Switch off" : "Switch on"} ${attribute.label}`}>{attribute.enabled ? "Off" : "On"}</AdminButton>
                      <AdminButton compact variant="secondary" onClick={() => openEditor(attribute)} aria-label={`Edit ${attribute.label}`}>Edit</AdminButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {message ? <p role="status" className="border-t border-[#f0f2f4] px-4 py-2 text-[10px] font-semibold text-[#3f8c22]">{message}</p> : null}
        {problems.length && !editing ? (
          <div role="alert" className="border-t border-[#f0d3d3] bg-[#fdf3f3] px-4 py-2">
            {problems.map((problem) => <p key={problem} className="text-[10px] font-semibold text-[#a33]">{problem}</p>)}
          </div>
        ) : null}
      </AdminCard>

      <AdminCard className="mt-3">
        <div className="px-4 py-3">
          <h2 className="text-[11px] font-bold text-[#303844]">Cascade rules</h2>
          <p className="mt-1 text-[10px] text-[#6c7683]">These combinations do not exist, so no post, price row or order may contain them.</p>
          <ul className="mt-2 space-y-1 text-[10px] text-[#4b5563]">
            <li><span className="font-bold">Sublimation</span> is polyester only — Combed Cotton and Compact Combed Cotton cannot be sublimated.</li>
            <li><span className="font-bold">Polyester</span> offers only Interlock and Air Layer — Single Jersey is cotton-only.</li>
          </ul>
          <p className="mt-2 text-[10px] text-[#98a1ac]">
            The rules live in <code>lib/editor-attributes.ts</code> and are enforced by the pricing grid. The design editor keeps the built-in list until the editor is reopened (owner directive 1).
          </p>
        </div>
      </AdminCard>

      <p className="mt-3 text-[10px] text-[#98a1ac]">
        Editing the chain changes the labels and options that <Link href="/admin/posts" className="font-bold text-[#3f8c22]">new posts</Link> and the <Link href="/admin/pricing" className="font-bold text-[#3f8c22]">pricing grid</Link> offer. Existing posts keep the options they were published with.
      </p>

      <AdminDrawer
        open={Boolean(active)}
        title={active ? `Edit ${active.label}` : "Edit attribute"}
        description="Labels and options apply to new posts and the pricing grid."
        onClose={() => setEditing(null)}
        footer={(
          <div className="flex justify-end gap-1.5">
            <AdminButton variant="ghost" onClick={() => setEditing(null)}>Close</AdminButton>
            <AdminButton
              onClick={() => {
                if (commit(label, options, active?.enabled ?? true)) setEditing(null);
              }}
            >
              <Save size={13} /> Save attribute
            </AdminButton>
          </div>
        )}
      >
        {active ? (
          <div className="space-y-3">
            <AdminField label="Label" hint="Shown as the column header and on the post editor.">
              <AdminInput value={label} onChange={(event) => setLabel(event.target.value)} aria-label="Attribute label" />
            </AdminField>
            <div>
              <p className="mb-1 text-[10px] font-bold text-[#3c4553]">Options</p>
              <div className="flex flex-wrap gap-1.5" data-attribute-options>
                {options.map((option) => {
                  const usage = chainUsage(data, active.key, option);
                  return (
                    <span key={option} className="inline-flex items-center gap-1 rounded-full border border-[#e4e8ed] bg-white px-2 py-1 text-[10px] font-semibold text-[#4b5563]">
                      {option}
                      {usage.pricedRows ? <span className="text-[9px] text-[#98a1ac]">{usage.pricedRows} rows</span> : null}
                      <button type="button" aria-label={`Remove ${option}`} onClick={() => removeOption(option)} className="text-[#a33]"><Trash2 size={11} /></button>
                    </span>
                  );
                })}
              </div>
              <div className="mt-2 flex gap-1.5">
                <AdminInput value={newOption} onChange={(event) => setNewOption(event.target.value)} aria-label="New option" placeholder="Add an option" />
                <AdminButton variant="secondary" onClick={addOption} aria-label="Add option"><Plus size={12} /> Add</AdminButton>
              </div>
            </div>
            {problems.length ? (
              <div role="alert" className="rounded-xl border border-[#f0d3d3] bg-[#fdf3f3] px-3 py-2">
                {problems.map((problem) => <p key={problem} className="text-[10px] font-semibold text-[#a33]">{problem}</p>)}
              </div>
            ) : null}
            {message ? <p role="status" className="text-[10px] font-semibold text-[#3f8c22]">{message}</p> : null}
          </div>
        ) : <AdminEmpty title="No attribute selected" description="Pick a row and press Edit." />}
      </AdminDrawer>
    </AdminShell>
  );
}
