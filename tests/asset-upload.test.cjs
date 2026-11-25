const assert = require("node:assert/strict");
const test = require("node:test");
const { loadModule } = require("./helpers/load-ts-module.cjs");

const upload = loadModule("apps/web/src/lib/asset-upload.ts");
const storeLib = loadModule("apps/web/src/lib/asset-store.ts");

function png(width, height) {
  const header = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(header, 0);
  header.writeUInt32BE(13, 8);
  header.write("IHDR", 12, "ascii");
  header.writeUInt32BE(width, 16);
  header.writeUInt32BE(height, 20);
  return new Uint8Array(header);
}

test("the hourly quota starts a fresh window and stops at the limit", () => {
  const start = Date.UTC(2026, 10, 25, 9, 0, 0);
  assert.deepEqual(upload.readUploadQuota(null, start), { windowStart: start, count: 0 });
  assert.deepEqual(upload.readUploadQuota("not json", start), { windowStart: start, count: 0 });
  assert.deepEqual(upload.readUploadQuota(JSON.stringify({ windowStart: start, count: 3 }), start + 1000), {
    windowStart: start,
    count: 3,
  });

  const inside = { windowStart: start, count: 20 };
  assert.deepEqual(upload.nextUploadQuota(inside, start + 59 * 60 * 1000), inside);
  assert.equal(upload.uploadAllowed(inside), false);
  assert.deepEqual(upload.nextUploadQuota(inside, start + 60 * 60 * 1000), { windowStart: start + 60 * 60 * 1000, count: 0 });
  assert.equal(upload.uploadAllowed({ windowStart: start, count: 19 }), true);
});

test("an upload key is built under the customer's own temporary folder", () => {
  assert.equal(upload.uploadKeyFor("user-1", "9f1c", "webp"), "uploads/tmp/user-1/9f1c.webp");
  assert.throws(() => upload.uploadKeyFor("User 1", "9f1c", "webp"));
});

test("checkUpload refuses text, allows a photo and answers 429 over the limit", async () => {
  const refused = await upload.checkUpload({
    userId: "user-1",
    uploadId: "a1",
    data: new TextEncoder().encode("not an image"),
    ext: "webp",
    quota: { windowStart: 0, count: 0 },
  });
  assert.equal(refused.ok, false);
  assert.equal(refused.status, 400);
  assert.match(refused.reason, /not a file type the shop accepts/);

  const allowed = await upload.checkUpload({
    userId: "user-1",
    uploadId: "a1",
    data: png(800, 1000),
    ext: "png",
    quota: { windowStart: 0, count: 0 },
  });
  assert.equal(allowed.ok, true);
  assert.equal(allowed.key, "uploads/tmp/user-1/a1.png");
  assert.equal(allowed.contentType, "image/png");
  assert.match(allowed.sha256, /^[0-9a-f]{64}$/);

  const limited = await upload.checkUpload({
    userId: "user-1",
    uploadId: "a2",
    data: png(800, 1000),
    ext: "png",
    quota: { windowStart: 0, count: 20 },
  });
  assert.equal(limited.ok, false);
  assert.equal(limited.status, 429);
});

test("a promotion key is only formed from the caller's own temporary file", () => {
  assert.equal(upload.promotionKeyFor("uploads/tmp/user-1/a1.webp"), "uploads/user-1/a1.webp");
  assert.equal(upload.promotionKeyFor("uploads/user-1/a1.webp"), null);
  assert.equal(upload.promotionKeyFor("uploads/tmp/user-1/nested/a1.webp"), null);
  assert.equal(upload.promotionKeyFor("uploads/tmp/user-1/../x.webp"), null);
});

test("promoteUploads moves the caller's photos out of tmp and refuses anyone else's", async () => {
  const buckets = storeLib.createMemoryAssetBuckets({}, {});
  await buckets.private.putObject("uploads/tmp/user-1/a1.webp", new Uint8Array([1, 2, 3]), {
    contentType: "image/webp",
    customMetadata: { sha256: "abc" },
  });
  await buckets.private.putObject("uploads/tmp/user-2/b1.webp", new Uint8Array([4]), { contentType: "image/webp" });

  const result = await upload.promoteUploads(buckets.private, "user-1", [
    "uploads/tmp/user-1/a1.webp",
    "uploads/tmp/user-2/b1.webp",
    "orders/order-1/manifest.json",
  ]);
  assert.deepEqual(result.promoted, ["uploads/user-1/a1.webp"]);
  assert.deepEqual(result.refused, ["uploads/tmp/user-2/b1.webp", "orders/order-1/manifest.json"]);

  const promoted = await buckets.private.getObject("uploads/user-1/a1.webp");
  assert.equal(promoted.contentType, "image/webp");
  assert.equal(promoted.customMetadata.sha256, "abc");
  assert.equal(await buckets.private.head("uploads/tmp/user-1/a1.webp"), null, "the temporary copy is gone");
  assert.notEqual(await buckets.private.head("uploads/tmp/user-2/b1.webp"), null, "another customer's file stays");
});
