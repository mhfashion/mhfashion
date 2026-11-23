const assert = require("node:assert/strict");
const test = require("node:test");
const { loadModule } = require("./helpers/load-ts-module.cjs");

const csv = loadModule("apps/web/src/lib/admin-csv.ts");

test("plain cells are written as they are, one line per row", () => {
  assert.equal(csv.toCsv([["Order", "Customer"], ["#MH1101", "Nyein"]]), "Order,Customer\r\n#MH1101,Nyein");
});

test("a comma, a quote or a line break puts the cell in quotes", () => {
  assert.equal(csv.toCsv([["a,b"]]), '"a,b"');
  assert.equal(csv.toCsv([['say "hi"']]), '"say ""hi"""');
  assert.equal(csv.toCsv([["two\nlines"]]), '"two\nlines"');
  assert.equal(csv.toCsv([["carriage\rreturn"]]), '"carriage\rreturn"');
});

test("an empty cell stays empty and numbers are not quoted", () => {
  assert.equal(csv.toCsv([[null, undefined, 0, -12, 3.5]]), ",,0,-12,3.5");
});

test("customer text that looks like a formula is made inert", () => {
  assert.equal(csv.toCsv([["=HYPERLINK(\"http://evil\",\"Invoice\")"]]), `"'=HYPERLINK(""http://evil"",""Invoice"")"`);
  assert.equal(csv.toCsv([["=1+1"]]), `"'=1+1"`);
  assert.equal(csv.toCsv([["@SUM(A1)"]]), `"'@SUM(A1)"`);
  assert.equal(csv.toCsv([["=cmd|'/c calc'!A1"]]), `"'=cmd|'/c calc'!A1"`);
  assert.equal(csv.toCsv([["\tTabbed"]]), `"'\tTabbed"`);
  assert.equal(csv.toCsv([["\rReturn"]]), `"'\rReturn"`);
});

test("a minus sign that starts a real number is left alone", () => {
  assert.equal(csv.toCsv([["-5"]]), "-5");
  assert.equal(csv.toCsv([["-12.75"]]), "-12.75");
  assert.equal(csv.toCsv([[-5]]), "-5");
});

test("a phone number keeps its plus sign", () => {
  assert.equal(csv.toCsv([["+95 9 123 456"]]), "+95 9 123 456");
  assert.equal(csv.toCsv([["+959123456789"]]), "+959123456789");
  assert.equal(csv.toCsv([["+1 (555) 010-9999"]]), "+1 (555) 010-9999");
});

test("a plus sign that is not a phone number is inert", () => {
  assert.equal(csv.toCsv([["+cmd|'/c calc'!A1"]]), `"'+cmd|'/c calc'!A1"`);
});

test("an apostrophe in ordinary text is quoted, not escaped twice", () => {
  assert.equal(csv.toCsv([["Nyein's shop"]]), `"Nyein's shop"`);
});

test("downloadCsv writes a BOM-prefixed UTF-8 file and clicks a link", async () => {
  const clicked = [];
  const removed = [];
  const appended = [];
  const originalDocument = globalThis.document;
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  let captured = null;
  URL.createObjectURL = (blob) => {
    captured = blob;
    return "blob:mh-fashion-test";
  };
  URL.revokeObjectURL = () => {};
  globalThis.document = {
    createElement() {
      return {
        href: "",
        download: "",
        click() {
          clicked.push(this.download);
        },
        remove() {
          removed.push(this.download);
        },
      };
    },
    body: {
      append(node) {
        appended.push(node);
      },
    },
  };
  try {
    const link = csv.downloadCsv("mh-fashion-orders.csv", [["Order"], ["#MH1101"]]);
    assert.equal(link, undefined);
    assert.deepEqual(clicked, ["mh-fashion-orders.csv"]);
    assert.deepEqual(removed, ["mh-fashion-orders.csv"]);
    assert.equal(appended.length, 1);
    assert.equal(appended[0].href, "blob:mh-fashion-test");
    assert.ok(captured instanceof Blob);
    const blob = captured;
    // Blob.text() strips the BOM while decoding, so the bytes are the only honest check.
    const bytes = new Uint8Array(await blob.arrayBuffer());
    assert.deepEqual([...bytes.slice(0, 3)], [0xef, 0xbb, 0xbf], "Excel needs the BOM to read Myanmar text");
    assert.equal(await blob.text(), "Order\r\n#MH1101");
    assert.equal(blob.type, "text/csv;charset=utf-8");
  } finally {
    globalThis.document = originalDocument;
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  }
});
