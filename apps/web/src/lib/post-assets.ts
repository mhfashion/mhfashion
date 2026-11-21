"use client";

// T-shirt post artwork belongs in Cloudflare R2. The R2 route is not provisioned yet, so this
// helper returns an inline data URL that the browser-local demo store can hold. When the bucket
// exists, swap the body of storePostSvg for the upload and keep the same return shape so the
// form, the store and the tests do not change.

export const MAX_POST_SVG_BYTES = 2 * 1024 * 1024;

export type StoredPostSvg = {
  url: string;
  fileName: string;
  sizeBytes: number;
};

export function isSvgFile(file: { name: string; type: string }) {
  return file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
}

export function postSvgDataUrl(source: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(source)}`;
}

export async function storePostSvg(file: File): Promise<StoredPostSvg> {
  if (!isSvgFile(file)) throw new Error("Choose an .svg file.");
  if (file.size > MAX_POST_SVG_BYTES) throw new Error("SVG must stay under 2 MB.");
  const source = await file.text();
  if (!source.trim()) throw new Error("That SVG file is empty.");
  return { url: postSvgDataUrl(source), fileName: file.name, sizeBytes: file.size };
}
