import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthCookieNames, verifyAccessToken } from "@missu/auth";
import { db, users, admins } from "@missu/db";
import { eq, isNull, and } from "drizzle-orm";
import type { PortalSession, SessionIntent } from "@/lib/auth-api";
import { buildAuthErrorHref } from "@/lib/auth-paths";
import { WEB_AUTH_COOKIE_NAME } from "@/lib/web-auth";
import { resolveAgencyAccessForUser } from "@/server/lib/agency-access";
import { normalizeAuthEmail } from "@/server/lib/auth-identity";

const ADMIN_EMAILS = ["admin@missupro.com", "huiarindam6@gmail.com"];

function getAdminEmails(): string[] {
  const configured = (process.env.ADMIN_EMAILS ?? "").split(",").map((v) => v.trim().toLowerCase()).filter(Boolean);
  const legacy = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  return Array.from(new Set([...ADMIN_EMAILS, ...configured, ...(legacy ? [legacy] : [])]));
}

function buildLoginHref(role: "admin" | "agency", reason?: string) {
  const params = new URLSearchParams();
  if (reason) {
    params.set("reason", reason);
  }
  const pathname = role === "admin" ? "/admin-login" : "/agency-login";
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export async function getPortalSession(intent: SessionIntent): Promise<PortalSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAuthCookieNames().access)?.value ?? cookieStore.get(WEB_AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const claims = await verifyAccessToken(token);
    const userId = claims.sub;
    const sessionId = typeof claims.sid === "string" ? claims.sid : null;

    const [appUser] = await db.select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      authRole: users.authRole,
      platformRole: users.platformRole,
      role: users.role,
    }).from(users).where(eq(users.id, userId)).limit(1);
    if (!appUser) {
      return null;
    }

    const email = normalizeAuthEmail(appUser.email);

    // Check admin
    const [adminRecord] = await db.select().from(admins).where(
      and(eq(admins.userId, appUser.id), isNull(admins.deletedAt))
    ).limit(1);
    const isAllowlisted = getAdminEmails().includes(email);

    if (adminRecord || isAllowlisted) {
      if (!adminRecord && isAllowlisted) {
        await db.insert(admins).values({
          userId: appUser.id,
          email,
          adminName: appUser.displayName ?? email.split("@")[0] ?? "Admin",
          isActive: true,
          mfaEnabled: false,
        }).onConflictDoNothing();
      }

      if (appUser.platformRole !== "ADMIN" || appUser.authRole !== "admin" || appUser.role !== "ADMIN") {
        await db.update(users).set({
          platformRole: "ADMIN" as any,
          authRole: "admin" as any,
          role: "ADMIN" as any,
          updatedAt: new Date(),
          lastActiveAt: new Date(),
        }).where(eq(users.id, appUser.id));
      }

      if (intent === "signup") {
        return { status: "access_denied", reason: "admin_signup_forbidden", role: null, platformRole: "ADMIN", agencyStatus: "NONE", userId: appUser.id, email, sessionId };
      }

      return { status: "admin", role: "admin", platformRole: "ADMIN", agencyStatus: "NONE", userId: appUser.id, email, sessionId };
    }

    const ownedAgency = (await resolveAgencyAccessForUser(appUser.id, email))?.agency;

    if (ownedAgency) {
      const approvalStatus = ownedAgency.approvalStatus ?? "PENDING";

      if (appUser.platformRole !== "AGENCY" || appUser.authRole !== "agency") {
        await db.update(users).set({
          platformRole: "AGENCY" as any,
          authRole: "agency" as any,
          role: "HOST" as any,
          updatedAt: new Date(),
          lastActiveAt: new Date(),
        }).where(eq(users.id, appUser.id));
      }

      if (approvalStatus !== "APPROVED") {
        return { status: "agency_pending_approval", reason: "agency_pending_approval", role: "agency", platformRole: "AGENCY", agencyStatus: approvalStatus, userId: appUser.id, email, sessionId, agencyId: ownedAgency.id, agencyCode: ownedAgency.agencyCode ?? undefined };
      }
      return { status: "agency", role: "agency", platformRole: "AGENCY", agencyStatus: "APPROVED", userId: appUser.id, email, sessionId, agencyId: ownedAgency.id, agencyCode: ownedAgency.agencyCode ?? undefined };
    }

    if (appUser.authRole === "agency" || appUser.platformRole === "AGENCY") {
      return { status: "access_denied", reason: "agency_record_missing", role: null, platformRole: appUser.platformRole, agencyStatus: "NONE", userId: appUser.id, email, sessionId };
    }

    if (intent === "signup") {
      return { status: "needs_agency_profile", role: null, platformRole: appUser.platformRole, agencyStatus: "NONE", userId: appUser.id, email, sessionId };
    }

    return { status: "access_denied", reason: "unauthorized_role", role: null, platformRole: appUser.platformRole, agencyStatus: "NONE", userId: appUser.id, email, sessionId };
  } catch {
    // Token invalid/expired — treat as no session
    return null;
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