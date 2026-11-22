export type EditorHistoryShortcut = "undo" | "redo";

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
