"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GoogleAuthButton } from "@/components/google-auth-button";
import { useAuthBridge } from "@/components/auth-bridge";
import { buildPendingAgencySignupInput, retryAgencyAuthRequest } from "@/lib/agency-auth";
import { buildAuthErrorHref } from "@/lib/auth-paths";
import { completeAgencySignupRequest, fetchPortalSession, signInWithEmail, signInWithGoogle } from "@/lib/auth-api";

const REASON_COPY: Record<string, string> = {
  session_expired: "Your session expired. Sign in again to continue.",
  unauthorized_role: "This account is signed in, but it does not have the required database role for this portal.",
  agency_record_missing: "Your account is recognized, but the agency profile is missing. Sign in again or complete agency setup.",
  agency_pending_approval: "Your agency account is registered but waiting for admin approval. You will gain access once approved.",
  service_unavailable: "Role validation is temporarily unavailable. Try again in a moment.",
  admin_signup_forbidden: "Admin accounts cannot be created from the public signup flow. Use an approved admin account to sign in.",
};

export default function LoginPageClient({
  role,
  reason,
  redirectTo,
  lockRole = false,
}: {
  role: "admin" | "agency" | null;
  reason: string | null;
  redirectTo: string | null;
  lockRole?: boolean;
}) {
  const router = useRouter();
  const auth = useAuthBridge();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const message = reason ? REASON_COPY[reason] ?? REASON_COPY.unauthorized_role : null;

  async function finishLogin(token: string) {
    if (!role) {
      router.replace(redirectTo ?? "/");
      router.refresh();
      return;
    }

    const session = await fetchPortalSession(token, "login");

    if (role === "admin") {
      if (session.status === "admin") {
        router.replace("/admin/dashboard");
        return;
      }

      router.replace(buildAuthErrorHref("unauthorized_role", "admin"));
      return;
    }

    if (session.status === "agency") {
      router.replace("/agency/dashboard");
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

    router.replace(buildAuthErrorHref(session.reason ?? "unauthorized_role", role));
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

       if (role === "agency") {
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
        return;
      }

      await finishLogin(session.token);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Google sign-in failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#ff6b3d]">
          {role === "admin" ? "Admin access" : role === "agency" ? "Agency access" : "Shared login"}
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-950">
          {role === "admin" ? "Admin login" : role === "agency" ? "Agency login" : "Account login"}
        </h2>
        <p className="text-sm text-slate-600 mt-2 leading-6">
          {role === "admin"
            ? "Use an approved operator account. Admin access is allowlist-controlled and revalidated against the database after sign-in."
            : role === "agency"
              ? "Sign in to the agency workspace with email/password or Google. New agencies should register first, then complete their profile."
              : "Sign in with your email and password or use Google. Admin access is still allowlist-controlled and revalidated against the database after sign-in."}
        </p>
      </div>

      {lockRole ? null : (
        <div className="flex gap-2 rounded-full bg-slate-100 p-1">
          <Link
            href="/agency-login"
            className={`flex-1 rounded-full px-4 py-2 text-center text-sm font-medium ${role === "agency" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"}`}
          >
            Agency
          </Link>
          <Link
            href="/admin-login"
            className={`flex-1 rounded-full px-4 py-2 text-center text-sm font-medium ${role === "admin" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"}`}
          >
            Admin
          </Link>
        </div>
      )}

      {message ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
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
            placeholder="name@example.com"
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
          className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#ff6b3d] px-5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(255,107,61,0.28)] hover:bg-[#ff7d55] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="space-y-3">
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          Google
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        <GoogleAuthButton onCredential={handleGoogleLogin} text="signin_with" />
      </div>

      <p className="text-xs text-slate-500 leading-5">
        {role === "agency"
          ? <>Need an agency account? <Link href="/agency-signup" className="font-medium text-[#ff6b3d] hover:underline">Create one here</Link>.</>
          : "Agency signup is public. Admin accounts must use approved email addresses and cannot be created from the public signup flow."}
      </p>
    </div>
  );
}