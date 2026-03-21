"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GoogleAuthButton } from "@/components/google-auth-button";
import { useAuthBridge } from "@/components/auth-bridge";
import { buildPendingAgencySignupInput, retryAgencyAuthRequest } from "@/lib/agency-auth";
import { buildAuthErrorHref } from "@/lib/auth-paths";
import { completeAgencySignupRequest, fetchPortalSession, signInWithEmail, signInWithGoogle } from "@/lib/auth-api";

const REASON_COPY: Record<string, string> = {
  session_expired: "Your session expired. Sign in again to continue.",
  unauthorized_role: "This account does not have agency privileges.",
  agency_record_missing: "Your account exists but the agency profile is missing. Try signing up first.",
  agency_pending_approval: "Your agency is pending admin approval. You'll gain access once approved.",
  service_unavailable: "Auth service temporarily unavailable. Try again shortly.",
};

export default function AgencyLoginClient({
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

    if (session.status === "agency") {
      router.replace(redirectTo ?? "/agency/dashboard");
      return;
    }

    if (session.status === "needs_agency_profile") {
      router.replace("/signup/complete");
      return;
    }

    if (session.status === "agency_pending_approval") {
      router.replace("/auth/pending-approval");
      return;
    }

    router.replace(buildAuthErrorHref(session.reason ?? "unauthorized_role", "agency"));
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

      const portalSession = await retryAgencyAuthRequest(() => fetchPortalSession(session.token, "signup"));

      if (portalSession.status === "agency") {
        router.replace("/agency/dashboard");
        return;
      }

      if (portalSession.status === "agency_pending_approval") {
        router.replace("/auth/pending-approval");
        return;
      }

      if (portalSession.status === "needs_agency_profile") {
        const verificationSession = await retryAgencyAuthRequest(
          () => completeAgencySignupRequest(
            session.token,
            buildPendingAgencySignupInput({
              displayName: session.user.displayName,
              email: session.user.email,
            }),
          ),
        );

        if (verificationSession.status === "agency" || verificationSession.status === "agency_pending_approval") {
          router.replace("/auth/pending-approval");
          return;
        }

        router.replace(buildAuthErrorHref(verificationSession.reason ?? "unauthorized_role", "agency"));
        return;
      }

      router.replace(buildAuthErrorHref(portalSession.reason ?? "unauthorized_role", "agency"));
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Google sign-in failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,107,61,0.15),_transparent_40%),linear-gradient(180deg,#fffaf7_0%,#fff5f0_30%,#f7f8fc_100%)] flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-orange-100 bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/brand/missu-pro-web-logo.png"
              alt="MissU Pro"
              width={220}
              height={72}
              className="h-10 w-auto"
              priority
            />
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/agency-signup" className="text-[#ff6b3d] font-medium hover:underline">
              Create Agency
            </Link>
            <Link href="/admin-login" className="text-slate-500 hover:text-slate-700 transition">
              Admin
            </Link>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-10 items-center">
          {/* Left Info */}
          <div className="hidden lg:block">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#ff6b3d] to-[#ff4500]">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-white">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ff6b3d]">Agency Portal</span>
            </div>
            <h1 className="text-4xl font-bold text-slate-950 leading-tight">
              Manage your models, earnings & agency operations.
            </h1>
            <p className="mt-4 text-slate-600 leading-7 max-w-lg">
              Sign in to access your agency dashboard, manage host rosters, track commissions, and monitor live performance.
            </p>

            <div className="mt-8 space-y-3">
              <div className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-white/90 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#ff6b3d]">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                </div>
                <div>
                  <div className="font-semibold text-slate-950 text-sm">Host Management</div>
                  <div className="text-xs text-slate-500">Add, remove, and monitor your host roster</div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-white/90 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#ff6b3d]">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                </div>
                <div>
                  <div className="font-semibold text-slate-950 text-sm">Revenue Tracking</div>
                  <div className="text-xs text-slate-500">Real-time commission and earnings analytics</div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-white/90 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#ff6b3d]">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg>
                </div>
                <div>
                  <div className="font-semibold text-slate-950 text-sm">Performance Dashboard</div>
                  <div className="text-xs text-slate-500">Live streams, calls, and engagement metrics</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Card */}
          <div className="w-full flex justify-center">
            <div className="w-full max-w-md rounded-[28px] border border-orange-100 bg-white p-7 shadow-[0_20px_60px_rgba(255,107,61,0.08)]">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-950">Agency Sign In</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Access your agency workspace
                </p>
              </div>

              {message ? (
                <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {message}
                </div>
              ) : null}

              <form className="space-y-4" onSubmit={handleEmailLogin}>
                <label className="grid gap-2 text-sm text-slate-700">
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-12 rounded-2xl border border-slate-200 px-4 text-slate-950 outline-none transition focus:border-[#ff6b3d] focus:ring-2 focus:ring-[#ff6b3d]/20"
                    placeholder="ops@your-agency.com"
                    required
                  />
                </label>
                <label className="grid gap-2 text-sm text-slate-700">
                  Password
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-12 rounded-2xl border border-slate-200 px-4 text-slate-950 outline-none transition focus:border-[#ff6b3d] focus:ring-2 focus:ring-[#ff6b3d]/20"
                    placeholder="At least 8 characters"
                    required
                  />
                </label>

                {error ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#ff6b3d] px-5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(255,107,61,0.28)] hover:bg-[#ff7d55] disabled:cursor-not-allowed disabled:opacity-60 transition"
                >
                  {pending ? "Signing in..." : "Sign in"}
                </button>
              </form>

              <div className="mt-5 space-y-3">
                <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-400">
                  <span className="h-px flex-1 bg-slate-200" />
                  Google
                  <span className="h-px flex-1 bg-slate-200" />
                </div>
                <GoogleAuthButton onCredential={handleGoogleLogin} text="signin_with" />
              </div>

              <p className="mt-5 text-center text-xs text-slate-500 leading-5">
                Need an agency account?{" "}
                <Link href="/agency-signup" className="font-medium text-[#ff6b3d] hover:underline">
                  Create one here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
