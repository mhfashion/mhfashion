"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole,
  Mail, ShieldAlert, Sparkles, UserRound,
} from "lucide-react";
import {
  createDemoAdminAccount, getDemoAdminSession, hasDemoAdminAccount,
  signInDemoAdmin,
} from "@/lib/admin-demo-auth";

type AuthMode = "login" | "register";

export default function AdminAuthPanel({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const isRegister = mode === "register";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [hasAccount, setHasAccount] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (getDemoAdminSession()) {
      router.replace("/admin");
      return;
    }
    setHasAccount(hasDemoAdminAccount());
    setReady(true);
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (isRegister && password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setPending(true);
    try {
      const session = isRegister
        ? await createDemoAdminAccount(name, email, password)
        : await signInDemoAdmin(email, password);

      if (!session) {
        setError(hasAccount ? "Email or password is incorrect." : "No authorized admin account exists in this browser.");
        setPending(false);
        return;
      }
      router.replace("/admin");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to complete the demo account action.");
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f1f4f7] px-3 py-5 text-[#17202b] sm:px-6 sm:py-8">
      <div className="grid w-full max-w-[970px] overflow-hidden rounded-[24px] border border-[#e4e8ed] bg-white shadow-[0_24px_80px_rgba(20,30,45,0.12)] md:min-h-[620px] md:grid-cols-[0.92fr_1.08fr]">
        <section className="relative isolate flex min-h-[190px] flex-col overflow-hidden bg-[#11171b] px-6 py-6 text-white sm:min-h-[230px] sm:px-9 sm:py-8 md:min-h-full md:px-10 md:py-10">
          <div className="absolute -right-20 -top-24 -z-10 h-72 w-72 rounded-full bg-[#77bd37]/15 blur-2xl" />
          <div className="absolute -bottom-20 -left-16 -z-10 h-64 w-64 rounded-full bg-[#77bd37]/10 blur-2xl" />
          <Link href="/" className="inline-flex w-fit flex-col leading-none" aria-label="MH Fashion home">
            <span className="text-[20px] font-black tracking-tight"><span className="text-[#8bd340]">MH</span> FASHION<span className="text-[#8bd340]">.</span></span>
            <span className="mt-1.5 text-[9px] font-medium tracking-[0.2em] text-[#a3adb3]">ADMIN PORTAL</span>
          </Link>

          <div className="mt-7 max-w-[390px] sm:mt-10 md:mt-auto md:mb-auto md:pt-16">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#8bd340]/25 bg-[#8bd340]/10 px-3 py-1.5 text-[9px] font-semibold tracking-wide text-[#b6e989]"><Sparkles size={12} /> ADMIN WORKSPACE</div>
            <h1 className="text-[25px] font-extrabold leading-tight tracking-tight sm:text-[31px]">{isRegister ? "Create your admin account" : "Welcome back, Admin"}</h1>
            <p className="mt-2 max-w-[340px] text-[11px] leading-5 text-[#b2bbc0] sm:text-[12px]">
              {isRegister ? "Set up a local preview account to explore the MH Fashion admin dashboard." : "Sign in to open your MH Fashion admin dashboard preview."}
            </p>

            <div className="mt-5 hidden space-y-3 md:block">
              {["Store overview and sample analytics", "Order and product preview tables", "Mobile-friendly admin layout"].map((item) => <p key={item} className="flex items-center gap-2 text-[10px] text-[#d2d9dc]"><CheckCircle2 size={14} className="text-[#8bd340]" />{item}</p>)}
            </div>
          </div>

          <div className="mt-4 hidden items-center gap-2 border-t border-white/10 pt-4 text-[9px] text-[#8e989e] md:flex"><ShieldAlert size={13} className="text-[#e4bf62]" /> Demo UI only · Supabase connection comes later</div>
        </section>

        <section className="flex items-center justify-center px-5 py-6 sm:px-9 sm:py-9 md:px-12 md:py-12">
          <div className="w-full max-w-[390px]">
            <Link href="/" className="mb-5 inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#778290] hover:text-[#397d27]"><ArrowLeft size={13} /> Back to store</Link>
            <h2 className="text-[22px] font-extrabold tracking-tight text-[#18212c]">{isRegister ? "Create account" : "Admin sign in"}</h2>
            <p className="mt-1 text-[11px] text-[#7d8794]">{isRegister ? "One demo admin account can be stored in this browser." : "Enter the demo account you created in this browser."}</p>

            <div className="mt-4 rounded-xl border border-[#efdda6] bg-[#fff9e8] p-3 text-[9px] leading-4 text-[#725b1d]">
              <p className="flex items-center gap-1.5 font-bold"><ShieldAlert size={13} /> Demo mode — not secure authentication</p>
              <p className="mt-1">Account data stays in this browser only. There is no Supabase, server-side protection, or email verification yet. Do not use a real or reused password.</p>
            </div>

            {!ready ? <div className="mt-6 h-48 animate-pulse rounded-xl bg-[#f4f6f8]" /> : <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
              {isRegister && <label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-[#4c5663]">Full name</span><span className="flex h-11 items-center gap-2.5 rounded-xl border border-[#e1e5e9] bg-white px-3 text-[#929ba6] focus-within:border-[#8bcf4c]"><UserRound size={15} /><input required autoComplete="name" minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" className="w-full bg-transparent text-[11px] text-[#1f2935] outline-none placeholder:text-[#a2aab3]" /></span></label>}

              <label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-[#4c5663]">Email address</span><span className="flex h-11 items-center gap-2.5 rounded-xl border border-[#e1e5e9] bg-white px-3 text-[#929ba6] focus-within:border-[#8bcf4c]"><Mail size={15} /><input required type="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@example.com" className="w-full bg-transparent text-[11px] text-[#1f2935] outline-none placeholder:text-[#a2aab3]" /></span></label>

              <label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-[#4c5663]">Password</span><span className="flex h-11 items-center gap-2.5 rounded-xl border border-[#e1e5e9] bg-white px-3 text-[#929ba6] focus-within:border-[#8bcf4c]"><LockKeyhole size={15} /><input required type={showPassword ? "text" : "password"} autoComplete={isRegister ? "new-password" : "current-password"} minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isRegister ? "At least 8 characters" : "Enter your password"} className="w-full bg-transparent text-[11px] text-[#1f2935] outline-none placeholder:text-[#a2aab3]" /><button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"} className="rounded-md p-1 text-[#7e8895] hover:bg-[#f1f3f5]">{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button></span></label>

              {isRegister && <label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-[#4c5663]">Confirm password</span><span className="flex h-11 items-center gap-2.5 rounded-xl border border-[#e1e5e9] bg-white px-3 text-[#929ba6] focus-within:border-[#8bcf4c]"><LockKeyhole size={15} /><input required type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Re-enter password" className="w-full bg-transparent text-[11px] text-[#1f2935] outline-none placeholder:text-[#a2aab3]" /></span></label>}

              {error && <p role="alert" className="rounded-lg border border-[#f2c9c9] bg-[#fff1f1] px-3 py-2 text-[10px] leading-4 text-[#b23a3a]">{error}</p>}

              <button disabled={pending} type="submit" className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#67ae2e] px-4 text-[11px] font-bold text-white shadow-[0_6px_14px_rgba(87,160,37,0.18)] transition hover:bg-[#579d25] disabled:cursor-wait disabled:opacity-60">
                {pending ? "Please wait…" : isRegister ? "Create demo account" : "Sign in to dashboard"}<ArrowRight size={14} />
              </button>
            </form>}

            <p className="mt-5 text-center text-[10px] text-[#7e8894]">Only an authorized admin account can access this workspace.</p>

            {isRegister && hasAccount && <div className="mt-3 flex items-center justify-center gap-1 text-[9px] text-[#856d29]"><LockKeyhole size={11} /> This browser already has a demo account. <Link href="/admin/login" className="font-bold underline">Sign in</Link>.</div>}
            <p className="mt-6 text-center text-[9px] leading-4 text-[#a0a8b2]">Frontend prototype only. Supabase Auth and server-side admin authorization are not connected yet.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
