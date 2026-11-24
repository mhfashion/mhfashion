// Text in both themes has to stay readable: WCAG AA asks for a 4.5:1 contrast ratio for normal-size
// text. The tokens are read straight out of globals.css so the palette cannot drift away from this.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const css = fs.readFileSync(path.join(__dirname, "..", "apps", "web", "src", "app", "globals.css"), "utf8");

function tokens(selector) {
  const block = css.match(new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`));
  assert.ok(block, `${selector} block exists in globals.css`);
  const found = {};
  for (const line of block[1].split(";")) {
    const match = line.match(/--([\w-]+):\s*(\d+)\s+(\d+)\s+(\d+)/);
    if (match) found[match[1]] = [Number(match[2]), Number(match[3]), Number(match[4])];
  }
  return found;
}

const channel = (value) => {
  const scaled = value / 255;
  return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
function contrast(foreground, background) {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const AA_TEXT = 4.5;

for (const [theme, selector] of [["light", ":root"], ["dark", ".dark"]]) {
  const palette = tokens(selector);
  for (const surface of ["bg", "bg-surface"]) {
    for (const text of ["text-primary", "text-secondary", "text-muted", "text-faint", "accent"]) {
      test(`${theme}: --${text} on --${surface} reaches AA`, () => {
        const ratio = contrast(palette[text], palette[surface]);
        assert.ok(ratio >= AA_TEXT, `${theme} --${text} on --${surface} is ${ratio.toFixed(2)}:1, below ${AA_TEXT}`);
      });
    }
  }
  test(`${theme}: --accent-foreground on --accent reaches AA`, () => {
    const ratio = contrast(palette["accent-foreground"], palette.accent);
    assert.ok(ratio >= AA_TEXT, `${theme} text on the accent is ${ratio.toFixed(2)}:1, below ${AA_TEXT}`);
  });
}

test("the two themes disagree on at least one token, so the dark block is not a copy", () => {
  const light = tokens(":root");
  const dark = tokens(".dark");
  assert.notDeepEqual(light.bg, dark.bg);
  assert.notDeepEqual(light.accent, dark.accent);
});
