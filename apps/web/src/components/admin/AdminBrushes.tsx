"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Brush, CircleAlert, Pencil, Plus, Save, Trash2 } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import {
  AdminBadge, AdminButton, AdminCard, AdminCardHeader, AdminDrawer, AdminEmpty, AdminField,
  AdminInput, AdminSelect, AdminStat,
} from "@/components/admin/AdminUi";
import { updateAdminData, useAdminDemoData } from "@/lib/admin-demo-store";
import { ADMIN_BRUSH_SHELVES, ADMIN_BRUSH_TIPS, type AdminBrush, type AdminBrushTip } from "@/lib/admin-demo-data";
import {
  brushDraftFrom, brushFromDraft, brushTextureKey, enabledBrushCount, moveBrush, removeBrush,
  toggleBrush, upsertBrush, validateBrushDraft, type AdminBrushDraft,
} from "@/lib/admin-brushes";

function TipSample({ brush }: { brush: Pick<AdminBrush, "tip" | "size" | "softness" | "opacity"> }) {
  const height = 26;
  const width = Math.max(18, Math.min(46, Math.round(brush.size / 3)));
  const blur = brush.softness > 0 ? `blur(${(brush.softness * 2.4).toFixed(1)}px)` : undefined;
  return (
    <svg aria-hidden="true" width={width} height={height} viewBox={`0 0 ${width} ${height}`} data-brush-sample={brush.tip}>
      {brush.tip === "square" ? (
        <rect x={2} y={3} width={width - 4} height={height - 6} rx={2} fill="#2c3644" opacity={brush.opacity} style={{ filter: blur }} />
      ) : (
        <ellipse cx={width / 2} cy={height / 2} rx={(width - 6) / 2} ry={(height - 8) / 2} fill="#2c3644" opacity={brush.opacity} style={{ filter: blur }} />
      )}
    </svg>
  );
}

const TIP_LABELS: Record<AdminBrushTip, string> = { round: "Round", square: "Square" };

