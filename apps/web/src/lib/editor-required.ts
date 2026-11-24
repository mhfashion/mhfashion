/**
 * The eight header choices a T-Shirt order must carry (plan E12). Buy is allowed only when every one of
 * them holds a value; a pre-filled default counts as chosen (decision D7). Save never asks.
 */
export type EditorSelectionKey =
  | "product"
  | "printMethod"
  | "fabricType"
  | "knitStructure"
  | "cuttings"
  | "gsm"
  | "color"
  | "size";

export type EditorSelectionValues = Partial<Record<EditorSelectionKey, string | null | undefined>>;

type SelectionCopy = { key: EditorSelectionKey; en: string; my: string };

/** In the order the boxes sit in the header, so a notice reads left to right with the bar. */
export const EDITOR_REQUIRED_SELECTIONS: readonly SelectionCopy[] = [
  { key: "product", en: "Product", my: "ထုတ်ကုန်" },
  { key: "printMethod", en: "Print Method", my: "ပရင့်နည်းလမ်း" },
  { key: "fabricType", en: "Fabric Type", my: "အထည်အမျိုးအစား" },
  { key: "knitStructure", en: "Knit Structure", my: "ထည်ရက်ပုံ" },
  { key: "cuttings", en: "MH Cuttings", my: "MH ကိုက်ပုံ" },
  { key: "gsm", en: "GSM", my: "GSM" },
  { key: "color", en: "Color", my: "အရောင်" },
  { key: "size", en: "Size", my: "အရွယ်အစား" },
] as const;

/** Blank counts as missing: an empty box is not a choice, a default is. */
function hasValue(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

/** The selections still to make, in header order. */
export function missingEditorSelections(values: EditorSelectionValues): EditorSelectionKey[] {
  return EDITOR_REQUIRED_SELECTIONS.filter((selection) => !hasValue(values[selection.key])).map((selection) => selection.key);
}

export function editorSelectionLabel(key: EditorSelectionKey, locale: "en" | "my" = "en") {
  return EDITOR_REQUIRED_SELECTIONS.find((selection) => selection.key === key)?.[locale] ?? key;
}

/** "Color, Size and GSM" — the same list, worded for a sentence. */
function joinLabels(labels: string[], conjunction: string) {
  if (labels.length <= 1) return labels[0] ?? "";
  return `${labels.slice(0, -1).join(", ")} ${conjunction} ${labels[labels.length - 1]}`;
}

/**
 * The one sentence Buy shows when something is missing. The owner reviews the Myanmar wording; the field
 * names come from the header labels, so a renamed box renames itself here.
 */
export function editorSelectionNotice(missing: EditorSelectionKey[], locale: "en" | "my" = "en") {
  if (!missing.length) return "";
  // Sorted and de-duplicated here too, so a caller passing its own list still reads in bar order.
  const ordered = EDITOR_REQUIRED_SELECTIONS.filter((selection) => missing.includes(selection.key));
  const labels = ordered.map((selection) => selection[locale]);
  if (locale === "my") return `${joinLabels(labels, "နှင့်")} ကို ရွေးပါ`;
  return `Choose ${joinLabels(labels, "and")} before buying`;
}
