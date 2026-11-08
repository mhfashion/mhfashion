"use client";

import { useCallback, useEffect, useState } from "react";
import { Redo2, Undo2 } from "lucide-react";
import Header from "@/components/Header";
import EditorLeftRail, { type PanelId, type ToolId } from "@/components/editor/EditorLeftRail";
import EditorFlyout from "@/components/editor/EditorFlyout";
import LayersPanel, { type EditorLayer, type LayerDropPosition } from "@/components/editor/LayersPanel";
import AttributeBar, { type AttributeSelection } from "@/components/editor/AttributeBar";
import InteractiveCanvas, { type CanvasMark, type ShapeType } from "@/components/editor/InteractiveCanvas";
import MockupLibrary, { type MockupId } from "@/components/editor/MockupLibrary";
import type { TextCombination, TextFormatting } from "@/lib/editorTypography";
import type { Product } from "@/lib/types";
import { useCurrency } from "@/lib/currency-context";
import { findEditorElement } from "@/lib/editorElements";
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

function makeId(prefix: string) {
  return `${prefix}-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now().toString(36)}`;
}

function isDocumentState(value: unknown): value is DocumentState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as DocumentState;
  return ["Front", "Back"].every((side) =>
    Array.isArray(candidate.marks?.[side as Side]) &&
    Array.isArray(candidate.layers?.[side as Side]),
  );
}

