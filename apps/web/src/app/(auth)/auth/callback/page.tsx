import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/auth-server";
import { buildAuthErrorHref } from "@/lib/auth-paths";

type CallbackPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AuthCallbackPage({ searchParams }: CallbackPageProps) {
  const params = await searchParams;
  const rawIntent = params.intent;
  const intent = rawIntent === "signup" ? "signup" : "login";
  const requestedRole = params.role === "admin" ? "admin" : "agency";
  const session = await getPortalSession(intent);

  if (!session) {
    redirect(intent === "signup" ? "/signup" : `/login?role=${requestedRole}&reason=session_expired`);
  }

  if (session.status === "admin") {
    redirect("/admin/dashboard");
  }

  if (session.status === "agency") {
    redirect("/agency/dashboard");
  }

  if (session.status === "needs_agency_profile") {
    redirect("/signup/complete");
  }

  if (session.status === "agency_pending_approval") {
    redirect("/auth/pending-approval");
  }

  redirect(buildAuthErrorHref(session.reason ?? "unauthorized_role", requestedRole));
}