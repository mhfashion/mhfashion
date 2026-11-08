"use client";

import { useCallback, useEffect, useState } from "react";
import { Redo2, Undo2 } from "lucide-react";
import Header from "@/components/Header";
import EditorLeftRail, { type PanelId, type ToolId } from "@/components/editor/EditorLeftRail";
import EditorFlyout from "@/components/editor/EditorFlyout";
import LayersPanel, { type EditorLayer } from "@/components/editor/LayersPanel";
import AttributeBar, { type AttributeSelection } from "@/components/editor/AttributeBar";
import InteractiveCanvas, { type CanvasMark } from "@/components/editor/InteractiveCanvas";
import MockupLibrary, { type MockupId } from "@/components/editor/MockupLibrary";
import { useCurrency } from "@/lib/currency-context";
import { useI18n } from "@/lib/i18n";

type Side = "Front" | "Back";
type DocumentState = {
  marks: Record<Side, CanvasMark[]>;
  layers: Record<Side, EditorLayer[]>;
};
type HistoryState = {
  present: DocumentState;
  past: DocumentState[];
  future: DocumentState[];
};
type SavedDraft = {
  version: 1;
  savedAt: string;
  document: DocumentState;
  mockup: MockupId | null;
  selection: AttributeSelection;
};

const STORAGE_KEY = "mhfashion-editor-draft-v1";
const EMPTY_DOCUMENT: DocumentState = {
  marks: { Front: [], Back: [] },
  layers: { Front: [], Back: [] },
};
const DEFAULT_SELECTION: AttributeSelection = {
  product: "T-shirt",
  printMethod: "DTF",
  fabricType: "Combed Cotton",
  knitStructure: "Single Jersey",
  gsm: "180",
  color: "Navy",
  cutting: "Crew Neck",
  size: "M",
};

function isDocumentState(value: unknown): value is DocumentState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as DocumentState;
  return ["Front", "Back"].every((side) =>
    Array.isArray(candidate.marks?.[side as Side]) &&
    Array.isArray(candidate.layers?.[side as Side]),
  );
}

