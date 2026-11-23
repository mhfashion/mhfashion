// Plan §10 brush assets: the brush list the editor picker will read once R2 is connected. One
// grayscale PNG per brush at `brushes/<id>/texture.png`, used for the stroke and the thumbnail.
import {
  ADMIN_BRUSH_SHELVES, ADMIN_BRUSH_TIPS,
  type AdminBrush, type AdminBrushShelf, type AdminBrushTip,
} from "@/lib/admin-demo-data";

export const BRUSH_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const BRUSH_LIMITS = {
  size: { min: 4, max: 400 },
  spacing: { min: 1, max: 200 },
  opacity: { min: 0.05, max: 1 },
  softness: { min: 0, max: 1 },
  nameLength: 40,
} as const;

export type AdminBrushDraft = {
  id: string;
  name: string;
  shelf: AdminBrushShelf;
  tip: AdminBrushTip;
  size: number;
  spacing: number;
  opacity: number;
  softness: number;
};

/** The bucket key the texture will live at; the id is also the folder, so it is validated as one. */
export function brushTextureKey(id: string): string {
  return `brushes/${id}/texture.png`;
}

export function brushDraftFrom(brush?: AdminBrush): AdminBrushDraft {
  return {
    id: brush?.id ?? "",
    name: brush?.name ?? "",
    shelf: brush?.shelf ?? "Ink",
    tip: brush?.tip ?? "round",
    size: brush?.size ?? 52,
    spacing: brush?.spacing ?? 8,
    opacity: brush?.opacity ?? 0.9,
    softness: brush?.softness ?? 0,
  };
}

function inRange(value: number, range: { min: number; max: number }): boolean {
  return Number.isFinite(value) && value >= range.min && value <= range.max;
}

export function validateBrushDraft(
  draft: AdminBrushDraft,
  brushes: readonly AdminBrush[],
  editingId: string | null = null,
): string[] {
  const issues: string[] = [];
  const id = draft.id.trim();
  if (!id) issues.push("Give the brush an id — it is also its folder in the bucket.");
  else if (!BRUSH_ID_PATTERN.test(id)) issues.push("The id must be lowercase words joined by - (letters and digits only).");
  else if (brushes.some((brush) => brush.id === id && brush.id !== editingId)) issues.push(`A brush with the id "${id}" already exists.`);

  const name = draft.name.trim();
  if (!name) issues.push("Give the brush a name the picker can show.");
  else if (name.length > BRUSH_LIMITS.nameLength) issues.push(`Keep the name under ${BRUSH_LIMITS.nameLength} characters.`);

  if (!ADMIN_BRUSH_SHELVES.includes(draft.shelf)) issues.push("Pick a shelf the picker shows.");
  if (!ADMIN_BRUSH_TIPS.includes(draft.tip)) issues.push("The tip is either round or square.");
  if (!inRange(draft.size, BRUSH_LIMITS.size)) issues.push(`The size must be between ${BRUSH_LIMITS.size.min} and ${BRUSH_LIMITS.size.max}.`);
  if (!inRange(draft.spacing, BRUSH_LIMITS.spacing)) issues.push(`The spacing must be between ${BRUSH_LIMITS.spacing.min}% and ${BRUSH_LIMITS.spacing.max}%.`);
  if (!inRange(draft.opacity, BRUSH_LIMITS.opacity)) issues.push(`The opacity must be between ${BRUSH_LIMITS.opacity.min} and ${BRUSH_LIMITS.opacity.max}.`);
  if (!inRange(draft.softness, BRUSH_LIMITS.softness)) issues.push(`The softness must be between ${BRUSH_LIMITS.softness.min} and ${BRUSH_LIMITS.softness.max}.`);
  return issues;
}

export function brushFromDraft(draft: AdminBrushDraft, existing?: AdminBrush): AdminBrush {
  return {
    id: draft.id.trim(),
    name: draft.name.trim(),
    shelf: draft.shelf,
    tip: draft.tip,
    size: Math.round(draft.size),
    spacing: Math.round(draft.spacing),
    opacity: Number(draft.opacity.toFixed(2)),
    softness: Number(draft.softness.toFixed(2)),
    enabled: existing?.enabled ?? true,
  };
}

type BrushStore = { brushes: AdminBrush[] };

export function upsertBrush<T extends BrushStore>(data: T, brush: AdminBrush): T {
  const found = data.brushes.some((entry) => entry.id === brush.id);
  return { ...data, brushes: found ? data.brushes.map((entry) => (entry.id === brush.id ? brush : entry)) : [...data.brushes, brush] };
}

export function removeBrush<T extends BrushStore>(data: T, id: string): T {
  return { ...data, brushes: data.brushes.filter((entry) => entry.id !== id) };
}

export function toggleBrush<T extends BrushStore>(data: T, id: string): T {
  return { ...data, brushes: data.brushes.map((entry) => (entry.id === id ? { ...entry, enabled: !entry.enabled } : entry)) };
}

/** The list order is the picker order, so a brush moves by one place at a time. */
export function moveBrush<T extends BrushStore>(data: T, id: string, delta: number): T {
  const index = data.brushes.findIndex((entry) => entry.id === id);
  if (index < 0) return data;
  const target = index + delta;
  if (target < 0 || target >= data.brushes.length) return data;
  const brushes = [...data.brushes];
  const [moved] = brushes.splice(index, 1);
  brushes.splice(target, 0, moved);
  return { ...data, brushes };
}

export function enabledBrushCount(brushes: readonly AdminBrush[]): number {
  return brushes.filter((brush) => brush.enabled).length;
}
