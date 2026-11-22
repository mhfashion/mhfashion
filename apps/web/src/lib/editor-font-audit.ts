// Checks a font folder before it is uploaded to the bucket: the same manifest rules the editor
// applies, plus the two things only the files themselves can show — a listed file that is not on
// disk, and a file so large it would make the picker feel slow.
import { parseEditorFontManifest, fontShelfGroups, type EditorFontShelf } from "@/lib/editor-fonts";

/** A font bigger than this is worth a second look: a full Myanmar face is usually well under it. */
export const FONT_FILE_WARN_BYTES = 1024 * 1024;

export type FontAudit = {
  picker: { shelf: EditorFontShelf; label: string; names: string[] }[];
  skipped: { slug: string; reason: string }[];
  /** Listed in the manifest but absent from the folder, so the picker would offer a font that 404s. */
  missing: string[];
  large: { file: string; bytes: number }[];
};

function normalise(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.?\//, "");
}

function fileIsPresent(file: string, paths: string[]): boolean {
  const wanted = normalise(file);
  const withoutPrefix = wanted.replace(/^fonts\//, "");
  return paths.some((path) => {
    const candidate = normalise(path);
    return candidate === wanted
      || candidate === withoutPrefix
      || candidate.endsWith(`/${wanted}`)
      || candidate.endsWith(`/${withoutPrefix}`);
  });
}

/**
 * Audit `fonts/manifest.json` against the files beside it. `files` is every file in the folder
 * (or in the bucket) with its size, so the same call works on a local copy and on a listing.
 */
export function auditFontLibrary(
  manifestRaw: unknown,
  files: { path: string; bytes: number }[],
): FontAudit {
  const manifest = parseEditorFontManifest(manifestRaw);
  const paths = files.map((file) => file.path);
  const missing: string[] = [];
  const large: { file: string; bytes: number }[] = [];
  for (const font of manifest.fonts) {
    for (const file of font.files) {
      if (!fileIsPresent(file.file, paths)) missing.push(file.file);
      const size = files.find((candidate) => fileIsPresent(file.file, [candidate.path]))?.bytes ?? 0;
      if (size > FONT_FILE_WARN_BYTES) large.push({ file: file.file, bytes: size });
    }
  }
  return { picker: fontShelfGroups(manifest.fonts), skipped: manifest.skipped, missing, large };
}

/** True when the folder can be uploaded as it is. */
export function fontAuditIsClean(audit: FontAudit): boolean {
  return audit.skipped.length === 0 && audit.missing.length === 0;
}
