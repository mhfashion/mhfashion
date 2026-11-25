const assert = require("node:assert/strict");
const test = require("node:test");
const { loadModule } = require("./helpers/load-ts-module.cjs");

const worker = loadModule("Worker/assets.ts");
const storeLib = loadModule("apps/web/src/lib/asset-store.ts");
const catalogue = loadModule("apps/web/src/lib/asset-catalogue.ts");

const SITE = "https://mhfashionmm.com";
const admin = { id: "admin-1", role: "admin" };
const customer = { id: "user-1", role: "customer" };

const SVG = '<svg xmlns="http://www.w3.org/2000/svg"><g id="wave"><path d="M0 0"/></g></svg>';

function png(width, height) {
  const header = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(header, 0);
  header.writeUInt32BE(13, 8);
  header.write("IHDR", 12, "ascii");
  header.writeUInt32BE(width, 16);
  header.writeUInt32BE(height, 20);
  return header;
}

function request(path, init = {}) {
  return new Request(`https://assets.example.com${path}`, init);
}

function jsonBody(payload) {
  return { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) };
}

function base64(bytes) {
  return Buffer.from(bytes).toString("base64");
}

test("the read routes answer the snapshot with the site's CORS header and revalidate", async () => {
  const buckets = storeLib.createMemoryAssetBuckets({
    "designs/street-wave/meta.json": JSON.stringify({ slug: "street-wave", name: "Street Wave" }),
    "designs/street-wave/design.svg": SVG,
  });
  await catalogue.writeAssetCatalogue(buckets.public, buckets.private, "designs", new Date(2026, 10, 25));
  const env = { ASSETS_SITE_ORIGIN: SITE };

  const response = await worker.handleRequest(request("/api/assets/designs"), env, { buckets });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), SITE);
  assert.match(response.headers.get("cache-control"), /max-age=60/);
  const body = await response.json();
  assert.equal(body.items[0].slug, "street-wave");

  const again = await worker.handleRequest(
    request("/api/assets/designs", { headers: { "if-none-match": response.headers.get("etag") } }),
    env,
    { buckets },
  );
  assert.equal(again.status, 304);

  const unknown = await worker.handleRequest(request("/api/assets/secrets"), env, { buckets });
  assert.equal(unknown.status, 404);
  assert.equal((await unknown.json()).error, "unknown_kind");
});

test("without the bindings the Worker says so instead of guessing", async () => {
  const response = await worker.handleRequest(request("/api/assets/fonts"), {}, {});
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, "assets_unbound");
});

test("an admin upload builds the key, writes the file and its meta, and rebuilds that kind", async () => {
  const buckets = storeLib.createMemoryAssetBuckets();
  const env = { ASSETS_SITE_ORIGIN: SITE };
  const response = await worker.handleRequest(
    request("/api/admin/assets", jsonBody({
      shape: "design",
      vars: { slug: "street-wave", file: "design", ext: "svg" },
      meta: { slug: "street-wave", name: "Street Wave" },
      data: base64(Buffer.from(SVG)),
    })),
    env,
    { buckets, viewer: admin },
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.key, "designs/street-wave/design.svg");
  assert.equal(body.metaKey, "designs/street-wave/meta.json");
  assert.deepEqual(body.rebuilt, ["designs"]);
  assert.equal(buckets.public.objects.has("designs/street-wave/design.svg"), true);
  assert.equal(buckets.public.objects.get("designs/street-wave/design.svg").contentType, "image/svg+xml");
  assert.match(buckets.public.objects.get("designs/street-wave/design.svg").customMetadata.sha256, /^[0-9a-f]{64}$/);
  assert.equal(buckets.public.objects.get("designs/street-wave/design.svg").customMetadata.uploader, "admin-1");
  assert.equal(buckets.private.files.has("catalog/designs.json"), true);
});

test("the upload route refuses a stranger, a customer, a mislabeled file and a second write", async () => {
  const buckets = storeLib.createMemoryAssetBuckets();
  const env = {};
  const upload = (viewer) =>
    worker.handleRequest(
      request("/api/admin/assets", jsonBody({
        shape: "design",
        vars: { slug: "street-wave", file: "design", ext: "svg" },
        data: base64(Buffer.from(SVG)),
      })),
      env,
      { buckets, viewer },
    );

  assert.equal((await upload(null)).status, 401);
  assert.equal((await upload(customer)).status, 403);

  const mislabeled = await worker.handleRequest(
    request("/api/admin/assets", jsonBody({
      shape: "design",
      vars: { slug: "street-wave", file: "design", ext: "svg" },
      data: base64(png(10, 10)),
    })),
    env,
    { buckets, viewer: admin },
  );
  assert.equal(mislabeled.status, 400);
  assert.match((await mislabeled.json()).reason, /the name says \.svg but the bytes are png/);

  assert.equal((await upload(admin)).status, 200);
  const duplicate = await upload(admin);
  assert.equal(duplicate.status, 409);
  assert.equal((await duplicate.json()).error, "already_exists");

  const replaced = await worker.handleRequest(
    request("/api/admin/assets", jsonBody({
      shape: "design",
      vars: { slug: "street-wave", file: "design", ext: "svg" },
      data: base64(Buffer.from(SVG)),
      replace: true,
    })),
    env,
    { buckets, viewer: admin },
  );
  assert.equal(replaced.status, 200);
});

