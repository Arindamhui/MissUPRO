import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import {
  agencies,
  agencyHosts,
  agencyApplications,
  agencyCommissionRecords,
  dmConversations,
  dmMessages,
  followers,
  giftTransactions,
  liveViewers,
  loginStreaks,
  models,
  userXpEvents,
  users,
} from "@missu/db/schema";
import { eq, and, desc, count, inArray, gte, sql, or } from "drizzle-orm";
import { DEFAULTS } from "@missu/config";
import { decodeCursor, encodeCursor } from "@missu/utils";

@Injectable()
export class AgencyService {
  private getStartOfDay() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  private getRecentWindowStart(days: number) {
    const start = this.getStartOfDay();
    start.setDate(start.getDate() - days);
    return start;
  }

  private async getActiveMembership(userId: string) {
    const [hostRecord] = await db
      .select()
      .from(agencyHosts)
      .where(and(eq(agencyHosts.userId, userId), eq(agencyHosts.status, "ACTIVE" as any)))
      .limit(1);

    return hostRecord ?? null;
  }

  private buildSquadTags(input: { onlineCount: number; todayGiftCoins: number; followerLinks: number; country: string }) {
    const tags = ["Friends"];

    if (input.todayGiftCoins > 0) {
      tags.push("Love");
    } else {
      tags.push("Entertainment");
    }

    if (input.onlineCount >= 3) {
      tags.push("Sports");
    } else if (input.followerLinks >= 3) {
      tags.push("Music");
    } else {
      tags.push(input.country || "Global");
    }

    return tags;
  }

  private async getSquadMetrics(agencyId: string) {
    const members = await db
      .select({
        userId: agencyHosts.userId,
        assignedAt: agencyHosts.assignedAt,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        country: users.country,
        qualityScore: models.qualityScore,
        isOnline: models.isOnline,
      })
      .from(agencyHosts)
      .innerJoin(users, eq(users.id, agencyHosts.userId))
      .leftJoin(models, eq(models.userId, agencyHosts.userId))
      .where(and(eq(agencyHosts.agencyId, agencyId), eq(agencyHosts.status, "ACTIVE" as any)))
      .orderBy(desc(agencyHosts.assignedAt));

    const memberIds = members.map((member) => member.userId);

    if (memberIds.length === 0) {
      return {
        memberIds,
        members,
        memberCount: 0,
        onlineCount: 0,
        totalQualityScore: 0,
        xpTotal: 0,
        followerLinks: 0,
        todayGiftCoins: 0,
        todayWatchSeconds: 0,
        todayMessageCount: 0,
        prestigePoints: 0,
      };
    }

    const todayStart = this.getStartOfDay();
    const recentWindowStart = this.getRecentWindowStart(30);

    const [xpRows, followerRows, giftRows, watchRows, messageRows] = await Promise.all([
      db
        .select({ total: sql<number>`coalesce(sum(${userXpEvents.xpAmount}), 0)` })
        .from(userXpEvents)
        .where(and(inArray(userXpEvents.userId, memberIds), gte(userXpEvents.createdAt, recentWindowStart))),
      db
        .select({ count: count() })
        .from(followers)
        .where(and(inArray(followers.followerUserId, memberIds), inArray(followers.followedUserId, memberIds))),
      db
        .select({ total: sql<number>`coalesce(sum(${giftTransactions.coinCost}), 0)` })
        .from(giftTransactions)
        .where(and(inArray(giftTransactions.senderUserId, memberIds), gte(giftTransactions.createdAt, todayStart))),
      db
        .select({ total: sql<number>`coalesce(sum(${liveViewers.watchDurationSeconds}), 0)` })
        .from(liveViewers)
        .where(and(inArray(liveViewers.userId, memberIds), gte(liveViewers.joinedAt, todayStart))),
      db
        .select({ count: count() })
        .from(dmMessages)
        .where(and(inArray(dmMessages.senderUserId, memberIds), gte(dmMessages.createdAt, todayStart))),
    ]);

    const memberCount = members.length;
    const onlineCount = members.filter((member) => member.isOnline).length;
    const totalQualityScore = members.reduce((sum, member) => sum + Number(member.qualityScore ?? 0), 0);
    const xpTotal = Number(xpRows[0]?.total ?? 0);
    const followerLinks = Number(followerRows[0]?.count ?? 0);
    const todayGiftCoins = Number(giftRows[0]?.total ?? 0);
    const todayWatchSeconds = Number(watchRows[0]?.total ?? 0);
    const todayMessageCount = Number(messageRows[0]?.count ?? 0);
    const prestigePoints = Math.round(
      memberCount * 350 +
      onlineCount * 200 +
      totalQualityScore * 6 +
      xpTotal * 0.45 +
      followerLinks * 75 +
      todayGiftCoins * 0.25 +
      todayWatchSeconds / 60 +
      todayMessageCount * 20,
    );

    return {
      memberIds,
      members,
      memberCount,
      onlineCount,
      totalQualityScore,
      xpTotal,
      followerLinks,
      todayGiftCoins,
      todayWatchSeconds,
      todayMessageCount,
      prestigePoints,
    };
  }

