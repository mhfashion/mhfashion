/**
 * Customer accounts and their passwords (owner request 2026-11-21, part 5).
 *
 * A customer is derived from the order queue, but a password belongs to an account. The owner can
 * read every detail the shop holds and set, reset or block the password — never read it back: the
 * module stores a salted PBKDF2-SHA256 hash and the screen shows only *when* it last changed.
 */

export type CustomerPasswordHash = {
  salt: string;
  hash: string;
  iterations: number;
};

export type AdminCustomerAccount = {
  email: string;
  name: string;
  phone: string;
  /** Null until the owner sets one: a customer is invited, never handed a default password. */
  password: CustomerPasswordHash | null;
  passwordUpdatedAt: string | null;
  passwordUpdatedBy: string | null;
  /** Set when the owner must share a temporary password: the customer changes it at next sign-in. */
  mustChangePassword: boolean;
  status: "Active" | "Blocked";
  createdAt: string;
  lastOrderAt: string;
};

export const PBKDF2_ITERATIONS = 210_000;
export const PASSWORD_MIN_LENGTH = 8;

const toHex = (bytes: Uint8Array) => Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");

function randomBytes(length: number) {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

function subtle(): SubtleCrypto {
  const crypto = globalThis.crypto;
  if (!crypto?.subtle) throw new Error("Web Crypto is unavailable in this environment.");
  return crypto.subtle;
}

export async function hashCustomerPassword(password: string, salt: string, iterations = PBKDF2_ITERATIONS): Promise<CustomerPasswordHash> {
  const key = await subtle().importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await subtle().deriveBits(
    { name: "PBKDF2", salt: new TextEncoder().encode(salt) as BufferSource, iterations, hash: "SHA-256" },
    key,
    256,
  );
  return { salt, hash: toHex(new Uint8Array(bits)), iterations };
}

export async function createCustomerPassword(password: string): Promise<CustomerPasswordHash> {
  return hashCustomerPassword(password, toHex(randomBytes(16)));
}

export async function verifyCustomerPassword(account: AdminCustomerAccount, password: string): Promise<boolean> {
  if (!account.password) return false;
  const candidate = await hashCustomerPassword(password, account.password.salt, account.password.iterations);
  return timingSafeEqualHex(candidate.hash, account.password.hash);
}

function timingSafeEqualHex(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}

const COMMON_PASSWORDS = ["password", "password1", "12345678", "qwerty123", "mhfashion", "admin123", "11111111"];

/** What is wrong with a password, in the owner's words. Empty means it may be set. */
export function passwordIssues(password: string, account: Pick<AdminCustomerAccount, "email" | "name">): string[] {
  const issues: string[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) issues.push(`Use at least ${PASSWORD_MIN_LENGTH} characters.`);
  if (!/[A-Za-z]/.test(password)) issues.push("Add a letter.");
  if (!/[0-9]/.test(password)) issues.push("Add a number.");
  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.includes(lower)) issues.push("That password is too common.");
  const local = account.email.split("@")[0]?.toLowerCase();
  if (local && local.length >= 3 && lower.includes(local)) issues.push("Do not use the customer's email address.");
  const firstName = account.name.split(/\s+/)[0]?.toLowerCase();
  if (firstName && firstName.length >= 3 && lower.includes(firstName)) issues.push("Do not use the customer's name.");
  return issues;
}

const GENERATED_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** A 16-character temporary password that satisfies the policy on its own. */
export function generateCustomerPassword(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const pick = (source: string) => source[randomBytes(1)[0] % source.length];
  const rest = Array.from(randomBytes(13), (byte) => GENERATED_ALPHABET[byte % GENERATED_ALPHABET.length]);
  const chars = [pick(letters), pick(lower), pick(digits), ...rest];
  // Fisher-Yates with fresh randoms, so the first three characters are not always letter/letter/digit.
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swap = randomBytes(1)[0] % (index + 1);
    [chars[index], chars[swap]] = [chars[swap], chars[index]];
  }
  return chars.join("");
}

export function canCustomerSignIn(account: Pick<AdminCustomerAccount, "status" | "password">): boolean {
  return account.status === "Active" && account.password !== null;
}

/** The account behind an email, or null when the shop has never heard of the address. */
export function customerAccountFor(accounts: readonly AdminCustomerAccount[] | undefined, email: string): AdminCustomerAccount | null {
  const wanted = email.trim().toLowerCase();
  return (accounts ?? []).find((account) => account.email === wanted) ?? null;
}

