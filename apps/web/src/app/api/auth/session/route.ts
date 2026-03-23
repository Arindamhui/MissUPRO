import { getAuthCookieNames, verifyAccessToken } from "@missu/auth";
import { db, users, admins } from "@missu/db";
import { eq, isNull, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { jsonError } from "@/server/lib/api";
import { getRequestContext } from "@/server/lib/request";
import type { PortalSession } from "@/lib/auth-api";
import { resolveAgencyAccessForUser } from "@/server/lib/agency-access";
import { normalizeAuthEmail } from "@/server/lib/auth-identity";
import { WEB_AUTH_COOKIE_NAME } from "@/lib/web-auth";

const ADMIN_EMAILS = ["admin@missupro.com", "huiarindam6@gmail.com"];

function getAdminEmails(): string[] {
  const configured = (process.env.ADMIN_EMAILS ?? "").split(",").map((v) => v.trim().toLowerCase()).filter(Boolean);
  const legacy = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  return Array.from(new Set([...ADMIN_EMAILS, ...configured, ...(legacy ? [legacy] : [])]));
}

export async function GET(request: Request) {
  const context = getRequestContext(request);
  const authHeader = request.headers.get("authorization");
  const cookieHeader = request.headers.get("cookie") ?? "";
  const sharedCookieName = getAuthCookieNames().access;
  const sharedCookie = cookieHeader.split(";").map((token) => token.trim()).find((token) => token.startsWith(`${sharedCookieName}=`));
  const legacyCookie = cookieHeader.split(";").map((token) => token.trim()).find((token) => token.startsWith(`${WEB_AUTH_COOKIE_NAME}=`));
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : sharedCookie?.slice(sharedCookieName.length + 1)
      ?? legacyCookie?.slice(WEB_AUTH_COOKIE_NAME.length + 1)
      ?? null;

  if (!token) {
    return NextResponse.json({ status: "access_denied", reason: "unauthorized_role", role: null, platformRole: null, agencyStatus: "NONE", userId: "", email: "", sessionId: null } satisfies PortalSession, { status: 401 });
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
      return NextResponse.json({ status: "access_denied", reason: "unauthorized_role", role: null, platformRole: null, agencyStatus: "NONE", userId: "", email: "", sessionId: null } satisfies PortalSession);
    }

    const email = normalizeAuthEmail(appUser.email);
    const url = new URL(request.url);
    const intent = url.searchParams.get("intent") ?? "login";

    // Check admin
    const [adminRecord] = await db.select().from(admins).where(
      and(eq(admins.userId, appUser.id), isNull(admins.deletedAt))
    ).limit(1);

    const isAllowlisted = getAdminEmails().includes(email);

    if (adminRecord || isAllowlisted) {
      // Auto-provision admin if allowlisted but no record
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
        return NextResponse.json({
          status: "access_denied",
          reason: "admin_signup_forbidden",
          role: null,
          platformRole: "ADMIN",
          agencyStatus: "NONE",
          userId: appUser.id,
          email,
          sessionId,
        } satisfies PortalSession);
      }

      return NextResponse.json({
        status: "admin",
        role: "admin",
        platformRole: "ADMIN",
        agencyStatus: "NONE",
        userId: appUser.id,
        email,
        sessionId,
      } satisfies PortalSession);
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
        return NextResponse.json({
          status: "agency_pending_approval",
          reason: "agency_pending_approval",
          role: "agency",
          platformRole: "AGENCY",
          agencyStatus: approvalStatus,
          userId: appUser.id,
          email,
          sessionId,
          agencyId: ownedAgency.id,
          agencyCode: ownedAgency.agencyCode ?? undefined,
        } satisfies PortalSession);
      }

      return NextResponse.json({
        status: "agency",
        role: "agency",
        platformRole: "AGENCY",
        agencyStatus: "APPROVED",
        userId: appUser.id,
        email,
        sessionId,
        agencyId: ownedAgency.id,
        agencyCode: ownedAgency.agencyCode ?? undefined,
      } satisfies PortalSession);
    }

    // No agency record but has agency role
    if (appUser.authRole === "agency" || appUser.platformRole === "AGENCY") {
      return NextResponse.json({
        status: "access_denied",
        reason: "agency_record_missing",
        role: null,
        platformRole: appUser.platformRole,
        agencyStatus: "NONE",
        userId: appUser.id,
        email,
        sessionId,
      } satisfies PortalSession);
    }

    // Signup intent → needs agency profile
    if (intent === "signup") {
      return NextResponse.json({
        status: "needs_agency_profile",
        role: null,
        platformRole: appUser.platformRole,
        agencyStatus: "NONE",
        userId: appUser.id,
        email,
        sessionId,
      } satisfies PortalSession);
    }

    return NextResponse.json({
      status: "access_denied",
      reason: "unauthorized_role",
      role: null,
      platformRole: appUser.platformRole,
      agencyStatus: "NONE",
      userId: appUser.id,
      email,
      sessionId,
    } satisfies PortalSession);
  } catch (error) {
    return jsonError(error, context);
  }
}
