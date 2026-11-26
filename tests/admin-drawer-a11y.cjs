// The admin drawers are aria-modal, so the focus has to move in, stay in and come back. Start the app and
// a headless Chromium CDP endpoint first:
//   npm run start --workspace=apps/web -- --port 3000
//   chromium --headless=new --no-sandbox --remote-debugging-port=9222 about:blank
// then: node --test tests/admin-drawer-a11y.cjs
// STOREFRONT_TEST_ORIGIN and STOREFRONT_CDP_URL override the localhost defaults.
const assert = require("node:assert/strict");
const origin = process.env.STOREFRONT_TEST_ORIGIN || "http://127.0.0.1:3000";
const cdp = process.env.STOREFRONT_CDP_URL || "http://127.0.0.1:9222";
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  async function evaluate(fn, ...args) {
    const result = await send("Runtime.evaluate", {
      expression: `(${fn.toString()})(...${JSON.stringify(args)})`,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  async function waitFor(selector) {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      await pause(150);
      try {
        if (await evaluate((target) => Boolean(document.querySelector(target)), selector)) return;
      } catch (error) {
        if (!/Execution context was destroyed|Cannot find context/.test(String(error))) throw error;
      }
    }
    throw new Error(`never rendered ${selector}`);
  }
  const press = async (key, code, keyCode, shift = false) => {
    const text = key === "Enter" ? "\r" : undefined;
    await send("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: keyCode, text, unmodifiedText: text, modifiers: shift ? 8 : 0 });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: keyCode, modifiers: shift ? 8 : 0 });
    await pause(250);
  };
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, mobile: false, deviceScaleFactor: 1 });

  // The admin shell reads a demo session out of localStorage, so the browser is signed in before the route
  // loads instead of going through the login form.
  await send("Page.navigate", { url: `${origin}/` });
  await waitFor("main");
  await evaluate(() => {
    localStorage.setItem("mh-fashion-admin-demo-session-v1", JSON.stringify({
      name: "Test Admin",
      email: "admin@example.com",
      role: "Administrator",
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    }));
  });
  await send("Page.navigate", { url: `${origin}/admin/orders` });
  // The orders list keeps a hidden copy of each row for the phone layout, so pick the visible opener.
  // "Open navigation" also starts with "Open ", and it is the first visible match, so it is skipped.
  const opener = '[...document.querySelectorAll(\'button[aria-label^="Open "]\')].find((button) => button.getClientRects().length && !button.hasAttribute("data-admin-nav-toggle"))';
  await waitFor('button[aria-label^="Open "]');
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await evaluate(new Function(`return Boolean(${opener})`))) break;
    await pause(150);
  }

  const drawerState = () => evaluate(() => {
    const dialog = document.querySelector('[role="dialog"][aria-modal="true"]');
    // The backdrop button also carries tabindex="-1"; the sheet itself is the div.
    const panel = dialog?.querySelector('div[tabindex="-1"]') ?? null;
    const focusables = panel
      ? [...panel.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])')]
        .filter((element) => element.getClientRects().length > 0)
      : [];
    const index = focusables.indexOf(document.activeElement);
    return {
      open: Boolean(dialog),
      label: dialog?.getAttribute("aria-label") || "",
      focusInside: Boolean(panel && panel.contains(document.activeElement)),
      focusIndex: index,
      count: focusables.length,
      focusLabel: document.activeElement?.getAttribute("aria-label") || document.activeElement?.tagName || "",
    };
  });

  await evaluate(new Function(`(${opener}).focus()`));
  await press("Enter", "Enter", 13);
  const opened = await drawerState();
  assert.equal(opened.open, true, "Enter on Open shows the drawer");
  assert.match(opened.label, /^Order /, `the drawer is labelled with the order: ${opened.label}`);
  assert.equal(opened.focusInside, true, "the focus moves into the drawer");
  assert.ok(opened.count > 1, `the drawer has controls to tab through (found ${opened.count})`);

  // Tab off the last control must wrap to the first instead of walking the page behind the sheet.
  await evaluate(() => {
    const panel = document.querySelector('[role="dialog"][aria-modal="true"] div[tabindex="-1"]');
    const focusables = [...panel.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])')]
      .filter((element) => element.getClientRects().length > 0);
    focusables[focusables.length - 1].focus();
  });
  await press("Tab", "Tab", 9);
  const wrapped = await drawerState();
  assert.equal(wrapped.focusIndex, 0, `Tab from the last control wraps to the first, not index ${wrapped.focusIndex}`);

  await press("Escape", "Escape", 27);
  const closed = await drawerState();
  assert.equal(closed.open, false, "Escape closes the drawer");
  assert.match(closed.focusLabel, /^Open /, `Escape returns the focus to the row that opened it, not ${closed.focusLabel}`);
  console.log("PASS admin drawer: the focus moves in, stays in on Tab, and Escape returns it to the row");

  // The pricing filters are a phone bottom sheet with its own markup; it shares the same hook.
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, mobile: true, deviceScaleFactor: 1 });
  await send("Page.navigate", { url: `${origin}/admin/pricing` });
  await waitFor('button[aria-label="Open filters"]');
  await evaluate(() => [...document.querySelectorAll('button[aria-label="Open filters"]')].find((button) => button.getClientRects().length).focus());
  await press("Enter", "Enter", 13);
  const sheet = await drawerState();
  assert.equal(sheet.open, true, "Enter on Open filters shows the sheet");
  assert.equal(sheet.label, "Filters", `the sheet is labelled: ${sheet.label}`);
  assert.equal(sheet.focusInside, true, "the focus moves into the sheet");
  await press("Escape", "Escape", 27);
  const sheetClosed = await drawerState();
  assert.equal(sheetClosed.open, false, "Escape closes the sheet");
  assert.equal(sheetClosed.focusLabel, "Open filters", `Escape returns the focus to the filters button, not ${sheetClosed.focusLabel}`);
  console.log("PASS admin bottom sheet: the focus moves in, Escape closes it and returns the focus");

  // The sidebar is a phone drawer: closed it slides off-screen but stays in the document.
  await send("Page.navigate", { url: `${origin}/admin/orders` });
  await waitFor("button[data-admin-nav-toggle]");
  const sidebarState = () => evaluate(() => {
    const sidebar = document.getElementById("admin-sidebar");
    // The label flips to "Close navigation" while the drawer is open, so read the stable hook.
    const opener = document.querySelector("button[data-admin-nav-toggle]");
    return {
      inert: Boolean(sidebar?.inert),
      focusInside: Boolean(sidebar && sidebar.contains(document.activeElement)),
      expanded: opener?.getAttribute("aria-expanded") || "",
      focusLabel: document.activeElement?.getAttribute("aria-label") || document.activeElement?.tagName || "",
    };
  });
  const sidebarClosed = await sidebarState();
  assert.equal(sidebarClosed.inert, true, "the closed sidebar is inert, so Tab skips its links");
  assert.equal(sidebarClosed.expanded, "false", "the opener says the drawer is closed");

  await evaluate(() => document.querySelector('button[data-admin-nav-toggle]').focus());
  await press("Enter", "Enter", 13);
  const sidebarOpen = await sidebarState();
  assert.equal(sidebarOpen.inert, false, "the open sidebar takes Tab again");
  assert.equal(sidebarOpen.expanded, "true", "the opener says the drawer is open");
  assert.equal(sidebarOpen.focusInside, true, "the focus moves into the sidebar");

  await press("Escape", "Escape", 27);
  const sidebarEscaped = await sidebarState();
  assert.equal(sidebarEscaped.inert, true, "Escape puts the sidebar back to inert");
  assert.equal(sidebarEscaped.focusLabel, "Open navigation", `Escape returns the focus to the opener, not ${sidebarEscaped.focusLabel}`);
  console.log("PASS admin sidebar: closed it is inert, open it takes the focus, Escape gives it back");

  await send("Emulation.clearDeviceMetricsOverride");
  ws.close();
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});
