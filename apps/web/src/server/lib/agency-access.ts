import { deleteCache, agencyCacheKey, userProfileCacheKey } from "@missu/cache";
import { db, agencies, agencyHosts, users } from "@missu/db";
import { and, desc, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";

import { normalizeAuthEmail } from "@/server/lib/auth-identity";

type AgencyAccessRecord = typeof agencies.$inferSelect;

async function canClaimAgencyForUser(agency: AgencyAccessRecord, userId: string, normalizedEmail: string) {
  const linkedUserIds = Array.from(new Set([agency.ownerId, agency.userId].filter((value): value is string => Boolean(value))));

  if (linkedUserIds.length > 0) {
    const linkedUsers = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(inArray(users.id, linkedUserIds));

    if (linkedUsers.length !== linkedUserIds.length) {
      return false;
    }

    if (!linkedUsers.every((linkedUser) => normalizeAuthEmail(linkedUser.email) === normalizedEmail)) {
      return false;
    }
  }

  const [existingAgencyForUser] = await db
    .select({ id: agencies.id })
    .from(agencies)
    .where(and(eq(agencies.userId, userId), ne(agencies.id, agency.id)))
    .limit(1);

  return !existingAgencyForUser;
}

export async function resolveAgencyAccessForUser(userId: string, email: string) {
  const normalizedEmail = normalizeAuthEmail(email);
  const directRank = sql<number>`case when ${agencies.ownerId} = ${userId} or ${agencies.userId} = ${userId} then 1 else 0 end`;
  const approvalRank = sql<number>`case when ${agencies.approvalStatus} = 'APPROVED' then 2 when ${agencies.approvalStatus} = 'PENDING' then 1 else 0 end`;

  const [candidate] = await db
    .select()
    .from(agencies)
    .where(and(
      isNull(agencies.deletedAt),
      or(
        eq(agencies.ownerId, userId),
        eq(agencies.userId, userId),
        sql`lower(${agencies.contactEmail}) = ${normalizedEmail}`,
      ),
    ))
    .orderBy(desc(approvalRank), desc(directRank), desc(agencies.createdAt))
    .limit(1);

  if (!candidate) {
    return null;
  }

  const isDirectMatch = candidate.ownerId === userId || candidate.userId === userId;
  if (isDirectMatch || normalizeAuthEmail(candidate.contactEmail) !== normalizedEmail) {
    return { agency: candidate, reconciled: false };
  }

  if (!(await canClaimAgencyForUser(candidate, userId, normalizedEmail))) {
    return { agency: candidate, reconciled: false };
  }

  const [reconciledAgency] = await db.transaction(async (tx) => {
    // Re-verify ownership inside transaction to prevent race conditions
    const [fresh] = await tx.select().from(agencies).where(eq(agencies.id, candidate.id)).limit(1);
    if (!fresh || (fresh.ownerId && fresh.ownerId !== userId && fresh.ownerId !== candidate.ownerId)) {
      return [candidate];
    }

    const [updatedAgency] = await tx
      .update(agencies)
      .set({ ownerId: userId, userId, updatedAt: new Date() })
      .where(eq(agencies.id, candidate.id))
      .returning();

    await tx
      .insert(agencyHosts)
      .values({ agencyId: candidate.id, userId, status: "ACTIVE" })
      .onConflictDoNothing();

    await tx
      .update(users)
      .set({ platformRole: "AGENCY", authRole: "agency", updatedAt: new Date() })
      .where(eq(users.id, userId));

    return [updatedAgency ?? candidate];
  });

  await deleteCache(agencyCacheKey(candidate.id));

  const cacheUserIds = Array.from(new Set([userId, candidate.ownerId, candidate.userId].filter((value): value is string => Boolean(value))));
  await Promise.all(cacheUserIds.map((cacheUserId) => deleteCache(userProfileCacheKey(cacheUserId))));

  return { agency: reconciledAgency, reconciled: true };
}