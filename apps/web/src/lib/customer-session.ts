// The customer's own sign-in, and the only path by which a customer changes their own password.
// Nothing here trusts the screen: every change takes a live session, checks the current password and
// then hands back the accounts it changed. Signed out means no change.
import {
  applyCustomerPassword,
  canCustomerSignIn,
  createCustomerPassword,
  customerAccountFor,
  passwordIssues,
  verifyCustomerPassword,
  type AdminCustomerAccount,
} from "@/lib/customer-accounts";

const STORAGE_KEY = "mh-fashion-customer-session-v1";
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export type CustomerSession = {
  email: string;
  issuedAt: string;
  expiresAt: string;
};

function storage(): Storage | null {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") return null;
  return window.localStorage;
}

/** The live session on this device, or null when nobody is signed in (or it has expired). */
export function readCustomerSession(now = Date.now()): CustomerSession | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<CustomerSession>;
    if (!value || typeof value.email !== "string" || !value.email.trim()) return null;
    if (typeof value.expiresAt !== "string" || Date.parse(value.expiresAt) <= now) {
      store.removeItem(STORAGE_KEY);
      return null;
    }
    return {
      email: value.email.trim().toLowerCase(),
      issuedAt: typeof value.issuedAt === "string" ? value.issuedAt : new Date(now).toISOString(),
      expiresAt: value.expiresAt,
    };
  } catch {
    return null;
  }
}

export function startCustomerSession(email: string, now = Date.now()): CustomerSession | null {
  const store = storage();
  if (!store) return null;
  const session: CustomerSession = {
    email: email.trim().toLowerCase(),
    issuedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SESSION_TTL_MS).toISOString(),
  };
  store.setItem(STORAGE_KEY, JSON.stringify(session));
  return session;
}

export function endCustomerSession() {
  storage()?.removeItem(STORAGE_KEY);
}

export type SignInResult =
  | { ok: true; account: AdminCustomerAccount }
  | { ok: false; reason: "unknown-email" | "blocked" | "no-password" | "wrong-password" | "missing" };

export async function signInCustomer(
  accounts: readonly AdminCustomerAccount[] | undefined,
  email: string,
  password: string,
): Promise<SignInResult> {
  if (!email.trim()) return { ok: false, reason: "missing" };
  const account = customerAccountFor(accounts, email);
  if (!account) return { ok: false, reason: "unknown-email" };
  if (account.status === "Blocked") return { ok: false, reason: "blocked" };
  if (!account.password) return { ok: false, reason: "no-password" };
  if (!await verifyCustomerPassword(account, password)) return { ok: false, reason: "wrong-password" };
  if (!canCustomerSignIn(account)) return { ok: false, reason: "blocked" };
  return { ok: true, account };
}

export const SIGN_IN_MESSAGE: Record<Exclude<SignInResult, { ok: true }>["reason"], string> = {
  "unknown-email": "No account uses that email.",
  blocked: "Sign-in is blocked for this account. Contact the shop.",
  "no-password": "This account has no password yet. Ask the shop to set one.",
  "wrong-password": "That password does not match.",
  missing: "Enter the email the order was placed with.",
};

export type OwnPasswordChange =
  | { ok: true; accounts: AdminCustomerAccount[] }
  | { ok: false; reason: "signed-out" | "unknown-account" | "wrong-password" | "weak" | "mismatch"; issues?: string[] };

/**
 * A customer changes their own password: they must be signed in, know the current password, and the
 * new one must pass the same policy the shop uses. Only their own record changes.
 */
export async function changeOwnPassword(
  accounts: readonly AdminCustomerAccount[] | undefined,
  session: CustomerSession | null,
  currentPassword: string,
  nextPassword: string,
  confirmPassword: string,
  now = new Date().toISOString(),
): Promise<OwnPasswordChange> {
  if (!session) return { ok: false, reason: "signed-out" };
  const account = customerAccountFor(accounts, session.email);
  if (!account) return { ok: false, reason: "unknown-account" };
  if (!await verifyCustomerPassword(account, currentPassword)) return { ok: false, reason: "wrong-password" };
  if (nextPassword !== confirmPassword) return { ok: false, reason: "mismatch" };
  const issues = passwordIssues(nextPassword, account);
  if (issues.length) return { ok: false, reason: "weak", issues };
  if (currentPassword === nextPassword) return { ok: false, reason: "weak", issues: ["Choose a password you have not used here."] };
  const hash = await createCustomerPassword(nextPassword);
  return {
    ok: true,
    accounts: applyCustomerPassword(accounts ?? [], account.email, hash, {
      actor: `${account.name || account.email} (self)`,
      at: now,
    }),
  };
}
