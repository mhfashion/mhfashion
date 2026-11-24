// Storefront end-to-end check at desktop and phone widths. Start the production app and a headless
// Chromium CDP endpoint first:
//   npm run start --workspace=apps/web -- --port 3000
//   chromium --headless=new --no-sandbox --remote-debugging-port=9222 about:blank
// then: node --test tests/storefront-e2e.cjs
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
  const errors = [];
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.method === "Runtime.exceptionThrown") {
      errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    }
    if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
      errors.push(message.params.args.map((arg) => arg.value ?? arg.description).join(" "));
    }
  });
  await send("Page.enable");
  await send("Runtime.enable");

  async function viewport(width, height, mobile) {
    await send("Emulation.setDeviceMetricsOverride", { width, height, mobile, deviceScaleFactor: 1 });
    await send("Emulation.setTouchEmulationEnabled", { enabled: mobile, maxTouchPoints: mobile ? 5 : 1 });
  }
  /** Every control a shopper can reach must have an accessible name; a placeholder is not one. */
  async function assertAccessibleNames(pages) {
    const missing = [];
    for (const [path, ready] of pages) {
      await visit(path, ready);
      const found = await evaluate(() => {
        const name = (element) => (element.getAttribute("aria-label") || element.getAttribute("title") || element.textContent || "").trim();
        return {
          unnamed: [...document.querySelectorAll('button, a[href], input:not([type="hidden"]), select, textarea')]
            .filter((element) => !element.closest('[aria-hidden="true"]'))
            .filter((element) => !name(element))
            .map((element) => `${element.tagName.toLowerCase()}${element.getAttribute("type") ? `[${element.getAttribute("type")}]` : ""}`),
          headings: document.querySelectorAll("h1").length,
        };
      });
      if (found.unnamed.length) missing.push(`${path}: ${found.unnamed.join(", ")}`);
      assert.equal(found.headings, 1, `${path} has exactly one <h1>`);
    }
    assert.deepEqual(missing, [], "every control has an accessible name");
  }
  async function visit(path, ready) {
    await send("Page.navigate", { url: `${origin}${path}` });
    for (let attempt = 0; attempt < 60; attempt += 1) {
      await pause(150);
      try {
        if (await evaluate((selector) => Boolean(document.querySelector(selector)), ready)) return;
      } catch (error) {
        if (!/Execution context was destroyed|Cannot find context/.test(String(error))) throw error;
      }
    }
    throw new Error(`${path} never rendered ${ready}`);
  }
  const overflow = () => evaluate(() => ({
    doc: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  const seedCart = () => evaluate(() => {
    const variant = { size: "M", color: "Black", material: null, gsm: null, fit: null, sleeve: null };
    localStorage.setItem("mh-fashion-cart-items", JSON.stringify([{
      id: "p1", name: "Butterfly Effect", slug: "butterfly-effect",
      priceMinKs: 21000, priceMaxKs: 25000, key: "p1", quantity: 2, variant, unitPriceKs: 21000,
    }]));
  });
  // A finished checkout keeps its key in sessionStorage and the page then shows that order instead of
  // the form, so a new run has to start from a clean checkout.
  const resetCheckout = () => evaluate(() => sessionStorage.removeItem("mh-fashion-checkout-key"));
  // The order history and cart live in this browser, so a run starts from an empty store.
  const resetBrowser = () => evaluate(() => {
    for (const key of ["mh-fashion-admin-demo-data-v1", "mh-fashion-cart-items", "mh-fashion-cart-count", "mh-fashion-wishlist", "mh-fashion-delivery-address-v1"]) {
      localStorage.removeItem(key);
    }
    sessionStorage.clear();
  });
  const fillCheckout = () => evaluate(async () => {
    // An address already on file collapses the fields; open them so every run fills the same form.
    const change = document.querySelector("[data-checkout-address-change]");
    if (change) {
      change.click();
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    const set = (label, value) => {
      const field = document.querySelector(`[aria-label="${label}"]`);
      if (!field) return false;
      const prototype = field.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, "value").set.call(field, value);
      field.dispatchEvent(new Event(field.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
      return true;
    };
    return {
      name: set("Full name", "Min Thu Aung"),
      phone: set("Phone", "09123456789"),
      address: set("Address", "No 12, Baho Road"),
      township: set("Township", "Sanchaung"),
      city: set("City or region", "Yangon"),
    };
  });
  const placeOrder = () => evaluate(async () => {
    const terms = document.querySelector('[aria-label="Accept the terms"]');
    if (terms && !terms.checked) terms.click();
    await new Promise((resolve) => setTimeout(resolve, 120));
    const submit = document.querySelector("[data-checkout-submit]");
    if (!submit) return "no submit button";
    if (submit.disabled) {
      return "disabled: " + [...document.querySelectorAll("[role=alert] p")].map((node) => node.innerText).join(" | ");
    }
    submit.click();
    for (let attempt = 0; attempt < 40; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      if (document.querySelector("[data-checkout-confirmation]")) break;
    }
    return document.querySelector("[data-checkout-confirmation] h1, [data-checkout-confirmation] h2")?.innerText ?? "no confirmation";
  });
  const openAccountTab = () => evaluate(async () => {
    const tab = [...document.querySelectorAll("button")].find((button) => /orders/i.test(button.innerText));
    if (!tab) return "no orders tab";
    tab.click();
    await new Promise((resolve) => setTimeout(resolve, 400));
    return "clicked";
  });
  const jsonLd = () => evaluate(() => [...document.querySelectorAll('script[type="application/ld+json"]')]
    .map((node) => { try { return JSON.parse(node.textContent); } catch (error) { return { "@type": "PARSE-ERROR" }; } })
    .map((node) => node["@type"]));

  try {
    // ---------- desktop ----------
    await viewport(1440, 900, false);

    await visit("/", "header");
    await resetBrowser();
    await visit("/", "header");
    const home = await evaluate(() => ({
      title: document.title,
      header: Boolean(document.querySelector("header")),
      footerLinks: document.querySelectorAll("footer a").length,
      searchEntry: Boolean(document.querySelector('a[href="/search"], button[aria-label*="Search" i], [aria-label*="Search" i]')),
      wishlist: Boolean(document.querySelector('a[href="/wishlist"]')),
    }));
    assert.match(home.title, /MH Fashion/);
    assert.ok(home.header, "home renders the header");
    assert.ok(home.footerLinks > 3, `footer links: ${home.footerLinks}`);
    assert.ok(home.wishlist, "header links to the wishlist");

    // The admin's live hero ad replaces the green hero; pausing it brings the hero back.
    const heroSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="600"><rect width="1600" height="600" fill="#cc0000"/></svg>';
    await evaluate((svg) => {
      localStorage.setItem("mh-fashion-admin-demo-data-v1", JSON.stringify({
        version: 1, orders: [], products: [], ads: [{
          id: "ad_e2e", slot: "home-hero", name: "E2E hero", mediaType: "image",
          mediaUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`, posterUrl: "",
          alt: "E2E hero banner", href: "/new", enabled: true,
          startsAt: "2020-01-01T00:00:00.000Z", endsAt: "2099-01-01T00:00:00.000Z",
        }],
      }));
      return "seeded";
    }, heroSvg);
    await visit("/", "main");
    await pause(900);
    const heroAd = await evaluate(() => ({
      banner: Boolean(document.querySelector('[data-ad-slot-banner="home-hero"] [data-ad-image]')),
      defaultHero: [...document.querySelectorAll("h1")].some((node) => /Design Your/.test(node.innerText)),
      width: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    assert.ok(heroAd.banner, "the live hero ad is rendered on the home page");
    assert.equal(heroAd.defaultHero, false, "the green hero steps aside for the ad");
    assert.equal(heroAd.width, heroAd.client, "the hero ad does not scroll sideways");

    await evaluate(() => localStorage.removeItem("mh-fashion-admin-demo-data-v1"));
    await visit("/", "main");
    await pause(900);
    assert.ok(
      await evaluate(() => [...document.querySelectorAll("h1")].some((node) => /Design Your/.test(node.innerText))),
      "the green hero returns when no ad is live",
    );

    await visit("/search?q=butterfly", "main");
    const search = await evaluate(() => ({
      heading: document.querySelector("h1")?.innerText,
      robots: document.querySelector('meta[name="robots"]')?.content,
      width: document.documentElement.scrollWidth,
    }));
    assert.ok(search.heading, "the search page names itself");
    assert.match(String(search.robots), /noindex/, "search results stay out of the index");

    await visit("/wishlist", "main");
    assert.ok(await evaluate(() => Boolean(document.querySelector("h1"))), "wishlist page renders");

    await visit("/faq", "main");
    const faq = await evaluate(() => ({
      sections: document.querySelectorAll("[data-info-section]").length,
      types: [...document.querySelectorAll('script[type="application/ld+json"]')]
        .map((node) => { try { return JSON.parse(node.textContent); } catch (error) { return {}; } }),
    }));
    assert.ok(faq.sections >= 5, `faq sections: ${faq.sections}`);
    const faqNode = faq.types.find((node) => node["@type"] === "FAQPage");
    assert.ok(faqNode, "the FAQ page carries a FAQPage node");
    assert.ok(faqNode.mainEntity.length >= 5, "every answered question is in the markup");

    await visit("/guide", "main");
    const guide = await evaluate(() => ({
      cards: document.querySelectorAll('a[href^="/guide/"]').length,
      width: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    assert.ok(guide.cards > 0, "the guide lists articles");
    assert.equal(guide.width, guide.client, "the guide index does not scroll sideways");

    // The MH Fashion category row is a strip of icon buttons, like the home page: no labels, no counts.
    await visit("/mh-fashion", "[data-category]");
    const categoryIcons = await evaluate(() => {
      const links = [...document.querySelectorAll("#category-nav a")];
      return {
        count: links.length,
        labelled: links.every((link) => Boolean(link.getAttribute("aria-label"))),
        text: links.map((link) => link.innerText.trim()).join(""),
        boxes: links.map((link) => Math.round(link.getBoundingClientRect().width)),
      };
    });
    assert.equal(categoryIcons.count, 6, `category icons: ${categoryIcons.count}`);
    assert.ok(categoryIcons.labelled, "every category icon keeps an accessible name");
    assert.equal(categoryIcons.text, "", "the category row shows icons only");
    assert.ok(categoryIcons.boxes.every((width) => width >= 40 && width <= 48), `icon sizes: ${categoryIcons.boxes.join(",")}`);

    // The real purchase path: cart -> checkout -> order -> account. The cart is seeded from another
    // page: navigating to the URL already on screen would not remount the cart provider.
    await visit("/", "header");
    await seedCart();
    // The badge is a picture; the button has to carry the count for a screen reader.
    await visit("/", "header");
    const cartName = await evaluate(() => document.querySelector('[aria-label^="Cart"]')?.getAttribute("aria-label") ?? "");
    assert.match(String(cartName), /Cart, 2 in the cart/, `the cart button names its count: ${cartName}`);
    await resetCheckout();
    await visit("/checkout", "[data-checkout-line]");
    // An empty form must name every missing field in one pass, not just the first one it notices.
    const emptyIssues = await evaluate(async () => {
      document.querySelector("[data-checkout-submit]")?.click();
      await new Promise((resolve) => setTimeout(resolve, 300));
      return [...document.querySelectorAll("[role=alert] p")].map((node) => node.innerText.trim());
    });
    assert.equal(emptyIssues.length, 6, `an empty form lists every problem at once: ${JSON.stringify(emptyIssues)}`);
    for (const [label, pattern] of [["name", /recipient's name/], ["phone", /phone number/], ["address", /delivery address/], ["township", /township/i], ["city", /city or region/i], ["terms", /Accept the terms/]]) {
      assert.ok(emptyIssues.some((issue) => pattern.test(issue)), `the empty form reports the missing ${label}: ${JSON.stringify(emptyIssues)}`);
    }
    // The summary is not enough on its own: each field must point at its own problem.
    const fieldProblems = await evaluate(() => {
      const read = (label) => {
        const field = document.querySelector(`[aria-label="${label}"]`);
        const described = field?.getAttribute("aria-describedby");
        return {
          invalid: field?.getAttribute("aria-invalid"),
          text: described ? document.getElementById(described)?.textContent?.trim() ?? "" : "",
        };
      };
      return {
        name: read("Full name"), phone: read("Phone"), address: read("Address"),
        township: read("Township"), city: read("City or region"),
      };
    });
    for (const [label, pattern] of [["name", /recipient's name/], ["phone", /phone number/], ["address", /delivery address/], ["township", /township/i], ["city", /city or region/i]]) {
      assert.equal(fieldProblems[label].invalid, "true", `the ${label} field is marked invalid`);
      assert.match(fieldProblems[label].text, pattern, `the ${label} field describes its problem: ${JSON.stringify(fieldProblems[label])}`);
    }
    const filled = await fillCheckout();
    assert.ok(Object.values(filled).every(Boolean), `checkout fields: ${JSON.stringify(filled)}`);
    await pause(400);
    const confirmation = await placeOrder();
    assert.match(String(confirmation), /Order #MH\d+ placed/, `checkout confirmation: ${confirmation}`);
    // The submit button is gone with the form, so the confirmation has to take focus or the
    // customer is left at the top of the page with no idea whether the order went through.
    const focusedAfterOrder = await evaluate(() => document.activeElement?.textContent?.trim() ?? "");
    assert.match(focusedAfterOrder, /Order #MH\d+/, `focus lands on the confirmation: ${focusedAfterOrder}`);

    await visit("/account", "main");
    const dashboard = await evaluate(() => {
      const stat = [...document.querySelectorAll("p")].find((node) => node.innerText.trim() === "Total Orders");
      return {
        recent: document.querySelectorAll("[data-account-order]").length,
        total: stat?.nextElementSibling?.innerText ?? stat?.parentElement?.innerText,
        width: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      };
    });
    assert.equal(dashboard.recent, 1, "the dashboard shows the order just placed");
    assert.match(String(dashboard.total), /1/, "the order counter follows the store");
    assert.equal(dashboard.width, dashboard.client, "the account page does not scroll sideways");

    assert.equal(await openAccountTab(), "clicked");
    const orders = await evaluate(() => [...document.querySelectorAll("[data-account-order]")].map((node) => ({
      id: node.getAttribute("data-account-order"),
      stage: node.querySelector("[data-order-stage]")?.innerText,
      text: node.innerText,
    })));
    assert.equal(orders.length, 1, "one order in the history");
    assert.match(orders[0].id, /^#MH\d+$/);
    assert.ok(orders[0].stage, "the order shows its stage");
    assert.ok(/Butterfly Effect/.test(orders[0].text), "the order shows what was bought");
    assert.ok(/42,000 Ks/.test(orders[0].text), "the order shows its total");
    assert.deepEqual(await jsonLd(), ["Organization", "WebSite"], "the layout nodes are on every page");

    // The address this customer already gave us is reused: the next checkout shows it instead of
    // asking for it again, and the fields stay closed until "Change" is pressed.
    await visit("/", "header");
    await seedCart();
    await resetCheckout();
    await visit("/checkout", "[data-checkout-line]");
    const reuse = await evaluate(() => ({
      card: Boolean(document.querySelector("[data-checkout-saved-address]")),
      line: document.querySelector("[data-checkout-saved-address-line]")?.innerText ?? "",
      fields: Boolean(document.querySelector('[aria-label="Full name"]')),
    }));
    assert.ok(reuse.card, "the second checkout reuses the saved address");
    assert.equal(reuse.fields, false, "the address fields stay closed while an address is on file");
    assert.match(reuse.line, /Baho Road/, `saved address line: ${reuse.line}`);

    console.log("PASS desktop: home, search, wishlist, faq, guide, checkout, account orders");

    // A keyboard user has to see where they are: the search field draws its focus on the pill.
    await visit("/", "header");
    const searchFocus = await evaluate(() => {
      const field = document.querySelector('[data-header-search="desktop"] input');
      const pill = field.closest("form");
      const before = getComputedStyle(pill).borderColor;
      field.focus();
      return { before, after: getComputedStyle(pill).borderColor };
    });
    assert.notEqual(searchFocus.after, searchFocus.before, "the search field shows focus on its pill");

    await assertAccessibleNames([["/", "header"], ["/create", 'canvas[aria-label="Blank print canvas"]'], ["/checkout", "main"]]);
    console.log("PASS accessible names: home, editor and checkout controls are all named");

    // A screen reader picks its voice from <html lang>, so the document has to follow the switcher.
    await visit("/", "header");
    assert.equal(await evaluate(() => document.documentElement.lang), "en", "the page starts declared as English");
    await evaluate(() => document.querySelector('button[data-header-language]').click());
    await pause(300);
    assert.equal(await evaluate(() => document.documentElement.lang), "my", "switching to Myanmar declares Burmese");
    assert.ok(await evaluate(() => Boolean(document.querySelector('button[data-header-language="my"]'))), "the switcher shows Myanmar as active");
    await visit("/", "header");
    assert.equal(await evaluate(() => document.documentElement.lang), "my", "a reload keeps the declared language");
    await evaluate(() => document.querySelector('button[data-header-language]').click());
    await pause(300);
    await visit("/", "header");
    assert.equal(await evaluate(() => document.documentElement.lang), "en", "switching back declares English again");
    console.log("PASS document language: <html lang> follows the language switcher and survives a reload");

    // A keyboard user must be able to leave the header without tabbing through it, and must be able to
    // see where the focus is. Both are checked with real key events, not synthetic .focus() calls.
    const key = async (name, code, keyCode) => {
      await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: name, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode });
      await send("Input.dispatchKeyEvent", { type: "keyUp", key: name, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode });
      await pause(150);
    };
    const focusState = () => evaluate(() => {
      const element = document.activeElement;
      if (!element) return null;
      const style = getComputedStyle(element);
      const parent = element.parentElement ? getComputedStyle(element.parentElement) : null;
      const transparent = (colour) => /rgba\(0, 0, 0, 0\)|transparent/.test(colour);
      return {
        tag: element.tagName,
        label: (element.getAttribute("aria-label") || element.textContent || "").trim().slice(0, 40),
        skip: element.hasAttribute("data-skip-to-content"),
        width: Math.round(element.getBoundingClientRect().width),
        inHeader: Boolean(element.closest("header")),
        indicator: (style.outlineStyle !== "none" && !transparent(style.outlineColor)) || style.boxShadow !== "none" || Boolean(parent && parent.boxShadow !== "none"),
      };
    });

    await visit("/", "header");
    await evaluate(() => { document.activeElement?.blur(); return true; });
    await key("Tab", "Tab", 9);
    const skipLink = await focusState();
    assert.equal(skipLink?.skip, true, `the first Tab reaches the skip link: ${JSON.stringify(skipLink)}`);
    assert.ok(skipLink.width > 0, "the skip link becomes visible when focused");
    assert.equal(skipLink.indicator, true, "the focused skip link is visibly marked");

    await key("Enter", "Enter", 13);
    const landed = await focusState();
    assert.equal(landed?.tag, "H1", `Enter moves the focus to the page heading: ${JSON.stringify(landed)}`);
    await key("Tab", "Tab", 9);
    const next = await focusState();
    assert.equal(next?.inHeader, false, `the next Tab is inside the page, not the header: ${JSON.stringify(next)}`);

    // Tab through the header itself: every control it passes must show a visible focus indicator.
    await visit("/", "header");
    await evaluate(() => { document.activeElement?.blur(); return true; });
    const rings = [];
    for (let step = 0; step < 14; step += 1) {
      await key("Tab", "Tab", 9);
      const state = await focusState();
      if (!state) break;
      if (state.skip) continue;
      if (!state.inHeader) break;
      rings.push(state);
    }
    assert.ok(rings.length >= 8, `the header walk visits its controls: ${rings.length}`);
    const unmarked = rings.filter((state) => !state.indicator).map((state) => `${state.tag}:${state.label}`);
    assert.deepEqual(unmarked, [], "every header control shows focus");
    console.log("PASS keyboard: the skip link leaves the header and every header control shows focus");

    // The cart popover: the button must state whether the panel is open, and Escape must close it and
    // hand the focus back instead of leaving a keyboard user inside a panel with no way out.
    await visit("/", "header");
    const cartClosed = await evaluate(() => document.querySelector('[aria-label^="Cart"]')?.getAttribute("aria-expanded"));
    assert.equal(cartClosed, "false", "the cart button says the panel is closed");
    await evaluate(() => { document.querySelector('[aria-label^="Cart"]').click(); return true; });
    await pause(400);
    const cartOpen = await evaluate(() => ({
      expanded: document.querySelector('[aria-label^="Cart"]')?.getAttribute("aria-expanded"),
      panel: Boolean(document.getElementById("header-cart-panel")),
      dialog: document.getElementById("header-cart-panel")?.getAttribute("role"),
    }));
    assert.equal(cartOpen.expanded, "true", "the cart button says the panel is open");
    assert.equal(cartOpen.panel, true, "the panel is rendered");
    assert.equal(cartOpen.dialog, "dialog", "the panel is announced as a dialog");
    await key("Escape", "Escape", 27);
    await pause(300);
    const cartAfterEscape = await evaluate(() => ({
      expanded: document.querySelector('[aria-label^="Cart"]')?.getAttribute("aria-expanded"),
      panel: Boolean(document.getElementById("header-cart-panel")),
      focusOnButton: (document.activeElement?.getAttribute("aria-label") ?? "").startsWith("Cart"),
    }));
    assert.equal(cartAfterEscape.expanded, "false", "Escape closes the cart panel");
    assert.equal(cartAfterEscape.panel, false, "the closed panel leaves the DOM");
    assert.equal(cartAfterEscape.focusOnButton, true, "Escape returns the focus to the cart button");
    console.log("PASS cart popover: aria-expanded tracks the panel and Escape closes it");




    // ---------- cart lines ----------
    // Removing a line deletes the button that had the focus, so the focus has to land on the line that
    // takes its place and the removal has to be spoken.
    await viewport(1440, 900, false);
    const seedLines = () => evaluate(() => {
      const variant = { size: "M", color: "Black", material: null, gsm: null, fit: null, sleeve: null };
      localStorage.setItem("mh-fashion-cart-items", JSON.stringify([
        { id: "p1", name: "Butterfly Effect", slug: "butterfly-effect", priceMinKs: 21000, priceMaxKs: 25000, key: "p1", quantity: 2, variant, unitPriceKs: 21000 },
        { id: "p2", name: "Neon Bloom", slug: "neon-bloom", priceMinKs: 18000, priceMaxKs: 22000, key: "p2", quantity: 1, variant, unitPriceKs: 18000 },
      ]));
    });
    const pressEnter = async () => {
      await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" });
      await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
      await pause(400);
    };
    const cartState = () => evaluate(() => ({
      lines: [...document.querySelectorAll("[data-cart-line]")].map((line) => line.getAttribute("data-cart-line")),
      focus: document.activeElement?.getAttribute("data-cart-remove") !== null
        ? `remove:${document.activeElement.closest("[data-cart-line]")?.getAttribute("data-cart-line")}`
        : (document.activeElement?.textContent || "").trim().slice(0, 30),
      notice: document.querySelector("[data-cart-notice]")?.textContent || "",
      quantityLive: document.querySelector("[data-cart-quantity]")?.getAttribute("aria-live") || "",
    }));

    await seedLines();
    await visit("/cart", "[data-cart-line]");
    const before = await cartState();
    assert.deepEqual(before.lines, ["p1", "p2"], "both seeded lines are listed");
    assert.equal(before.quantityLive, "polite", "the line quantity is a live region");

    await evaluate(() => document.querySelector('[data-cart-line="p1"] [data-cart-remove]').focus());
    await pressEnter();
    const afterRemove = await cartState();
    assert.deepEqual(afterRemove.lines, ["p2"], "the removed line is gone");
    assert.equal(afterRemove.focus, "remove:p2", `the focus moved to the surviving line, not ${afterRemove.focus}`);
    assert.match(afterRemove.notice, /Butterfly Effect/, "the removal is announced with the product name");

    await evaluate(() => document.querySelector('[data-cart-line="p2"] [aria-label="Decrease quantity"]').focus());
    await pressEnter();
    const afterEmpty = await cartState();
    assert.deepEqual(afterEmpty.lines, [], "decrementing the last line empties the cart");
    assert.match(afterEmpty.focus, /cart is empty/i, `the focus lands on the empty-state heading, not ${afterEmpty.focus}`);

    await seedLines();
    await visit("/cart", "[data-cart-line]");
    await evaluate(() => [...document.querySelectorAll("button")].find((button) => button.textContent.trim() === "Clear cart").focus());
    await pressEnter();
    const afterClear = await cartState();
    assert.deepEqual(afterClear.lines, [], "clear cart empties the list");
    assert.match(afterClear.notice, /cleared/i, "clearing is announced");
    assert.match(afterClear.focus, /cart is empty/i, `clear cart parks the focus on the empty-state heading, not ${afterClear.focus}`);
    console.log("PASS cart lines: removing a line keeps the focus in the list and says what left");

    // ---------- notifications ----------
    // The panel used to close only on an outside mousedown, which a keyboard user cannot produce.
    await viewport(1440, 900, false);
    // The drawer holds a second bell that desktop CSS hides, and a hidden panel cannot take the focus,
    // so every probe picks the bell that is actually painted.
    const visibleBell = `[...document.querySelectorAll('button[aria-haspopup="dialog"][aria-label^="Notifications"]')].find((candidate) => candidate.getClientRects().length)`;
    const bellState = () => evaluate(() => {
      const button = [...document.querySelectorAll('button[aria-haspopup="dialog"][aria-label^="Notifications"]')]
        .find((candidate) => candidate.getClientRects().length);
      const panel = document.getElementById(button?.getAttribute("aria-controls") || "");
      return {
        label: button?.getAttribute("aria-label") || "",
        expanded: button?.getAttribute("aria-expanded") || "",
        role: panel?.getAttribute("role") || "",
        items: panel ? panel.querySelectorAll("li").length : 0,
        focusInPanel: Boolean(panel && document.activeElement === panel),
      };
    });
    const pressEscape = async () => {
      await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
      await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
      await pause(300);
    };

    await visit("/", "header");
    const bellClosed = await bellState();
    assert.equal(bellClosed.expanded, "false", "the bell starts collapsed");
    assert.equal(bellClosed.role, "", "no panel is mounted while collapsed");
    assert.match(bellClosed.label, /2 unread/, `the bell states the unread count: ${bellClosed.label}`);

    await evaluate((selector) => eval(selector).click(), visibleBell);
    await pause(400);
    const bellOpen = await bellState();
    assert.equal(bellOpen.expanded, "true", "opening the bell states it is expanded");
    assert.equal(bellOpen.role, "dialog", "the panel is a labelled dialog");
    assert.equal(bellOpen.items, 3, "every notification is a list item");
    assert.equal(bellOpen.focusInPanel, true, "the focus moves into the panel");

    await pressEscape();
    const bellAfterEscape = await bellState();
    assert.equal(bellAfterEscape.expanded, "false", "Escape closes the panel");
    assert.equal(bellAfterEscape.role, "", "the panel is unmounted after Escape");
    assert.equal(await evaluate(() => document.activeElement?.getAttribute("aria-haspopup")), "dialog", "Escape returns the focus to the bell");
    console.log("PASS notifications: the panel is a dialog, states its state, and Escape closes it");

    // ---------- wishlist ----------
    // The heart that removed a card was the focused button, so the focus has to move to the next card.
    await viewport(1440, 900, false);
    const seedWishlist = () => evaluate(() => {
      localStorage.setItem("mh-fashion-wishlist", JSON.stringify([
        { id: "w1", slug: "butterfly-effect", name: "Butterfly Effect", priceMinKs: 21000, priceMaxKs: 25000 },
        { id: "w2", slug: "neon-bloom", name: "Neon Bloom", priceMinKs: 18000, priceMaxKs: 22000 },
      ]));
    });
    const wishlistState = () => evaluate(() => ({
      items: [...document.querySelectorAll("[data-wishlist-item]")].map((node) => node.getAttribute("data-wishlist-item")),
      notice: document.querySelector("[data-wishlist-notice]")?.textContent || "",
      focus: document.activeElement?.hasAttribute("data-wishlist-toggle")
        ? `toggle:${document.activeElement.getAttribute("data-wishlist-toggle")}`
        : (document.activeElement?.textContent || "").trim().slice(0, 30),
    }));

    await seedWishlist();
    await visit("/wishlist", "[data-wishlist-item]");
    assert.deepEqual((await wishlistState()).items, ["w1", "w2"], "both seeded cards are listed");

    await evaluate(() => document.querySelector('[data-wishlist-toggle="w1"]').focus());
    await pressEnter();
    const wishAfterRemove = await wishlistState();
    assert.deepEqual(wishAfterRemove.items, ["w2"], "the un-hearted card is gone");
    assert.equal(wishAfterRemove.focus, "toggle:w2", `the focus moves to the next card, not ${wishAfterRemove.focus}`);
    assert.match(wishAfterRemove.notice, /Butterfly Effect/, "the removal names the product");

    await evaluate(() => document.querySelector('[data-wishlist-toggle="w2"]').focus());
    await pressEnter();
    const wishEmpty = await wishlistState();
    assert.deepEqual(wishEmpty.items, [], "un-hearting the last card empties the list");
    assert.match(wishEmpty.focus, /No saved designs yet/i, `the focus lands on the empty state, not ${wishEmpty.focus}`);

    await seedWishlist();
    await visit("/wishlist", "[data-wishlist-item]");
    await evaluate(() => document.querySelector("[data-wishlist-clear]").focus());
    await pressEnter();
    const wishCleared = await wishlistState();
    assert.deepEqual(wishCleared.items, [], "clear wishlist empties the list");
    assert.match(wishCleared.notice, /cleared/i, "clearing is announced");
    assert.match(wishCleared.focus, /No saved designs yet/i, `clear wishlist parks the focus on the empty state, not ${wishCleared.focus}`);
    console.log("PASS wishlist: un-hearting a card keeps the focus in the list and says what left");

    // ---------- account sections ----------
    // The section nav swapped the whole panel in place: nothing said which section was showing, and the
    // focus stayed on the nav button while the page under it changed.
    await viewport(1440, 900, false);
    const accountState = () => evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Account navigation"]');
      return {
        current: [...nav.querySelectorAll("button")]
          .filter((button) => button.getAttribute("aria-current") === "page")
          .map((button) => button.textContent.trim()),
        heading: document.querySelector("h1")?.textContent?.trim() || "",
        focus: document.activeElement?.tagName === "H1" ? `h1:${document.activeElement.textContent.trim()}` : (document.activeElement?.tagName || ""),
      };
    });

    await visit("/account", "main");
    const accountStart = await accountState();
    assert.deepEqual(accountStart.current, ["Dashboard"], `exactly one section is current: ${accountStart.current}`);

    await evaluate(() => [...document.querySelectorAll('nav[aria-label="Account navigation"] button')].find((button) => /order/i.test(button.textContent)).click());
    await pause(400);
    const accountOrders = await accountState();
    assert.deepEqual(accountOrders.current, ["Order History"], "the current section follows the choice");
    assert.equal(accountOrders.heading, "Order History", "the panel shows the chosen section");
    assert.equal(accountOrders.focus, "h1:Order History", `the focus moves to the new section heading, not ${accountOrders.focus}`);

    await evaluate(() => [...document.querySelectorAll('nav[aria-label="Account navigation"] button')].find((button) => /dashboard/i.test(button.textContent)).click());
    await pause(400);
    const accountBack = await accountState();
    assert.deepEqual(accountBack.current, ["Dashboard"], "returning to the dashboard marks it current");
    assert.match(accountBack.focus, /^h1:/, "the dashboard heading takes the focus back");
    console.log("PASS account sections: the nav states the current section and hands the focus to its heading");
    // ---------- reduced motion ----------
    // A shopper who asks the system for less motion must not get the sliding category strip.
    await viewport(1440, 900, false);
    const motionState = () => evaluate(() => {
      const strip = document.querySelector(".animate-marquee");
      const drawer = document.getElementById("mobile-menu");
      return {
        media: matchMedia("(prefers-reduced-motion: reduce)").matches,
        animation: strip ? getComputedStyle(strip).animationName : "missing",
        transition: drawer ? parseFloat(getComputedStyle(drawer).transitionDuration) : -1,
      };
    });

    await visit("/", "header");
    const motionNormal = await motionState();
    assert.equal(motionNormal.media, false, "the page starts without the reduced-motion preference");
    assert.equal(motionNormal.animation, "marquee-left", "the category strip animates by default");
    assert.ok(motionNormal.transition > 0.1, `the drawer slides by default: ${motionNormal.transition}`);

    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    await visit("/", "header");
    const motionReduced = await motionState();
    assert.equal(motionReduced.media, true, "the browser reports the reduced-motion preference");
    assert.equal(motionReduced.animation, "none", "the category strip stops when motion is reduced");
    assert.ok(motionReduced.transition < 0.001, `transitions collapse to nothing: ${motionReduced.transition}`);
    await send("Emulation.setEmulatedMedia", { features: [] });
    console.log("PASS reduced motion: the strip stops and transitions collapse when the system asks for it");
    // ---------- phone drawer ----------
    // The drawer is always in the DOM so it can slide; while it is closed its links must be out of
    // reach, and while it is open Escape must close it and give the focus back.
    await viewport(390, 844, true);
    await visit("/", "header");
    const drawerClosed = await evaluate(() => {
      const toggle = document.querySelector('button[aria-controls="mobile-menu"]');
      const drawer = document.getElementById("mobile-menu");
      return {
        expanded: toggle?.getAttribute("aria-expanded"),
        inert: drawer?.hasAttribute("inert"),
        focusable: drawer ? [...drawer.querySelectorAll("a[href], button")].filter((node) => node.offsetParent !== null).length : -1,
      };
    });
    assert.equal(drawerClosed.expanded, "false", "the menu button says the drawer is closed");
    assert.equal(drawerClosed.inert, true, "the closed drawer is inert");

    await evaluate(() => { document.querySelector('button[aria-controls="mobile-menu"]').click(); return true; });
    await pause(400);
    const drawerOpen = await evaluate(() => {
      const toggle = document.querySelector('button[aria-controls="mobile-menu"]');
      const drawer = document.getElementById("mobile-menu");
      return {
        expanded: toggle?.getAttribute("aria-expanded"),
        inert: drawer?.hasAttribute("inert"),
        focusInside: Boolean(drawer && drawer.contains(document.activeElement)),
        links: drawer ? drawer.querySelectorAll("a[href]").length : 0,
      };
    });
    assert.equal(drawerOpen.expanded, "true", "the menu button says the drawer is open");
    assert.equal(drawerOpen.inert, false, "the open drawer is reachable");
    assert.ok(drawerOpen.focusable !== 0, "the open drawer holds its links");
    assert.equal(drawerOpen.focusInside, true, "opening the drawer moves the focus into it");

    // Tab from the last control wraps back to the first, so the focus never lands on the page behind.
    const wrapped = await evaluate(async () => {
      const drawer = document.getElementById("mobile-menu");
      const focusable = [...drawer.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])')]
        .filter((node) => node.offsetParent !== null);
      focusable[focusable.length - 1].focus();
      return { last: document.activeElement?.textContent?.trim().slice(0, 20) ?? "", first: focusable[0].textContent.trim().slice(0, 20) };
    });
    await key("Tab", "Tab", 9);
    const wrappedTo = await evaluate(() => document.activeElement?.textContent?.trim().slice(0, 20) ?? "");
    assert.equal(wrappedTo, wrapped.first, `Tab wraps inside the drawer: ${JSON.stringify({ wrapped, wrappedTo })}`);

    await key("Escape", "Escape", 27);
    await pause(300);
    const afterEscape = await evaluate(() => ({
      expanded: document.querySelector('button[aria-controls="mobile-menu"]')?.getAttribute("aria-expanded"),
      inert: document.getElementById("mobile-menu")?.hasAttribute("inert"),
      focusOnToggle: document.activeElement?.getAttribute("aria-controls") === "mobile-menu",
    }));
    assert.equal(afterEscape.expanded, "false", "Escape closes the drawer");
    assert.equal(afterEscape.inert, true, "the closed drawer is inert again");
    assert.equal(afterEscape.focusOnToggle, true, "Escape returns the focus to the menu button");
    console.log("PASS phone drawer: closed drawer is inert, Escape closes it and returns the focus");
    // ---------- phone ----------
    await viewport(390, 844, true);
    await visit("/", "header");
    const phoneHome = await evaluate(() => ({
      nav: Boolean(document.querySelector('[aria-label="Mobile navigation"], nav[aria-label*="Mobile" i]')),
      width: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    assert.ok(phoneHome.nav, "the phone keeps its bottom navigation");
    assert.equal(phoneHome.width, phoneHome.client, "the phone home page does not scroll sideways");

    await seedCart();
    await resetCheckout();
    await visit("/checkout", "[data-checkout-line]");
    const phoneCheckout = await evaluate(() => ({
      width: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
      total: document.querySelector("[data-checkout-total]")?.innerText,
    }));
    assert.equal(phoneCheckout.width, phoneCheckout.client, "the phone checkout does not scroll sideways");
    assert.match(String(phoneCheckout.total), /42,000/, "the phone shows the same total");
    assert.ok(await evaluate(() => Boolean(document.querySelector("[data-checkout-saved-address]"))), "the phone reuses the saved address");
    const phoneFill = await fillCheckout();
    assert.ok(Object.values(phoneFill).every(Boolean), `phone checkout fields: ${JSON.stringify(phoneFill)}`);
    await pause(400);
    assert.match(String(await placeOrder()), /Order #MH\d+ placed/, "the phone can place the order");

    await visit("/account", "main");
    assert.equal(await openAccountTab(), "clicked");
    const phoneOrders = await evaluate(() => ({
      orders: document.querySelectorAll("[data-account-order]").length,
      width: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
      cards: [...document.querySelectorAll("[data-account-order]")].map((node) => Math.round(node.getBoundingClientRect().width)),
    }));
    assert.equal(phoneOrders.orders, 2, "both orders are listed on the phone");
    assert.equal(phoneOrders.width, phoneOrders.client, "the phone order history does not scroll sideways");
    assert.ok(phoneOrders.cards.every((width) => width <= 390), `card widths: ${phoneOrders.cards.join(",")}`);

    assert.deepEqual(errors, [], `no page errors during the run: ${errors.join(" | ")}`);
    await assertAccessibleNames([["/", "header"], ["/checkout", "main"]]);
    console.log("PASS phone: navigation, checkout and order history fit 390px, every control is named");
  } finally {
    ws.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
