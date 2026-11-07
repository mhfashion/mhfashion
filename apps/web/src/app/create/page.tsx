"use client";

import { useState } from "react";
import { Check, Eye, Grid3X3, Heart, ImagePlus, Monitor, PackageOpen, Redo2, Shirt, Sparkles, Undo2, ZoomIn } from "lucide-react";
import Header from "@/components/Header";
import EditorLeftRail, { type PanelId, type ToolId } from "@/components/editor/EditorLeftRail";
import EditorFlyout from "@/components/editor/EditorFlyout";
import LayersPanel, { type EditorLayer } from "@/components/editor/LayersPanel";
import AttributeBar, { type AttributeSelection } from "@/components/editor/AttributeBar";
import { useCurrency } from "@/lib/currency-context";
import { useI18n } from "@/lib/i18n";

type Side = "Front" | "Back";
type MockupId = "studio" | "flatlay" | "hoodie";

const INITIAL_LAYERS: Record<Side, EditorLayer[]> = {
  Front: [
    { id: "f1", name: "Design group", visible: true, locked: false, isGroup: true },
    { id: "f2", name: "Text layer", visible: true, locked: true, isGroup: false },
    { id: "f3", name: "Logo", visible: true, locked: false, isGroup: false },
  ],
  Back: [{ id: "b1", name: "Back print", visible: true, locked: false, isGroup: true }],
};

const MOCKUPS: { id: MockupId; name: string; detail: string; bg: string }[] = [
  { id: "studio", name: "Studio T-shirt", detail: "Front view", bg: "from-[#dce8cf] to-[#f5f4ed]" },
  { id: "flatlay", name: "Flat lay", detail: "Product view", bg: "from-[#ece6dc] to-[#d8e2d4]" },
  { id: "hoodie", name: "Hoodie", detail: "Front view", bg: "from-[#dfe1e7] to-[#f2eee8]" },
];

