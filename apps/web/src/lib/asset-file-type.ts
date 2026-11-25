// Plan §12.2.5: a file is accepted by its first bytes, not by its name, and an SVG is cleaned before it
// is stored (scripts, event attributes and external references removed). This module is pure, so the
// Worker, the admin form and `npm run assets:check` all decide the same way without a bucket.

export type AssetFileType =
  | "webp"
  | "png"
  | "jpg"
  | "svg"
  | "woff2"
  | "ttf"
  | "otf"
  | "glb"
  | "json"
  | "pdf"
  | "csv"
  | "html";

const ascii = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.subarray(start, start + length));

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((value, index) => bytes[offset + index] === value);
}

/** The type the bytes really are, or `null` when nothing the shop accepts starts that way. */
export function sniffAssetType(bytes: Uint8Array): AssetFileType | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpg";
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && ascii(bytes, 8, 4) === "WEBP") return "webp";
  if (startsWith(bytes, [0x77, 0x4f, 0x46, 0x32])) return "woff2";
  if (startsWith(bytes, [0x4f, 0x54, 0x54, 0x4f])) return "otf";
  if (startsWith(bytes, [0x00, 0x01, 0x00, 0x00]) || ascii(bytes, 0, 4) === "true") return "ttf";
  if (ascii(bytes, 0, 4) === "glTF") return "glb";
  if (ascii(bytes, 0, 5) === "%PDF-") return "pdf";

  const text = new TextDecoder().decode(bytes.subarray(0, 512)).replace(/^\uFEFF/, "").trimStart().toLowerCase();
  if (!text) return null;
  if (text.startsWith("<svg") || (text.startsWith("<?xml") && text.includes("<svg"))) return "svg";
  if (text.startsWith("<!doctype html") || text.startsWith("<html")) return "html";
  if (text.startsWith("{") || text.startsWith("[")) return "json";
  // A CSV is plain text with a comma in its first line and nothing that looks like markup.
  const firstLine = text.split("\n")[0] ?? "";
  if (!firstLine.startsWith("<") && firstLine.includes(",")) return "csv";
  return null;
}

export type ImageSize = { width: number; height: number };

/** The pixel size of a PNG, JPEG or WebP, read from its header. `null` for anything else. */
export function imageSize(bytes: Uint8Array, type: AssetFileType): ImageSize | null {
  if (type === "png" && startsWith(bytes, [0x89, 0x50, 0x4e, 0x47]) && ascii(bytes, 12, 4) === "IHDR") {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (type === "webp") {
    const chunk = ascii(bytes, 12, 4);
    if (chunk === "VP8X" && bytes.length >= 30) {
      const width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
      const height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
      return { width, height };
    }
    if (chunk === "VP8 " && bytes.length >= 30) {
      const width = ((bytes[27] << 8) | bytes[26]) & 0x3fff;
      const height = ((bytes[29] << 8) | bytes[28]) & 0x3fff;
      return { width, height };
    }
    if (chunk === "VP8L" && bytes.length >= 25) {
      const bits = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
      return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
    }
    return null;
  }
  if (type === "jpg") {
    let index = 2;
    while (index < bytes.length - 8) {
      if (bytes[index] !== 0xff) {
        index += 1;
        continue;
      }
      const marker = bytes[index + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        index += 2;
        continue;
      }
      const length = (bytes[index + 2] << 8) | bytes[index + 3];
      const isStartOfFrame =
        marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isStartOfFrame) {
        const height = (bytes[index + 5] << 8) | bytes[index + 6];
        const width = (bytes[index + 7] << 8) | bytes[index + 8];
        return { width, height };
      }
      index += 2 + length;
    }
  }
  return null;
}

export type CleanedSvg = { svg: string; removed: string[] };

/**
 * Remove what must never be served from the public bucket: scripts, event-handler attributes and
 * references to another host. A cleaned file keeps its artwork, so the shop sees the change as a note.
 */
export function cleanSvg(svg: string): CleanedSvg {
  const removed: string[] = [];
  let cleaned = svg;

  const scripts = cleaned.match(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi) ?? [];
  const emptyScripts = cleaned.match(/<script\b[^>]*\/>/gi) ?? [];
  if (scripts.length || emptyScripts.length) {
    removed.push(`${scripts.length + emptyScripts.length} script`);
    cleaned = cleaned.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "").replace(/<script\b[^>]*\/>/gi, "");
  }

  const handlers = cleaned.match(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi) ?? [];
  if (handlers.length) {
    removed.push(`${handlers.length} event attribute`);
    cleaned = cleaned.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  }

  const foreign = cleaned.match(/\shref\s*=\s*("(?:(?:https?:)?\/\/[^"]*)"|'(?:(?:https?:)?\/\/[^']*)')/gi) ?? [];
  if (foreign.length) {
    removed.push(`${foreign.length} external reference`);
    cleaned = cleaned.replace(/\s(?:xlink:)?href\s*=\s*("(?:(?:https?:)?\/\/[^"]*)"|'(?:(?:https?:)?\/\/[^']*)')/gi, "");
  }

  return { svg: cleaned, removed };
}
