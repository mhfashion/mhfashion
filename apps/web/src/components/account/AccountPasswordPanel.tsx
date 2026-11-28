"use client";

import { useEffect, useState } from "react";
import { KeyRound, LogIn, LogOut, ShieldCheck } from "lucide-react";
import { updateAdminData, useAdminDemoData } from "@/lib/admin-demo-store";
import { customerAccountFor } from "@/lib/customer-accounts";
import {
  SIGN_IN_MESSAGE, changeOwnPassword, endCustomerSession, readCustomerSession, signInCustomer,
  startCustomerSession, type CustomerSession,
} from "@/lib/customer-session";

const FIELD = "h-10 w-full rounded-xl border border-border bg-bg px-3 text-sm outline-none focus:border-accent";

const CHANGE_MESSAGE = {
  "signed-out": "Sign in first — a password can only be changed by the customer it belongs to.",
  "unknown-account": "This account no longer exists.",
  "wrong-password": "The current password does not match.",
  weak: "The new password does not meet the rules.",
  mismatch: "The two new passwords do not match.",
} as const;

export default function AccountPasswordPanel({ my }: { my: boolean }) {
  const data = useAdminDemoData();
  const [session, setSession] = useState<CustomerSession | null>(null);
  const [email, setEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [issues, setIssues] = useState<string[]>([]);
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);

  // The session lives in the browser, so it is read after mount to keep the server render honest.
  useEffect(() => {
    const stored = readCustomerSession();
    setSession(stored);
    if (stored) setEmail(stored.email);
  }, []);

  const account = session ? customerAccountFor(data.customerAccounts, session.email) : null;
  const t = (english: string, burmese: string) => (my ? burmese : english);
  const clearFeedback = () => { setError(""); setIssues([]); setDone(""); };

  const submitSignIn = async () => {
    if (busy) return;
    setBusy(true);
    clearFeedback();
    try {
      const result = await signInCustomer(data.customerAccounts, email, signInPassword);
      if (!result.ok) {
        setError(SIGN_IN_MESSAGE[result.reason]);
        return;
      }
      setSession(startCustomerSession(result.account.email));
      setSignInPassword("");
      setDone(t("Signed in. You can change your password now.", "ဝင်ရောက်ပြီးပါပြီ။ ယခု password ပြောင်းလို့ရပါပြီ။"));
    } finally {
      setBusy(false);
    }
  };

  const submitChange = async () => {
    if (busy || !account) return;
    setBusy(true);
    clearFeedback();
    try {
      const result = await changeOwnPassword(data.customerAccounts, session, current, next, confirm);
      if (!result.ok) {
        setError(CHANGE_MESSAGE[result.reason]);
        setIssues(result.issues ?? []);
        return;
      }
      updateAdminData((store) => ({ ...store, customerAccounts: result.accounts }));
      setCurrent("");
      setNext("");
      setConfirm("");
      setDone(t("Password changed. Use the new one next time you sign in.", "Password ပြောင်းပြီးပါပြီ။ နောက်တစ်ခါ ဝင်ချိန် အသစ်ကို သုံးပါ။"));
    } finally {
      setBusy(false);
    }
  };

  const signOut = () => {
    endCustomerSession();
    setSession(null);
    setCurrent("");
    setNext("");
    setConfirm("");
    clearFeedback();
  };

  return (
    <div className="rounded-xl border border-border p-4" data-account-password-panel>
      <div className="flex items-start gap-2">
        <KeyRound size={18} className="mt-0.5 shrink-0 text-accent" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">{t("Password", "စကားဝှက်")}</p>
          <p className="mt-1 text-xs text-text-muted">
            {t(
              "Only the customer can change this password, and only while signed in. The shop stores it as a salted hash and cannot read it back.",
              "ဒီ password ကို ဝင်ရောက်ထားတဲ့ ကိုယ်တိုင်ပဲ ပြောင်းနိုင်ပါတယ်။ ဆိုင်က hash အဖြစ်ပဲ သိမ်းတာမို့ ပြန်ဖတ်လို့ မရပါ။",
            )}
          </p>
        </div>
      </div>

      {session ? (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-bg px-3 py-2">
            <p className="min-w-0 truncate text-xs font-semibold" data-account-password-signed-in>{session.email}</p>
            <button type="button" onClick={signOut} className="inline-flex items-center gap-1 text-xs font-semibold text-text-muted hover:text-accent" data-account-password-signout>
              <LogOut size={13} /> {t("Sign out", "ထွက်ရန်")}
            </button>
          </div>

          {account?.mustChangePassword ? (
            <p className="rounded-lg bg-[#fff4d8] px-3 py-2 text-[11px] font-semibold text-[#9a6c07]" data-account-password-temporary>
              {t(
                "The shop set a temporary password. Please choose your own now.",
                "ဆိုင်က ယာယီ password သတ်မှတ်ထားပါတယ်။ ကိုယ်ပိုင် password အသစ် ရွေးပေးပါ။",
              )}
            </p>
          ) : null}

          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-text-secondary">{t("Current password", "လက်ရှိ password")}</span>
            <input type="password" autoComplete="current-password" value={current} onChange={(event) => { setCurrent(event.target.value); clearFeedback(); }} className={FIELD} data-account-password-current />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-text-secondary">{t("New password", "password အသစ်")}</span>
            <input type="password" autoComplete="new-password" value={next} onChange={(event) => { setNext(event.target.value); clearFeedback(); }} className={FIELD} data-account-password-new />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-text-secondary">{t("Repeat new password", "password အသစ် ထပ်ရိုက်")}</span>
            <input type="password" autoComplete="new-password" value={confirm} onChange={(event) => { setConfirm(event.target.value); clearFeedback(); }} className={FIELD} data-account-password-confirm />
          </label>
          <p className="text-[10px] text-text-muted">
            {t(
              "8+ characters with a letter and a number, and not your name or email.",
              "၈ လုံးအထက်၊ စာလုံးနဲ့ ဂဏန်း ပါရမယ်။ နာမည်/email မပါရ။",
            )}
          </p>
          <button
            type="button"
            onClick={submitChange}
            disabled={busy || !current || !next || !confirm}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-accent px-4 text-xs font-bold text-accent-foreground disabled:opacity-50"
            data-account-password-save
          >
            <ShieldCheck size={14} /> {busy ? t("Saving…", "သိမ်းနေသည်…") : t("Change password", "password ပြောင်းရန်")}
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <p className="rounded-lg bg-bg px-3 py-2 text-[11px] font-semibold text-text-secondary" data-account-password-signed-out>
            {t(
              "You are not signed in, so no password can be changed on this device.",
              "ဝင်ရောက်ထားတာ မရှိပါ။ ဒါကြောင့် password ပြောင်းလို့ မရပါ။",
            )}
          </p>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-text-secondary">{t("Email", "အီးမေးလ်")}</span>
            <input type="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); clearFeedback(); }} className={FIELD} data-account-signin-email placeholder="you@example.com" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-text-secondary">{t("Password", "password")}</span>
            <input type="password" autoComplete="current-password" value={signInPassword} onChange={(event) => { setSignInPassword(event.target.value); clearFeedback(); }} className={FIELD} data-account-signin-password />
          </label>
          <button
            type="button"
            onClick={submitSignIn}
            disabled={busy || !email || !signInPassword}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-accent px-4 text-xs font-bold text-accent-foreground disabled:opacity-50"
            data-account-signin-submit
          >
            <LogIn size={14} /> {busy ? t("Signing in…", "ဝင်နေသည်…") : t("Sign in", "ဝင်ရောက်ရန်")}
          </button>
        </div>
      )}

      {error ? <p role="alert" className="mt-2 text-[11px] font-semibold text-[#b4463c]" data-account-password-error>{error}</p> : null}
      {issues.length ? (
        <ul className="mt-1 space-y-0.5 text-[10px] font-semibold text-[#b4463c]" data-account-password-issues>
          {issues.map((issue) => <li key={issue}>{issue}</li>)}
        </ul>
      ) : null}
      {done ? <p role="status" className="mt-2 text-[11px] font-semibold text-accent" data-account-password-done>{done}</p> : null}
    </div>
  );
}
