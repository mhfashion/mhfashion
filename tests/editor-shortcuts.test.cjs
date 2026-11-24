const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function loadModule(relativePath) {
  const sourcePath = path.join(__dirname, "..", relativePath);
  const compiled = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: sourcePath,
  }).outputText;
  const loaded = { exports: {} };
  new Function("module", "exports", compiled)(loaded, loaded.exports);
  return loaded.exports;
}

// The helper asks `instanceof HTMLElement`, so the test supplies a stand-in element class.
class FakeElement {
  constructor(tagName, { editable = false, role = null } = {}) {
    this.tagName = tagName;
    this.isContentEditable = editable;
    this.role = role;
  }
  closest(selector) {
    if (this.isContentEditable && selector.includes('[contenteditable="true"]')) return this;
    if (this.role === "textbox" && selector.includes('[role="textbox"]')) return this;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(this.tagName) && selector.includes("input")) return this;
    return null;
  }
}
global.HTMLElement = FakeElement;

const shortcuts = loadModule("apps/web/src/lib/editor-shortcuts.ts");
const canvasSource = readFileSync(path.join(__dirname, "../apps/web/src/components/EditorCanvas.tsx"), "utf8");

const press = (overrides) => shortcuts.editorHistoryShortcut({ key: "", ...overrides });

test("Ctrl+Z and Cmd+Z undo", () => {
  assert.equal(press({ key: "z", ctrlKey: true }), "undo");
  assert.equal(press({ key: "z", metaKey: true }), "undo");
  assert.equal(press({ key: "Z", ctrlKey: true, shiftKey: true }), "redo", "Shift+Z redoes, whatever the case");
});

test("Ctrl+Shift+Z, Cmd+Shift+Z and Ctrl+Y redo, and Cmd+Y is left alone", () => {
  assert.equal(press({ key: "z", ctrlKey: true, shiftKey: true }), "redo");
  assert.equal(press({ key: "z", metaKey: true, shiftKey: true }), "redo");
  assert.equal(press({ key: "y", ctrlKey: true }), "redo");
  assert.equal(press({ key: "y", ctrlKey: true, shiftKey: true }), "redo");
  assert.equal(press({ key: "y", metaKey: true }), null, "Cmd+Y belongs to the browser");
});

test("a bare letter, an Alt combination and a composing keystroke do nothing", () => {
  assert.equal(press({ key: "z" }), null);
  assert.equal(press({ key: "y" }), null);
  assert.equal(press({ key: "z", ctrlKey: true, altKey: true }), null, "AltGr types characters");
  assert.equal(press({ key: "z", ctrlKey: true, isComposing: true }), null);
  assert.equal(press({ key: "a", ctrlKey: true }), null);
  assert.equal(press({ key: "F4", ctrlKey: true, code: "F4" }), null);
});

test("a text field keeps the browser's own undo", () => {
  const cases = [
    new FakeElement("INPUT"),
    new FakeElement("TEXTAREA"),
    new FakeElement("SELECT"),
    new FakeElement("DIV", { editable: true }),
    new FakeElement("DIV", { role: "textbox" }),
  ];
  for (const target of cases) {
    assert.equal(press({ key: "z", ctrlKey: true, target }), null, `${target.tagName} keeps its own undo`);
    assert.equal(press({ key: "z", ctrlKey: true, shiftKey: true, target }), null);
  }
  const canvasTarget = new FakeElement("DIV");
  assert.equal(press({ key: "z", ctrlKey: true, target: canvasTarget }), "undo", "the canvas itself still undoes");
});

test("a non-Latin layout falls back to the physical key, a Latin letter wins over it", () => {
  assert.equal(press({ key: "ဇ", code: "KeyZ", ctrlKey: true }), "undo", "Myanmar keyboard, Z position");
  assert.equal(press({ key: "ျ", code: "KeyY", ctrlKey: true }), "redo");
  assert.equal(press({ key: "z", code: "KeyW", ctrlKey: true }), "undo", "AZERTY: the letter wins");
  assert.equal(press({ key: "w", code: "KeyZ", ctrlKey: true }), null, "AZERTY: W is not the undo key");
  assert.equal(press({ key: "ဇ", code: "Unidentified", ctrlKey: true }), null);
});

test("the canvas binds the shortcut to the same undo and redo as the tool-bar buttons", () => {
  assert.match(canvasSource, /editorHistoryShortcut,/);
  assert.match(canvasSource, /\} from "@\/lib\/editor-shortcuts";/);
  assert.match(canvasSource, /const historyKeyHandlerRef = useRef<\(event: KeyboardEvent\) => void>/);
  assert.match(canvasSource, /if \(action === "undo"\) undoCanvasAction\(\);\n\s*else redoCanvasAction\(\);/);
  assert.match(canvasSource, /historyKeyHandlerRef\.current = \(event\) => \{\n\s*const action = editorHistoryShortcut\(event\);/);
});

// ---- E21 item 2: one letter per tool, brackets for the nib, X and D for the colours ------------------

const pressTool = (overrides) => shortcuts.editorToolShortcut({ key: "", ...overrides });

