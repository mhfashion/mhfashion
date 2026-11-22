const assert = require("node:assert/strict");
const test = require("node:test");
const { loadModule } = require("./helpers/load-ts-module.cjs");

const draft = loadModule("apps/web/src/lib/design-draft.ts");

const layer = (id) => ({
  id,
  name: id,
  kind: "stroke",
  visible: true,
  locked: false,
  opacity: 1,
  fillOpacity: 100,
  blendMode: "normal",
  strokes: [{ points: [{ x: 0.2, y: 0.2 }, { x: 0.6, y: 0.5 }], width: 40, color: "#202124", opacity: 1, roundness: 100, shape: "round" }],
  erasures: [],
});

function withStorage(setItem) {
  const store = new Map();
  global.window = {
    localStorage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: setItem ?? ((key, value) => store.set(key, value)),
      removeItem: (key) => store.delete(key),
    },
  };
  return store;
}

test("a browser without storage reports that the design was not saved", () => {
  delete global.window;
  assert.equal(draft.saveDesignDraft([layer("layer-1")]), false);
  assert.equal(draft.readDesignDraftSnapshot(), null);
});

test("a full quota or a private window returns false instead of throwing", () => {
  withStorage(() => { throw new Error("QuotaExceededError"); });
  assert.equal(draft.saveDesignDraft([layer("layer-1")]), false, "the editor can tell the customer");
  delete global.window;
});

test("where each layer was left on the canvas travels with the draft", () => {
  const store = withStorage();
  const placement = { "layer-1": { offset: { x: 205.5, y: 137.1 }, scale: { x: 1.25, y: 0.8 }, rotation: 15 } };
  assert.equal(draft.saveDesignDraft([layer("layer-1")], placement), true);
  const snapshot = draft.readDesignDraftSnapshot();
  assert.equal(snapshot.layers.length, 1);
  assert.equal(snapshot.layers[0].id, "layer-1");
  assert.deepEqual(snapshot.placement, placement, "a reload puts the layer back where it was left");
  assert.equal(JSON.parse(store.get(draft.DESIGN_DRAFT_KEY)).placement["layer-1"].rotation, 15);
  delete global.window;
});

test("an older draft without placement still opens, with every layer at its anchor", () => {
  // A draft written before placement was stored holds only `layers`.
  withStorage();
  global.window.localStorage.getItem = () => JSON.stringify({ layers: [layer("layer-4")] });
  const snapshot = draft.readDesignDraftSnapshot();
  assert.equal(snapshot.layers[0].id, "layer-4");
  assert.deepEqual(snapshot.placement, {}, "no placement means no transform, not a broken one");
  delete global.window;
});

test("a corrupt placement falls back to an untransformed layer", () => {
  withStorage();
  global.window.localStorage.getItem = () => JSON.stringify({
      layers: [layer("layer-2")],
      placement: {
        "layer-2": { offset: { x: "nope", y: null }, scale: { x: 0, y: -2 }, rotation: "spin" },
        "layer-9": null,
      },
    });
  const snapshot = draft.readDesignDraftSnapshot();
  assert.deepEqual(snapshot.placement["layer-2"], { offset: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, rotation: 0 });
  assert.equal(snapshot.placement["layer-9"], undefined, "an entry with no data is dropped");
  for (const value of Object.values(snapshot.placement)) {
    assert.ok(Number.isFinite(value.offset.x) && Number.isFinite(value.offset.y));
    assert.ok(Number.isFinite(value.rotation));
    assert.ok(value.scale.x > 0 && value.scale.y > 0, "a zero or negative scale would hide the layer");
  }
  delete global.window;
});

test("the product page still reads the layers alone", () => {
  withStorage();
  draft.saveDesignDraft([layer("layer-1"), layer("layer-2")], { "layer-2": { offset: { x: 10, y: 20 }, scale: { x: 1, y: 1 }, rotation: 0 } });
  assert.deepEqual(draft.readDesignDraft().map((entry) => entry.id), ["layer-1", "layer-2"]);
  draft.clearDesignDraft();
  assert.equal(draft.readDesignDraft(), null, "clearing the draft leaves nothing behind");
  delete global.window;
});

test("an unreadable draft is treated as no draft", () => {
  withStorage();
  global.window.localStorage.getItem = () => "{not json";
  assert.equal(draft.readDesignDraftSnapshot(), null);
  global.window.localStorage.getItem = () => JSON.stringify({ layers: "nope" });
  assert.equal(draft.readDesignDraftSnapshot(), null);
  delete global.window;
});
