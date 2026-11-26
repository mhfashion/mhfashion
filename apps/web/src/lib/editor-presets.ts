import type { EditorToolOptions } from "@/lib/editor-layers";

/** The tools whose settings a preset can hold. Move, Hand, Shape and the Eyedropper have none. */
export type EditorPresetGroup = "brush" | "pencil" | "eraser" | "pen" | "gradient" | "text";

export const EDITOR_PRESET_GROUPS: EditorPresetGroup[] = ["brush", "pencil", "eraser", "pen", "gradient", "text"];

export type EditorPreset = {
  id: string;
  group: EditorPresetGroup;
  name: string;
  settings: Record<string, unknown>;
};

export type EditorPresetLibrary = Record<EditorPresetGroup, EditorPreset[]>;

/** Colours and fonts a shop used last, newest first. */
export type EditorRecents = { colours: string[]; fonts: string[] };

export const EDITOR_PRESET_LIMIT = 24;
export const EDITOR_RECENT_LIMIT = 6;
export const EDITOR_PRESETS_STORAGE_KEY = "mh-fashion-editor-presets-v1";
export const EDITOR_RECENTS_STORAGE_KEY = "mh-fashion-editor-recents-v1";

const PRESET_GROUP_LABELS: Record<EditorPresetGroup, string> = {
  brush: "Brush",
  pencil: "Pencil",
  eraser: "Eraser",
  pen: "Pen",
  gradient: "Gradient",
  text: "Text",
};

/** The settings a preset stores, without the ids the tool bookkeeping adds. */
export function presetSettingsFor(options: EditorToolOptions, group: EditorPresetGroup): Record<string, unknown> {
  return { ...(options[group] as Record<string, unknown>) };
}

export function emptyEditorPresetLibrary(): EditorPresetLibrary {
  return { brush: [], pencil: [], eraser: [], pen: [], gradient: [], text: [] };
}

export function isEditorPresetGroup(value: unknown): value is EditorPresetGroup {
  return typeof value === "string" && (EDITOR_PRESET_GROUPS as string[]).includes(value);
}

/** Names are trimmed, single-spaced and capped, so a pasted line cannot wreck the list. */
export function cleanPresetName(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, 40) : "";
}

function uniquePresetName(taken: string[], wanted: string): string {
  if (!taken.includes(wanted)) return wanted;
  for (let index = 2; index < 100; index += 1) {
    const candidate = `${wanted} (${index})`;
    if (!taken.includes(candidate)) return candidate;
  }
  return `${wanted} (${taken.length + 1})`;
}

/** Tolerant read: anything stored by an older build, or a half-written value, is dropped. */
export function normalizeEditorPresetLibrary(value: unknown): EditorPresetLibrary {
  const library = emptyEditorPresetLibrary();
  if (!value || typeof value !== "object") return library;
  const seen = new Set<string>();
  for (const group of EDITOR_PRESET_GROUPS) {
    const stored = (value as Record<string, unknown>)[group];
    if (!Array.isArray(stored)) continue;
    for (const entry of stored) {
      if (!entry || typeof entry !== "object") continue;
      const record = entry as Record<string, unknown>;
      const id = typeof record.id === "string" ? record.id.trim() : "";
      const name = cleanPresetName(record.name);
      if (!id || !name || seen.has(id)) continue;
      if (!record.settings || typeof record.settings !== "object" || Array.isArray(record.settings)) continue;
      seen.add(id);
      library[group].push({ id, group, name, settings: { ...(record.settings as Record<string, unknown>) } });
      if (library[group].length >= EDITOR_PRESET_LIMIT) break;
    }
  }
  return library;
}

