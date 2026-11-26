// Plan E21 item 9: the shop's own saved presets per tool, and the last six colours and fonts.
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const ROOT = path.join(__dirname, "..");

function loadModule(relativePath) {
  const sourcePath = path.join(ROOT, relativePath);
  const compiled = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: sourcePath,
  }).outputText;
  const loaded = { exports: {} };
  const localRequire = (id) => {
    if (id.startsWith("@/")) return loadModule(`apps/web/src/${id.slice(2)}.ts`);
    throw new Error(`unexpected import: ${id}`);
  };
  new Function("module", "exports", "require", compiled)(loaded, loaded.exports, localRequire);
  return loaded.exports;
}

const presetsLib = loadModule("apps/web/src/lib/editor-presets.ts");

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => { data[key] = String(value); },
  };
}

test("a fresh library is empty for every tool", () => {
  const library = presetsLib.emptyEditorPresetLibrary();
  assert.deepEqual(Object.keys(library).sort(), ["brush", "eraser", "gradient", "pen", "pencil", "text"]);
  for (const list of Object.values(library)) assert.deepEqual(list, []);
  assert.equal(presetsLib.EDITOR_RECENT_LIMIT, 6);
});

test("saving keeps the newest first and makes a duplicate name unique", () => {
  let library = presetsLib.emptyEditorPresetLibrary();
  library = presetsLib.saveEditorPreset(library, { group: "brush", name: "Chalk", settings: { size: 40 } });
  library = presetsLib.saveEditorPreset(library, { group: "brush", name: "Chalk", settings: { size: 80 } });
  assert.deepEqual(library.brush.map((preset) => preset.name), ["Chalk (2)", "Chalk"]);
  assert.deepEqual(library.brush[0].settings, { size: 80 }, "the newest save holds the newest settings");
  assert.deepEqual(library.pencil, [], "another tool's list is untouched");
});

test("an unnamed save falls back to the next generated name", () => {
  let library = presetsLib.emptyEditorPresetLibrary();
  assert.equal(presetsLib.nextEditorPresetName(library, "eraser"), "Eraser preset 1");
  library = presetsLib.saveEditorPreset(library, { group: "eraser", name: "   ", settings: { size: 90 } });
  assert.equal(library.eraser[0].name, "Eraser preset 1");
  assert.equal(presetsLib.nextEditorPresetName(library, "eraser"), "Eraser preset 2");
});

test("names are cleaned, and the list is capped", () => {
  let library = presetsLib.emptyEditorPresetLibrary();
  library = presetsLib.saveEditorPreset(library, { group: "pen", name: `  fine\n\nline  ${"x".repeat(80)}`, settings: {} });
  assert.ok(library.pen[0].name.startsWith("fine line"));
  assert.ok(library.pen[0].name.length <= 40);
  for (let index = 0; index < 40; index += 1) {
    library = presetsLib.saveEditorPreset(library, { group: "pen", name: `pen ${index}`, settings: { width: index } });
  }
  assert.equal(library.pen.length, presetsLib.EDITOR_PRESET_LIMIT);
});

test("rename cleans the name, refuses an empty one and stays unique", () => {
  let library = presetsLib.emptyEditorPresetLibrary();
  library = presetsLib.saveEditorPreset(library, { group: "text", name: "Headline", settings: {} });
  library = presetsLib.saveEditorPreset(library, { group: "text", name: "Caption", settings: {} });
  const headline = library.text.find((preset) => preset.name === "Headline");
  const caption = library.text.find((preset) => preset.name === "Caption");

  library = presetsLib.renameEditorPreset(library, caption.id, "  Headline  ");
  assert.ok(library.text.some((preset) => preset.name === "Headline (2)"), "a clash gets a suffix");
  const unchanged = presetsLib.renameEditorPreset(library, caption.id, "   ");
  assert.deepEqual(unchanged, library, "an empty name changes nothing");
  assert.ok(library.text.some((preset) => preset.id === headline.id && preset.name === "Headline"));
});

test("deleting removes one preset and leaves the others", () => {
  let library = presetsLib.emptyEditorPresetLibrary();
  library = presetsLib.saveEditorPreset(library, { group: "gradient", name: "Sunset", settings: {} });
  library = presetsLib.saveEditorPreset(library, { group: "gradient", name: "Dawn", settings: {} });
  const sun = library.gradient.find((preset) => preset.name === "Sunset");
  library = presetsLib.deleteEditorPreset(library, sun.id);
  assert.deepEqual(library.gradient.map((preset) => preset.name), ["Dawn"]);
  assert.deepEqual(presetsLib.deleteEditorPreset(library, "missing"), library, "an unknown id is a no-op");
});

