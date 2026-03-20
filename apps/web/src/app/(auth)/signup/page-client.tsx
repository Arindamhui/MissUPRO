"use client";

import Link from "next/link";
import dynamic from "next/dynamic";

const ClerkSignUp = dynamic(() => import("./sign-up-widget"), { ssr: false });

export default function SignupPageClient({ clerkEnabled }: { clerkEnabled: boolean }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#ff6b3d]">Agency signup</p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-950">Create your agency account</h2>
        <p className="text-sm text-slate-600 mt-2 leading-6">
          Create your Clerk account first. After verification, you will complete your agency profile and enter the agency dashboard automatically.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        Admin accounts are not created here. If you are a platform operator, use <Link href="/login?role=admin" className="font-medium text-[#ff6b3d] hover:underline">admin login</Link> instead.
      </div>

      {clerkEnabled ? (
        <ClerkSignUp />
      ) : (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Clerk is not configured for this web environment. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to enable agency signup here.
        </div>
      )}
    </div>
  );
}