// Plan §17 S1, S2 and S5: one normaliser for every search, shared by the editor's libraries.
const assert = require("node:assert/strict");
const test = require("node:test");
const { loadModule } = require("./helpers/load-ts-module.cjs");

const search = loadModule("apps/web/src/lib/search-text.ts");
const sidebar = require("node:fs").readFileSync("apps/web/src/components/EditorEditSidebar.tsx", "utf8");

const ZWSP = "\u200B";
const ZWNJ = "\u200C";

test("case, spaces and zero-width characters fold to one text", () => {
  assert.equal(search.normalizeSearchText("  Tee   BLACK "), "tee black");
  assert.equal(search.normalizeSearchText("မြန်မာ"), "မြန်မာ");
  assert.equal(search.normalizeSearchText(`မြန်${ZWSP}မာ`), "မြန်မာ");
  assert.equal(search.normalizeSearchText(`မြန်${ZWNJ}မာ`), "မြန်မာ");
  assert.equal(search.normalizeSearchText(null), "");
  assert.equal(search.normalizeSearchText(undefined), "");
});

test("the Myanmar signs that follow a consonant are put in the standard order", () => {
  // က + ွ + ျ (wa before ya, as a stray keyboard can store it) is the word ကျွ
  assert.equal(search.normalizeSearchText("\u1000\u103D\u103B"), "\u1000\u103B\u103D");
  // က + ာ + ိ is the word ကိ ာ: the i vowel comes before aa in storage order
  assert.equal(search.normalizeSearchText("\u1000\u102C\u102D"), "\u1000\u102D\u102C");
  // က + ာ + ေ is ကော: the e vowel comes before aa
  assert.equal(search.normalizeSearchText("\u1000\u102C\u1031"), "\u1000\u1031\u102C");
  // a correct cluster is left as it is
  assert.equal(search.normalizeSearchText("\u1000\u103C\u1031\u102C\u1004\u103A"), "\u1000\u103C\u1031\u102C\u1004\u103A");
  // real text is idempotent: ကောင်း keeps asat before visarga, ကြောင့် keeps dot below before asat
  for (const word of ["\u1000\u1031\u102C\u1004\u103A\u1038", "\u1000\u103C\u1031\u102C\u1004\u1037\u103A", "\u1019\u103C\u1014\u103A\u1019\u102C"]) {
    assert.equal(search.normalizeSearchText(word), word, JSON.stringify(word));
  }
});

test("the four acceptance words are found by a part of the word", () => {
  for (const word of ["မြန်မာ", "ကြောင်", "ပြည်ထောင်စု", "သင်္ကြန်"]) {
    assert.equal(search.matchesSearchQuery(`The shop ${word} shirt`, word.slice(0, 3)), true, word);
    assert.equal(search.matchesSearchQuery(`The shop ${word} shirt`, word), true, word);
  }
});

test("every query word must appear, and an empty query matches everything", () => {
  assert.equal(search.matchesSearchQuery("Tee — black", "black tee"), true);
  assert.equal(search.matchesSearchQuery("Tee — black", "black hoodie"), false);
  assert.equal(search.matchesSearchQuery("Tee — black", "   "), true);
  assert.equal(search.matchesSearchQuery("", "tee"), false);
});

test("an English name and its Myanmar name are one record", () => {
  const record = "Yangon street ရန်ကုန်လမ်း";
  assert.equal(search.matchesSearchQuery(record, "yangon"), true);
  assert.equal(search.matchesSearchQuery(record, "ရန်ကုန်"), true);
  assert.equal(search.matchesSearchQuery(record, `ရန်${ZWSP}ကုန်`), true);
});

test("the storefront query folds the same way and keeps the Myanmar marks", () => {
  const products = loadModule("apps/web/src/lib/products.ts");
  assert.equal(products.normalizeSearchQuery("  Tee %_ BLACK "), "tee black");
  assert.equal(products.normalizeSearchQuery(`အင်္${ZWSP}ကျီ`), "အင်္ကျီ");
  assert.equal(products.normalizeSearchQuery("x".repeat(80)).length, 60);
  assert.equal(products.normalizeSearchQuery(null), "");
});

test("the admin lists search through the shared normaliser", () => {
  const fs = require("node:fs");
  const dir = "apps/web/src/components/admin";
  for (const file of fs.readdirSync(dir).filter((name) => name.endsWith(".tsx"))) {
    const source = fs.readFileSync(`${dir}/${file}`, "utf8");
    assert.equal(source.includes(".includes(query)"), false, `${file} keeps its own filter`);
    assert.equal(source.includes("search.trim().toLowerCase()"), false, `${file} normalises its own query`);
  }
  const wired = fs.readdirSync(dir).filter((name) => name.endsWith(".tsx"))
    .filter((name) => fs.readFileSync(`${dir}/${name}`, "utf8").includes("matchesSearchQuery"));
  assert.ok(wired.length >= 11, `only ${wired.length} admin screens use the matcher`);
});

test("every Edit sidebar list searches through the shared normaliser", () => {
  assert.match(sidebar, /import \{ matchesSearchQuery \} from "@\/lib\/search-text"/);
  assert.equal(/\.toLowerCase\(\)\.includes\(needle\)/.test(sidebar), false, "no list keeps its own filter");
  const lists = ["design.name", "layer.name} ${layer.designName", "photo.name", "layer.name} ${keywordsByLayerId", "layer.name, query"];
  for (const list of lists) {
    assert.ok(sidebar.includes(`matchesSearchQuery(\`\${${list}`) || sidebar.includes(`matchesSearchQuery(${list}`), list);
  }
});
