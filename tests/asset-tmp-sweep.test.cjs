// Plan §12.2.7: a photo that no saved design keeps lives for 24 hours. The hourly Worker pass sweeps it.
const assert = require("node:assert/strict");
const test = require("node:test");
const { loadModule } = require("./helpers/load-ts-module.cjs");

const sweep = loadModule("apps/web/src/lib/asset-tmp-sweep.ts");
const storeLib = loadModule("apps/web/src/lib/asset-store.ts");
const worker = loadModule("Worker/assets.ts");

const HOUR = 60 * 60 * 1000;
const NOW = new Date(Date.UTC(2026, 10, 27, 12, 0));

test("a temporary upload older than 24 hours is deleted, and a fresh one is kept", async () => {
  const clock = { at: new Date(NOW.getTime() - 30 * HOUR) };
  const store = storeLib.createMemoryAssetStore({}, { pageSize: 2, now: () => clock.at });
  await store.putObject("tmp/u-1/old.webp", new Uint8Array([1]), { contentType: "image/webp" });
  clock.at = new Date(NOW.getTime() - 2 * HOUR);
  await store.putObject("tmp/u-1/new.webp", new Uint8Array([2]), { contentType: "image/webp" });

  const lines = [];
  const result = await sweep.sweepTemporaryUploads(store, NOW, { log: (line) => lines.push(line) });
  assert.equal(result.scanned, 2);
  assert.deepEqual(result.deleted, ["tmp/u-1/old.webp"]);
  assert.equal(await store.head("tmp/u-1/old.webp"), null);
  assert.notEqual(await store.head("tmp/u-1/new.webp"), null);
  assert.match(lines.join("\n"), /assets: tmp swept, 1 file removed/);
});

test("the sweep follows the listing past its page size and leaves the other prefixes alone", async () => {
  const clock = { at: new Date(NOW.getTime() - 30 * HOUR) };
  const store = storeLib.createMemoryAssetStore({}, { pageSize: 2, now: () => clock.at });
  for (const name of ["a", "b", "c", "d"]) {
    await store.putObject(`tmp/u-1/${name}.webp`, new Uint8Array([1]), { contentType: "image/webp" });
  }
  await store.putObject("users/u-1/uploads/kept.webp", new Uint8Array([1]), { contentType: "image/webp" });
  await store.put("tmp/u-1/quota.json", JSON.stringify({ windowStart: NOW.getTime(), count: 4 }));

  const result = await sweep.sweepTemporaryUploads(store, NOW);
  assert.deepEqual(result.deleted.sort(), [
    "tmp/u-1/a.webp", "tmp/u-1/b.webp", "tmp/u-1/c.webp", "tmp/u-1/d.webp", "tmp/u-1/quota.json",
  ]);
  assert.notEqual(await store.head("users/u-1/uploads/kept.webp"), null, "a saved design's photo is not swept");
});

test("a file the bucket cannot date is kept and reported, never deleted on a guess", async () => {
  const store = storeLib.createMemoryAssetStore({ "tmp/u-1/undated.webp": "not-really-a-webp" });
  const lines = [];
  const result = await sweep.sweepTemporaryUploads(store, NOW, { log: (line) => lines.push(line) });
  assert.deepEqual(result.deleted, []);
  assert.deepEqual(result.undated, ["tmp/u-1/undated.webp"]);
  assert.match(lines.join("\n"), /kept tmp\/u-1\/undated\.webp, the bucket reports no write time/);
});

test("an empty bucket sweeps nothing and says nothing", async () => {
  const store = storeLib.createMemoryAssetStore({});
  const lines = [];
  const result = await sweep.sweepTemporaryUploads(store, NOW, { log: (line) => lines.push(line) });
  assert.deepEqual(result, { scanned: 0, deleted: [], undated: [] });
  assert.deepEqual(lines, []);
});

test("the hourly pass rebuilds the catalogues and sweeps tmp in the same run", async () => {
  const clock = { at: new Date(NOW.getTime() - 30 * HOUR) };
  const buckets = storeLib.createMemoryAssetBuckets({}, {}, { now: () => clock.at });
  await buckets.private.putObject("tmp/u-1/old.webp", new Uint8Array([1]), { contentType: "image/webp" });
  clock.at = new Date(NOW.getTime() - HOUR);
  await buckets.private.putObject("tmp/u-1/fresh.webp", new Uint8Array([1]), { contentType: "image/webp" });

  const summary = await worker.handleScheduled({}, { buckets, now: () => NOW, log: () => {} });
  assert.equal(summary.kinds.length, 8);
  assert.deepEqual(summary.sweptTmp.deleted, ["tmp/u-1/old.webp"]);
  assert.equal(await buckets.private.head("tmp/u-1/fresh.webp") !== null, true);
});