  async submitApplication(userId: string, data: { name: string; contactName: string; contactEmail: string; country: string; notes?: string }) {
    const [existing] = await db
      .select()
      .from(agencyApplications)
      .where(and(eq(agencyApplications.applicantUserId, userId), eq(agencyApplications.status, "PENDING" as any)))
      .limit(1);

    if (existing) {
      return existing;
    }

    const [application] = await db
      .insert(agencyApplications)
      .values({
        applicantUserId: userId,
        agencyName: data.name,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        country: data.country,
        notes: data.notes,
      })
      .returning();

    return application!;
  }

  async listMyApplications(userId: string) {
    return db
      .select()
      .from(agencyApplications)
      .where(eq(agencyApplications.applicantUserId, userId))
      .orderBy(desc(agencyApplications.createdAt));
  }

  async applyAsAgency(userId: string, data: { name: string; contactName: string; contactEmail: string; country: string }) {
    const activeMembership = await this.getActiveMembership(userId);
    if (activeMembership) {
      throw new Error("You are already in a squad");
    }

    const [agency] = await db
      .insert(agencies)
      .values({
        agencyName: data.name,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        country: data.country,
        status: "ACTIVE",
        commissionTier: DEFAULTS.AGENCY_COMMISSION_TIERS[0]?.name ?? "STANDARD",
      })
      .returning();

    if (!agency) throw new Error("Failed to create agency");

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

  async listAgencyApplications(status?: string, cursor?: string, limit = 20) {
    const offset = cursor ? decodeCursor(cursor) : 0;
    const rows = await db
      .select()
      .from(agencyApplications)
      .where(status ? eq(agencyApplications.status, status as any) : undefined)
      .orderBy(desc(agencyApplications.createdAt))
      .limit(limit + 1)
      .offset(offset);
    const hasMore = rows.length > limit;
    return { items: hasMore ? rows.slice(0, limit) : rows, nextCursor: hasMore ? encodeCursor(offset + limit) : null };
  }

  async approveAgencyApplication(applicationId: string, adminId: string) {
    const [application] = await db
      .select()
      .from(agencyApplications)
      .where(eq(agencyApplications.id, applicationId))
      .limit(1);
    if (!application) throw new Error("Agency application not found");

    const [agency] = await db
      .insert(agencies)
      .values({
        agencyName: application.agencyName,
        contactName: application.contactName,
        contactEmail: application.contactEmail,
        country: application.country,
        status: "ACTIVE",
        commissionTier: DEFAULTS.AGENCY_COMMISSION_TIERS[0]?.name ?? "STANDARD",
        approvedByAdminId: adminId,
      })
      .returning();

    await db.insert(agencyHosts).values({
      agencyId: agency!.id,
      userId: application.applicantUserId,
      status: "ACTIVE" as any,
    }).onConflictDoNothing();

    const [updated] = await db
      .update(agencyApplications)
      .set({
        status: "APPROVED" as any,
        createdAgencyId: agency!.id,
        reviewedByAdminId: adminId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(agencyApplications.id, applicationId))
      .returning();

    return { application: updated!, agency: agency! };
  }

  async rejectAgencyApplication(applicationId: string, adminId: string, notes?: string) {
    const [updated] = await db
      .update(agencyApplications)
      .set({
        status: "REJECTED" as any,
        reviewedByAdminId: adminId,
        reviewedAt: new Date(),
        notes,
        updatedAt: new Date(),
      })
      .where(eq(agencyApplications.id, applicationId))
      .returning();

    if (!updated) throw new Error("Agency application not found");
    return updated;
  }

  async recordCommission(
    agencyId: string,
    hostUserId: string,
    grossRevenueUsd: number,
    hostPayoutUsd: number,
    commissionRate: number,
    adminId: string,
    metadataJson?: Record<string, unknown>,
  ) {
    const commissionAmountUsd = Number((grossRevenueUsd * commissionRate).toFixed(2));
    const [record] = await db
      .insert(agencyCommissionRecords)
      .values({
        agencyId,
        hostUserId,
        periodStart: new Date(),
        periodEnd: new Date(),
        grossRevenueUsd: grossRevenueUsd.toFixed(2),
        hostPayoutUsd: hostPayoutUsd.toFixed(2),
        commissionRate: commissionRate.toFixed(4),
        commissionAmountUsd: commissionAmountUsd.toFixed(2),
        status: "APPROVED" as any,
        metadataJson,
        approvedByAdminId: adminId,
        approvedAt: new Date(),
      })
      .returning();

    return record!;
  }

  async getCommissionSummary(userId: string) {
    const [hostRecord] = await db.select().from(agencyHosts)
      .where(and(eq(agencyHosts.userId, userId), eq(agencyHosts.status, "ACTIVE" as any)))
      .limit(1);
    if (!hostRecord) throw new Error("Agency not found");

    const records = await db
      .select()
      .from(agencyCommissionRecords)
      .where(eq(agencyCommissionRecords.agencyId, hostRecord.agencyId))
      .orderBy(desc(agencyCommissionRecords.createdAt));

    return {
      items: records,
      totalCommissionUsd: records.reduce((sum, record) => sum + Number(record.commissionAmountUsd ?? 0), 0),
      totalGrossRevenueUsd: records.reduce((sum, record) => sum + Number(record.grossRevenueUsd ?? 0), 0),
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

  async listPublicSquads(view: "POPULAR" | "RANK" = "POPULAR", limit = 20) {
    const rows = await db
      .select()
      .from(agencies)
      .where(eq(agencies.status, "ACTIVE"))
      .orderBy(desc(agencies.createdAt))
      .limit(Math.max(limit, 30));

    const squads = await Promise.all(rows.map(async (agency) => {
      const metrics = await this.getSquadMetrics(agency.id);
      const tags = this.buildSquadTags({
        onlineCount: metrics.onlineCount,
        todayGiftCoins: metrics.todayGiftCoins,
        followerLinks: metrics.followerLinks,
        country: agency.country,
      });

      return {
        id: agency.id,
        agencyName: agency.agencyName,
        country: agency.country,
        emblemUrl: metrics.members[0]?.avatarUrl ?? null,
        description: `${agency.country} squad with ${metrics.memberCount} members`,
        memberCount: metrics.memberCount,
        onlineCount: metrics.onlineCount,
        prestigePoints: metrics.prestigePoints,
        tags,
        membersPreview: metrics.members.slice(0, 4).map((member) => ({
          userId: member.userId,
          displayName: member.displayName,
          avatarUrl: member.avatarUrl,
          isOnline: Boolean(member.isOnline),
        })),
      };
    }));

    const sorted = squads.sort((left, right) => {
      if (view === "RANK") {
        return right.prestigePoints - left.prestigePoints || right.memberCount - left.memberCount;
      }

      return right.onlineCount - left.onlineCount || right.memberCount - left.memberCount || right.prestigePoints - left.prestigePoints;
    }).slice(0, limit);

    return {
      items: sorted.map((item, index) => ({ ...item, rank: index + 1 })),
      generatedAt: new Date().toISOString(),
    };
  }

  async getMySquadOverview(userId: string) {
    const membership = await this.getActiveMembership(userId);
    const todayStart = this.getStartOfDay();
    const todayKey = todayStart.toISOString().split("T")[0]!;
    const [streak] = await db.select().from(loginStreaks).where(eq(loginStreaks.userId, userId)).limit(1);
    const applications = await this.listMyApplications(userId);

    if (!membership) {
      return {
        squad: null,
        pendingApplications: applications,
        tasks: {
          checkIn: { completed: streak?.lastLoginDate === todayKey, rewardPoints: 20 },
          squadTalk: { completed: false, rewardPoints: 20 },
          squadFriendFinder: { completed: false, rewardPoints: 100 },
          watchingBroads: { completed: false, rewardPoints: 50 },
          gifting: { completed: false, rewardPoints: 30 },
        },
      };
    }

    const [agency] = await db.select().from(agencies).where(eq(agencies.id, membership.agencyId)).limit(1);
    if (!agency) {
      throw new Error("Squad not found");
    }

    const metrics = await this.getSquadMetrics(agency.id);
    const memberIds = metrics.memberIds;
    const squadPeers = memberIds.filter((memberId) => memberId !== userId);

    const [todayMessages, todayWatches, todayGifts, followsOut, followsIn] = squadPeers.length > 0
      ? await Promise.all([
          db
            .select({ count: count() })
            .from(dmMessages)
            .innerJoin(dmConversations, eq(dmConversations.id, dmMessages.conversationId))
            .where(and(
              eq(dmMessages.senderUserId, userId),
              gte(dmMessages.createdAt, todayStart),
              or(inArray(dmConversations.userId1, squadPeers), inArray(dmConversations.userId2, squadPeers)),
            )),
          db
            .select({ total: sql<number>`coalesce(sum(${liveViewers.watchDurationSeconds}), 0)` })
            .from(liveViewers)
            .where(and(eq(liveViewers.userId, userId), gte(liveViewers.joinedAt, todayStart))),
          db
            .select({ total: sql<number>`coalesce(sum(${giftTransactions.coinCost}), 0)` })
            .from(giftTransactions)
            .where(and(eq(giftTransactions.senderUserId, userId), gte(giftTransactions.createdAt, todayStart))),
          db
            .select({ count: count() })
            .from(followers)
            .where(and(eq(followers.followerUserId, userId), inArray(followers.followedUserId, squadPeers))),
          db
            .select({ count: count() })
            .from(followers)
            .where(and(eq(followers.followedUserId, userId), inArray(followers.followerUserId, squadPeers))),
        ])
      : [
          [{ count: 0 }],
          [{ total: 0 }],
          [{ total: 0 }],
          [{ count: 0 }],
          [{ count: 0 }],
        ];

    return {
      squad: {
        id: agency.id,
        agencyName: agency.agencyName,
        country: agency.country,
        memberCount: metrics.memberCount,
        onlineCount: metrics.onlineCount,
        prestigePoints: metrics.prestigePoints,
        followerLinks: metrics.followerLinks,
        todayGiftCoins: metrics.todayGiftCoins,
        todayWatchSeconds: metrics.todayWatchSeconds,
        tags: this.buildSquadTags({
          onlineCount: metrics.onlineCount,
          todayGiftCoins: metrics.todayGiftCoins,
          followerLinks: metrics.followerLinks,
          country: agency.country,
        }),
        members: metrics.members.map((member) => ({
          userId: member.userId,
          displayName: member.displayName,
          avatarUrl: member.avatarUrl,
          isOnline: Boolean(member.isOnline),
          assignedAt: member.assignedAt,
        })),
      },
      pendingApplications: applications,
      tasks: {
        checkIn: { completed: streak?.lastLoginDate === todayKey, rewardPoints: 20 },
        squadTalk: { completed: Number(todayMessages[0]?.count ?? 0) > 0, rewardPoints: 20 },
        squadFriendFinder: {
          completed: Number(followsOut[0]?.count ?? 0) >= 3 && Number(followsIn[0]?.count ?? 0) >= 3,
          rewardPoints: 100,
        },
        watchingBroads: { completed: Number(todayWatches[0]?.total ?? 0) >= 20 * 60, rewardPoints: 50 },
        gifting: { completed: Number(todayGifts[0]?.total ?? 0) > 0, rewardPoints: 30 },
      },
    };
  }

  async joinSquad(userId: string, agencyId: string) {
    const activeMembership = await this.getActiveMembership(userId);
    if (activeMembership) {
      if (activeMembership.agencyId === agencyId) {
        return activeMembership;
      }
      throw new Error("Leave your current squad before joining another one");
    }

    const [agency] = await db
      .select()
      .from(agencies)
      .where(and(eq(agencies.id, agencyId), eq(agencies.status, "ACTIVE")))
      .limit(1);
    if (!agency) {
      throw new Error("Squad not found or unavailable");
    }

    const [membership] = await db
      .insert(agencyHosts)
      .values({
        agencyId,
        userId,
        status: "ACTIVE" as any,
      })
      .onConflictDoUpdate({
        target: [agencyHosts.agencyId, agencyHosts.userId],
        set: { status: "ACTIVE" as any, assignedAt: new Date() },
      })
      .returning();

    return membership;
  }
}
