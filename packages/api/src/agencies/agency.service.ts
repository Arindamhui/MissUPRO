import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import { agencies, agencyHosts, models, users } from "@missu/db/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { DEFAULTS } from "@missu/config";
import { decodeCursor, encodeCursor } from "@missu/utils";

@Injectable()
export class AgencyService {
  async applyAsAgency(userId: string, data: { name: string; contactName: string; contactEmail: string; country: string }) {
    const [agency] = await db
      .insert(agencies)
      .values({
        agencyName: data.name,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        country: data.country,
        status: "PENDING",
        commissionTier: DEFAULTS.AGENCY_COMMISSION_TIERS[0]?.name ?? "STANDARD",
      })
      .returning();

    // Make the applying user the first host with ACTIVE status
    await db.insert(agencyHosts).values({
      agencyId: agency.id,
      userId,
      status: "ACTIVE" as any,
    });

    return agency;
  }

  async getAgencyDashboard(userId: string) {
    // Find agency where this user is a host
    const [hostRecord] = await db.select().from(agencyHosts)
      .where(and(eq(agencyHosts.userId, userId), eq(agencyHosts.status, "ACTIVE" as any)))
      .limit(1);
    if (!hostRecord) throw new Error("Agency not found");

    const [agency] = await db.select().from(agencies).where(eq(agencies.id, hostRecord.agencyId)).limit(1);
    if (!agency) throw new Error("Agency not found");

    const hostCount = await db.select({ count: count() }).from(agencyHosts)
      .where(and(eq(agencyHosts.agencyId, agency.id), eq(agencyHosts.status, "ACTIVE" as any)));

    const hosts = await db
      .select({
        userId: agencyHosts.userId,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        assignedAt: agencyHosts.assignedAt,
      })
      .from(agencyHosts)
      .innerJoin(users, eq(users.id, agencyHosts.userId))
      .where(and(eq(agencyHosts.agencyId, agency.id), eq(agencyHosts.status, "ACTIVE" as any)))
      .orderBy(desc(agencyHosts.assignedAt));

    return {
      agency,
      hostCount: Number(hostCount[0]?.count ?? 0),
      hosts,
    };
  }

  async inviteHost(agencyManagerUserId: string, hostUserId: string) {
    const [hostRecord] = await db.select().from(agencyHosts)
      .where(and(eq(agencyHosts.userId, agencyManagerUserId), eq(agencyHosts.status, "ACTIVE" as any)))
      .limit(1);
    if (!hostRecord) throw new Error("You are not an active agency member");

    const [agency] = await db.select().from(agencies)
      .where(and(eq(agencies.id, hostRecord.agencyId), eq(agencies.status, "ACTIVE")))
      .limit(1);
    if (!agency) throw new Error("Active agency not found");

    const [model] = await db.select().from(models).where(eq(models.userId, hostUserId)).limit(1);
    if (!model) throw new Error("User is not a model");

    const existing = await db.select().from(agencyHosts)
      .where(and(eq(agencyHosts.agencyId, agency.id), eq(agencyHosts.userId, hostUserId)))
      .limit(1);
    if (existing[0]) throw new Error("Host already in agency");

    const [host] = await db
      .insert(agencyHosts)
      .values({
        agencyId: agency.id,
        userId: hostUserId,
        status: "ACTIVE" as any,
      })
      .returning();

    return host;
  }

  async acceptInvite(hostUserId: string, agencyId: string) {
    const [updated] = await db
      .update(agencyHosts)
      .set({ status: "ACTIVE" as any })
      .where(and(eq(agencyHosts.agencyId, agencyId), eq(agencyHosts.userId, hostUserId)))
      .returning();

    if (!updated) throw new Error("Invitation not found");
    return updated;
  }

  async getHostRoster(agencyManagerUserId: string, cursor?: string, limit = 20) {
    const [hostRecord] = await db.select().from(agencyHosts)
      .where(and(eq(agencyHosts.userId, agencyManagerUserId), eq(agencyHosts.status, "ACTIVE" as any)))
      .limit(1);
    if (!hostRecord) throw new Error("Agency not found");

    const offset = cursor ? decodeCursor(cursor) : 0;
    const results = await db
      .select({
        userId: agencyHosts.userId,
        status: agencyHosts.status,
        assignedAt: agencyHosts.assignedAt,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        qualityScore: models.qualityScore,
      })
      .from(agencyHosts)
      .innerJoin(users, eq(users.id, agencyHosts.userId))
      .leftJoin(models, eq(models.userId, agencyHosts.userId))
      .where(eq(agencyHosts.agencyId, hostRecord.agencyId))
      .orderBy(desc(agencyHosts.assignedAt))
      .limit(limit + 1)
      .offset(offset);

    const hasMore = results.length > limit;
    return { items: hasMore ? results.slice(0, limit) : results, nextCursor: hasMore ? encodeCursor(offset + limit) : null };
  }

  async removeHost(agencyManagerUserId: string, hostUserId: string) {
    const [hostRecord] = await db.select().from(agencyHosts)
      .where(and(eq(agencyHosts.userId, agencyManagerUserId), eq(agencyHosts.status, "ACTIVE" as any)))
      .limit(1);
    if (!hostRecord) throw new Error("Agency not found");

    await db.update(agencyHosts)
      .set({ status: "REMOVED" as any })
      .where(and(eq(agencyHosts.agencyId, hostRecord.agencyId), eq(agencyHosts.userId, hostUserId)));
    return { success: true };
  }
}
