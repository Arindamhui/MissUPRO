import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import {
  admins,
  eventParticipants,
  events,
  leaderboardEntries,
  leaderboardSnapshots,
  leaderboards,
  profiles,
  users,
} from "@missu/db/schema";
import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { decodeCursor, encodeCursor, generateIdempotencyKey } from "@missu/utils";
import { WalletService } from "../wallet/wallet.service";

type EventRewardRule = {
  startRank: number;
  endRank: number;
  rewardType: "COINS" | "DIAMONDS" | "BADGE" | "VIP_DAYS";
  amount?: number;
  badgeCode?: string;
  vipDays?: number;
};

@Injectable()
export class EventService {
  constructor(private readonly walletService: WalletService) {}

  private userSchemaModePromise: Promise<"modern" | "legacy"> | null = null;
  private leaderboardSchemaModePromise: Promise<"modern" | "legacy"> | null = null;

  private async getUserSchemaMode() {
    if (!this.userSchemaModePromise) {
      this.userSchemaModePromise = db.execute(sql`
        select exists (
          select 1
          from information_schema.columns
          where table_schema = 'public'
            and table_name = 'users'
            and column_name = 'display_name'
        ) as has_display_name
      `).then((result) => {
        const value = result.rows[0] as { has_display_name?: boolean | string | number } | undefined;
        return value?.has_display_name ? "modern" : "legacy";
      });
    }

    return this.userSchemaModePromise;
  }

  private async getLeaderboardSchemaMode() {
    if (!this.leaderboardSchemaModePromise) {
      this.leaderboardSchemaModePromise = db.execute(sql`
        select exists (
          select 1
          from information_schema.columns
          where table_schema = 'public'
            and table_name = 'leaderboards'
            and column_name = 'leaderboard_type'
        ) as has_leaderboard_type
      `).then((result) => {
        const value = result.rows[0] as { has_leaderboard_type?: boolean | string | number } | undefined;
        return value?.has_leaderboard_type ? "modern" : "legacy";
      });
    }

    return this.leaderboardSchemaModePromise;
  }

  private mapLegacyBoard(row: Record<string, unknown>) {
    return {
      id: String(row.id),
      title: String(row.name ?? "Leaderboard"),
      leaderboardType: String(row.boardType ?? row.board_type ?? "GENERAL"),
      scoringMetric: String(row.boardType ?? row.board_type ?? "legacy_score"),
      windowType: "ALL_TIME",
      maxEntries: 100,
      refreshIntervalSeconds: Number(row.refreshIntervalSeconds ?? row.refresh_interval_seconds ?? 300),
      status: row.isActive ?? row.is_active ? "ACTIVE" : "INACTIVE",
      createdAt: row.createdAt ?? row.created_at ?? null,
      updatedAt: row.createdAt ?? row.created_at ?? null,
      createdByAdminId: null,
    };
  }

  private async resolveAdminActorId(adminUserId: string) {
    const [admin] = await db
      .select({ id: admins.id })
      .from(admins)
      .where(eq(admins.userId, adminUserId))
      .limit(1);

    if (!admin) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin actor not found" });
    }