/** One account per customer email in the order queue; they start with no password. */
export function createSeedCustomerAccounts(
  orders: readonly {
    customerEmail: string;
    customerName: string;
    customerPhone?: string;
    placedAt: string;
  }[],
  now: number,
): AdminCustomerAccount[] {
  const accounts = new Map<string, AdminCustomerAccount>();
  for (const order of orders) {
    const email = order.customerEmail.trim().toLowerCase();
    if (!email) continue;
    const existing = accounts.get(email);
    if (existing) {
      if (order.placedAt > existing.lastOrderAt) existing.lastOrderAt = order.placedAt;
      if (order.customerName) existing.name = order.customerName;
      if (order.customerPhone) existing.phone = order.customerPhone;
      continue;
    }
    accounts.set(email, {
      email,
      name: order.customerName,
      phone: order.customerPhone ?? "",
      password: null,
      passwordUpdatedAt: null,
      passwordUpdatedBy: null,
      mustChangePassword: false,
      status: "Active",
      createdAt: new Date(now).toISOString(),
      lastOrderAt: order.placedAt,
    });
  }
  return [...accounts.values()].sort((a, b) => a.email.localeCompare(b.email));
}

/** Saved data gains an account for every order email, and keeps every password already stored. */
export function normalizeCustomerAccounts(
  stored: readonly Partial<AdminCustomerAccount>[] | undefined,
  orders: readonly { customerEmail: string; customerName: string; customerPhone?: string; placedAt: string }[],
  now: number,
): AdminCustomerAccount[] {
  const seeded = createSeedCustomerAccounts(orders, now);
  const byEmail = new Map(seeded.map((account) => [account.email, account]));
  for (const entry of stored ?? []) {
    const email = (entry.email ?? "").trim().toLowerCase();
    if (!email) continue;
    const base = byEmail.get(email) ?? {
      email,
      name: entry.name ?? email,
      phone: entry.phone ?? "",
      password: null,
      passwordUpdatedAt: null,
      passwordUpdatedBy: null,
      mustChangePassword: false,
      status: "Active" as const,
      createdAt: entry.createdAt ?? new Date(now).toISOString(),
      lastOrderAt: entry.lastOrderAt ?? new Date(now).toISOString(),
    };
    const password = entry.password && typeof entry.password === "object" && entry.password.hash && entry.password.salt
      ? { salt: String(entry.password.salt), hash: String(entry.password.hash), iterations: Number(entry.password.iterations) || PBKDF2_ITERATIONS }
      : null;
    byEmail.set(email, {
      ...base,
      name: entry.name ?? base.name,
      phone: entry.phone ?? base.phone,
      password,
      passwordUpdatedAt: password ? entry.passwordUpdatedAt ?? null : null,
      passwordUpdatedBy: password ? entry.passwordUpdatedBy ?? null : null,
      mustChangePassword: Boolean(entry.mustChangePassword),
      status: entry.status === "Blocked" ? "Blocked" : "Active",
      createdAt: entry.createdAt ?? base.createdAt,
      lastOrderAt: entry.lastOrderAt ?? base.lastOrderAt,
    });
  }
  return [...byEmail.values()].sort((a, b) => a.email.localeCompare(b.email));
}

/** The account with `email` carrying the new password hash. Throws when the email is unknown. */
export function applyCustomerPassword(
  accounts: readonly AdminCustomerAccount[],
  email: string,
  password: CustomerPasswordHash,
  options: { actor: string; at: string; mustChangePassword?: boolean },
): AdminCustomerAccount[] {
  const wanted = email.trim().toLowerCase();
  if (!accounts.some((account) => account.email === wanted)) throw new Error(`${email} is not a customer.`);
  return accounts.map((account) => account.email === wanted
    ? {
      ...account,
      password,
      passwordUpdatedAt: options.at,
      passwordUpdatedBy: options.actor,
      mustChangePassword: options.mustChangePassword ?? false,
    }
    : account);
}

export function setCustomerStatus(
  accounts: readonly AdminCustomerAccount[],
  email: string,
  status: AdminCustomerAccount["status"],
): AdminCustomerAccount[] {
  const wanted = email.trim().toLowerCase();
  return accounts.map((account) => (account.email === wanted ? { ...account, status } : account));
}

export function setCustomerMustChangePassword(
  accounts: readonly AdminCustomerAccount[],
  email: string,
  mustChangePassword: boolean,
): AdminCustomerAccount[] {
  const wanted = email.trim().toLowerCase();
  return accounts.map((account) => (account.email === wanted ? { ...account, mustChangePassword } : account));
}

/** What the screen says about a password — never the password itself. */
export function customerPasswordState(account: Pick<AdminCustomerAccount, "password" | "passwordUpdatedAt" | "mustChangePassword" | "status">): string {
  if (account.status === "Blocked") return "Sign-in blocked";
  if (!account.password) return "No password set";
  if (account.mustChangePassword) return "Temporary password — change at next sign-in";
  return account.passwordUpdatedAt ? `Set ${new Date(account.passwordUpdatedAt).toLocaleString()}` : "Set";
}
