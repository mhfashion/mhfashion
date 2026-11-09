"use client";

export type AdminDemoSession = {
  name: string;
  email: string;
  role: "Administrator";
};

type StoredDemoAccount = AdminDemoSession & {
  passwordHash: string;
  salt: string;
};

const ACCOUNT_KEY = "mh-fashion-admin-demo-account-v1";
const SESSION_KEY = "mh-fashion-admin-demo-session-v1";
const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

async function digestPassword(password: string, salt: string) {
  const bytes = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return toHex(new Uint8Array(digest));
}

function readAccount(): StoredDemoAccount | null {
  try {
    const raw = window.localStorage.getItem(ACCOUNT_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<StoredDemoAccount>;
    if (typeof value.name !== "string" || typeof value.email !== "string" || typeof value.passwordHash !== "string" || typeof value.salt !== "string") return null;
    return { name: value.name, email: value.email, role: "Administrator", passwordHash: value.passwordHash, salt: value.salt };
  } catch {
    return null;
  }
}

export async function createDemoAdminAccount(name: string, email: string, password: string) {
  if (readAccount()) throw new Error("A demo admin account already exists in this browser. Sign in instead.");
  const salt = toHex(globalThis.crypto.getRandomValues(new Uint8Array(16)));
  const account: StoredDemoAccount = {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role: "Administrator",
    salt,
    passwordHash: await digestPassword(password, salt),
  };
  window.localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
  saveDemoSession(account);
  return { name: account.name, email: account.email, role: account.role } satisfies AdminDemoSession;
}

export async function signInDemoAdmin(email: string, password: string) {
  const account = readAccount();
  if (!account || account.email !== email.trim().toLowerCase()) return null;
  const candidateHash = await digestPassword(password, account.salt);
  if (candidateHash !== account.passwordHash) return null;
  const session = { name: account.name, email: account.email, role: account.role } satisfies AdminDemoSession;
  saveDemoSession(session);
  return session;
}

function saveDemoSession(session: AdminDemoSession) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, expiresAt: Date.now() + SESSION_LIFETIME_MS }));
}

export function getDemoAdminSession(): AdminDemoSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<AdminDemoSession> & { expiresAt?: number };
    if (typeof value.name !== "string" || typeof value.email !== "string" || typeof value.expiresAt !== "number" || value.expiresAt <= Date.now()) {
      window.localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return { name: value.name, email: value.email, role: "Administrator" };
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function hasDemoAdminAccount() {
  return readAccount() !== null;
}

export function signOutDemoAdmin() {
  window.localStorage.removeItem(SESSION_KEY);
}
