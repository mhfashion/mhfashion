"use client";

import { useState } from "react";
import { Undo2, Redo2, Shirt, Scissors, Sparkles } from "lucide-react";
import Header from "@/components/Header";
import EditorLeftRail, {
  type PanelId,
  type ToolId,
} from "@/components/editor/EditorLeftRail";
import EditorFlyout from "@/components/editor/EditorFlyout";
import LayersPanel, {
  type EditorLayer,
} from "@/components/editor/LayersPanel";
import AttributeBar, {
  type AttributeSelection,
} from "@/components/editor/AttributeBar";
import { useCurrency } from "@/lib/currency-context";

type Side = "Front" | "Back";

// Placeholder layers — real ones come from parsing the design SVG the user
// opened via "Edit Design" (always a copy; the original is never mutated).
const INITIAL_LAYERS: Record<Side, EditorLayer[]> = {
  Front: [
    { id: "f1", name: "Group 1", visible: true, locked: false, isGroup: true },
    { id: "f2", name: "Text layer", visible: true, locked: true, isGroup: false },
    { id: "f3", name: "Logo", visible: true, locked: false, isGroup: false },
  ],
  Back: [
    { id: "b1", name: "Back print", visible: true, locked: false, isGroup: true },
  ],
};

export default function EditorPage() {
  const { formatKs } = useCurrency();

  const [activePanel, setActivePanel] = useState<PanelId | null>("elements");
  const [activeTool, setActiveTool] = useState<ToolId>("move");
  const [activeSide, setActiveSide] = useState<Side>("Front");
  const [layers, setLayers] = useState(INITIAL_LAYERS);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>("f1");
  const [mockupAttached, setMockupAttached] = useState(false);

  const [selection, setSelection] = useState<AttributeSelection>({
    product: "T-shirt",
    printMethod: "DTF",
    fabricType: "Combed Cotton",
    knitStructure: "Single Jersey",
    gsm: "180",
    color: "Navy",
    cutting: "Crew Neck",
    size: "M",
  });

  // Placeholder price — the real one comes from product_attribute_pricing
  // for this exact attribute combination.
  const priceKs = 22000;

  const toggleLayerField = (
    side: Side,
    id: string,
    field: "visible" | "locked"
  ) => {
    setLayers((prev) => ({
      ...prev,
      [side]: prev[side].map((l) =>
        l.id === id ? { ...l, [field]: !l[field] } : l
      ),
    }));
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Site header stays visible above the editor toolbar */}
      <Header />

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3 text-text-secondary">
          <button title="Undo"><Undo2 size={16} /></button>
          <button title="Redo"><Redo2 size={16} /></button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">Custom Design</span>
          <span className="text-xs font-semibold text-accent">
            {formatKs(priceKs)}
          </span>
        </div>

        <div className="flex gap-2">
          <button className="text-[11px] px-3 py-1.5 rounded border border-border bg-bg-surface">
            Save
          </button>
          {/* Purchase actions stay disabled until the mockup is attached */}
          <button
            disabled={!mockupAttached}
            title={
              mockupAttached ? undefined : "Attach the mockup first"
            }
            className="text-[11px] px-3 py-1.5 rounded border border-border bg-bg-surface disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add to cart
          </button>
          <button
            disabled={!mockupAttached}
            title={
              mockupAttached ? undefined : "Attach the mockup first"
            }
            className="text-[11px] px-3 py-1.5 rounded bg-accent text-accent-foreground font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Buy now
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <EditorLeftRail
          activePanel={activePanel}
          onPanelChange={setActivePanel}
          activeTool={activeTool}
          onToolChange={setActiveTool}
        />

        {activePanel && <EditorFlyout panel={activePanel} />}

        {/* Canvas area */}
        <div className="flex-1 flex flex-col items-center gap-3 p-5 overflow-auto">
          {/* Contextual toolbar — reflects the active tool / selection */}
          <div className="flex items-center gap-3 bg-bg-surface rounded-lg px-3 py-1.5 text-[10px] text-text-secondary">
            <span className="text-text-muted capitalize">
              {activeTool.replace("-", " ")}
            </span>
            <span className="text-border-light">|</span>
            <span>Stroke</span>
            <span className="w-3.5 h-3.5 rounded-sm bg-text-primary" />
            <span>Width 2px</span>
          </div>

          <div className="flex gap-4">
            {(["Front", "Back"] as Side[]).map((side) => (
              <div key={side} className="flex flex-col items-center gap-1.5">
                {/* Clicking a canvas scopes the Layers panel to that side */}
                <button
                  onClick={() => setActiveSide(side)}
                  className={`w-40 aspect-[3/4] rounded-lg border-2 flex items-center justify-center ${
                    activeSide === side
                      ? "border-accent"
                      : "border-border opacity-70"
                  }`}
                >
                  {/* Canvas background stays transparent by design */}
                  <div className="w-16 h-16 border border-dashed border-border-light rounded-lg" />
                </button>
                <span
                  className={`text-[10px] ${
                    activeSide === side
                      ? "text-accent font-medium"
                      : "text-text-muted"
                  }`}
                >
                  {side}
                  {activeSide === side ? " (selected)" : ""}
                </span>

                {/* Live mockup preview appears under the selected canvas */}
                {activeSide === side && (
                  <div className="bg-bg-surface rounded-lg p-1.5 flex flex-col items-center gap-1">
                    <div className="w-12 aspect-[3/4] bg-bg rounded flex items-center justify-center">
                      <Shirt size={18} className="text-border-light" />
                    </div>
                    <span className="text-[8px] text-text-muted">Mockup</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={() => setMockupAttached(true)}
            className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded border ${
              mockupAttached
                ? "border-accent text-accent"
                : "border-border-light text-text-secondary"
            }`}
          >
            <Scissors size={13} />
            {mockupAttached ? "Mockup attached ✓" : "Attach to mockup"}
          </button>

          {!mockupAttached && (
            <p className="text-[9px] text-text-faint flex items-center gap-1">
              <Sparkles size={10} />
              Attach the design to the mockup to unlock Add to cart / Buy now
            </p>
          )}
        </div>

        <LayersPanel
          side={activeSide}
          layers={layers[activeSide]}
          selectedLayerId={selectedLayerId}
          onSelectLayer={setSelectedLayerId}
          onToggleVisible={(id) =>
            toggleLayerField(activeSide, id, "visible")
          }
          onToggleLock={(id) => toggleLayerField(activeSide, id, "locked")}
        />
      </div>

      <AttributeBar selection={selection} onChange={setSelection} />
    </div>
  );
}