export default function AdminBrushes() {
  const data = useAdminDemoData();
  const brushes = data.brushes;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AdminBrushDraft>(brushDraftFrom());
  const [problems, setProblems] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const editing = editingId ? brushes.find((brush) => brush.id === editingId) ?? null : null;
  const drawerOpen = editingId !== null;
  const enabled = enabledBrushCount(brushes);

  function update<K extends keyof AdminBrushDraft>(key: K, value: AdminBrushDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setProblems([]);
  }

  function startCreate() {
    setEditingId("new");
    setDraft(brushDraftFrom());
    setProblems([]);
    setMessage("");
  }

  function startEdit(brush: AdminBrush) {
    setEditingId(brush.id);
    setDraft(brushDraftFrom(brush));
    setProblems([]);
    setMessage("");
  }

  function closeDrawer() {
    setEditingId(null);
    setProblems([]);
  }

  function save() {
    const issues = validateBrushDraft(draft, brushes, editing ? editing.id : null);
    setProblems(issues);
    if (issues.length) return;
    const brush = brushFromDraft(draft, editing ?? undefined);
    updateAdminData((current) => upsertBrush(current, brush));
    setMessage(editing ? `${brush.name} saved.` : `${brush.name} added.`);
    setEditingId(null);
  }

  function flip(brush: AdminBrush) {
    updateAdminData((current) => toggleBrush(current, brush.id));
    setMessage(`${brush.name} ${brush.enabled ? "switched off" : "switched on"}.`);
  }

  function shift(brush: AdminBrush, delta: number) {
    updateAdminData((current) => moveBrush(current, brush.id, delta));
    setMessage(`${brush.name} moved ${delta < 0 ? "up" : "down"} the picker.`);
  }

  function remove(brush: AdminBrush) {
    if (confirmRemoveId !== brush.id) {
      setConfirmRemoveId(brush.id);
      setMessage("");
      return;
    }
    updateAdminData((current) => removeBrush(current, brush.id));
    setConfirmRemoveId(null);
    setMessage(`${brush.name} removed.`);
  }

  return (
    <AdminShell
      active="brushes"
      title="Brush management"
      description="The brushes the editor picker offers. One grayscale texture per brush, at the bucket key shown on each row."
      actions={
        <AdminButton onClick={startCreate} data-brush-add>
          <Plus size={14} /> Add brush
        </AdminButton>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <AdminStat label="Brushes" value={String(brushes.length)} hint="Picker order is the list order" icon={<Brush size={18} />} />
        <AdminStat label="Switched on" value={`${enabled} of ${brushes.length}`} hint="A brush switched off stays in the list" />
        <AdminStat label="Shelves used" value={String(new Set(brushes.map((brush) => brush.shelf)).size)} hint={ADMIN_BRUSH_SHELVES.join(" · ")} />
      </div>

      {message ? (
        <p role="status" className="mt-3 rounded-xl bg-[#f1f8ec] px-3 py-2 text-[11px] font-semibold text-[#3f7d24]">
          {message}
        </p>
      ) : null}

      <AdminCard className="mt-4 overflow-hidden">
        <AdminCardHeader
          title="Brush library"
          description="R2 is not connected, so each row shows the key the texture will be uploaded to."
        />
        {brushes.length === 0 ? (
          <div className="p-4">
            <AdminEmpty title="No brushes yet" description="Add the first brush to start the picker." />
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-[#f7f9fb] text-[9px] uppercase tracking-wide text-[#8d96a2]">
                  <tr>
                    <th className="px-4 py-2 font-bold">Preview</th>
                    <th className="px-4 py-2 font-bold">Brush</th>
                    <th className="px-4 py-2 font-bold">Shelf</th>
                    <th className="px-4 py-2 font-bold">Tip</th>
                    <th className="px-4 py-2 font-bold">Size</th>
                    <th className="px-4 py-2 font-bold">Spacing</th>
                    <th className="px-4 py-2 font-bold">Opacity · softness</th>
                    <th className="px-4 py-2 font-bold">Status</th>
                    <th className="px-4 py-2 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {brushes.map((brush) => (
                    <tr key={brush.id} data-brush-row={brush.id} className="border-t border-[#eef1f4] align-middle">
                      <td className="px-4 py-2">
                        <TipSample brush={brush} />
                      </td>
                      <td className="px-4 py-2">
                        <p className="font-bold text-[#202733]">{brush.name}</p>
                        <p className="text-[9px] text-[#8d96a2]">{brushTextureKey(brush.id)}</p>
                      </td>
                      <td className="px-4 py-2 text-[#4c5563]">{brush.shelf}</td>
                      <td className="px-4 py-2 text-[#4c5563]">{TIP_LABELS[brush.tip]}</td>
                      <td className="px-4 py-2 text-[#4c5563]">{brush.size}</td>
                      <td className="px-4 py-2 text-[#4c5563]">{brush.spacing}%</td>
                      <td className="px-4 py-2 text-[#4c5563]">{Math.round(brush.opacity * 100)}% · {Math.round(brush.softness * 100)}%</td>
                      <td className="px-4 py-2">
                        <AdminBadge tone={brush.enabled ? "green" : "slate"}>{brush.enabled ? "On" : "Off"}</AdminBadge>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-1.5">
                          <AdminButton compact variant="secondary" aria-label={`Edit ${brush.name}`} onClick={() => startEdit(brush)}>
                            <Pencil size={12} /> Edit
                          </AdminButton>
                          <AdminButton compact variant="secondary" aria-label={`${brush.enabled ? "Switch off" : "Switch on"} ${brush.name}`} onClick={() => flip(brush)}>
                            {brush.enabled ? "Off" : "On"}
                          </AdminButton>
                          <AdminButton compact variant="secondary" aria-label={`Move ${brush.name} up`} onClick={() => shift(brush, -1)}>
                            <ArrowUp size={12} />
                          </AdminButton>
                          <AdminButton compact variant="secondary" aria-label={`Move ${brush.name} down`} onClick={() => shift(brush, 1)}>
                            <ArrowDown size={12} />
                          </AdminButton>
                          <AdminButton
                            compact
                            variant={confirmRemoveId === brush.id ? "danger" : "secondary"}
                            aria-label={confirmRemoveId === brush.id ? `Confirm remove ${brush.name}` : `Remove ${brush.name}`}
                            onClick={() => remove(brush)}
                          >
                            <Trash2 size={12} /> {confirmRemoveId === brush.id ? "Confirm" : ""}
                          </AdminButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-3 lg:hidden">
              {brushes.map((brush) => (
                <div key={brush.id} data-brush-card={brush.id} className="rounded-xl border border-[#eef1f4] p-3">
                  <div className="flex items-start gap-3">
                    <TipSample brush={brush} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-bold text-[#202733]">{brush.name}</p>
                      <p className="truncate text-[9px] text-[#8d96a2]">{brushTextureKey(brush.id)}</p>
                      <p className="mt-1 text-[10px] text-[#4c5563]">
                        {brush.shelf} · {TIP_LABELS[brush.tip]} · {brush.size}px · {brush.spacing}% spacing
                      </p>
                      <p className="text-[10px] text-[#4c5563]">
                        {Math.round(brush.opacity * 100)}% opacity · {Math.round(brush.softness * 100)}% soft
                      </p>
                    </div>
                    <AdminBadge tone={brush.enabled ? "green" : "slate"}>{brush.enabled ? "On" : "Off"}</AdminBadge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <AdminButton compact variant="secondary" aria-label={`Edit ${brush.name}`} onClick={() => startEdit(brush)}>
                      <Pencil size={12} /> Edit
                    </AdminButton>
                    <AdminButton compact variant="secondary" aria-label={`${brush.enabled ? "Switch off" : "Switch on"} ${brush.name}`} onClick={() => flip(brush)}>
                      {brush.enabled ? "Switch off" : "Switch on"}
                    </AdminButton>
                    <AdminButton compact variant="secondary" aria-label={`Move ${brush.name} up`} onClick={() => shift(brush, -1)}>
                      <ArrowUp size={12} />
                    </AdminButton>
                    <AdminButton compact variant="secondary" aria-label={`Move ${brush.name} down`} onClick={() => shift(brush, 1)}>
                      <ArrowDown size={12} />
                    </AdminButton>
                    <AdminButton
                      compact
                      variant={confirmRemoveId === brush.id ? "danger" : "secondary"}
                      aria-label={confirmRemoveId === brush.id ? `Confirm remove ${brush.name}` : `Remove ${brush.name}`}
                      onClick={() => remove(brush)}
                    >
                      <Trash2 size={12} /> {confirmRemoveId === brush.id ? "Confirm" : ""}
                    </AdminButton>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </AdminCard>

      <AdminDrawer
        open={drawerOpen}
        title={editing ? `Edit ${editing.name}` : "New brush"}
        description="The id is the bucket folder, so it cannot change once the brush exists."
        onClose={closeDrawer}
        footer={
          <div className="flex justify-end gap-2">
            <AdminButton variant="secondary" onClick={closeDrawer}>Cancel</AdminButton>
            <AdminButton onClick={save} data-brush-save>
              <Save size={14} /> Save
            </AdminButton>
          </div>
        }
      >
        {problems.length ? (
          <ul role="alert" className="mb-3 space-y-1 rounded-xl bg-[#fff6f6] px-3 py-2 text-[10px] font-semibold text-[#c9424a]">
            {problems.map((problem) => (
              <li key={problem} className="flex gap-1.5">
                <CircleAlert size={12} className="mt-0.5 shrink-0" /> {problem}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="grid gap-3">
          <AdminField label="Id" hint={draft.id ? brushTextureKey(draft.id) : "Lowercase words joined by -"}>
            <AdminInput
              value={draft.id}
              onChange={(event) => update("id", event.target.value)}
              aria-label="Brush id"
              placeholder="ink-round"
              disabled={Boolean(editing)}
            />
          </AdminField>
          <AdminField label="Name">
            <AdminInput value={draft.name} onChange={(event) => update("name", event.target.value)} aria-label="Brush name" placeholder="Ink · round" />
          </AdminField>
          <div className="grid grid-cols-2 gap-3">
            <AdminField label="Shelf">
              <AdminSelect value={draft.shelf} onChange={(event) => update("shelf", event.target.value as AdminBrushDraft["shelf"])} aria-label="Brush shelf">
                {ADMIN_BRUSH_SHELVES.map((shelf) => (
                  <option key={shelf} value={shelf}>{shelf}</option>
                ))}
              </AdminSelect>
            </AdminField>
            <AdminField label="Tip">
              <AdminSelect value={draft.tip} onChange={(event) => update("tip", event.target.value as AdminBrushTip)} aria-label="Brush tip">
                {ADMIN_BRUSH_TIPS.map((tip) => (
                  <option key={tip} value={tip}>{TIP_LABELS[tip]}</option>
                ))}
              </AdminSelect>
            </AdminField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <AdminField label="Size" hint="4 to 400">
              <AdminInput type="number" value={String(draft.size)} onChange={(event) => update("size", Number(event.target.value) || 0)} aria-label="Brush size" />
            </AdminField>
            <AdminField label="Spacing" hint="Percent, 1 to 200">
              <AdminInput type="number" value={String(draft.spacing)} onChange={(event) => update("spacing", Number(event.target.value) || 0)} aria-label="Brush spacing" />
            </AdminField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <AdminField label="Opacity" hint="0.05 to 1">
              <AdminInput type="number" step="0.05" value={String(draft.opacity)} onChange={(event) => update("opacity", Number(event.target.value) || 0)} aria-label="Brush opacity" />
            </AdminField>
            <AdminField label="Softness" hint="0 is hard, 1 is soft">
              <AdminInput type="number" step="0.05" value={String(draft.softness)} onChange={(event) => update("softness", Number(event.target.value) || 0)} aria-label="Brush softness" />
            </AdminField>
          </div>
          <div className="rounded-xl border border-[#edf0f3] bg-[#fafbfc] p-3">
            <p className="text-[9px] font-bold uppercase tracking-wide text-[#828c99]">Preview</p>
            <div className="mt-2 flex items-center gap-3">
              <TipSample brush={{ tip: draft.tip, size: draft.size, softness: draft.softness, opacity: draft.opacity }} />
              <p className="text-[10px] text-[#87909b]">
                {TIP_LABELS[draft.tip]} · {draft.size}px · {draft.spacing}% spacing · {Math.round(draft.opacity * 100)}% opacity · {Math.round(draft.softness * 100)}% soft
              </p>
            </div>
          </div>
        </div>
      </AdminDrawer>
    </AdminShell>
  );
}
