"use client";

import {
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Layers3,
  LayoutTemplate,
  Search,
  Shapes,
  Sparkles,
  Type,
  Upload,
} from "lucide-react";
import { useMemo, useState } from "react";

type SidebarSection = "Designs" | "Elements" | "Text" | "Upload" | "Image Create";

const PANEL_WIDTH = "min(17rem, 86vw)";
const SIDEBAR_TOOLS: { label: SidebarSection; Icon: typeof LayoutTemplate; description: string }[] = [
  { label: "Designs", Icon: LayoutTemplate, description: "MH Fashion design library" },
  { label: "Elements", Icon: Shapes, description: "Layers from every design" },
  { label: "Text", Icon: Type, description: "Add editable text" },
  { label: "Upload", Icon: Upload, description: "Upload an image" },
  { label: "Image Create", Icon: Sparkles, description: "Create an image with AI" },
];

const DESIGN_LIBRARY = [
  { id: "placeholder-1", name: "MH Fashion design", preview: "MH" },
  { id: "placeholder-2", name: "Streetwear design", preview: "MF" },
  { id: "placeholder-3", name: "Signature design", preview: "S" },
];

function SearchField({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="flex h-9 shrink-0 items-center gap-2 rounded-lg border border-border bg-bg px-2.5 text-text-secondary [@media(pointer:coarse)]:h-11">
      <Search size={14} aria-hidden="true" />
      <input
        aria-label={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-xs text-text-primary outline-none placeholder:text-text-muted"
      />
    </label>
  );
}

function PanelContent({ section }: { section: SidebarSection }) {
  const [search, setSearch] = useState("");
  const [text, setText] = useState("");
  const [prompt, setPrompt] = useState("");
  const filteredDesigns = useMemo(
    () => DESIGN_LIBRARY.filter((item) => item.name.toLowerCase().includes(search.toLowerCase())),
    [search],
  );

  if (section === "Designs") {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        <SearchField value={search} onChange={setSearch} placeholder="Search designs" />
        <div aria-label="MH Fashion designs" className="grid grid-cols-2 gap-2">
          {filteredDesigns.map((design) => (
            <button key={design.id} type="button" className="group overflow-hidden rounded-lg border border-border bg-bg text-left outline-none hover:border-accent focus-visible:ring-2 focus-visible:ring-accent">
              <div className="flex aspect-square items-center justify-center bg-gradient-to-br from-[#efffdc] to-[#b9ea7d] text-2xl font-black text-[#4c9d16]">{design.preview}</div>
              <span className="block truncate px-2 py-2 text-[10px] font-semibold text-text-primary">{design.name}</span>
            </button>
          ))}
        </div>
        <p className="rounded-lg border border-dashed border-border-light p-2 text-[10px] leading-4 text-text-muted">
          R2 SVG design loading will appear here when the MH Fashion design-library endpoint is connected.
        </p>
      </div>
    );
  }

  if (section === "Elements") {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        <SearchField value={search} onChange={setSearch} placeholder="Search elements" />
        <div aria-label="Design elements" className="space-y-1">
          {["Artwork layer", "Text layer", "Image layer", "Shape layer"].filter((item) => item.toLowerCase().includes(search.toLowerCase())).map((item) => (
            <button key={item} type="button" className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-border bg-bg px-3 text-left text-xs text-text-primary outline-none hover:border-accent focus-visible:ring-2 focus-visible:ring-accent">
              <Layers3 size={15} className="text-accent" aria-hidden="true" />
              {item}
            </button>
          ))}
        </div>
        <p className="rounded-lg border border-dashed border-border-light p-2 text-[10px] leading-4 text-text-muted">
          Elements will be populated from the layers inside MH Fashion SVG design files.
        </p>
      </div>
    );
  }

  if (section === "Text") {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        <SearchField value={search} onChange={setSearch} placeholder="Search text" />
        <button type="button" onClick={() => setText((current) => current || "Type your text")} className="flex min-h-20 items-center justify-center rounded-lg border border-dashed border-accent bg-accent/10 px-3 text-sm font-semibold text-accent outline-none hover:bg-accent/15 focus-visible:ring-2 focus-visible:ring-accent">
          <Type size={18} className="mr-2" aria-hidden="true" />
          Add Text
        </button>
        {text && (
          <label className="space-y-1 text-[10px] font-semibold text-text-secondary">
            Text to add
            <textarea value={text} onChange={(event) => setText(event.target.value)} rows={3} className="w-full resize-none rounded-lg border border-border bg-bg p-2 text-xs font-normal text-text-primary outline-none focus:border-accent" />
          </label>
        )}
        <p className="text-[10px] leading-4 text-text-muted">Click Add Text, then type the copy that should be placed on the canvas.</p>
      </div>
    );
  }

  if (section === "Upload") {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        <SearchField value={search} onChange={setSearch} placeholder="Search uploads" />
        <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-accent bg-accent/10 px-3 text-center text-xs font-semibold text-accent outline-none hover:bg-accent/15 focus-within:ring-2 focus-within:ring-accent">
          <ImagePlus size={20} className="mb-2" aria-hidden="true" />
          Choose an image
          <span className="mt-1 text-[10px] font-normal text-text-muted">The configured KB/MB limit will be applied before canvas insertion.</span>
          <input type="file" accept="image/*" className="sr-only" />
        </label>
        <p className="text-[10px] leading-4 text-text-muted">Uploaded photos will be compressed in the browser and inserted directly into the canvas after the upload pipeline is connected.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
      <SearchField value={search} onChange={setSearch} placeholder="Search image ideas" />
      <label className="space-y-1 text-[10px] font-semibold text-text-secondary">
        Prompt
        <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Describe the image you want" rows={5} className="w-full resize-none rounded-lg border border-border bg-bg p-2 text-xs font-normal text-text-primary outline-none focus:border-accent" />
      </label>
      <button type="button" disabled={!prompt.trim()} className="flex min-h-11 items-center justify-center rounded-lg bg-accent px-3 text-xs font-bold text-accent-foreground outline-none hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-accent">
        <Sparkles size={15} className="mr-2" aria-hidden="true" />
        Create Image
      </button>
      <p className="text-[10px] leading-4 text-text-muted">AI image generation and inserting the generated download into the canvas will be connected to the project image service.</p>
    </div>
  );
}

