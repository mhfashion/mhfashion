// Upload size policy for the Editor Sidebar.
//
// The owner requirement is that a user photo is reduced to the registered KB/MB limit
// before it reaches the canvas. The limit lives here so it can be changed in one place
// (or moved to admin settings later) without touching the component code.
export const UPLOAD_MAX_BYTES = 2 * 1024 * 1024; // 2 MB ceiling for a canvas upload.
export const UPLOAD_MAX_EDGE = 2000; // Longest retained edge, in pixels.

// The editor artwork space shared by the print canvas and mockups.
const ARTWORK_SPACE_WIDTH = 1000;
const ARTWORK_SPACE_HEIGHT = 1200;

export type CompressedUpload = {
  src: string;
  byteSize: number;
  width: number;
  height: number;
  fileName: string;
};

export function formatByteSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/** Fit an image into the print canvas while keeping its aspect ratio. */
export function imageLayerBox(width: number, height: number) {
  const ratio = Math.min(
    (ARTWORK_SPACE_WIDTH * 0.8) / width,
    (ARTWORK_SPACE_HEIGHT * 0.8) / height,
  );
  const boxWidth = width * ratio;
  const boxHeight = height * ratio;
  return {
    x: (ARTWORK_SPACE_WIDTH - boxWidth) / 2,
    y: (ARTWORK_SPACE_HEIGHT - boxHeight) / 2,
    width: boxWidth,
    height: boxHeight,
  };
}

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.readAsDataURL(blob);
  });
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), type, quality));
}

/**
 * Re-encode a selected photo, shrinking it until it fits `maxBytes`, so the accepted
 * upload can be inserted straight into the canvas without exceeding the size policy.
 */
export async function compressImageUpload(
  file: File,
  options?: { maxBytes?: number; maxEdge?: number },
): Promise<CompressedUpload> {
  const maxBytes = options?.maxBytes ?? UPLOAD_MAX_BYTES;
  const maxEdge = options?.maxEdge ?? UPLOAD_MAX_EDGE;
  const type = "image/jpeg";

  const bitmap = await createImageBitmap(file);
  const edgeScale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  let width = Math.max(1, Math.round(bitmap.width * edgeScale));
  let height = Math.max(1, Math.round(bitmap.height * edgeScale));
  let quality = 0.86;

  try {
    for (let attempt = 0; attempt < 7; attempt += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) break;
      context.drawImage(bitmap, 0, 0, width, height);
      const blob = await canvasBlob(canvas, type, quality);
      if (blob && blob.size <= maxBytes) {
        return {
          src: await toDataUrl(blob),
          byteSize: blob.size,
          width,
          height,
          fileName: file.name,
        };
      }
      width = Math.max(320, Math.round(width * 0.78));
      height = Math.max(320, Math.round(height * 0.78));
      quality = Math.max(0.42, quality - 0.11);
    }
  } finally {
    bitmap.close?.();
  }

  throw new Error(`Could not reduce ${file.name} below ${formatByteSize(maxBytes)}.`);
}