test("each tool has its letter, and the letters do not collide", () => {
  const expected = { v: "move", h: "hand", b: "brush", n: "pencil", p: "pen", t: "text", e: "eraser", u: "shape", g: "gradient" };
  for (const [key, tool] of Object.entries(expected)) {
    assert.deepEqual(pressTool({ key }), { kind: "tool", tool }, `${key} picks ${tool}`);
    assert.deepEqual(pressTool({ key: key.toUpperCase() }), { kind: "tool", tool }, `${key.toUpperCase()} picks ${tool} too`);
  }
  const letters = shortcuts.EDITOR_TOOL_SHORTCUTS.map((entry) => entry.key);
  assert.equal(new Set(letters).size, letters.length, "no two tools share a letter");
  assert.equal(shortcuts.editorToolShortcutKey("brush"), "B");
  assert.equal(shortcuts.editorToolShortcutKey("move"), "V");
});

test("a Myanmar layout still reaches the tool on the same physical key", () => {
  assert.deepEqual(pressTool({ key: "ဘ", code: "KeyB" }), { kind: "tool", tool: "brush" });
  assert.deepEqual(pressTool({ key: "ဩ", code: "Unidentified" }), null);
});

test("brackets step the nib and X / D touch the colours", () => {
  assert.deepEqual(pressTool({ key: "[", code: "BracketLeft" }), { kind: "brush-size", direction: -1 });
  assert.deepEqual(pressTool({ key: "]", code: "BracketRight" }), { kind: "brush-size", direction: 1 });
  assert.deepEqual(pressTool({ key: "{", code: "BracketLeft", shiftKey: true }), { kind: "brush-size", direction: -1 });
  assert.deepEqual(pressTool({ key: "x" }), { kind: "swap-colors" });
  assert.deepEqual(pressTool({ key: "d" }), { kind: "default-colors" });
  assert.equal(pressTool({ key: "q" }), null);
});

test("a modified key, a text field and a composition are left alone", () => {
  assert.equal(pressTool({ key: "b", ctrlKey: true }), null, "Ctrl+B stays the browser's");
  assert.equal(pressTool({ key: "b", metaKey: true }), null);
  assert.equal(pressTool({ key: "b", altKey: true }), null, "AltGr types characters");
  assert.equal(pressTool({ key: "b", isComposing: true }), null);
  assert.equal(pressTool({ key: "t", target: new FakeElement("TEXTAREA") }), null);
  assert.equal(pressTool({ key: "t", target: new FakeElement("INPUT") }), null);
  assert.equal(pressTool({ key: "t", target: new FakeElement("DIV", { editable: true }) }), null);
  assert.deepEqual(pressTool({ key: "t", target: new FakeElement("DIV") }), { kind: "tool", tool: "text" });
});

test("the nib steps by a tenth and never leaves the slider range", () => {
  assert.equal(shortcuts.stepBrushSize(52, 1), 57);
  assert.equal(shortcuts.stepBrushSize(52, -1), 47);
  assert.equal(shortcuts.stepBrushSize(1, -1), 1, "never below one");
  assert.equal(shortcuts.stepBrushSize(500, 1), 500, "never above the slider maximum");
  assert.equal(shortcuts.stepBrushSize(4, -1), 3, "a small nib still moves by at least one");
  assert.equal(shortcuts.stepBrushSize(0, 1), 1);
});

test("the canvas binds the letters, the brackets and the colours", () => {
  assert.match(canvasSource, /editorToolShortcut,/);
  assert.match(canvasSource, /const toolShortcutHandlerRef = useRef<\(event: KeyboardEvent\) => void>/);
  assert.match(canvasSource, /toolShortcutHandlerRef\.current = \(event\) => \{\n\s*const action = editorToolShortcut\(event\);/);
  assert.match(canvasSource, /if \(action\.kind === "tool"\) \{[\s\S]*?chooseTool\(action\.tool\);/);
  assert.match(canvasSource, /updateToolOptions\(\{ brush: \{ size: stepBrushSize\(toolOptions\.brush\.size, action\.direction\) \} \}\)/);
  assert.match(canvasSource, /if \(action\.kind === "swap-colors"\) swapColors\(\);/);
  assert.match(canvasSource, /setForegroundColor\(EDITOR_DEFAULT_FOREGROUND\);\n\s*setBackgroundColor\(EDITOR_DEFAULT_BACKGROUND\);/);
  // The bar's swap button and the X key share one function, so they cannot drift apart.
  assert.match(canvasSource, /onSwapColors=\{swapColors\}/);
  assert.match(canvasSource, /function swapColors\(\) \{\n\s*setForegroundColor\(backgroundColor\);\n\s*setBackgroundColor\(foregroundColor\);/);
  // The tool buttons print their key.
  const barSource = readFileSync(path.join(__dirname, "../apps/web/src/components/EditorToolsBar.tsx"), "utf8");
  assert.match(barSource, /const shortcut = editorToolShortcutKey\(id as EditorShortcutTool\);/);
  assert.match(barSource, /title=\{disabled \? "Drawing tools are off for photo layers" : `\$\{label\} \(\$\{shortcut\}\)`\}/);
  assert.match(barSource, /aria-keyshortcuts=\{shortcut \|\| undefined\}/);
});