/** Saves the tool as it stands now; `id` lets a caller write over a preset it just created. */
export function saveEditorPreset(
  library: EditorPresetLibrary,
  { group, name, settings, id }: { group: EditorPresetGroup; name: string; settings: Record<string, unknown>; id?: string },
): EditorPresetLibrary {
  const clean = cleanPresetName(name) || nextEditorPresetName(library, group);
  const others = library[group].filter((preset) => preset.id !== id);
  const finalName = uniquePresetName(others.map((preset) => preset.name), clean);
  const preset: EditorPreset = {
    id: id ?? `preset-${group}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    group,
    name: finalName,
    settings: { ...settings },
  };
  return { ...library, [group]: [preset, ...others].slice(0, EDITOR_PRESET_LIMIT) };
}

export function renameEditorPreset(library: EditorPresetLibrary, id: string, name: string): EditorPresetLibrary {
  const group = EDITOR_PRESET_GROUPS.find((candidate) => library[candidate].some((preset) => preset.id === id));
  if (!group) return library;
  const clean = cleanPresetName(name);
  if (!clean) return library;
  const others = library[group].filter((preset) => preset.id !== id);
  const finalName = uniquePresetName(others.map((preset) => preset.name), clean);
  return { ...library, [group]: library[group].map((preset) => (preset.id === id ? { ...preset, name: finalName } : preset)) };
}

export function deleteEditorPreset(library: EditorPresetLibrary, id: string): EditorPresetLibrary {
  const group = EDITOR_PRESET_GROUPS.find((candidate) => library[candidate].some((preset) => preset.id === id));
  if (!group) return library;
  return { ...library, [group]: library[group].filter((preset) => preset.id !== id) };
}

/** "Brush preset 3" — the next name a Save would use. */
export function nextEditorPresetName(library: EditorPresetLibrary, group: EditorPresetGroup): string {
  const label = PRESET_GROUP_LABELS[group];
  const taken = library[group].map((preset) => preset.name);
  for (let index = library[group].length + 1; index < 1000; index += 1) {
    const candidate = `${label} preset ${index}`;
    if (!taken.includes(candidate)) return candidate;
  }
  return `${label} preset`;
}

/** Newest first, no duplicates (a hex colour compares case-insensitively), capped. */
export function pushEditorRecent<T extends string>(list: T[], value: T, limit = EDITOR_RECENT_LIMIT): T[] {
  const clean = typeof value === "string" ? value.trim() : "";
  if (!clean) return list;
  const key = (item: string) => (/^#[0-9a-f]{3,8}$/i.test(item) ? item.toLowerCase() : item);
  return [clean as T, ...list.filter((item) => key(item) !== key(clean))].slice(0, limit);
}

export type EditorStorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

function defaultStorage(): EditorStorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readEditorPresetLibrary(storage: EditorStorageLike | null = defaultStorage()): EditorPresetLibrary {
  if (!storage) return emptyEditorPresetLibrary();
  try {
    const raw = storage.getItem(EDITOR_PRESETS_STORAGE_KEY);
    return raw ? normalizeEditorPresetLibrary(JSON.parse(raw)) : emptyEditorPresetLibrary();
  } catch {
    return emptyEditorPresetLibrary();
  }
}

export function writeEditorPresetLibrary(library: EditorPresetLibrary, storage: EditorStorageLike | null = defaultStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(EDITOR_PRESETS_STORAGE_KEY, JSON.stringify(library));
    return true;
  } catch {
    return false;
  }
}

const DEFAULT_RECENTS: EditorRecents = { colours: [], fonts: [] };

export function normalizeEditorRecents(value: unknown, limit = EDITOR_RECENT_LIMIT): EditorRecents {
  // Stored lists are already newest-first, so this de-duplicates without reordering them.
  const read = (field: unknown) => {
    if (!Array.isArray(field)) return [];
    const list: string[] = [];
    const seen = new Set<string>();
    for (const item of field) {
      if (typeof item !== "string") continue;
      const clean = item.trim();
      if (!clean) continue;
      const key = /^#[0-9a-f]{3,8}$/i.test(clean) ? clean.toLowerCase() : clean;
      if (seen.has(key)) continue;
      seen.add(key);
      list.push(clean);
      if (list.length >= limit) break;
    }
    return list;
  };
  if (!value || typeof value !== "object") return { ...DEFAULT_RECENTS };
  const record = value as Record<string, unknown>;
  return { colours: read(record.colours), fonts: read(record.fonts) };
}

export function readEditorRecents(storage: EditorStorageLike | null = defaultStorage()): EditorRecents {
  if (!storage) return { ...DEFAULT_RECENTS };
  try {
    const raw = storage.getItem(EDITOR_RECENTS_STORAGE_KEY);
    return raw ? normalizeEditorRecents(JSON.parse(raw)) : { ...DEFAULT_RECENTS };
  } catch {
    return { ...DEFAULT_RECENTS };
  }
}

export function writeEditorRecents(recents: EditorRecents, storage: EditorStorageLike | null = defaultStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(EDITOR_RECENTS_STORAGE_KEY, JSON.stringify(recents));
    return true;
  } catch {
    return false;
  }
}