test("an SVG with a script is stored cleaned, and the change is named", async () => {
  const buckets = storeLib.createMemoryAssetBuckets();
  const response = await worker.handleRequest(
    request("/api/admin/assets", jsonBody({
      shape: "element",
      vars: { slug: "arrow", file: "element", ext: "svg" },
      data: base64(Buffer.from('<svg><script>x()</script><path d="M0 0"/></svg>')),
    })),
    {},
    { buckets, viewer: admin },
  );
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).cleaned, ["1 script"]);
  const stored = new TextDecoder().decode(buckets.public.objects.get("elements/arrow/element.svg").body);
  assert.ok(!stored.includes("<script"));
});

test("a private file is served to its owner and an admin, never to anyone else", async () => {
  const buckets = storeLib.createMemoryAssetBuckets({}, {});
  await buckets.private.putObject("uploads/user-1/photo.webp", new Uint8Array([1, 2, 3]), { contentType: "image/webp" });
  await buckets.private.putObject("orders/order-1/manifest.json", "{}", { contentType: "application/json" });

  const own = await worker.handleRequest(request("/api/private/uploads/user-1/photo.webp"), {}, { buckets, viewer: customer });
  assert.equal(own.status, 200);
  assert.equal(own.headers.get("content-type"), "image/webp");
  assert.equal(own.headers.get("cache-control"), "private, no-store");
  assert.equal(new Uint8Array(await own.arrayBuffer()).length, 3);

  const another = await worker.handleRequest(request("/api/private/uploads/user-2/photo.webp"), {}, { buckets, viewer: customer });
  assert.equal(another.status, 403);

  const order = await worker.handleRequest(request("/api/private/orders/order-1/manifest.json"), {}, { buckets, viewer: customer });
  assert.equal(order.status, 403, "a customer never reads an order file");

  const adminRead = await worker.handleRequest(request("/api/private/orders/order-1/manifest.json"), {}, { buckets, viewer: admin });
  assert.equal(adminRead.status, 200);

  const anonymous = await worker.handleRequest(request("/api/private/uploads/user-1/photo.webp"), {}, { buckets });
  assert.equal(anonymous.status, 401);
});

test("the admin issues route needs an admin", async () => {
  const buckets = storeLib.createMemoryAssetBuckets();
  assert.equal((await worker.handleRequest(request("/api/admin/assets/issues"), {}, { buckets, viewer: null })).status, 401);
  assert.equal((await worker.handleRequest(request("/api/admin/assets/issues"), {}, { buckets, viewer: customer })).status, 403);
  const adminRead = await worker.handleRequest(request("/api/admin/assets/issues"), {}, { buckets, viewer: admin });
  assert.equal(adminRead.status, 200);
  assert.equal((await adminRead.json()).summary.kinds, 6);
});

test("a queue message rebuilds the kinds it names, and the schedule does a full pass", async () => {
  const buckets = storeLib.createMemoryAssetBuckets({
    "fonts/padauk/meta.json": JSON.stringify({
      slug: "padauk",
      name: "Padauk",
      shelf: "sans",
      licence: { name: "OFL 1.1" },
      files: [{ file: "fonts/padauk/padauk-400.woff2", weight: 400 }],
    }),
    "fonts/padauk/padauk-400.woff2": "woff2",
  });
  const acked = [];
  const summary = await worker.handleQueue(
    {
      messages: [
        { body: { object: { key: "fonts/padauk/meta.json" } }, ack: () => acked.push("fonts") },
        { body: { key: "orders/order-1/manifest.json" }, ack: () => acked.push("orders") },
      ],
    },
    {},
    { buckets },
  );
  assert.deepEqual(summary.kinds.map((entry) => entry.kind), ["fonts"]);
  assert.deepEqual(acked, ["fonts", "orders"]);

  const full = await worker.handleScheduled({}, { buckets });
  assert.equal(full.kinds.length, 6);
});

test("an R2 event body is read in every shape it arrives in", () => {
  assert.deepEqual(worker.keysFromQueueMessage({ object: { key: "fonts/a/meta.json" } }), ["fonts/a/meta.json"]);
  assert.deepEqual(worker.keysFromQueueMessage({ key: "designs/b/design.svg" }), ["designs/b/design.svg"]);
  assert.deepEqual(
    worker.keysFromQueueMessage({ events: [{ object: { key: "mockups/product/tee/front.webp" } }, { key: "elements/c/element.svg" }] }),
    ["mockups/product/tee/front.webp", "elements/c/element.svg"],
  );
  assert.deepEqual(worker.keysFromQueueMessage(null), []);
});

test("an admin who floods the write route is stopped, and the limiter counts per caller", async () => {
  worker.resetWorkerRateLimits();
  const buckets = storeLib.createMemoryAssetBuckets();
  const upload = (viewer) =>
    worker.handleRequest(
      request("/api/admin/assets", jsonBody({
        shape: "element",
        vars: { slug: "arrow", file: "element", ext: "svg" },
        data: base64(Buffer.from(SVG)),
        replace: true,
      })),
      {},
      { buckets, viewer },
    );

  for (let index = 0; index < worker.WORKER_RATE_LIMITS.adminWrite.limit; index += 1) {
    assert.equal((await upload(admin)).status, 200, `write ${index + 1} is allowed`);
  }
  const blocked = await upload(admin);
  assert.equal(blocked.status, 429);
  assert.equal((await blocked.json()).error, "rate_limited");

  const other = { id: "admin-2", role: "admin" };
  assert.equal((await upload(other)).status, 200, "another admin keeps its own allowance");
  worker.resetWorkerRateLimits();
});