test("a stored library survives a reload, and junk is dropped", () => {
  let library = presetsLib.emptyEditorPresetLibrary();
  library = presetsLib.saveEditorPreset(library, { group: "brush", name: "Marker", settings: { size: 70, blend: "multiply" } });
  const storage = fakeStorage();
  assert.equal(presetsLib.writeEditorPresetLibrary(library, storage), true);

  const reloaded = presetsLib.readEditorPresetLibrary(storage);
  assert.deepEqual(reloaded.brush.map((preset) => preset.name), ["Marker"]);
  assert.deepEqual(reloaded.brush[0].settings, { size: 70, blend: "multiply" });

  const dirty = presetsLib.normalizeEditorPresetLibrary({
    brush: [
      { id: "a", name: "Good", settings: { size: 1 } },
      { id: "a", name: "Same id", settings: {} },
      { name: "No id", settings: {} },
      { id: "b", name: "", settings: {} },
      { id: "c", name: "No settings" },
      { id: "d", name: "Array settings", settings: [] },
      "nonsense",
    ],
    pencil: "not a list",
  });
  assert.deepEqual(dirty.brush, [{ id: "a", group: "brush", name: "Good", settings: { size: 1 } }]);
  assert.deepEqual(dirty.pencil, []);
});

test("a broken or unavailable storage never throws", () => {
  const broken = fakeStorage({ "mh-fashion-editor-presets-v1": "{not json" });
  assert.deepEqual(presetsLib.readEditorPresetLibrary(broken), presetsLib.emptyEditorPresetLibrary());
  assert.deepEqual(presetsLib.readEditorPresetLibrary(null), presetsLib.emptyEditorPresetLibrary());
  const full = { getItem: () => null, setItem: () => { throw new Error("quota"); } };
  assert.equal(presetsLib.writeEditorPresetLibrary(presetsLib.emptyEditorPresetLibrary(), full), false);
  assert.equal(presetsLib.writeEditorPresetLibrary(presetsLib.emptyEditorPresetLibrary(), null), false);
});

test("recents keep the newest six, without duplicates", () => {
  let colours = [];
  for (const colour of ["#111111", "#222222", "#333333", "#444444", "#555555", "#666666", "#777777"]) {
    colours = presetsLib.pushEditorRecent(colours, colour);
  }
  assert.equal(colours.length, 6);
  assert.equal(colours[0], "#777777");
  assert.ok(!colours.includes("#111111"), "the oldest fell off the end");

  colours = presetsLib.pushEditorRecent(colours, "#222222");
  assert.equal(colours[0], "#222222");
  assert.equal(colours.filter((colour) => colour === "#222222").length, 1, "re-picking moves it to the front");

  colours = presetsLib.pushEditorRecent(colours, "#ABCDEF");
  colours = presetsLib.pushEditorRecent(colours, "#abcdef");
  assert.equal(colours.filter((colour) => colour.toLowerCase() === "#abcdef").length, 1, "hex compares case-insensitively");
  assert.deepEqual(presetsLib.pushEditorRecent(colours, "  "), colours, "an empty value is ignored");
});

test("recents round-trip through storage, and junk is dropped", () => {
  const storage = fakeStorage();
  const recents = { colours: ["#202124", "#d4ff3f"], fonts: ["Georgia"] };
  assert.equal(presetsLib.writeEditorRecents(recents, storage), true);
  assert.deepEqual(presetsLib.readEditorRecents(storage), recents);

  const dirty = presetsLib.normalizeEditorRecents({ colours: ["#fff", null, "", 42, "#fff"], fonts: ["Georgia", { name: "x" }] });
  assert.deepEqual(dirty, { colours: ["#fff"], fonts: ["Georgia"] });
  assert.deepEqual(presetsLib.readEditorRecents(fakeStorage({ "mh-fashion-editor-recents-v1": "[]" })), { colours: [], fonts: [] });
});

test("the panel and the canvas share one library, and the tool groups line up", () => {
  const read = (relativePath) => readFileSync(path.join(ROOT, relativePath), "utf8");
  const panel = read("apps/web/src/components/EditorAdjustmentsPanel.tsx");
  const canvas = read("apps/web/src/components/EditorCanvas.tsx");

  assert.match(panel, /<Section title="Presets"/);
  assert.match(panel, /<Section title="Recents"/);
  assert.match(panel, /aria-label=\{`Apply preset \$\{preset\.name\}`\}/);
  assert.match(panel, /aria-label=\{`Rename preset \$\{preset\.name\}`\}/);
  assert.match(panel, /aria-label=\{`Delete preset \$\{preset\.name\}`\}/);
  assert.match(panel, /aria-label="Recent colours"/);
  assert.match(panel, /aria-label="Recent fonts"/);
  assert.match(panel, /function fontDisplayName\(font: string\)/);
  assert.match(panel, /role="option"/, "the font list still works");

  assert.match(canvas, /useState<EditorPresetLibrary>\(\(\) => readEditorPresetLibrary\(\)\)/);
  assert.match(canvas, /const next = saveEditorPreset\(presets, \{ group, name, settings: presetSettingsFor\(toolOptions, group\) \}\);/);
  assert.match(canvas, /storePresets\(renameEditorPreset\(presets, id, name\)\);/);
  assert.match(canvas, /storePresets\(deleteEditorPreset\(presets, id\)\);/);
  assert.match(canvas, /writeEditorPresetLibrary\(next\);/);
  assert.match(canvas, /writeEditorRecents\(recents\);/);
  assert.match(canvas, /lastRecentColourRef\.current === foregroundColor/);
  assert.match(canvas, /onPickColour=\{\(colour\) => setForegroundColor\(colour\)\}/);
});
