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
      }, 10000);
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
  async function load(width, height, mobile) {
    await send("Emulation.setDeviceMetricsOverride", { width, height, mobile, deviceScaleFactor: 1 });
    await send("Emulation.setTouchEmulationEnabled", { enabled: mobile, maxTouchPoints: 5 });
    await send("Page.navigate", { url: `${origin}/create` });
    for (let n = 0; n < 40; n++) {
      await pause(100);
      if (await evaluate(() => !!document.querySelector('button[aria-label="Canvas options"]'))) break;
    }
    await pause(500);
  }
  async function rect(selector, scroll = true) {
    if (scroll) {
      await evaluate((sel) => {
        const element = document.querySelector(sel);
        if (!element) throw new Error(`Missing ${sel}`);
        const viewport = document.querySelector('[aria-label="Editor viewport"]');
        const panel = document.querySelector('[aria-label="Layers panel"]');
        if (panel?.contains(element)) {
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
  async function snapshot() {
    return evaluate(() => {
      const v = document.querySelector('[aria-label="Editor viewport"]');
      const w = v.firstElementChild;
      return {
        scrollTop: v.scrollTop,
        view: w.style.transform,
        source: document.querySelector('section[aria-label="Print canvas"] svg path[data-editor-artwork-stroke="true"]')?.getAttribute("d") || "",
        nodes: Object.fromEntries([...document.querySelectorAll("section[aria-label]")].map((s) => [s.getAttribute("aria-label"), s.style.transform])),
        overlays: [...document.querySelectorAll('svg[role="group"]')].map((s) => ({
          label: s.getAttribute("aria-label"),
          cap: Number(s.getAttribute("data-artwork-max-edge-px")),
          transform: s.querySelector("g").getAttribute("transform"),
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
  async function chooseSelect(selector, value) {
    await evaluate((sel, nextValue) => {
      const element = document.querySelector(sel);
      if (!(element instanceof HTMLSelectElement)) throw new Error(`Missing select ${sel}`);
      const setValue = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
      setValue.call(element, nextValue);
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }, selector, value);
    await pause(120);
    return evaluate((sel) => document.querySelector(sel).value, selector);
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
        bar2Disabled: [...toolbar.querySelectorAll("button")].every((button) => button.disabled),
        selectOptions: [...toolbar.querySelectorAll("select")].map((select) => [...select.options].map((option) => option.textContent)),
        selectedProduct: toolbar.querySelector('select[aria-label="Product"]').value,
        selectedGsm: toolbar.querySelector('select[aria-label="GSM"]').value,
        productBoxWidth: toolbar.querySelector('select[aria-label="Product"]').getBoundingClientRect().width,
        productCanChange: !toolbar.querySelector('select[aria-label="Product"]').disabled,
        futureProductsDisabled: [...toolbar.querySelector('select[aria-label="Product"]').options].filter((option) => option.disabled).map((option) => option.value),
        mobileHeader: getComputedStyle(slot.firstElementChild).display,
        desktopHeader: getComputedStyle(slot.lastElementChild).display,
      };
    });
    assert.ok(initial.headerHeight > 0 && initial.mobileHeader !== "none" && initial.desktopHeader === "none", "Reuse the existing mobile Header Bar");
    assert.ok(initial.bar2Top >= initial.headerBottom - 1 && initial.editorTop >= initial.bar2Bottom - 1, "Bar 2 sits between Header Bar and Editor");
    assert.deepEqual(initial.bar2Labels, ["Product", "GSM", "Color", "Size", "Save", "Buy"]);
    assert.ok(initial.bar2Height <= 44, "Header Bar 2 is compact");
    assert.deepEqual(initial.selectOptions, [
      ["T-Shirt", "Phone", "Hoodie", "Cup", "Kids", "Bag"],
      ["160 GSM", "180 GSM", "200 GSM", "240 GSM"],
    ]);
    assert.ok(initial.selectOptions.flat().every((option) => option !== "Choose"), "Product and GSM selectors have no Choose option");
    assert.equal(initial.selectedProduct, "T-Shirt");
    assert.equal(initial.selectedGsm, "160 GSM", "The first GSM is selected by default");
    assert.ok(initial.productBoxWidth <= 92, "Product selector stays compact");
    assert.equal(initial.productCanChange, true, "T-Shirt and Phone are selectable");
    assert.deepEqual(initial.futureProductsDisabled, ["Hoodie", "Cup", "Kids", "Bag"]);
    assert.ok(initial.bar2Disabled, "Color, Size, Save and Buy remain placeholders");
    if (width === 390) assert.equal(await chooseSelect('select[aria-label="GSM"]', "200 GSM"), "200 GSM");
    assert.ok(initial.mainBottom <= initial.navTop + 1, "Editor stays above mobile navigation");
    assert.ok(initial.bodyHeight <= initial.viewportHeight + 1, "Editor and nav do not create document overflow");

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
        title: panel.querySelector("h2")?.textContent,
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
    assert.ok(Math.abs(openLayers.arrowRight - openLayers.panelLeft) < 1, "The collapse arrow remains reachable at the open panel edge");
    assert.equal(openLayers.expanded, "true");
    if (width === 390) {
      await tap('button[aria-label="Add layer"]');
      assert.equal(await evaluate(() => document.querySelectorAll('[aria-label="Layer list"] [role="listitem"]').length), 2);
      await tap('button[aria-label="Add mask to Layer 2"]');
      assert.equal(await evaluate(() => !!document.querySelector('[aria-label="Stop editing Layer 2 mask"]')), true, "Adding a mask selects it for editing");
      assert.equal(await evaluate(() => document.querySelector('[aria-label="Layer mask painting controls"]')?.textContent.includes("Painting on layer mask")), true);
      await tap('button[aria-label="Reveal artwork with mask"]');
      assert.equal(await evaluate(() => document.querySelector('[aria-label="Reveal artwork with mask"]')?.getAttribute("aria-pressed")), "true");
      await tap('button[aria-label="Hide artwork with mask"]');
      await tap('button[aria-label="Select Layer 2"]');
      await tap('button[aria-label="Collapse Layers panel"]');

      let layerCanvas = await rect('canvas[aria-label="Blank print canvas"]');
      await drag({ x: layerCanvas.x + layerCanvas.w * 0.2, y: layerCanvas.y + layerCanvas.h * 0.35 }, { x: layerCanvas.x + layerCanvas.w * 0.8, y: layerCanvas.y + layerCanvas.h * 0.45 });
      assert.ok(await evaluate(() => !!document.querySelector('section[aria-label="Print canvas"] svg path[data-editor-artwork-stroke="true"]')), "Artwork draws onto the selected layer");

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
      await tap('button[aria-label="Duplicate Layer 2"]');
      assert.equal(await evaluate(() => document.querySelectorAll('[aria-label="Layer list"] [role="listitem"]').length), 3);
      await tap('button[aria-label="Delete Layer 2 copy"]');
      assert.equal(await evaluate(() => document.querySelectorAll('[aria-label="Layer list"] [role="listitem"]').length), 2);
      await tap('button[aria-label="Delete Layer 1"]');
      assert.equal(await evaluate(() => document.querySelectorAll('[aria-label="Layer list"] [role="listitem"]').length), 1);
      assert.equal(await evaluate(() => !!document.querySelector('[aria-label="Select Layer 2"]')), true, "Deleting another layer preserves the selected artwork");
    }
    await tap('button[aria-label="Collapse Layers panel"]');
    assert.equal(await evaluate(() => document.querySelector('aside[aria-label="Layers panel"]')), null, "Arrow collapses the panel again");

    const options = await rect('button[aria-label="Canvas options"]');
    assert.equal(options.w, 44); assert.equal(options.h, 44);
    await tap('button[aria-label="Canvas options"]');
    await tap('button[aria-label="Add Mockup"]');
    const addBack = await rect('button[aria-label="Add Back Mockup"]');
    assert.equal(addBack.w, 44); assert.equal(addBack.h, 44);
    await tap('button[aria-label="Add Back Mockup"]');
    const surface = await rect('section[aria-label="Front Mockup"] > div:last-child');
    const beforeSwipe = await snapshot();
    await drag({ x: surface.x + surface.w / 2, y: surface.y + surface.h * 0.65 }, { x: surface.x + surface.w / 2, y: surface.y + 20 });
    const afterSwipe = await snapshot();
    assert.ok(afterSwipe.scrollTop > beforeSwipe.scrollTop + 30, "Blank mockup swipe scrolls");
    assert.deepEqual(afterSwipe.nodes, beforeSwipe.nodes, "Blank swipe does not move mockup");

    const canvas = await rect('canvas[aria-label="Blank print canvas"]');
    await drag({ x: canvas.x + canvas.w * 0.13, y: canvas.y + canvas.h * 0.13 }, { x: canvas.x + canvas.w * 0.87, y: canvas.y + canvas.h * 0.87 });
    const drawn = await snapshot();
    assert.equal(drawn.overlays.length, 2);
    assert.equal(drawn.overlays[0].cap, 3500); assert.equal(drawn.overlays[1].cap, 1500);
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
    for (const sel of ['button[aria-label="Canvas options"]', 'button[aria-label="Add Back Mockup"]', 'button[aria-label="Close Front Mockup"]']) {
      const control = await rect(sel, false);
      assert.ok(Math.abs(control.w - 44) < 1 && Math.abs(control.h - 44) < 1, `Control stays finger-sized at 25%: ${sel}`);
    }
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
    assert.equal(await chooseSelect('select[aria-label="Product"]', "Phone"), "Phone");
    const phoneState = await evaluate(() => {
      const toolbar = document.querySelector('[aria-label="Header Bar 2"]');
      const controls = [...toolbar.querySelectorAll("select, button")];
      return {
        labels: controls.map((control) => control.getAttribute("aria-label") || control.textContent.trim()),
        visibleMockups: [...document.querySelectorAll('section[aria-label$="Mockup"]')].filter((section) => getComputedStyle(section).display !== "none").length,
        backHidden: document.querySelector('section[aria-label="Back Mockup"]')?.hidden,
        frontVisible: getComputedStyle(document.querySelector('section[aria-label="Front Mockup"]')).display !== "none",
        addBack: document.querySelectorAll('button[aria-label="Add Back Mockup"]').length,
        pendingDisabled: ["Brand", "Model"].every((label) => toolbar.querySelector(`select[aria-label="${label}"]`)?.disabled),
      };
    });
    assert.deepEqual(phoneState.labels, ["Product", "Brand", "Model", "Color", "Save", "Buy"]);
    assert.equal(phoneState.visibleMockups, 1, "Phone shows one usable Mockup");
    assert.equal(phoneState.backHidden, true, "Phone hides the Back Mockup");
    assert.equal(phoneState.frontVisible, true);
    assert.equal(phoneState.addBack, 0, "Phone has no Back add control");
    assert.ok(phoneState.pendingDisabled, "Brand and Model remain placeholders");
    assert.equal(await chooseSelect('select[aria-label="Product"]', "T-Shirt"), "T-Shirt");
    const apparelState = await evaluate(() => ({
      gsm: document.querySelector('select[aria-label="GSM"]')?.value,
      size: [...document.querySelectorAll('[aria-label="Header Bar 2"] button')].some((button) => button.textContent.trim() === "Size"),
      backVisible: getComputedStyle(document.querySelector('section[aria-label="Back Mockup"]')).display !== "none",
      addBack: document.querySelectorAll('button[aria-label="Add Back Mockup"]').length,
    }));
    assert.equal(apparelState.gsm, width === 390 ? "200 GSM" : "160 GSM", "No GSM choice was cleared while switching products");
    assert.equal(apparelState.size, true);
    assert.equal(apparelState.backVisible, true, "T-Shirt restores its Back Mockup");
    assert.equal(apparelState.addBack, 1, "T-Shirt permits adding Back Mockup");
    console.log(`PASS phone ${width}×${height}: Product/GSM options, no Choose, Phone mockup limit, Layers toggle and touch editor regressions`);
  }
  async function tinyArtwork() {
    await load(390, 844, true);
    await tap('button[aria-label="Canvas options"]');
    await tap('button[aria-label="Add Mockup"]');
    await tap('canvas[aria-label="Blank print canvas"]');
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
  try {
    await send("Page.enable");
    await phone(390, 844);
    await phone(320, 740);
    await tinyArtwork();
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
    await tap('button[aria-label="Add Mockup"]');
    assert.equal(await evaluate(() => getComputedStyle(document.querySelector('[aria-label="Editor viewport"]').firstElementChild).flexDirection), "column");
    await tap('button[aria-label="Expand Layers panel"]');
    await tap('button[aria-label="Add layer"]');
    await tap('button[aria-label="Add mask to Layer 2"]');
    const compactPanel = await evaluate(() => {
      const panel = document.querySelector('[aria-label="Layers panel"]');
      return { scrollHeight: panel.scrollHeight, clientHeight: panel.clientHeight };
    });
    if (compactPanel.scrollHeight > compactPanel.clientHeight) {
      await evaluate(() => {
        const panel = document.querySelector('[aria-label="Layers panel"]');
        panel.scrollTop = panel.scrollHeight;
      });
    }
    const reachableMaskControls = await evaluate(() => {
      const panel = document.querySelector('[aria-label="Layers panel"]');
      const controls = document.querySelector('[aria-label="Layer mask painting controls"]').getBoundingClientRect();
      const bounds = panel.getBoundingClientRect();
      return { top: controls.top >= bounds.top - 1, bottom: controls.bottom <= bounds.bottom + 1 };
    });
    assert.equal(reachableMaskControls.top && reachableMaskControls.bottom, true, "Layer-mask properties remain scroll-reachable in a short landscape viewport");
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
    await clickMouse('button[aria-label="Expand Layers panel"]');
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
        productBox: getComputedStyle(document.querySelector('select[aria-label="Product"]')).backgroundColor,
        layersPanel: getComputedStyle(document.querySelector('aside[aria-label="Layers panel"]')).backgroundColor,
        button: { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 },
      };
    });
    await clickPoint(themeBefore.button);
    await pause(180);
    const themeAfter = await evaluate(() => ({
      dark: document.documentElement.classList.contains("dark"),
      shell: getComputedStyle(document.querySelector("main")).backgroundColor,
      bar: getComputedStyle(document.querySelector('[aria-label="Header Bar 2"]')).backgroundColor,
      productBox: getComputedStyle(document.querySelector('select[aria-label="Product"]')).backgroundColor,
      layersPanel: getComputedStyle(document.querySelector('aside[aria-label="Layers panel"]')).backgroundColor,
    }));
    assert.notEqual(themeAfter.dark, themeBefore.dark, "Header Dark/Light toggles the root theme");
    assert.notEqual(themeAfter.shell, themeBefore.shell, "Editor workspace responds to Header theme toggle");
    assert.notEqual(themeAfter.bar, themeBefore.bar, "Header Bar 2 responds to Header theme toggle");
    assert.notEqual(themeAfter.productBox, themeBefore.productBox, "Product box responds to Header theme toggle");
    assert.notEqual(themeAfter.layersPanel, themeBefore.layersPanel, "Photoshop-style Layers dock responds to Header theme toggle");
    await clickPoint(themeBefore.button);
    await pause(180);
    assert.equal(await evaluate(() => document.documentElement.classList.contains("dark")), themeBefore.dark, "Header theme toggle restores the original mode");
    console.log("PASS Header Dark/Light toggle: editor shell, compact bar, Product dropdown, and Layers dock respond in both modes");
    assert.equal(await evaluate(() => document.querySelector('aside[aria-label="Layers panel"] h2')?.textContent), "Layers");
    assert.equal(await evaluate(() => document.querySelector('aside[aria-label="Layers panel"]')?.dataset.dockSide), "right");
    await clickMouse('button[aria-label="Collapse Layers panel"]');
    assert.equal(await evaluate(() => document.querySelector('aside[aria-label="Layers panel"]')), null);
    console.log("PASS desktop: right-side Layers arrow opens and collapses the Photoshop-inspired panel");
    const desktopButton = await rect('button[aria-label="Canvas options"]');
    assert.equal(desktopButton.w, 14); assert.equal(desktopButton.h, 14);
    console.log("PASS desktop 1280×900: original control size and no mobile toolbar");
    await clickMouse('button[aria-label="Canvas options"]');
    await clickMouse('button[aria-label="Add Mockup"]');
    await clickMouse('button[aria-label="Add Back Mockup"]');
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
  } finally {
    ws.close();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
