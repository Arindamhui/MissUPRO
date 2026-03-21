"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GoogleAuthButton } from "@/components/google-auth-button";
import { useAuthBridge } from "@/components/auth-bridge";
import { buildPendingAgencySignupInput, retryAgencyAuthRequest } from "@/lib/agency-auth";
import { completeAgencySignupRequest, signInWithGoogle, signUpWithEmail } from "@/lib/auth-api";

export default function AgencySignupClient() {
  const router = useRouter();
  const auth = useAuthBridge();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

    setPending(true);
    setError(null);

    try {
      const session = await signUpWithEmail({
        displayName,
        email,
        password,
        referralCode: referralCode.trim() || undefined,
      });
      await retryAgencyAuthRequest(() => completeAgencySignupRequest(session.token, buildPendingAgencySignupInput({
        displayName: session.user.displayName,
        email: session.user.email,
      })));
      auth.setSession(session);
      await completeSignup();
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : "Unable to create account");
    } finally {
      setPending(false);
    }
  }

  async function handleGoogleSignup(idToken: string) {
    setPending(true);
    setError(null);

    try {
      const session = await signInWithGoogle({
        idToken,
        displayName: displayName.trim() || undefined,
        referralCode: referralCode.trim() || undefined,
      });
      await retryAgencyAuthRequest(() => completeAgencySignupRequest(session.token, buildPendingAgencySignupInput({
        displayName: session.user.displayName,
        email: session.user.email,
      })));
      auth.setSession(session);
      await completeSignup();
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : "Google sign-up failed");
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
            <Link href="/agency-login" className="text-slate-600 hover:text-slate-950">
              Agency Login
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
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
              </div>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ff6b3d]">New Agency</span>
            </div>
            <h1 className="text-4xl font-bold text-slate-950 leading-tight">
              Start managing your talent on MissU Pro.
            </h1>
            <p className="mt-4 text-slate-600 leading-7 max-w-lg">
              Create your agency account, set up your profile, and submit for admin verification. Once approved, you'll have full access to manage hosts, track earnings, and grow your agency.
            </p>

            <div className="mt-8 space-y-3 max-w-md">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ff6b3d] text-white text-sm font-bold">1</div>
                <span className="text-slate-700 text-sm">Create your account with email or Google</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ff6b3d]/70 text-white text-sm font-bold">2</div>
                <span className="text-slate-700 text-sm">Agency profile is auto-submitted for review</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ff6b3d]/40 text-white text-sm font-bold">3</div>
                <span className="text-slate-700 text-sm">Admin approves and you get dashboard access</span>
              </div>
            </div>
          </div>

          {/* Right Card */}
          <div className="w-full flex justify-center">
            <div className="w-full max-w-md rounded-[28px] border border-orange-100 bg-white p-7 shadow-[0_20px_60px_rgba(255,107,61,0.08)]">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-950">Create Agency Account</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Fill in your details to get started
                </p>
              </div>

              <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                Admin accounts are not created here. If you're a platform operator, use{" "}
                <Link href="/admin-login" className="font-medium text-[#ff6b3d] hover:underline">admin login</Link>.
              </div>

              <form className="space-y-4" onSubmit={handleEmailSignup}>
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
                  className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#ff6b3d] px-5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(255,107,61,0.28)] hover:bg-[#ff7d55] disabled:cursor-not-allowed disabled:opacity-60 transition"
                >
                  {pending ? "Creating account..." : "Create account"}
                </button>
              </form>

              <div className="mt-5 space-y-3">
                <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-400">
                  <span className="h-px flex-1 bg-slate-200" />
                  Google
                  <span className="h-px flex-1 bg-slate-200" />
                </div>
                <GoogleAuthButton onCredential={handleGoogleSignup} text="signup_with" />
              </div>

              <p className="mt-5 text-center text-xs text-slate-500 leading-5">
                Already registered?{" "}
                <Link href="/agency-login" className="font-medium text-[#ff6b3d] hover:underline">
                  Sign in to the agency panel
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
