"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useClerk, useAuth } from "@clerk/nextjs";

function PendingApprovalContent({ clerkEnabled }: { clerkEnabled: boolean }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#ff6b3d]">
          Account registered
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-950">
          Pending admin approval
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Your agency account has been successfully registered. An admin will review your
          application and approve your account. Once approved, you will be able to access
          the agency dashboard.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
        <p className="font-medium">What happens next?</p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>A platform admin will review your agency profile</li>
          <li>Once approved, your account will be activated</li>
          <li>You will receive a unique Agency ID for your models</li>
          <li>Your models can then use the Agency ID to access the Model Panel</li>
        </ul>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        {clerkEnabled
          ? "You will be signed out automatically and can try logging in again after approval."
          : "Clerk is not configured for this web environment, so automatic sign-out is skipped."}
      </div>

      <div className="flex gap-3">
        <Link
          href="/login?role=agency"
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

function PendingApprovalWithClerk({ clerkEnabled }: { clerkEnabled: boolean }) {
  const { signOut } = useClerk();
  const { isSignedIn } = useAuth();

  useEffect(() => {
    if (!isSignedIn) return;
    const timeout = setTimeout(() => {
      void signOut({ redirectUrl: "/login?role=agency&reason=agency_pending_approval" });
    }, 8000);
    return () => clearTimeout(timeout);
  }, [isSignedIn, signOut]);

  return <PendingApprovalContent clerkEnabled={clerkEnabled} />;
}

export default function PendingApprovalPageClient({ clerkEnabled }: { clerkEnabled: boolean }) {
  if (!clerkEnabled) {
    return <PendingApprovalContent clerkEnabled={clerkEnabled} />;
  }

  return <PendingApprovalWithClerk clerkEnabled={clerkEnabled} />;
}