export default function EditorPage() {
  const { formatKs } = useCurrency();
  const { t } = useI18n();
  const [activePanel, setActivePanel] = useState<PanelId | null>("elements");
  const [activeTool, setActiveTool] = useState<ToolId>("move");
  const [activeSide, setActiveSide] = useState<Side>("Front");
  const [history, setHistory] = useState<HistoryState>({
    present: EMPTY_DOCUMENT,
    past: [],
    future: [],
  });
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [mockup, setMockup] = useState<MockupId | null>(null);
  const [mockupLibraryOpen, setMockupLibraryOpen] = useState(false);
  const [selection, setSelection] = useState<AttributeSelection>(DEFAULT_SELECTION);
  const [saveMessage, setSaveMessage] = useState("");

  const commitDocument = useCallback((update: (current: DocumentState) => DocumentState) => {
    setHistory((current) => {
      const next = update(current.present);
      if (next === current.present) return current;
      return {
        present: next,
        past: [...current.past, current.present].slice(-100),
        future: [],
      };
    });
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<SavedDraft>;
      if (saved.version !== 1 || !isDocumentState(saved.document)) return;
      setHistory({ present: saved.document, past: [], future: [] });
      if (saved.mockup === null || ["studio", "flatlay", "hoodie", "oversized", "cap", "tote"].includes(saved.mockup ?? "")) {
        setMockup(saved.mockup ?? null);
      }
      if (saved.selection && typeof saved.selection === "object") {
        setSelection({ ...DEFAULT_SELECTION, ...saved.selection });
      }
      setSaveMessage("Saved draft restored");
    } catch {
      setSaveMessage("Could not restore the saved draft");
    }
  }, []);

  const undo = () => {
    setHistory((current) => {
      if (!current.past.length) return current;
      const previous = current.past[current.past.length - 1];
      return {
        present: previous,
        past: current.past.slice(0, -1),
        future: [current.present, ...current.future],
      };
    });
  };

  const redo = () => {
    setHistory((current) => {
      if (!current.future.length) return current;
      const next = current.future[0];
      return {
        present: next,
        past: [...current.past, current.present],
        future: current.future.slice(1),
      };
    });
  };

  const addMark = (mark: CanvasMark) => {
    setSelectedLayerId(mark.id);
    commitDocument((document) => ({
      marks: { ...document.marks, [activeSide]: [...document.marks[activeSide], mark] },
      layers: {
        ...document.layers,
        [activeSide]: [...document.layers[activeSide], {
          id: mark.id,
          name: `${mark.kind} element`,
          visible: true,
          locked: false,
          isGroup: false,
        }],
      },
    }));
  };

  const removeMark = (id: string) => commitDocument((document) => ({
    marks: {
      ...document.marks,
      [activeSide]: document.marks[activeSide].filter((mark) => mark.id !== id),
    },
    layers: {
      ...document.layers,
      [activeSide]: document.layers[activeSide].filter((layer) => layer.id !== id),
    },
  }));

  const clearCanvas = () => commitDocument((document) => ({
    marks: { ...document.marks, [activeSide]: [] },
    layers: { ...document.layers, [activeSide]: [] },
  }));

  const toggleLayerField = (side: Side, id: string, field: "visible" | "locked") =>
    commitDocument((document) => ({
      ...document,
      layers: {
        ...document.layers,
        [side]: document.layers[side].map((layer) =>
          layer.id === id ? { ...layer, [field]: !layer[field] } : layer,
        ),
      },
    }));

  const saveDraft = () => {
    const payload: SavedDraft = {
      version: 1,
      savedAt: new Date().toISOString(),
      document: history.present,
      mockup,
      selection,
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      setSaveMessage("Draft saved in this browser");
    } catch {
      setSaveMessage("Could not save draft. Browser storage may be full or disabled.");
    }
  };

  const mockupName = mockup
    ? ({ studio: "Studio T-shirt", flatlay: "Flat lay tee", hoodie: "Classic hoodie", oversized: "Oversized tee", cap: "Cotton cap", tote: "Canvas tote" }[mockup] ?? "Mockup")
    : null;
  const chooseMockup = (id: MockupId) => {
    setMockup(id);
    setMockupLibraryOpen(false);
  };

  return (
    <div className="flex h-[calc(100dvh-4rem)] min-h-[560px] flex-col overflow-hidden bg-bg md:h-screen">
      <Header />
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-bg-surface px-2 py-1.5 sm:px-3 sm:py-2">
        <div className="flex min-w-0 items-center gap-1 text-text-secondary">
          <button type="button" title={t("editor.undo")} aria-label={t("editor.undo")} disabled={!history.past.length} onClick={undo} className="rounded p-1.5 hover:bg-bg disabled:cursor-not-allowed disabled:opacity-35"><Undo2 size={14} /></button>
          <button type="button" title={t("editor.redo")} aria-label={t("editor.redo")} disabled={!history.future.length} onClick={redo} className="rounded p-1.5 hover:bg-bg disabled:cursor-not-allowed disabled:opacity-35"><Redo2 size={14} /></button>
          <span className="mx-1 h-4 w-px bg-border" />
          <span className="hidden truncate text-[10px] text-text-muted sm:inline">Untitled design</span>
          {saveMessage && <span role="status" className="ml-2 hidden max-w-52 truncate text-[9px] text-text-muted sm:inline">{saveMessage}</span>}
        </div>
        <div className="hidden items-center gap-2 sm:flex"><span className="text-[10px] text-text-muted">Estimated</span><span className="text-xs font-bold text-accent">{formatKs(22000)}</span></div>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={saveDraft} className="rounded border border-border px-2.5 py-1.5 text-[10px] font-semibold">Save</button>
          <button type="button" disabled={!mockup} title={!mockup ? t("editor.attachFirst") : undefined} className="rounded border border-border px-2 py-1.5 text-[9px] font-semibold disabled:cursor-not-allowed disabled:opacity-40 sm:px-2.5 sm:text-[10px]">{t("editor.addToCart")}</button>
          <button type="button" disabled={!mockup} title={!mockup ? t("editor.attachFirst") : undefined} className="rounded bg-accent px-2 py-1.5 text-[9px] font-bold text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40 sm:px-2.5 sm:text-[10px]">{t("editor.buyNow")}</button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <EditorLeftRail activePanel={activePanel} onPanelChange={setActivePanel} activeTool={activeTool} onToolChange={setActiveTool} />
        {activePanel && <div className="hidden lg:block"><EditorFlyout panel={activePanel} /></div>}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#f4f4f1] dark:bg-[#111]">
          <InteractiveCanvas
            activeTool={activeTool}
            activeSide={activeSide}
            onSideChange={setActiveSide}
            mockupName={mockupName}
            marks={history.present.marks[activeSide]}
            onAddMark={addMark}
            onRemoveMark={removeMark}
            onClear={clearCanvas}
          />
        </main>
        <aside className="hidden w-64 shrink-0 flex-col overflow-hidden border-l border-border bg-bg-surface lg:flex">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="border-b border-border p-3">
              <div className="mb-2 text-xs font-bold">Mockup</div>
              {mockup ? <div className="rounded-md border border-accent/40 bg-accent/5 p-2 text-[10px] text-accent"><div className="font-semibold">{mockupName}</div><button type="button" onClick={() => setMockupLibraryOpen(true)} className="mt-1 text-[9px] text-text-secondary underline">Change mockup</button></div> : <button type="button" onClick={() => setMockupLibraryOpen(true)} className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-accent px-2 py-3 text-[10px] font-semibold text-accent hover:bg-accent/10"><span className="text-base leading-none">+</span> Select mockup</button>}
            </div>
            <LayersPanel side={activeSide} layers={history.present.layers[activeSide]} selectedLayerId={selectedLayerId} onSelectLayer={setSelectedLayerId} onToggleVisible={(id) => toggleLayerField(activeSide, id, "visible")} onToggleLock={(id) => toggleLayerField(activeSide, id, "locked")} />
          </div>
          {mockup && <div className="border-t border-border p-3"><div className="mb-2 text-[10px] font-semibold text-accent">Mockup selected</div><button type="button" onClick={() => setMockup(null)} className="w-full rounded border border-border px-2 py-1.5 text-[10px] text-text-secondary">Remove mockup</button></div>}
        </aside>
      </div>
      <div className="shrink-0 border-t border-border bg-bg"><AttributeBar selection={selection} onChange={setSelection} mockupName={mockupName} onAddMockup={() => setMockupLibraryOpen(true)} onRemoveMockup={() => setMockup(null)} /></div>
      {mockupLibraryOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center"><div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-bg-surface shadow-2xl"><div className="flex items-center justify-between border-b border-border px-3 py-2"><span className="text-xs font-bold">Add a mockup</span><button type="button" onClick={() => setMockupLibraryOpen(false)} className="text-lg text-text-muted">×</button></div><MockupLibrary selected={mockup} onSelect={chooseMockup} /></div></div>}
    </div>
  );
}
