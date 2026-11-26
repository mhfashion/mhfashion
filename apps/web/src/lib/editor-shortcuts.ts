export type EditorHistoryShortcut = "undo" | "redo";

/** The tools a key can pick. The bar's own union also carries tools no key reaches. */
export type EditorShortcutTool = "move" | "hand" | "pencil" | "pen" | "text" | "brush" | "eraser" | "shape" | "gradient" | "eyedropper";

export type EditorToolShortcut =
  | { kind: "tool"; tool: EditorShortcutTool }
  | { kind: "brush-size"; direction: 1 | -1 }
  | { kind: "swap-colors" }
  | { kind: "default-colors" };

/** One letter per tool, shown in the tool's tooltip and bound below. */
export const EDITOR_TOOL_SHORTCUTS: ReadonlyArray<{ tool: EditorShortcutTool; key: string }> = [
  { tool: "move", key: "v" },
  { tool: "hand", key: "h" },
  { tool: "brush", key: "b" },
  { tool: "pencil", key: "n" },
  { tool: "pen", key: "p" },
  { tool: "text", key: "t" },
  { tool: "eraser", key: "e" },
  { tool: "shape", key: "u" },
  { tool: "gradient", key: "g" },
  { tool: "eyedropper", key: "i" },
];

/** The letter a tool's tooltip prints, e.g. "V". */
export function editorToolShortcutKey(tool: EditorShortcutTool): string {
  return (EDITOR_TOOL_SHORTCUTS.find((entry) => entry.tool === tool)?.key ?? "").toUpperCase();
}

export const EDITOR_DEFAULT_FOREGROUND = "#202124";
export const EDITOR_DEFAULT_BACKGROUND = "#ffffff";

/** `[` and `]` step the active nib by a tenth, clamped to what the sliders allow. */
export function stepBrushSize(size: number, direction: 1 | -1): number {
  const step = Math.max(1, Math.round(size * 0.1));
  return Math.max(1, Math.min(500, size + step * direction));
}

/** Only the fields the shortcut reads, so a test can pass a plain object. */
export type HistoryShortcutEvent = {
  key: string;
  code?: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  isComposing?: boolean;
  target?: EventTarget | null;
};

const LATIN_LETTER = /^[a-z]$/i;

/**
 * A text field keeps the browser's own undo: rolling back a design because the caret was in a
 * search box loses work the user can see.
 */
function isTextField(target: EventTarget | null | undefined): boolean {
  if (!target || typeof HTMLElement === "undefined" || !(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return true;
  return target.closest('[contenteditable="true"], [role="textbox"], input, textarea, select') !== null;
}

/**
 * The physical key, used when the active layout does not produce a Latin letter (a Myanmar
 * keyboard reports "ဇ" for the Z key). A layout that does produce a letter wins, so AZERTY's
 * Z position still means the letter printed on the key.
 */
function shortcutLetter(event: HistoryShortcutEvent): string | null {
  if (LATIN_LETTER.test(event.key)) return event.key.toLowerCase();
  const code = event.code ?? "";
  if (code.startsWith("Key") && code.length === 4) return code.slice(3).toLowerCase();
  return null;
}

/**
 * `Ctrl+Z` / `Cmd+Z` undo, `Ctrl+Shift+Z`, `Cmd+Shift+Z` and `Ctrl+Y` redo. `Cmd+Y` is left
 * alone, Alt combinations are ignored (AltGr types characters), and so is a keystroke that is
 * still composing in an input method.
 */
export function editorHistoryShortcut(event: HistoryShortcutEvent): EditorHistoryShortcut | null {
  if (event.isComposing || event.altKey) return null;
  if (!event.ctrlKey && !event.metaKey) return null;
  if (isTextField(event.target)) return null;
  const letter = shortcutLetter(event);
  if (letter === "z") return event.shiftKey ? "redo" : "undo";
  if (letter === "y") return event.metaKey && !event.ctrlKey ? null : "redo";
  return null;
}

/**
 * The plain-letter tool shortcuts (E21 item 2): V H B N P T E U G I, `[` and `]` for the nib size, X to swap
 * the two colours and D for the defaults. No modifier is allowed, so Ctrl+Z still undoes and a browser
 * shortcut is never swallowed; a text field, an input method composition and AltGr are left alone.
 */
export function editorToolShortcut(event: HistoryShortcutEvent): EditorToolShortcut | null {
  if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return null;
  if (isTextField(event.target)) return null;
  if (event.code === "BracketLeft") return { kind: "brush-size", direction: -1 };
  if (event.code === "BracketRight") return { kind: "brush-size", direction: 1 };
  const letter = shortcutLetter(event);
  if (!letter) return null;
  const tool = EDITOR_TOOL_SHORTCUTS.find((entry) => entry.key === letter)?.tool;
  if (tool) return { kind: "tool", tool };
  if (letter === "x") return { kind: "swap-colors" };
  if (letter === "d") return { kind: "default-colors" };
  return null;
}
