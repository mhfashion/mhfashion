// Plan §17 S2: the answer is ordered by how well the name answers the query, then popularity, then name.
const assert = require("node:assert/strict");
const test = require("node:test");
const { loadModule } = require("./helpers/load-ts-module.cjs");

const rank = loadModule("apps/web/src/lib/search-rank.ts");

const names = (items) => items.map((item) => item.name);

test("the exact name answers first, then the prefix, then the name that contains the query", () => {
  const items = [
    { name: "Abstract Butterfly Print" },
    { name: "Butterfly Hoodie" },
    { name: "Butterfly" },
  ];
  assert.deepEqual(names(rank.rankSearchResults(items, "butterfly")), ["Butterfly", "Butterfly Hoodie", "Abstract Butterfly Print"]);
  assert.equal(rank.searchRankOf(items[0], "butterfly"), rank.SEARCH_RANK_NAME);
  assert.equal(rank.searchRankOf(items[1], "butterfly"), rank.SEARCH_RANK_PREFIX);
  assert.equal(rank.searchRankOf(items[2], "butterfly"), rank.SEARCH_RANK_EXACT);
});

test("a match in the tags, the Myanmar name or the type ranks after a match in the name", () => {
  const items = [
    { name: "Everyday Tee", text: "cotton streetwear t-shirt" },
    { name: "Street Hoodie", text: "streetwear hoodie" },
  ];
  assert.deepEqual(names(rank.rankSearchResults(items, "street")), ["Street Hoodie", "Everyday Tee"]);
  assert.equal(rank.searchRankOf(items[0], "street"), rank.SEARCH_RANK_OTHER);
  const myanmar = [
    { name: "Everyday Tee", text: "ရန်ကုန် လမ်း" },
    { name: "Yangon Street Tee", text: "streetwear" },
  ];
  assert.deepEqual(names(rank.rankSearchResults(myanmar, "ရန်ကုန်")), ["Everyday Tee"]);
});

test("a query that does not answer a record drops it", () => {
  const items = [{ name: "Butterfly" }, { name: "Hoodie" }];
  assert.deepEqual(names(rank.rankSearchResults(items, "butterfly hoodie")), []);
  assert.equal(rank.searchRankOf(items[1], "butterfly"), null);
  assert.deepEqual(names(rank.rankSearchResults(items, "")), ["Butterfly", "Hoodie"], "an empty query keeps everything");
});

test("ties break by popularity and then by name, and the limit cuts the tail", () => {
  const items = [
    { name: "Zebra Tee", popularity: 0 },
    { name: "Alpha Tee", popularity: 0 },
    { name: "New Tee", popularity: 5 },
  ];
  assert.deepEqual(names(rank.rankSearchResults(items, "tee")), ["New Tee", "Alpha Tee", "Zebra Tee"]);
  assert.deepEqual(names(rank.rankSearchResults(items, "tee", 2)), ["New Tee", "Alpha Tee"]);
  assert.deepEqual(rank.rankSearchResults(items, "tee", 0), []);
});

test("the order does not depend on the order the rows arrive in", () => {
  const items = [
    { name: "Butterfly Hoodie" },
    { name: "Butterfly" },
    { name: "Abstract Butterfly Print" },
  ];
  const forward = names(rank.rankSearchResults(items, "butterfly"));
  const backward = names(rank.rankSearchResults([...items].reverse(), "butterfly"));
  assert.deepEqual(forward, backward);
});
