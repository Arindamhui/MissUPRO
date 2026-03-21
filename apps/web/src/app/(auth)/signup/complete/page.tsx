import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/auth-server";
import { buildAuthErrorHref } from "@/lib/auth-paths";
import { CompleteAgencySignupForm } from "./complete-agency-signup-form";

export default async function CompleteAgencySignupPage() {
  const session = await getPortalSession("signup");

  if (!session) {
    redirect("/agency-signup");
  }

  if (session.status === "admin") {
    redirect("/admin/dashboard");
  }

  if (session.status === "agency") {
    redirect("/agency/dashboard");
  }

  if (session.status === "agency_pending_approval") {
    redirect("/auth/pending-approval");
  }

  if (session.status === "access_denied") {
    redirect(buildAuthErrorHref(session.reason ?? "unauthorized_role", "agency"));
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#ff6b3d]">Final step</p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-950">Complete your agency profile</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          This information creates the agency record in PostgreSQL and unlocks the protected agency dashboard.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
        Your account is already active. Submitting this form links your identity to the database user and agency profile.
      </div>

      <CompleteAgencySignupForm />
    </div>
  );
}