    return admin.id;
  }

  private normalizeEventUpdate(data: Record<string, unknown>) {
    const next = { ...data } as Record<string, unknown>;
    if ("startDate" in next) {
      next.startAt = next.startDate;
      delete next.startDate;
    }
    if ("endDate" in next) {
      next.endAt = next.endDate;
      delete next.endDate;
    }
    return next;
  }

  private parseRewardRules(raw: unknown): EventRewardRule[] {
    if (Array.isArray(raw)) {
      const parsed: EventRewardRule[] = [];

      raw.forEach((rule, index) => {
        if (!rule || typeof rule !== "object") {
          return;
        }

        const value = rule as Record<string, unknown>;
        const rewardType = String(value.rewardType ?? value.type ?? "COINS").toUpperCase();
        const startRank = Math.max(1, Math.round(Number(value.startRank ?? value.rank ?? index + 1)));
        const endRank = Math.max(startRank, Math.round(Number(value.endRank ?? value.rank ?? startRank)));

        parsed.push({
          startRank,
          endRank,
          rewardType: (["COINS", "DIAMONDS", "BADGE", "VIP_DAYS"].includes(rewardType) ? rewardType : "COINS") as EventRewardRule["rewardType"],
          amount: Number(value.amount ?? value.coins ?? value.diamonds ?? 0),
          badgeCode: typeof value.badgeCode === "string" ? value.badgeCode : undefined,
          vipDays: value.vipDays == null ? undefined : Math.max(1, Math.round(Number(value.vipDays))),
        });
      });

      return parsed;
    }

    if (raw && typeof raw === "object") {
      const object = raw as Record<string, unknown>;
      if (Array.isArray(object.rewards)) {
        return this.parseRewardRules(object.rewards);
      }
    }

    return [
      { startRank: 1, endRank: 1, rewardType: "COINS", amount: 500 },
      { startRank: 2, endRank: 2, rewardType: "COINS", amount: 250 },
      { startRank: 3, endRank: 3, rewardType: "COINS", amount: 100 },
    ];
  }

  private buildParticipantReward(progressJson: unknown, reward: EventRewardRule, rank: number) {
    const progress = progressJson && typeof progressJson === "object"
      ? progressJson as Record<string, unknown>
      : {};
    return {
      ...progress,
      eventReward: {
        rewardType: reward.rewardType,
        amount: reward.amount ?? 0,
        badgeCode: reward.badgeCode,
        vipDays: reward.vipDays,
        rank,
        grantedAt: new Date().toISOString(),
      },
    };
  }

  async listEvents(status?: string, cursor?: string, limit = 20) {
    const offset = cursor ? decodeCursor(cursor) : 0;
    const results = await db
      .select()
      .from(events)
      .where(status ? eq(events.status, status as any) : undefined)
      .orderBy(desc(events.startAt))
      .limit(limit + 1)
      .offset(offset);

    const hasMore = results.length > limit;
    return {
      items: hasMore ? results.slice(0, limit) : results,
      nextCursor: hasMore ? encodeCursor(offset + limit) : null,
    };
  }

  async listAdminEvents(status?: string, cursor?: string, limit = 20) {
    const paginated = await this.listEvents(status, cursor, limit);
    const enriched = await Promise.all(
      paginated.items.map(async (event) => {
        const [participantCount, rewardedCount] = await Promise.all([
          db.select({ count: count() }).from(eventParticipants).where(eq(eventParticipants.eventId, event.id)),
          db
            .select({ count: count() })
            .from(eventParticipants)
            .where(and(eq(eventParticipants.eventId, event.id), eq(eventParticipants.status, "REWARDED" as any))),
        ]);

        return {
          ...event,
          participantCount: Number(participantCount[0]?.count ?? 0),
          rewardedParticipants: Number(rewardedCount[0]?.count ?? 0),
        };
      }),
    );

    const summary = enriched.reduce((acc, event) => {
      acc.totalParticipants += event.participantCount;
      acc.totalRewardsGranted += event.rewardedParticipants;
      if (event.status === "ACTIVE") acc.active += 1;
      if (event.status === "UPCOMING") acc.upcoming += 1;
      if (event.status === "ENDED") acc.ended += 1;
      return acc;
    }, {
      active: 0,
      upcoming: 0,
      ended: 0,
      totalParticipants: 0,
      totalRewardsGranted: 0,
    });

    return {
      events: enriched,
      summary,
      nextCursor: paginated.nextCursor,
    };
  }

  async createEvent(
    data: {
      title: string;
      description: string;
      eventType: string;
      startDate: Date;
      endDate: Date;
      rulesJson?: unknown;
      rewardPoolJson?: unknown;
    },
    createdByAdminUserId: string,
  ) {
    const createdByAdminId = await this.resolveAdminActorId(createdByAdminUserId);

    const [event] = await db
      .insert(events)
      .values({
        title: data.title,
        description: data.description,
        eventType: data.eventType as any,
        startAt: data.startDate,
        endAt: data.endDate,
        rulesJson: data.rulesJson as any,
        rewardPoolJson: data.rewardPoolJson as any,
        createdByAdminId,
        status: data.startDate <= new Date() ? "ACTIVE" as any : "UPCOMING" as any,
      })
      .returning();

    return event;
  }

  async updateEvent(eventId: string, data: Record<string, unknown>) {
    const [updated] = await db
      .update(events)
      .set(this.normalizeEventUpdate(data) as any)
      .where(eq(events.id, eventId))
      .returning();

    return updated;
  }

  async getEventDetail(eventId: string) {
    const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    if (!event) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
    }

    const [participantCount, leaderboard] = await Promise.all([
      db.select({ count: count() }).from(eventParticipants).where(eq(eventParticipants.eventId, eventId)),
      this.getEventLeaderboard(eventId, 10),
    ]);

    return {
      event,
      participantCount: Number(participantCount[0]?.count ?? 0),
      leaderboard,
    };
  }

  async joinEvent(userId: string, eventId: string) {
    const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    if (!event) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
    }

    if (!["ACTIVE", "UPCOMING"].includes(String(event.status))) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Event is not open for participation" });
    }

    const [existing] = await db
      .select()
      .from(eventParticipants)
      .where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.userId, userId)))
      .limit(1);

    if (existing) {
      return existing;
    }

    const [participant] = await db
      .insert(eventParticipants)
      .values({
        eventId,
        userId,
        score: "0",
        status: "ENROLLED" as any,
        progressJson: { joinedFrom: "APP" },
      })
      .returning();

    return participant;
  }

  async updateParticipantScore(eventId: string, userId: string, scoreDelta: number) {
    const [participant] = await db
      .select()
      .from(eventParticipants)
      .where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.userId, userId)))
      .limit(1);

    if (!participant) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Participant not found" });
    }

    const updatedScore = (Number(participant.score) || 0) + scoreDelta;
    const [updated] = await db
      .update(eventParticipants)
      .set({
        score: String(updatedScore),
        updatedAt: new Date(),
      })
      .where(eq(eventParticipants.id, participant.id))
      .returning();

    return updated;
  }

  async getEventLeaderboard(eventId: string, limit = 50) {
    if (await this.getUserSchemaMode() === "legacy") {
      const result = await db.execute(sql`
        select
          ep.user_id as "userId",
          ep.score,
          coalesce(p.display_name, u.username) as "displayName",
          p.avatar_url as "avatarUrl"
        from event_participants ep
        inner join users u on u.id = ep.user_id
        left join profiles p on p.user_id = u.id
        where ep.event_id = ${eventId}::uuid
        order by ep.score desc
        limit ${limit}
      `);

      return (result.rows as Array<Record<string, unknown>>).map((row, index) => ({
        ...row,
        rank: index + 1,
        rankPosition: index + 1,
        scoreValue: Number(row.score ?? 0),
      }));
    }

    const rows = await db
      .select({
        userId: eventParticipants.userId,
        score: eventParticipants.score,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(eventParticipants)
      .innerJoin(users, eq(users.id, eventParticipants.userId))
      .where(eq(eventParticipants.eventId, eventId))
      .orderBy(desc(eventParticipants.score))
      .limit(limit);

    return rows.map((row, index) => ({
      ...row,
      rank: index + 1,
      rankPosition: index + 1,
      scoreValue: Number(row.score ?? 0),
    }));
  }

  async distributeEventRewards(eventId: string) {
    const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    if (!event) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
    }

    const leaderboard = await db
      .select()
      .from(eventParticipants)
      .where(eq(eventParticipants.eventId, eventId))
      .orderBy(desc(eventParticipants.score), asc(eventParticipants.joinedAt));

    const rewards = this.parseRewardRules(event.rewardPoolJson);
    let grantedCount = 0;
    let totalCoins = 0;
    let totalDiamonds = 0;

    for (let index = 0; index < leaderboard.length; index++) {
      const participant = leaderboard[index]!;
      const rank = index + 1;
      const reward = rewards.find((rule) => rank >= rule.startRank && rank <= rule.endRank);
      if (!reward) {
        continue;
      }

      const progress = participant.progressJson && typeof participant.progressJson === "object"
        ? participant.progressJson as Record<string, unknown>
        : {};

      if (progress.eventReward) {
        continue;
      }

      if (reward.rewardType === "COINS" && (reward.amount ?? 0) > 0) {
        await this.walletService.creditCoins(
          participant.userId,
          Math.round(reward.amount ?? 0),
          "PROMO_BONUS",
          eventId,
          `Event reward for ${event.title}`,
          generateIdempotencyKey(participant.userId, "event_reward_coins", `${eventId}:${rank}`),
        );
        totalCoins += Math.round(reward.amount ?? 0);
      }

      if (reward.rewardType === "DIAMONDS" && (reward.amount ?? 0) > 0) {
        await this.walletService.creditDiamonds(
          participant.userId,
          Math.round(reward.amount ?? 0),
          "EVENT_REWARD",
          eventId,
          `Event reward for ${event.title}`,
          generateIdempotencyKey(participant.userId, "event_reward_diamonds", `${eventId}:${rank}`),
        );
        totalDiamonds += Math.round(reward.amount ?? 0);
      }

      await db
        .update(eventParticipants)
        .set({
          status: "REWARDED" as any,
          progressJson: this.buildParticipantReward(participant.progressJson, reward, rank),
          rank,
          updatedAt: new Date(),
        })
        .where(eq(eventParticipants.id, participant.id));

      grantedCount += 1;
    }

    return {
      eventId,
      grantedCount,
      totalCoins,
      totalDiamonds,
    };
  }

  async getEventAnalytics(eventId: string) {
    const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    if (!event) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
    }

    const [participants, rewarded, leaderboard] = await Promise.all([
      db.select({ count: count() }).from(eventParticipants).where(eq(eventParticipants.eventId, eventId)),
      db
        .select({ count: count() })
        .from(eventParticipants)
        .where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.status, "REWARDED" as any))),
      this.getEventLeaderboard(eventId, 5),
    ]);

    return {
      event,
      metrics: {
        participants: Number(participants[0]?.count ?? 0),
        rewardedParticipants: Number(rewarded[0]?.count ?? 0),
      },
      topParticipants: leaderboard,
    };
  }

  async getLeaderboard(leaderboardId: string, cursor?: string, limit = 50) {
    const offset = cursor ? decodeCursor(cursor) : 0;
    if (await this.getUserSchemaMode() === "legacy") {
      const result = await db.execute(sql`
        select
          le.user_id as "userId",
          le.score_value as score,
          le.rank_position as rank,
          coalesce(p.display_name, u.username) as "displayName",
          p.avatar_url as "avatarUrl"
        from leaderboard_entries le
        inner join users u on u.id = le.user_id
        left join profiles p on p.user_id = u.id
        where le.leaderboard_id = ${leaderboardId}::uuid
        order by le.rank_position asc
        limit ${limit + 1}
        offset ${offset}
      `);

      const results = result.rows as Array<Record<string, unknown>>;
      const hasMore = results.length > limit;
      const items = hasMore ? results.slice(0, limit) : results;

      return {
        items: items.map((entry) => ({
          ...entry,
          rankPosition: Number(entry.rank ?? 0),
          scoreValue: Number(entry.score ?? 0),
        })),
        nextCursor: hasMore ? encodeCursor(offset + limit) : null,
      };
    }

    const results = await db
      .select({
        userId: leaderboardEntries.userId,
        score: leaderboardEntries.scoreValue,
        rank: leaderboardEntries.rankPosition,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(leaderboardEntries)
      .innerJoin(users, eq(users.id, leaderboardEntries.userId))
      .where(eq(leaderboardEntries.leaderboardId, leaderboardId))
      .orderBy(asc(leaderboardEntries.rankPosition))
      .limit(limit + 1)
      .offset(offset);

    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, limit) : results;

    return {
      items: items.map((entry) => ({
        ...entry,
        rankPosition: entry.rank,
        scoreValue: Number(entry.score ?? 0),
      })),
      nextCursor: hasMore ? encodeCursor(offset + limit) : null,
    };
  }

  async listLeaderboards() {
    if (await this.getLeaderboardSchemaMode() === "legacy") {
      const result = await db.execute(sql`
        select
          id,
          name,
          board_type as "boardType",
          refresh_interval_seconds as "refreshIntervalSeconds",
          is_active as "isActive",
          created_at as "createdAt"
        from leaderboards
        order by created_at desc
      `);
      return (result.rows as Array<Record<string, unknown>>).map((row) => this.mapLegacyBoard(row));
    }

    return db.select().from(leaderboards).orderBy(desc(leaderboards.createdAt));
  }

  async createLeaderboard(
    data: { title: string; leaderboardType: string; scoringMetric: string; windowType: string },
    createdByAdminId: string,
  ) {
    if (await this.getLeaderboardSchemaMode() === "legacy") {
      const result = await db.execute(sql`
        insert into leaderboards (name, board_type, refresh_interval_seconds, is_active, created_at)
        values (${data.title}, ${data.leaderboardType}, 300, true, now())
        returning
          id,
          name,
          board_type as "boardType",
          refresh_interval_seconds as "refreshIntervalSeconds",
          is_active as "isActive",
          created_at as "createdAt"
      `);

      return this.mapLegacyBoard((result.rows[0] as Record<string, unknown>) ?? {});
    }

    const [leaderboard] = await db
      .insert(leaderboards)
      .values({
        ...data,
        status: "ACTIVE" as any,
        maxEntries: 100,
        refreshIntervalSeconds: 300,
        createdByAdminId,
      } as any)
      .returning();

    return leaderboard;
  }

  async recomputeLeaderboard(leaderboardId: string) {
    const board = (await this.getLeaderboardSchemaMode()) === "legacy"
      ? await db.execute(sql`
          select
            id,
            name,
            board_type as "boardType",
            refresh_interval_seconds as "refreshIntervalSeconds",
            is_active as "isActive",
            created_at as "createdAt"
          from leaderboards
          where id = ${leaderboardId}::uuid
          limit 1
        `).then((result) => {
          const row = result.rows[0] as Record<string, unknown> | undefined;
          return row ? this.mapLegacyBoard(row) : null;
        })
      : await db.select().from(leaderboards).where(eq(leaderboards.id, leaderboardId)).limit(1).then((rows) => rows[0] ?? null);
    if (!board) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Leaderboard not found" });
    }

    const ranked = await db
      .select({ userId: eventParticipants.userId, score: eventParticipants.score })
      .from(eventParticipants)
      .orderBy(desc(eventParticipants.score))
      .limit(Number((board as Record<string, unknown>).maxEntries ?? 100));

    if (await this.getLeaderboardSchemaMode() === "legacy") {
      await db.execute(sql`delete from leaderboard_entries where leaderboard_id = ${leaderboardId}::uuid`);

      for (let index = 0; index < ranked.length; index++) {
        const row = ranked[index]!;
        await db.execute(sql`
          insert into leaderboard_entries (leaderboard_id, user_id, score, rank, updated_at, created_at)
          values (
            ${leaderboardId}::uuid,
            ${row.userId}::uuid,
            ${row.score},
            ${index + 1},
            now(),
            now()
          )
        `);
      }

      await db.execute(sql`
        insert into leaderboard_snapshots (leaderboard_id, snapshot_json, snapshot_at, created_at)
        values (${leaderboardId}::uuid, ${JSON.stringify(ranked)}::jsonb, now(), now())
      `);

      return { leaderboardId, updated: ranked.length };
    }

    await db.delete(leaderboardEntries).where(eq(leaderboardEntries.leaderboardId, leaderboardId));

    for (let index = 0; index < ranked.length; index++) {
      const row = ranked[index]!;
      await db.insert(leaderboardEntries).values({
        leaderboardId,
        userId: row.userId,
        rankPosition: index + 1,
        scoreValue: row.score,
        scoreDelta: "0",
        snapshotAt: new Date(),
      } as any);
    }

    await db.insert(leaderboardSnapshots).values({
      leaderboardId,
      snapshotDate: new Date().toISOString().slice(0, 10) as any,
      entriesJson: ranked,
      totalParticipants: ranked.length,
    } as any);

    await db.update(leaderboards).set({ updatedAt: new Date() }).where(eq(leaderboards.id, leaderboardId));

    return { leaderboardId, updated: ranked.length };
  }
}
