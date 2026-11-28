// A customer who saved an address in their account must not retype it at checkout, and the prefilled
// form must stay editable.
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
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
  const localRequire = (id) => {
    if (id.startsWith("@/")) {
      for (const extension of [".ts", ".tsx"]) {
        const candidate = path.join(__dirname, "..", `apps/web/src/${id.slice(2)}${extension}`);
        try {
          readFileSync(candidate);
          return loadModule(`apps/web/src/${id.slice(2)}${extension}`);
        } catch {
          // try the next extension
        }
      }
      throw new Error(`Cannot resolve ${id}`);
    }
    return require(id);
  };
  new Function("module", "exports", "require", compiled)(loaded, loaded.exports, localRequire);
  return loaded.exports;
}

function fakeStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    clear: () => map.clear(),
    key: (index) => [...map.keys()][index] ?? null,
    get length() {
      return map.size;
    },
  };
}

global.window = { localStorage: fakeStorage() };

const profile = loadModule("apps/web/src/lib/account-profile.ts");

const ADDRESS = {
  name: "Min Thu Aung",
  phone: "+95 9 400 686 925",
  address: "No.24, 7th Street, Hlaing",
  township: "Hlaing",
  city: "Yangon",
};

const read = (relativePath) => readFileSync(path.join(__dirname, "..", relativePath), "utf8");

test("a saved account address is what checkout fills in", () => {
  assert.equal(profile.accountDeliveryAddress(), null, "nothing saved yet");
  profile.saveAccountProfile({ email: "minthu.aung@example.com", delivery: ADDRESS });
  const saved = profile.readAccountProfile();
  assert.equal(saved.email, "minthu.aung@example.com");
  assert.deepEqual(saved.delivery, ADDRESS);
  assert.deepEqual(profile.accountDeliveryAddress(), ADDRESS, "a complete address prefills the form");
});

test("a half-saved address is kept but never prefilled", () => {
  window.localStorage.clear();
  profile.saveAccountProfile({ email: "", delivery: { ...ADDRESS, township: "  " } });
  assert.equal(profile.readAccountProfile().delivery.name, ADDRESS.name, "the customer's work is kept");
  assert.equal(profile.accountDeliveryAddress(), null, "an incomplete address must not look filled");
});

test("stored junk is ignored instead of prefilling a broken form", () => {
  window.localStorage.clear();
  window.localStorage.setItem("mh-fashion-account-profile-v1", "not json");
  assert.equal(profile.readAccountProfile(), null);
  window.localStorage.setItem("mh-fashion-account-profile-v1", JSON.stringify({ email: 42 }));
  assert.equal(profile.readAccountProfile(), null, "an email is required to call it an account");
  window.localStorage.setItem("mh-fashion-account-profile-v1", JSON.stringify({ email: "a@b.c", delivery: { name: 7 } }));
  assert.deepEqual(profile.readAccountProfile().delivery, { name: "", phone: "", address: "", township: "", city: "" });
  assert.equal(profile.accountDeliveryAddress(), null);
});

test("an address edited at checkout updates the account, and a guest gets no account", () => {
  window.localStorage.clear();
  profile.saveAccountDelivery({ ...ADDRESS, address: "No.9, New Street" });
  assert.equal(profile.readAccountProfile(), null, "a guest is not given an account behind their back");

  profile.saveAccountProfile({ email: "minthu.aung@example.com", delivery: ADDRESS });
  profile.saveAccountDelivery({ ...ADDRESS, address: "No.9, New Street" });
  assert.equal(profile.accountDeliveryAddress().address, "No.9, New Street", "the edit sticks for the next order");

  profile.saveAccountDelivery({ ...ADDRESS, city: "" });
  assert.equal(profile.accountDeliveryAddress().city, "Yangon", "an incomplete edit never overwrites a good address");
});

test("checkout reads the account address first and keeps the form editable", () => {
  const checkout = read("apps/web/src/components/CheckoutClient.tsx");
  const hydrate = checkout.slice(checkout.indexOf("const fromAccount = accountDeliveryAddress()"));
  assert.ok(hydrate.length, "checkout hydrates the address from the account");
  assert.match(checkout, /const fromAccount = accountDeliveryAddress\(\);/);
  assert.match(checkout, /const known = fromAccount \?\? fromDevice \?\? lastOrderAddress\(data\.orders\)/, "account, then device, then the last order");
  assert.match(checkout, /setAddressSource\(fromAccount \? "account" : fromDevice \? "device" : "order"\)/);
  assert.match(checkout, /saveAccountDelivery\(address\)/, "an address edited at checkout follows the account");
  assert.match(checkout, /setSavedAddress\(known\);\s*\n\s*setAddress\(known\);/, "the address fills the editable form, not a locked summary");
  assert.match(checkout, /data-checkout-address-change/, "the summary keeps its Change button");
  assert.match(checkout, /t\("checkout\.addressFromAccount"\)/);
});

test("the account page saves the address it shows", () => {
  const page = read("apps/web/src/app/account/page.tsx");
  assert.match(page, /readAccountProfile\(\) \?\? EMPTY_ACCOUNT_PROFILE/, "the form starts from the saved record");
  assert.match(page, /saveAccountProfile\(profile\)/, "saving writes the record");
  for (const key of ["name", "phone", "township", "city", "address"]) {
    assert.match(page, new RegExp(`change\\("${key}", event\\.target\\.value\\)`), `${key} is editable`);
  }
  assert.match(page, /data-account-profile-saved/, "the customer is told it was saved");
  assert.doesNotMatch(page, /defaultValue="Min Thu Aung"/, "the demo placeholder name is gone");
});

test("the profile is reachable and the card shows the saved name", () => {
  const page = read("apps/web/src/app/account/page.tsx");
  assert.match(page, /\{ id: "profile", labelKey: "account\.profile", fallback: "Profile"/, "the sidebar links to the profile");
  assert.match(page, /label: copy\.editProfile, to: "profile"/, "Edit Profile opens the profile, not the settings list");
  assert.match(page, /const displayName = savedName \|\| "Min Thu Aung"/, "the saved name wins over the demo one");
  assert.match(page, /data-account-name/, "the hero card carries the name");
});
