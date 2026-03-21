"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GoogleAuthButton } from "@/components/google-auth-button";
import { useAuthBridge } from "@/components/auth-bridge";
import { buildAuthErrorHref } from "@/lib/auth-paths";
import { fetchPortalSession, signInWithEmail, signInWithGoogle } from "@/lib/auth-api";

const REASON_COPY: Record<string, string> = {
  session_expired: "Your session expired. Sign in again to continue.",
  unauthorized_role: "This account does not have admin privileges.",
  service_unavailable: "Auth service temporarily unavailable. Try again shortly.",
  admin_signup_forbidden: "Admin accounts cannot be created from the public signup flow.",
};

export default function AdminLoginClient({
  reason,
  redirectTo,
}: {
  reason: string | null;
  redirectTo: string | null;
}) {
  const router = useRouter();
  const auth = useAuthBridge();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const message = reason ? REASON_COPY[reason] ?? REASON_COPY.unauthorized_role : null;

  async function finishLogin(token: string) {
    const session = await fetchPortalSession(token, "login");

    if (session.status === "admin") {
      router.replace(redirectTo ?? "/admin/dashboard");
      return;
    }

    router.replace(buildAuthErrorHref(session.reason ?? "unauthorized_role", "admin"));
  }

  async function handleEmailLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const session = await signInWithEmail({ email, password });
      auth.setSession(session);
      await finishLogin(session.token);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Unable to sign in");
    } finally {
      setPending(false);
    }
  }

  async function handleGoogleLogin(idToken: string) {
    setPending(true);
    setError(null);

    try {
      const session = await signInWithGoogle({ idToken });
      auth.setSession(session);
      await finishLogin(session.token);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Google sign-in failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/brand/missu-pro-web-logo.png"
              alt="MissU Pro"
              width={220}
              height={72}
              className="h-10 w-auto brightness-0 invert"
              priority
            />
          </Link>
          <Link href="/agency-login" className="text-sm text-slate-400 hover:text-white transition">
            Agency Portal &rarr;
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/90 p-8 shadow-2xl backdrop-blur">
            {/* Icon + Title */}
            <div className="text-center mb-8">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff6b3d] to-[#ff4500] shadow-lg shadow-[#ff6b3d]/20">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 text-white">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white">Admin Console</h1>
              <p className="text-sm text-slate-400 mt-2">
                Restricted to authorized platform operators
              </p>
            </div>

            {message ? (
              <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                {message}
              </div>
            ) : null}

            <form className="space-y-4" onSubmit={handleEmailLogin}>
              <label className="grid gap-2 text-sm text-slate-300">
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12 rounded-xl border border-slate-600 bg-slate-800 px-4 text-white placeholder-slate-500 outline-none transition focus:border-[#ff6b3d] focus:ring-2 focus:ring-[#ff6b3d]/30"
                  placeholder="admin@missupro.com"
                  required
                />
              </label>
              <label className="grid gap-2 text-sm text-slate-300">
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-12 rounded-xl border border-slate-600 bg-slate-800 px-4 text-white placeholder-slate-500 outline-none transition focus:border-[#ff6b3d] focus:ring-2 focus:ring-[#ff6b3d]/30"
                  placeholder="At least 8 characters"
                  required
                />
              </label>

              {error ? (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={pending}
                className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#ff6b3d] to-[#ff4500] px-5 text-sm font-semibold text-white shadow-lg shadow-[#ff6b3d]/20 hover:from-[#ff7d55] hover:to-[#ff5a1a] disabled:cursor-not-allowed disabled:opacity-60 transition"
              >
                {pending ? "Signing in..." : "Sign in to Admin"}
              </button>
            </form>

            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-500">
                <span className="h-px flex-1 bg-slate-700" />
                or
                <span className="h-px flex-1 bg-slate-700" />
              </div>
              <GoogleAuthButton onCredential={handleGoogleLogin} text="signin_with" />
            </div>

            <p className="mt-6 text-center text-xs text-slate-500 leading-5">
              Only allowlisted emails can access the admin console.
              <br />
              Contact the system administrator if you need access.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
