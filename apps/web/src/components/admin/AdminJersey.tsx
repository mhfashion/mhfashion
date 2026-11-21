"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Download, ImageOff, Plus, Ruler, Shirt, Trash2 } from "lucide-react";
import { AdminButton, AdminCard, AdminEmpty, AdminInput, AdminStat } from "@/components/admin/AdminUi";
import { updateAdminData, useAdminDemoData } from "@/lib/admin-demo-store";
import { JERSEY_PANEL_KEYS, type JerseyPanelKey, type JerseyPoint, type JerseyStyle } from "@/lib/admin-demo-data";
import {
  CORNER_LABELS, MIN_PANEL_AREA, PANEL_LABELS, completePanels, duplicateStyle, jerseyStyles, mappingZonesJson,
  missingPanels, panelOf, panelPath, panelsForView, quadArea, removeStyle, saveStyle, styleIssues,
} from "@/lib/admin-jersey";

const PANEL_TONE = "rgba(76,174,34,0.18)";
const PANEL_TONE_SELECTED = "rgba(76,174,34,0.38)";

function ViewPreview({ style, view, selected, onSelect }: {
  style: JerseyStyle;
  view: "front" | "back";
  selected: JerseyPanelKey;
  onSelect: (key: JerseyPanelKey) => void;
}) {
  const panels = panelsForView(style, view);
  return (
    <div className="rounded-xl border border-[#e4e8ed] bg-white p-2">
      <p className="mb-1 text-[9px] font-bold uppercase tracking-wide text-[#828c99]">{view === "front" ? "Front" : "Back"} zones</p>
      <svg viewBox="0 0 100 100" role="img" aria-label={`${style.name} ${view} panel zones`} className="block aspect-square w-full rounded-lg bg-[#f7f9fa]">
        <path
          d="M35 12 L42 10 Q50 16 58 10 L65 12 L74 20 L70 34 L66 32 L66 88 Q50 91 34 88 L34 32 L30 34 L26 20 Z"
          fill="#eef1f3"
          stroke="#d7dde2"
          strokeWidth={0.6}
          pointerEvents="none"
        />
        {panels.map((panel) => (
          <path
            key={panel.key}
            d={panelPath(panel)}
            data-panel={panel.key}
            fill={panel.key === selected ? PANEL_TONE_SELECTED : PANEL_TONE}
            stroke={panel.key === selected ? "#3f8c22" : "#4cae22"}
            strokeWidth={panel.key === selected ? 1.2 : 0.7}
            onClick={() => onSelect(panel.key)}
            className="cursor-pointer"
          />
        ))}
        {panels.map((panel) => (
          <text key={`${panel.key}-label`} x={panel.corners[0].x + 1} y={panel.corners[0].y + 5} fontSize={3.4} fill="#2b4a1c" pointerEvents="none">
            {PANEL_LABELS[panel.key]}
          </text>
        ))}
        {!panels.length ? <text x={50} y={52} fontSize={4} textAnchor="middle" fill="#98a1ac">No zones on this view</text> : null}
      </svg>
    </div>
  );
}