export default function EditorPage() {
  const { formatKs } = useCurrency();
  const { t } = useI18n();
  const [activePanel, setActivePanel] = useState<PanelId | null>("elements");
  const [activeTool, setActiveTool] = useState<ToolId>("move");
  const [activeSide, setActiveSide] = useState<Side>("Front");
  const [layers, setLayers] = useState(INITIAL_LAYERS);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>("f1");
  const [mockup, setMockup] = useState<MockupId | null>(null);
  const [selection, setSelection] = useState<AttributeSelection>({ product: "T-shirt", printMethod: "DTF", fabricType: "Combed Cotton", knitStructure: "Single Jersey", gsm: "180", color: "Navy", cutting: "Crew Neck", size: "M" });

  const toggleLayerField = (side: Side, id: string, field: "visible" | "locked") => setLayers((prev) => ({ ...prev, [side]: prev[side].map((layer) => layer.id === id ? { ...layer, [field]: !layer[field] } : layer) }));
  const selectedMockup = MOCKUPS.find((item) => item.id === mockup);

  return (
    <div className="flex h-screen min-h-[680px] flex-col overflow-hidden bg-bg">
      <Header />
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-bg-surface px-3 py-2">
        <div className="flex items-center gap-1.5 text-text-secondary"><button title={t("editor.undo")} className="rounded p-1.5 hover:bg-bg"><Undo2 size={15} /></button><button title={t("editor.redo")} className="rounded p-1.5 hover:bg-bg"><Redo2 size={15} /></button><span className="mx-1 h-4 w-px bg-border" /><span className="hidden text-[10px] text-text-muted sm:inline">Untitled design</span></div>
        <div className="flex items-center gap-2"><span className="text-[10px] text-text-muted">Estimated</span><span className="text-xs font-bold text-accent">{formatKs(22000)}</span></div>
        <div className="flex items-center gap-1.5"><button className="hidden rounded border border-border px-2.5 py-1.5 text-[10px] font-semibold sm:block">Save</button><button disabled={!mockup} title={!mockup ? t("editor.attachFirst") : undefined} className="rounded border border-border px-2.5 py-1.5 text-[10px] font-semibold disabled:cursor-not-allowed disabled:opacity-40">{t("editor.addToCart")}</button><button disabled={!mockup} title={!mockup ? t("editor.attachFirst") : undefined} className="rounded bg-accent px-2.5 py-1.5 text-[10px] font-bold text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40">{t("editor.buyNow")}</button></div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <EditorLeftRail activePanel={activePanel} onPanelChange={setActivePanel} activeTool={activeTool} onToolChange={setActiveTool} />
        {activePanel && <EditorFlyout panel={activePanel} />}

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#f4f4f1] dark:bg-[#111]">
          <div className="flex shrink-0 items-center justify-between border-b border-border bg-bg px-3 py-1.5"><div className="flex items-center gap-1 rounded bg-bg-surface p-0.5"><button onClick={() => setActiveSide("Front")} className={`rounded px-3 py-1 text-[10px] font-semibold ${activeSide === "Front" ? "bg-accent text-accent-foreground" : "text-text-muted"}`}>Front</button><button onClick={() => setActiveSide("Back")} className={`rounded px-3 py-1 text-[10px] font-semibold ${activeSide === "Back" ? "bg-accent text-accent-foreground" : "text-text-muted"}`}>Back</button></div><div className="flex items-center gap-2 text-text-muted"><button title="Grid"><Grid3X3 size={14} /></button><span className="text-[10px]">100%</span><button title="Zoom"><ZoomIn size={14} /></button><button title="Preview"><Monitor size={14} /></button></div></div>
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-auto p-3 sm:p-5">
            <div className="flex w-full max-w-[700px] items-center justify-between rounded-md border border-border bg-bg-surface px-3 py-2 text-[10px] text-text-muted"><span className="font-semibold text-text-primary">{activeTool.replace("-", " ")}</span><span>Print area · 12 × 16 in</span><span className="hidden items-center gap-1 sm:flex"><Eye size={12} /> Safe zone on</span></div>
            <div className="relative flex aspect-[4/3] w-full max-w-[700px] items-center justify-center overflow-hidden rounded-lg border border-border bg-[linear-gradient(45deg,#e7e7e3_25%,transparent_25%),linear-gradient(-45deg,#e7e7e3_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e7e7e3_75%),linear-gradient(-45deg,transparent_75%,#e7e7e3_75%)] bg-[length:22px_22px] bg-[position:0_0,0_11px,11px_-11px,-11px_0px] dark:bg-[#202020] dark:bg-none"><div className="relative flex h-[72%] w-[43%] min-w-[150px] items-center justify-center rounded-[45%_45%_9%_9%] border border-dashed border-text-muted/40 bg-white/50 shadow-sm dark:bg-white/5"><div className="absolute top-[9%] h-5 w-14 rounded-b-full border-b border-dashed border-text-muted/50" /><div className="flex h-24 w-24 items-center justify-center rounded border border-dashed border-accent/60 bg-accent/5 text-center text-[10px] font-semibold text-accent"><ImagePlus size={16} className="mr-1" /> Your design</div><span className="absolute bottom-3 text-[8px] text-text-faint">Transparent canvas · {activeSide}</span></div><span className="absolute bottom-2 left-2 rounded bg-bg-surface/90 px-2 py-1 text-[9px] text-text-muted">{activeSide} canvas</span></div>
            <div className="flex items-center gap-2 rounded-md border border-border bg-bg px-2 py-1.5 text-[10px] text-text-secondary"><button className="rounded bg-bg-surface px-2 py-1 font-semibold text-accent">Design</button><button className="rounded px-2 py-1">Mockup preview</button><span className="mx-1 h-4 w-px bg-border" /><span>Click a mockup on the right to preview</span></div>
          </div>
        </main>

        <aside className="hidden w-60 shrink-0 flex-col border-l border-border bg-bg-surface xl:flex">
          <div className="border-b border-border p-3"><div className="mb-2 flex items-center justify-between"><h2 className="flex items-center gap-1.5 text-xs font-bold"><PackageOpen size={14} className="text-accent" /> Mockups</h2><button className="text-[10px] text-accent">View all</button></div><p className="mb-2 text-[9px] leading-4 text-text-muted">Preview your design on a product before you order.</p><div className="grid gap-2">{MOCKUPS.map((item) => <button key={item.id} onClick={() => setMockup(item.id)} className={`flex items-center gap-2 rounded-md border p-1.5 text-left ${mockup === item.id ? "border-accent bg-accent/10" : "border-border hover:border-accent"}`}><span className={`flex h-11 w-11 items-center justify-center rounded bg-gradient-to-br ${item.bg}`}><Shirt size={25} className="text-[#526052]" /></span><span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-semibold">{item.name}</span><span className="text-[9px] text-text-muted">{item.detail}</span></span>{mockup === item.id && <Check size={14} className="text-accent" />}</button>)}</div></div>
          <div className="min-h-0 flex-1 overflow-y-auto"><LayersPanel side={activeSide} layers={layers[activeSide]} selectedLayerId={selectedLayerId} onSelectLayer={setSelectedLayerId} onToggleVisible={(id) => toggleLayerField(activeSide, id, "visible")} onToggleLock={(id) => toggleLayerField(activeSide, id, "locked")} /></div>
          {selectedMockup && <div className="border-t border-border p-3"><div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold"><Sparkles size={13} className="text-accent" /> {selectedMockup.name} selected</div><button onClick={() => setMockup(null)} className="w-full rounded border border-border px-2 py-1.5 text-[10px] text-text-secondary">Remove mockup</button></div>}
        </aside>
      </div>
      <div className="shrink-0 border-t border-border bg-bg"><AttributeBar selection={selection} onChange={setSelection} /></div>
    </div>
  );
}
