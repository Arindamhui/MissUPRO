import "server-only";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { fetchPortalSession, type PortalSession, type SessionIntent } from "@/lib/auth-api";
import { buildAuthErrorHref } from "@/lib/auth-paths";

function buildLoginHref(role: "admin" | "agency", reason?: string) {
  const params = new URLSearchParams({ role });
  if (reason) {
    params.set("reason", reason);
  }
  return `/login?${params.toString()}`;
}

export async function getPortalSession(intent: SessionIntent): Promise<PortalSession | null> {
  const clerkAuth = await auth();
  if (!clerkAuth.userId) {
    return null;
  }

  const token = await clerkAuth.getToken();
  if (!token) {
    return null;
  }

  try {
    return await fetchPortalSession(token, intent);
  } catch {
    return {
      status: "access_denied",
      reason: "service_unavailable",
      role: null,
      platformRole: null,
      userId: "",
      clerkUserId: "",
      email: "",
      sessionId: null,
    };
  }
}

export async function requirePortalRole(role: "admin" | "agency") {
  const session = await getPortalSession("login");

  if (!session) {
    redirect(buildLoginHref(role, "session_expired"));
  }

  if (session.status === role) {
    return session;
  }

  redirect(buildAuthErrorHref(session.reason ?? "unauthorized_role", role));
}