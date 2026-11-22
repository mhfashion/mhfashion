// The apparel attribute chain from Plan §4.1, shared by the editor header bar and the admin
// pricing table. The lists are static until Attribute Management (plan §16 P2) drives them from
// the database; the narrowing rules below are the documented cascade, not a guess.
//
// This module is the one vocabulary: the admin seed chain (TSHIRT_POST_ATTRIBUTES) is built from
// these lists, so the editor and the price book cannot offer different options. A test pins that.

export const PRINT_METHOD_OPTIONS = ["DTF", "Sublimation"] as const;
export const FABRIC_TYPE_OPTIONS = ["Combed Cotton", "Compact Combed Cotton", "Polyester"] as const;
export const KNIT_STRUCTURE_OPTIONS = ["Single Jersey", "Interlock", "Air Layer"] as const;
export const MH_CUTTINGS_OPTIONS = ["Crew Neck", "V-Neck", "Polo Neck", "Round Neck"] as const;
export const GSM_OPTIONS = ["160 GSM", "180 GSM", "200 GSM", "240 GSM"] as const;
export const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "2XL", "3XL"] as const;

/** A garment colour: the stored value, the label the boxes show, and the swatch. */
export type EditorColorOption = { value: string; label: string; hex: string };

// Real garment colours, so the swatch is the colour the customer actually picks rather than a
// theme token. `white` stays first because the editor opens on it.
export const COLOR_OPTIONS: readonly EditorColorOption[] = [
  { value: "white", label: "White", hex: "#ffffff" },
  { value: "black", label: "Black", hex: "#111111" },
  { value: "navy", label: "Navy", hex: "#1e3a5f" },
  { value: "red", label: "Red", hex: "#dc2626" },
  { value: "blue", label: "Blue", hex: "#2563eb" },
  { value: "green", label: "Green", hex: "#16a34a" },
  { value: "yellow", label: "Yellow", hex: "#facc15" },
  { value: "grey", label: "Grey", hex: "#6b7280" },
  { value: "sand", label: "Sand", hex: "#d4b78b" },
] as const;

/** The colour labels the admin price book keys on. */
export const COLOR_LABELS = COLOR_OPTIONS.map((color) => color.label);

export type EditorAttributes = {
  printMethod: string;
  fabricType: string;
  knitStructure: string;
  cuttings: string;
};

export const DEFAULT_EDITOR_ATTRIBUTES: EditorAttributes = {
  printMethod: "DTF",
  fabricType: "Combed Cotton",
  knitStructure: "Single Jersey",
  cuttings: "Crew Neck",
};

/** Sublimation prints on polyester only, so the fabric list collapses to one option. */
export function fabricTypeOptions(printMethod: string): string[] {
  return printMethod === "Sublimation" ? ["Polyester"] : [...FABRIC_TYPE_OPTIONS];
}

/** Polyester knits are interlock or air layer; cotton knits are single jersey or interlock. */
export function knitStructureOptions(fabricType: string): string[] {
  return fabricType === "Polyester" ? ["Interlock", "Air Layer"] : ["Single Jersey", "Interlock"];
}

/**
 * Keeps the selection valid after an earlier choice changes: a value the cascade no longer
 * offers falls back to the first option still available instead of staying on screen.
 */
export function narrowEditorAttributes(attributes: EditorAttributes): EditorAttributes {
  const fabricTypes = fabricTypeOptions(attributes.printMethod);
  const fabricType = fabricTypes.includes(attributes.fabricType) ? attributes.fabricType : fabricTypes[0];
  const knitStructures = knitStructureOptions(fabricType);
  const knitStructure = knitStructures.includes(attributes.knitStructure) ? attributes.knitStructure : knitStructures[0];
  const cuttings = (MH_CUTTINGS_OPTIONS as readonly string[]).includes(attributes.cuttings)
    ? attributes.cuttings
    : MH_CUTTINGS_OPTIONS[0];
  return { ...attributes, fabricType, knitStructure, cuttings };
}
