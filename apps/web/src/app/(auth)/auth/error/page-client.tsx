"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useAuthBridge } from "@/components/auth-bridge";

const DEFAULT_MESSAGE = {
  title: "Access denied",
  description: "This account is authenticated but does not have an authorized admin or agency role in the database.",
};

const MESSAGE_MAP: Record<string, { title: string; description: string }> = {
  admin_signup_forbidden: {
    title: "Admin signup is disabled",
    description: "Admin accounts cannot be created through the public signup flow. Use the admin login entry with an approved email address.",
  },
  unauthorized_role: {
    title: DEFAULT_MESSAGE.title,
    description: DEFAULT_MESSAGE.description,
  },
  agency_record_missing: {
    title: "Agency profile missing",
    description: "Your session is marked as an agency account, but the agency record was not found. Complete agency setup again or contact support.",
  },
  agency_pending_approval: {
    title: "Agency pending approval",
    description: "Your agency account has been registered and is awaiting admin approval. You will be able to access the agency dashboard once an admin activates your account.",
  },
  service_unavailable: {
    title: "Auth service unavailable",
    description: "Role validation could not be completed right now. Try again in a moment.",
  },
};

function resolveMessage(reason: string, role: "admin" | "agency") {
  if (reason === "unauthorized_role") {
    return role === "admin"
      ? {
        title: "Admin access not granted",
        description: "This account authenticated successfully, but it is not allowlisted as an admin in the database. Sign in with an approved admin email or use the agency portal instead.",
      }
      : DEFAULT_MESSAGE;
  }

  if (reason === "agency_record_missing") {
    return {
      title: "Agency profile missing",
      description: "Your account exists, but the linked agency profile was not found. Complete agency setup again to unlock the agency dashboard.",
    };
  }

  return MESSAGE_MAP[reason] ?? DEFAULT_MESSAGE;
}

function AuthErrorPageContent({
  reason,
  role,
  signedOut,
}: {
  reason: string;
  role: "admin" | "agency";
  signedOut: boolean;
}) {
  const copy = resolveMessage(reason, role);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#ff6b3d]">Authorization failed</p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-950">{copy.title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{copy.description}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
        Protected routes and backend procedures validate the session against the database role before access is granted.
      </div>

      {signedOut ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          The current app session was cleared so you can retry with the correct account.
        </div>
      ) : null}

      <div className="flex gap-3">
        <Link href={role === "admin" ? "/admin-login" : "/agency-login"} className="inline-flex h-11 items-center justify-center rounded-full bg-[#ff6b3d] px-5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(255,107,61,0.28)] hover:bg-[#ff7d55]">
          {role === "admin" ? "Return to admin login" : "Return to agency login"}
        </Link>
        {role === "admin" ? (
          <Link href="/agency-login" className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Use agency login
          </Link>
        ) : (
          <Link href="/agency-signup" className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Agency signup
          </Link>
        )}
      </div>
    </div>
  );
}

export default function AuthErrorPageClient(props: {
  reason: string;
  role: "admin" | "agency";
  signedOut: boolean;
}) {
  const auth = useAuthBridge();

  useEffect(() => {
    if (!auth.isSignedIn || props.signedOut) {
      return;
    }

    void auth.signOut();
  }, [auth, props.signedOut]);

  return <AuthErrorPageContent {...props} />;
}