// Plan §12.1 part 2: the one way the app reaches the asset bucket. The R2 binding is the
// implementation in production; tests and local runs use `createMemoryAssetStore`, so the
// catalogue builders never know which one they are reading.

/** Every key the asset service will touch starts with one of these. Nothing else is reachable. */
export const ASSET_KEY_PREFIXES = [
  "fonts/",
  "designs/",
  "elements/",
  "brushes/",
  "text-styles/",
  "mockups/",
  "catalog/",
] as const;

export type AssetKeyPrefix = (typeof ASSET_KEY_PREFIXES)[number];

/** One page of a listing. `cursor` is the last key of the page; `null` means the listing ended. */
export type AssetStorePage = { keys: string[]; cursor: string | null };

export type AssetStore = {
  list(prefix: string, cursor?: string | null): Promise<AssetStorePage>;
  get(key: string): Promise<string | null>;
  put(key: string, body: string): Promise<void>;
  delete(key: string): Promise<void>;
};

const MAX_KEY_LENGTH = 512;

/**
 * A bucket-relative key, and nothing that could escape the bucket: no scheme, no absolute path,
 * no `..` segment, no backslash and no empty segment. The font loader refuses the same shapes.
 */
export function isSafeAssetKey(key: string): boolean {
  if (!key || key.length > MAX_KEY_LENGTH) return false;
  if (key !== key.trim()) return false;
  if (key.startsWith("/") || key.endsWith("/")) return false;
  if (key.includes("\\") || key.includes("//")) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(key)) return false;
  const segments = key.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) return false;
  return ASSET_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

export function assertSafeAssetKey(key: string): void {
  if (!isSafeAssetKey(key)) throw new Error(`refused asset key: ${key}`);
}

export type MemoryAssetStore = AssetStore & {
  readonly files: Map<string, string>;
  /** How many `put` calls landed, so a test can prove a snapshot was not rewritten. */
  readonly writes: string[];
};

/**
 * An in-memory bucket for tests and local work. `pageSize` is deliberately small in tests so a
 * listing has to follow the cursor, which is the behaviour the R2 listing has too.
 */
export function createMemoryAssetStore(
  entries: Record<string, string> = {},
  options: { pageSize?: number } = {},
): MemoryAssetStore {
  const files = new Map<string, string>(Object.entries(entries));
  const writes: string[] = [];
  const pageSize = Math.max(1, Math.floor(options.pageSize ?? 1000));

  return {
    files,
    writes,
    async list(prefix, cursor = null) {
      const keys = [...files.keys()].filter((key) => key.startsWith(prefix)).sort();
      const start = cursor ? keys.findIndex((key) => key > cursor) : 0;
      const from = start < 0 ? keys.length : start;
      const page = keys.slice(from, from + pageSize);
      const last = page[page.length - 1];
      return { keys: page, cursor: last && from + page.length < keys.length ? last : null };
    },
    async get(key) {
      assertSafeAssetKey(key);
      return files.has(key) ? files.get(key)! : null;
    },
    async put(key, body) {
      assertSafeAssetKey(key);
      files.set(key, body);
      writes.push(key);
    },
    async delete(key) {
      assertSafeAssetKey(key);
      files.delete(key);
    },
  };
}
