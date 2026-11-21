export type ZipEntry = {
  /** Path inside the archive, using forward slashes. */
  name: string;
  data: string | Uint8Array;
};

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[index] = value >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function encode(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

/**
 * Minimal ZIP writer (stored, no compression). A print order holds a handful of small SVG and
 * text files, so a dependency-free archive beats pulling in a library for the admin bundle.
 */
export function createZip(entries: ZipEntry[]): Uint8Array {
  const files = entries.map((entry) => ({
    name: encode(entry.name),
    data: typeof entry.data === "string" ? encode(entry.data) : entry.data,
  }));

  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  // Fixed DOS timestamp (2026-01-01 00:00) keeps archives reproducible.
  const dosTime = 0;
  const dosDate = ((2026 - 1980) << 9) | (1 << 5) | 1;

  for (const file of files) {
    const checksum = crc32(file.data);
    const local = new Uint8Array(30 + file.name.length);
    const view = new DataView(local.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0x0800, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, dosTime, true);
    view.setUint16(12, dosDate, true);
    view.setUint32(14, checksum, true);
    view.setUint32(18, file.data.length, true);
    view.setUint32(22, file.data.length, true);
    view.setUint16(26, file.name.length, true);
    view.setUint16(28, 0, true);
    local.set(file.name, 30);
    chunks.push(local, file.data);

    const header = new Uint8Array(46 + file.name.length);
    const headerView = new DataView(header.buffer);
    headerView.setUint32(0, 0x02014b50, true);
    headerView.setUint16(4, 20, true);
    headerView.setUint16(6, 20, true);
    headerView.setUint16(8, 0x0800, true);
    headerView.setUint16(10, 0, true);
    headerView.setUint16(12, dosTime, true);
    headerView.setUint16(14, dosDate, true);
    headerView.setUint32(16, checksum, true);
    headerView.setUint32(20, file.data.length, true);
    headerView.setUint32(24, file.data.length, true);
    headerView.setUint16(28, file.name.length, true);
    headerView.setUint16(30, 0, true);
    headerView.setUint16(32, 0, true);
    headerView.setUint16(34, 0, true);
    headerView.setUint16(36, 0, true);
    headerView.setUint32(38, 0, true);
    headerView.setUint32(42, offset, true);
    header.set(file.name, 46);
    central.push(header);

    offset += local.length + file.data.length;
  }

  const centralSize = central.reduce((total, chunk) => total + chunk.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  endView.setUint16(20, 0, true);

  const parts = [...chunks, ...central, end];
  const total = parts.reduce((sum, chunk) => sum + chunk.length, 0);
  const zip = new Uint8Array(total);
  let cursor = 0;
  for (const chunk of parts) {
    zip.set(chunk, cursor);
    cursor += chunk.length;
  }
  return zip;
}
