"use client";

import Link from "next/link";
import dynamic from "next/dynamic";

const ClerkSignIn = dynamic(() => import("./sign-in-widget"), { ssr: false });

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
  clerkEnabled,
}: {
  role: "admin" | "agency";
  reason: string | null;
  clerkEnabled: boolean;
}) {
  const message = reason ? REASON_COPY[reason] ?? REASON_COPY.unauthorized_role : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#ff6b3d]">Shared login</p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-950">
          {role === "admin" ? "Admin login" : "Agency and admin login"}
        </h2>
        <p className="text-sm text-slate-600 mt-2 leading-6">
          Agency accounts can sign in directly. Admin access is granted only to allowlisted email addresses and is rechecked against the database after sign-in.
        </p>
      </div>

      <div className="flex gap-2 rounded-full bg-slate-100 p-1">
        <Link
          href="/login?role=agency"
          className={`flex-1 rounded-full px-4 py-2 text-center text-sm font-medium ${role === "agency" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"}`}
        >
          Agency
        </Link>
        <Link
          href="/login?role=admin"
          className={`flex-1 rounded-full px-4 py-2 text-center text-sm font-medium ${role === "admin" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"}`}
        >
          Admin
        </Link>
      </div>

      {message ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {message}
        </div>
      ) : null}

      {clerkEnabled ? (
        <ClerkSignIn role={role} />
      ) : (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Clerk is not configured for this web environment. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to enable admin and agency sign-in here.
        </div>
      )}

      <p className="text-xs text-slate-500 leading-5">
        Agency signup is public. Admin accounts must use approved email addresses and cannot be created from the public signup flow.
      </p>
    </div>
  );
}