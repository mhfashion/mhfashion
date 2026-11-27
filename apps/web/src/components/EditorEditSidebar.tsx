"use client";

import {
  ChevronLeft,
  ChevronRight,
  Grid3x3,
  ImagePlus,
  Images,
  Search,
  Shapes,
  LayoutTemplate,
  Sparkles,
  Type,
  Upload,
} from "lucide-react";
import { useState } from "react";
import EditorLayerPreview, { EDITOR_ARTWORK_VIEWBOX } from "@/components/EditorLayerPreview";
import type { EditorArtworkLayer } from "@/lib/editor-layers";
import {
  MH_DESIGN_LIBRARY,
  MH_DESIGN_LAYERS,
  MH_DESIGN_TEXT_LAYERS,
} from "@/lib/editor-design-library";
import type {
  DesignLibraryEntry,
  DesignLibraryLayer,
  DesignLibraryText,
} from "@/lib/editor-design-library";
import { useEditorPatternLibrary } from "@/lib/editor-pattern-library";
import { useEditorPhotoLibrary } from "@/lib/editor-photo-library";
import type { PhotoLibraryEntry } from "@/lib/editor-photo-library";
import { formatByteSize } from "@/lib/editor-upload";

type SidebarSection = "Designs" | "Elements" | "Photos" | "Patterns" | "Text" | "Uploads" | "Image Create";

const PANEL_WIDTH = "min(17rem, 86vw)";
const SIDEBAR_TOOLS: { label: SidebarSection; Icon: typeof LayoutTemplate }[] = [
  { label: "Designs", Icon: LayoutTemplate },
  { label: "Elements", Icon: Shapes },
  { label: "Photos", Icon: Images },
  { label: "Patterns", Icon: Grid3x3 },
  { label: "Text", Icon: Type },
  { label: "Uploads", Icon: Upload },
  { label: "Image Create", Icon: Sparkles },
];

const CARD_BUTTON =
  "group overflow-hidden rounded-xl border border-border/70 bg-bg/80 text-left shadow-sm outline-none transition duration-200 hover:-translate-y-0.5 hover:border-accent hover:shadow-lg hover:shadow-accent/10 focus-visible:ring-2 focus-visible:ring-accent";
const CARD_FRAME =
  "relative flex aspect-square items-center justify-center overflow-hidden border-b border-border/70 bg-bg-surface";

function ArtworkFrame({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <span className={light ? CARD_FRAME + " bg-white" : CARD_FRAME}>
      <svg viewBox={EDITOR_ARTWORK_VIEWBOX} preserveAspectRatio="xMidYMid meet" className="h-full w-full" aria-hidden="true">
        {children}
      </svg>
    </span>
  );
}

function DesignCard({ design, onAdd }: { design: DesignLibraryEntry; onAdd: () => void }) {
  return (
    <button type="button" onClick={onAdd} className={CARD_BUTTON} aria-label={"Add " + design.name + " design to the canvas"}>
      <ArtworkFrame>
        {design.layers.map((layer) => (
          <EditorLayerPreview key={layer.id} paths={layer.paths} text={layer.text} />
        ))}
      </ArtworkFrame>
    </button>
  );
}

function ElementCard({ layer, onAdd }: { layer: DesignLibraryLayer; onAdd: () => void }) {
  return (
    <button type="button" onClick={onAdd} className={CARD_BUTTON} aria-label={"Add " + layer.name + " to the canvas as a layer"}>
      <ArtworkFrame>
        <EditorLayerPreview paths={layer.paths} text={layer.text} />
      </ArtworkFrame>
    </button>
  );
}

/** Patterns are dark ink for a white print area, so their tile sits on white, not on the dark card. */
function PatternCard({ layer, onAdd, light = true }: { layer: DesignLibraryLayer; onAdd: () => void; light?: boolean }) {
  return (
    <button type="button" onClick={onAdd} title={layer.name} aria-label={"Add " + layer.name + " pattern to the canvas"} className={CARD_BUTTON}>
      <ArtworkFrame light={light}>
        <EditorLayerPreview paths={layer.paths} text={layer.text} />
      </ArtworkFrame>
    </button>
  );
}

