/**
 * The crash log a browser keeps for itself.
 *
 * Nothing on this site reports a crash to a server: there is no endpoint to send it to and no account
 * to send it with. What the shop *can* do is write the crash down on the device that saw it, so the
 * owner standing at that phone — or the admin reading this page on it — can see what broke and when,
 * instead of a customer saying "the editor was blank" with nothing to go on.
 *
 * Every function is safe to call where storage is missing, full or disabled (Safari private mode, a
 * kiosk policy): a crash logger that throws while logging a crash is worse than no logger.
 */

export const CLIENT_ERROR_STORAGE_KEY = "mh-fashion-client-error-log";

/** Newest first; the oldest entries are dropped once the log is full. */
export const CLIENT_ERROR_LIMIT = 25;
/** A stack longer than this is cut: a few frames name the file, a thousand fill the storage quota. */
export const CLIENT_ERROR_STACK_LIMIT = 1200;

export type ClientErrorEntry = {
  /** Stable id for React keys and for clearing one row. */
  id: string;
  /** The error message, trimmed to something readable in a table. */
  message: string;
  /** Where it happened: pathname plus search, so two crashes on one route are distinguishable. */
  path: string;
  /** `error` is a render boundary, `global` is the root layout, `unhandled` is a window listener. */
  kind: "error" | "global" | "unhandled";
  /** Next's digest for a server-rendered crash; empty when the crash happened in the browser only. */
  digest: string;
  stack: string;
  /** ISO timestamp, UTC. */
  at: string;
};

export type ClientErrorInput = {
  message: string;
  path?: string;
  kind?: ClientErrorEntry["kind"];
  digest?: string;
  stack?: string;
  at?: string;
};

export type ClientErrorSummary = {
  message: string;
  path: string;
  kind: ClientErrorEntry["kind"];
  count: number;
  lastAt: string;
  entries: ClientErrorEntry[];
};

type Storage = Pick<globalThis.Storage, "getItem" | "setItem" | "removeItem">;

/**
 * `window.localStorage` can throw on *access* (not just on write) when the browser has storage
 * disabled, so even reaching for it needs a guard.
 */
function resolveStorage(storage?: Storage | null): Storage | null {
  if (storage) return storage;
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function cleanText(value: string, limit: number): string {
  return value.replace(/\s+/g, " ").trim().slice(0, limit);
}

export function clientErrorId(entry: Pick<ClientErrorEntry, "message" | "path" | "at">): string {
  let hash = 0;
  const seed = `${entry.at}|${entry.path}|${entry.message}`;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 0xffffffff;
  }
  return `crash-${hash.toString(36)}-${seed.length.toString(36)}`;
}

/** The newest-first log as stored, tolerating a missing, corrupt or hand-edited value. */
export function readClientErrorLog(storage?: Storage | null): ClientErrorEntry[] {
  const store = resolveStorage(storage);
  if (!store) return [];
  let raw: string | null = null;
  try {
    raw = store.getItem(CLIENT_ERROR_STORAGE_KEY);
  } catch {
    return [];
  }
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((value): ClientErrorEntry[] => {
    if (!value || typeof value !== "object") return [];
    const entry = value as Partial<ClientErrorEntry>;
    if (typeof entry.message !== "string" || !entry.message.trim()) return [];
    const at = typeof entry.at === "string" && !Number.isNaN(Date.parse(entry.at)) ? entry.at : new Date(0).toISOString();
    const path = typeof entry.path === "string" ? entry.path : "/";
    const kind = entry.kind === "global" || entry.kind === "unhandled" ? entry.kind : "error";
    const record: ClientErrorEntry = {
      id: typeof entry.id === "string" && entry.id ? entry.id : clientErrorId({ message: entry.message, path, at }),
      message: entry.message,
      path,
      kind,
      digest: typeof entry.digest === "string" ? entry.digest : "",
      stack: typeof entry.stack === "string" ? entry.stack : "",
      at,
    };
    return [record];
  });
}

function writeClientErrorLog(entries: ClientErrorEntry[], storage?: Storage | null): boolean {
  const store = resolveStorage(storage);
  if (!store) return false;
  try {
    if (entries.length === 0) {
      store.removeItem(CLIENT_ERROR_STORAGE_KEY);
    } else {
      store.setItem(CLIENT_ERROR_STORAGE_KEY, JSON.stringify(entries));
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Record a crash. Identical crashes (same message and path) collapse into one entry whose `at` moves
 * forward, so a render loop cannot fill the log with a thousand copies of itself.
 *
 * Returns the log that is now stored — an empty array when storage refused it.
 */
export function recordClientError(input: ClientErrorInput, storage?: Storage | null): ClientErrorEntry[] {
  const message = cleanText(input.message ?? "", 300);
  if (!message) return readClientErrorLog(storage);
  const path = cleanText(input.path ?? (typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/"), 200) || "/";
  const at = input.at && !Number.isNaN(Date.parse(input.at)) ? new Date(Date.parse(input.at)).toISOString() : new Date().toISOString();
  const entry: ClientErrorEntry = {
    id: clientErrorId({ message, path, at }),
    message,
    path,
    kind: input.kind ?? "error",
    digest: cleanText(input.digest ?? "", 80),
    stack: (input.stack ?? "").trim().slice(0, CLIENT_ERROR_STACK_LIMIT),
    at,
  };

  const existing = readClientErrorLog(storage);
  const duplicate = existing.find((candidate) => candidate.message === message && candidate.path === path);
  const next = duplicate
    ? [{ ...duplicate, at: entry.at, digest: entry.digest || duplicate.digest, stack: entry.stack || duplicate.stack }, ...existing.filter((candidate) => candidate !== duplicate)]
    : [entry, ...existing];
  writeClientErrorLog(next.slice(0, CLIENT_ERROR_LIMIT), storage);
  notifyClientErrorLog();
  return readClientErrorLog(storage);
}

export function clearClientErrorLog(storage?: Storage | null): boolean {
  const cleared = writeClientErrorLog([], storage);
  notifyClientErrorLog();
  return cleared;
}

/** Fires on this tab after a crash is recorded or the log is cleared, and on any tab that shares it. */
export const CLIENT_ERROR_EVENT = "mh-fashion-client-error-log-changed";

export function subscribeClientErrorLog(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CLIENT_ERROR_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CLIENT_ERROR_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

function notifyClientErrorLog(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CLIENT_ERROR_EVENT));
}

/** The log grouped the way an owner reads it: worst offender first, then most recent. */
export function summariseClientErrors(entries: ClientErrorEntry[]): ClientErrorSummary[] {
  const groups = new Map<string, ClientErrorSummary>();
  for (const entry of entries) {
    const key = `${entry.kind}|${entry.path}|${entry.message}`;
    const group = groups.get(key);
    if (group) {
      group.count += 1;
      group.entries.push(entry);
      if (Date.parse(entry.at) > Date.parse(group.lastAt)) group.lastAt = entry.at;
    } else {
      groups.set(key, { message: entry.message, path: entry.path, kind: entry.kind, count: 1, lastAt: entry.at, entries: [entry] });
    }
  }
  return [...groups.values()].sort((left, right) => right.count - left.count || Date.parse(right.lastAt) - Date.parse(left.lastAt));
}

/** A one-line description for a table row: where it happened and how bad it looked. */
export function clientErrorHeadline(entry: ClientErrorEntry): string {
  const where = entry.kind === "global" ? "whole app" : entry.path;
  return `${where} — ${entry.message}`;
}
