const assert = require("node:assert/strict");
const test = require("node:test");
const http = require("node:http");
const { loadModule } = require("./helpers/load-ts-module.cjs");

const quote = loadModule("apps/web/src/lib/delivery-quote.ts");

function request(city = "Yangon", weightGrams = 900) {
  return {
    reference: "#MH1101",
    requestedAt: "2026-11-25T10:00:00.000Z",
    merchant: { name: "MH Fashion", phone: "+95 9 000 112 233", address: "Yangon, Myanmar" },
    consignee: {
      name: "Kyaw Min",
      phone: "+95 9 449 330 127",
      email: "kyaw.min@example.com",
      address: { line1: "No. 45/A", township: "Mingalar Taung Nyunt", city },
    },
    parcels: [{ items: [], units: 3, weightGrams, longestSideCm: 30 }],
    totals: { units: 3, weightGrams, codAmountKs: 63000, cod: true },
    payment: "Cash on Delivery",
    notes: "",
  };
}

async function stub(handler) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return { url: `http://127.0.0.1:${port}`, close: () => new Promise((resolve) => server.close(resolve)) };
}

test("a parcel is billed in whole kilograms from the first one", () => {
  assert.equal(quote.billableWeightGrams(0), 1000);
  assert.equal(quote.billableWeightGrams(900), 1000);
  assert.equal(quote.billableWeightGrams(1000), 1000);
  assert.equal(quote.billableWeightGrams(1001), 2000);
  assert.equal(quote.billableWeightGrams(2400), 3000);
  assert.equal(quote.billableWeightGrams(Number.NaN), 1000);
});

test("the shop's table prices the first kilogram, each extra one, and ships free above the threshold", () => {
  const yangon = quote.tableDeliveryQuote({ city: "Yangon", weightGrams: 900 });
  assert.equal(yangon.feeKs, 2500);
  assert.equal(yangon.etaDays, "1-2");
  assert.equal(yangon.source, "table");
  assert.equal(yangon.weightGrams, 1000);

  const mandalay = quote.tableDeliveryQuote({ city: "Mandalay", weightGrams: 2400 });
  assert.equal(mandalay.feeKs, 3500 + 2 * 1200);

  const unknown = quote.tableDeliveryQuote({ city: "Hpa-An", weightGrams: 900 });
  assert.equal(unknown.feeKs, 4500, "a city the table does not name uses the default band");

  const spaced = quote.tableDeliveryQuote({ city: "  yAnGoN ", weightGrams: 900 });
  assert.equal(spaced.feeKs, 2500, "the city is matched case- and space-insensitively");

  const free = quote.tableDeliveryQuote({ city: "Yangon", weightGrams: 900, subtotalKs: 150_000 });
  assert.equal(free.feeKs, 0);
  assert.match(free.note, /free delivery/);
});

test("the courier's fee is used when it answers", async () => {
  let seen = null;
  const server = await stub((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      seen = { url: req.url, auth: req.headers.authorization, body: JSON.parse(body) };
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ feeKs: "3,200", service: "MH Express", etaDays: "1" }));
    });
  });
  try {
    const result = await quote.courierDeliveryQuote(request("Mandalay", 2400), { endpoint: server.url, token: "tok" });
    assert.equal(result.ok, true);
    assert.equal(result.quote.feeKs, 3200);
    assert.equal(result.quote.service, "MH Express");
    assert.equal(result.quote.etaDays, "1");
    assert.equal(result.quote.source, "courier");
    assert.equal(result.quote.weightGrams, 3000);
    assert.equal(seen.url, "/quote");
    assert.equal(seen.auth, "Bearer tok");
    assert.equal(seen.body.reference, "#MH1101");
    assert.equal(seen.body.consignee.address.city, "Mandalay");
  } finally {
    await server.close();
  }
});

test("a slow, failing or empty courier is a reason, never a crash", async () => {
  const slow = await stub((_req, res) => setTimeout(() => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ feeKs: 1000 }));
  }, 300));
  try {
    const timedOut = await quote.courierDeliveryQuote(request(), { endpoint: slow.url, timeoutMs: 50 });
    assert.deepEqual(timedOut, { ok: false, reason: "timeout" });
  } finally {
    await slow.close();
  }

  const broken = await stub((_req, res) => {
    res.writeHead(500);
    res.end("nope");
  });
  try {
    assert.deepEqual(await quote.courierDeliveryQuote(request(), { endpoint: broken.url }), { ok: false, reason: "http_500" });
  } finally {
    await broken.close();
  }

  const empty = await stub((_req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end("{}");
  });
  try {
    assert.deepEqual(await quote.courierDeliveryQuote(request(), { endpoint: empty.url }), { ok: false, reason: "no_fee" });
  } finally {
    await empty.close();
  }

  assert.deepEqual(await quote.courierDeliveryQuote(request(), { endpoint: "" }), { ok: false, reason: "not_configured" });
});

test("checkout always gets a fee: the courier's, or the table's with the reason named", async () => {
  const fallback = await quote.quoteDelivery(request("Yangon", 900), { endpoint: "" });
  assert.equal(fallback.source, "table");
  assert.equal(fallback.feeKs, 2500);
  assert.match(fallback.note, /not_configured/);

  const server = await stub((_req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ feeKs: 2900 }));
  });
  try {
    const courier = await quote.quoteDelivery(request("Yangon", 900), { endpoint: server.url });
    assert.equal(courier.source, "courier");
    assert.equal(courier.feeKs, 2900);
  } finally {
    await server.close();
  }

  const free = await quote.quoteDelivery(request("Yangon", 900), { endpoint: "", subtotalKs: 200_000 });
  assert.equal(free.feeKs, 0);
});
