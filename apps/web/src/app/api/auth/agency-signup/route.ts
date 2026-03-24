import { verifyAccessToken } from "@missu/auth";
import { db, users, admins, agencies, agencyApplications, agencyHosts } from "@missu/db";
import { eq, isNull, and, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { deleteCache, userProfileCacheKey } from "@missu/cache";
import { generateUniquePublicId } from "@missu/utils";
import { jsonError, readJson } from "@/server/lib/api";
import { getRequestContext } from "@/server/lib/request";
import { z } from "zod";
import type { PortalSession } from "@/lib/auth-api";
import { resolveAgencyAccessForUser } from "@/server/lib/agency-access";
import { normalizeAuthEmail } from "@/server/lib/auth-identity";

const agencySignupSchema = z.object({
  agencyName: z.string().trim().min(2).max(120),
  contactName: z.string().trim().min(2).max(120),
  contactEmail: z.string().trim().email().max(320),
  country: z.string().trim().min(2).max(80),
});

export async function POST(request: Request) {
  const context = getRequestContext(request);
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

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
    }).from(users).where(eq(users.id, userId)).limit(1);
    if (!appUser) {
      return NextResponse.json({ status: "access_denied", reason: "unauthorized_role", role: null, platformRole: null, agencyStatus: "NONE", userId: "", email: "", sessionId: null } satisfies PortalSession, { status: 401 });
    }

    const email = normalizeAuthEmail(appUser.email);

    // Check admin - admins can't create agencies from signup
    const [adminRecord] = await db.select().from(admins).where(and(eq(admins.userId, appUser.id), isNull(admins.deletedAt))).limit(1);
    if (adminRecord) {
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

    const input = agencySignupSchema.parse(await readJson(request));

    let existingAgency = (await resolveAgencyAccessForUser(appUser.id, email))?.agency;

    if (!existingAgency) {
      const publicId = await generateUniquePublicId({
        prefix: "A",
        digits: 9,
        exists: async (candidate) => {
          const [existingAgency] = await db
            .select({ id: agencies.id })
            .from(agencies)
            .where(eq(agencies.publicId, candidate))
            .limit(1);

          return Boolean(existingAgency);
        },
      });

      const [created] = await db.insert(agencies).values({
        userId: appUser.id,
        ownerId: appUser.id,
        agencyName: input.agencyName,
        publicId,
        agencyCode: publicId,
        contactName: input.contactName,
        contactEmail: input.contactEmail.trim().toLowerCase(),
        country: input.country,
        status: "APPLICATION",
        approvalStatus: "PENDING",
        metadataJson: { panel: "agency", createdBy: "portal_signup" },
        commissionTier: "STANDARD",
      }).returning();

      existingAgency = created ?? undefined;

      // Create formal agency_applications record for admin review
      if (existingAgency) {
        await db.insert(agencyApplications).values({
          applicantUserId: appUser.id,
          agencyName: input.agencyName,
          contactName: input.contactName,
          contactEmail: input.contactEmail.trim().toLowerCase(),
          country: input.country,
          status: "PENDING" as any,
          createdAgencyId: existingAgency.id,
        }).onConflictDoNothing();
      }
    }

    if (!existingAgency) {
      return NextResponse.json({ status: "access_denied", reason: "agency_record_missing", role: null, platformRole: "AGENCY", agencyStatus: "NONE", userId: appUser.id, email, sessionId } satisfies PortalSession);
    }

    // Ensure agency membership
    await db.insert(agencyHosts).values({
      agencyId: existingAgency.id,
      userId: appUser.id,
      status: "ACTIVE",
    }).onConflictDoNothing();

    // Update user roles
    await db.update(users).set({
      authRole: "agency",
      platformRole: "AGENCY",
      updatedAt: new Date(),
    }).where(eq(users.id, appUser.id));
    await deleteCache(userProfileCacheKey(appUser.id));

    const approvalStatus = existingAgency.approvalStatus ?? "PENDING";
    const isApproved = approvalStatus === "APPROVED";

    if (!isApproved) {
      return NextResponse.json({
        status: "agency_pending_approval",
        reason: "agency_pending_approval",
        role: "agency",
        platformRole: "AGENCY",
        agencyStatus: approvalStatus,
        userId: appUser.id,
        email,
        sessionId,
        agencyId: existingAgency.id,
        agencyCode: existingAgency.agencyCode ?? undefined,
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
      agencyId: existingAgency.id,
      agencyCode: existingAgency.agencyCode ?? undefined,
    } satisfies PortalSession);
  } catch (error) {
    return jsonError(error, context);
  }
}