/** The jersey mapping body, so Posts can host it as a tab without a second sidebar. */
export function AdminJerseyPanel() {
  const data = useAdminDemoData();
  const styles = jerseyStyles(data);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const active = styles.find((style) => style.id === selectedId) ?? styles[0] ?? null;
  const [panelKey, setPanelKey] = useState<JerseyPanelKey>("front-left");
  const [message, setMessage] = useState("");
  const [issues, setIssues] = useState<string[]>([]);

  const activeIssues = useMemo(() => (active ? styleIssues(active, styles) : []), [active, styles]);
  const panel = active ? panelOf(active, panelKey) : undefined;

  function updateCorner(cornerIndex: number, axis: "x" | "y", raw: string) {
    if (!active || !panel) return;
    const value = Number(raw);
    if (Number.isNaN(value)) return;
    const corners = panel.corners.map((corner, index) => (index === cornerIndex ? { ...corner, [axis]: value } : corner)) as [JerseyPoint, JerseyPoint, JerseyPoint, JerseyPoint];
    updateAdminData((current) => {
      const style = jerseyStyles(current).find((entry) => entry.id === active.id);
      if (!style) return current;
      const next: JerseyStyle = {
        ...style,
        updatedAt: new Date().toISOString(),
        panels: style.panels.map((entry) => (entry.key === panelKey ? { ...entry, corners } : entry)),
      };
      // Corner edits save immediately so the preview and the export never disagree; only a quad
      // that breaks validation is held back, and its reason is shown.
      const check = styleIssues(next, jerseyStyles(current).map((entry) => (entry.id === next.id ? next : entry)));
      if (check.length) {
        setIssues(check);
        setMessage("");
        return current;
      }
      setIssues([]);
      setMessage(`${PANEL_LABELS[panelKey]} saved.`);
      return { ...current, jerseyStyles: jerseyStyles(current).map((entry) => (entry.id === next.id ? next : entry)) };
    });
  }

  function addStyle() {
    const draft = completePanels({
      id: `jersey-${Date.now().toString(36)}`,
      name: `MH Sport ${styles.length + 1}`,
      wornPhoto: null,
      panels: [],
      updatedAt: new Date().toISOString(),
    });
    let failed: string[] = [];
    updateAdminData((current) => {
      const result = saveStyle(current, draft);
      failed = result.issues;
      return result.data;
    });
    setIssues(failed);
    if (!failed.length) {
      setSelectedId(draft.id);
      setMessage(`${draft.name} added with default zones — move the corners into place.`);
    }
  }

  function removeActive() {
    if (!active) return;
    let failed: string[] = [];
    updateAdminData((current) => {
      const result = removeStyle(current, active.id);
      failed = result.issues;
      return result.data;
    });
    setIssues(failed);
    if (failed.length) setMessage("");
    else {
      setSelectedId(null);
      setMessage(`${active.name} removed.`);
    }
  }

  function duplicateActive() {
    if (!active) return;
    let failed: string[] = [];
    const name = `${active.name} copy`;
    updateAdminData((current) => {
      const result = duplicateStyle(current, active.id, name);
      failed = result.issues;
      return result.data;
    });
    setIssues(failed);
    if (!failed.length) setMessage(`${name} created.`);
  }

  function exportZones() {
    if (!active) return;
    const blob = new Blob([mappingZonesJson(active)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mapping_zones-${active.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const completeStyles = styles.filter((style) => styleIssues(style, styles).length === 0).length;

  return (
    <div data-jersey-panel>
      <p className="mb-2 text-[10px] text-[#808a97]">One worn photo and a quad per panel — the catalog preview and the post-edit mockup read the same zones.</p>
      <div className="flex flex-wrap justify-end gap-1.5">
        <AdminButton variant="secondary" onClick={addStyle} aria-label="Add a jersey style"><Plus size={13} /> Add style</AdminButton>
        <AdminButton variant="secondary" onClick={exportZones} disabled={!active} aria-label="Export mapping zones JSON"><Download size={13} /> mapping_zones.json</AdminButton>
      </div>
      <section aria-label="Jersey metrics" className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-3">
        <AdminStat label="Styles" value={String(styles.length)} hint={`${completeStyles} with every required panel`} icon={<Shirt size={21} />} />
        <AdminStat label="Panels" value={String(styles.reduce((total, style) => total + style.panels.length, 0))} hint="Quads across every style" icon={<Ruler size={21} />} />
        <AdminStat label="Smallest quad" value={`${Math.min(...styles.flatMap((style) => style.panels.map((entry) => Math.round(quadArea(entry.corners)))) || 0)} %²`} hint={`The floor is ${MIN_PANEL_AREA} %²`} icon={<Check size={21} />} />
      </section>

      {active ? (
        <AdminCard className="mt-3">
          <div className="flex flex-wrap items-center gap-1.5 border-b border-[#f0f2f4] px-3 py-2.5 sm:px-4">
            {styles.map((style) => {
              const bad = styleIssues(style, styles).length;
              return (
                <button
                  key={style.id}
                  type="button"
                  data-jersey-style={style.id}
                  aria-pressed={style.id === active.id}
                  onClick={() => { setSelectedId(style.id); setIssues([]); setMessage(""); }}
                  className={`h-9 rounded-full border px-3 text-[10px] font-bold ${style.id === active.id ? "border-[#4cae22] bg-[#eef8e6] text-[#3f8c22]" : "border-[#e4e8ed] bg-white text-[#6c7683]"}`}
                >
                  {style.name}
                  {bad ? <span className="ml-1 text-[#a33]">·{bad}</span> : null}
                </button>
              );
            })}
            <span className="ml-auto flex gap-1">
              <AdminButton compact variant="ghost" onClick={duplicateActive} aria-label="Duplicate this style"><Copy size={12} /> Duplicate</AdminButton>
              <AdminButton compact variant="ghost" onClick={removeActive} aria-label="Delete this style"><Trash2 size={12} /> Delete</AdminButton>
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid grid-cols-2 gap-3" data-jersey-preview>
              <ViewPreview style={active} view="front" selected={panelKey} onSelect={setPanelKey} />
              <ViewPreview style={active} view="back" selected={panelKey} onSelect={setPanelKey} />
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-bold text-[#3c4553]">Worn photo</p>
                <p data-jersey-photo className="mt-1 flex items-center gap-1.5 rounded-lg border border-dashed border-[#e4e8ed] bg-[#fafbfc] px-2.5 py-2 text-[9px] text-[#6c7683]">
                  {active.wornPhoto ? <><Check size={11} className="text-[#3f8c22]" /> {active.wornPhoto}</> : <><ImageOff size={11} /> No photo yet</>}
                </p>
                <p className="mt-1 text-[9px] text-[#98a1ac]">Uploads land in R2 (<code>jersey-mockups/&lt;id&gt;/worn_photo.png</code>); R2 is not connected yet, so the path is shown instead.</p>
              </div>

              <div>
                <p className="mb-1 text-[10px] font-bold text-[#3c4553]">Panel</p>
                <div className="flex flex-wrap gap-1">
                  {JERSEY_PANEL_KEYS.map((key) => {
                    const entry = panelOf(active, key);
                    return (
                      <button
                        key={key}
                        type="button"
                        data-panel-chip={key}
                        aria-pressed={key === panelKey}
                        onClick={() => setPanelKey(key)}
                        className={`h-8 rounded-full border px-2.5 text-[9px] font-bold ${key === panelKey ? "border-[#4cae22] bg-[#eef8e6] text-[#3f8c22]" : "border-[#e4e8ed] bg-white text-[#6c7683]"}`}
                      >
                        {PANEL_LABELS[key]}
                        {entry ? null : <span className="ml-1 text-[#a33]">·missing</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {panel ? (
                <div>
                  <p className="text-[10px] font-bold text-[#3c4553]">Corners (% of the photo)</p>
                  <div className="mt-1 space-y-1.5" data-corner-grid>
                    {panel.corners.map((corner, index) => (
                      <div key={CORNER_LABELS[index]} className="flex items-center gap-1.5">
                        <span className="w-[80px] shrink-0 whitespace-nowrap text-[9px] text-[#6c7683]">{CORNER_LABELS[index]}</span>
                        <AdminInput
                          aria-label={`${PANEL_LABELS[panel.key]} ${CORNER_LABELS[index]} x`}
                          type="number"
                          min={0}
                          max={100}
                          inputMode="decimal"
                          value={String(Math.round(corner.x * 100) / 100)}
                          onChange={(event) => updateCorner(index, "x", event.target.value)}
                        />
                        <AdminInput
                          aria-label={`${PANEL_LABELS[panel.key]} ${CORNER_LABELS[index]} y`}
                          type="number"
                          min={0}
                          max={100}
                          inputMode="decimal"
                          value={String(Math.round(corner.y * 100) / 100)}
                          onChange={(event) => updateCorner(index, "y", event.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="mt-1 text-[9px] text-[#98a1ac]">Quad area {Math.round(quadArea(panel.corners))} %² · saved on every valid change.</p>
                </div>
              ) : (
                <AdminEmpty title="This panel has no quad yet" description="Duplicate a style or reset the panels to get one." />
              )}

              {missingPanels(active).length ? (
                <p data-jersey-missing className="rounded-lg border border-[#f4e2c4] bg-[#fdf8ee] px-2.5 py-2 text-[9px] font-semibold text-[#8a6a1f]">
                  Missing: {missingPanels(active).map((key) => PANEL_LABELS[key]).join(", ")}
                </p>
              ) : (
                <p className="rounded-lg border border-[#d9ecc9] bg-[#f4fbf0] px-2.5 py-2 text-[9px] font-semibold text-[#3f8c22]">
                  Every required panel is mapped.
                </p>
              )}

              {activeIssues.length ? (
                <div role="alert" className="rounded-xl border border-[#f0d3d3] bg-[#fdf3f3] px-3 py-2">
                  {activeIssues.map((issue) => <p key={issue} className="text-[10px] font-semibold text-[#a33]">{issue}</p>)}
                </div>
              ) : null}
              {issues.length ? (
                <div role="alert" className="rounded-xl border border-[#f0d3d3] bg-[#fdf3f3] px-3 py-2">
                  {issues.map((issue) => <p key={issue} className="text-[10px] font-semibold text-[#a33]">{issue}</p>)}
                </div>
              ) : null}
              {message ? <p data-jersey-message role="status" className="text-[10px] font-semibold text-[#3f8c22]">{message}</p> : null}
            </div>
          </div>
        </AdminCard>
      ) : (
        <AdminCard className="mt-3"><AdminEmpty title="No jersey styles yet" description="Add a style to map its panels." /></AdminCard>
      )}

      <AdminCard className="mt-3">
        <div className="px-4 py-3">
          <h2 className="text-[11px] font-bold text-[#303844]">How the mapping is used</h2>
          <ul className="mt-1 space-y-1 text-[10px] text-[#4b5563]">
            <li>The catalog preview and the mockup after editing read the <span className="font-bold">same</span> zones, so a design never lands in two different places.</li>
            <li>Corners run top-left, top-right, bottom-right, bottom-left, as a percentage of the worn photo; MVP warps each panel with those four points.</li>
            <li><span className="font-bold">Front left, front right and back</span> are required — the other panels are optional.</li>
            <li>Export writes <code>mapping_zones.json</code> for <code>jersey-mockups/&lt;id&gt;/</code>; the photo and the JSON travel together.</li>
          </ul>
        </div>
      </AdminCard>
    </div>
  );
}