async function prepareImage(file: File): Promise<string> {
  const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!acceptedTypes.includes(file.type)) {
    throw new Error("Please choose a PNG, JPG or WebP image.");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Image must be 10 MB or smaller.");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("This image could not be opened. Try another file.");
  }

  try {
    const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare this image.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Image conversion failed.")), "image/webp", 0.78);
    });
    if (blob.size > 1_500_000) {
      throw new Error("This photo is still too large after resizing. Please choose a smaller image.");
    }
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Image could not be read."));
      reader.onerror = () => reject(new Error("Image could not be read."));
      reader.readAsDataURL(blob);
    });
  } finally {
    bitmap.close();
  }
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
          name: mark.elementName ?? (mark.kind === "Text" ? `Text: ${(mark.text ?? "").slice(0, 24)}` : mark.kind === "Shape" ? `${mark.shapeType ?? "Rectangle"} shape` : `${mark.kind} element`),
          visible: true,
          locked: false,
          isGroup: false,
        }],
      },
    }));
  };

  const handleAddElement = async (elementId: string, color: string, x = 50, y = 48) => {
    const element = findEditorElement(elementId);
    if (!element) throw new Error("This element is no longer in the catalog.");
    if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error("Choose a valid element color.");
    const response = await fetch(element.assetPath, { cache: "force-cache" });
    if (!response.ok) throw new Error("The element artwork could not be loaded.");
    const svg = (await response.text()).replaceAll("#d4ff3f", color);
    const imageSrc = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    addMark({
      id: makeId(`element-${element.id}`),
      kind: "Image",
      elementName: element.name,
      x,
      y,
      imageSrc,
      width: 28,
    });
    setSaveMessage(`${element.name} added to ${activeSide}`);
  };

  const handleUploadImage = async (file: File) => {
    const imageSrc = await prepareImage(file);
    addMark({
      id: `${activeSide.toLowerCase()}-image-${Date.now()}`,
      kind: "Image",
      x: 50,
      y: 48,
      imageSrc,
      width: 34,
    });
  };

  const handleReplaceSmartObject = async (id: string, file: File) => {
    try {
      const imageSrc = await prepareImage(file);
      commitDocument((document) => {
        const sideMarks = document.marks[activeSide];
        const mark = sideMarks.find((item) => item.id === id);
        const layer = document.layers[activeSide].find((item) => item.id === id);
        if (!mark?.imageSrc || !layer?.isSmartObject) return document;
        const replaced = { ...mark, imageSrc };
        return {
          ...document,
          marks: { ...document.marks, [activeSide]: sideMarks.map((item) => item.id === id ? replaced : item) },
        };
      });
      setSaveMessage("Smart Object contents replaced; transforms preserved");
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Could not replace Smart Object contents");
    }
  };

  const handleAddText = (text: string, formatting: TextFormatting) => {
    addMark({ id: makeId("text"), kind: "Text", text, ...formatting, x: 50, y: 48 });
  };

  const handleAddTextCombination = (combination: TextCombination) => {
    const groupId = makeId("text-group");
    const titleId = makeId("text-title");
    const subtitleId = makeId("text-subtitle");
    const titleMark: CanvasMark = { id: titleId, kind: "Text", text: combination.title.text, x: 50, y: combination.title.y, ...combination.title.style };
    const subtitleMark: CanvasMark = { id: subtitleId, kind: "Text", text: combination.subtitle.text, x: 50, y: combination.subtitle.y, ...combination.subtitle.style };
    const group: EditorLayer = { id: groupId, name: combination.name, visible: true, locked: false, isGroup: true, blendMode: "pass-through", childIds: [titleId, subtitleId] };
    const titleLayer: EditorLayer = { id: titleId, name: combination.title.text, visible: true, locked: false, isGroup: false, parentId: groupId };
    const subtitleLayer: EditorLayer = { id: subtitleId, name: combination.subtitle.text, visible: true, locked: false, isGroup: false, parentId: groupId };
    commitDocument((document) => ({
      marks: { ...document.marks, [activeSide]: [...document.marks[activeSide], titleMark, subtitleMark] },
      layers: { ...document.layers, [activeSide]: [...document.layers[activeSide], group, titleLayer, subtitleLayer] },
    }));
    setSelectedLayerId(titleId);
    setSaveMessage(`${combination.name} added as editable text layers`);
  };

  const handleSelectProduct = (product: Product) => {
    setSelection((current) => ({ ...current, product: product.name }));
    setSaveMessage(`${product.name} selected for this design`);
  };

  const handleAddShape = (shapeType: ShapeType, color: string) => {
    addMark({ id: makeId("shape"), kind: "Shape", shapeType, color, x: 50, y: 48 });
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

  const updateCanvasMarks = (marks: CanvasMark[]) => commitDocument((document) => ({
    ...document,
    marks: { ...document.marks, [activeSide]: marks },
  }));

  const updateMark = (id: string, patch: Partial<CanvasMark>) => commitDocument((document) => ({
    ...document,
    marks: {
      ...document.marks,
      [activeSide]: document.marks[activeSide].map((mark) => mark.id === id ? { ...mark, ...patch } : mark),
    },
  }));

  const clearCanvas = () => commitDocument((document) => ({
    marks: { ...document.marks, [activeSide]: [] },
    layers: { ...document.layers, [activeSide]: [] },
  }));

  const updateLayer = (id: string, patch: Partial<EditorLayer>) =>
    commitDocument((document) => ({
      ...document,
      layers: {
        ...document.layers,
        [activeSide]: document.layers[activeSide].map((layer) => layer.id === id ? { ...layer, ...patch } : layer),
      },
    }));

  const dropLayer = (sourceId: string, targetId: string, position: LayerDropPosition) => commitDocument((document) => {
    const layers = document.layers[activeSide];
    const source = layers.find((layer) => layer.id === sourceId);
    const target = layers.find((layer) => layer.id === targetId);
    if (!source || !target || sourceId === targetId || (position === "inside" && (!target.isGroup || source.isGroup))) return document;
    const nextParentId = position === "inside" ? target.id : target.isGroup ? undefined : target.parentId;
    if (source.isGroup && nextParentId) return document;
    const moved: EditorLayer = { ...source, parentId: nextParentId };
    const remaining = layers.filter((layer) => layer.id !== sourceId);
    let insertionIndex: number;
    if (position === "inside") {
      const children = remaining.map((layer, index) => layer.parentId === target.id ? index : -1).filter((index) => index >= 0);
      insertionIndex = children.length ? children[children.length - 1] + 1 : remaining.findIndex((layer) => layer.id === target.id) + 1;
    } else {
      const targetIndex = remaining.findIndex((layer) => layer.id === targetId);
      if (targetIndex < 0) return document;
      insertionIndex = targetIndex + (position === "after" ? 1 : 0);
    }
    remaining.splice(Math.max(0, insertionIndex), 0, moved);
    const normalized = remaining.map((layer) => {
      if (!layer.isGroup || (layer.id !== source.parentId && layer.id !== nextParentId)) return layer;
      let childIds = layer.childIds ?? [];
      if (layer.id === source.parentId) childIds = childIds.filter((id) => id !== sourceId);
      if (layer.id === nextParentId && !childIds.includes(sourceId)) childIds = [...childIds, sourceId];
      return { ...layer, childIds };
    });
    return { ...document, layers: { ...document.layers, [activeSide]: normalized } };
  });

  const toggleSelectedEffect = (effect: string) => {
    const layer = history.present.layers[activeSide].find((item) => item.id === selectedLayerId);
    if (!layer) {
      setSaveMessage("Select a layer before applying an effect");
      return;
    }
    const effects = layer.effects ?? [];
    updateLayer(layer.id, { effects: effects.includes(effect) ? effects.filter((item) => item !== effect) : [...effects, effect] });
  };

  const addLayer = (isGroup = false) => {
    const id = makeId(isGroup ? "group" : "layer");
    commitDocument((document) => ({
      ...document,
      layers: {
        ...document.layers,
        [activeSide]: [...document.layers[activeSide], {
          id,
          name: isGroup ? "Group" : `Layer ${document.layers[activeSide].filter((layer) => !layer.isGroup).length + 1}`,
          visible: true,
          locked: false,
          isGroup,
          ...(isGroup ? { childIds: [], blendMode: "pass-through" as const } : {}),
        }],
      },
    }));
    setSelectedLayerId(id);
  };

  const duplicateLayer = () => {
    const id = selectedLayerId;
    if (!id) return;
    const layers = history.present.layers[activeSide];
    const selected = layers.find((layer) => layer.id === id);
    if (!selected) return;
    const children = selected.isGroup ? layers.filter((layer) => layer.parentId === selected.id) : [];
    const idMap = new Map<string, string>([[selected.id, makeId(selected.isGroup ? "group" : "layer")]]);
    children.forEach((child) => idMap.set(child.id, makeId("layer")));
    const cloneLayer = (layer: EditorLayer): EditorLayer => ({
      ...layer,
      id: idMap.get(layer.id) ?? makeId("layer"),
      name: `${layer.name} copy`,
      ...(layer.parentId ? { parentId: idMap.get(layer.parentId) ?? layer.parentId } : {}),
      ...(layer.childIds ? { childIds: layer.childIds.map((childId) => idMap.get(childId) ?? childId) } : {}),
    });
    const clones = [selected, ...children].map(cloneLayer);
    const cloneMarks = history.present.marks[activeSide]
      .filter((mark) => idMap.has(mark.id))
      .map((mark) => ({ ...mark, id: idMap.get(mark.id)!, x: Math.min(mark.x + 4, 95), y: Math.min(mark.y + 4, 95) }));
    commitDocument((document) => ({
      marks: { ...document.marks, [activeSide]: [...document.marks[activeSide], ...cloneMarks] },
      layers: { ...document.layers, [activeSide]: [...document.layers[activeSide], ...clones] },
    }));
    setSelectedLayerId(idMap.get(selected.id) ?? null);
  };

  const mergeDown = () => {
    const layers = history.present.layers[activeSide];
    const selectedIndex = layers.findIndex((layer) => layer.id === selectedLayerId);
    const selected = layers[selectedIndex];
    if (!selected || selected.isGroup || selected.parentId) return;
    const below = [...layers.slice(0, selectedIndex)].reverse().find((layer) => !layer.parentId && !layer.isGroup);
    if (!below) return;
    const groupId = makeId("group");
    const group: EditorLayer = { id: groupId, name: `${below.name} + ${selected.name}`, visible: below.visible && selected.visible, locked: false, isGroup: true, blendMode: "pass-through", childIds: [below.id, selected.id] };
    const insertIndex = layers.slice(0, selectedIndex).filter((layer) => layer.id !== below.id).length;
    const children = layers.filter((layer) => layer.id === below.id || layer.id === selected.id).map((layer) => ({ ...layer, parentId: groupId }));
    const groupedLayers = layers.filter((layer) => layer.id !== below.id && layer.id !== selected.id);
    groupedLayers.splice(insertIndex, 0, group, ...children);
    commitDocument((document) => ({
      ...document,
      layers: {
        ...document.layers,
        [activeSide]: groupedLayers,
      },
    }));
    setSelectedLayerId(groupId);
  };

  const deleteLayer = () => {
    if (!selectedLayerId) return;
    const layers = history.present.layers[activeSide];
    const selected = layers.find((layer) => layer.id === selectedLayerId);
    if (!selected) return;
    const removeIds = new Set([selected.id, ...(selected.isGroup ? layers.filter((layer) => layer.parentId === selected.id).map((layer) => layer.id) : [])]);
    commitDocument((document) => ({
      marks: { ...document.marks, [activeSide]: document.marks[activeSide].filter((mark) => !removeIds.has(mark.id)) },
      layers: { ...document.layers, [activeSide]: document.layers[activeSide].filter((layer) => !removeIds.has(layer.id)).map((layer) => layer.childIds ? { ...layer, childIds: layer.childIds.filter((childId) => !removeIds.has(childId)) } : layer) },
    }));
    setSelectedLayerId(null);
  };

  const moveLayer = (direction: -1 | 1) => {
    if (!selectedLayerId) return;
    commitDocument((document) => {
      const items = [...document.layers[activeSide]];
      const index = items.findIndex((layer) => layer.id === selectedLayerId);
      const layer = items[index];
      if (!layer) return document;
      const siblingIndexes = items.map((candidate, candidateIndex) => candidate.parentId === layer.parentId ? candidateIndex : -1).filter((candidateIndex) => candidateIndex >= 0);
      const position = siblingIndexes.indexOf(index);
      const targetIndex = siblingIndexes[position - direction];
      if (targetIndex === undefined) return document;
      [items[index], items[targetIndex]] = [items[targetIndex], items[index]];
      return { ...document, layers: { ...document.layers, [activeSide]: items } };
    });
  };

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
  const selectedLayer = history.present.layers[activeSide].find((layer) => layer.id === selectedLayerId) ?? null;
  const selectedMark = history.present.marks[activeSide].find((mark) => mark.id === selectedLayerId) ?? null;
  const selectedEffects = selectedLayer?.effects ?? [];
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
        {activePanel && <div className="hidden lg:block"><EditorFlyout panel={activePanel} onUploadImage={handleUploadImage} onAddText={handleAddText} onAddTextCombination={handleAddTextCombination} selectedText={selectedMark?.kind === "Text" ? selectedMark : null} onUpdateSelectedText={(patch) => { if (selectedMark?.kind === "Text") updateMark(selectedMark.id, patch); }} onAddShape={handleAddShape} onAddElement={handleAddElement} selectedProductName={selection.product} onSelectProduct={handleSelectProduct} selectedEffects={selectedEffects} onToggleEffect={toggleSelectedEffect} /></div>}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#f4f4f1] dark:bg-[#111]">
          <InteractiveCanvas
            activeTool={activeTool}
            activeSide={activeSide}
            onSideChange={setActiveSide}
            mockupName={mockupName}
            marks={history.present.marks[activeSide]}
            layers={history.present.layers[activeSide]}
            selectedLayerId={selectedLayerId}
            onSelectLayer={setSelectedLayerId}
            onAddMark={addMark}
            onAddElement={handleAddElement}
            onRemoveMark={removeMark}
            onMarksChange={updateCanvasMarks}
            onClear={clearCanvas}
          />
        </main>
        <aside className="hidden w-64 shrink-0 flex-col overflow-hidden border-l border-border bg-bg-surface lg:flex">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="border-b border-border p-3">
              <div className="mb-2 text-xs font-bold">Mockup</div>
              {mockup ? <div className="rounded-md border border-accent/40 bg-accent/5 p-2 text-[10px] text-accent"><div className="font-semibold">{mockupName}</div><button type="button" onClick={() => setMockupLibraryOpen(true)} className="mt-1 text-[9px] text-text-secondary underline">Change mockup</button></div> : <button type="button" onClick={() => setMockupLibraryOpen(true)} className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-accent px-2 py-3 text-[10px] font-semibold text-accent hover:bg-accent/10"><span className="text-base leading-none">+</span> Select mockup</button>}
            </div>
            <LayersPanel
              side={activeSide}
              layers={history.present.layers[activeSide]}
              marks={history.present.marks[activeSide]}
              selectedLayerId={selectedLayerId}
              onSelectLayer={setSelectedLayerId}
              onUpdateLayer={updateLayer}
              onAddLayer={() => addLayer(false)}
              onAddGroup={() => addLayer(true)}
              onDuplicate={duplicateLayer}
              onMergeDown={mergeDown}
              onDelete={deleteLayer}
              onMove={moveLayer}
              onRenameLayer={(id, name) => updateLayer(id, { name })}
              onDropLayer={dropLayer}
              selectedMark={selectedMark}
              onUpdateMark={updateMark}
              onReplaceSmartObject={handleReplaceSmartObject}
            />
          </div>
          {mockup && <div className="border-t border-border p-3"><div className="mb-2 text-[10px] font-semibold text-accent">Mockup selected</div><button type="button" onClick={() => setMockup(null)} className="w-full rounded border border-border px-2 py-1.5 text-[10px] text-text-secondary">Remove mockup</button></div>}
        </aside>
      </div>
      <div className="shrink-0 border-t border-border bg-bg"><AttributeBar selection={selection} onChange={setSelection} mockupName={mockupName} onAddMockup={() => setMockupLibraryOpen(true)} onRemoveMockup={() => setMockup(null)} /></div>
      {mockupLibraryOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center"><div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-bg-surface shadow-2xl"><div className="flex items-center justify-between border-b border-border px-3 py-2"><span className="text-xs font-bold">Add a mockup</span><button type="button" onClick={() => setMockupLibraryOpen(false)} className="text-lg text-text-muted">×</button></div><MockupLibrary selected={mockup} onSelect={chooseMockup} /></div></div>}
    </div>
  );
}
