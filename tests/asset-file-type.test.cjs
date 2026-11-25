const assert = require("node:assert/strict");
const test = require("node:test");
const { loadModule } = require("./helpers/load-ts-module.cjs");

const fileType = loadModule("apps/web/src/lib/asset-file-type.ts");
const keys = loadModule("apps/web/src/lib/asset-keys.ts");

const bytes = (...values) => new Uint8Array(values);
const ascii = (text) => new Uint8Array(Buffer.from(text, "utf8"));

function png(width, height) {
  const header = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(header, 0);
  header.writeUInt32BE(13, 8);
  header.write("IHDR", 12, "ascii");
  header.writeUInt32BE(width, 16);
  header.writeUInt32BE(height, 20);
  return new Uint8Array(header);
}

function webpVp8x(width, height) {
  const body = Buffer.alloc(18);
  body.write("VP8X", 0, "ascii");
  body.writeUInt32LE(10, 4);
  body.writeUIntLE(width - 1, 12, 3);
  body.writeUIntLE(height - 1, 15, 3);
  const file = Buffer.concat([Buffer.from("RIFF", "ascii"), Buffer.alloc(4), Buffer.from("WEBP", "ascii"), body]);
  file.writeUInt32LE(file.length - 8, 4);
  return new Uint8Array(file);
}

function jpeg(width, height) {
  const app0 = Buffer.from([0xff, 0xe0, 0x00, 0x10, ...Buffer.from("JFIF\0\x01\x01\x00\x00\x01\x00\x01\x00\x00", "latin1")]);
  const sof = Buffer.alloc(19);
  sof.writeUInt16BE(0xffc0, 0);
  sof.writeUInt16BE(17, 2);
  sof.writeUInt8(8, 4);
  sof.writeUInt16BE(height, 5);
  sof.writeUInt16BE(width, 7);
  return new Uint8Array(Buffer.concat([Buffer.from([0xff, 0xd8]), app0, sof, Buffer.from([0xff, 0xd9])]));
}

test("a file is recognised by its first bytes, whatever it is called", () => {
  assert.equal(fileType.sniffAssetType(png(4, 4)), "png");
  assert.equal(fileType.sniffAssetType(webpVp8x(4, 4)), "webp");
  assert.equal(fileType.sniffAssetType(jpeg(4, 4)), "jpg");
  assert.equal(fileType.sniffAssetType(ascii("wOF2rest")), "woff2");
  assert.equal(fileType.sniffAssetType(bytes(0x00, 0x01, 0x00, 0x00, 9)), "ttf");
  assert.equal(fileType.sniffAssetType(ascii("OTTOrest")), "otf");
  assert.equal(fileType.sniffAssetType(ascii("glTFrest")), "glb");
  assert.equal(fileType.sniffAssetType(ascii("%PDF-1.7\n")), "pdf");
  assert.equal(fileType.sniffAssetType(ascii('  <svg xmlns="http://www.w3.org/2000/svg"/>')), "svg");
  assert.equal(fileType.sniffAssetType(ascii('<?xml version="1.0"?><svg/>')), "svg");
  assert.equal(fileType.sniffAssetType(ascii('{"a":1}')), "json");
  assert.equal(fileType.sniffAssetType(ascii("name,qty\nTee,1\n")), "csv");
  assert.equal(fileType.sniffAssetType(ascii("<!DOCTYPE html><html></html>")), "html");
  assert.equal(fileType.sniffAssetType(ascii("just some words")), null);
  assert.equal(fileType.sniffAssetType(new Uint8Array()), null);
});

test("the pixel size comes out of the header, so a large image is caught before upload", () => {
  assert.deepEqual(fileType.imageSize(png(1000, 1200), "png"), { width: 1000, height: 1200 });
  assert.deepEqual(fileType.imageSize(webpVp8x(800, 1000), "webp"), { width: 800, height: 1000 });
  assert.deepEqual(fileType.imageSize(jpeg(640, 480), "jpg"), { width: 640, height: 480 });
  assert.equal(fileType.imageSize(ascii("<svg/>"), "svg"), null);
});

test("an SVG loses its scripts, event attributes and external references, and keeps its artwork", () => {
  const cleaned = fileType.cleanSvg(
    '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>x()</script><g id="wave"><path d="M0 0"/></g><image href="https://evil.example/x.png"/></svg>',
  );
  assert.deepEqual(cleaned.removed, ["1 script", "1 event attribute", "1 external reference"]);
  assert.ok(!cleaned.svg.includes("<script"));
  assert.ok(!cleaned.svg.includes("onload"));
  assert.ok(!cleaned.svg.includes("evil.example"));
  assert.ok(cleaned.svg.includes('<g id="wave">'), "the artwork survives");
  assert.ok(cleaned.svg.includes('xmlns="http://www.w3.org/2000/svg"'), "the namespace is not an external reference");

  const plain = fileType.cleanSvg('<svg><path d="M0 0"/></svg>');
  assert.deepEqual(plain.removed, []);
});

test("the content check compares the bytes with the name and the pixel limit", () => {
  assert.deepEqual(keys.checkAssetContent("mockups/product/tee/front.webp", webpVp8x(800, 1000)), {
    ok: true,
    shape: "mockup",
    type: "webp",
    notes: [],
  });
  assert.deepEqual(keys.checkAssetContent("brushes/ink/tip.png", png(1024, 1024)), {
    ok: false,
    reason: "1024x1024 is larger than 512x512",
  });
  assert.deepEqual(keys.checkAssetContent("textures/grain/texture.png", png(2048, 2048)), {
    ok: true,
    shape: "texture",
    type: "png",
    notes: [],
  });
  assert.deepEqual(keys.checkAssetContent("designs/street-wave/design.svg", png(10, 10)), {
    ok: false,
    reason: "the name says .svg but the bytes are png",
  });
  assert.deepEqual(keys.checkAssetContent("mockups/product/tee/front.webp", ascii("<svg/>")), {
    ok: false,
    reason: "the name says .webp but the bytes are svg",
  });
  assert.deepEqual(keys.checkAssetContent("designs/street-wave/design.svg", ascii("not a file")), {
    ok: false,
    reason: "the bytes are not a file type the shop accepts",
  });
});

test("an SVG that needs cleaning still passes, with the cleaning named", () => {
  const result = keys.checkAssetContent(
    "elements/arrow/element.svg",
    ascii('<svg><script>x()</script><path d="M0 0"/></svg>'),
  );
  assert.equal(result.ok, true);
  assert.equal(result.type, "svg");
  assert.deepEqual(result.notes, ["1 script"]);
  assert.ok(!result.cleaned.includes("<script"));
});
