const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const loadedModules = new Map();

function loadModule(relativePath) {
  const sourcePath = path.join(__dirname, "..", relativePath);
  const cached = loadedModules.get(sourcePath);
  if (cached) return cached.exports;
  const compiled = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: sourcePath,
  }).outputText;
  const loaded = { exports: {} };
  loadedModules.set(sourcePath, loaded);
  const localRequire = (id) => (id.startsWith("@/") ? loadModule(`apps/web/src/${id.slice(2)}.ts`) : require(id));
  new Function("module", "exports", "require", compiled)(loaded, loaded.exports, localRequire);
  return loaded.exports;
}

const info = loadModule("apps/web/src/lib/storefront-info.ts");
const appRoot = path.join(__dirname, "..", "apps/web/src/app");
const read = (relativePath) => readFileSync(path.join(__dirname, "..", relativePath), "utf8");

function pageText(page) {
  return [page.title, page.lead, ...page.sections.flatMap((section) => [section.heading, ...(section.body ?? []), ...(section.bullets ?? [])])].join("\n");
}

test("every information page has a route and content", () => {
  assert.deepEqual(info.INFO_PAGE_SLUGS.sort(), ["about", "cookie-policy", "faq", "privacy", "returns", "shipping", "size-guide", "terms"]);
  for (const slug of info.INFO_PAGE_SLUGS) {
    const page = info.INFO_PAGES[slug];
    assert.ok(existsSync(path.join(appRoot, slug, "page.tsx")), `missing route for /${slug}`);
    assert.ok(page.title.length > 2, `${slug} has no title`);
    assert.ok(page.sections.length >= 3, `${slug} is too thin`);
    assert.ok(pageText(page).length > 400, `${slug} needs real content`);
  }
});

test("the legal pages say they are drafts", () => {
  for (const slug of ["terms", "privacy", "cookie-policy"]) {
    assert.match(info.INFO_PAGES[slug].draft ?? "", /legal review/, `${slug} must carry the draft banner`);
  }
  assert.equal(info.INFO_PAGES.about.draft, undefined, "the shop story is not a legal draft");
});

test("the copy keeps the facts the plan fixed", () => {
  const everything = info.INFO_PAGE_SLUGS.map((slug) => pageText(info.INFO_PAGES[slug])).join("\n");
  for (const method of ["KBZPay", "Wave Pay", "AYA Pay", "Visa"]) {
    assert.ok(everything.includes(method), `payment method ${method} is not mentioned`);
  }
  assert.match(everything, /Cash on delivery is not offered/);
  assert.match(everything, /MH Delivery/);
  assert.match(everything, /DHL/);
  assert.match(everything, /refund is offered for our production errors/);
  assert.match(everything, /An order that is already paid is produced and delivered/);
  assert.match(everything, /You keep the rights to the designs you upload/);
  assert.match(everything, /the quote is added to the receipt when it arrives|The delivery fee is the courier's quote/);
});

test("the contact page is the claim channel and composes a real email", () => {
  const page = read("apps/web/src/app/contact/page.tsx");
  assert.match(page, /data-contact-claim/);
  assert.match(page, /accepted the claim|accept the claim/);
  assert.match(page, /already paid is still produced and delivered/);
  assert.match(page, /CONTACT_EMAIL/);

  const form = read("apps/web/src/components/ContactForm.tsx");
  for (const marker of ["data-contact-form", "data-contact-send", "data-contact-record", "data-contact-subject", 'aria-label="Topic"', 'aria-label="Message"', "Copyright claim", "mailto:", "navigator.clipboard", "submitContactMessage"]) {
    assert.ok(form.includes(marker), `ContactForm is missing ${marker}`);
  }
  // A message is recorded in the shop inbox with a reference, and the mail app is still an option.
  assert.match(form, /is with the shop/, "the form must say where the message went");
  assert.match(form, /reference/i, "the customer needs something to quote back");

  const terms = pageText(info.INFO_PAGES.terms);
  assert.match(terms, /Claims are received through the contact page/);
  const guide = read("apps/web/src/app/guide/page.tsx");
  assert.match(guide, /href="\/contact" data-guide-contact/);
});

test("no footer link is a dead end", () => {
  const footer = read("apps/web/src/components/Footer.tsx");
  const hrefs = [...footer.matchAll(/href="(\/[^"]*)"/g)].map((match) => match[1]);
  assert.ok(hrefs.length >= 10, "the footer should still link the shop, help and legal groups");
  for (const href of new Set(hrefs)) {
    const target = href.replace(/^\//, "").split("/")[0];
    assert.ok(existsSync(path.join(appRoot, target, "page.tsx")) || existsSync(path.join(appRoot, target, "route.ts")), `${href} has no route`);
  }
});

test("the previously missing pages exist and best sellers resolves to one list", () => {
  for (const slug of ["about", "best-sellers", "contact", "cookie-policy", "faq", "privacy", "products", "returns", "shipping", "size-guide", "terms"]) {
    assert.ok(existsSync(path.join(appRoot, slug, "page.tsx")), `/${slug} is still missing`);
  }
  const bestSellers = read("apps/web/src/app/best-sellers/page.tsx");
  assert.match(bestSellers, /redirect\("\/popular"\)/, "the ranked list lives at /popular");
  const products = read("apps/web/src/app/products/page.tsx");
  assert.match(products, /getAllProducts/);
  assert.match(read("apps/web/src/lib/products.ts"), /export async function getAllProducts/);
});

test("the route manifest lists the storefront pages", () => {
  const manifest = JSON.parse(read("apps/web/public/manus-routes.json"));
  const paths = manifest.routes.map((route) => route.path);
  for (const expected of ["/about", "/best-sellers", "/contact", "/cookie-policy", "/faq", "/privacy", "/products", "/returns", "/shipping", "/size-guide", "/terms", "/checkout", "/admin/jersey", "/admin/loyalty", "/admin/settlements", "/admin/attributes"]) {
    assert.ok(paths.includes(expected), `the manifest is missing ${expected}`);
  }
  assert.deepEqual(paths, [...paths].sort(), "the manifest is sorted by path");
});

test("the contact address comes from the environment with a documented fallback", () => {
  const source = read("apps/web/src/lib/storefront-info.ts");
  assert.match(source, /NEXT_PUBLIC_CONTACT_EMAIL/);
  assert.match(info.CONTACT_EMAIL, /^[^@\s]+@[^@\s]+\.[^@\s]+$/, "a usable address is always rendered");
});
