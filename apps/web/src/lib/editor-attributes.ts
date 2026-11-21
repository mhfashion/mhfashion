// The apparel attribute chain from Plan §4.1, shared by the editor header bar and the admin
// pricing table. The lists are static until Attribute Management (plan §16 P2) drives them from
// the database; the narrowing rules below are the documented cascade, not a guess.

export const PRINT_METHOD_OPTIONS = ["DTF", "Sublimation"] as const;
export const FABRIC_TYPE_OPTIONS = ["Combed Cotton", "Compact Combed Cotton", "Polyester"] as const;
export const KNIT_STRUCTURE_OPTIONS = ["Single Jersey", "Interlock", "Air Layer"] as const;
export const MH_CUTTINGS_OPTIONS = ["Crew Neck", "V-Neck", "Polo Neck", "Round Neck"] as const;

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
