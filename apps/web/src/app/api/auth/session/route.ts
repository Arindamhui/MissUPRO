import { verifyAccessToken } from "@missu/auth";
import { db, users, admins, agencies } from "@missu/db";
import { eq, isNull, and, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { jsonError } from "@/server/lib/api";
import { getRequestContext } from "@/server/lib/request";
import type { PortalSession } from "@/lib/auth-api";

const ADMIN_EMAILS = ["admin@missupro.com", "huiarindam6@gmail.com"];

function getAdminEmails(): string[] {
  const configured = (process.env.ADMIN_EMAILS ?? "").split(",").map((v) => v.trim().toLowerCase()).filter(Boolean);
  const legacy = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  return Array.from(new Set([...ADMIN_EMAILS, ...configured, ...(legacy ? [legacy] : [])]));
}

export async function GET(request: Request) {
  const context = getRequestContext(request);
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  if (!token) {
    return NextResponse.json({ status: "access_denied", reason: "unauthorized_role", role: null, platformRole: null, userId: "", email: "", sessionId: null } satisfies PortalSession, { status: 401 });
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
    }).from(users).where(eq(users.id, userId)).limit(1);
    if (!appUser) {
      return NextResponse.json({ status: "access_denied", reason: "unauthorized_role", role: null, platformRole: null, userId: "", email: "", sessionId: null } satisfies PortalSession);
    }

    const email = appUser.email.trim().toLowerCase();
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

      if (intent === "signup") {
        return NextResponse.json({
          status: "access_denied",
          reason: "admin_signup_forbidden",
          role: null,
          platformRole: "ADMIN",
          userId: appUser.id,
          email,
          sessionId,
        } satisfies PortalSession);
      }

      return NextResponse.json({
        status: "admin",
        role: "admin",
        platformRole: "ADMIN",
        userId: appUser.id,
        email,
        sessionId,
      } satisfies PortalSession);
    }

    // Check agency ownership
    const [ownedAgency] = await db.select().from(agencies).where(
      and(
        or(eq(agencies.ownerId, appUser.id), eq(agencies.userId, appUser.id)),
        isNull(agencies.deletedAt),
      )
    ).limit(1);

    if (ownedAgency) {
      const approvalStatus = ownedAgency.approvalStatus ?? "PENDING";

      if (approvalStatus !== "APPROVED") {
        return NextResponse.json({
          status: "agency_pending_approval",
          reason: "agency_pending_approval",
          role: "agency",
          platformRole: "AGENCY",
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
      userId: appUser.id,
      email,
      sessionId,
    } satisfies PortalSession);
  } catch (error) {
    return jsonError(error, context);
  }
}
