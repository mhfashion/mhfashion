const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

class EventTargetStub {
  listeners = new Map();

  addEventListener(type, listener, options) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push({ listener, options });
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter((item) => item.listener !== listener));
  }

  dispatch(type, event) {
    for (const { listener } of this.listeners.get(type) ?? []) listener(event);
    return event;
  }
}

function createEvent(properties = {}) {
  return {
    cancelable: true,
    defaultPrevented: false,
    preventDefault() { this.defaultPrevented = true; },
    ...properties,
  };
}

test("browser interaction guard blocks browser zoom and page context menus only", (t) => {
  const originalWindow = global.window;
  const originalDocument = global.document;
  const fakeWindow = new EventTargetStub();
  const fakeDocument = new EventTargetStub();
  global.window = fakeWindow;
  global.document = fakeDocument;
  t.after(() => {
    if (originalWindow === undefined) delete global.window;
    else global.window = originalWindow;
    if (originalDocument === undefined) delete global.document;
    else global.document = originalDocument;
  });

  const sourcePath = path.join(__dirname, "../apps/web/src/components/BrowserZoomGuard.tsx");
  const compiled = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: sourcePath,
  }).outputText;
  let cleanup;
  const module = { exports: {} };
  const localRequire = (name) => name === "react"
    ? { useEffect: (effect) => { cleanup = effect(); } }
    : require(name);
  new Function("require", "module", "exports", compiled)(localRequire, module, module.exports);
  module.exports.default();

  assert.equal(fakeWindow.dispatch("wheel", createEvent({ ctrlKey: true })).defaultPrevented, true);
  assert.equal(fakeWindow.dispatch("wheel", createEvent({ metaKey: true })).defaultPrevented, true);
  assert.equal(fakeWindow.dispatch("wheel", createEvent()).defaultPrevented, false);

  for (const shortcut of [
    { ctrlKey: true, key: "+", code: "Equal" },
    { ctrlKey: true, shiftKey: true, key: "=", code: "Equal" },
    { ctrlKey: true, key: "-", code: "Minus" },
    { ctrlKey: true, key: "0", code: "Digit0" },
    { ctrlKey: true, key: "+", code: "NumpadAdd" },
    { ctrlKey: true, key: "-", code: "NumpadSubtract" },
    { metaKey: true, key: "=", code: "Equal" },
    { metaKey: true, key: "0", code: "Digit0" },
  ]) {
    assert.equal(fakeWindow.dispatch("keydown", createEvent(shortcut)).defaultPrevented, true, JSON.stringify(shortcut));
  }
  assert.equal(fakeWindow.dispatch("keydown", createEvent({ ctrlKey: true, key: "s", code: "KeyS" })).defaultPrevented, false);
  assert.equal(fakeWindow.dispatch("keydown", createEvent({ key: "+", code: "Equal" })).defaultPrevented, false);

  assert.equal(fakeDocument.dispatch("contextmenu", createEvent({ button: 2 })).defaultPrevented, true);

  cleanup();
  assert.equal(fakeWindow.listeners.get("wheel").length, 0);
  assert.equal(fakeWindow.listeners.get("keydown").length, 0);
  assert.equal(fakeDocument.listeners.get("contextmenu").length, 0);
});
