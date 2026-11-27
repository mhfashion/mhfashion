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
const SAME_IN_BOTH = ["nav.mhFashion", "nav.singular", "nav.nyein", "new.eyebrow"];

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
  assert.ok(searchKeys(en).length >= 11, "the search screen's labels are in the dictionary");
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
    "search.emptyTitle",
  ]) {
    assert.ok(keys.has(key), `the search page needs ${key}`);
  }
  assert.equal(read("apps/web/src/app/search/page.tsx").includes("data-search-tab"), false, "the page has no group tabs");
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

test("a language switch never resizes a control", () => {
  // Prose keeps the tall box; a control keeps the 1.5 it was laid out with, so nothing jumps in size
  // when the locale changes. Without the second rule every button, pill and nav link grew ~1em.
  const css = read("apps/web/src/app/globals.css");
  assert.match(css, /html\[lang="my"\] :is\(p, li, h1, h2, h3, h4, h5, h6, dd, dt, blockquote, figcaption, td, th, textarea\) \{\n  line-height: 2\.1;/);
  assert.match(css, /html\[lang="my"\] :where\(a, span, label, button, input, select\) \{\n  line-height: 1\.5;/);
  assert.match(read("apps/web/src/components/Header.tsx"), /<header className="flex h-14 items-center justify-between/, "the header pill keeps its height");
  assert.match(read("apps/web/src/components/HeaderActions.tsx"), /flex h-\[30px\] w-56 items-center/, "the search field keeps its height");
  assert.match(read("apps/web/src/components/MobileBottomNav.tsx"), /fixed inset-x-0 bottom-0 z-\[60\] h-\[60px\]/, "the phone tab bar keeps its height");
  assert.match(read("apps/web/src/components/Footer.tsx"), /inline-flex h-5 items-center rounded border border-border-light/, "payment badges keep their height");
});

test("a language switch never resizes a banner, tile or card", () => {
  // Burmese sets a 2.1em line box, so a content-sized box grew by up to 60% on switch (the home banner
  // went 340 -> 509px). Every banner now carries a fixed height at each breakpoint, and its Burmese
  // headline is drawn smaller inside that height instead of stretching it.
  const css = read("apps/web/src/app/globals.css");
  assert.match(css, /html\[lang="my"\] \[data-hero\] h1 \{\n  font-size: 20px;/);
  assert.match(css, /@media \(min-width: 640px\) \{\n  html\[lang="my"\] \[data-hero\] h1 \{\n    font-size: 25px;/);
  assert.match(css, /@media \(min-width: 1024px\) \{\n  html\[lang="my"\] \[data-hero\] h1 \{\n    font-size: 40px;/);

  const heroes = [
    "apps/web/src/app/page.tsx",
    "apps/web/src/app/collections/page.tsx",
    "apps/web/src/app/new/page.tsx",
    "apps/web/src/app/popular/page.tsx",
    "apps/web/src/app/mh-fashion/page.tsx",
    "apps/web/src/app/nyein/page.tsx",
  ];
  for (const file of heroes) {
    const source = read(file);
    const hero = source.match(/<section data-hero className="([^"]+)"/);
    assert.ok(hero, `${file} marks its banner`);
    assert.match(hero[1], /(^|\s)h-\[\d+px\]/, `${file} pins the banner height`);
    assert.doesNotMatch(hero[1], /(^|\s)min-h-\[/, `${file} no longer grows with its copy`);
    assert.match(hero[1], /sm:h-\[\d+px\]/, `${file} pins the tablet height`);
    assert.match(hero[1], /lg:h-\[\d+px\]/, `${file} pins the desktop height`);
  }

  // A one-line bar and a link list keep the Latin line box, so the footer never changes height.
  assert.match(css, /html\[lang="my"\] \[data-tight-line\],\nhtml\[lang="my"\] \[data-tight-line\] \* \{\n  line-height: 1\.5;/);
  assert.match(read("apps/web/src/components/CopyrightBar.tsx"), /<p data-tight-line className=\{`text-center text-\[9px\]/);
  assert.match(read("apps/web/src/components/Footer.tsx"), /min-h-\[862px\] px-6 md:min-h-\[349px\]/);

  // Cards take the taller (Burmese) measure, so both languages render them the same height.
  assert.match(read("apps/web/src/app/collections/page.tsx"), /min-h-\[172px\] w-\[160px\] shrink-0 sm:w-auto/);
  assert.match(read("apps/web/src/app/nyein/page.tsx"), /min-h-\[275px\] overflow-hidden/);
  assert.match(read("apps/web/src/app/account/page.tsx"), /min-h-\[353px\] rounded-2xl border border-border bg-bg-surface p-5 sm:min-h-\[315px\]/);
  assert.match(read("apps/web/src/components/CartPageClient.tsx"), /min-h-\[390px\] rounded-2xl/);
  assert.match(read("apps/web/src/app/search/page.tsx"), /min-h-\[311px\] rounded-2xl border border-border bg-bg-surface p-8 text-center sm:min-h-\[212px\]/);
  assert.match(read("apps/web/src/components/guide/GuideBanner.tsx"), /min-h-\[206px\][^"]*lg:min-h-\[267px\]/);
});
