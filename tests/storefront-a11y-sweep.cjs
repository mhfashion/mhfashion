// Structural accessibility sweep over every storefront route. Start the production app and a headless
// Chromium CDP endpoint first:
//   npm run start --workspace=apps/web -- --port 3000
//   chromium --headless=new --no-sandbox --remote-debugging-port=9222 about:blank
// then: node --test tests/storefront-a11y-sweep.cjs
// STOREFRONT_TEST_ORIGIN and STOREFRONT_CDP_URL override the localhost defaults.
const assert = require("node:assert/strict");
const origin = process.env.STOREFRONT_TEST_ORIGIN || "http://127.0.0.1:3000";
const cdp = process.env.STOREFRONT_CDP_URL || "http://127.0.0.1:9222";
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ROUTES = [
  "/", "/search", "/search?q=tee", "/products", "/new", "/popular", "/best-sellers", "/collections",
  "/mh-fashion", "/nyein", "/create", "/cart", "/checkout", "/account", "/wishlist", "/guide", "/faq",
  "/contact", "/about", "/privacy", "/returns", "/shipping", "/cookie-policy",
];

async function main() {
  const targets = await (await fetch(`${cdp}/json`)).json();
  const page = targets.find((target) => target.type === "page");
  assert.ok(page, "Start Chromium with a local remote-debugging port first");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  let sequence = 0;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    clearTimeout(entry.timer);
    if (message.error) entry.reject(new Error(JSON.stringify(message.error)));
    else entry.resolve(message.result);
  });
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`CDP timed out: ${method}`));
      }, 15000);
      pending.set(id, { resolve, reject, timer });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async function evaluate(fn) {
    const result = await send("Runtime.evaluate", { expression: `(${fn.toString()})()`, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  async function viewport(width, height, mobile) {
    await send("Emulation.setDeviceMetricsOverride", { width, height, mobile, deviceScaleFactor: 1 });
    await send("Emulation.setTouchEmulationEnabled", { enabled: mobile, maxTouchPoints: mobile ? 5 : 1 });
  }
  async function visit(path) {
    await send("Page.navigate", { url: `${origin}${path}` });
    for (let attempt = 0; attempt < 60; attempt += 1) {
      await pause(150);
      try {
        if (await evaluate(() => Boolean(document.querySelector("main")))) return;
      } catch (error) {
        if (!/Execution context was destroyed|Cannot find context/.test(String(error))) throw error;
      }
    }
    throw new Error(`${path} never rendered a <main>`);
  }
  await send("Page.enable");
  await send("Runtime.enable");

  // Everything the sweep reads comes from one pass so the numbers describe the same paint.
  const inspect = () => evaluate(() => {
    const visible = (element) => element.getClientRects().length > 0
      && !element.closest("[inert]")
      && !element.closest('[aria-hidden="true"]');
    const name = (element) => {
      const labelledBy = element.getAttribute("aria-labelledby");
      const fromLabel = labelledBy
        ? labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent || "").join(" ")
        : "";
      const fromLabels = element.labels ? [...element.labels].map((label) => label.textContent).join(" ") : "";
      return (element.getAttribute("aria-label") || fromLabel || fromLabels || element.getAttribute("title")
        || (element.tagName === "IMG" ? element.getAttribute("alt") : "")
        || (element.tagName === "INPUT" && /^(submit|button|reset)$/i.test(element.type) ? element.value : "")
        || element.textContent || "").trim();
    };
    const controls = [...document.querySelectorAll('button, a[href], input:not([type="hidden"]), select, textarea, [role="button"], [role="switch"], [role="checkbox"]')]
      .filter(visible);
    const unnamed = controls.filter((element) => !name(element))
      .map((element) => `${element.tagName.toLowerCase()}${element.type ? `[${element.type}]` : ""}${element.name ? `#${element.name}` : ""}`);
    // `alt=""` is the correct marker for a decorative image, so only a missing attribute fails. An empty alt
    // inside a link or button with no other text does fail: the control would be nameless.
    const imagesWithoutAlt = [...document.querySelectorAll("img")].filter(visible).filter((image) => {
      if (!image.hasAttribute("alt")) return true;
      if (image.getAttribute("alt").trim()) return false;
      const control = image.closest("a[href], button");
      return Boolean(control) && !control.textContent.trim()
        && !control.getAttribute("aria-label") && !control.getAttribute("aria-labelledby");
    }).map((image) => (image.getAttribute("src") || "").slice(0, 50));
    const ids = [...document.querySelectorAll("[id]")].map((element) => element.id);
    const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    const positiveTabindex = [...document.querySelectorAll("[tabindex]")].filter((element) => Number(element.getAttribute("tabindex")) > 0).length;
    const levels = [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")].filter(visible).map((heading) => Number(heading.tagName[1]));
    const jumps = [];
    for (let index = 1; index < levels.length; index += 1) {
      if (levels[index] - levels[index - 1] > 1) jumps.push(`h${levels[index - 1]}→h${levels[index]}`);
    }
    return {
      h1: document.querySelectorAll("h1").length,
      unnamed,
      imagesWithoutAlt,
      duplicateIds,
      positiveTabindex,
      jumps,
    };
  });

  await viewport(1440, 900, false);
  const problems = [];
  for (const route of ROUTES) {
    await visit(route);
    const found = await inspect();
    if (found.h1 !== 1) problems.push(`${route}: ${found.h1} <h1>`);
    if (found.unnamed.length) problems.push(`${route}: unnamed ${found.unnamed.join(", ")}`);
    if (found.imagesWithoutAlt.length) problems.push(`${route}: img without alt ${found.imagesWithoutAlt.join(", ")}`);
    if (found.duplicateIds.length) problems.push(`${route}: duplicate id ${found.duplicateIds.join(", ")}`);
    if (found.positiveTabindex) problems.push(`${route}: ${found.positiveTabindex} positive tabindex`);
    if (found.jumps.length) problems.push(`${route}: heading jump ${found.jumps.join(", ")}`);
  }
  assert.deepEqual(problems, [], "every route has one h1, named controls, alt text, unique ids and an ordered outline");
  console.log(`PASS desktop sweep: ${ROUTES.length} routes have one h1, named controls and an ordered outline`);

  // The phone layout swaps the header for a drawer and stacks the pages, so it needs its own pass.
  await viewport(390, 844, true);
  const phoneProblems = [];
  for (const route of ["/", "/cart", "/checkout", "/account", "/wishlist", "/create"]) {
    await visit(route);
    const found = await inspect();
    if (found.h1 !== 1) phoneProblems.push(`${route}: ${found.h1} <h1>`);
    if (found.unnamed.length) phoneProblems.push(`${route}: unnamed ${found.unnamed.join(", ")}`);
    if (found.duplicateIds.length) phoneProblems.push(`${route}: duplicate id ${found.duplicateIds.join(", ")}`);
  }
  assert.deepEqual(phoneProblems, [], "the phone layout keeps the same invariants");
  console.log("PASS phone sweep: the drawer and the stacked pages keep one h1 and named controls");

  // The admin dashboard is behind the demo session, so it needs its own pass with the session seeded.
  const ADMIN_ROUTES = [
    "/admin", "/admin/orders", "/admin/products", "/admin/designs", "/admin/posts", "/admin/ads",
    "/admin/pricing", "/admin/attributes", "/admin/settlements", "/admin/loyalty",
    "/admin/customers", "/admin/inventory", "/admin/messages", "/admin/promotions", "/admin/reports",
    "/admin/jersey", "/admin/settings",
  ];
  await viewport(1440, 900, false);
  await visit("/");
  // The sign-in page is only reachable signed out, so it is swept before the session is seeded.
  await evaluate(() => localStorage.removeItem("mh-fashion-admin-demo-session-v1"));
  await send("Page.navigate", { url: `${origin}/admin/login` });
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await pause(150);
    try {
      if (await evaluate(() => Boolean(document.querySelector("form")))) break;
    } catch (error) {
      if (!/Execution context was destroyed|Cannot find context/.test(String(error))) throw error;
    }
  }
  const loginFound = await inspect();
  const loginProblems = [];
  if (loginFound.h1 !== 1) loginProblems.push(`/admin/login: ${loginFound.h1} <h1>`);
  if (loginFound.unnamed.length) loginProblems.push(`/admin/login: unnamed ${loginFound.unnamed.join(", ")}`);
  if (loginFound.duplicateIds.length) loginProblems.push(`/admin/login: duplicate id ${loginFound.duplicateIds.join(", ")}`);
  assert.deepEqual(loginProblems, [], "the admin sign-in page keeps one h1 and named controls");
  console.log("PASS admin login: one h1, named controls and no duplicate ids");

  await visit("/");
  await evaluate(() => localStorage.setItem("mh-fashion-admin-demo-session-v1", JSON.stringify({
    name: "Sweep Admin", email: "sweep@example.com", role: "Administrator", expiresAt: Date.now() + 86400000,
  })));
  const adminProblems = [];
  for (const route of ADMIN_ROUTES) {
    await send("Page.navigate", { url: `${origin}${route}` });
    for (let attempt = 0; attempt < 60; attempt += 1) {
      await pause(150);
      try {
        if (await evaluate(() => Boolean(document.querySelector("[data-admin-dashboard]")))) break;
      } catch (error) {
        if (!/Execution context was destroyed|Cannot find context/.test(String(error))) throw error;
      }
    }
    const found = await inspect();
    if (found.h1 !== 1) adminProblems.push(`${route}: ${found.h1} <h1>`);
    if (found.unnamed.length) adminProblems.push(`${route}: unnamed ${found.unnamed.join(", ")}`);
    if (found.imagesWithoutAlt.length) adminProblems.push(`${route}: img without alt ${found.imagesWithoutAlt.join(", ")}`);
    if (found.duplicateIds.length) adminProblems.push(`${route}: duplicate id ${found.duplicateIds.join(", ")}`);
    if (found.positiveTabindex) adminProblems.push(`${route}: ${found.positiveTabindex} positive tabindex`);
    if (found.jumps.length) adminProblems.push(`${route}: heading jump ${found.jumps.join(", ")}`);
  }
  assert.deepEqual(adminProblems, [], "every admin route has one h1, named controls, alt text, unique ids and an ordered outline");
  console.log(`PASS admin sweep: ${ADMIN_ROUTES.length} dashboard routes keep the same invariants`);

  // On a phone the admin sidebar is a closed drawer, so it must be inert and stay out of the sweep.
  await viewport(390, 844, true);
  const adminPhoneProblems = [];
  for (const route of ["/admin", "/admin/orders", "/admin/pricing", "/admin/products", "/admin/customers", "/admin/settings"]) {
    await send("Page.navigate", { url: `${origin}${route}` });
    for (let attempt = 0; attempt < 60; attempt += 1) {
      await pause(150);
      try {
        if (await evaluate(() => Boolean(document.querySelector("[data-admin-dashboard]")))) break;
      } catch (error) {
        if (!/Execution context was destroyed|Cannot find context/.test(String(error))) throw error;
      }
    }
    const found = await inspect();
    const sidebarInert = await evaluate(() => Boolean(document.getElementById("admin-sidebar")?.inert));
    if (found.h1 !== 1) adminPhoneProblems.push(`${route}: ${found.h1} <h1>`);
    if (found.unnamed.length) adminPhoneProblems.push(`${route}: unnamed ${found.unnamed.join(", ")}`);
    if (found.duplicateIds.length) adminPhoneProblems.push(`${route}: duplicate id ${found.duplicateIds.join(", ")}`);
    if (!sidebarInert) adminPhoneProblems.push(`${route}: the closed phone sidebar is not inert`);
  }
  assert.deepEqual(adminPhoneProblems, [], "the phone dashboard keeps one h1, named controls and an inert sidebar");
  console.log("PASS admin phone sweep: the closed sidebar is inert and the pages stay named");

  await send("Emulation.setTouchEmulationEnabled", { enabled: false, maxTouchPoints: 1 });
  await send("Emulation.clearDeviceMetricsOverride");
  ws.close();
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});
