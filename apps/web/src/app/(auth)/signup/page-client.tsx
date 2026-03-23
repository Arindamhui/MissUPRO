"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GoogleAuthButton } from "@/components/google-auth-button";
import { useAuthBridge } from "@/components/auth-bridge";
import { retryAgencyAuthRequest } from "@/lib/agency-auth";
import { completeAgencySignupRequest, signInWithGoogle, signUpWithEmail } from "@/lib/auth-api";

export default function SignupPageClient() {
  const router = useRouter();
  const auth = useAuthBridge();
  const [displayName, setDisplayName] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [country, setCountry] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function completeSignup() {
    router.replace("/auth/pending-approval");
    router.refresh();
  }

  async function handleEmailSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (agencyName.trim().length < 2 || contactName.trim().length < 2 || country.trim().length < 2) {
      setError("Agency name, contact name, and country are required");
      return;
    }

    setPending(true);
    setError(null);

    try {
      const session = await signUpWithEmail({
        displayName,
        email,
        password,
        referralCode: referralCode.trim() || undefined,
      });
      await retryAgencyAuthRequest(() => completeAgencySignupRequest(session.token, {
        agencyName: agencyName.trim(),
        contactName: contactName.trim(),
        contactEmail: session.user.email,
        country: country.trim(),
      }));
      auth.setSession(session);
      await completeSignup();
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : "Unable to create account");
    } finally {
      setPending(false);
    }
  }

  async function handleGoogleSignup(idToken: string) {
    if (agencyName.trim().length < 2 || contactName.trim().length < 2 || country.trim().length < 2) {
      setError("Agency name, contact name, and country are required");
      return;
    }

    setPending(true);
    setError(null);

    try {
      const session = await signInWithGoogle({
        idToken,
        displayName: displayName.trim() || undefined,
        referralCode: referralCode.trim() || undefined,
      });
      await retryAgencyAuthRequest(() => completeAgencySignupRequest(session.token, {
        agencyName: agencyName.trim(),
        contactName: contactName.trim(),
        contactEmail: session.user.email,
        country: country.trim(),
      }));
      auth.setSession(session);
      await completeSignup();
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : "Google sign-up failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#ff6b3d]">Agency signup</p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-950">Create your agency account</h2>
        <p className="text-sm text-slate-600 mt-2 leading-6">
          Create your account with email/password or Google. Your agency request will be submitted for admin verification before dashboard access is enabled.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        Admin accounts are not created here. If you are a platform operator, use <Link href="/admin-login" className="font-medium text-[#ff6b3d] hover:underline">admin login</Link> instead.
      </div>

      <form className="space-y-4" onSubmit={handleEmailSignup}>
        <label className="grid gap-2 text-sm text-slate-700">
          Agency name
          <input
            value={agencyName}
            onChange={(event) => setAgencyName(event.target.value)}
            className="h-12 rounded-2xl border border-slate-200 px-4 text-slate-950 outline-none transition focus:border-[#ff6b3d] focus:ring-2 focus:ring-[#ff6b3d]/20"
            placeholder="North Star Agency"
            required
          />
        </label>
        <label className="grid gap-2 text-sm text-slate-700">
          Contact name
          <input
            value={contactName}
            onChange={(event) => setContactName(event.target.value)}
            className="h-12 rounded-2xl border border-slate-200 px-4 text-slate-950 outline-none transition focus:border-[#ff6b3d] focus:ring-2 focus:ring-[#ff6b3d]/20"
            placeholder="Aisha Rahman"
            required
          />
        </label>
        <label className="grid gap-2 text-sm text-slate-700">
          Display name
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="h-12 rounded-2xl border border-slate-200 px-4 text-slate-950 outline-none transition focus:border-[#ff6b3d] focus:ring-2 focus:ring-[#ff6b3d]/20"
            placeholder="Aisha Rahman"
            required
          />
        </label>
        <label className="grid gap-2 text-sm text-slate-700">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-12 rounded-2xl border border-slate-200 px-4 text-slate-950 outline-none transition focus:border-[#ff6b3d] focus:ring-2 focus:ring-[#ff6b3d]/20"
            placeholder="ops@northstar.agency"
            required
          />
        </label>
        <label className="grid gap-2 text-sm text-slate-700">
          Country
          <input
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            className="h-12 rounded-2xl border border-slate-200 px-4 text-slate-950 outline-none transition focus:border-[#ff6b3d] focus:ring-2 focus:ring-[#ff6b3d]/20"
            placeholder="India"
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
        <label className="grid gap-2 text-sm text-slate-700">
          Confirm password
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="h-12 rounded-2xl border border-slate-200 px-4 text-slate-950 outline-none transition focus:border-[#ff6b3d] focus:ring-2 focus:ring-[#ff6b3d]/20"
            placeholder="Repeat your password"
            required
          />
        </label>
        <label className="grid gap-2 text-sm text-slate-700">
          Referral code
          <input
            value={referralCode}
            onChange={(event) => setReferralCode(event.target.value)}
            className="h-12 rounded-2xl border border-slate-200 px-4 text-slate-950 outline-none transition focus:border-[#ff6b3d] focus:ring-2 focus:ring-[#ff6b3d]/20"
            placeholder="Optional"
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
          {pending ? "Creating account..." : "Create account"}
        </button>
      </form>

      <div className="space-y-3">
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          Google
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        <GoogleAuthButton onCredential={handleGoogleSignup} text="signup_with" />
      </div>

      <p className="text-xs text-slate-500 leading-5">
        Already registered? <Link href="/agency-login" className="font-medium text-[#ff6b3d] hover:underline">Sign in to the agency panel</Link>.
      </p>
    </div>
  );
}