function PhotoCard({ photo, onAdd }: { photo: PhotoLibraryEntry; onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      title={photo.name}
      aria-label={"Add " + photo.name + " photo to the canvas"}
      className={CARD_BUTTON}
    >
      <span className={CARD_FRAME}>
        {/* The photo is a remote placeholder until licensed stock lands in R2. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.url} alt="" loading="lazy" className="h-full w-full object-cover" />
      </span>
    </button>
  );
}

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

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[10px] font-bold uppercase tracking-wide text-text-secondary">{children}</h3>;
}

type PanelProps = {
  section: SidebarSection;
  uploads: EditorArtworkLayer[];
  uploadLimitBytes: number;
  onAddDesign: (design: DesignLibraryEntry) => void;
  onAddElement: (layer: DesignLibraryLayer) => void;
  onAddText: (text?: DesignLibraryText | null) => void;
  onAddPhoto: (photo: PhotoLibraryEntry) => void;
  onUploadImage: (file: File) => void;
};

function PanelContent({
  section,
  uploads,
  uploadLimitBytes,
  onAddDesign,
  onAddElement,
  onAddText,
  onAddPhoto,
  onUploadImage,
}: PanelProps) {
  const [search, setSearch] = useState("");
  const [prompt, setPrompt] = useState("");
  const needle = search.trim().toLowerCase();
  // The shop's own library when it has one, the built-ins and placeholders until then.
  const { photos: photoLibrary } = useEditorPhotoLibrary();
  const { layers: patternLayers, inkByLayerId } = useEditorPatternLibrary();

  if (section === "Designs") {
    const designs = MH_DESIGN_LIBRARY.filter((design) => !needle || design.name.toLowerCase().includes(needle));
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        <SearchField value={search} onChange={setSearch} placeholder="Search designs" />
        <div aria-label="MH Fashion designs" className="grid grid-cols-2 gap-2">
          {designs.map((design) => (
            <DesignCard key={design.id} design={design} onAdd={() => onAddDesign(design)} />
          ))}
        </div>
      </div>
    );
  }

  if (section === "Elements") {
    const layers = MH_DESIGN_LAYERS.filter(
      (layer) =>
        !needle ||
        layer.name.toLowerCase().includes(needle) ||
        layer.designName.toLowerCase().includes(needle),
    );
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        <SearchField value={search} onChange={setSearch} placeholder="Search elements" />
        <SectionHeading>Layers in every design</SectionHeading>
        <div aria-label="Design elements" className="grid grid-cols-2 gap-2">
          {layers.map((layer) => (
            <ElementCard key={layer.id} layer={layer} onAdd={() => onAddElement(layer)} />
          ))}
        </div>
      </div>
    );
  }

  if (section === "Photos") {
    const photos = photoLibrary.filter(
      (photo) => !needle || `${photo.name} ${photo.keywords ?? ""}`.toLowerCase().includes(needle),
    );
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        <SearchField value={search} onChange={setSearch} placeholder="Search photos" />
        <SectionHeading>Shop photo library</SectionHeading>
        <div aria-label="Photo library" className="grid grid-cols-2 gap-2">
          {photos.map((photo) => (
            <PhotoCard key={photo.id} photo={photo} onAdd={() => onAddPhoto(photo)} />
          ))}
        </div>
        {photos.length === 0 && <p className="text-[10px] text-text-muted">No photo matches that search.</p>}
        {photoLibrary.some((photo) => photo.placeholder) && (
          <p className="text-[10px] leading-relaxed text-text-muted">
            Placeholder stock: the shop&apos;s licensed photos appear here once the first one is uploaded.
          </p>
        )}
      </div>
    );
  }

  if (section === "Patterns") {
    const patterns = patternLayers.filter((layer) => !needle || layer.name.toLowerCase().includes(needle));
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        <SearchField value={search} onChange={setSearch} placeholder="Search patterns" />
        <SectionHeading>Pattern fills</SectionHeading>
        <div aria-label="Pattern library" className="grid grid-cols-2 gap-2">
          {patterns.map((layer) => (
            <PatternCard
              key={layer.id}
              layer={layer}
              light={inkByLayerId[layer.id] !== "light"}
              onAdd={() => onAddElement(layer)}
            />
          ))}
        </div>
        {patterns.length === 0 && <p className="text-[10px] text-text-muted">No pattern matches that search.</p>}
      </div>
    );
  }

  if (section === "Text") {
    const textLayers = MH_DESIGN_TEXT_LAYERS.filter((layer) => !needle || layer.name.toLowerCase().includes(needle));
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        <SearchField value={search} onChange={setSearch} placeholder="Search text" />
        <button
          type="button"
          onClick={() => onAddText()}
          className="inline-flex min-h-9 w-fit items-center gap-1.5 self-start rounded-lg border border-accent bg-accent/10 px-3 py-1.5 text-[11px] font-bold text-accent outline-none hover:bg-accent/20 focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:min-h-11"
        >
          <Type size={14} aria-hidden="true" />
          Add Text
        </button>
        <SectionHeading>Text layers in Designs</SectionHeading>
        <div aria-label="Design text layers" className="grid grid-cols-2 gap-2">
          {textLayers.map((layer) => (
            <ElementCard key={layer.id} layer={layer} onAdd={() => onAddText(layer.text)} />
          ))}
        </div>
      </div>
    );
  }

  if (section === "Uploads") {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        <label className="flex min-h-20 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-accent bg-accent/10 px-3 text-center text-xs font-semibold text-accent outline-none hover:bg-accent/15 focus-within:ring-2 focus-within:ring-accent">
          <ImagePlus size={18} className="mb-1" aria-hidden="true" />
          Choose a photo
          <span className="mt-1 text-[10px] font-normal text-text-muted">
            Reduced to {formatByteSize(uploadLimitBytes)} or less before it lands on the canvas.
          </span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="Upload an image to the canvas"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onUploadImage(file);
              event.target.value = "";
            }}
          />
        </label>
        {uploads.length > 0 && (
          <>
            <SectionHeading>Your uploads</SectionHeading>
            <div aria-label="Uploaded images" className="grid grid-cols-2 gap-2">
              {uploads.map((layer) => (
                <div key={layer.id} className={CARD_BUTTON}>
                  <ArtworkFrame>
                    <EditorLayerPreview image={layer.image} />
                  </ArtworkFrame>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
      <SectionHeading>AI image</SectionHeading>
      <label className="space-y-1 text-[10px] font-semibold text-text-secondary">
        Prompt
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Describe the image you want"
          rows={5}
          className="w-full resize-none rounded-lg border border-border bg-bg p-2 text-xs font-normal text-text-primary outline-none focus:border-accent"
        />
      </label>
      <button
        type="button"
        disabled={!prompt.trim()}
        className="flex min-h-11 items-center justify-center rounded-lg bg-accent px-3 text-xs font-bold text-accent-foreground outline-none hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Sparkles size={15} className="mr-2" aria-hidden="true" />
        Create Image
      </button>
    </div>
  );
}

export default function EditorEditSidebar({
  open,
  onToggle,
  uploads,
  uploadLimitBytes,
  onAddDesign,
  onAddElement,
  onAddText,
  onAddPhoto,
  onUploadImage,
}: {
  open: boolean;
  onToggle: () => void;
  uploads: EditorArtworkLayer[];
  uploadLimitBytes: number;
  onAddDesign: (design: DesignLibraryEntry) => void;
  onAddElement: (layer: DesignLibraryLayer) => void;
  onAddText: (text?: DesignLibraryText | null) => void;
  onAddPhoto: (photo: PhotoLibraryEntry) => void;
  onUploadImage: (file: File) => void;
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
        <aside aria-label="Edit sidebar rail" data-dock-side="left" className="absolute inset-y-0 left-0 z-30 flex w-12 flex-col items-center border-r border-border bg-bg-surface/95 py-2 text-text-primary shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col gap-1">
            {SIDEBAR_TOOLS.map(({ label, Icon }) => (
              <button
                key={label}
                type="button"
                aria-label={"Open " + label + " in Edit sidebar"}
                title={label}
                aria-pressed={hasPanel && activeSection === label}
                onClick={() => chooseSection(label)}
                className={"flex h-10 w-10 items-center justify-center rounded-xl outline-none transition focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 " + (hasPanel && activeSection === label ? "bg-accent text-accent-foreground shadow-[0_0_18px_rgba(212,255,63,.24)]" : "text-text-secondary hover:bg-bg hover:text-text-primary")}
              >
                <Icon size={17} aria-hidden="true" />
              </button>
            ))}
          </div>
        </aside>
      )}
      {hasPanel && (
        <aside
          id="editor-edit-sidebar"
          aria-label={activeSection + " editor sidebar"}
          data-dock-side="left"
          className="absolute inset-y-0 left-12 z-30 flex min-h-0 flex-col overflow-hidden border-r border-border bg-bg-surface/95 text-text-primary shadow-2xl backdrop-blur-xl"
          style={{ width: PANEL_WIDTH }}
        >
          <div aria-label="Edit sidebar title" className="flex h-11 shrink-0 items-center justify-between border-b border-border bg-bg px-3 text-text-primary [@media(pointer:coarse)]:h-12">
            <span role="heading" aria-level={2} className="text-[12px] font-semibold tracking-tight">{activeSection}</span>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent">Create</span>
          </div>
          <PanelContent
            key={activeSection}
            section={activeSection}
            uploads={uploads}
            uploadLimitBytes={uploadLimitBytes}
            onAddDesign={onAddDesign}
            onAddElement={onAddElement}
            onAddText={onAddText}
            onAddPhoto={onAddPhoto}
            onUploadImage={onUploadImage}
          />
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
        title={hasPanel ? "Collapse Edit sidebar" : railVisible ? "Hide Edit sidebar" : "Expand Edit sidebar"}
        style={{ left: hasPanel ? "calc(3rem + " + PANEL_WIDTH + ")" : railVisible ? "3rem" : 0 }}
      >
        {hasPanel ? <ChevronLeft size={17} aria-hidden="true" /> : <ChevronRight size={17} aria-hidden="true" />}
      </button>
    </>
  );
}
