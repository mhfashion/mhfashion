import { createEditorShapeLayer, createEditorTextLayer } from "@/lib/editor-layers";
import type { EditorArtworkLayer, EditorShapePath } from "@/lib/editor-layers";

// MH Fashion design library contract.
//
// These entries mirror the structure of the SVG files that will be served from the
// Cloudflare R2 bucket: every design is a set of individually selectable layers, so
// the Editor Sidebar can show one thumbnail per layer in Designs, Elements and Text
// before the R2 listing endpoint is connected. Coordinates use the shared editor
// artwork space of 1000 x 1200 units.
export const DESIGN_LIBRARY_STATUS = "pending-r2-endpoint";

export type DesignLibraryLayerKind = "shape" | "text";

export type DesignLibraryText = {
  value: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
};

export type DesignLibraryLayer = {
  id: string;
  designId: string;
  designName: string;
  name: string;
  kind: DesignLibraryLayerKind;
  paths: EditorShapePath[];
  text: DesignLibraryText | null;
};

export type DesignLibraryEntry = {
  id: string;
  name: string;
  // R2 object URL for the source SVG; null until the bucket is connected.
  svgUrl: string | null;
  layers: DesignLibraryLayer[];
};

const STREET_WAVE_PATH = "M 120 760 C 250 640 360 880 500 760 S 760 640 880 790";
const VINTAGE_RING_PATH = "M 500 260 m -190 0 a 190 190 0 1 0 380 0 a 190 190 0 1 0 -380 0";
const BOLD_BAR_PATH = "M 300 700 H 700 V 748 H 300 Z";
const STAR_PATH =
  "M 500 360 L 556 508 L 714 510 L 588 602 L 632 754 L 500 664 L 368 754 L 412 602 L 286 510 L 444 508 Z";

export const MH_DESIGN_LIBRARY: DesignLibraryEntry[] = [
  {
    id: "design-street-wave",
    name: "Street Wave",
    svgUrl: null,
    layers: [
      {
        id: "street-wave-line",
        designId: "design-street-wave",
        designName: "Street Wave",
        name: "Wave line",
        kind: "shape",
        paths: [{ d: STREET_WAVE_PATH, stroke: "#1f2937", strokeWidth: 44, fill: "none" }],
        text: null,
      },
      {
        id: "street-wave-text-top",
        designId: "design-street-wave",
        designName: "Street Wave",
        name: "STREET text",
        kind: "text",
        paths: [],
        text: { value: "STREET", x: 500, y: 480, fontSize: 150, color: "#111827" },
      },
      {
        id: "street-wave-text-bottom",
        designId: "design-street-wave",
        designName: "Street Wave",
        name: "WAVE text",
        kind: "text",
        paths: [],
        text: { value: "WAVE", x: 500, y: 940, fontSize: 150, color: "#4c9d16" },
      },
    ],
  },
  {
    id: "design-vintage-ring",
    name: "Vintage Ring",
    svgUrl: null,
    layers: [
      {
        id: "vintage-ring",
        designId: "design-vintage-ring",
        designName: "Vintage Ring",
        name: "Ring",
        kind: "shape",
        paths: [{ d: VINTAGE_RING_PATH, stroke: "#111827", strokeWidth: 30, fill: "none" }],
        text: null,
      },
      {
        id: "vintage-ring-text",
        designId: "design-vintage-ring",
        designName: "Vintage Ring",
        name: "MH text",
        kind: "text",
        paths: [],
        text: { value: "MH", x: 500, y: 330, fontSize: 190, color: "#111827" },
      },
    ],
  },
  {
    id: "design-bold-type",
    name: "Bold Type",
    svgUrl: null,
    layers: [
      {
        id: "bold-type-text",
        designId: "design-bold-type",
        designName: "Bold Type",
        name: "BE UNIQUE text",
        kind: "text",
        paths: [],
        text: { value: "BE UNIQUE", x: 500, y: 560, fontSize: 130, color: "#111827" },
      },
      {
        id: "bold-type-bar",
        designId: "design-bold-type",
        designName: "Bold Type",
        name: "Accent bar",
        kind: "shape",
        paths: [{ d: BOLD_BAR_PATH, fill: "#4c9d16", stroke: "none" }],
        text: null,
      },
    ],
  },
  {
    id: "design-star-mark",
    name: "Star Mark",
    svgUrl: null,
    layers: [
      {
        id: "star-mark-shape",
        designId: "design-star-mark",
        designName: "Star Mark",
        name: "Star",
        kind: "shape",
        paths: [{ d: STAR_PATH, fill: "#f5c518", stroke: "#111827", strokeWidth: 18 }],
        text: null,
      },
      {
        id: "star-mark-text",
        designId: "design-star-mark",
        designName: "Star Mark",
        name: "MH FASHION text",
        kind: "text",
        paths: [],
        text: { value: "MH FASHION", x: 500, y: 880, fontSize: 96, color: "#111827" },
      },
    ],
  },
];

/** Every layer of every design in catalog order (Elements section). */
export const MH_DESIGN_LAYERS: DesignLibraryLayer[] = MH_DESIGN_LIBRARY.flatMap(
  (design) => design.layers,
);

/** Text layers only (shown under Add Text). */
export const MH_DESIGN_TEXT_LAYERS: DesignLibraryLayer[] = MH_DESIGN_LAYERS.filter(
  (entry) => entry.kind === "text",
);

export function designLayerToEditorLayer(source: DesignLibraryLayer, id: string): EditorArtworkLayer {
  if (source.kind === "text" && source.text) {
    return createEditorTextLayer(id, source.name, { ...source.text });
  }
  return createEditorShapeLayer(id, source.name, { paths: source.paths });
}

export function designToEditorLayers(
  design: DesignLibraryEntry,
  nextId: () => string,
): EditorArtworkLayer[] {
  return design.layers.map((source) => designLayerToEditorLayer(source, nextId()));
}
