"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useAuthBridge } from "@/components/auth-bridge";

function PendingApprovalContent() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#ff6b3d]">
          Agency verification
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-950">
          Your account is under admin verification
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Your account is under admin verification. After verification, you will be added as an agency and
          you will be able to access the agency dashboard.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
        <p className="font-medium">What happens next?</p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>A platform admin will review your new agency request</li>
          <li>After verification, your account will be activated as an agency</li>
          <li>You will then be able to sign in to the agency dashboard</li>
          <li>Your agency ID will be ready for roster and model onboarding</li>
        </ul>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        You will be signed out automatically and can try logging in again after approval.
      </div>

      <div className="flex gap-3">
        <Link
          href="/agency-login"
          className="inline-flex h-11 items-center justify-center rounded-full bg-[#ff6b3d] px-5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(255,107,61,0.28)] hover:bg-[#ff7d55]"
        >
          Return to login
        </Link>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Go to homepage
        </Link>
      </div>
    </div>
  );
}

export default function PendingApprovalPageClient() {
  const auth = useAuthBridge();

  useEffect(() => {
    if (!auth.isSignedIn) return;
    const timeout = setTimeout(() => {
      void auth.signOut();
    }, 8000);
    return () => clearTimeout(timeout);
  }, [auth]);

  return <PendingApprovalContent />;
}