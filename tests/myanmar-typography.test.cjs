const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const read = (relativePath) => readFileSync(path.join(__dirname, "..", relativePath), "utf8");

function dictionarySections() {
  const source = read("apps/web/src/lib/i18n.tsx");
  const splitAt = source.indexOf("const my: Dictionary");
  assert.ok(splitAt > 0, "i18n.tsx has an en and a my dictionary");
  return { en: source.slice(0, splitAt), my: source.slice(splitAt) };
}

const keysOf = (section) => new Set([...section.matchAll(/"([a-z][\w.]*)":/g)].map((match) => match[1]));

// Brand names (MH Fashion, Nyein, Singular) read the same in both languages, so they are not a gap.
const SAME_IN_BOTH = ["nav.mhFashion", "nav.singular", "nav.nyein"];

test("every English label has a Myanmar one, so no screen falls back mid-page", () => {
  const { en, my } = dictionarySections();
  const myKeys = keysOf(my);
  const missing = [...keysOf(en)].filter((key) => !myKeys.has(key));
  assert.deepEqual(missing, [], `these labels have no Myanmar text: ${missing.join(", ")}`);
});

test("no label is left as its English text by accident", () => {
  const { en, my } = dictionarySections();
  const english = (section) => new Map([...section.matchAll(/"([a-z][\w.]*)":\s*"((?:[^"\\]|\\.)*)"/g)].map((m) => [m[1], m[2]]));
  const enText = english(en);
  const myText = english(my);
  const untranslated = [...myText.keys()].filter((key) => enText.get(key) === myText.get(key) && !SAME_IN_BOTH.includes(key));
  assert.deepEqual(untranslated, [], `these labels are still the English text: ${untranslated.join(", ")}`);
});

test("the search labels are translated in both languages", () => {
  const { en, my } = dictionarySections();
  const searchKeys = (section) => [...keysOf(section)].filter((key) => key.startsWith("search."));
  assert.deepEqual(searchKeys(en).sort(), searchKeys(my).sort());
  assert.ok(searchKeys(en).length >= 25, "the search screen's labels are in the dictionary");
});

test("the search page's labels are all translated", () => {
  const { en } = dictionarySections();
  const keys = keysOf(en);
  for (const key of [
    "search.title",
    "search.inputLabel",
    "search.placeholder",
    "search.submit",
    "search.clear",
    "search.resultCount",
    "search.resultCountOne",
    "search.emptyTitle",
    "search.groupEmpty",
    "search.tablist",
    "search.tab.products",
    "search.tab.guides",
    "search.tab.designs",
    "search.group.product",
    "search.group.guide",
    "search.group.design",
  ]) {
    assert.ok(keys.has(key), `the search page needs ${key}`);
  }
  const tabs = read("apps/web/src/components/SearchTabs.tsx");
  assert.ok(tabs.includes('t(`search.tab.${tab.type}`)'), "the tabs read their label from the dictionary");
  assert.ok(tabs.includes('t(`search.group.${group.replace(/s$/, "")}`)'), "the group name is the singular dictionary entry");
  assert.ok(read("apps/web/src/components/SearchField.tsx").includes('t("search.inputLabel")'));
});

test("Myanmar text gets the line box it needs, and only in Myanmar", () => {
  const css = read("apps/web/src/app/globals.css");
  const rule = css.match(/html\[lang="my"\][^{]*\{[^}]*line-height:\s*([\d.]+)/);
  assert.ok(rule, "globals.css grows the line box for html[lang=my]");
  // Noto Sans Myanmar reports a 2.17em font line box; a Latin line height lets two lines collide.
  assert.ok(Number(rule[1]) >= 1.9, `Myanmar line height ${rule[1]} is shorter than the font's own line box`);
  assert.ok(/html\[lang="my"\]/.test(css) && !/^\s*html\s*\{[^}]*line-height/m.test(css), "Latin text keeps its own line height");
});

test("the font stack names each platform's Myanmar face", () => {
  const config = read("apps/web/tailwind.config.ts");
  for (const face of ["Noto Sans Myanmar", "Myanmar Sangam MN", "Myanmar Text", "Padauk", "Pyidaungsu"]) {
    assert.ok(config.includes(face), `the font stack should name ${face}`);
  }
  const sans = config.match(/sans:\s*\[([\s\S]*?)\]/);
  assert.ok(sans, "tailwind.config.ts sets fontFamily.sans");
  const order = [...sans[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  assert.ok(order.indexOf("Roboto") < order.indexOf("Noto Sans Myanmar"), "Latin faces come first so English keeps the system font");
  assert.equal(order[order.length - 1], "sans-serif", "the generic family stays last");
});
