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
    await resetCheckout();
    await visit("/checkout", "[data-checkout-line]");
    const filled = await fillCheckout();
    assert.ok(Object.values(filled).every(Boolean), `checkout fields: ${JSON.stringify(filled)}`);
    await pause(400);
    const confirmation = await placeOrder();
    assert.match(String(confirmation), /Order #MH\d+ placed/, `checkout confirmation: ${confirmation}`);

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
    console.log("PASS phone: navigation, checkout and order history fit 390px");
  } finally {
    ws.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
