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
  assert.match(canvasSource, /import \{ editorHistoryShortcut \} from "@\/lib\/editor-shortcuts";/);
  assert.match(canvasSource, /const historyKeyHandlerRef = useRef<\(event: KeyboardEvent\) => void>/);
  assert.match(canvasSource, /if \(action === "undo"\) undoCanvasAction\(\);\n\s*else redoCanvasAction\(\);/);
  assert.match(canvasSource, /historyKeyHandlerRef\.current = \(event\) => \{\n\s*const action = editorHistoryShortcut\(event\);/);
});
