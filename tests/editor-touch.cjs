// Local integration check: start the production app and a headless Chromium CDP
// endpoint first. Node 22 supplies WebSocket; no project dependencies are added.
// EDITOR_TEST_ORIGIN and EDITOR_CDP_URL may override the localhost defaults.
const assert = require("node:assert/strict");
const origin = process.env.EDITOR_TEST_ORIGIN || "http://127.0.0.1:3000";
const cdp = process.env.EDITOR_CDP_URL || "http://127.0.0.1:9222";
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
  // Anything the page throws or logs as an error fails the run: a caught render error is how a
  // broken panel shows up in a production build, where React does not rethrow.
  const pageProblems = [];
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.method === "Runtime.exceptionThrown") {
      const details = message.params.exceptionDetails;
      pageProblems.push(`exception: ${(details.exception?.description ?? details.text ?? "").split("\n")[0]}`);
    }
    if (message.method === "Runtime.consoleAPICalled" && (message.params.type === "error" || message.params.type === "assert")) {
      const text = message.params.args.map((arg) => String(arg.value ?? arg.description ?? arg.type)).join(" ");
      pageProblems.push(`${message.params.type}: ${text.slice(0, 300)}`);
    }
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    clearTimeout(entry.timer);
    if (message.error) entry.reject(new Error(`${entry.method}: ${JSON.stringify(message.error)}`));
    else entry.resolve(message.result);
  });
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`CDP timed out: ${method}`));
      }, 10000);
      pending.set(id, { resolve, reject, timer, method });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async function evaluate(fn, ...args) {
    const result = await send("Runtime.evaluate", {
      expression: `(${fn.toString()})(...${JSON.stringify(args)})`,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) throw new Error(`${JSON.stringify(result.exceptionDetails)}\n--- failing evaluate ---\n${fn.toString()}`);
    return result.result.value;
  }
  async function load(width, height, mobile) {
    await send("Emulation.setDeviceMetricsOverride", { width, height, mobile, deviceScaleFactor: 1 });
    await send("Emulation.setTouchEmulationEnabled", { enabled: mobile, maxTouchPoints: 5 });
    // Every section starts from a blank editor. The draft restore would otherwise carry the
    // previous section's layers into this one, so "Layer 1" would not be the layer on screen.
    // The app registers a service worker, and it will happily serve the previous bundle after a
    // rebuild, so clear it along with the draft.
    await send("Storage.clearDataForOrigin", { origin, storageTypes: "local_storage,service_workers,cache_storage" });
    // Navigating to the URL the page already shows is a same-document no-op, so every section after
    // the first used to run on the previous section's document. Go through about:blank to force a
    // real load.
    await send("Page.navigate", { url: "about:blank" });
    await send("Page.navigate", { url: `${origin}/create` });
    for (let n = 0; n < 40; n++) {
      await pause(100);
      if (await evaluate(() => !!document.querySelector('button[aria-label="Canvas options"]'))) break;
    }
    await pause(500);
    const toolbar = await evaluate(async () => {
      const bar = document.querySelector('[data-testid="editor-tools-bar"]');
      if (!bar) throw new Error("Missing responsive Editor Tools bar");
      const foreground = bar.querySelector('button[aria-label="Foreground Color"]');
      const background = bar.querySelector('button[aria-label="Background Color"]');
      const bounds = bar.getBoundingClientRect();
      const expandedButton = bar.querySelector('button[aria-label="Collapse editor tools"]');
      if (!expandedButton) throw new Error("Missing expanded Tools bar toggle");
      const expandedHasTitle = expandedButton.hasAttribute("title");
      const expandedHasVisibleText = !!expandedButton.textContent?.trim();
      expandedButton.click();
      await new Promise((resolve) => setTimeout(resolve, 40));
      const collapsedButton = bar.querySelector('button[aria-label="Expand editor tools"]');
      if (!collapsedButton) throw new Error("Tools bar failed to collapse");
      const collapsedHasTitle = collapsedButton.hasAttribute("title");
      const collapsedHasVisibleText = !!collapsedButton.textContent?.trim();
      collapsedButton.click();
      await new Promise((resolve) => setTimeout(resolve, 40));
      if (!bar.querySelector('button[aria-label="Collapse editor tools"]')) throw new Error("Tools bar failed to expand");
      return {
        foregroundVisible: !!foreground && bounds.width > 0 && bounds.height > 0,
        backgroundVisible: !!background && bounds.width > 0 && bounds.height > 0,
        textToolPresent: !!bar.querySelector('button[aria-label="Text"]'),
        expandedToggleHasTitle: expandedHasTitle,
        collapsedToggleHasTitle: collapsedHasTitle,
        toggleHasVisibleText: expandedHasVisibleText || collapsedHasVisibleText,
        top: bounds.top,
        bottom: bounds.bottom,
        viewportHeight: window.innerHeight,
      };
    });
    assert.ok(toolbar.foregroundVisible, `Foreground swatch missing at ${width}×${height}`);
    assert.ok(toolbar.backgroundVisible, `Background swatch missing at ${width}×${height}`);
    assert.equal(toolbar.textToolPresent, false, `Text Tool should be absent at ${width}×${height}`);
    assert.equal(toolbar.expandedToggleHasTitle, false, `Expanded toggle tooltip should be absent at ${width}×${height}`);
    assert.equal(toolbar.collapsedToggleHasTitle, false, `Collapsed toggle tooltip should be absent at ${width}×${height}`);
    assert.equal(toolbar.toggleHasVisibleText, false, `Toggle should display no text at ${width}×${height}`);
    assert.ok(toolbar.top >= 0 && toolbar.bottom <= toolbar.viewportHeight, `Tools bar must remain in view at ${width}×${height}`);
  }
  async function rect(selector, scroll = true) {
    if (scroll) {
      await evaluate((sel) => {
        const element = document.querySelector(sel);
        if (!element) throw new Error(`Missing ${sel}`);
        const viewport = document.querySelector('[aria-label="Editor viewport"]');
        const panel = document.querySelector('[aria-label="Layers panel"]');
        const headerBar2 = element.closest('[aria-label="Header Bar 2"]');
        if (headerBar2) {
          element.scrollIntoView({ block: "nearest", inline: "nearest" });
        } else if (panel?.contains(element)) {
          element.scrollIntoView({ block: "nearest", inline: "nearest" });
        } else if (viewport.contains(element)) {
          const r = element.getBoundingClientRect();
          const v = viewport.getBoundingClientRect();
          viewport.scrollTop += r.y + r.height / 2 - (v.y + v.height / 2);
        }
      }, selector);
      await pause(80);
    }
    return evaluate((sel) => {
      const element = document.querySelector(sel);
      if (!element) throw new Error(`Missing ${sel}`);
      const r = element.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    }, selector);
  }
  const overlay = (side) => `section[aria-label="${side} Mockup"] svg[role="group"]`;
  // A mostly-horizontal stroke: Chrome's touch emulation reads a vertical finger drag on the
  // print canvas as a viewport pan, which cancels the stroke.
  async function strokeCanvas() {
    const area = await evaluate(() => {
      const c = document.querySelector('canvas[aria-label="Blank print canvas"]').getBoundingClientRect();
      const v = document.querySelector('[aria-label="Editor viewport"]').getBoundingClientRect();
      const top = Math.max(c.top, v.top) + 14;
      const bottom = Math.min(c.bottom, v.bottom) - 14;
      const y = (top + bottom) / 2;
      return {
        from: { x: Math.max(c.left, v.left) + 14, y },
        to: { x: Math.min(c.right, v.right) - 14, y: y + 24 },
      };
    });
    await drag(area.from, area.to);
  }
  async function snapshot() {
    return evaluate(() => {
      const v = document.querySelector('[aria-label="Editor viewport"]');
      const w = v.firstElementChild;
      return {
        scrollTop: v.scrollTop,
        view: w.style.transform,
        source: document.querySelector('section[aria-label="Print canvas"] [data-editor-artwork-stroke="true"]')?.outerHTML || "",
        nodes: Object.fromEntries([...document.querySelectorAll("section[aria-label]")].map((s) => [s.getAttribute("aria-label"), s.style.transform])),
        overlays: [...document.querySelectorAll('svg[role="group"]')].map((s) => ({
          label: s.getAttribute("aria-label"),
          cap: Number(s.getAttribute("data-artwork-max-edge-px")),
          // The outer <g> is the print-area clip; the move/scale lives on the inner one.
          transform: s.querySelector("g g")?.getAttribute("transform") ?? null,
          edge: Math.max(...s.getAttribute("aria-label").match(/\d+(?= ×| px)/g).map(Number)),
        })),
      };
    });
  }
  async function touch(type, points) {
    await send("Input.dispatchTouchEvent", { type, touchPoints: points });
  }
  async function drag(from, to, cancel = false) {
    await touch("touchStart", [{ ...from, id: 1 }]);
    for (let n = 1; n <= 12; n++) {
      await touch("touchMove", [{ x: from.x + (to.x - from.x) * n / 12, y: from.y + (to.y - from.y) * n / 12, id: 1 }]);
      await pause(15);
    }
    await touch(cancel ? "touchCancel" : "touchEnd", []);
    await pause(220);
  }
  async function tap(selector) {
    const r = await rect(selector);
    await touch("touchStart", [{ x: r.x + r.w / 2, y: r.y + r.h / 2, id: 1 }]);
    await touch("touchEnd", []);
    await pause(120);
  }
  const mouse = (type, p, buttons = 0) => send("Input.dispatchMouseEvent", { type, ...p, button: "left", buttons, clickCount: 1 });
  // Modifier bits: Alt 1, Ctrl 2, Meta 4, Shift 8.
  async function keyStroke(key, { modifiers = 0 } = {}) {
    const code = `Key${key.toUpperCase()}`;
    const virtualKeyCode = key.toUpperCase().charCodeAt(0);
    const press = { key, code, modifiers, windowsVirtualKeyCode: virtualKeyCode, nativeVirtualKeyCode: virtualKeyCode };
    await send("Input.dispatchKeyEvent", { type: "keyDown", ...press });
    await send("Input.dispatchKeyEvent", { type: "keyUp", ...press });
    await pause(160);
  }
  async function clickPoint(point) {
    await mouse("mouseMoved", point);
    await mouse("mousePressed", point, 1);
    await mouse("mouseReleased", point);
    await pause(100);
  }
  async function clickMouse(selector) {
    const r = await rect(selector, false);
    await clickPoint({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
  }
  async function selectArtwork(side) {
    await rect(overlay(side));
    const r = await rect(`${overlay(side)} rect[aria-label^="Move"]`, false);
    await touch("touchStart", [{ x: r.x + r.w / 2, y: r.y + r.h / 2, id: 1 }]);
    await touch("touchEnd", []);
    await pause(100);
  }
  async function resizeArtwork(side, factor) {
    await selectArtwork(side);
    const hit = await rect(`${overlay(side)} [data-artwork-resize-touch-target]`, false);
    assert.ok(Math.abs(hit.w - 44) < 1 && Math.abs(hit.h - 44) < 1, "Resize touch target stays 44 CSS pixels");
    const geometry = await evaluate((sel) => {
      const svg = document.querySelector(sel);
      const c = svg.querySelector('[data-artwork-resize-touch-target]');
      const move = svg.querySelector('rect[aria-label^="Move"]');
      const point = (x, y) => {
        const p = svg.createSVGPoint(); p.x = x; p.y = y;
        const r = p.matrixTransform(svg.getScreenCTM()); return { x: r.x, y: r.y };
      };
      return {
        handle: point(c.cx.baseVal.value, c.cy.baseVal.value),
        center: point(+move.getAttribute("x") + +move.getAttribute("width") / 2, +move.getAttribute("y") + +move.getAttribute("height") / 2),
      };
    }, overlay(side));
    // Start off the tiny visible dot: test the new transparent touch target.
    const from = { x: geometry.handle.x + 12, y: geometry.handle.y + 2 };
    const to = { x: geometry.center.x + (from.x - geometry.center.x) * factor, y: geometry.center.y + (from.y - geometry.center.y) * factor };
    const hitNode = await evaluate((p) => {
      const e = document.elementFromPoint(p.x, p.y);
      return e?.hasAttribute("data-artwork-resize-touch-target");
    }, from);
    assert.ok(hitNode, "Finger starts on the expanded resize hit target, not the tiny dot");
    await drag(from, to);
  }
  // Open a Header Bar 2 box dropdown and pick an option by its role="option" label.
  async function chooseBox(label, optionLabel) {
    await tap(`[data-editor-box="${label}"]`);
    const menuId = `editor-header-bar2-${label.toLowerCase()}-options`;
    const optionSelector = `[role="listbox"]#${menuId} [role="option"][aria-label="${optionLabel}"]`;
    const r = await rect(optionSelector);
    await touch("touchStart", [{ x: r.x + r.w / 2, y: r.y + r.h / 2, id: 1 }]);
    await touch("touchEnd", []);
    await pause(120);
    return evaluate((sel) => document.querySelector(sel)?.textContent.trim(), `[data-editor-box="${label}"]`);
  }
  async function phone(width, height) {
    await load(width, height, true);
    const initial = await evaluate(() => {
      const main = document.querySelector("main").getBoundingClientRect();
      const nav = document.querySelector('[aria-label="Mobile navigation"]').getBoundingClientRect();
      const slot = document.querySelector("[data-editor-shared-header]");
      const header = slot.getBoundingClientRect();
      const toolbar = document.querySelector('[aria-label="Header Bar 2"]');
      const bar2 = toolbar.getBoundingClientRect();
      const editor = document.querySelector('[aria-label="Editor viewport"]').getBoundingClientRect();
      const controls = [...toolbar.querySelectorAll("select, button")];
      return {
        mainBottom: main.bottom, navTop: nav.top,
        bodyHeight: document.documentElement.scrollHeight, viewportHeight: innerHeight,
        headerHeight: header.height, headerBottom: header.bottom,
        bar2Top: bar2.top, bar2Bottom: bar2.bottom, editorTop: editor.top,
        bar2Height: bar2.height,
        bar2Labels: controls.map((control) => control.getAttribute("aria-label") || control.textContent.trim()),
        saveBuyDisabled: ["Save", "Buy"].every((label) => toolbar.querySelector(`button[aria-label="${label}"]`)?.disabled),
        size: toolbar.querySelector('[data-editor-box="Size"]')?.textContent.trim(),
        visibleFieldLabels: [...toolbar.querySelectorAll("[data-editor-field-label]")].filter((label) => getComputedStyle(label).display !== "none").length,
        priceVisible: getComputedStyle(toolbar.querySelector("[data-editor-price]")).display !== "none",
        boxMetrics: [...toolbar.querySelectorAll("[data-editor-box]")].map((box) => ({
          width: Math.round(box.getBoundingClientRect().width),
          height: Math.round(box.getBoundingClientRect().height),
        })),
        boxColors: [...toolbar.querySelectorAll("[data-editor-box]")].map((box) => getComputedStyle(box).backgroundColor),
        accent: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim().split(/\s+/).join(", "),
        colorExpanded: toolbar.querySelector('button[aria-label="Color"]')?.getAttribute("aria-expanded"),
        colorCurrent: toolbar.querySelector('button[aria-label="Color"] [data-color-swatch]')?.getAttribute("data-color-swatch"),
        colorArrow: Boolean(toolbar.querySelector('button[aria-label="Color"] svg.lucide-chevron-down')),
        colorMenuOpen: Boolean(document.querySelector('[data-testid="editor-header-bar2-color-options"]')),
        selectedProduct: toolbar.querySelector('[data-editor-box="Product"]').textContent.trim(),
        selectedGsm: toolbar.querySelector('[data-editor-box="GSM"]').textContent.trim(),
        productBoxWidth: toolbar.querySelector('[data-editor-box="Product"]').getBoundingClientRect().width,
        productCanChange: !toolbar.querySelector('[data-editor-box="Product"]').disabled,
        mobileHeader: getComputedStyle(slot.firstElementChild).display,
        desktopHeader: getComputedStyle(slot.lastElementChild).display,
      };
    });
    assert.ok(initial.headerHeight > 0 && initial.mobileHeader !== "none" && initial.desktopHeader === "none", "Reuse the existing mobile Header Bar");
    assert.ok(initial.bar2Top >= initial.headerBottom - 1 && initial.editorTop >= initial.bar2Bottom - 1, "Bar 2 sits between Header Bar and Editor");
    assert.deepEqual(initial.bar2Labels, ["Product", "Print Method", "Fabric Type", "Knit Structure", "MH Cuttings", "GSM", "Color", "Size", "Save", "Buy"]);
    assert.ok(initial.bar2Height <= 44, "Header Bar 2 is compact");
    assert.equal(initial.selectedProduct, "T-Shirt");
    assert.equal(initial.selectedGsm, "160 GSM", "The first GSM is selected by default");
    assert.equal(initial.size, "XL", "Size defaults to XL");
    const boxWidth = initial.boxMetrics[0].width;
    assert.ok(initial.boxMetrics.every((box) => box.width === boxWidth && box.height === 44), "All mobile boxes share equal width and touch height");
    assert.equal(initial.visibleFieldLabels, 0, "Mobile keeps only the field/action boxes, not separate field labels");
    assert.equal(initial.priceVisible, false, "Mobile hides the separate price text");
    assert.equal(initial.colorExpanded, "false", "Color starts as a closed dropdown");
    assert.equal(initial.colorCurrent, "white", "Color shows the selected garment colour in the box");
    assert.equal(initial.colorArrow, true, "Color uses the same down-arrow affordance as the other selectors");
    assert.equal(initial.colorMenuOpen, false, "Color choices are tucked into the dropdown until opened");
    // Product/GSM/Size/Save/Buy keep the green fill; the Color box is outlined
    // only, so the selected colour reads clearly instead of a green box.
    const colorBoxIndex = initial.bar2Labels.indexOf("Color");
    assert.ok(initial.boxColors.filter((_, index) => index !== colorBoxIndex).every((color) => color === `rgb(${initial.accent})`), "Every non-color control box uses the app's green accent fill");
    assert.equal(initial.boxColors[colorBoxIndex], "rgba(0, 0, 0, 0)", "The Color box is a green outline with no green fill");
    assert.ok(initial.productBoxWidth <= boxWidth, "Product selector stays compact");
    assert.equal(initial.productCanChange, true, "T-Shirt and Phone are selectable");
    assert.ok(initial.saveBuyDisabled, "Save and Buy remain placeholders while Color and Size are usable selectors");

    // Every field uses the same rounded dropdown panel, not a native select.
    await tap('button[aria-label="Product"]');
    const productMenu = await evaluate(() => {
      const menu = document.querySelector('[role="listbox"][aria-label="Product options"]');
      const rect = menu.getBoundingClientRect();
      return {
        radius: Number.parseFloat(getComputedStyle(menu).borderTopLeftRadius),
        width: Math.round(rect.width),
        triggerWidth: Math.round(document.querySelector('button[aria-label="Product"]').getBoundingClientRect().width),
        height: Math.round(rect.height),
        background: getComputedStyle(menu).backgroundColor,
        accent: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim().split(/\s+/).join(", "),
        options: [...menu.querySelectorAll('[role="option"]')].map((option) => ({
          label: option.getAttribute("aria-label"),
          selected: option.getAttribute("aria-selected"),
          disabled: option.disabled,
          radius: Number.parseFloat(getComputedStyle(option).borderTopLeftRadius),
        })),
        bounds: { left: rect.left, right: rect.right },
        viewport: { width: innerWidth },
      };
    });
    assert.ok(productMenu.radius >= 12, "Product dropdown container is rounded like the boxes");
    assert.ok(productMenu.radius < productMenu.height / 2, "Product dropdown keeps straight sides instead of clamping into a capsule");
    assert.equal(productMenu.width, productMenu.triggerWidth, "Product dropdown is as wide as the box above it, not oversized");
    assert.equal(productMenu.background, `rgb(${productMenu.accent})`, "Product dropdown uses the app's green accent");
    assert.deepEqual(productMenu.options.map((option) => option.label), ["Product T-Shirt", "Product Phone", "Product Hoodie", "Product Cup", "Product Kids", "Product Bag"]);
    assert.equal(productMenu.options[0].selected, "true", "The current T-Shirt choice is marked selected");
    assert.deepEqual(productMenu.options.filter((option) => option.disabled).map((option) => option.label), ["Product Hoodie", "Product Cup", "Product Kids", "Product Bag"]);
    assert.ok(productMenu.options.every((option) => option.radius >= 8), "Product dropdown choices are also rounded");
    assert.ok(productMenu.bounds.left >= 0 && productMenu.bounds.right <= productMenu.viewport.width, "Product dropdown stays within the phone viewport");
    await tap('button[aria-label="Product"]');
    assert.equal(await evaluate(() => Boolean(document.querySelector('[role="listbox"][aria-label="Product options"]'))), false, "Tapping the trigger again closes the dropdown");

    await tap('button[aria-label="Color"]');
    const colorMenu = await evaluate(() => {
      const menu = document.querySelector('[role="listbox"][aria-label="Color options"]');
      const rect = menu.getBoundingClientRect();
      return {
        radius: Number.parseFloat(getComputedStyle(menu).borderTopLeftRadius),
        height: Math.round(rect.height),
        background: getComputedStyle(menu).backgroundColor,
        accent: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim().split(/\s+/).join(", "),
        options: [...menu.querySelectorAll('[role="option"]')].map((option) => ({
          label: option.getAttribute("aria-label"),
          selected: option.getAttribute("aria-selected"),
          radius: Number.parseFloat(getComputedStyle(option).borderTopLeftRadius),
        })),
        bounds: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
        viewport: { width: innerWidth, height: innerHeight },
        expanded: document.querySelector('button[aria-label="Color"]')?.getAttribute("aria-expanded"),
      };
    });
    assert.equal(colorMenu.expanded, "true");
    assert.ok(colorMenu.radius >= 12, "Color dropdown container is rounded");
    assert.ok(colorMenu.radius < colorMenu.height / 2, "Color dropdown keeps straight sides instead of clamping into a capsule");
    assert.equal(colorMenu.background, `rgb(${colorMenu.accent})`, "Color dropdown uses the app's green accent");
    assert.deepEqual(
      colorMenu.options.map((option) => option.label),
      ["Color White", "Color Black", "Color Navy", "Color Red", "Color Blue", "Color Green", "Color Yellow", "Color Grey", "Color Sand"],
      "Color dropdown lists real garment colours, including the Sand the price book sells",
    );
    assert.equal(colorMenu.options[0].selected, "true", "The current White choice is marked selected");
    assert.ok(colorMenu.options.every((option) => option.radius >= 8), "Color dropdown choices are also rounded");
    assert.ok(colorMenu.bounds.left >= 0 && colorMenu.bounds.right <= colorMenu.viewport.width, "Color dropdown stays within the phone viewport");
    await tap('button[aria-label="Color Black"]');
    const chosenColor = await evaluate(() => ({
      value: document.querySelector('button[aria-label="Color"] [data-color-swatch]')?.getAttribute("data-color-swatch"),
      hex: document.querySelector('button[aria-label="Color"] [data-color-swatch]')?.getAttribute("data-color-hex"),
      expanded: document.querySelector('button[aria-label="Color"]')?.getAttribute("aria-expanded"),
    }));
    assert.equal(chosenColor.value, "black", "Choosing a dropdown swatch updates the Color box");
    assert.equal(chosenColor.hex, "#111111", "The trigger swatch paints the real chosen colour");
    assert.equal(chosenColor.expanded, "false", "Choosing a swatch closes the dropdown");
    if (width === 390) assert.equal(await chooseBox("GSM", "GSM 200 GSM"), "200 GSM");
    assert.ok(initial.mainBottom <= initial.navTop + 1, "Editor stays above mobile navigation");
    assert.ok(initial.bodyHeight <= initial.viewportHeight + 1, "Editor and nav do not create document overflow");

    const closedEditSidebar = await evaluate(() => ({
      expanded: document.querySelector('button[aria-label="Expand Edit sidebar"]')?.getAttribute("aria-expanded"),
      panel: document.querySelector("#editor-edit-sidebar"),
    }));
    assert.equal(closedEditSidebar.expanded, "false", "Edit sidebar starts collapsed");
    assert.equal(closedEditSidebar.panel, null);
    await tap('button[aria-label="Expand Edit sidebar"]');
    const editRail = await evaluate(() => [...document.querySelectorAll('aside[aria-label="Edit sidebar rail"] button')].map((button) => button.getAttribute("aria-label")));
    assert.deepEqual(editRail, [
      "Open Designs in Edit sidebar",
      "Open Elements in Edit sidebar",
      "Open Text in Edit sidebar",
      "Open Upload in Edit sidebar",
      "Open Image Create in Edit sidebar",
    ], "The phone Edit toggle opens the section rail first");
    await tap('button[aria-label="Open Text in Edit sidebar"]');
    const editSidebar = await evaluate(() => {
      const panel = document.querySelector("#editor-edit-sidebar");
      const toggle = document.querySelector('button[aria-label="Collapse Edit sidebar"]');
      const panelBox = panel.getBoundingClientRect();
      const toggleBox = toggle.getBoundingClientRect();
      return {
        title: panel.querySelector('[role="heading"]')?.textContent,
        side: panel.dataset.dockSide,
        left: panelBox.left,
        right: panelBox.right,
        width: panelBox.width,
        viewportLeft: document.querySelector('[aria-label="Editor viewport"]').getBoundingClientRect().left,
        pressed: [...document.querySelectorAll('aside[aria-label="Edit sidebar rail"] button')].filter((button) => button.getAttribute("aria-pressed") === "true").map((button) => button.getAttribute("aria-label")),
        toggleLeft: toggleBox.left,
        toggleWidth: toggleBox.width,
        toggleHeight: toggleBox.height,
        toggleRadius: getComputedStyle(toggle).borderRadius,
        toggleBackground: getComputedStyle(toggle).backgroundColor,
        accent: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim().split(/\s+/).join(", "),
      };
    });
    assert.equal(editSidebar.title, "Text", "The rail section that was chosen is the open panel");
    assert.equal(editSidebar.side, "left");
    assert.deepEqual(editSidebar.pressed, ["Open Text in Edit sidebar"], "The open section is the pressed rail item");
    assert.ok(Math.abs(editSidebar.left - (editSidebar.viewportLeft + 48)) < 1, "Edit sidebar sits beside its 48px rail");
    assert.ok(editSidebar.width <= 272, "Canva-like placeholder sidebar stays compact (17rem cap)");
    assert.ok(Math.abs(editSidebar.toggleLeft - editSidebar.right) < 1, "Open-state toggle sits on the panel's outer edge");
    assert.equal(editSidebar.toggleWidth, 44, "Phone Edit toggle remains finger-sized");
    assert.equal(editSidebar.toggleHeight, 44);
    assert.ok(Number.parseFloat(editSidebar.toggleRadius) >= 20, "Edit sidebar toggle is circular");
    assert.equal(editSidebar.toggleBackground, `rgb(${editSidebar.accent})`, "Edit toggle uses the app's current theme accent");
    await tap('button[aria-label="Expand Layers panel"]');
    assert.equal(await evaluate(() => document.querySelector("#editor-edit-sidebar")), null, "Opening the opposite dock closes Edit on phone to prevent overlap");
    assert.equal(await evaluate(() => Boolean(document.querySelector('aside[aria-label="Layers panel"]'))), true, "The Layers panel opens on the opposite side");
    await tap('button[aria-label="Collapse Layers panel"]');

    const closedLayers = await evaluate(() => ({
      expanded: document.querySelector('button[aria-label="Expand Layers panel"]')?.getAttribute("aria-expanded"),
      panel: document.querySelector('aside[aria-label="Layers panel"]'),
    }));
    assert.equal(closedLayers.expanded, "false", "Layers panel starts closed");
    assert.equal(closedLayers.panel, null);
    await tap('button[aria-label="Expand Layers panel"]');
    const openLayers = await evaluate(() => {
      const panel = document.querySelector('aside[aria-label="Layers panel"]');
      const button = document.querySelector('button[aria-label="Collapse Layers panel"]');
      const viewport = document.querySelector('[aria-label="Editor viewport"]').getBoundingClientRect();
      const panelBox = panel.getBoundingClientRect();
      const buttonBox = button.getBoundingClientRect();
      return {
        title: panel.querySelector('[role="heading"]')?.textContent,
        layerCount: panel.querySelector('[aria-label="Layer count"]')?.textContent,
        initialLayer: !!panel.querySelector('[aria-label="Select Layer 1"]'),
        addLayer: !!panel.querySelector('[aria-label="Add layer"]'),
        right: panelBox.right,
        width: panelBox.width,
        viewportRight: viewport.right,
        viewportWidth: viewport.width,
        arrowRight: buttonBox.right,
        panelLeft: panelBox.left,
        dockSide: panel.dataset.dockSide,
        titleHeight: panel.querySelector('[aria-label="Layers panel title"]').getBoundingClientRect().height,
        actionBarHeight: panel.querySelector('[aria-label="Layer actions"]').getBoundingClientRect().height,
        layerRowHeight: panel.querySelector('[aria-label="Layer list"] [role="listitem"]').getBoundingClientRect().height,
        noUnusedRows: !panel.querySelector('[aria-label="Layers panel menu"], [aria-label="Layer kind filters"]') && !/\b(?:Channels|Paths|Kind)\b/.test(panel.textContent),
        fillDisabled: panel.querySelector('#editor-layer-fill').disabled,
        fillOpacity: getComputedStyle(panel.querySelector('#editor-layer-fill')).opacity,
        toggleWidth: buttonBox.width,
        toggleHeight: buttonBox.height,
        toggleRadius: getComputedStyle(button).borderRadius,
        toggleBackground: getComputedStyle(button).backgroundColor,
        accent: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim().split(/\s+/).join(", "),
        expanded: button.getAttribute("aria-expanded"),
      };
    });
    assert.equal(openLayers.title, "Layers");
    assert.equal(openLayers.layerCount, "1");
    assert.equal(openLayers.initialLayer, true, "The blank artwork layer exists on load");
    assert.equal(openLayers.addLayer, true, "The panel can create a new layer");
    assert.equal(openLayers.dockSide, "right");
    assert.ok(Math.abs(openLayers.right - openLayers.viewportRight) < 1, "Layers panel docks to the viewport's right edge");
    assert.ok(openLayers.width <= openLayers.viewportWidth * 0.86 + 1, "Layers panel fits narrow phone screens");
    assert.ok(openLayers.width <= 257, "Compact Layers panel stays within its 16rem maximum width");
    assert.ok(Math.abs(openLayers.arrowRight - openLayers.panelLeft) < 1, "The collapse arrow remains reachable at the open panel edge");
    assert.equal(openLayers.titleHeight, 44, "Portrait Layers title row stays 44px tall");
    assert.equal(openLayers.actionBarHeight, 44, "Portrait touch action bar stays 44px tall");
    assert.ok(openLayers.layerRowHeight >= 44, "Portrait touch layer rows preserve at least a 44px target");
    assert.equal(openLayers.noUnusedRows, true, "Unused Channels, Paths, Menu, and Kind rows are removed");
    assert.equal(openLayers.fillDisabled, false, "Fill is editable for the selected layer");
    assert.equal(Number(openLayers.fillOpacity), 1, "Fill is not dimmed when editable");
    assert.equal(openLayers.toggleWidth, 44, "Mobile Layers toggle retains a 44px circular touch target");
    assert.equal(openLayers.toggleHeight, 44);
    assert.ok(Number.parseFloat(openLayers.toggleRadius) >= 20, "Layers toggle is circular");
    assert.equal(openLayers.toggleBackground, `rgb(${openLayers.accent})`, "Layers toggle uses the app accent token");
    assert.equal(openLayers.expanded, "true");
    if (width === 390) {
      await tap('button[aria-label="Add layer"]');
      assert.equal(await evaluate(() => document.querySelectorAll('[aria-label="Layer list"] [role="listitem"]').length), 2);
      await tap('button[aria-label="Add mask to Layer 2"]');
      assert.equal(await evaluate(() => !!document.querySelector('[aria-label="Stop editing Layer 2 mask"]')), true, "Adding a mask selects it for editing");
      assert.equal(await evaluate(() => document.querySelector('[aria-label="Layer mask painting controls"]') === null), true);
      assert.equal(await evaluate(() => !!document.querySelector('[aria-label="Foreground Color"]')), true);
      await tap('button[aria-label="Select Layer 2"]');
      await tap('button[aria-label="Collapse Layers panel"]');

      await tap('button[aria-label="Pencil tool"]');
      let layerCanvas = await rect('canvas[aria-label="Blank print canvas"]');
      await drag({ x: layerCanvas.x + layerCanvas.w * 0.2, y: layerCanvas.y + layerCanvas.h * 0.35 }, { x: layerCanvas.x + layerCanvas.w * 0.8, y: layerCanvas.y + layerCanvas.h * 0.45 });
      assert.ok(await evaluate(() => !!document.querySelector('section[aria-label="Print canvas"] [data-editor-artwork-stroke="true"]')), "Artwork draws onto the selected layer");

      await tap('button[aria-label="Expand Layers panel"]');
      await tap('button[aria-label="Select Layer 2 mask"]');
      await tap('button[aria-label="Collapse Layers panel"]');
      layerCanvas = await rect('canvas[aria-label="Blank print canvas"]');
      await drag({ x: layerCanvas.x + layerCanvas.w * 0.35, y: layerCanvas.y + layerCanvas.h * 0.38 }, { x: layerCanvas.x + layerCanvas.w * 0.65, y: layerCanvas.y + layerCanvas.h * 0.42 });
      const paintedMask = await evaluate(() => {
        const svg = document.querySelector('section[aria-label="Print canvas"] svg');
        const mask = svg.querySelector('mask path[stroke="black"]');
        const maskedArtwork = [...svg.querySelectorAll("g[mask]")].some((group) => group.querySelector('[data-editor-artwork-stroke="true"]'));
        return { hasHideStroke: !!mask?.getAttribute("d"), maskedArtwork };
      });
      assert.ok(paintedMask.hasHideStroke, "Black brush strokes are saved as mask pixels, not destructive artwork erasure");
      assert.equal(paintedMask.maskedArtwork, true, "The source layer is actually clipped through its mask");

      await tap('button[aria-label="Expand Layers panel"]');
      await tap('button[aria-label="Layer options for Layer 2"]');
      await tap('button[aria-label="Duplicate Layer 2"]');
      assert.equal(await evaluate(() => document.querySelectorAll('[aria-label="Layer list"] [role="listitem"]').length), 3);
      await tap('button[aria-label="Layer options for Layer 2 copy"]');
      await tap('button[aria-label="Delete Layer 2 copy"]');
      assert.equal(await evaluate(() => document.querySelectorAll('[aria-label="Layer list"] [role="listitem"]').length), 2);
      await tap('button[aria-label="Layer options for Layer 1"]');
      await tap('button[aria-label="Delete Layer 1"]');
      assert.equal(await evaluate(() => document.querySelectorAll('[aria-label="Layer list"] [role="listitem"]').length), 1);
      assert.equal(await evaluate(() => !!document.querySelector('[aria-label="Select Layer 2"]')), true, "Deleting another layer preserves the selected artwork");
    }
    await tap('button[aria-label="Collapse Layers panel"]');
    assert.equal(await evaluate(() => document.querySelector('aside[aria-label="Layers panel"]')), null, "Arrow collapses the panel again");

    // Stroke the canvas before the mockups exist: a drag that starts on the print canvas of
    // a scrolled mockup strip is read as a pan by Chrome's touch emulation.
    await rect('canvas[aria-label="Blank print canvas"]');
    await tap('button[aria-label="Pencil tool"]');
    await strokeCanvas();
    assert.ok(await evaluate(() => !!document.querySelector('section[aria-label="Print canvas"] [data-editor-artwork-stroke="true"]')), "Artwork draws onto the print canvas");

    const options = await rect('button[aria-label="Canvas options"]');
    assert.equal(options.w, 44); assert.equal(options.h, 44);
    await tap('button[aria-label="Canvas options"]');
    await tap('button[aria-label="Add Front Mockup"]');
    await tap('button[aria-label="Canvas options"]');
    const addBack = await rect('button[aria-label="Add Back Mockup"]');
    assert.ok(addBack.h >= 39, "Back Mockup menu row stays compact but finger-usable");
    await tap('button[aria-label="Add Back Mockup"]');
    const surface = await rect('section[aria-label="Front Mockup"] > div:last-child');
    const beforeSwipe = await snapshot();
    await drag({ x: surface.x + surface.w / 2, y: surface.y + surface.h * 0.9 }, { x: surface.x + surface.w / 2, y: surface.y + 20 });
    const afterSwipe = await snapshot();
    assert.ok(afterSwipe.scrollTop > beforeSwipe.scrollTop + 30, "Mockup swipe scrolls the editor");
    assert.deepEqual(afterSwipe.nodes, beforeSwipe.nodes, "Swipe does not move the mockup");

    const drawn = await snapshot();
    assert.equal(drawn.overlays.length, 2);
    assert.equal(drawn.overlays[0].cap, 3500); assert.equal(drawn.overlays[1].cap, 1500);
    await tap('button[aria-label="Move"]');
    const move = await rect(`${overlay("Back")} rect[aria-label^="Move"]`);
    const beforeMove = await snapshot();
    await drag({ x: move.x + move.w / 2, y: move.y + move.h / 2 }, { x: move.x + move.w / 2 + 14, y: move.y + move.h / 2 + 10 });
    const moved = await snapshot();
    assert.notEqual(moved.overlays[1].transform, beforeMove.overlays[1].transform);
    assert.deepEqual(moved.nodes, beforeMove.nodes);
    assert.equal(moved.source, drawn.source);

    await resizeArtwork("Back", 2.6);
    const backLarge = await snapshot();
    assert.equal(backLarge.overlays[0].cap, 1500); assert.equal(backLarge.overlays[1].cap, 3500);
    assert.ok(backLarge.overlays[1].edge > 1500 && backLarge.overlays[1].edge <= 3500);
    assert.ok(backLarge.overlays[0].edge <= 1500);
    assert.equal(backLarge.source, drawn.source);
    await resizeArtwork("Front", 2.6);
    const frontLarge = await snapshot();
    assert.equal(frontLarge.overlays[0].cap, 3500); assert.equal(frontLarge.overlays[1].cap, 1500);
    assert.ok(frontLarge.overlays[0].edge > 1500 && frontLarge.overlays[0].edge <= 3500);
    assert.ok(frontLarge.overlays[1].edge <= 1500);
    await resizeArtwork("Front", 0.34);
    const released = await snapshot();
    assert.equal(released.overlays[0].cap, 3500); assert.equal(released.overlays[1].cap, 3500);
    assert.ok(released.overlays.every((s) => s.edge <= 1500));

    const beforePan = await snapshot();
    await tap('button[aria-label="Pan view"]');
    const backSurface = await rect('section[aria-label="Back Mockup"] > div:last-child');
    await drag({ x: backSurface.x + 130, y: backSurface.y + 90 }, { x: backSurface.x + 150, y: backSurface.y + 112 });
    const panned = await snapshot();
    assert.notEqual(panned.view, beforePan.view);
    assert.deepEqual(panned.overlays, beforePan.overlays);
    assert.deepEqual(panned.nodes, beforePan.nodes);
    assert.equal(panned.source, beforePan.source);
    await tap('button[aria-label="Zoom in"]');
    assert.equal(await evaluate(() => document.querySelector('[aria-label="View zoom"]').textContent), "125%");
    const zoomHit = await rect(`${overlay("Front")} [data-artwork-resize-touch-target]`, false);
    assert.ok(Math.abs(zoomHit.w - 44) < 1, "Viewport zoom does not shrink/grow the finger hit target");
    for (let n = 0; n < 4; n++) await tap('button[aria-label="Zoom out"]');
    assert.equal(await evaluate(() => document.querySelector('[aria-label="View zoom"]').textContent), "25%");
    for (const sel of ['button[aria-label="Canvas options"]', 'button[aria-label="Close Front Mockup"]']) {
      const control = await rect(sel, false);
      assert.ok(Math.abs(control.w - 44) < 1 && Math.abs(control.h - 44) < 1, `Control stays finger-sized at 25%: ${sel}`);
    }
    await tap('button[aria-label="Canvas options"]');
    const menuRow = await rect('button[aria-label="Add Back Mockup"]', false);
    assert.ok(Math.abs(menuRow.h - 40) < 1, "Mockup menu row stays compact at 25% zoom");
    await tap('button[aria-label="Canvas options"]');
    const label = await rect('section[aria-label="Front Mockup"] [data-artwork-touch-dimensions]', false);
    assert.ok(label.h >= 23, "Dimensions badge stays screen-readable at 25% zoom");
    await tap('button[aria-label="Reset view"]');
    assert.equal((await snapshot()).view, "translate(0px, 0px) scale(1)");
    await tap('button[aria-label="Pan view"]');

    await selectArtwork("Back");
    const selected = await rect(`${overlay("Back")} rect[aria-label^="Move"]`, false);
    const primary = { x: selected.x + selected.w / 2, y: selected.y + selected.h / 2, id: 1 };
    const secondary = { x: primary.x + 15, y: primary.y - 35, id: 2 };
    const beforeMulti = await snapshot();
    await touch("touchStart", [primary]);
    await touch("touchStart", [primary, secondary]);
    await touch("touchMove", [{ ...primary, x: primary.x + 10 }, { ...secondary, x: secondary.x - 20 }]);
    await touch("touchCancel", []);
    await pause(150);
    const afterMulti = await snapshot();
    assert.equal(afterMulti.overlays[1].cap, beforeMulti.overlays[1].cap, "Second touch cannot claim a tier");
    assert.notEqual(afterMulti.overlays[1].transform, beforeMulti.overlays[1].transform, "Primary touch remains the gesture owner");
    // A subsequent independent drag must still work after cancellation.
    const cancelRect = await rect(`${overlay("Back")} rect[aria-label^="Move"]`, false);
    await drag({ x: cancelRect.x + cancelRect.w / 2, y: cancelRect.y + cancelRect.h / 2 }, { x: cancelRect.x + cancelRect.w / 2 + 8, y: cancelRect.y + cancelRect.h / 2 + 6 });
    assert.notEqual((await snapshot()).overlays[1].transform, afterMulti.overlays[1].transform);
    assert.equal(await chooseBox("Product", "Product Phone"), "Phone");
    const phoneState = await evaluate(() => {
      const toolbar = document.querySelector('[aria-label="Header Bar 2"]');
      const boxes = [...toolbar.querySelectorAll("[data-editor-box]")];
      return {
        boxNames: boxes.map((box) => box.dataset.editorBox),
        boxMetrics: boxes.map((box) => ({
          width: Math.round(box.getBoundingClientRect().width),
          height: Math.round(box.getBoundingClientRect().height),
          radius: Number.parseFloat(getComputedStyle(box).borderTopLeftRadius),
        })),
        visibleFieldLabels: [...toolbar.querySelectorAll("[data-editor-field-label]")].filter((label) => getComputedStyle(label).display !== "none").length,
        priceVisible: getComputedStyle(toolbar.querySelector("[data-editor-price]")).display !== "none",
        colorSelected: toolbar.querySelector('button[aria-label="Color"] [data-color-swatch]')?.getAttribute("data-color-swatch"),
        colorExpanded: toolbar.querySelector('button[aria-label="Color"]')?.getAttribute("aria-expanded"),
        gsmExists: Boolean(toolbar.querySelector('[data-editor-box="GSM"]')),
        sizeExists: Boolean(toolbar.querySelector('[data-editor-box="Size"]')),
        visibleMockups: [...document.querySelectorAll('section[aria-label$="Mockup"]')].filter((section) => getComputedStyle(section).display !== "none").length,
        backHidden: document.querySelector('section[aria-label="Back Mockup"]')?.hidden,
        frontVisible: getComputedStyle(document.querySelector('section[aria-label="Front Mockup"]')).display !== "none",
        addBackInMockupBox: document.querySelectorAll('section[aria-label="Front Mockup"] button[aria-label="Add Back Mockup"]').length,
        pendingDisabled: ["Brand", "Model"].every((label) => toolbar.querySelector(`[data-editor-box="${label}"]`)?.disabled),
      };
    });
    assert.deepEqual(phoneState.boxNames, ["Product", "Brand", "Model", "Color", "Save", "Buy"]);
    assert.ok(phoneState.boxMetrics.every((box) => box.width === phoneState.boxMetrics[0].width && box.height === 44 && box.radius >= 16), "All mobile controls have matching pill geometry and 44px touch height");
    assert.equal(phoneState.visibleFieldLabels, 0, "Phone viewport shows the selector boxes without their text labels");
    assert.equal(phoneState.priceVisible, false, "Phone viewport keeps only boxes, hiding the separate price text");
    assert.equal(phoneState.colorSelected, "black", "The selected Color swatch remains visible for Phone");
    assert.equal(phoneState.colorExpanded, "false", "Color dropdown is closed after selection");
    assert.equal(phoneState.gsmExists, false, "Phone product keeps GSM hidden");
    assert.equal(phoneState.sizeExists, false, "Phone product keeps Size hidden");
    assert.equal(phoneState.visibleMockups, 1, "Phone shows one usable Mockup");
    assert.equal(phoneState.backHidden, true, "Phone hides the Back Mockup");
    assert.equal(phoneState.frontVisible, true);
    assert.equal(phoneState.addBackInMockupBox, 0, "Mockup boxes carry no add control");
    assert.deepEqual(await canvasMenuItems(), ["Show Grid", "Add Front Mockup"], "Phone offers only the Front Mockup entry");
    await closeCanvasMenu();
    assert.ok(phoneState.pendingDisabled, "Brand and Model remain placeholders");
    assert.equal(await chooseBox("Product", "Product T-Shirt"), "T-Shirt");
    await tap('button[aria-label="Size"]');
    const sizeOptions = await evaluate(() => [...document.querySelectorAll('[role="listbox"][aria-label="Size options"] [role="option"]')].map((option) => option.getAttribute("aria-label")));
    await tap('button[aria-label="Size"]');
    const apparelState = await evaluate(() => ({
      gsm: document.querySelector('[data-editor-box="GSM"]')?.textContent.trim(),
      size: document.querySelector('[data-editor-box="Size"]')?.textContent.trim(),
      color: Boolean(document.querySelector('[data-editor-box="Color"]')),
      selectedColor: document.querySelector('button[aria-label="Color"] [data-color-swatch]')?.getAttribute("data-color-swatch"),
      backVisible: getComputedStyle(document.querySelector('section[aria-label="Back Mockup"]')).display !== "none",
      addBackInMockupBox: document.querySelectorAll('section[aria-label="Front Mockup"] button[aria-label="Add Back Mockup"]').length,
    }));
    assert.equal(apparelState.gsm, width === 390 ? "200 GSM" : "160 GSM", "No GSM choice was cleared while switching products");
    assert.equal(apparelState.size, "XL", "Size defaults to XL without a Choose option");
    assert.ok(sizeOptions.includes("Size 2XL"), "Size offers standard extended sizes");
    assert.equal(apparelState.color, true);
    assert.equal(apparelState.selectedColor, "black", "Selected Color remains while switching product categories");
    assert.equal(apparelState.backVisible, true, "T-Shirt restores its Back Mockup");
    assert.equal(apparelState.addBackInMockupBox, 0, "Mockup boxes carry no add control");
    assert.deepEqual(await canvasMenuItems(), ["Show Grid", "Add Front Mockup", "Add Back Mockup"], "Apparel exposes both mockup sides");
    await closeCanvasMenu();
    console.log(`PASS phone ${width}×${height}: Product/GSM options, no Choose, Phone mockup limit, Layers toggle and touch editor regressions`);
  }
  async function canvasMenuItems() {
    await evaluate(() => {
      const dot = document.querySelector('button[aria-label="Canvas options"]');
      if (dot.getAttribute('aria-expanded') === 'false') dot.click();
    });
    await pause(160);
    return evaluate(() => [...document.querySelectorAll('[role="menu"][aria-label="Canvas options"] button')].map((item) => item.getAttribute('aria-label') || item.textContent.trim()));
  }
  async function closeCanvasMenu() {
    await evaluate(() => {
      const dot = document.querySelector('button[aria-label="Canvas options"]');
      if (dot.getAttribute('aria-expanded') === 'true') dot.click();
    });
    await pause(120);
  }
  /** A reload must bring the design back: the draft carries layers, moves and all. */
  async function draftRestore() {
    await load(1440, 900, false);
    const canvas = await rect('canvas[aria-label="Blank print canvas"]', false);
    await clickMouse('button[aria-label="Brush"]');
    const from = { x: canvas.x + canvas.w * 0.35, y: canvas.y + canvas.h * 0.4 };
    const to = { x: canvas.x + canvas.w * 0.55, y: canvas.y + canvas.h * 0.55 };
    await mouse("mouseMoved", from);
    await mouse("mousePressed", from, 1);
    for (let n = 1; n <= 8; n++) {
      await mouse("mouseMoved", { x: from.x + ((to.x - from.x) * n) / 8, y: from.y + ((to.y - from.y) * n) / 8 }, 1);
      await pause(20);
    }
    await mouse("mouseReleased", to);
    // The draft write is debounced by 400ms, so give it room before reading storage.
    await pause(900);
    const draft = await evaluate(() => JSON.parse(localStorage.getItem("mh-fashion-design-draft-v1") ?? "null"));
    assert.ok(draft && draft.layers.length >= 1, "the drawn layer is written to the draft");
    assert.ok(draft.placement && Object.keys(draft.placement).length >= 1, "the draft carries where the layer sits");
    const strokes = () => evaluate(() => document.querySelectorAll('[data-editor-artwork-stroke="true"]').length);
    const before = await strokes();
    assert.ok(before >= 1, "the stroke is on the canvas before the reload");
    await send("Page.reload");
    for (let n = 0; n < 40; n++) {
      await pause(100);
      if (await evaluate(() => !!document.querySelector('button[aria-label="Canvas options"]'))) break;
    }
    await pause(700);
    assert.equal(await strokes(), before, "the reload paints the same artwork");
    const notice = await evaluate(() => document.querySelector('[role="status"][aria-live="polite"]')?.textContent ?? "");
    assert.match(notice, /Restored the design from your last visit/);
    console.log("PASS draft restore: a reload brings the artwork back and says so");
  }

  async function tinyArtwork() {
    await load(390, 844, true);
    await tap('button[aria-label="Canvas options"]');
    await tap('button[aria-label="Add Front Mockup"]');
    await tap('button[aria-label="Pencil tool"]');
    // A short stroke keeps the artwork frame small, so its touch target is the 44px minimum.
    const tinyStroke = await evaluate(() => {
      const c = document.querySelector('canvas[aria-label="Blank print canvas"]').getBoundingClientRect();
      const v = document.querySelector('[aria-label="Editor viewport"]').getBoundingClientRect();
      const x = Math.max(c.left, v.left) + 60;
      const y = (Math.max(c.top, v.top) + Math.min(c.bottom, v.bottom)) / 2;
      return { from: { x, y }, to: { x: x + 8, y: y + 4 } };
    });
    await drag(tinyStroke.from, tinyStroke.to);
    const tinyHit = await rect(`${overlay("Front")} [data-artwork-move-touch-target]`);
    assert.ok(Math.abs(tinyHit.w - 44) < 1 && Math.abs(tinyHit.h - 44) < 1);
    const before = await snapshot();
    // The start is outside the tiny artwork's original bounds but inside its touch target.
    await drag({ x: tinyHit.x + tinyHit.w / 2 + 15, y: tinyHit.y + tinyHit.h / 2 - 10 }, { x: tinyHit.x + tinyHit.w / 2 + 30, y: tinyHit.y + tinyHit.h / 2 - 4 });
    const after = await snapshot();
    assert.notEqual(after.overlays[0].transform, before.overlays[0].transform);
    assert.equal(after.source, before.source);
    const selectedHit = await rect(`${overlay("Front")} [data-artwork-move-touch-target]`, false);
    await drag({ x: selectedHit.x + selectedHit.w / 2 + 15, y: selectedHit.y + selectedHit.h / 2 - 10 }, { x: selectedHit.x + selectedHit.w / 2 + 23, y: selectedHit.y + selectedHit.h / 2 - 4 });
    const movedTwice = await snapshot();
    assert.notEqual(movedTwice.overlays[0].transform, after.overlays[0].transform);
    assert.equal(movedTwice.overlays[0].edge, after.overlays[0].edge, "Selected tiny-artwork move must not resize it");
    await resizeArtwork("Front", 1.8);
    assert.ok((await snapshot()).overlays[0].edge > after.overlays[0].edge);
    const dimensions = await evaluate(() => getComputedStyle(document.querySelector('[data-artwork-touch-dimensions]')).fontSize);
    assert.equal(dimensions, "12px");
    console.log("PASS phone tiny artwork: repeated selected moves, distinct resize target and readable dimensions");
  }
  /**
   * A photo that Chrome cannot decode (a HEIC straight off a phone, or a renamed file) must say
   * which file failed, and a real image must land on the canvas.
   */
  async function uploadErrors() {
    await load(1440, 900, false);
    await clickMouse('button[aria-label="Expand Edit sidebar"]');
    await pause(300);
    await clickMouse('button[aria-label="Open Upload in Edit sidebar"]');
    await pause(400);
    const feed = (name, base64) => evaluate(async (fileName, data) => {
      const input = document.querySelector('input[aria-label="Upload an image to the canvas"]');
      if (!input) throw new Error("Missing the upload input");
      const bytes = Uint8Array.from(atob(data), (character) => character.charCodeAt(0));
      const transfer = new DataTransfer();
      transfer.items.add(new File([bytes], fileName, { type: "image/png" }));
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, name, base64);
    const notice = () => evaluate(() => {
      const live = [...document.querySelectorAll('[role="status"], [aria-live]')].map((el) => el.textContent.trim()).filter(Boolean);
      return live[live.length - 1] ?? "";
    });
    await feed("holiday.heic", btoa("definitely not an image"));
    await pause(900);
    const broken = await notice();
    assert.match(broken, /holiday\.heic/, `the failed upload names its file, got "${broken}"`);
    assert.match(broken, /not an image/i, `the failed upload explains itself, got "${broken}"`);
    const png = "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGM4ISeHFTEMLQkAkL9BAbKfPiIAAAAASUVORK5CYII=";
    await feed("photo.png", png);
    await pause(1200);
    const good = await notice();
    assert.match(good, /added to the canvas/, `a real image lands on the canvas, got "${good}"`);
    const images = await evaluate(() => document.querySelectorAll('[data-editor-image-layer="true"], svg image').length);
    assert.ok(images > 0, "the uploaded image is painted");
    console.log("PASS upload errors: a file that cannot be decoded names itself, a real PNG lands on the canvas");
  }
  /**
   * A word wider than the wrap limit must break between grapheme clusters: in Myanmar script the
   * vowel signs and the asat attach to the character before them, so a code-point split painted a
   * line that began with a mark hanging off nothing.
   */
  async function burmeseWrapping() {
    await load(1440, 900, false);
    await clickMouse('button[aria-label="Text tool"]');
    const centre = await evaluate(() => {
      const r = document.querySelector('canvas[aria-label="Blank print canvas"]').getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await clickPoint(centre);
    await pause(400);
    const word = "မြန်မာနိုင်ငံ".repeat(10);
    await send("Input.insertText", { text: word });
    await pause(400);
    await evaluate(() => document.activeElement?.blur());
    await pause(600);
    const painted = await evaluate(() => [...document.querySelectorAll("svg text")]
      .map((text) => [...text.querySelectorAll("tspan")].map((span) => span.textContent))
      .filter((lines) => lines.length));
    assert.equal(painted.length, 3, "the canvas, the mockup and the preview all paint the layer");
    for (const lines of painted) {
      assert.ok(lines.length > 1, "a word wider than the wrap limit breaks onto more than one line");
      assert.equal(lines.join(""), word, "no character is lost or doubled by the wrap");
      for (const line of lines) assert.ok(!/^\p{M}/u.test(line), `line "${line}" starts with a combining mark`);
    }
    console.log("PASS Burmese wrapping: a long word breaks between clusters on the canvas, the mockup and the preview");
  }
  /** E2 checklist 7: a busy design, the 30-step undo floor, a second finger and a rotation. */
  async function denseDesign() {
    await load(390, 844, true);
    await tap('button[aria-label="Expand Layers panel"]');
    const started = Date.now();
    for (let n = 0; n < 25; n++) {
      await evaluate(() => document.querySelector('button[aria-label="Add layer"]')?.click());
    }
    await pause(500);
    assert.equal(await evaluate(() => document.querySelectorAll('[data-layer-id]').length), 26, "25 added layers sit beside the blank one");
    assert.ok(Date.now() - started < 15000, "25 layers land without the page stalling");
    await tap('button[aria-label="Delete selected layer"]');
    assert.equal(await evaluate(() => document.querySelectorAll('[data-layer-id]').length), 25, "a delete removes one layer");
    await keyStroke("z", { modifiers: 2 });
    assert.equal(await evaluate(() => document.querySelectorAll('[data-layer-id]').length), 26, "Ctrl+Z brings a deleted layer back");

    await load(390, 844, true);
    await tap('button[aria-label="Pencil tool"]');
    const canvas = await rect('canvas[aria-label="Blank print canvas"]', false);
    const painted = () => evaluate(() => document.querySelectorAll('[data-editor-artwork-stroke="true"]').length);
    for (let n = 0; n < 35; n++) {
      const y = canvas.y + 20 + (n % 10) * 30;
      await drag({ x: canvas.x + 30, y }, { x: canvas.x + 120, y });
    }
    const drawn = await painted();
    assert.ok(drawn > 0, "the 35 strokes are painted");
    for (let n = 0; n < 40; n++) await keyStroke("z", { modifiers: 2 });
    // The stack keeps 30 snapshots, so the five oldest strokes of 35 cannot be undone.
    assert.equal(await painted(), (drawn * 5) / 35, "the undo floor is exactly 30 steps");

    await load(390, 844, true);
    await tap('button[aria-label="Pencil tool"]');
    const box = await rect('canvas[aria-label="Blank print canvas"]', false);
    const y = box.y + box.h / 2;
    await touch("touchStart", [{ x: box.x + 40, y, id: 1 }]);
    for (let n = 1; n <= 4; n++) {
      await touch("touchMove", [{ x: box.x + 40 + n * 20, y, id: 1 }]);
      await pause(15);
    }
    await touch("touchStart", [{ x: box.x + 120, y, id: 1 }, { x: box.x + 230, y: y + 120, id: 2 }]);
    for (let n = 1; n <= 5; n++) {
      await touch("touchMove", [{ x: box.x + 120, y, id: 1 }, { x: box.x + 230 + n * 12, y: y + 120 + n * 18, id: 2 }]);
      await pause(15);
    }
    await touch("touchEnd", []);
    await pause(500);
    const ink = await evaluate(() => [...document.querySelectorAll('[data-editor-artwork-stroke="true"]')]
      .map((element) => element.getBoundingClientRect())
      .filter((rect) => rect.width > 1 && rect.height > 1)
      .map((rect) => Math.round(rect.height)));
    assert.equal(await painted(), 2, "the second finger does not start a second stroke");
    assert.ok(Math.max(...ink) < 40, `the line stays on the first finger (tallest ${Math.max(...ink)} px)`);

    // With no layer at all a stroke must say why it painted nothing.
    await load(390, 844, true);
    await tap('button[aria-label="Expand Layers panel"]');
    await tap('button[aria-label="Delete selected layer"]');
    assert.equal(await evaluate(() => document.querySelectorAll("[data-layer-id]").length), 0, "the last layer can be deleted");
    await tap('button[aria-label="Collapse Layers panel"]');
    await tap('button[aria-label="Pencil tool"]');
    const emptyCanvas = await rect('canvas[aria-label="Blank print canvas"]', false);
    await drag({ x: emptyCanvas.x + 30, y: emptyCanvas.y + 60 }, { x: emptyCanvas.x + 110, y: emptyCanvas.y + 60 });
    assert.equal(await painted(), 0, "no stroke lands without a layer");
    assert.equal(
      await evaluate(() => document.querySelector('[data-testid="editor-tools-bar"] [role="status"]')?.textContent ?? ""),
      "Add a layer before drawing.",
      "a stroke with no layer says what to do",
    );

    await load(390, 844, true);
    await send("Emulation.setDeviceMetricsOverride", { width: 844, height: 390, mobile: true, deviceScaleFactor: 2 });
    await pause(1400);
    const rotated = await evaluate(() => {
      const canvasRect = document.querySelector('canvas[aria-label="Blank print canvas"]').getBoundingClientRect();
      const view = document.querySelector('[aria-label="Editor viewport"]');
      const viewRect = view.getBoundingClientRect();
      return {
        width: Math.round(canvasRect.width),
        // A short landscape viewport scrolls, so "reachable" means the canvas bottom is
        // inside the viewport's own scroll range, not inside its visible height.
        reachable: canvasRect.bottom - viewRect.top <= view.scrollHeight,
        pageOverflowX: document.documentElement.scrollWidth - window.innerWidth,
        viewOverflowX: view.scrollWidth - view.clientWidth,
      };
    });
    assert.equal(rotated.width, 292, "the canvas keeps its width across the rotation");
    assert.ok(rotated.reachable, "the whole canvas can be scrolled into view in landscape");
    assert.ok(rotated.pageOverflowX <= 0 && rotated.viewOverflowX <= 0, "a rotation adds no horizontal scroll");
    console.log("PASS phone 390×844: 25 layers, the 30-step undo floor, one-finger strokes and a rotation");
  }

  try {
    await send("Page.enable");
    await send("Runtime.enable");
    await phone(390, 844);
    await phone(320, 740);
    await tinyArtwork();
    await draftRestore();
    await denseDesign();
    await burmeseWrapping();
    await uploadErrors();
    await load(740, 390, true);
    const landscape = await evaluate(() => {
      const v = document.querySelector('[aria-label="Editor viewport"]').getBoundingClientRect();
      const n = document.querySelector('[aria-label="Mobile navigation"]').getBoundingClientRect();
      return { bottom: v.bottom, navTop: n.top };
    });
    assert.ok(landscape.bottom <= landscape.navTop + 1);
    console.log("PASS phone landscape 740×390: navigation clearance");
    await load(844, 390, true);
    assert.equal(await evaluate(() => getComputedStyle(document.querySelector('[aria-label="Touch view controls"]')).display), "flex");
    const landscapeOptions = await rect('button[aria-label="Canvas options"]');
    assert.equal(landscapeOptions.w, 44);
    await tap('button[aria-label="Canvas options"]');
    await tap('button[aria-label="Add Front Mockup"]');
    assert.equal(await evaluate(() => getComputedStyle(document.querySelector('[aria-label="Editor viewport"]').firstElementChild).flexDirection), "column");
    await tap('button[aria-label="Expand Layers panel"]');
    await tap('button[aria-label="Add layer"]');
    await tap('button[aria-label="Add mask to Layer 2"]');
    const shortLandscapeLayout = await evaluate(() => {
      const panel = document.querySelector('[aria-label="Layers panel"]');
      const list = panel.querySelector('[aria-label="Layer list"]');
      return {
        title: panel.querySelector('[aria-label="Layers panel title"]').getBoundingClientRect().height,
        actions: panel.querySelector('[aria-label="Layer actions"]').getBoundingClientRect().height,
        layerRow: list.querySelector('[role="listitem"]').getBoundingClientRect().height,
        listHeight: list.getBoundingClientRect().height,
      };
    });
    assert.equal(shortLandscapeLayout.title, 32, "Short-landscape title chrome is compact");
    assert.equal(shortLandscapeLayout.actions, 32, "Short-landscape bottom actions are compact");
    assert.ok(shortLandscapeLayout.layerRow >= 44, "Layer rows keep usable touch height in short landscape");
    assert.ok(shortLandscapeLayout.listHeight >= 60, "Short-landscape layer list leaves scrollable mask space");
    await tap('button[aria-label="Collapse Layers panel"]');
    await tap('button[aria-label="Zoom out"]');
    assert.equal(await evaluate(() => document.querySelector('[aria-label="View zoom"]').textContent), "75%");
    console.log("PASS phone landscape 844×390: touch controls and stacking survive the desktop breakpoint");
    await load(1280, 900, false);
    assert.equal(await evaluate(() => getComputedStyle(document.querySelector('[aria-label="Touch view controls"]')).display), "none");
    const desktopHeader = await evaluate(() => {
      const slot = document.querySelector("[data-editor-shared-header]");
      return {
        height: slot.getBoundingClientRect().height,
        headerBottom: slot.getBoundingClientRect().bottom,
        bar2Top: document.querySelector('[aria-label="Header Bar 2"]').getBoundingClientRect().top,
        bar2Bottom: document.querySelector('[aria-label="Header Bar 2"]').getBoundingClientRect().bottom,
        editorTop: document.querySelector('[aria-label="Editor viewport"]').getBoundingClientRect().top,
        mobile: getComputedStyle(slot.firstElementChild).display,
        desktop: getComputedStyle(slot.lastElementChild).display,
      };
    });
    assert.ok(desktopHeader.height > 0 && desktopHeader.mobile === "none" && desktopHeader.desktop !== "none", "Reuse the existing desktop Header Bar");
    assert.ok(desktopHeader.bar2Top >= desktopHeader.headerBottom - 1 && desktopHeader.editorTop >= desktopHeader.bar2Bottom - 1, "Desktop Bar 2 stays below Header and above editor");
    const bar2DesktopBoxes = await evaluate(() => {
      const toolbar = document.querySelector('[aria-label="Header Bar 2"]');
      const boxes = [...toolbar.querySelectorAll("[data-editor-box]")];
      return {
        names: boxes.map((box) => box.dataset.editorBox),
        metrics: boxes.map((box) => ({
          width: Math.round(box.getBoundingClientRect().width),
          height: Math.round(box.getBoundingClientRect().height),
          radius: Number.parseFloat(getComputedStyle(box).borderTopLeftRadius),
        })),
        labelsVisible: [...toolbar.querySelectorAll("[data-editor-field-label]")].every((label) => getComputedStyle(label).display !== "none"),
        priceVisible: getComputedStyle(toolbar.querySelector("[data-editor-price]")).display !== "none",
        priceText: toolbar.querySelector("[data-editor-price]").textContent.trim(),
        priceLeftOfSave: toolbar.querySelector("[data-editor-price]").getBoundingClientRect().right <= toolbar.querySelector('button[aria-label="Save"]').getBoundingClientRect().left,
        boxColors: boxes.map((box) => getComputedStyle(box).backgroundColor),
        accent: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim().split(/\s+/).join(", "),
        chevrons: ["Product", "GSM", "Color", "Size"].map((name) => {
          const box = toolbar.querySelector(`[data-editor-box="${name}"]`);
          const svg = box.querySelector("svg");
          const boxRect = box.getBoundingClientRect();
          const svgRect = svg.getBoundingClientRect();
          return {
            fromRight: Math.round(boxRect.right - svgRect.right),
            centerY: Math.round(svgRect.top + svgRect.height / 2 - boxRect.top),
            boxHeight: Math.round(boxRect.height),
          };
        }),
        swatch: (() => {
          const swatch = toolbar.querySelector('button[aria-label="Color"] [data-color-swatch]');
          const swatchRect = swatch.getBoundingClientRect();
          return {
            width: Math.round(swatchRect.width),
            height: Math.round(swatchRect.height),
            radius: Number.parseFloat(getComputedStyle(swatch).borderTopLeftRadius),
            background: getComputedStyle(swatch).backgroundColor,
          };
        })(),
      };
    });
    assert.deepEqual(bar2DesktopBoxes.names, ["Product", "Print Method", "Fabric Type", "Knit Structure", "MH Cuttings", "GSM", "Color", "Size", "Save", "Buy"]);
    assert.ok(bar2DesktopBoxes.metrics.every((box) => box.width === bar2DesktopBoxes.metrics[0].width && box.height === 28 && box.radius >= 14), "Every desktop Bar 2 box shares the same compact pill geometry");
    assert.ok(bar2DesktopBoxes.chevrons.every((chevron) => chevron.fromRight >= 4 && chevron.fromRight <= 9), "Every box pins its chevron near the same distance from the right edge");
    assert.equal(new Set(bar2DesktopBoxes.chevrons.map((chevron) => chevron.fromRight)).size, 1, "Every box pins its chevron the same distance from the right edge");
    assert.ok(bar2DesktopBoxes.chevrons.every((chevron) => Math.abs(chevron.centerY - chevron.boxHeight / 2) <= 1), "Every chevron is vertically centred in its box");
    assert.equal(bar2DesktopBoxes.swatch.width, 40, "The Color trigger shows a wide colour box, not a small dot");
    assert.equal(bar2DesktopBoxes.swatch.height, 18);
    assert.ok(bar2DesktopBoxes.swatch.radius >= 4 && bar2DesktopBoxes.swatch.radius < 18, "The Color swatch is a rounded square, not a circle");
    assert.equal(bar2DesktopBoxes.swatch.background, "rgb(255, 255, 255)", "The trigger swatch paints the real selected colour (White by default)");
    assert.equal(bar2DesktopBoxes.labelsVisible, true, "Desktop shows Product/GSM/Color/Size labels");
    assert.equal(bar2DesktopBoxes.priceVisible, true, "Desktop shows the Save-adjacent price field");
    assert.equal(bar2DesktopBoxes.priceLeftOfSave, true, "Desktop Price appears immediately to the left of Save");
    assert.equal(bar2DesktopBoxes.priceText, "Price 28,000 Ks", "Price shows the selected T-Shirt + 160 GSM + XL combination");
    const colorBoxIndex = bar2DesktopBoxes.names.indexOf("Color");
    assert.ok(bar2DesktopBoxes.boxColors.filter((_, index) => index !== colorBoxIndex).every((color) => color === `rgb(${bar2DesktopBoxes.accent})`), "Every non-color desktop control box uses the green app accent fill");
    assert.equal(bar2DesktopBoxes.boxColors[colorBoxIndex], "rgba(0, 0, 0, 0)", "The Color box is a green outline with no green fill");
    // Selecting a different option updates the price immediately.
    await clickMouse('[data-editor-box="GSM"]');
    await clickMouse('[role="listbox"][aria-label="GSM options"] [role="option"][aria-label="GSM 240 GSM"]');
    assert.equal(await evaluate(() => document.querySelector("[data-editor-price]").textContent.trim()), "Price 31,500 Ks", "Choosing a higher GSM updates the price at once");
    await clickMouse('[data-editor-box="Size"]');
    const desktopSizeMenu = await evaluate(() => {
      const menu = document.querySelector('[role="listbox"][aria-label="Size options"]');
      const rect = menu.getBoundingClientRect();
      return {
        exists: Boolean(menu),
        radius: Number.parseFloat(getComputedStyle(menu).borderTopLeftRadius),
        height: Math.round(rect.height),
        options: [...menu.querySelectorAll('[role="option"]')].map((option) => option.getAttribute("aria-label")),
      };
    });
    assert.equal(desktopSizeMenu.exists, true, "Desktop opens the same rounded Size dropdown");
    assert.ok(desktopSizeMenu.radius >= 12 && desktopSizeMenu.radius < desktopSizeMenu.height / 2, "Desktop Size dropdown is a rounded rectangle, not a capsule");
    assert.deepEqual(desktopSizeMenu.options, ["Size XS", "Size S", "Size M", "Size L", "Size XL", "Size 2XL", "Size 3XL"]);
    await clickMouse('[role="listbox"][aria-label="Size options"] [role="option"][aria-label="Size 3XL"]');
    assert.equal(await evaluate(() => document.querySelector("[data-editor-price]").textContent.trim()), "Price 33,500 Ks", "Choosing a larger Size updates the price at once");
    await clickMouse('button[aria-label="Expand Layers panel"]');
    await clickMouse('button[aria-label="Expand Edit sidebar"]');
    await clickMouse('button[aria-label="Open Designs in Edit sidebar"]');
    const desktopDocks = await evaluate(() => {
      const edit = document.querySelector("#editor-edit-sidebar").getBoundingClientRect();
      const layers = document.querySelector('aside[aria-label="Layers panel"]').getBoundingClientRect();
      return { editRight: edit.right, layersLeft: layers.left, editWidth: edit.width };
    });
    assert.ok(desktopDocks.editWidth <= 272 && desktopDocks.editRight < desktopDocks.layersLeft, "Desktop Edit and Layers panels dock opposite sides without overlap");
    await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, mobile: true, deviceScaleFactor: 1 });
    await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
    await pause(180);
    const resizedDocks = await evaluate(() => ({
      width: innerWidth,
      editOpen: Boolean(document.querySelector("#editor-edit-sidebar")),
      layersOpen: Boolean(document.querySelector('aside[aria-label="Layers panel"]')),
    }));
    assert.equal(resizedDocks.width, 390);
    assert.equal(resizedDocks.editOpen, false, "Narrowing the viewport closes the Edit sidebar");
    assert.equal(resizedDocks.layersOpen, false, "Narrowing the viewport also closes the Layers panel");
    await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, mobile: false, deviceScaleFactor: 1 });
    await send("Emulation.setTouchEmulationEnabled", { enabled: false, maxTouchPoints: 5 });
    await pause(180);
    await clickMouse('button[aria-label="Expand Layers panel"]');
    console.log("PASS resize: desktop-open sidebars close before they can overlap at phone width");
    const themeBefore = await evaluate(() => {
      const slot = document.querySelector("[data-editor-shared-header]");
      const themeButton = [...slot.querySelectorAll("button")].find((button) => {
        const rect = button.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && button.querySelector("svg.lucide-moon, svg.lucide-sun");
      });
      const rect = themeButton.getBoundingClientRect();
      return {
        dark: document.documentElement.classList.contains("dark"),
        shell: getComputedStyle(document.querySelector("main")).backgroundColor,
        bar: getComputedStyle(document.querySelector('[aria-label="Header Bar 2"]')).backgroundColor,
        productBox: getComputedStyle(document.querySelector('[data-editor-box="Product"]')).backgroundColor,
        colorBoxBorder: getComputedStyle(document.querySelector('[data-editor-box="Color"]')).borderTopColor,
        layersPanel: getComputedStyle(document.querySelector('aside[aria-label="Layers panel"]')).backgroundColor,
        layersToggle: getComputedStyle(document.querySelector('button[aria-label="Collapse Layers panel"]')).backgroundColor,
        accent: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim().split(/\s+/).join(", "),
        layersWidth: document.querySelector('aside[aria-label="Layers panel"]').getBoundingClientRect().width,
        layerNameSize: getComputedStyle(document.querySelector('button[aria-label="Select Layer 1 artwork"]')).fontSize,
        toggleWidth: document.querySelector('button[aria-label="Collapse Layers panel"]').getBoundingClientRect().width,
        toggleRadius: getComputedStyle(document.querySelector('button[aria-label="Collapse Layers panel"]')).borderRadius,
        button: { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 },
      };
    });
    assert.ok(themeBefore.layersWidth <= 257, "Desktop panel is visibly narrower than its previous oversized 17rem width");
    assert.equal(themeBefore.layerNameSize, "11px", "layer rows use compact type");
    assert.equal(themeBefore.toggleWidth, 28, "Desktop Layers toggle stays small");
    assert.ok(Number.parseFloat(themeBefore.toggleRadius) >= 14, "Desktop Layers toggle remains circular");
    assert.equal(themeBefore.layersToggle, `rgb(${themeBefore.accent})`, "Desktop toggle uses the app accent color");
    await clickPoint(themeBefore.button);
    await pause(180);
    const themeAfter = await evaluate(() => ({
      dark: document.documentElement.classList.contains("dark"),
      shell: getComputedStyle(document.querySelector("main")).backgroundColor,
      bar: getComputedStyle(document.querySelector('[aria-label="Header Bar 2"]')).backgroundColor,
      productBox: getComputedStyle(document.querySelector('[data-editor-box="Product"]')).backgroundColor,
      colorBoxBorder: getComputedStyle(document.querySelector('[data-editor-box="Color"]')).borderTopColor,
      layersPanel: getComputedStyle(document.querySelector('aside[aria-label="Layers panel"]')).backgroundColor,
      layersToggle: getComputedStyle(document.querySelector('button[aria-label="Collapse Layers panel"]')).backgroundColor,
      accent: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim().split(/\s+/).join(", "),
    }));
    assert.notEqual(themeAfter.dark, themeBefore.dark, "Header Dark/Light toggles the root theme");
    assert.notEqual(themeAfter.shell, themeBefore.shell, "Editor workspace responds to Header theme toggle");
    assert.notEqual(themeAfter.bar, themeBefore.bar, "Header Bar 2 responds to Header theme toggle");
    assert.notEqual(themeAfter.productBox, themeBefore.productBox, "Product box responds to Header theme toggle");
    assert.notEqual(themeAfter.colorBoxBorder, themeBefore.colorBoxBorder, "Color box outline responds to Header theme toggle");
    assert.equal(themeBefore.colorBoxBorder, `rgb(${themeBefore.accent})`, "Color box outline uses the active app theme token");
    assert.equal(themeAfter.colorBoxBorder, `rgb(${themeAfter.accent})`, "Color box outline follows the toggled app theme token");
    assert.notEqual(themeAfter.layersPanel, themeBefore.layersPanel, "Layers dock responds to Header theme toggle");
    assert.notEqual(themeAfter.layersToggle, themeBefore.layersToggle, "Round Layers toggle follows the app accent theme color");
    assert.equal(themeAfter.layersToggle, `rgb(${themeAfter.accent})`, "Toggled button color matches the active theme accent token");
    await clickPoint(themeBefore.button);
    await pause(180);
    assert.equal(await evaluate(() => document.documentElement.classList.contains("dark")), themeBefore.dark, "Header theme toggle restores the original mode");
    console.log("PASS Header Dark/Light toggle: editor shell, compact bar, Product dropdown, and Layers dock respond in both modes");
    assert.equal(await evaluate(() => document.querySelector('aside[aria-label="Layers panel"] [role="heading"]')?.textContent), "Layers");
    assert.equal(await evaluate(() => document.querySelector('aside[aria-label="Layers panel"]')?.dataset.dockSide), "right");
    await clickMouse('button[aria-label="Collapse Layers panel"]');
    assert.equal(await evaluate(() => document.querySelector('aside[aria-label="Layers panel"]')), null);
    console.log("PASS desktop: right-side Layers arrow opens and collapses the Layers panel");
    const desktopButton = await rect('button[aria-label="Canvas options"]');
    assert.equal(desktopButton.w, 14); assert.equal(desktopButton.h, 14);
    console.log("PASS desktop 1280×900: original control size and no mobile toolbar");
    await clickMouse('button[aria-label="Canvas options"]');
    await clickMouse('button[aria-label="Add Front Mockup"]');
    await clickMouse('button[aria-label="Canvas options"]');
    await clickMouse('button[aria-label="Add Back Mockup"]');
    await clickMouse('button[aria-label="Pencil tool"]');
    const desktopCanvas = await rect('canvas[aria-label="Blank print canvas"]');
    const begin = { x: desktopCanvas.x + 28, y: desktopCanvas.y + 28 };
    const finish = { x: desktopCanvas.x + desktopCanvas.w - 28, y: desktopCanvas.y + desktopCanvas.h - 28 };
    await mouse("mousePressed", begin, 1); await mouse("mouseMoved", finish, 1); await mouse("mouseReleased", finish);
    await pause(150);
    await clickMouse(`${overlay("Back")} rect[aria-label^="Move"]`);
    const handle = await rect(`${overlay("Back")} circle[role="button"]`, false);
    const frame = await rect(`${overlay("Back")} rect[aria-label^="Move"]`, false);
    const h = { x: handle.x + handle.w / 2, y: handle.y + handle.h / 2 };
    const c = { x: frame.x + frame.w / 2, y: frame.y + frame.h / 2 };
    const end = { x: c.x + (h.x - c.x) * 2.6, y: c.y + (h.y - c.y) * 2.6 };
    await mouse("mousePressed", h, 1);
    for (let n = 1; n <= 8; n++) {
      await mouse("mouseMoved", { x: h.x + (end.x - h.x) * n / 8, y: h.y + (end.y - h.y) * n / 8 }, 1);
      await pause(20);
    }
    await mouse("mouseReleased", end); await pause(120);
    const desktopResult = await snapshot();
    assert.equal(desktopResult.overlays[0].cap, 1500);
    assert.equal(desktopResult.overlays[1].cap, 3500);
    assert.ok(desktopResult.overlays[1].edge > 1500);
    console.log("PASS desktop mouse: source drawing and Back large-tier resize remain operational");

    // Keyboard undo/redo runs the tool-bar actions, with the tools collapsed and Layers open.
    await clickMouse('button[aria-label="Collapse editor tools"]');
    await clickMouse('button[aria-label="Expand Layers panel"]');
    const strokeCount = () => evaluate(() => document.querySelectorAll('section[aria-label="Print canvas"] [data-editor-artwork-stroke="true"]').length);
    const beforeUndo = await strokeCount();
    assert.ok(beforeUndo > 0, "the desktop stroke is on the canvas");
    await keyStroke("z", { modifiers: 2 });
    assert.equal(await strokeCount(), 0, "Ctrl+Z undoes the stroke with the tools collapsed and the Layers box open");
    await keyStroke("z", { modifiers: 10 });
    assert.equal(await strokeCount(), beforeUndo, "Ctrl+Shift+Z redoes it");
    // A focused text field keeps the browser's own undo, so the layer history must not move.
    await evaluate(() => document.querySelector('[aria-label="Layer list"] [role="listitem"] [aria-label^="Select "]').dispatchEvent(new MouseEvent("dblclick", { bubbles: true })));
    await pause(200);
    assert.equal(await evaluate(() => document.activeElement?.getAttribute("aria-label")?.startsWith("Rename ") ?? false), true, "the rename field takes the focus");
    await keyStroke("z", { modifiers: 2 });
    assert.equal(await strokeCount(), beforeUndo, "Ctrl+Z inside a text field leaves the layers alone");
    await evaluate(() => document.activeElement?.blur());
    await pause(120);
    await clickMouse('button[aria-label="Expand editor tools"]');
    console.log("PASS desktop keyboard: Ctrl+Z and Ctrl+Shift+Z undo and redo, text fields keep their own undo");

    // E7 — hover highlight, both directions. Hovering artwork outlines it and marks its Layers row;
    // hovering a row outlines that layer's artwork. Neither changes the selection, and touch has no
    // hover at all.
    await clickMouse('button[aria-label="Move"]');
    await clickMouse('button[aria-label="Add layer"]');
    await pause(150);
    const hoverTarget = await evaluate(() => {
      const stroke = document.querySelector('section[aria-label="Print canvas"] [data-editor-artwork-stroke="true"]');
      const box = stroke.getBoundingClientRect();
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    });
    await mouse("mouseMoved", hoverTarget, 0);
    await pause(200);
    const rows = () => evaluate(() => ({
      outline: !!document.querySelector('[data-editor-hover-outline="true"]'),
      hovered: [...document.querySelectorAll('[data-layer-id][data-layer-hovered="true"]')].map((row) => row.dataset.layerId),
      selected: [...document.querySelectorAll('[data-layer-id]')]
        .filter((row) => row.querySelector('button[aria-label$="artwork"][aria-pressed="true"]'))
        .map((row) => row.dataset.layerId),
    }));
    const canvasHover = await rows();
    assert.equal(canvasHover.outline, true, "hovering artwork draws the hover outline");
    assert.equal(canvasHover.hovered.length, 1, "and marks exactly one Layers row");
    assert.equal(canvasHover.selected.length, 1, "while one layer stays selected");
    assert.notEqual(canvasHover.hovered[0], canvasHover.selected[0], "the hovered row is the artwork's own layer, not the selection");
    await mouse("mouseMoved", { x: 5, y: 5 }, 0);
    await pause(200);
    assert.deepEqual(await rows(), { outline: false, hovered: [], selected: canvasHover.selected }, "leaving the canvas clears the hover and keeps the selection");

    const rowPoint = await evaluate(() => {
      const row = [...document.querySelectorAll('[data-layer-id]')]
        .find((item) => !item.querySelector('button[aria-label$="artwork"][aria-pressed="true"]'));
      const box = row.getBoundingClientRect();
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    });
    await mouse("mouseMoved", rowPoint, 0);
    await pause(200);
    const rowHover = await rows();
    assert.equal(rowHover.outline, true, "hovering a Layers row outlines its artwork on the canvas");
    assert.deepEqual(rowHover.hovered, [canvasHover.hovered[0]], "the row hover and the canvas hover name the same layer");
    assert.deepEqual(rowHover.selected, canvasHover.selected, "and still does not change the selection");
    await mouse("mouseMoved", { x: 5, y: 5 }, 0);
    await pause(200);
    assert.equal(await evaluate(() => !!document.querySelector('[data-editor-hover-outline="true"]')), false, "leaving the row clears the outline");

    await load(390, 844, true);
    await tap('canvas[aria-label="Blank print canvas"]');
    await pause(250);
    assert.equal(await evaluate(() => !!document.querySelector('[data-editor-hover-outline="true"]')), false, "a touch has no hover outline");
    console.log("PASS hover highlight: canvas to row, row to canvas, no selection change, touch unaffected");

    const uniqueProblems = [...new Set(pageProblems)];
    assert.deepEqual(uniqueProblems, [], `the page logged no error during the run:\n${uniqueProblems.join("\n")}`);
    console.log("PASS console: no uncaught exception and no console error across every section");
  } finally {
    ws.close();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