export default function EditorEditSidebar({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  const [railVisible, setRailVisible] = useState(false);
  const [activeSection, setActiveSection] = useState<SidebarSection>("Designs");
  const hasPanel = railVisible && open;

  function showRail() {
    setRailVisible(true);
  }

  function hideAll() {
    setRailVisible(false);
    if (open) onToggle();
  }

  function chooseSection(section: SidebarSection) {
    setActiveSection(section);
    if (!open) onToggle();
  }

  return (
    <>
      {railVisible && (
        <aside aria-label="Edit sidebar rail" data-dock-side="left" className="absolute inset-y-0 left-0 z-30 flex w-12 flex-col items-center border-r border-border bg-bg-surface/95 py-2 text-text-primary shadow-xl backdrop-blur">
          <div className="flex flex-col gap-1">
            {SIDEBAR_TOOLS.map(({ label, Icon }) => (
              <button key={label} type="button" aria-label={`Open ${label} in Edit sidebar`} title={label} onClick={() => chooseSection(label)} className="flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary outline-none hover:bg-bg hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11">
                <Icon size={17} aria-hidden="true" />
              </button>
            ))}
          </div>
        </aside>
      )}
      {hasPanel && (
        <aside id="editor-edit-sidebar" aria-label={`${activeSection} editor sidebar`} data-dock-side="left" className="absolute inset-y-0 left-12 z-30 flex min-h-0 flex-col overflow-hidden border-r border-border bg-bg-surface text-text-primary shadow-xl" style={{ width: PANEL_WIDTH }}>
          <div aria-label="Edit sidebar title" className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-3 text-[11px] font-semibold [@media(pointer:coarse)]:h-11">
            <span role="heading" aria-level={2}>{activeSection}</span>
          </div>
          <PanelContent section={activeSection} />
        </aside>
      )}
      <button
        type="button"
        aria-label={hasPanel ? "Collapse Edit sidebar" : railVisible ? "Hide Edit sidebar" : "Expand Edit sidebar"}
        aria-expanded={hasPanel}
        onClick={() => {
          if (hasPanel || railVisible) hideAll();
          else showRail();
        }}
        className="absolute top-2 z-40 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-md outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11"
        style={{ left: hasPanel ? `calc(3rem + ${PANEL_WIDTH})` : railVisible ? "3rem" : 0 }}
      >
        {hasPanel ? <ChevronLeft size={17} aria-hidden="true" /> : <ChevronRight size={17} aria-hidden="true" />}
      </button>
    </>
  );
}
